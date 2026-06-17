import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { SapConnection } from '../../core/models';

@Component({
  selector: 'app-connect',
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <h1>SAP Connection Center</h1>
      <p>Connect a real SAP system, or spin up a demo sandbox — no SAP required.</p>
    </div>

    <div class="choices">
      <div class="card choice demo">
        <div class="choice-icon">⚡</div>
        <h2>Use Demo SAP Sandbox</h2>
        <p class="muted">
          Instantly create a pre-loaded sandbox connection and explore the full
          product flow with realistic mock SAP data.
        </p>
        <button class="btn btn-primary" [disabled]="busy()" (click)="useDemo()">
          {{ busy() ? 'Connecting…' : 'Use Demo SAP Sandbox →' }}
        </button>
      </div>

      <div class="card choice">
        <div class="choice-icon">🔌</div>
        <h2>Add Real SAP Connection</h2>
        <p class="muted">
          Enter your SAP system details. Test the connection, then save it.
        </p>
        <button class="btn" (click)="showForm.set(!showForm())">
          {{ showForm() ? 'Hide form' : 'Configure connection' }}
        </button>
      </div>
    </div>

    @if (showForm()) {
      <div class="card form-card">
        <h2>New connection</h2>
        <div class="grid">
          <label>Connection Name<input class="input" [(ngModel)]="form.name" placeholder="SAP Production" /></label>
          <label>SAP Host<input class="input" [(ngModel)]="form.host" placeholder="sap-prod.bank.local" /></label>
          <label>SAP Client<input class="input" [(ngModel)]="form.client" placeholder="100" /></label>
          <label>System Number<input class="input" [(ngModel)]="form.systemNumber" placeholder="00" /></label>
          <label>Username<input class="input" [(ngModel)]="form.username" placeholder="RFC_USER" /></label>
          <label>Password<input class="input" type="password" [(ngModel)]="form.password" placeholder="••••••" /></label>
          <label>Language<input class="input" [(ngModel)]="form.language" placeholder="EN" /></label>
        </div>
        <div class="actions">
          <button class="btn" [disabled]="busy()" (click)="save()">Save Connection</button>
          <span class="muted hint">
            Test Connection will report <strong>FAILED</strong> until a live SAP / node-rfc is wired up.
          </span>
        </div>
      </div>
    }

    @if (connections().length) {
      <div class="card">
        <h2>Connections</h2>
        <table>
          <thead>
            <tr><th>Name</th><th>Host</th><th>Client</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            @for (c of connections(); track c.id) {
              <tr>
                <td><strong>{{ c.name }}</strong></td>
                <td class="mono muted">{{ c.host || '—' }}</td>
                <td class="mono">{{ c.client || '—' }}</td>
                <td><span class="badge b-{{ c.status }}">{{ c.status }}</span></td>
                <td class="row-actions">
                  <button class="btn small" (click)="test(c)">Test</button>
                  <button class="btn small btn-primary" (click)="proceed(c)">Use →</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [
    `
      .choices {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 16px;
      }
      .choice {
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: flex-start;
      }
      .choice.demo {
        border: 1.5px solid var(--primary);
        background: linear-gradient(180deg, var(--primary-soft), var(--surface));
      }
      .choice-icon {
        font-size: 28px;
      }
      .choice .btn {
        margin-top: auto;
      }
      .form-card {
        margin-bottom: 16px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin: 12px 0;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 5px;
        font-size: 12px;
        font-weight: 600;
        color: var(--text-muted);
      }
      .actions {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .hint {
        font-size: 12px;
      }
      .small {
        padding: 5px 11px;
        font-size: 13px;
      }
      .row-actions {
        display: flex;
        gap: 6px;
        justify-content: flex-end;
      }
      .badge {
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
      }
      .b-DEMO {
        background: var(--primary-soft);
        color: var(--primary);
      }
      .b-CONNECTED {
        background: var(--low-soft);
        color: var(--low);
      }
      .b-FAILED {
        background: var(--high-soft);
        color: var(--high);
      }
      .b-DISCONNECTED {
        background: var(--surface-2);
        color: var(--text-muted);
      }
      @media (max-width: 800px) {
        .choices,
        .grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ConnectionCenterComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  protected readonly connections = signal<SapConnection[]>([]);
  protected readonly busy = signal(false);
  protected readonly showForm = signal(false);
  protected form: Partial<SapConnection> & { password?: string } = {
    language: 'EN',
  };

  constructor() {
    this.refresh();
  }

  private refresh(): void {
    this.api.connections().subscribe((c) => this.connections.set(c));
  }

  useDemo(): void {
    this.busy.set(true);
    this.api.createDemoConnection().subscribe({
      next: (c) => this.proceed(c),
      error: () => this.busy.set(false),
    });
  }

  save(): void {
    this.busy.set(true);
    this.api.createConnection(this.form).subscribe({
      next: () => {
        this.busy.set(false);
        this.showForm.set(false);
        this.refresh();
      },
      error: () => this.busy.set(false),
    });
  }

  test(c: SapConnection): void {
    this.api.testConnection(c.id).subscribe(() => this.refresh());
  }

  proceed(c: SapConnection): void {
    this.router.navigate(['/connectors'], { queryParams: { conn: c.id } });
  }
}
