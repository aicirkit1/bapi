import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { SodFinding, SodRule } from '../../core/models';

const SEVERITY_LABELS: Record<string, string> = {
  ALL: 'Alle',
  HIGH: 'Hoch',
  MEDIUM: 'Mittel',
  LOW: 'Niedrig',
};

@Component({
  selector: 'app-risks',
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <h1>Funktionstrennungsrisiken (SoD)</h1>
      <p>Benutzer mit widersprüchlichen Berechtigungen, die getrennt werden sollten.</p>
    </div>

    <div class="filters">
      @for (s of ['ALL', 'HIGH', 'MEDIUM', 'LOW']; track s) {
        <button
          class="btn small"
          [class.btn-primary]="filter() === s"
          (click)="setFilter(s)"
        >
          {{ severityLabel(s) }}
        </button>
      }
    </div>

    <div class="card">
      @if (filtered().length === 0) {
        <div class="empty">Keine Konflikte für diesen Filter 🎉</div>
      } @else {
        <table>
          <thead>
            <tr><th>Benutzer</th><th>Regel</th><th>Konflikt</th><th>T-Codes</th><th>Schweregrad</th></tr>
          </thead>
          <tbody>
            @for (f of filtered(); track f.userId + f.ruleId) {
              <tr>
                <td><a class="link" [routerLink]="['/users', f.userId]">{{ f.userName }}</a></td>
                <td>
                  <strong>{{ f.ruleId }}</strong>
                  <div class="muted desc">{{ f.description }}</div>
                </td>
                <td class="mono">{{ f.roleA }} + {{ f.roleB }}</td>
                <td>
                  @for (t of f.tcodes; track t) {
                    <span class="chip">{{ t }}</span>
                  }
                </td>
                <td><span class="sev sev-{{ f.severity }}">{{ severityLabel(f.severity) }}</span></td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    <div class="card">
      <h2>Aktiver SoD-Regelkatalog</h2>
      <table>
        <thead><tr><th>Regel</th><th>Beschreibung</th><th>Schweregrad</th></tr></thead>
        <tbody>
          @for (r of rules(); track r.id) {
            <tr>
              <td class="mono">{{ r.id }}</td>
              <td class="muted">{{ r.description }}</td>
              <td><span class="sev sev-{{ r.severity }}">{{ severityLabel(r.severity) }}</span></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [
    `
      .filters {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
      }
      .small {
        padding: 6px 14px;
        font-size: 13px;
      }
      .card {
        margin-bottom: 16px;
      }
      .link {
        color: var(--primary);
        font-weight: 600;
      }
      .desc {
        font-size: 12px;
        max-width: 320px;
      }
    `,
  ],
})
export class RisksComponent {
  private readonly api = inject(ApiService);
  protected readonly findings = signal<SodFinding[]>([]);
  protected readonly rules = signal<SodRule[]>([]);
  protected readonly filter = signal<string>('ALL');

  constructor() {
    this.api.sod().subscribe((f) =>
      this.findings.set(
        [...f].sort((a, b) => rank(b.severity) - rank(a.severity)),
      ),
    );
    this.api.rules().subscribe((r) => this.rules.set(r));
  }

  filtered(): SodFinding[] {
    const f = this.filter();
    return f === 'ALL'
      ? this.findings()
      : this.findings().filter((x) => x.severity === f);
  }

  setFilter(s: string): void {
    this.filter.set(s);
  }

  severityLabel(s: string): string {
    return SEVERITY_LABELS[s] ?? s;
  }
}

function rank(s: string): number {
  return s === 'HIGH' ? 3 : s === 'MEDIUM' ? 2 : 1;
}
