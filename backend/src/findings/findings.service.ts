import { Injectable } from '@nestjs/common';
import { monthsSince } from '../common/date.util';
import { Severity } from '../common/types';
import { RiskService } from '../risk/risk.service';
import { StoreService } from '../store/store.service';

export type RiskType =
  | 'SAP_ALL_ASSIGNED'
  | 'INACTIVE_USER_WITH_ROLE'
  | 'SOD_CONFLICT'
  | 'CRITICAL_TRANSACTION_ACCESS'
  | 'EXCESSIVE_PRIVILEGE'
  | 'UNUSED_ROLE';

export type FindingStatus = 'OPEN' | 'ACCEPTED' | 'REMEDIATION';

export interface Finding {
  id: string;
  severity: Severity;
  riskType: RiskType;
  userId: string;
  userName: string;
  department: string;
  roleId?: string;
  roleName?: string;
  transactions?: string[];
  description: string;
  sourceTables: string[];
  recommendation: string;
  remediation: string[];
  status: FindingStatus;
}

/** SAP table names referenced as evidence (gives the demo authenticity). */
const TABLES = {
  users: 'USR02',
  assignments: 'AGR_USERS',
  authorizations: 'AGR_1251',
  roles: 'AGR_DEFINE',
  transactions: 'TSTCT',
};

/** Critical Basis/admin transactions that warrant CRITICAL severity. */
const CRITICAL_TCODES = ['SAP_ALL', 'SU01', 'PFCG', 'SE16', 'SE38', 'SM59', 'SCC4'];
const SAP_ALL_ROLE = 'Z_SAP_ALL';
const EXCESSIVE_ROLE_THRESHOLD = 5;
const DORMANT_MONTHS = 18;

@Injectable()
export class FindingsService {
  /** Overlaid statuses set via the action endpoint (in-memory for the MVP). */
  private readonly statusOverrides = new Map<string, FindingStatus>();

  constructor(
    private readonly store: StoreService,
    private readonly risk: RiskService,
  ) {}

  /** Compute the full, unified set of risk findings across all rule types. */
  all(): Finding[] {
    const findings: Finding[] = [];
    const push = (f: Omit<Finding, 'status'>) =>
      findings.push({
        ...f,
        status: this.statusOverrides.get(f.id) ?? 'OPEN',
      });

    for (const user of this.store.getUsers()) {
      const roles = this.store.getUserRoles(user.id);
      const tcodes = this.store.getUserTcodes(user.id);

      // Rule 1 — SAP_ALL assigned.
      const sapAll = roles.find((r) => r.id === SAP_ALL_ROLE);
      if (sapAll) {
        push({
          id: `SAP_ALL:${user.id}`,
          severity: 'HIGH',
          riskType: 'SAP_ALL_ASSIGNED',
          userId: user.id,
          userName: user.name,
          department: user.department,
          roleId: sapAll.id,
          roleName: sapAll.name,
          transactions: ['SAP_ALL'],
          description: `${user.name} besitzt das Superuser-Profil SAP_ALL — uneingeschränkter Zugriff auf das gesamte System.`,
          sourceTables: [TABLES.users, TABLES.assignments, TABLES.authorizations],
          recommendation:
            'Entfernen Sie SAP_ALL. Ersetzen Sie es durch eine minimale, aufgabenbezogene Rolle. Falls der Benutzer kein Basis-Administrator ist, sofort entziehen.',
          remediation: [
            'Prüfen Sie, ob der Benutzer Notfall-/Firefighter-Zugriff benötigt.',
            'Entfernen Sie das SAP_ALL-Profil vom Benutzer (SU01).',
            'Weisen Sie eine Rolle mit minimalen Rechten für die tatsächliche Tätigkeit zu.',
            'Leiten Sie jeden Notfallbedarf über einen überwachten Firefighter-Prozess (FFID).',
          ],
        });
      }

      // Rule 4 — critical Basis transaction access.
      const critical = tcodes.filter((t) => CRITICAL_TCODES.includes(t));
      if (critical.length && !sapAll) {
        push({
          id: `CRIT_TCODE:${user.id}`,
          severity: 'HIGH',
          riskType: 'CRITICAL_TRANSACTION_ACCESS',
          userId: user.id,
          userName: user.name,
          department: user.department,
          transactions: critical,
          description: `${user.name} kann kritische Basis-Transaktionen (${critical.join(', ')}) ausführen, die das System oder dessen Sicherheit verändern können.`,
          sourceTables: [TABLES.assignments, TABLES.authorizations, TABLES.transactions],
          recommendation:
            'Beschränken Sie kritische Basis-Transaktionen auf eine kleine, benannte Admin-Gruppe mit Protokollierung. Von Fachbenutzern entfernen.',
          remediation: [
            'Prüfen Sie die geschäftliche Begründung für jede kritische Transaktion.',
            'Verschieben Sie kritische Transaktionen in eine dedizierte, überwachte Basis-Rolle.',
            'Entfernen Sie den Zugriff vom Benutzer, falls er kein Basis-Administrator ist.',
          ],
        });
      }

      // Rule 2 — inactive user still holding roles.
      if (user.status === 'INACTIVE' && roles.length > 0) {
        push({
          id: `INACTIVE:${user.id}`,
          severity: 'MEDIUM',
          riskType: 'INACTIVE_USER_WITH_ROLE',
          userId: user.id,
          userName: user.name,
          department: user.department,
          transactions: [],
          description: `${user.name} ist INAKTIV, besitzt aber weiterhin ${roles.length} aktive Rolle(n) — eine ruhende Angriffsfläche.`,
          sourceTables: [TABLES.users, TABLES.assignments],
          recommendation:
            'Sperren Sie das Konto und entfernen Sie die Rollenzuweisungen. Inaktive Benutzer dürfen keine Berechtigungen behalten.',
          remediation: [
            'Sperren Sie den Benutzerstammsatz (USR02).',
            'Entfernen Sie alle Rollenzuweisungen (AGR_USERS).',
            'Archivieren Sie das Konto gemäß dem Austrittsprozess.',
          ],
        });
      }

      // Rule 5 — excessive privilege (too many roles).
      if (roles.length > EXCESSIVE_ROLE_THRESHOLD) {
        push({
          id: `EXCESSIVE:${user.id}`,
          severity: 'LOW',
          riskType: 'EXCESSIVE_PRIVILEGE',
          userId: user.id,
          userName: user.name,
          department: user.department,
          transactions: [],
          description: `${user.name} besitzt ${roles.length} Rollen — weit über dem Normalwert, was auf angesammelte/überprivilegierte Zugriffe hindeutet.`,
          sourceTables: [TABLES.assignments, TABLES.roles],
          recommendation:
            'Führen Sie eine Zugriffsüberprüfung durch. Entfernen Sie seit 6 Monaten ungenutzte Rollen und konsolidieren Sie überlappende Rollen.',
          remediation: [
            'Überprüfen Sie jede zugewiesene Rolle anhand der aktuellen Tätigkeit.',
            'Entfernen Sie ruhende und redundante Rollen.',
            'Erwägen Sie Role Mining, um eine einzige passgenaue Rolle abzuleiten.',
          ],
        });
      }
    }

    // Rule 3 — Segregation-of-Duties (reuse the existing SoD engine).
    for (const f of this.risk.findSodViolations()) {
      const user = this.store.getUser(f.userId);
      push({
        id: `SOD:${f.userId}:${f.ruleId}`,
        severity: f.severity,
        riskType: 'SOD_CONFLICT',
        userId: f.userId,
        userName: f.userName,
        department: user?.department ?? '',
        transactions: f.tcodes,
        description: f.description,
        sourceTables: [TABLES.assignments, TABLES.authorizations, TABLES.transactions],
        recommendation:
          'Teilen Sie die widersprüchlichen Aufgaben auf zwei Personen auf oder entfernen Sie eine der beiden Rollen und erzwingen Sie eine Vier-Augen-Freigabe.',
        remediation: [
          `Entscheiden Sie, welche Funktion der Benutzer behalten soll (${f.roleA} oder ${f.roleB}).`,
          'Entfernen Sie die andere Rolle vom Benutzer.',
          'Fügen Sie eine kompensierende Kontrolle / einen Genehmigungs-Workflow hinzu, falls beide betrieblich erforderlich sind.',
        ],
      });
    }

    return findings.sort((a, b) => rank(b.severity) - rank(a.severity));
  }

  filter(opts: {
    severity?: Severity;
    riskType?: RiskType;
    status?: FindingStatus;
    q?: string;
  }): Finding[] {
    let out = this.all();
    if (opts.severity) out = out.filter((f) => f.severity === opts.severity);
    if (opts.riskType) out = out.filter((f) => f.riskType === opts.riskType);
    if (opts.status) out = out.filter((f) => f.status === opts.status);
    if (opts.q) {
      const q = opts.q.toLowerCase();
      out = out.filter(
        (f) =>
          f.userName.toLowerCase().includes(q) ||
          f.userId.toLowerCase().includes(q) ||
          (f.roleId ?? '').toLowerCase().includes(q),
      );
    }
    return out;
  }

  byId(id: string): Finding | undefined {
    return this.all().find((f) => f.id === id);
  }

  setStatus(id: string, status: FindingStatus): Finding | undefined {
    this.statusOverrides.set(id, status);
    return this.byId(id);
  }

  /** Aggregate counts used by the dashboard. */
  summary() {
    const all = this.all();
    const byType: Record<RiskType, number> = {
      SAP_ALL_ASSIGNED: 0,
      INACTIVE_USER_WITH_ROLE: 0,
      SOD_CONFLICT: 0,
      CRITICAL_TRANSACTION_ACCESS: 0,
      EXCESSIVE_PRIVILEGE: 0,
      UNUSED_ROLE: 0,
    };
    const bySeverity: Record<Severity, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const f of all) {
      byType[f.riskType]++;
      bySeverity[f.severity]++;
    }
    const usersWithSapAll = all.filter(
      (f) => f.riskType === 'SAP_ALL_ASSIGNED',
    ).length;
    const inactiveWithRoles = all.filter(
      (f) => f.riskType === 'INACTIVE_USER_WITH_ROLE',
    ).length;
    const dormantRoles = this.store
      .getAssignments()
      .filter((a) => {
        const m = monthsSince(a.lastUsedAt);
        return m === null || m >= DORMANT_MONTHS;
      }).length;

    return {
      total: all.length,
      critical: bySeverity.HIGH,
      byType,
      bySeverity,
      usersWithSapAll,
      inactiveWithRoles,
      dormantRoles,
    };
  }
}

function rank(s: Severity): number {
  return s === 'HIGH' ? 3 : s === 'MEDIUM' ? 2 : 1;
}
