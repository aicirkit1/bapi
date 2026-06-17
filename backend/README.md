# BAPI Backend (NestJS)

The API and "brain" of the platform: it ingests SAP user/role/authorization data,
explains role assignments, detects Segregation-of-Duties (SoD) risks and powers the
AI chat.

## Run

```bash
npm install
npm run start:dev      # http://localhost:4000/api  (watch mode)
# or
npm run build && npm run start:prod
```

The sample dataset in [`data/`](data) is loaded automatically on boot.

## AI configuration

The AI chat works **with or without** an API key, and supports **OpenAI or Anthropic**.
The provider is auto-detected: `OPENAI_API_KEY` wins, else `ANTHROPIC_API_KEY`, else mock.

| Mode | When | Behaviour |
|------|------|-----------|
| **mock** | no key set | Deterministic, rule-based answers built from the grounded data. Fully offline. |
| **llm**  | a key is set | Calls OpenAI (`/v1/chat/completions`) or Anthropic; answers are constrained to the grounded context. |

```bash
cp .env.example .env      # then add OPENAI_API_KEY=... (or ANTHROPIC_API_KEY=...)
```

Variables (`.env`):
- `OPENAI_API_KEY` — use OpenAI; `AI_MODEL` default `gpt-4o-mini`
- `ANTHROPIC_API_KEY` — use Anthropic; `AI_MODEL` default `claude-sonnet-4-6`
- `PORT` (default 4000), `CORS_ORIGIN` (default `http://localhost:5200`)

> The active provider/model is printed in the server log on boot, and each chat
> response includes a `mode` of `llm` or `mock`.

### Streaming + tool-calling

`POST /api/ai/chat/stream` streams the answer as Server-Sent Events. With OpenAI the
model runs a **tool-calling loop**: instead of us pre-baking a fixed context, the model
decides which read-only tools to call against the bank's data, we execute them, and the
final answer streams token-by-token. Each `done` event lists the tools that were used.

Tools ([`src/ai/ai-tools.ts`](src/ai/ai-tools.ts)): `search_users`, `get_user`,
`explain_role`, `recommend_roles`, `get_role`, `find_sod_risks`. Anthropic and mock
modes fall back to a single, non-streamed answer so the endpoint behaves uniformly.

Quick test (live OpenAI path, uses your key):

```bash
curl -N -X POST http://localhost:4000/api/ai/chat/stream \
  -H 'content-type: application/json' \
  -d '{"message":"Why does Hans Müller have Z_CREDIT_APPROVE?"}'
```

## Module map

```
src/
├── common/        types, CSV parser, .env loader
├── store/         StoreService — in-memory store, seeded from data/*.csv
├── sap/           SapConnector port + MockSapConnector (swap for BAPI later)
├── data/          /health, /stats, /data/upload, /data/reset
├── users/         /users, /users/:id, explain, recommend
├── roles/         /roles, /roles/:id
├── risk/          /risk/sod, /risk/rules — SoD rule engine
├── analytics/     /analytics/* — risk scoring, dormancy, access graph, audit report
└── ai/            /ai/chat — grounded AI assistant
```

### Regenerating the sample data

The bundled dataset (≈90 users, 29 roles, ~230 assignments with planted SoD conflicts,
dormant roles and cross-department leftovers) is produced deterministically:

```bash
node scripts/generate-seed.mjs   # overwrites data/*.csv
```

## Key endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET  | `/api/stats` | Dashboard KPIs |
| GET  | `/api/users/:id/explain?roleId=` | Why does a user hold a role? |
| GET  | `/api/users/recommend?userId=` | Recommend roles from peers |
| GET  | `/api/risk/sod` | All SoD findings |
| POST | `/api/ai/chat` | `{ message, history? }` → grounded answer |
| POST | `/api/data/upload` | Re-seed from uploaded CSVs |

Full contract: [`../docs/API.md`](../docs/API.md).

## How SAP plugs in later

Everything reads SAP through the `SapConnector` interface ([`src/sap`](src/sap)). Today
`MockSapConnector` serves the seeded CSV data. To go live, implement a
`BapiSapConnector` (BAPI/RFC) and change the single `useClass` in
[`sap.module.ts`](src/sap/sap.module.ts) — no other code changes.

## Tests

```bash
npm test
```
