import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Connector, DataSource } from '../../core/models';

@Component({
  selector: 'app-connectors',
  template: `
    <div class="page-head">
      <h1>Connectors & Data Sources</h1>
      <p>Choose the SAP data to import. Connectors handle the extraction.</p>
    </div>

    <h2 class="sec">Connectors</h2>
    <div class="connectors">
      @for (c of connectors(); track c.id) {
        <div class="card connector" [class.off]="!c.enabled">
          <div class="connector-head">
            <strong>{{ c.name }}</strong>
            <span class="badge" [class.ready]="c.status === 'READY'">{{ c.status }}</span>
          </div>
          <p class="muted">{{ c.description }}</p>
          <label class="switch">
            <input type="checkbox" [checked]="c.enabled" (change)="toggleConnector(c)" />
            <span>{{ c.enabled ? 'Enabled' : 'Disabled' }}</span>
          </label>
        </div>
      }
    </div>

    <h2 class="sec">Data sources to import</h2>
    <div class="card sources">
      @for (s of sources(); track s.id) {
        <label class="source" [class.checked]="selected().has(s.id)">
          <input type="checkbox" [checked]="selected().has(s.id)" (change)="toggleSource(s)" />
          <div class="source-text">
            <strong>{{ s.label }}</strong>
            <span class="mono muted">{{ s.table }}</span>
          </div>
        </label>
      }
    </div>

    <div class="footer">
      <span class="muted">{{ selected().size }} data source(s) selected</span>
      <button class="btn btn-primary" [disabled]="selected().size === 0" (click)="startSync()">
        Start Sync →
      </button>
    </div>
  `,
  styles: [
    `
      .sec {
        margin: 18px 0 10px;
      }
      .connectors {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
      }
      .connector {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .connector.off {
        opacity: 0.55;
      }
      .connector-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .badge {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 999px;
        background: var(--surface-2);
        color: var(--text-muted);
      }
      .badge.ready {
        background: var(--low-soft);
        color: var(--low);
      }
      .switch {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--text-muted);
        margin-top: auto;
        cursor: pointer;
      }
      .sources {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
      .source {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        border: 1.5px solid var(--border);
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: all 0.12s ease;
      }
      .source.checked {
        border-color: var(--primary);
        background: var(--primary-soft);
      }
      .source-text {
        display: flex;
        flex-direction: column;
      }
      .footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 18px;
      }
      @media (max-width: 900px) {
        .connectors,
        .sources {
          grid-template-columns: 1fr 1fr;
        }
      }
    `,
  ],
})
export class ConnectorSelectionComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  protected readonly connectors = signal<Connector[]>([]);
  protected readonly sources = signal<DataSource[]>([]);
  protected readonly selected = signal<Set<string>>(new Set());

  constructor() {
    this.api.connectors().subscribe((cat) => {
      this.connectors.set(cat.connectors);
      this.sources.set(cat.dataSources);
      this.selected.set(
        new Set(cat.dataSources.filter((s) => s.defaultSelected).map((s) => s.id)),
      );
    });
  }

  toggleConnector(c: Connector): void {
    this.connectors.update((list) =>
      list.map((x) => (x.id === c.id ? { ...x, enabled: !x.enabled } : x)),
    );
  }

  toggleSource(s: DataSource): void {
    this.selected.update((set) => {
      const next = new Set(set);
      next.has(s.id) ? next.delete(s.id) : next.add(s.id);
      return next;
    });
  }

  startSync(): void {
    this.api.startSync().subscribe((job) =>
      this.router.navigate(['/sync'], { queryParams: { job: job.jobId } }),
    );
  }
}
