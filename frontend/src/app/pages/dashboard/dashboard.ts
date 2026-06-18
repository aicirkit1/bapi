import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AnalyticsOverview, FindingsSummary } from '../../core/models';
import { AiInsightComponent } from '../../shared/ai-insight';
import { DonutComponent, DonutSegment } from '../../shared/donut';

const BAND_COLORS: Record<string, string> = {
  LOW: '#2f9e44',
  MEDIUM: '#e8920c',
  HIGH: '#f1641e',
  CRITICAL: '#d6336c',
};
const SEV_COLORS: Record<string, string> = {
  HIGH: '#d6336c',
  MEDIUM: '#e8920c',
  LOW: '#2f9e44',
};
const BAND_LABELS: Record<string, string> = {
  CRITICAL: 'Kritisch',
  HIGH: 'Hoch',
  MEDIUM: 'Mittel',
  LOW: 'Niedrig',
};

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DonutComponent, AiInsightComponent],
  template: `
    <div class="page-head row">
      <div>
        <h1>Übersicht der Zugriffsrisiken</h1>
        <p>Aktuelle Lage der SAP-Zugriffslandschaft der Bank in Echtzeit.</p>
      </div>
      <div class="head-actions">
        <a routerLink="/graph" class="btn">◈ Zugriffsgraph</a>
        <a routerLink="/report" class="btn btn-primary">⎙ Prüfbericht</a>
      </div>
    </div>

    <app-ai-insight
      label="KI-Management-Zusammenfassung"
      hint="Erstellen Sie eine Zusammenfassung der aktuellen Zugriffsrisikolage und der wichtigsten Prioritäten auf Management-Ebene."
      prompt="Give a concise executive summary (5-6 sentences) of this bank's SAP access-risk posture: how many users hold SAP_ALL, the most serious Segregation-of-Duties and critical-access risks, inactive users with roles, and the top 3 things to fix first. Use the data tools."
    />

    @if (data(); as d) {
      <div class="kpis">
        <div class="card kpi">
          <span class="kpi-label">Benutzer</span>
          <span class="kpi-value">{{ d.totals.users }}</span>
          <span class="muted">{{ d.totals.departments }} Abteilungen</span>
        </div>
        <div class="card kpi">
          <span class="kpi-label">Rollen</span>
          <span class="kpi-value">{{ d.totals.roles }}</span>
          <span class="muted">{{ d.totals.assignments }} Zuweisungen</span>
        </div>
        <div class="card kpi danger">
          <span class="kpi-label">Kritische Benutzer</span>
          <span class="kpi-value">{{ d.riskBands.CRITICAL }}</span>
          <span class="muted">Risikobewertung ≥ 70</span>
        </div>
        <div class="card kpi danger">
          <span class="kpi-label">Benutzer mit SAP_ALL</span>
          <span class="kpi-value">{{ fs()?.usersWithSapAll ?? '—' }}</span>
          <span class="muted">uneingeschränkter Superuser</span>
        </div>
        <div class="card kpi danger">
          <span class="kpi-label">Risikobefunde gesamt</span>
          <span class="kpi-value">{{ fs()?.total ?? sodTotal(d) }}</span>
          <span class="muted">{{ fs()?.critical ?? d.sodBySeverity.HIGH }} hoher Schweregrad</span>
        </div>
        <div class="card kpi warn">
          <span class="kpi-label">Inaktiv mit Rollen</span>
          <span class="kpi-value">{{ fs()?.inactiveWithRoles ?? '—' }}</span>
          <span class="muted">{{ d.dormantRoleAssignments }} ruhende Rollen</span>
        </div>
      </div>

      <div class="charts">
        <div class="card">
          <h2>Funktionstrennungskonflikte nach Schweregrad</h2>
          <app-donut [segments]="sodSegments()" caption="Konflikte" />
        </div>
        <div class="card">
          <h2>Benutzer nach Risikostufe</h2>
          <app-donut [segments]="bandSegments()" caption="Benutzer" />
        </div>
        <div class="card dept">
          <h2>Durchschnittsrisiko nach Abteilung</h2>
          <div class="bars">
            @for (b of d.byDepartment; track b.department) {
              <div class="bar-row">
                <span class="bar-label">{{ b.department }}</span>
                <div class="bar-track">
                  <div
                    class="bar-fill"
                    [style.width.%]="b.avgRisk"
                    [style.background]="riskColor(b.avgRisk)"
                  ></div>
                </div>
                <span class="bar-val">{{ b.avgRisk }}</span>
              </div>
            }
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <h2>Benutzer mit höchstem Risiko</h2>
          <a routerLink="/findings" class="link">Alle Befunde →</a>
        </div>
        <table>
          <thead>
            <tr>
              <th>Benutzer</th><th>Abteilung</th><th>Risikobewertung</th>
              <th>SoD</th><th>Ruhend</th><th>Rollen</th>
            </tr>
          </thead>
          <tbody>
            @for (u of d.topRiskyUsers; track u.userId) {
              <tr [routerLink]="['/users', u.userId]" class="clickable">
                <td><strong>{{ u.userName }}</strong></td>
                <td class="muted">{{ u.department }}</td>
                <td>
                  <div class="score">
                    <div class="score-track">
                      <div
                        class="score-fill"
                        [style.width.%]="u.score"
                        [style.background]="bandColor(u.band)"
                      ></div>
                    </div>
                    <span class="score-num" [style.color]="bandColor(u.band)">
                      {{ u.score }}
                    </span>
                    <span class="sev sev-{{ u.band === 'CRITICAL' ? 'HIGH' : u.band }}">
                      {{ bandLabel(u.band) }}
                    </span>
                  </div>
                </td>
                <td>{{ u.sodCount }}</td>
                <td>{{ u.dormantCount }}</td>
                <td>{{ u.roleCount }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="empty">Analysen werden geladen…</div>
    }
  `,
  styles: [
    `
      .row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      .head-actions {
        display: flex;
        gap: 8px;
      }
      .kpis {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 14px;
        margin-bottom: 18px;
      }
      .kpi {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 16px;
      }
      .kpi-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-muted);
        font-weight: 600;
      }
      .kpi-value {
        font-size: 28px;
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      .kpi.danger {
        border-top: 3px solid var(--high);
      }
      .kpi.danger .kpi-value {
        color: var(--high);
      }
      .kpi.warn {
        border-top: 3px solid var(--medium);
      }
      .charts {
        display: grid;
        grid-template-columns: 1fr 1fr 1.3fr;
        gap: 16px;
        margin-bottom: 16px;
      }
      .bars {
        display: flex;
        flex-direction: column;
        gap: 9px;
        margin-top: 4px;
      }
      .bar-row {
        display: grid;
        grid-template-columns: 90px 1fr 28px;
        align-items: center;
        gap: 10px;
        font-size: 13px;
      }
      .bar-label {
        color: var(--text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .bar-track {
        height: 9px;
        background: var(--surface-2);
        border-radius: 5px;
        overflow: hidden;
      }
      .bar-fill {
        height: 100%;
        border-radius: 5px;
        transition: width 0.6s ease;
      }
      .bar-val {
        text-align: right;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
      .card-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .link {
        color: var(--primary);
        font-weight: 600;
      }
      .clickable {
        cursor: pointer;
      }
      .score {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .score-track {
        width: 90px;
        height: 7px;
        background: var(--surface-2);
        border-radius: 4px;
        overflow: hidden;
      }
      .score-fill {
        height: 100%;
        border-radius: 4px;
      }
      .score-num {
        font-weight: 700;
        width: 26px;
        font-variant-numeric: tabular-nums;
      }
      @media (max-width: 1100px) {
        .kpis {
          grid-template-columns: repeat(3, 1fr);
        }
        .charts {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class DashboardComponent {
  private readonly api = inject(ApiService);
  protected readonly data = signal<AnalyticsOverview | null>(null);
  protected readonly fs = signal<FindingsSummary | null>(null);

  constructor() {
    this.api.overview().subscribe((d) => this.data.set(d));
    this.api.findingsSummary().subscribe((s) => this.fs.set(s));
  }

  protected sodTotal(d: AnalyticsOverview): number {
    return d.sodBySeverity.HIGH + d.sodBySeverity.MEDIUM + d.sodBySeverity.LOW;
  }

  protected readonly sodSegments = computed<DonutSegment[]>(() => {
    const d = this.data();
    if (!d) return [];
    return [
      { label: 'Hoch', value: d.sodBySeverity.HIGH, color: SEV_COLORS['HIGH'] },
      { label: 'Mittel', value: d.sodBySeverity.MEDIUM, color: SEV_COLORS['MEDIUM'] },
      { label: 'Niedrig', value: d.sodBySeverity.LOW, color: SEV_COLORS['LOW'] },
    ];
  });

  protected readonly bandSegments = computed<DonutSegment[]>(() => {
    const d = this.data();
    if (!d) return [];
    return [
      { label: 'Kritisch', value: d.riskBands.CRITICAL, color: BAND_COLORS['CRITICAL'] },
      { label: 'Hoch', value: d.riskBands.HIGH, color: BAND_COLORS['HIGH'] },
      { label: 'Mittel', value: d.riskBands.MEDIUM, color: BAND_COLORS['MEDIUM'] },
      { label: 'Niedrig', value: d.riskBands.LOW, color: BAND_COLORS['LOW'] },
    ];
  });

  protected bandColor(band: string): string {
    return BAND_COLORS[band] ?? BAND_COLORS['LOW'];
  }

  protected bandLabel(band: string): string {
    return BAND_LABELS[band] ?? band;
  }

  protected riskColor(score: number): string {
    if (score >= 70) return BAND_COLORS['CRITICAL'];
    if (score >= 40) return BAND_COLORS['HIGH'];
    if (score >= 20) return BAND_COLORS['MEDIUM'];
    return BAND_COLORS['LOW'];
  }
}
