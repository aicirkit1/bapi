# BAPI Frontend (Angular)

The cockpit: a single-page app for browsing the SAP access model, reviewing risks and
talking to the AI assistant.

## Run

```bash
npm install
npm start              # http://localhost:5200
```

> Requires the backend running on <http://localhost:4000>. The API base URL is set in
> [`src/environments/environment.ts`](src/environments/environment.ts).

## Build

```bash
npm run build          # outputs to dist/frontend
```

## Pages

| Route | What it does |
|-------|--------------|
| `/connect` | **Connection Center** — "Use Demo Sandbox" or configure a real SAP connection; status badges |
| `/connectors` | **Connector & data-source selection** — RFC/BAPI/Table Reader/Risk Engine/AI Agent cards + USR02/AGR_*/TSTCT checkboxes |
| `/sync` | **Animated data-sync** — step-by-step import with real SAP table names, then into the dashboard |
| `/findings`, `/findings/:id` | **Risk Findings** (SAP_ALL, critical access, SoD, inactive, excessive) with filters; **Risk Detail** with evidence, AI recommendation, remediation steps and actions |
| `/dashboard` | Risk overview: KPIs (SAP_ALL users, total findings, inactive-with-roles), **SVG donut charts**, per-department risk bars, highest-risk users with score bars |
| `/chat` | Natural-language assistant; **streams** the answer live and shows which **data tools** the model called |
| `/graph` | **Interactive force-directed access graph** — users (coloured by risk) linked to their roles; hover to trace access, click to drill in, filter by department |
| `/users`, `/users/:id` | Browse users; per-user role list, "Why?" explanations, role recommendations, SoD risks |
| `/roles`, `/roles/:id` | Browse roles; authorization objects/T-Codes and members |
| `/risks` | All SoD findings, filterable by severity, plus the active rule catalogue |
| `/report` | **Print-ready audit report** (Save as PDF) + JSON export — the Prüfer deliverable |
| `/upload` | Upload your own CSVs or reset to the bundled sample data |

## Embedded AI (contextual, not just the chat page)

A reusable `<app-ai-insight>` component ([`shared/ai-insight.ts`](src/app/shared/ai-insight.ts))
streams a grounded, tool-calling answer inline on each page:

| Page | AI insight |
|------|-----------|
| Dashboard | **AI executive summary** of the risk posture + top priorities |
| User Detail | **AI risk summary** — why the user is risky and what to do |
| Risk Detail | **AI remediation plan** + **Draft manager email** |
| Role Detail | **AI role analysis** — what the role really allows, is it over-powered |
| Audit Report | auto-generated **AI Executive Summary** paragraph |

All reuse the same backend (`/ai/chat/stream`); each works in offline **mock** mode too.

## Architecture

- **Standalone components + signals** (Angular 21), lazy-loaded routes.
- A single typed [`ApiService`](src/app/core/api.service.ts) wraps the backend; DTOs live
  in [`core/models.ts`](src/app/core/models.ts) and mirror the API contract.
- Design tokens and shared UI primitives are in
  [`src/styles.scss`](src/styles.scss); the app shell/navigation is in
  [`src/app/app.*`](src/app).

## Demo flow (the full product narrative)

1. **Connect SAP** → click **"Use Demo SAP Sandbox"**.
2. **Connectors** → keep the default data sources → **Start Sync**.
3. **Data Sync** → watch USR02 → AGR_USERS → AGR_1251 → … import, then **Open Dashboard**.
4. **Dashboard** → see SAP_ALL users, total findings, donut charts, top risky users.
5. **Risk Findings** → filter to **SAP_ALL Assigned**, open one → read the AI recommendation
   and remediation steps → **Create Remediation Task**.
6. **Access Graph** → watch the user↔role network settle; hover a critical user.
7. **AI Chat** → _"Show me the SAP_ALL users"_ or _"What should we fix first?"_.
8. **Audit Report** → **Save as PDF**.
