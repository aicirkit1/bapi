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
      <h1>Users</h1>
      <p>{{ users().length }} users · click a row to see roles and risks.</p>
    </div>

    <div class="card">
      <input
        class="input search"
        [(ngModel)]="query"
        (ngModelChange)="search()"
        placeholder="Search by name or ID…"
      />

      @if (users().length === 0) {
        <div class="empty">No users match your search.</div>
      } @else {
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Name</th><th>Department</th>
              <th>Roles</th><th>Status</th>
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
                    {{ u.status }}
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
