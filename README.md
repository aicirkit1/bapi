# BAPI — AI-Powered SAP Access & Role Governance Platform

> **"SAP knows *who* has access. Our AI explains *why*."**
> Turning 30 years of tangled SAP authorizations into an intelligent, auditable access model.

BAPI is a platform that helps large (especially German) banks understand, audit and
govern their massively complex SAP authorization landscapes. It ingests SAP user/role/
authorization data, lets auditors ask questions in natural language, explains *why* a
user holds a role, recommends roles for new joiners, and flags **Segregation of Duties
(SoD)** risks.

---

## ⭐ Why this exists

A typical large bank has:

- ~50,000 employees
- 20,000+ SAP roles
- Millions of authorization relationships
- 20–30 years of historical, undocumented role structures

Banks know *who* has access, but struggle to explain *why*. When an auditor (Prüfer)
asks _"Why do these 300 employees have payment-approval rights?"_, answering it today
means: SAP report → Excel → old tickets → e-mails → manager interviews → **days or weeks**.

BAPI answers the same question in **minutes**.

---

## 🧱 Architecture (high level)

```
┌──────────────────────────────────────────────────────────┐
│                    Angular Frontend                       │
│   Dashboard · CSV Upload · AI Chat · Role & Risk Views    │
└───────────────────────────┬──────────────────────────────┘
                            │ REST (JSON)
┌───────────────────────────▼──────────────────────────────┐
│                     NestJS Backend                        │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────┐ ┌────────┐  │
│  │  Data   │ │   SAP    │ │ Roles  │ │ Risk │ │   AI   │  │
│  │ (CSV)   │ │Connector │ │Analysis│ │ (SoD)│ │  Chat  │  │
│  └─────────┘ └────┬─────┘ └────────┘ └──────┘ └────────┘  │
└───────────────────┼──────────────────────────────────────┘
                    │ (pluggable)
        ┌───────────┴────────────┐
        │   SAP Connector Port    │
        ├────────────┬────────────┤
   MockSapConnector   │   (future) BapiSapConnector
   reads CSV / seed   │   real SAP via BAPI / RFC
```

**Design principle — the MVP needs no real SAP.** Following the concept's roadmap, the
SAP layer is hidden behind a single port (`SapConnector`). Today a `MockSapConnector`
serves seeded CSV data "as if SAP were there" (the *"SAP varmış gibi MCP"* idea). Later a
`BapiSapConnector` reads the real system via BAPI/RFC — **no other code changes.**

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design.

---

## 📦 Monorepo layout

```
bapi/
├── README.md            ← you are here
├── docs/                ← architecture, API contract, roadmap, glossary
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── ROADMAP.md
│   └── GLOSSARY.md
├── backend/             ← NestJS API (the "brain")
│   ├── README.md
│   └── data/            ← sample SAP mock data (CSV)
└── frontend/            ← Angular SPA (the cockpit)
    └── README.md
```

---

## 🚀 Quick start

```bash
# 1. Backend  (http://localhost:4000)
cd backend
npm install
npm run start:dev

# 2. Frontend (http://localhost:5200)  — in a second terminal
cd frontend
npm install
npm start
```

Then open <http://localhost:5200>. The app lands on **Connect SAP** — click
**"Use Demo SAP Sandbox"**, pick connectors, **Start Sync**, and the risk dashboard opens.
(The data is pre-seeded, so you can also jump straight to any screen via the sidebar.)

> **AI key (optional):** With no `ANTHROPIC_API_KEY` the AI runs in a deterministic
> **mock mode** so the demo works offline. Add a key in `backend/.env` to enable real
> LLM answers. See [backend/README.md](backend/README.md).

---

## ☁️ Deploy (GCP Cloud Run)

One container serves both the API and the SPA. Push-to-deploy via Cloud Build:

```bash
gcloud config set project <PROJECT_ID>
bash deploy/setup-gcp.sh          # enables APIs, builds, deploys, prints the URL
```

Full guide — including the auto-deploy trigger and AI key handling — in
[docs/DEPLOY.md](docs/DEPLOY.md).

## 🗺️ Roadmap (MVP → Enterprise)

| Phase | Scope |
|-------|-------|
| **MVP (now)** | Guided product flow (connect → connectors → sync), unified risk findings (SAP_ALL, critical access, SoD, inactive, excessive) with remediation, CSV upload, mock SAP connector, streaming AI chat with tool-calling, risk scoring + analytics dashboard, interactive access graph, print-ready audit report |
| **Pilot**     | Real SAP connector (BAPI/RFC), role graph, audit reports |
| **Enterprise**| Role mining, anomaly detection, auto role recommendation, continuous compliance |

Full detail in [docs/ROADMAP.md](docs/ROADMAP.md).

---

## 🔒 Safety note

The AI **only reads** SAP data — it never writes changes back into SAP. Every answer is
grounded in the ingested data and is meant to be auditor-verifiable.
