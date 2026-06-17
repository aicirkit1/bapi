/**
 * Domain types shared across the backend.
 * These mirror the DTOs documented in docs/API.md.
 */

export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface User {
  id: string;
  name: string;
  department: string;
  joinedAt: string;
  status: UserStatus;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  area: string;
  transactions: string[];
}

export interface Authorization {
  roleId: string;
  object: string;
  field: string;
  value: string;
  tcode: string;
}

export interface UserRoleAssignment {
  userId: string;
  roleId: string;
  assignedAt: string;
  lastUsedAt: string | null;
  reason?: string;
}

export interface SodFinding {
  userId: string;
  userName: string;
  ruleId: string;
  description: string;
  roleA: string;
  roleB: string;
  tcodes: string[];
  severity: Severity;
}

/** Aggregated view of a user with their roles (used by API responses). */
export interface UserWithRoles extends User {
  roles: Array<Role & { assignment: Omit<UserRoleAssignment, 'userId' | 'roleId'> }>;
}
