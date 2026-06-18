import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AiInsightComponent } from '../../shared/ai-insight';
import {
  RoleExplanation,
  RoleRecommendation,
  SodFinding,
  User,
} from '../../core/models';

@Component({
  selector: 'app-user-detail',
  imports: [RouterLink, AiInsightComponent],
  template: `
    @if (user(); as u) {
      <div class="page-head">
        <a routerLink="/users" class="back">← Benutzer</a>
        <h1>{{ u.name }}</h1>
        <p>
          <span class="mono">{{ u.id }}</span> · {{ u.department }} ·
          beigetreten {{ u.joinedAt }} ·
          <span class="tag" [class.tag-primary]="u.status === 'ACTIVE'">{{ u.status === 'ACTIVE' ? 'Aktiv' : 'Inaktiv' }}</span>
        </p>
      </div>

      @if (findings().length) {
        <div class="card risk-banner">
          <strong>⚠ {{ findings().length }} Funktionstrennungsrisiko(en)</strong>
          @for (f of findings(); track f.ruleId) {
            <div class="risk-row">
              <span class="sev sev-{{ f.severity }}">{{ f.severity }}</span>
              {{ f.description }}
              <span class="muted">({{ f.roleA }} + {{ f.roleB }})</span>
            </div>
          }
        </div>
      }

      <app-ai-insight
        label="KI-Risikozusammenfassung"
        hint="Fragen Sie die KI, warum dieser Benutzer ein Risiko darstellt und was dagegen zu tun ist."
        [prompt]="aiPrompt()"
      />

      <div class="card">
        <h2>Zugewiesene Rollen</h2>
        <table>
          <thead>
            <tr><th>Rolle</th><th>Bereich</th><th>Zugewiesen</th><th>Zuletzt verwendet</th><th></th></tr>
          </thead>
          <tbody>
            @for (r of u.roles; track r.id) {
              <tr>
                <td>
                  <a class="link" [routerLink]="['/roles', r.id]">{{ r.name }}</a>
                  <div class="mono muted">{{ r.id }}</div>
                </td>
                <td>{{ r.area }}</td>
                <td>{{ r.assignment.assignedAt }}</td>
                <td>{{ r.assignment.lastUsedAt ?? 'nie' }}</td>
                <td>
                  <button class="btn small" (click)="explain(u.id, r.id)">Warum?</button>
                </td>
              </tr>
            }
          </tbody>
        </table>

        @if (explanation(); as e) {
          <div class="explain">
            <strong>{{ e.role.id }}</strong> — {{ e.narrative }}
            @if (e.assignment.reason) {
              <div class="muted">Ursprünglicher Grund: {{ e.assignment.reason }}</div>
            }
          </div>
        }
      </div>

      <div class="card">
        <div class="card-head">
          <h2>Rollenempfehlungen</h2>
          <button class="btn small" (click)="recommend(u.id)">Rollen vorschlagen</button>
        </div>
        @if (recommendations() === null) {
          <p class="muted">Basierend auf den Rollen, die Kollegen in der Abteilung {{ u.department }} besitzen.</p>
        } @else if (recommendations()!.length === 0) {
          <p class="muted">Keine zusätzlichen Rollen empfohlen — die Abdeckung durch Kollegen ist bereits gegeben.</p>
        } @else {
          <table>
            <thead><tr><th>Rolle</th><th>Kollegenunterstützung</th><th>Warum</th></tr></thead>
            <tbody>
              @for (rec of recommendations(); track rec.roleId) {
                <tr>
                  <td><strong>{{ rec.roleName }}</strong> <span class="mono muted">{{ rec.roleId }}</span></td>
                  <td>{{ (rec.score * 100).toFixed(0) }}%</td>
                  <td class="muted">{{ rec.rationale }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    } @else {
      <div class="empty">Wird geladen…</div>
    }
  `,
  styles: [
    `
      .back {
        color: var(--primary);
        font-weight: 600;
        font-size: 13px;
      }
      .card {
        margin-bottom: 16px;
      }
      .card-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .link {
        color: var(--primary);
        font-weight: 600;
      }
      .small {
        padding: 5px 11px;
        font-size: 13px;
      }
      .risk-banner {
        border-left: 4px solid var(--high);
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .risk-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }
      .explain {
        margin-top: 14px;
        padding: 14px;
        background: var(--primary-soft);
        border-radius: var(--radius-sm);
        line-height: 1.55;
      }
    `,
  ],
})
export class UserDetailComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly user = signal<User | null>(null);
  protected readonly findings = signal<SodFinding[]>([]);

  protected readonly aiPrompt = computed(() => {
    const u = this.user();
    return u
      ? `Bewerten Sie das Zugriffsrisiko des Benutzers ${u.name} (${u.id}) in der Abteilung ${u.department}. ` +
          `Fassen Sie seine Rollen zusammen, weisen Sie auf SAP_ALL, kritische Basis-Transaktionen, ` +
          `Funktionstrennungskonflikte sowie ruhende oder abteilungsübergreifende Rollen hin und empfehlen Sie konkrete Maßnahmen. Verwenden Sie die Datenwerkzeuge.`
      : '';
  });
  protected readonly explanation = signal<RoleExplanation | null>(null);
  protected readonly recommendations = signal<RoleRecommendation[] | null>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.user(id).subscribe((u) => this.user.set(u));
    this.api.sod().subscribe((all) =>
      this.findings.set(all.filter((f) => f.userId === id)),
    );
  }

  explain(userId: string, roleId: string): void {
    this.explanation.set(null);
    this.api.explain(userId, roleId).subscribe((e) => this.explanation.set(e));
  }

  recommend(userId: string): void {
    this.api.recommend(userId).subscribe((r) => this.recommendations.set(r));
  }
}
