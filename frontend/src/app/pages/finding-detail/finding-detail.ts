import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Finding, FindingStatus } from '../../core/models';
import { AiInsightComponent } from '../../shared/ai-insight';

const RISK_TYPE_LABELS: Record<string, string> = {
  SAP_ALL_ASSIGNED: 'SAP_ALL zugewiesen',
  CRITICAL_TRANSACTION_ACCESS: 'Kritischer Transaktionszugriff',
  SOD_CONFLICT: 'Funktionstrennungskonflikt',
  INACTIVE_USER_WITH_ROLE: 'Inaktiver Benutzer mit Rolle',
  EXCESSIVE_PRIVILEGE: 'Übermäßige Berechtigungen',
  UNUSED_ROLE: 'Ungenutzte Rolle',
};

const SEVERITY_LABELS: Record<string, string> = {
  HIGH: 'Hoch',
  MEDIUM: 'Mittel',
  LOW: 'Niedrig',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Offen',
  ACCEPTED: 'Akzeptiertes Risiko',
  REMEDIATION: 'In Behebung',
};

@Component({
  selector: 'app-finding-detail',
  imports: [RouterLink, AiInsightComponent],
  template: `
    @if (finding(); as f) {
      <div class="page-head">
        <a routerLink="/findings" class="back">← Risikobefunde</a>
        <div class="title-row">
          <h1>{{ label(f.riskType) }}</h1>
          <span class="sev sev-{{ f.severity }} big">{{ severityLabel(f.severity) }}</span>
        </div>
        <p>{{ f.description }}</p>
      </div>

      <div class="cols">
        <div class="main">
          <div class="card">
            <h2>KI-Empfehlung</h2>
            <p class="reco">{{ f.recommendation }}</p>
            <h3>Behebungsschritte</h3>
            <ol class="steps">
              @for (step of f.remediation; track $index) {
                <li>{{ step }}</li>
              }
            </ol>
          </div>

          <app-ai-insight
            label="KI-Behebungsplan"
            hint="Erstellen Sie einen schrittweisen, auf diesen Befund zugeschnittenen Behebungsplan."
            [prompt]="planPrompt()"
          />

          <app-ai-insight
            label="Manager-E-Mail entwerfen"
            hint="Entwerfen Sie eine kurze E-Mail an den Vorgesetzten des Benutzers, die das Risiko und die angeforderte Maßnahme erläutert."
            [prompt]="emailPrompt()"
          />

          <div class="card">
            <h2>Technischer Nachweis</h2>
            <div class="kv"><span>Risikotyp</span><b class="mono">{{ f.riskType }}</b></div>
            @if (f.roleId) {
              <div class="kv"><span>Rolle</span>
                <a class="link" [routerLink]="['/roles', f.roleId]">{{ f.roleName || f.roleId }}</a>
              </div>
            }
            @if (f.transactions?.length) {
              <div class="kv"><span>Transaktionen</span>
                <span>@for (t of f.transactions; track t) { <span class="chip">{{ t }}</span> }</span>
              </div>
            }
            <div class="kv"><span>SAP-Quelltabellen</span>
              <span>@for (t of f.sourceTables; track t) { <span class="chip">{{ t }}</span> }</span>
            </div>
          </div>
        </div>

        <div class="side">
          <div class="card">
            <h2>Betroffener Benutzer</h2>
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
              Aktuell: <span class="status s-{{ f.status }}">{{ statusLabel(f.status) }}</span>
            </div>
            <div class="actions">
              <button class="btn btn-primary" (click)="act('REMEDIATION')">Behebungsaufgabe erstellen</button>
              <button class="btn" (click)="act('ACCEPTED')">Als akzeptiertes Risiko markieren</button>
              <button class="btn" (click)="act('OPEN')">Wieder öffnen</button>
              <button class="btn" (click)="exportFinding(f)">⤓ Befund exportieren</button>
            </div>
            @if (toast()) {
              <div class="toast">{{ toast() }}</div>
            }
          </div>
        </div>
      </div>
    } @else {
      <div class="empty">Befund wird geladen…</div>
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
          ? 'Behebungsaufgabe erstellt.'
          : status === 'ACCEPTED'
            ? 'Als akzeptiertes Risiko markiert.'
            : 'Befund wieder geöffnet.',
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
    return RISK_TYPE_LABELS[t] ?? t;
  }

  severityLabel(s: string): string {
    return SEVERITY_LABELS[s] ?? s;
  }

  statusLabel(s: string): string {
    return STATUS_LABELS[s] ?? s;
  }

  initials(name: string): string {
    return name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('');
  }
}
