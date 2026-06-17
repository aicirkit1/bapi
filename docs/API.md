# API Contract

Base URL (dev): `http://localhost:4000/api`

All responses are JSON. Errors follow Nest's default shape:
`{ "statusCode": number, "message": string|string[], "error": string }`.

## Data types (DTOs)

```ts
type UserStatus = 'ACTIVE' | 'INACTIVE';

interface User {
  id: string;            // e.g. "U1001"
  name: string;          // "Hans Müller"
  department: string;    // "Credit"
  joinedAt: string;      // ISO date
  status: UserStatus;
}

interface Role {
  id: string;            // e.g. "Z_CREDIT_APPROVE"
  name: string;          // "Credit Approval"
  description: string;
  area: string;          // business area, e.g. "Credit", "Payments"
  transactions: string[];// T-Codes, e.g. ["F-53","FB02"]
}

interface Authorization {
  object: string;        // SAP auth object, e.g. "F_BKPF_BUK"
  field: string;         // e.g. "ACTVT"
  value: string;         // e.g. "01"
  tcode: string;         // e.g. "F-53"
}

interface UserRoleAssignment {
  userId: string;
  roleId: string;
  assignedAt: string;    // ISO date
  lastUsedAt: string | null;
  reason?: string;       // historical justification if known
}

interface SodFinding {
  userId: string;
  userName: string;
  ruleId: string;        // e.g. "PAYMENT_CREATE_AND_APPROVE"
  description: string;
  roleA: string;
  roleB: string;
  tcodes: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}
```

## Endpoints

### Health / meta
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Liveness probe |
| GET | `/api/stats`  | Dashboard KPIs: counts of users, roles, authorizations, open SoD findings |

### Data ingest
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/data/upload` | `multipart/form-data` with `users`, `roles`, `authorizations` CSV files. Re-seeds the store. |
| POST | `/api/data/reset`  | Reset store back to the bundled sample data |

### SAP onboarding flow (product demo)
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/api/sap/connections` | List connection definitions |
| POST | `/api/sap/connections` | Create a real connection (status `DISCONNECTED`) |
| POST | `/api/sap/connections/demo` | Create a ready demo sandbox connection (`DEMO`) |
| POST | `/api/sap/connections/:id/test` | Test (demo → `DEMO`; real → `FAILED` until node-rfc) |
| GET  | `/api/sap/connectors` | Connector cards + selectable data sources (USR02, AGR_*, TSTCT …) |
| POST | `/api/sap/sync/start` | Start a data-sync job → `{ jobId }` |
| GET  | `/api/sap/sync/:jobId/status` | Step-by-step progress (table names, counts, % done) |

### Risk findings (unified engine)
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/api/findings` | All findings (`?severity=&riskType=&status=&q=`) |
| GET  | `/api/findings/summary` | Counts by type/severity, SAP_ALL users, inactive-with-roles |
| GET  | `/api/findings/:id` | One finding with evidence, recommendation, remediation steps |
| POST | `/api/findings/:id/action` | Set status `OPEN` \| `ACCEPTED` \| `REMEDIATION` |

Risk types: `SAP_ALL_ASSIGNED`, `CRITICAL_TRANSACTION_ACCESS`, `SOD_CONFLICT`,
`INACTIVE_USER_WITH_ROLE`, `EXCESSIVE_PRIVILEGE`.

### Users & roles
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users` | List users (`?q=` search, `?department=`) |
| GET | `/api/users/:id` | Single user with their roles |
| GET | `/api/users/:id/explain?roleId=` | Why does this user have this role? (structured + narrative) |
| GET | `/api/roles` | List roles (`?q=`, `?area=`) |
| GET | `/api/roles/:id` | Single role with authorizations and member count |
| GET | `/api/roles/recommend?userId=` | Recommend roles for a (new) user based on peers |

### Risk (SoD)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/risk/sod` | All current SoD findings (`?severity=`) |
| GET | `/api/risk/rules` | The active SoD rule catalogue |

### Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics/overview` | KPIs, SoD-by-severity, risk-band distribution, per-department risk, top risky users |
| GET | `/api/analytics/risk-scores` | Composite 0–100 risk score per user with explainable factors |
| GET | `/api/analytics/risk-scores/:userId` | Risk score for one user |
| GET | `/api/analytics/dormant` | Dormant role assignments (unused > 18 months) |
| GET | `/api/analytics/graph` | Nodes + links for the access graph (`?department=`) |
| GET | `/api/analytics/audit-report` | Full structured audit report |

### AI chat
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai/chat` | Body `{ message: string, history?: {role,content}[] }`. Returns `{ answer: string, grounding: object, mode: 'llm'|'mock' }` |
| POST | `/api/ai/chat/stream` | Same body. Streams the answer as **Server-Sent Events**; with OpenAI the model runs a tool-calling loop over the data. |

#### Streaming events (`/api/ai/chat/stream`)

Each SSE frame is `data: <json>\n\n` where `<json>` is a `StreamEvent`:

```ts
type StreamEvent =
  | { type: 'token'; text: string }          // a piece of the answer
  | { type: 'tool'; name: string }           // a data tool the model invoked
  | { type: 'done'; mode: 'llm' | 'mock'; toolsUsed: string[] }
  | { type: 'error'; message: string };
```

**Tools the model can call** (read-only, over the bank's data): `search_users`,
`get_user`, `explain_role`, `recommend_roles`, `get_role`, `find_sod_risks`.

## Example: role explanation

`GET /api/users/U1001/explain?roleId=Z_CREDIT_APPROVE`

```json
{
  "user": { "id": "U1001", "name": "Hans Müller", "department": "Credit" },
  "role": { "id": "Z_CREDIT_APPROVE", "name": "Credit Approval" },
  "assignment": {
    "assignedAt": "2018-04-12",
    "lastUsedAt": "2024-03-01",
    "reason": "Assigned for credit department duties in 2018."
  },
  "narrative": "This role was assigned in 2018 due to a role in the credit department and has not been actively used in the last 24 months."
}
```

## CSV input format

**users.csv** — `id,name,department,joinedAt,status`
**roles.csv** — `id,name,description,area,transactions` (transactions `;`-separated)
**authorizations.csv** — `roleId,object,field,value,tcode`
**assignments.csv** — `userId,roleId,assignedAt,lastUsedAt,reason`

Sample files live in [`backend/data/`](../backend/data).
