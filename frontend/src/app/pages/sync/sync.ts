import { Component, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { SyncStatus } from '../../core/models';

@Component({
  selector: 'app-sync',
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <h1>Data Synchronisation</h1>
      <p>Importing SAP master data and running the risk analysis.</p>
    </div>

    @if (status(); as s) {
      <div class="card">
        <div class="bar-head">
          <strong>{{ s.done ? 'Sync complete' : 'Syncing…' }}</strong>
          <span class="pct">{{ s.progress }}%</span>
        </div>
        <div class="bar">
          <div class="fill" [style.width.%]="s.progress"></div>
        </div>

        <div class="steps">
          @for (step of s.steps; track step.key) {
            <div class="step" [class]="step.status.toLowerCase()">
              <span class="icon">
                {{ step.status === 'DONE' ? '✓' : step.status === 'RUNNING' ? '◐' : '○' }}
              </span>
              <span class="label">{{ step.label }}</span>
              @if (step.table !== '—') {
                <span class="chip">{{ step.table }}</span>
              }
              @if (step.count !== undefined) {
                <span class="count">{{ step.count }} records</span>
              }
            </div>
          }
        </div>

        @if (s.done) {
          <div class="done-cta">
            <span>✓ Imported and analysed. Your risk dashboard is ready.</span>
            <a routerLink="/dashboard" class="btn btn-primary">Open Dashboard →</a>
          </div>
        }
      </div>
    } @else {
      <div class="empty">Starting sync…</div>
    }
  `,
  styles: [
    `
      .bar-head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 8px;
      }
      .pct {
        font-weight: 700;
        font-size: 18px;
        font-variant-numeric: tabular-nums;
      }
      .bar {
        height: 10px;
        background: var(--surface-2);
        border-radius: 6px;
        overflow: hidden;
        margin-bottom: 20px;
      }
      .fill {
        height: 100%;
        background: linear-gradient(90deg, var(--primary), var(--accent));
        border-radius: 6px;
        transition: width 0.4s ease;
      }
      .steps {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .step {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 11px 12px;
        border-radius: var(--radius-sm);
        font-size: 14px;
        transition: background 0.2s ease;
      }
      .step.pending {
        color: var(--text-muted);
        opacity: 0.6;
      }
      .step.running {
        background: var(--primary-soft);
      }
      .step.done {
        color: var(--text);
      }
      .icon {
        width: 20px;
        text-align: center;
        font-weight: 700;
      }
      .step.done .icon {
        color: var(--low);
      }
      .step.running .icon {
        color: var(--primary);
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      .label {
        flex: 1;
      }
      .count {
        font-size: 12px;
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
      }
      .done-cta {
        margin-top: 20px;
        padding-top: 18px;
        border-top: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: var(--low);
        font-weight: 600;
      }
    `,
  ],
})
export class SyncProgressComponent implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly status = signal<SyncStatus | null>(null);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const jobId = this.route.snapshot.queryParamMap.get('job');
    if (jobId) {
      this.poll(jobId);
    } else {
      // Allow landing on /sync directly: start a fresh job.
      this.api.startSync().subscribe((j) => {
        this.router.navigate([], { queryParams: { job: j.jobId } });
        this.poll(j.jobId);
      });
    }
  }

  private poll(jobId: string): void {
    const tick = () => {
      this.api.syncStatus(jobId).subscribe((s) => {
        this.status.set(s);
        if (s.done && this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }
      });
    };
    tick();
    this.timer = setInterval(tick, 400);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
