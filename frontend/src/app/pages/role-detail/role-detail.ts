import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { RoleDetail } from '../../core/models';
import { AiInsightComponent } from '../../shared/ai-insight';

@Component({
  selector: 'app-role-detail',
  imports: [RouterLink, AiInsightComponent],
  template: `
    @if (role(); as r) {
      <div class="page-head">
        <a routerLink="/roles" class="back">← Roles</a>
        <h1>{{ r.name }}</h1>
        <p><span class="mono">{{ r.id }}</span> · {{ r.area }} — {{ r.description }}</p>
      </div>

      <app-ai-insight
        label="AI role analysis"
        hint="Explain in business terms what this role allows and whether it looks over-powered."
        [prompt]="aiPrompt()"
      />

      <div class="cols">
        <div class="card">
          <h2>Authorizations</h2>
          <table>
            <thead>
              <tr><th>Auth object</th><th>Field</th><th>Value</th><th>T-Code</th></tr>
            </thead>
            <tbody>
              @for (a of r.authorizations; track $index) {
                <tr>
                  <td class="mono">{{ a.object }}</td>
                  <td class="mono">{{ a.field }}</td>
                  <td class="mono">{{ a.value }}</td>
                  <td><span class="chip">{{ a.tcode }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="card">
          <h2>Members ({{ r.members.length }})</h2>
          @if (r.members.length === 0) {
            <p class="muted">No users hold this role.</p>
          } @else {
            <ul class="members">
              @for (m of r.members; track m.id) {
                <li>
                  <a class="link" [routerLink]="['/users', m.id]">{{ m.name }}</a>
                  <span class="mono muted">{{ m.id }}</span>
                </li>
              }
            </ul>
          }
        </div>
      </div>
    } @else {
      <div class="empty">Loading…</div>
    }
  `,
  styles: [
    `
      .back {
        color: var(--primary);
        font-weight: 600;
        font-size: 13px;
      }
      .cols {
        display: grid;
        grid-template-columns: 1.7fr 1fr;
        gap: 16px;
      }
      .link {
        color: var(--primary);
        font-weight: 600;
      }
      .members {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .members li {
        display: flex;
        justify-content: space-between;
        padding: 9px 4px;
        border-bottom: 1px solid var(--border);
      }
      @media (max-width: 900px) {
        .cols {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class RoleDetailComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  protected readonly role = signal<RoleDetail | null>(null);

  protected readonly aiPrompt = computed(() => {
    const r = this.role();
    return r
      ? `Explain in plain business terms what the SAP role ${r.id} ("${r.name}") actually allows, ` +
          `based on its transactions and authorization objects. Is it sensitive or over-powered, ` +
          `and what should reviewers watch for? Use the data tools.`
      : '';
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.role(id).subscribe((r) => this.role.set(r));
  }
}
