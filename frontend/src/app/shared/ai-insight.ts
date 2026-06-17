import { Component, effect, inject, input, signal } from '@angular/core';
import { ApiService } from '../core/api.service';

/**
 * A reusable, self-contained AI panel. Give it a `prompt` (and optionally a
 * `label`); it streams a grounded answer from the backend AI — the same
 * tool-calling assistant used by the chat — and shows which data tools it used.
 *
 * Usage:
 *   <app-ai-insight label="AI summary" [prompt]="myPrompt()" />
 *   <app-ai-insight [prompt]="p()" [auto]="true" />   // runs once automatically
 */
@Component({
  selector: 'app-ai-insight',
  template: `
    <div class="ai card">
      <div class="ai-head">
        <span class="ai-title">✦ {{ label() }}</span>
        @if (started()) {
          <button class="btn small" [disabled]="streaming()" (click)="run()">
            {{ streaming() ? 'Thinking…' : '↻ Regenerate' }}
          </button>
        } @else {
          <button class="btn small btn-primary" [disabled]="!prompt()" (click)="run()">
            Generate
          </button>
        }
      </div>

      @if (toolsUsed().length) {
        <div class="tools">
          @for (t of toolsUsed(); track $index) {
            <span class="tool-chip">⚙ {{ t }}</span>
          }
        </div>
      }

      @if (started()) {
        <div class="ai-body">
          @if (answer()) {
            <div class="answer">{{ answer() }}</div>
          } @else if (streaming()) {
            <span class="typing">●●●</span>
          }
          @if (!streaming() && mode()) {
            <div class="mode">{{ mode() === 'llm' ? 'live model' : 'offline mock' }}</div>
          }
        </div>
      } @else {
        <p class="hint muted">{{ hint() }}</p>
      }
    </div>
  `,
  styles: [
    `
      .ai {
        border-left: 3px solid var(--primary);
        background: linear-gradient(180deg, var(--primary-soft), var(--surface) 55%);
      }
      .ai-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .ai-title {
        font-weight: 700;
        color: var(--primary);
      }
      .small {
        padding: 5px 11px;
        font-size: 13px;
      }
      .tools {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 10px;
      }
      .tool-chip {
        font-family: var(--mono);
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 6px;
        background: #fff;
        border: 1px solid var(--border);
        color: var(--primary);
      }
      .ai-body {
        margin-top: 10px;
      }
      .answer {
        white-space: pre-wrap;
        line-height: 1.6;
      }
      .mode {
        margin-top: 8px;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-muted);
      }
      .hint {
        margin: 8px 0 0;
        font-size: 13px;
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
    `,
  ],
})
export class AiInsightComponent {
  private readonly api = inject(ApiService);

  readonly prompt = input.required<string>();
  readonly label = input('AI insight');
  readonly hint = input('Generate an AI explanation grounded in this data.');
  readonly auto = input(false);

  protected readonly started = signal(false);
  protected readonly streaming = signal(false);
  protected readonly answer = signal('');
  protected readonly toolsUsed = signal<string[]>([]);
  protected readonly mode = signal<'llm' | 'mock' | null>(null);
  private autoRan = false;

  constructor() {
    effect(() => {
      if (this.auto() && this.prompt() && !this.autoRan) {
        this.autoRan = true;
        this.run();
      }
    });
  }

  run(): void {
    const prompt = this.prompt();
    if (!prompt || this.streaming()) return;

    this.started.set(true);
    this.streaming.set(true);
    this.answer.set('');
    this.toolsUsed.set([]);
    this.mode.set(null);

    this.api
      .chatStream(prompt, [], (e) => {
        if (e.type === 'token') {
          this.answer.update((a) => a + e.text);
        } else if (e.type === 'tool') {
          this.toolsUsed.update((t) => [...t, e.name]);
        } else if (e.type === 'done') {
          this.mode.set(e.mode);
          this.streaming.set(false);
        } else if (e.type === 'error') {
          this.answer.set(`Error: ${e.message}`);
          this.streaming.set(false);
        }
      })
      .catch(() => {
        this.answer.set(
          this.answer() || 'AI is unreachable. Is the backend running on :4000?',
        );
        this.streaming.set(false);
      });
  }
}
