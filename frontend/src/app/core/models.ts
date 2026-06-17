export type Severity = 'LOW' | 'MEDIUM' | 'HIGH';
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface Stats {
  users: number;
  roles: number;
  authorizations: number;
  assignments: number;
  sodFindings: number;
  sodHigh: number;
  departments: number;
}

export interface Health {
  status: string;
  sapConnector: string;
  time: string;
}

export interface RoleRef {
  id: string;
  name: string;
  description: string;
  area: string;
  transactions: string[];
  assignment: {
    assignedAt: string;
    lastUsedAt: string | null;
    reason?: string;
  };
}

export interface User {
  id: string;
  name: string;
  department: string;
  joinedAt: string;
  status: UserStatus;
  roles: RoleRef[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  area: string;
  transactions: string[];
  memberCount: number;
}

export interface Authorization {
  roleId: string;
  object: string;
  field: string;
  value: string;
  tcode: string;
}

export interface RoleDetail extends Role {
  authorizations: Authorization[];
  members: Array<{ id: string; name: string }>;
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

export interface SodRule {
  id: string;
  description: string;
  severity: Severity;
  tcodesA: string[];
  tcodesB: string[];
}

export interface RoleExplanation {
  user: { id: string; name: string; department: string };
  role: { id: string; name: string };
  assignment: { assignedAt: string; lastUsedAt: string | null; reason?: string };
  monthsSinceLastUse: number | null;
  narrative: string;
}

export interface RoleRecommendation {
  roleId: string;
  roleName: string;
  area: string;
  peersWithRole: number;
  peerCount: number;
  score: number;
  rationale: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  answer: string;
  mode: 'llm' | 'mock';
  grounding: { matchedUsers: string[]; matchedRoles: string[]; facts: string[] };
}

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTED' | 'FAILED' | 'DEMO';

export interface SapConnection {
  id: string;
  name: string;
  host: string;
  client: string;
  systemNumber: string;
  username: string;
  language: string;
  status: ConnectionStatus;
  createdAt: string;
}

export interface Connector {
  id: string;
  name: string;
  description: string;
  status: 'READY' | 'BETA';
  enabled: boolean;
}

export interface DataSource {
  id: string;
  label: string;
  table: string;
  defaultSelected: boolean;
}

export interface ConnectorCatalogue {
  connectors: Connector[];
  dataSources: DataSource[];
}

export interface SyncStep {
  key: string;
  label: string;
  table: string;
  status: 'PENDING' | 'RUNNING' | 'DONE';
  count?: number;
}

export interface SyncStatus {
  jobId: string;
  done: boolean;
  progress: number;
  steps: SyncStep[];
}

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

export interface FindingsSummary {
  total: number;
  critical: number;
  byType: Record<RiskType, number>;
  bySeverity: Record<Severity, number>;
  usersWithSapAll: number;
  inactiveWithRoles: number;
  dormantRoles: number;
}

export type RiskBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface UserRiskScore {
  userId: string;
  userName: string;
  department: string;
  status: string;
  score: number;
  band: RiskBand;
  roleCount: number;
  sodCount: number;
  dormantCount: number;
  crossDeptCount: number;
  factors: { label: string; points: number }[];
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
  riskBands: Record<RiskBand, number>;
  dormantRoleAssignments: number;
  overPrivilegedUsers: number;
  crossDepartmentAssignments: number;
  byDepartment: {
    department: string;
    users: number;
    sodFindings: number;
    avgRisk: number;
  }[];
  topRiskyUsers: UserRiskScore[];
}

export interface GraphNode {
  id: string;
  type: 'user' | 'role';
  label: string;
  group: string;
  score?: number;
  band?: RiskBand;
  members?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  dormant: boolean;
  crossDept: boolean;
}

export interface AccessGraph {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface AuditReport {
  generatedAt: string;
  title: string;
  summary: Record<string, number>;
  sodBySeverity: Record<Severity, number>;
  byDepartment: AnalyticsOverview['byDepartment'];
  topRiskyUsers: UserRiskScore[];
  sodFindings: SodFinding[];
  dormant: {
    userId: string;
    userName: string;
    roleId: string;
    monthsUnused: number | null;
    lastUsedAt: string | null;
  }[];
}

/** Events streamed from POST /ai/chat/stream (Server-Sent Events). */
export type StreamEvent =
  | { type: 'token'; text: string }
  | { type: 'tool'; name: string }
  | { type: 'done'; mode: 'llm' | 'mock'; toolsUsed: string[] }
  | { type: 'error'; message: string };
