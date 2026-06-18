import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { User } from '../../core/models';

@Component({
  selector: 'app-users',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-head">
      <h1>Benutzer</h1>
      <p>{{ users().length }} Benutzer · klicken Sie auf eine Zeile, um Rollen und Risiken anzuzeigen.</p>
    </div>

    <div class="card">
      <input
        class="input search"
        [(ngModel)]="query"
        (ngModelChange)="search()"
        placeholder="Nach Name oder ID suchen…"
      />

      @if (users().length === 0) {
        <div class="empty">Keine Benutzer entsprechen Ihrer Suche.</div>
      } @else {
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Name</th><th>Abteilung</th>
              <th>Rollen</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            @for (u of users(); track u.id) {
              <tr [routerLink]="['/users', u.id]" class="clickable">
                <td class="mono">{{ u.id }}</td>
                <td><strong>{{ u.name }}</strong></td>
                <td>{{ u.department }}</td>
                <td>{{ u.roles.length }}</td>
                <td>
                  <span class="tag" [class.tag-primary]="u.status === 'ACTIVE'">
                    {{ u.status === 'ACTIVE' ? 'Aktiv' : 'Inaktiv' }}
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: [
    `
      .search {
        margin-bottom: 16px;
        max-width: 360px;
      }
      .clickable {
        cursor: pointer;
      }
    `,
  ],
})
export class UsersComponent {
  private readonly api = inject(ApiService);
  protected readonly users = signal<User[]>([]);
  protected query = '';

  constructor() {
    this.search();
  }

  search(): void {
    this.api.users(this.query).subscribe((u) => this.users.set(u));
  }
}
