import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { SodFinding, SodRule } from '../../core/models';

@Component({
  selector: 'app-risks',
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <h1>Segregation-of-Duties Risks</h1>
      <p>Users who hold conflicting capabilities that should be separated.</p>
    </div>

    <div class="filters">
      @for (s of ['ALL', 'HIGH', 'MEDIUM', 'LOW']; track s) {
        <button
          class="btn small"
          [class.btn-primary]="filter() === s"
          (click)="setFilter(s)"
        >
          {{ s }}
        </button>
      }
    </div>

    <div class="card">
      @if (filtered().length === 0) {
        <div class="empty">No conflicts for this filter 🎉</div>
      } @else {
        <table>
          <thead>
            <tr><th>User</th><th>Rule</th><th>Conflict</th><th>T-Codes</th><th>Severity</th></tr>
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
                <td><span class="sev sev-{{ f.severity }}">{{ f.severity }}</span></td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>

    <div class="card">
      <h2>Active SoD rule catalogue</h2>
      <table>
        <thead><tr><th>Rule</th><th>Description</th><th>Severity</th></tr></thead>
        <tbody>
          @for (r of rules(); track r.id) {
            <tr>
              <td class="mono">{{ r.id }}</td>
              <td class="muted">{{ r.description }}</td>
              <td><span class="sev sev-{{ r.severity }}">{{ r.severity }}</span></td>
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
}

function rank(s: string): number {
  return s === 'HIGH' ? 3 : s === 'MEDIUM' ? 2 : 1;
}
