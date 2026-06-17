# Architecture

This document describes the technical design of the BAPI platform.

## 1. Goals & constraints

1. **MVP must run without a real SAP system.** Demo with seeded CSV data.
2. **The SAP integration must be swappable** without touching business logic — mock today,
   real BAPI/RFC tomorrow.
3. **The AI must be grounded** in the bank's own data and degrade gracefully (mock answers)
   when no LLM key is configured.
4. **Read-only** with respect to SAP. The platform analyses; it never mutates SAP.

## 2. Component overview

```
Angular SPA  ──REST──▶  NestJS API  ──port──▶  SapConnector (Mock | Bapi)
                            │
                            └──▶  AiService (Anthropic | Mock)
```

### Backend modules (NestJS)

| Module   | Responsibility |
|----------|----------------|
| `DataModule`  | CSV ingest/parsing, in-memory store (seed on boot), upload endpoint |
| `SapModule`   | `SapConnector` port + `MockSapConnector` (and future `BapiSapConnector`) |
| `OnboardingModule` | Product flow: SAP connection center, connector catalogue, data-sync job |
| `RolesModule` | Query users/roles, "why does X have role Y" role-explanation logic |
| `RiskModule`  | Segregation-of-Duties (SoD) rule engine |
| `FindingsModule` | Unified risk findings (SAP_ALL, critical access, SoD, inactive, excessive) with SAP-table evidence, recommendations and status actions |
| `AnalyticsModule` | Composite user risk scoring, dormancy/over-privilege analytics, access-graph data, audit report |
| `AiModule`    | Natural-language chat; grounded context or tool-calling, LLM or mock |

> **MongoDB note.** An external prompt suggested MongoDB. We deliberately keep the
> in-memory `StoreService` for the demo (zero infra, instant start). Because every
> consumer depends only on `StoreService`'s interface, swapping in Postgres/Prisma or
> Mongo during the Pilot phase touches just that one class — see §7.

### Frontend (Angular)

| View | Purpose |
|------|---------|
| **Dashboard** | KPIs: users, roles, authorizations, open SoD risks |
| **Upload**    | Drag & drop the three CSVs, re-seed the store |
| **Users / Roles** | Browse and drill into users and roles |
| **AI Chat**   | Ask questions in natural language, get grounded answers |
| **Risks**     | SoD conflicts list with severity |

## 3. The SAP Connector port (key abstraction)

```ts
export interface SapConnector {
  getUsers(): Promise<SapUser[]>;
  getRoles(): Promise<SapRole[]>;
  getAuthorizations(): Promise<SapAuthorization[]>;
  getUserRoles(userId: string): Promise<SapRole[]>;
}
```

- **`MockSapConnector`** — returns data from the in-memory store (seeded from CSV).
- **`BapiSapConnector`** *(future)* — calls SAP via BAPI/RFC (e.g. `node-rfc`), maps the
  result into the same DTOs. Swapped in via a Nest provider token — **no consumer changes**.

This is the concrete realisation of the *"treat it as if SAP is there via an MCP/connector,
then drop in the real SAP later"* idea from the project brief.

## 4. Data model

```
User (id, name, department, joinedAt, status)
        │  n
        ▼  (UserRoleAssignment: userId, roleId, assignedAt, lastUsedAt, reason?)
        │  m
Role (id, name, description, area, transactions[])
        │  m
        ▼  (RoleAuthorization)
Authorization (object, field, value, tcode)  ← SAP authorization object / T-Code
```

See [API.md](API.md) for the exact DTO shapes and CSV columns.

## 5. AI grounding flow

1. User asks a question in the chat.
2. `AiService` extracts entities (user names, role ids) and pulls the relevant slice of
   data from the store (the user, their roles, last-used dates, related SoD findings).
3. That slice is rendered into a compact **context block**.
4. The context + question are sent to the LLM with a system prompt that forces it to
   answer **only from the provided context** and to say when data is missing. The
   provider is pluggable and auto-detected — **OpenAI** (`/v1/chat/completions`) or
   **Anthropic** (`/v1/messages`) depending on which API key is set.
5. **No key configured →** a deterministic rule-based responder produces the same shape of
   answer from the context, so the demo is fully functional offline.

### 5.1 Streaming + tool-calling (OpenAI)

The richer live path (`POST /api/ai/chat/stream`) replaces the pre-baked context with a
**tool-calling loop**:

1. The model is given read-only **tools** ([`ai-tools.ts`](../backend/src/ai/ai-tools.ts)):
   `search_users`, `get_user`, `explain_role`, `recommend_roles`, `get_role`,
   `find_sod_risks`.
2. It decides which tools to call; `AiService` executes them against the existing
   services and feeds the JSON results back into the conversation.
3. When the model stops requesting tools, the final answer is **streamed token-by-token**
   to the browser over Server-Sent Events. Each `tool`/`done` event tells the UI which
   tools were used.

Anthropic and mock modes fall back to a single non-streamed answer so the endpoint
behaves uniformly for every provider.

## 6. SoD risk engine

A small, declarative rule set. Each rule is a pair of capability predicates that must not
be held by the same user, e.g.:

```
RULE "PAYMENT_CREATE_AND_APPROVE"
  conflictA: can create payments  (tcode F-53 / F110 ...)
  conflictB: can approve payments (tcode FBV0 / FB02 ...)
  severity:  HIGH
```

The engine scans every user's effective authorizations and reports violations with the
two conflicting roles, the tcodes involved, and a severity. Rules live in code today and
move to a config/DB-driven catalogue in the Pilot phase.

## 7. Tech choices

- **NestJS** — modular, DI-first, testable; the module boundaries map 1:1 to the domain.
- **Angular (standalone components, signals)** — typed, structured SPA suited to a data-heavy
  enterprise cockpit.
- **In-memory store for the MVP** — zero infra to run the demo; a `StoreService` interface
  lets us swap in Postgres/Prisma during Pilot without touching callers.
