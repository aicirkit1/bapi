import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ChatMessage } from '../../core/models';

interface Turn extends ChatMessage {
  mode?: 'llm' | 'mock';
  toolsUsed?: string[];
  streaming?: boolean;
}

@Component({
  selector: 'app-chat',
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <h1>AI Chat</h1>
      <p>
        Streams live and uses read-only tools to query the bank's SAP data —
        answers show which tools they called.
      </p>
    </div>

    <div class="card chat">
      <div class="messages" #scroller (scroll)="onScroll()">
        @if (turns().length === 0) {
          <div class="welcome">
            <p class="muted">Try one of these:</p>
            <div class="suggestions">
              @for (s of suggestions; track s) {
                <button class="chip clickable" (click)="ask(s)">{{ s }}</button>
              }
            </div>
          </div>
        }

        @for (t of turns(); track $index) {
          <div class="turn" [class.user]="t.role === 'user'">
            <div class="avatar">{{ t.role === 'user' ? 'You' : 'AI' }}</div>
            <div class="bubble">
              @if (t.role === 'assistant' && t.toolsUsed?.length) {
                <div class="tools">
                  @for (name of t.toolsUsed; track $index) {
                    <span class="tool-chip">⚙ {{ name }}</span>
                  }
                </div>
              }
              @if (t.content) {
                <div class="bubble-text">{{ t.content }}</div>
              }
              @if (t.streaming && !t.content) {
                <span class="typing">●●●</span>
              }
              @if (t.role === 'assistant' && !t.streaming && t.mode) {
                <div class="mode">
                  {{ t.mode === 'llm' ? 'live model' : 'offline mock' }}
                </div>
              }
            </div>
          </div>
        }
      </div>

      <form class="composer" (ngSubmit)="send()">
        <input
          class="input"
          [(ngModel)]="draft"
          name="draft"
          placeholder="Ask about a user, role or risk…"
          autocomplete="off"
          [disabled]="loading()"
        />
        <button class="btn btn-primary" [disabled]="loading() || !draft.trim()">
          Send
        </button>
      </form>
    </div>
  `,
  styles: [
    `
      .chat {
        display: flex;
        flex-direction: column;
        height: calc(100vh - 180px);
        padding: 0;
        overflow: hidden;
      }
      .messages {
        flex: 1;
        overflow-y: auto;
        padding: 22px;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .welcome .suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
      }
      .chip.clickable {
        cursor: pointer;
        border: 1px solid var(--border);
        transition: all 0.12s ease;
        font-family: var(--font);
      }
      .chip.clickable:hover {
        background: var(--primary-soft);
        color: var(--primary);
        border-color: var(--primary);
      }
      .turn {
        display: flex;
        gap: 12px;
        max-width: 82%;
      }
      .turn.user {
        flex-direction: row-reverse;
        align-self: flex-end;
      }
      .avatar {
        width: 34px;
        height: 34px;
        flex-shrink: 0;
        border-radius: 9px;
        display: grid;
        place-items: center;
        font-size: 11px;
        font-weight: 700;
        background: var(--surface-2);
        color: var(--text-muted);
      }
      .turn.user .avatar {
        background: var(--primary);
        color: #fff;
      }
      .bubble {
        background: var(--surface-2);
        border-radius: 12px;
        padding: 12px 14px;
      }
      .turn.user .bubble {
        background: var(--primary);
        color: #fff;
      }
      .bubble-text {
        white-space: pre-wrap;
        line-height: 1.55;
      }
      .tools {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 8px;
      }
      .tool-chip {
        font-family: var(--mono);
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 6px;
        background: var(--primary-soft);
        color: var(--primary);
      }
      .mode {
        margin-top: 8px;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-muted);
      }
      .typing {
        letter-spacing: 2px;
        color: var(--text-muted);
        animation: blink 1s infinite;
      }
      @keyframes blink {
        50% {
          opacity: 0.3;
        }
      }
      .composer {
        display: flex;
        gap: 10px;
        padding: 16px;
        border-top: 1px solid var(--border);
        background: var(--surface);
      }
    `,
  ],
})
export class ChatComponent {
  private readonly api = inject(ApiService);
  private readonly scroller =
    viewChild<ElementRef<HTMLElement>>('scroller');

  /** Whether the view is pinned to the bottom (auto-scroll on new content). */
  private stick = true;

  protected draft = '';
  protected readonly loading = signal(false);
  protected readonly turns = signal<Turn[]>([]);
  protected readonly suggestions = [
    'Why does Hans Müller have Z_CREDIT_APPROVE?',
    'Show me the payment SoD risks',
    'Tell me about Thomas Weber',
    'What are the biggest access risks and what should we fix first?',
  ];

  constructor() {
    // Auto-scroll to the latest content as turns/tokens stream in,
    // but only while the user is already near the bottom.
    effect(() => {
      this.turns(); // re-run on every new message / streamed token
      this.loading();
      if (!this.stick) return;
      const el = this.scroller()?.nativeElement;
      if (el) {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight;
        });
      }
    });
  }

  /** Track whether the user has scrolled away from the bottom. */
  onScroll(): void {
    const el = this.scroller()?.nativeElement;
    if (!el) return;
    this.stick = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  protected readonly history = computed<ChatMessage[]>(() =>
    this.turns()
      .filter((t) => t.content)
      .map((t) => ({ role: t.role, content: t.content })),
  );

  ask(text: string): void {
    this.draft = text;
    this.send();
  }

  send(): void {
    const message = this.draft.trim();
    if (!message || this.loading()) return;

    const history = this.history();
    this.turns.update((t) => [
      ...t,
      { role: 'user', content: message },
      { role: 'assistant', content: '', streaming: true, toolsUsed: [] },
    ]);
    this.draft = '';
    this.loading.set(true);

    // Mutate the trailing assistant turn as events arrive.
    const patchLast = (fn: (turn: Turn) => Turn) =>
      this.turns.update((turns) => {
        const copy = [...turns];
        copy[copy.length - 1] = fn(copy[copy.length - 1]);
        return copy;
      });

    this.api
      .chatStream(message, history, (e) => {
        if (e.type === 'token') {
          patchLast((t) => ({ ...t, content: t.content + e.text }));
        } else if (e.type === 'tool') {
          patchLast((t) => ({ ...t, toolsUsed: [...(t.toolsUsed ?? []), e.name] }));
        } else if (e.type === 'done') {
          patchLast((t) => ({ ...t, streaming: false, mode: e.mode }));
        } else if (e.type === 'error') {
          patchLast((t) => ({
            ...t,
            streaming: false,
            content: t.content || `Error: ${e.message}`,
          }));
        }
      })
      .catch(() => {
        patchLast((t) => ({
          ...t,
          streaming: false,
          content:
            t.content ||
            'Sorry — the backend is unreachable. Is it running on :4000?',
        }));
      })
      .finally(() => this.loading.set(false));
  }
}
