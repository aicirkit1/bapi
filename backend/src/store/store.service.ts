import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv } from '../common/csv.util';
import {
  Authorization,
  Role,
  User,
  UserRoleAssignment,
} from '../common/types';

/**
 * In-memory data store for the MVP.
 *
 * Holds the four core datasets and is seeded from the bundled sample CSVs on
 * boot. During the Pilot phase this class is the single place to swap for a
 * persistent store (Postgres/Prisma) — consumers depend only on its methods.
 */
@Injectable()
export class StoreService implements OnModuleInit {
  private readonly logger = new Logger(StoreService.name);
  private readonly dataDir = join(process.cwd(), 'data');

  private users: User[] = [];
  private roles: Role[] = [];
  private authorizations: Authorization[] = [];
  private assignments: UserRoleAssignment[] = [];

  onModuleInit(): void {
    this.reseedFromSampleData();
  }

  /** Re-load the bundled sample CSVs (used on boot and by /data/reset). */
  reseedFromSampleData(): void {
    const read = (file: string) =>
      readFileSync(join(this.dataDir, file), 'utf-8');
    this.load({
      users: read('users.csv'),
      roles: read('roles.csv'),
      authorizations: read('authorizations.csv'),
      assignments: read('assignments.csv'),
    });
    this.logger.log(
      `Seeded sample data: ${this.users.length} users, ${this.roles.length} roles, ` +
        `${this.authorizations.length} authorizations, ${this.assignments.length} assignments.`,
    );
  }

  /** Replace the store contents from raw CSV strings (used by uploads). */
  load(csv: {
    users: string;
    roles: string;
    authorizations: string;
    assignments?: string;
  }): void {
    this.users = parseCsv(csv.users).map((r) => ({
      id: r.id,
      name: r.name,
      department: r.department,
      joinedAt: r.joinedAt,
      status: (r.status as User['status']) || 'ACTIVE',
    }));

    this.roles = parseCsv(csv.roles).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      area: r.area,
      transactions: (r.transactions || '')
        .split(';')
        .map((t) => t.trim())
        .filter(Boolean),
    }));

    this.authorizations = parseCsv(csv.authorizations).map((r) => ({
      roleId: r.roleId,
      object: r.object,
      field: r.field,
      value: r.value,
      tcode: r.tcode,
    }));

    this.assignments = parseCsv(csv.assignments ?? '').map((r) => ({
      userId: r.userId,
      roleId: r.roleId,
      assignedAt: r.assignedAt,
      lastUsedAt: r.lastUsedAt || null,
      reason: r.reason || undefined,
    }));
  }

  // ---- Queries -------------------------------------------------------------

  getUsers(): User[] {
    return this.users;
  }

  getUser(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  getRoles(): Role[] {
    return this.roles;
  }

  getRole(id: string): Role | undefined {
    return this.roles.find((r) => r.id === id);
  }

  getAuthorizations(): Authorization[] {
    return this.authorizations;
  }

  getRoleAuthorizations(roleId: string): Authorization[] {
    return this.authorizations.filter((a) => a.roleId === roleId);
  }

  getAssignments(): UserRoleAssignment[] {
    return this.assignments;
  }

  getUserAssignments(userId: string): UserRoleAssignment[] {
    return this.assignments.filter((a) => a.userId === userId);
  }

  getRoleMembers(roleId: string): string[] {
    return this.assignments
      .filter((a) => a.roleId === roleId)
      .map((a) => a.userId);
  }

  getUserRoles(userId: string): Role[] {
    const roleIds = new Set(
      this.getUserAssignments(userId).map((a) => a.roleId),
    );
    return this.roles.filter((r) => roleIds.has(r.id));
  }

  /** All T-Codes a user can reach through their assigned roles. */
  getUserTcodes(userId: string): string[] {
    const tcodes = new Set<string>();
    for (const role of this.getUserRoles(userId)) {
      role.transactions.forEach((t) => tcodes.add(t));
    }
    return [...tcodes];
  }
}
