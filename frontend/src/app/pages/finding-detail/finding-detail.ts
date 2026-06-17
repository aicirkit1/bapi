import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Finding, FindingStatus } from '../../core/models';
import { AiInsightComponent } from '../../shared/ai-insight';

@Component({
  selector: 'app-finding-detail',
  imports: [RouterLink, AiInsightComponent],
  template: `
    @if (finding(); as f) {
      <div class="page-head">
        <a routerLink="/findings" class="back">← Risk findings</a>
        <div class="title-row">
          <h1>{{ label(f.riskType) }}</h1>
          <span class="sev sev-{{ f.severity }} big">{{ f.severity }}</span>
        </div>
        <p>{{ f.description }}</p>
      </div>

      <div class="cols">
        <div class="main">
          <div class="card">
            <h2>AI recommendation</h2>
            <p class="reco">{{ f.recommendation }}</p>
            <h3>Remediation steps</h3>
            <ol class="steps">
              @for (step of f.remediation; track $index) {
                <li>{{ step }}</li>
              }
            </ol>
          </div>

          <app-ai-insight
            label="AI remediation plan"
            hint="Generate a step-by-step remediation plan tailored to this finding."
            [prompt]="planPrompt()"
          />

          <app-ai-insight
            label="Draft manager email"
            hint="Draft a short email to the user's manager explaining the risk and the requested action."
            [prompt]="emailPrompt()"
          />

          <div class="card">
            <h2>Technical evidence</h2>
            <div class="kv"><span>Risk type</span><b class="mono">{{ f.riskType }}</b></div>
            @if (f.roleId) {
              <div class="kv"><span>Role</span>
                <a class="link" [routerLink]="['/roles', f.roleId]">{{ f.roleName || f.roleId }}</a>
              </div>
            }
            @if (f.transactions?.length) {
              <div class="kv"><span>Transactions</span>
                <span>@for (t of f.transactions; track t) { <span class="chip">{{ t }}</span> }</span>
              </div>
            }
            <div class="kv"><span>Source SAP tables</span>
              <span>@for (t of f.sourceTables; track t) { <span class="chip">{{ t }}</span> }</span>
            </div>
          </div>
        </div>

        <div class="side">
          <div class="card">
            <h2>Affected user</h2>
            <div class="user">
              <div class="avatar">{{ initials(f.userName) }}</div>
              <div>
                <a class="link" [routerLink]="['/users', f.userId]"><strong>{{ f.userName }}</strong></a>
                <div class="mono muted">{{ f.userId }} · {{ f.department }}</div>
              </div>
            </div>
          </div>

          <div class="card">
            <h2>Status</h2>
            <div class="status-now">
              Current: <span class="status s-{{ f.status }}">{{ f.status }}</span>
            </div>
            <div class="actions">
              <button class="btn btn-primary" (click)="act('REMEDIATION')">Create Remediation Task</button>
              <button class="btn" (click)="act('ACCEPTED')">Mark as Accepted Risk</button>
              <button class="btn" (click)="act('OPEN')">Re-open</button>
              <button class="btn" (click)="exportFinding(f)">⤓ Export Finding</button>
            </div>
            @if (toast()) {
              <div class="toast">{{ toast() }}</div>
            }
          </div>
        </div>
      </div>
    } @else {
      <div class="empty">Loading finding…</div>
    }
  `,
  styles: [
    `
      .back {
        color: var(--primary);
        font-weight: 600;
        font-size: 13px;
      }
      .title-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .sev.big {
        font-size: 13px;
        padding: 4px 12px;
      }
      .cols {
        display: grid;
        grid-template-columns: 1.6fr 1fr;
        gap: 16px;
      }
      .main,
      .side {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .reco {
        background: var(--primary-soft);
        padding: 14px;
        border-radius: var(--radius-sm);
        line-height: 1.55;
        border-left: 3px solid var(--primary);
      }
      h3 {
        margin-top: 18px;
        font-size: 14px;
      }
      .steps {
        margin: 0;
        padding-left: 20px;
        line-height: 1.7;
      }
      .kv {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 9px 0;
        border-bottom: 1px solid var(--border);
        align-items: center;
      }
      .kv span:first-child {
        color: var(--text-muted);
        font-size: 13px;
      }
      .link {
        color: var(--primary);
        font-weight: 600;
      }
      .user {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .avatar {
        width: 42px;
        height: 42px;
        border-radius: 10px;
        background: var(--primary);
        color: #fff;
        display: grid;
        place-items: center;
        font-weight: 700;
      }
      .status {
        font-size: 12px;
        font-weight: 700;
        padding: 2px 9px;
        border-radius: 999px;
      }
      .s-OPEN {
        background: var(--surface-2);
        color: var(--text-muted);
      }
      .s-ACCEPTED {
        background: var(--medium-soft);
        color: var(--medium);
      }
      .s-REMEDIATION {
        background: var(--primary-soft);
        color: var(--primary);
      }
      .status-now {
        margin-bottom: 12px;
      }
      .actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .toast {
        margin-top: 12px;
        padding: 10px;
        background: var(--low-soft);
        color: var(--low);
        border-radius: var(--radius-sm);
        font-weight: 600;
        font-size: 13px;
      }
      @media (max-width: 900px) {
        .cols {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class FindingDetailComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly finding = signal<Finding | null>(null);
  protected readonly toast = signal<string | null>(null);

  protected readonly planPrompt = computed(() => {
    const f = this.finding();
    return f
      ? `For the access risk "${this.label(f.riskType)}" affecting ${f.userName} (${f.userId})` +
          `${f.roleId ? `, role ${f.roleId}` : ''}: produce a concrete, numbered remediation plan ` +
          `(who does what, in what order) and note any access that should be revoked immediately. Context: ${f.description}`
      : '';
  });

  protected readonly emailPrompt = computed(() => {
    const f = this.finding();
    return f
      ? `Draft a short, professional email to the manager of ${f.userName} (${f.userId}) in ${f.department}. ` +
          `Explain this access risk in plain language and request the specific remediation action. ` +
          `Risk: ${this.label(f.riskType)} — ${f.description}. Keep it under 120 words.`
      : '';
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.finding(id).subscribe((f) => this.finding.set(f));
  }

  act(status: FindingStatus): void {
    const f = this.finding();
    if (!f) return;
    this.api.findingAction(f.id, status).subscribe((updated) => {
      this.finding.set(updated);
      this.toast.set(
        status === 'REMEDIATION'
          ? 'Remediation task created.'
          : status === 'ACCEPTED'
            ? 'Marked as accepted risk.'
            : 'Finding re-opened.',
      );
    });
  }

  exportFinding(f: Finding): void {
    const blob = new Blob([JSON.stringify(f, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finding-${f.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  label(t: string): string {
    return t
      .toLowerCase()
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  initials(name: string): string {
    return name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('');
  }
}
