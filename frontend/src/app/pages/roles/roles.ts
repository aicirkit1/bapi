import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Role } from '../../core/models';

@Component({
  selector: 'app-roles',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-head">
      <h1>Roles</h1>
      <p>{{ roles().length }} SAP roles in the model.</p>
    </div>

    <div class="card">
      <input
        class="input search"
        [(ngModel)]="query"
        (ngModelChange)="search()"
        placeholder="Search roles…"
      />
      @if (roles().length === 0) {
        <div class="empty">No roles match.</div>
      } @else {
        <table>
          <thead>
            <tr><th>Role ID</th><th>Name</th><th>Area</th><th>T-Codes</th><th>Members</th></tr>
          </thead>
          <tbody>
            @for (r of roles(); track r.id) {
              <tr [routerLink]="['/roles', r.id]" class="clickable">
                <td class="mono">{{ r.id }}</td>
                <td><strong>{{ r.name }}</strong></td>
                <td>{{ r.area }}</td>
                <td>
                  @for (t of r.transactions.slice(0, 3); track t) {
                    <span class="chip">{{ t }}</span>
                  }
                  @if (r.transactions.length > 3) {
                    <span class="muted">+{{ r.transactions.length - 3 }}</span>
                  }
                </td>
                <td>{{ r.memberCount }}</td>
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
export class RolesComponent {
  private readonly api = inject(ApiService);
  protected readonly roles = signal<Role[]>([]);
  protected query = '';

  constructor() {
    this.search();
  }

  search(): void {
    this.api.roles(this.query).subscribe((r) => this.roles.set(r));
  }
}
