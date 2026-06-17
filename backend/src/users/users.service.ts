import { Injectable, NotFoundException } from '@nestjs/common';
import { Role, UserWithRoles } from '../common/types';
import { StoreService } from '../store/store.service';

export interface RoleExplanation {
  user: { id: string; name: string; department: string };
  role: { id: string; name: string };
  assignment: {
    assignedAt: string;
    lastUsedAt: string | null;
    reason?: string;
  };
  monthsSinceLastUse: number | null;
  narrative: string;
}

export interface RoleRecommendation {
  roleId: string;
  roleName: string;
  area: string;
  peersWithRole: number;
  peerCount: number;
  score: number; // share of department peers holding the role (0..1)
  rationale: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly store: StoreService) {}

  list(filter: { q?: string; department?: string }): UserWithRoles[] {
    let users = this.store.getUsers();
    if (filter.department) {
      users = users.filter((u) => u.department === filter.department);
    }
    if (filter.q) {
      const q = filter.q.toLowerCase();
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q),
      );
    }
    return users.map((u) => this.withRoles(u.id));
  }

  getOne(id: string): UserWithRoles {
    return this.withRoles(id);
  }

  private withRoles(id: string): UserWithRoles {
    const user = this.store.getUser(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    const assignments = this.store.getUserAssignments(id);
    const roles = assignments
      .map((a) => {
        const role = this.store.getRole(a.roleId);
        if (!role) return null;
        return {
          ...role,
          assignment: {
            assignedAt: a.assignedAt,
            lastUsedAt: a.lastUsedAt,
            reason: a.reason,
          },
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    return { ...user, roles };
  }

  /** Answer: "Why does this user have this role?" */
  explain(userId: string, roleId: string): RoleExplanation {
    const user = this.store.getUser(userId);
    if (!user) throw new NotFoundException(`User ${userId} not found`);
    const role = this.store.getRole(roleId);
    if (!role) throw new NotFoundException(`Role ${roleId} not found`);
    const assignment = this.store
      .getUserAssignments(userId)
      .find((a) => a.roleId === roleId);
    if (!assignment) {
      throw new NotFoundException(
        `User ${userId} does not have role ${roleId}`,
      );
    }

    const months = monthsSince(assignment.lastUsedAt);
    const narrative = buildNarrative({
      userName: user.name,
      roleName: role.name,
      assignedAt: assignment.assignedAt,
      reason: assignment.reason,
      monthsSinceLastUse: months,
      department: user.department,
      roleArea: role.area,
    });

    return {
      user: { id: user.id, name: user.name, department: user.department },
      role: { id: role.id, name: role.name },
      assignment: {
        assignedAt: assignment.assignedAt,
        lastUsedAt: assignment.lastUsedAt,
        reason: assignment.reason,
      },
      monthsSinceLastUse: months,
      narrative,
    };
  }

  /**
   * Recommend roles for a user based on what peers in the same department hold.
   * Works for existing or freshly-created users (new joiner provisioning).
   */
  recommend(userId: string): RoleRecommendation[] {
    const user = this.store.getUser(userId);
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const peers = this.store
      .getUsers()
      .filter((u) => u.department === user.department && u.id !== userId);
    const peerCount = peers.length;
    if (peerCount === 0) return [];

    const ownRoleIds = new Set(
      this.store.getUserRoles(userId).map((r) => r.id),
    );

    // Count how many peers hold each role.
    const counts = new Map<string, number>();
    for (const peer of peers) {
      for (const role of this.store.getUserRoles(peer.id)) {
        counts.set(role.id, (counts.get(role.id) ?? 0) + 1);
      }
    }

    const recs: RoleRecommendation[] = [];
    for (const [roleId, peersWithRole] of counts) {
      if (ownRoleIds.has(roleId)) continue; // already has it
      const role = this.store.getRole(roleId);
      if (!role) continue;
      const score = peersWithRole / peerCount;
      if (score < 0.5) continue; // only roles the majority of peers hold
      recs.push({
        roleId,
        roleName: role.name,
        area: role.area,
        peersWithRole,
        peerCount,
        score: Math.round(score * 100) / 100,
        rationale: `${peersWithRole} of ${peerCount} peers in ${user.department} hold "${role.name}".`,
      });
    }

    return recs.sort((a, b) => b.score - a.score);
  }
}

function monthsSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const then = new Date(dateStr);
  if (Number.isNaN(then.getTime())) return null;
  const now = new Date();
  return (
    (now.getFullYear() - then.getFullYear()) * 12 +
    (now.getMonth() - then.getMonth())
  );
}

function buildNarrative(ctx: {
  userName: string;
  roleName: string;
  assignedAt: string;
  reason?: string;
  monthsSinceLastUse: number | null;
  department: string;
  roleArea: string;
}): string {
  const year = ctx.assignedAt?.slice(0, 4);
  const parts: string[] = [];

  if (ctx.reason) {
    parts.push(ctx.reason.replace(/\.$/, '') + '.');
  } else {
    parts.push(`Role "${ctx.roleName}" was assigned in ${year}.`);
  }

  if (ctx.monthsSinceLastUse === null) {
    parts.push('It has never been recorded as used.');
  } else if (ctx.monthsSinceLastUse >= 12) {
    parts.push(
      `It has not been actively used in the last ${ctx.monthsSinceLastUse} months, suggesting it may be reviewed for removal.`,
    );
  } else {
    parts.push(
      `It was last used ${ctx.monthsSinceLastUse} month(s) ago and appears active.`,
    );
  }

  if (ctx.roleArea && ctx.department && ctx.roleArea !== ctx.department) {
    parts.push(
      `Note: the role belongs to the "${ctx.roleArea}" area while ${ctx.userName} is now in "${ctx.department}" — a possible leftover from a department change.`,
    );
  }

  return parts.join(' ');
}
