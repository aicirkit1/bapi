import {
  Component,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ChatMessage } from '../../core/models';
import {
  AD_GROUPS,
  AZURE_APPS,
  BRK_RIGHTS,
  BRK_ROWS,
  DEVIATIONS,
  DOCUMENTS,
  FACHLICHE_MEMBERS,
  TECHNISCHE_MEMBERS,
} from './brk-data';
import { BrkIconComponent } from './brk-icon';

interface Turn extends ChatMessage {
  mode?: 'llm' | 'mock';
  toolsUsed?: string[];
  streaming?: boolean;
}

/**
 * Floating AI assistant for the BRK module: a bottom-right button that opens a
 * chat panel. Streams answers from the same grounded, tool-calling backend the
 * main AI Chat uses (`/ai/chat/stream`).
 */
@Component({
  selector: 'app-brk-chat',
  imports: [FormsModule, BrkIconComponent],
  template: `
    <!-- launcher -->
    <button class="fab" [class.hidden]="open()" (click)="open.set(true)" title="BRK-Assistent">
      <brk-icon name="sparkle" [size]="22" />
    </button>

    @if (open()) {
      <section class="widget">
        <header class="w-head">
          <div class="w-title">
            <brk-icon name="sparkle" [size]="18" />
            BRK-Assistent
          </div>
          <button class="w-close" (click)="open.set(false)"><brk-icon name="close" [size]="18" /></button>
        </header>

        <div class="w-msgs" #scroller (scroll)="onScroll()">
          @if (turns().length === 0) {
            <p class="hint">Fragen Sie den Assistenten zu Zugriffen, Rollen und Risiken.</p>
            <div class="sugs">
              @for (s of suggestions; track s) {
                <button class="sug" (click)="ask(s)">{{ s }}</button>
              }
            </div>
          }
          @for (t of turns(); track $index) {
            <div class="turn" [class.user]="t.role === 'user'">
              <div class="bubble">
                @if (t.role === 'assistant' && t.toolsUsed?.length) {
                  <div class="tools">
                    @for (n of t.toolsUsed; track $index) {
                      <span class="tool">⚙ {{ n }}</span>
                    }
                  </div>
                }
                @if (t.content) { <span class="txt">{{ t.content }}</span> }
                @if (t.streaming && !t.content) { <span class="typing">●●●</span> }
              </div>
            </div>
          }
        </div>

        <form class="w-input" (ngSubmit)="send()">
          <input
            [(ngModel)]="draft"
            name="draft"
            placeholder="Nachricht…"
            autocomplete="off"
            [disabled]="loading()"
          />
          <button class="w-send" [disabled]="loading() || !draft.trim()">
            <brk-icon name="send" [size]="18" />
          </button>
        </form>
      </section>
    }
  `,
  styles: [
    `
      :host {
        font-family: 'Segoe UI', Roboto, Arial, sans-serif;
      }
      .fab {
        position: fixed;
        right: 26px;
        bottom: 26px;
        width: 58px;
        height: 58px;
        border-radius: 50%;
        border: 0;
        background: linear-gradient(135deg, #1f6fd6, #00a3a3);
        color: #fff;
        cursor: pointer;
        z-index: 60;
        box-shadow: 0 6px 20px rgba(31, 111, 214, 0.45);
        display: grid;
        place-items: center;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .fab:hover {
        transform: translateY(-2px) scale(1.04);
        box-shadow: 0 10px 26px rgba(31, 111, 214, 0.5);
      }
      .fab.hidden {
        display: none;
      }
      .widget {
        position: fixed;
        right: 26px;
        bottom: 26px;
        width: 390px;
        max-width: calc(100vw - 32px);
        height: 560px;
        max-height: calc(100vh - 52px);
        background: #fff;
        border: 1px solid #e1e5ee;
        border-radius: 14px;
        box-shadow: 0 18px 48px rgba(20, 23, 40, 0.28);
        z-index: 61;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: pop 0.16s ease;
      }
      @keyframes pop {
        from {
          transform: translateY(16px) scale(0.98);
          opacity: 0;
        }
      }
      .w-head {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        background: linear-gradient(135deg, #1f6fd6, #1565c0);
        color: #fff;
      }
      .w-title {
        display: flex;
        align-items: center;
        gap: 9px;
        font-weight: 600;
        font-size: 15px;
      }
      .w-close {
        background: transparent;
        border: 0;
        color: #fff;
        cursor: pointer;
        display: inline-flex;
        opacity: 0.85;
      }
      .w-close:hover {
        opacity: 1;
      }
      .w-msgs {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: #f7f8fb;
      }
      .hint {
        color: #6b7280;
        font-size: 13.5px;
        margin: 4px 0 2px;
      }
      .sugs {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }
      .sug {
        text-align: left;
        background: #fff;
        border: 1px solid #d9deea;
        border-radius: 8px;
        padding: 9px 11px;
        font-size: 13px;
        color: #33415a;
        cursor: pointer;
        font-family: inherit;
      }
      .sug:hover {
        border-color: #1f6fd6;
        background: #eef4fd;
        color: #1565c0;
      }
      .turn {
        display: flex;
        max-width: 88%;
      }
      .turn.user {
        align-self: flex-end;
      }
      .bubble {
        background: #fff;
        border: 1px solid #e6e9f0;
        border-radius: 12px;
        padding: 10px 12px;
        font-size: 14px;
        line-height: 1.5;
      }
      .turn.user .bubble {
        background: #1f6fd6;
        color: #fff;
        border-color: #1f6fd6;
      }
      .txt {
        white-space: pre-wrap;
      }
      .tools {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-bottom: 7px;
      }
      .tool {
        font-family: 'SF Mono', ui-monospace, monospace;
        font-size: 10.5px;
        padding: 2px 6px;
        border-radius: 5px;
        background: #eef4fd;
        color: #1565c0;
      }
      .typing {
        letter-spacing: 2px;
        color: #9aa0ad;
        animation: blink 1s infinite;
      }
      @keyframes blink {
        50% {
          opacity: 0.3;
        }
      }
      .w-input {
        flex: 0 0 auto;
        display: flex;
        gap: 8px;
        padding: 12px;
        border-top: 1px solid #eef0f5;
        background: #fff;
      }
      .w-input input {
        flex: 1;
        border: 1px solid #d9deea;
        border-radius: 9px;
        padding: 10px 12px;
        font-size: 14px;
        font-family: inherit;
        outline: none;
      }
      .w-input input:focus {
        border-color: #1f6fd6;
        box-shadow: 0 0 0 3px rgba(31, 111, 214, 0.15);
      }
      .w-send {
        border: 0;
        background: #1f6fd6;
        color: #fff;
        border-radius: 9px;
        width: 44px;
        cursor: pointer;
        display: grid;
        place-items: center;
      }
      .w-send:disabled {
        opacity: 0.5;
        cursor: default;
      }
    `,
  ],
})
export class BrkChatComponent {
  private readonly api = inject(ApiService);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private stick = true;

  protected readonly open = signal(false);
  protected readonly turns = signal<Turn[]>([]);
  protected readonly loading = signal(false);
  protected draft = '';
  private readonly router = inject(Router);
  protected readonly suggestions = [
    'Worum geht es in diesem BRK?',
    'Wer sind die Stellvertreter?',
    'Welche Berechtigungen enthält dieses BRK?',
    'Welche Abweichungen gibt es?',
  ];

  constructor() {
    effect(() => {
      this.turns();
      this.loading();
      if (!this.stick) return;
      const el = this.scroller()?.nativeElement;
      if (el) requestAnimationFrame(() => (el.scrollTop = el.scrollHeight));
    });
  }

  onScroll(): void {
    const el = this.scroller()?.nativeElement;
    if (!el) return;
    this.stick = el.scrollHeight - el.scrollTop - el.clientHeight < 70;
  }

  /** Build a context block from the BRK mock data for the current screen. */
  private buildContext(): string {
    const m = /\/brk\/edit\/([^/?#]+)/.exec(this.router.url);
    const current = m ? BRK_ROWS.find((r) => r.id === m[1]) : undefined;

    const lines: string[] = [
      'KONTEXT: Du bist der BRK-Assistent (Berechtigungskonzept). Antworte AUSSCHLIESSLICH aus den folgenden BRK-Daten und rufe KEINE externen Tools auf. Wenn etwas nicht in den Daten steht, sage das. Antworte in der Sprache der Frage.',
    ];

    if (current) {
      lines.push(
        `\nAktuell geöffnetes BRK: ${current.name} (Iteraplan ID ${current.iteraplanId}, archiviert: ${current.archiviert ? 'Ja' : 'Nein'}). ` +
          `Fachlicher Produktverantwortlicher: ${current.fachlicherPv}. Technischer Produktverantwortlicher: ${current.technischerPv}.`,
      );
      lines.push(
        `Fachliche Stellvertreter: ${FACHLICHE_MEMBERS.map((x) => `${x.name} (${x.uid})`).join(', ')}.`,
      );
      lines.push(
        `Technische Stellvertreter: ${TECHNISCHE_MEMBERS.map((x) => `${x.name} (${x.uid})`).join(', ')}.`,
      );
      lines.push(
        `Berechtigungen: ${BRK_RIGHTS.map((r) => `${r.recht} (${r.zielsystem}) — ${r.beschreibung}`).join(' | ')}.`,
      );
      lines.push(
        `Abweichungen: ${DEVIATIONS.map((d) => `${d.typ}: ${d.title}`).join('; ')}.`,
      );
      lines.push(`PAM AD-Gruppen: ${AD_GROUPS.join(', ')}.`);
      lines.push(
        `Azure Apps: ${AZURE_APPS.map((a) => `${a.name} (${a.status})`).join('; ')}.`,
      );
      lines.push(
        `Dokumente: ${DOCUMENTS.map((d) => `${d.name} (${d.size}, hochgeladen von ${d.uploadedBy})`).join('; ')}.`,
      );
    } else {
      lines.push(
        `\nÜbersicht aller Berechtigungskonzepte (IT Assets):\n${BRK_ROWS.map(
          (r) =>
            `- ${r.name}: Iteraplan ${r.iteraplanId}, fachlich ${r.fachlicherPv}, technisch ${r.technischerPv}, ${r.stell} Stellvertreter, archiviert ${r.archiviert ? 'Ja' : 'Nein'}`,
        ).join('\n')}`,
      );
    }
    return lines.join('\n');
  }

  ask(text: string): void {
    this.draft = text;
    this.send();
  }

  send(): void {
    const message = this.draft.trim();
    if (!message || this.loading()) return;

    const history: ChatMessage[] = this.turns()
      .filter((t) => t.content)
      .map((t) => ({ role: t.role, content: t.content }));

    this.turns.update((t) => [
      ...t,
      { role: 'user', content: message },
      { role: 'assistant', content: '', streaming: true, toolsUsed: [] },
    ]);
    this.draft = '';
    this.loading.set(true);
    this.stick = true;

    const patch = (fn: (t: Turn) => Turn) =>
      this.turns.update((turns) => {
        const c = [...turns];
        c[c.length - 1] = fn(c[c.length - 1]);
        return c;
      });

    // Ground the assistant in the BRK module data (frontend mock) so it answers
    // about DEMO_/ACME assets instead of querying the unrelated SAP backend.
    const grounded = `${this.buildContext()}\n\nFRAGE: ${message}`;

    this.api
      .chatStream(grounded, history, (e) => {
        if (e.type === 'token') patch((t) => ({ ...t, content: t.content + e.text }));
        else if (e.type === 'tool') patch((t) => ({ ...t, toolsUsed: [...(t.toolsUsed ?? []), e.name] }));
        else if (e.type === 'done') patch((t) => ({ ...t, streaming: false, mode: e.mode }));
        else if (e.type === 'error') patch((t) => ({ ...t, streaming: false, content: t.content || `Fehler: ${e.message}` }));
      })
      .catch(() =>
        patch((t) => ({
          ...t,
          streaming: false,
          content: t.content || 'Der Assistent ist nicht erreichbar (Backend :4000?).',
        })),
      )
      .finally(() => this.loading.set(false));
  }
}
