import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BRK_ROWS, BrkRow } from './brk-data';
import { BrkIconComponent } from './brk-icon';

@Component({
  selector: 'app-brk-list',
  imports: [FormsModule, BrkIconComponent],
  template: `
    <div class="card">
      <div class="card-title">
        <span class="ico"><brk-icon [name]="scope() === 'all' ? 'clipboard' : 'pencil'" [size]="20" /></span>
        {{ scope() === 'all'
          ? 'Meine Berechtigungskonzepte lesen/bearbeiten'
          : 'Meine Berechtigungskonzepte bearbeiten' }}
      </div>

      <div class="search-row">
        <div class="search">
          <span class="s-ico"><brk-icon name="search" [size]="18" /></span>
          <input [(ngModel)]="q" placeholder="Suchen" />
        </div>
        <button class="filter"><brk-icon name="filter" [size]="20" /></button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>IT Asset Name</th>
              <th>Archiviert</th>
              <th>Iteraplan ID</th>
              <th>Fachlicher Produktverantwortlicher</th>
              <th>Technischer Produktverantwortlicher</th>
              <th>#Fach/Tech Stell.</th>
              <th>Letzter Bearbeiter</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
            @for (r of filtered(); track r.id) {
              <tr>
                <td class="name">{{ r.name }}</td>
                <td>{{ r.archiviert ? 'Ja' : 'Nein' }}</td>
                <td class="pre">{{ r.iteraplanId }}</td>
                <td class="resp">{{ r.fachlicherPv }}</td>
                <td class="resp">{{ r.technischerPv }}</td>
                <td>{{ r.stell }}</td>
                <td>{{ r.letzterBearbeiter }}</td>
                <td>
                  <button class="btn-edit" (click)="edit(r)">Bearbeiten</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pager">
        <span>Einträge pro Seite:</span>
        <select><option>20</option><option>50</option></select>
        <span class="range">1 – 20 von {{ scope() === 'all' ? 367 : 20 }}</span>
        <span class="nav">
          <button disabled>|◁</button><button disabled>◁</button>
          <button>▷</button><button>▷|</button>
        </span>
      </div>
    </div>

    <div class="fab-row">
      <button class="btn-add">Hinzufügen</button>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        min-width: 0;
        gap: 14px;
        flex: 1;
      }
      .card {
        background: #fff;
        border: 1px solid #e1e5ee;
        border-radius: 6px;
        padding: 20px 24px 8px;
        box-shadow: 0 1px 2px rgba(20, 23, 40, 0.04);
        flex: 1;
        min-height: 0;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .card-title {
        flex: 0 0 auto;
        font-size: 18px;
        color: #2f3a4a;
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 18px;
      }
      .ico {
        color: #7a8190;
        display: inline-flex;
      }
      .search-row {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 14px;
      }
      .search {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        border: 1px solid #cfd3e0;
        border-radius: 4px;
        padding: 9px 12px;
      }
      .search input {
        border: 0;
        outline: 0;
        font-size: 14px;
        width: 100%;
        font-family: inherit;
        background: transparent;
      }
      .s-ico {
        display: inline-flex;
        color: #9aa0ad;
      }
      .filter {
        background: transparent;
        border: 0;
        color: #1f6fd6;
        cursor: pointer;
        display: inline-flex;
        padding: 4px;
      }
      .table-wrap {
        flex: 1;
        min-height: 0;
        overflow: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13.5px;
        min-width: 1160px;
      }
      th {
        position: sticky;
        top: 0;
        z-index: 1;
        background: #fff;
        text-align: left;
        color: #5a5f6e;
        font-weight: 600;
        padding: 12px 14px;
        border-bottom: 2px solid #e3e6ef;
        vertical-align: bottom;
        white-space: nowrap;
      }
      td {
        padding: 14px;
        border-bottom: 1px solid #eef0f5;
        color: #3a3a3a;
        vertical-align: top;
      }
      tr:hover td {
        background: #fafbfe;
      }
      .name {
        font-weight: 500;
        color: #2b2b2b;
      }
      .pre {
        white-space: pre-line;
      }
      .resp {
        max-width: 260px;
      }
      .btn-edit {
        background: #e2001a;
        color: #fff;
        border: 0;
        padding: 9px 22px;
        border-radius: 3px;
        font-size: 14px;
        cursor: pointer;
        font-family: inherit;
      }
      .btn-edit:hover {
        background: #c40017;
      }
      .pager {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 14px;
        padding: 14px 2px 10px;
        font-size: 13px;
        color: #5a5f6e;
        border-top: 1px solid #eef0f5;
      }
      .pager select {
        padding: 4px 6px;
        border: 1px solid #cfd3e0;
        border-radius: 3px;
      }
      .nav button {
        background: transparent;
        border: 0;
        cursor: pointer;
        color: #5a5f6e;
        padding: 2px 4px;
      }
      .nav button:disabled {
        opacity: 0.35;
        cursor: default;
      }
      .fab-row {
        flex: 0 0 auto;
        display: flex;
        justify-content: flex-end;
      }
      .btn-add {
        background: #1e88e5;
        color: #fff;
        border: 0;
        padding: 11px 26px;
        border-radius: 3px;
        font-size: 14px;
        cursor: pointer;
        font-family: inherit;
        box-shadow: 0 2px 6px rgba(30, 136, 229, 0.35);
      }
      .btn-add:hover {
        background: #1976d2;
      }

      @media (max-width: 820px) {
        :host {
          height: auto;
          flex: none;
        }
        .card {
          flex: none;
        }
        .card-title {
          font-size: 16px;
        }
      }
    `,
  ],
})
export class BrkListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly scope = signal<'mine' | 'all'>(
    this.route.snapshot.data['scope'] ?? 'mine',
  );
  protected q = '';
  protected readonly rows = BRK_ROWS;

  filtered(): BrkRow[] {
    const q = this.q.toLowerCase().trim();
    if (!q) return this.rows;
    return this.rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.iteraplanId.toLowerCase().includes(q) ||
        r.fachlicherPv.toLowerCase().includes(q),
    );
  }

  edit(r: BrkRow): void {
    this.router.navigate(['/brk/edit', r.id]);
  }
}
