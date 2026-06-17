import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Finding, RiskType } from '../../core/models';

const RISK_TYPES: RiskType[] = [
  'SAP_ALL_ASSIGNED',
  'CRITICAL_TRANSACTION_ACCESS',
  'SOD_CONFLICT',
  'INACTIVE_USER_WITH_ROLE',
  'EXCESSIVE_PRIVILEGE',
];

@Component({
  selector: 'app-findings',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-head">
      <h1>Risk Findings</h1>
      <p>Every access risk detected across the SAP landscape, with evidence and a fix.</p>
    </div>

    <div class="filters card">
      <input class="input" [(ngModel)]="q" (ngModelChange)="reload()" placeholder="Search user or role…" />
      <select class="input" [(ngModel)]="severity" (ngModelChange)="reload()">
        <option value="">All severities</option>
        <option value="HIGH">High</option>
        <option value="MEDIUM">Medium</option>
        <option value="LOW">Low</option>
      </select>
      <select class="input" [(ngModel)]="riskType" (ngModelChange)="reload()">
        <option value="">All risk types</option>
        @for (t of riskTypes; track t) {
          <option [value]="t">{{ label(t) }}</option>
        }
      </select>
      <select class="input" [(ngModel)]="status" (ngModelChange)="reload()">
        <option value="">Any status</option>
        <option value="OPEN">Open</option>
        <option value="ACCEPTED">Accepted risk</option>
        <option value="REMEDIATION">In remediation</option>
      </select>
    </div>

    <div class="card">
      @if (findings().length === 0) {
        <div class="empty">No findings match your filters.</div>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Severity</th><th>Risk type</th><th>User</th>
              <th>Role / T-Codes</th><th>Source</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            @for (f of findings(); track f.id) {
              <tr [routerLink]="['/findings', f.id]" class="clickable">
                <td><span class="sev sev-{{ f.severity }}">{{ f.severity }}</span></td>
                <td><strong>{{ label(f.riskType) }}</strong></td>
                <td>{{ f.userName }} <span class="mono muted">{{ f.userId }}</span></td>
                <td class="mono small">
                  {{ f.roleId || (f.transactions || []).slice(0, 3).join(', ') || '—' }}
                </td>
                <td>
                  @for (t of f.sourceTables; track t) {
                    <span class="chip">{{ t }}</span>
                  }
                </td>
                <td><span class="status s-{{ f.status }}">{{ f.status }}</span></td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: [
    `
      .filters {
        display: grid;
        grid-template-columns: 1.4fr 1fr 1.2fr 1fr;
        gap: 10px;
        margin-bottom: 16px;
        padding: 14px;
      }
      .clickable {
        cursor: pointer;
      }
      .small {
        font-size: 12px;
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
      @media (max-width: 900px) {
        .filters {
          grid-template-columns: 1fr 1fr;
        }
      }
    `,
  ],
})
export class FindingsComponent {
  private readonly api = inject(ApiService);
  protected readonly findings = signal<Finding[]>([]);
  protected readonly riskTypes = RISK_TYPES;

  protected q = '';
  protected severity = '';
  protected riskType = '';
  protected status = '';

  constructor() {
    this.reload();
  }

  reload(): void {
    this.api
      .findings({
        q: this.q,
        severity: this.severity,
        riskType: this.riskType,
        status: this.status,
      })
      .subscribe((f) => this.findings.set(f));
  }

  label(t: string): string {
    return t
      .toLowerCase()
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
