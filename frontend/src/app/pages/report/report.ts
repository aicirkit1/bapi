import { Component, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { AuditReport } from '../../core/models';
import { AiInsightComponent } from '../../shared/ai-insight';

const SEVERITY_LABELS: Record<string, string> = {
  HIGH: 'Hoch',
  MEDIUM: 'Mittel',
  LOW: 'Niedrig',
};

const BAND_LABELS: Record<string, string> = {
  CRITICAL: 'Kritisch',
  HIGH: 'Hoch',
  MEDIUM: 'Mittel',
  LOW: 'Niedrig',
};

@Component({
  selector: 'app-report',
  imports: [AiInsightComponent],
  template: `
    <div class="page-head row no-print">
      <div>
        <h1>Prüfbericht</h1>
        <p>Prüfungsfertige Momentaufnahme der SAP-Zugriffslandschaft.</p>
      </div>
      <div class="actions">
        <button class="btn" (click)="exportJson()">⤓ JSON exportieren</button>
        <button class="btn btn-primary" (click)="print()">⎙ Drucken / Als PDF speichern</button>
      </div>
    </div>

    @if (report(); as r) {
      <div class="card doc">
        <div class="doc-head">
          <div>
            <div class="brand-line">BAPI · SAP Access Intelligence</div>
            <h2>{{ r.title }}</h2>
          </div>
          <div class="gen muted">Erstellt<br />{{ format(r.generatedAt) }}</div>
        </div>

        <app-ai-insight
          label="KI-Management-Zusammenfassung"
          [auto]="true"
          prompt="Write a 4-6 sentence executive summary for an audit report on this bank's SAP access governance: overall posture, the most serious risks (SAP_ALL, critical Basis access, Segregation-of-Duties), inactive users with roles, and the recommended priorities. Use the data tools."
        />

        <h3>1. Management-Zusammenfassung</h3>
        <div class="summary">
          <div class="stat"><span>{{ r.summary['users'] }}</span>Benutzer</div>
          <div class="stat"><span>{{ r.summary['roles'] }}</span>Rollen</div>
          <div class="stat"><span>{{ r.summary['assignments'] }}</span>Zuweisungen</div>
          <div class="stat danger"><span>{{ r.summary['sodFindings'] }}</span>SoD-Konflikte</div>
          <div class="stat danger"><span>{{ r.summary['criticalUsers'] }}</span>Kritische Benutzer</div>
          <div class="stat warn"><span>{{ r.summary['dormantRoleAssignments'] }}</span>Ruhende Rollen</div>
        </div>
        <p class="note">
          Die Bank weist <strong>{{ r.summary['sodFindings'] }}</strong>
          Funktionstrennungskonflikte (SoD) auf ({{ r.summary['sodHigh'] }} mit hohem
          Schweregrad), <strong>{{ r.summary['overPrivilegedUsers'] }}</strong>
          überprivilegierte Benutzer und
          <strong>{{ r.summary['crossDepartmentAssignments'] }}</strong>
          abteilungsübergreifende Rollenzuweisungen, die eine Prüfung erfordern.
        </p>

        <h3>2. Risiko nach Abteilung</h3>
        <table>
          <thead><tr><th>Abteilung</th><th>Benutzer</th><th>SoD-Befunde</th><th>Durchschn. Risiko</th></tr></thead>
          <tbody>
            @for (b of r.byDepartment; track b.department) {
              <tr>
                <td>{{ b.department }}</td>
                <td>{{ b.users }}</td>
                <td>{{ b.sodFindings }}</td>
                <td><strong>{{ b.avgRisk }}</strong></td>
              </tr>
            }
          </tbody>
        </table>

        <h3>3. Benutzer mit höchstem Risiko</h3>
        <table>
          <thead><tr><th>Benutzer</th><th>Abt.</th><th>Bewertung</th><th>Risikostufe</th><th>Hauptfaktoren</th></tr></thead>
          <tbody>
            @for (u of r.topRiskyUsers; track u.userId) {
              <tr>
                <td>{{ u.userName }} <span class="mono muted">{{ u.userId }}</span></td>
                <td>{{ u.department }}</td>
                <td><strong>{{ u.score }}</strong></td>
                <td><span class="sev sev-{{ u.band === 'CRITICAL' ? 'HIGH' : u.band }}">{{ bandLabel(u.band) }}</span></td>
                <td class="muted small">{{ factorList(u) }}</td>
              </tr>
            }
          </tbody>
        </table>

        <h3>4. Funktionstrennungsbefunde (SoD)</h3>
        <table>
          <thead><tr><th>Benutzer</th><th>Konflikt</th><th>Rollen</th><th>Schweregrad</th></tr></thead>
          <tbody>
            @for (f of r.sodFindings; track f.userId + f.ruleId) {
              <tr>
                <td>{{ f.userName }}</td>
                <td>{{ f.ruleId }}<div class="muted small">{{ f.description }}</div></td>
                <td class="mono">{{ f.roleA }} + {{ f.roleB }}</td>
                <td><span class="sev sev-{{ f.severity }}">{{ severityLabel(f.severity) }}</span></td>
              </tr>
            }
          </tbody>
        </table>

        <h3>5. Ruhender Zugriff (Top 30)</h3>
        <table>
          <thead><tr><th>Benutzer</th><th>Rolle</th><th>Monate ungenutzt</th><th>Zuletzt verwendet</th></tr></thead>
          <tbody>
            @for (d of r.dormant; track d.userId + d.roleId) {
              <tr>
                <td>{{ d.userName }} <span class="mono muted">{{ d.userId }}</span></td>
                <td class="mono">{{ d.roleId }}</td>
                <td>{{ d.monthsUnused ?? '—' }}</td>
                <td>{{ d.lastUsedAt ?? 'nie' }}</td>
              </tr>
            }
          </tbody>
        </table>

        <div class="foot muted">
          Erstellt von BAPI · {{ format(r.generatedAt) }} · Datenquelle: Mock (initialer SAP-Export)
        </div>
      </div>
    } @else {
      <div class="empty">Bericht wird erstellt…</div>
    }
  `,
  styles: [
    `
      .row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      .actions {
        display: flex;
        gap: 8px;
      }
      .doc {
        max-width: 900px;
        padding: 38px 44px;
      }
      .doc-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2px solid var(--primary);
        padding-bottom: 16px;
        margin-bottom: 8px;
      }
      .brand-line {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--primary);
      }
      .doc-head h2 {
        margin: 6px 0 0;
        font-size: 22px;
      }
      .gen {
        text-align: right;
        font-size: 12px;
      }
      h3 {
        margin-top: 28px;
        font-size: 15px;
        padding-bottom: 6px;
        border-bottom: 1px solid var(--border);
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 12px;
        margin: 14px 0;
      }
      .stat {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 11px;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .stat span {
        font-size: 24px;
        font-weight: 700;
        color: var(--text);
        letter-spacing: -0.02em;
      }
      .stat.danger span {
        color: var(--high);
      }
      .stat.warn span {
        color: var(--medium);
      }
      .note {
        line-height: 1.6;
      }
      .small {
        font-size: 12px;
      }
      .foot {
        margin-top: 32px;
        padding-top: 14px;
        border-top: 1px solid var(--border);
        font-size: 11px;
        text-align: center;
      }
      @media (max-width: 800px) {
        .summary {
          grid-template-columns: repeat(3, 1fr);
        }
      }
    `,
  ],
})
export class ReportComponent {
  private readonly api = inject(ApiService);
  protected readonly report = signal<AuditReport | null>(null);

  constructor() {
    this.api.auditReport().subscribe((r) => this.report.set(r));
  }

  protected format(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  protected factorList(u: AuditReport['topRiskyUsers'][number]): string {
    return u.factors.map((f) => f.label).join('; ');
  }

  protected severityLabel(s: string): string {
    return SEVERITY_LABELS[s] ?? s;
  }

  protected bandLabel(b: string): string {
    return BAND_LABELS[b] ?? b;
  }

  protected print(): void {
    window.print();
  }

  protected exportJson(): void {
    const data = this.report();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bapi-audit-report.json';
    a.click();
    URL.revokeObjectURL(url);
  }
}
