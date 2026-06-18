import { Injectable } from '@nestjs/common';
import { monthsSince } from '../common/date.util';
import { Severity } from '../common/types';
import { RiskService } from '../risk/risk.service';
import { StoreService } from '../store/store.service';

/** A user role is considered dormant after this many months without use. */
const DORMANT_MONTHS = 18;
/** Holding more than this many roles flags potential over-provisioning. */
const OVER_PRIVILEGED_ROLES = 5;

export interface RiskFactor {
  label: string;
  points: number;
}

export interface UserRiskScore {
  userId: string;
  userName: string;
  department: string;
  status: string;
  score: number; // 0–100
  band: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  roleCount: number;
  sodCount: number;
  dormantCount: number;
  crossDeptCount: number;
  factors: RiskFactor[];
}

export interface AnalyticsOverview {
  totals: {
    users: number;
    roles: number;
    assignments: number;
    authorizations: number;
    departments: number;
  };
  sodBySeverity: Record<Severity, number>;
  riskBands: Record<UserRiskScore['band'], number>;
  dormantRoleAssignments: number;
  overPrivilegedUsers: number;
  crossDepartmentAssignments: number;
  byDepartment: Array<{
    department: string;
    users: number;
    sodFindings: number;
    avgRisk: number;
  }>;
  topRiskyUsers: UserRiskScore[];
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly store: StoreService,
    private readonly risk: RiskService,
  ) {}

  /** Composite risk score for a single user, with an explainable breakdown. */
  scoreUser(userId: string): UserRiskScore | null {
    const user = this.store.getUser(userId);
    if (!user) return null;

    const assignments = this.store.getUserAssignments(userId);
    const roles = this.store.getUserRoles(userId);
    const sod = this.risk.findUserSodViolations(userId);

    const dormant = assignments.filter((a) => {
      const m = monthsSince(a.lastUsedAt);
      return m === null || m >= DORMANT_MONTHS;
    });
    const crossDept = roles.filter((r) => r.area !== user.department);

    const factors: RiskFactor[] = [];
    const addFactor = (label: string, points: number) => {
      if (points > 0) factors.push({ label, points });
    };

    const sodPoints = sod.reduce(
      (sum, f) => sum + (f.severity === 'HIGH' ? 40 : f.severity === 'MEDIUM' ? 22 : 12),
      0,
    );
    addFactor(`${sod.length} Funktionstrennungskonflikt(e)`, sodPoints);
    addFactor(`${dormant.length} ruhende Rolle(n)`, dormant.length * 7);
    addFactor(`${crossDept.length} abteilungsübergreifende Rolle(n)`, crossDept.length * 6);

    const over = Math.max(0, roles.length - OVER_PRIVILEGED_ROLES);
    addFactor(`um ${over} Rolle(n) überprivilegiert`, over * 5);

    if (user.status === 'INACTIVE' && roles.length > 0) {
      addFactor('inaktiver Benutzer mit weiterhin bestehendem Zugriff', 15);
    }

    const raw = factors.reduce((s, f) => s + f.points, 0);
    const score = Math.min(100, raw);

    return {
      userId: user.id,
      userName: user.name,
      department: user.department,
      status: user.status,
      score,
      band: band(score),
      roleCount: roles.length,
      sodCount: sod.length,
      dormantCount: dormant.length,
      crossDeptCount: crossDept.length,
      factors,
    };
  }

  /** Risk scores for every user, highest first. */
  allRiskScores(): UserRiskScore[] {
    return this.store
      .getUsers()
      .map((u) => this.scoreUser(u.id))
      .filter((s): s is UserRiskScore => s !== null)
      .sort((a, b) => b.score - a.score);
  }

  dormantAssignments() {
    const out: Array<{
      userId: string;
      userName: string;
      roleId: string;
      monthsUnused: number | null;
      lastUsedAt: string | null;
    }> = [];
    for (const user of this.store.getUsers()) {
      for (const a of this.store.getUserAssignments(user.id)) {
        const m = monthsSince(a.lastUsedAt);
        if (m === null || m >= DORMANT_MONTHS) {
          out.push({
            userId: user.id,
            userName: user.name,
            roleId: a.roleId,
            monthsUnused: m,
            lastUsedAt: a.lastUsedAt,
          });
        }
      }
    }
    return out.sort((a, b) => (b.monthsUnused ?? 999) - (a.monthsUnused ?? 999));
  }

  overview(): AnalyticsOverview {
    const users = this.store.getUsers();
    const findings = this.risk.findSodViolations();
    const scores = this.allRiskScores();

    const sodBySeverity: Record<Severity, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const f of findings) sodBySeverity[f.severity]++;

    const riskBands: Record<UserRiskScore['band'], number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    for (const s of scores) riskBands[s.band]++;

    const departments = [...new Set(users.map((u) => u.department))];
    const byDepartment = departments
      .map((dept) => {
        const deptScores = scores.filter((s) => s.department === dept);
        const deptFindings = findings.filter((f) => {
          const u = this.store.getUser(f.userId);
          return u?.department === dept;
        });
        const avg =
          deptScores.length === 0
            ? 0
            : Math.round(
                deptScores.reduce((s, x) => s + x.score, 0) / deptScores.length,
              );
        return {
          department: dept,
          users: deptScores.length,
          sodFindings: deptFindings.length,
          avgRisk: avg,
        };
      })
      .sort((a, b) => b.avgRisk - a.avgRisk);

    return {
      totals: {
        users: users.length,
        roles: this.store.getRoles().length,
        assignments: this.store.getAssignments().length,
        authorizations: this.store.getAuthorizations().length,
        departments: departments.length,
      },
      sodBySeverity,
      riskBands,
      dormantRoleAssignments: this.dormantAssignments().length,
      overPrivilegedUsers: scores.filter(
        (s) => s.roleCount > OVER_PRIVILEGED_ROLES,
      ).length,
      crossDepartmentAssignments: scores.reduce(
        (sum, s) => sum + s.crossDeptCount,
        0,
      ),
      byDepartment,
      topRiskyUsers: scores.slice(0, 12),
    };
  }

  /** A structured, auditor-facing report of the whole access landscape. */
  auditReport() {
    const overview = this.overview();
    const findings = this.risk.findSodViolations();
    const scores = this.allRiskScores();

    return {
      generatedAt: new Date().toISOString(),
      title: 'SAP-Zugriffs- und Rollen-Governance — Prüfbericht',
      summary: {
        ...overview.totals,
        sodFindings: findings.length,
        sodHigh: overview.sodBySeverity.HIGH,
        dormantRoleAssignments: overview.dormantRoleAssignments,
        overPrivilegedUsers: overview.overPrivilegedUsers,
        crossDepartmentAssignments: overview.crossDepartmentAssignments,
        criticalUsers: overview.riskBands.CRITICAL,
      },
      sodBySeverity: overview.sodBySeverity,
      byDepartment: overview.byDepartment,
      topRiskyUsers: scores.slice(0, 15),
      sodFindings: [...findings].sort(
        (a, b) => sevRank(b.severity) - sevRank(a.severity),
      ),
      dormant: this.dormantAssignments().slice(0, 30),
    };
  }

  /** Nodes + links for the access-graph visualisation. */
  graph(department?: string) {
    const users = department
      ? this.store.getUsers().filter((u) => u.department === department)
      : this.store.getUsers();

    const scoreById = new Map(
      this.allRiskScores().map((s) => [s.userId, s]),
    );

    const usedRoleIds = new Set<string>();
    const links: Array<{
      source: string;
      target: string;
      dormant: boolean;
      crossDept: boolean;
    }> = [];

    for (const u of users) {
      for (const a of this.store.getUserAssignments(u.id)) {
        const role = this.store.getRole(a.roleId);
        if (!role) continue;
        usedRoleIds.add(a.roleId);
        const m = monthsSince(a.lastUsedAt);
        links.push({
          source: u.id,
          target: a.roleId,
          dormant: m === null || m >= DORMANT_MONTHS,
          crossDept: role.area !== u.department,
        });
      }
    }

    const userNodes = users.map((u) => {
      const s = scoreById.get(u.id);
      return {
        id: u.id,
        type: 'user' as const,
        label: u.name,
        group: u.department,
        score: s?.score ?? 0,
        band: s?.band ?? 'LOW',
      };
    });

    const roleNodes = [...usedRoleIds].map((id) => {
      const role = this.store.getRole(id)!;
      return {
        id: role.id,
        type: 'role' as const,
        label: role.name,
        group: role.area,
        members: this.store.getRoleMembers(role.id).length,
      };
    });

    return { nodes: [...roleNodes, ...userNodes], links };
  }
}

function band(score: number): UserRiskScore['band'] {
  if (score >= 70) return 'CRITICAL';
  if (score >= 40) return 'HIGH';
  if (score >= 20) return 'MEDIUM';
  return 'LOW';
}

function sevRank(s: Severity): number {
  return s === 'HIGH' ? 3 : s === 'MEDIUM' ? 2 : 1;
}
