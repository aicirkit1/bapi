# Roadmap

## Phase 1 — MVP (current)

Goal: a fully working demo with **no real SAP dependency**.

- [x] Monorepo (NestJS + Angular) + documentation
- [x] Sample SAP mock data (users / roles / authorizations / assignments)
- [x] `SapConnector` port + `MockSapConnector`
- [x] CSV upload & store re-seed
- [x] Role explanation ("why does X have role Y")
- [x] SoD risk engine + findings view
- [x] AI chat (LLM with offline mock fallback)
- [x] Dashboard, users, roles, risks, chat views

## Phase 2 — Bank pilot

Goal: connect to a real (sandbox) SAP system at one bank.

- [ ] `BapiSapConnector` (BAPI/RFC via `node-rfc`) behind the same port
- [ ] Persistent store (Postgres + Prisma) replacing the in-memory store
- [ ] Role graph visualisation (users ↔ roles ↔ authorizations)
- [ ] Exportable audit reports (PDF/Excel) for Prüfer questions
- [ ] AuthN/AuthZ (bank SSO / OIDC), per-bank tenant isolation
- [ ] Bank-specific AI knowledge space (per-tenant grounding)

## Phase 3 — Enterprise product

- [ ] Role mining — discover natural roles from usage patterns
- [ ] Anomaly detection — flag unusual authorization grants
- [ ] Automated role recommendation at scale
- [ ] Continuous compliance monitoring & alerting
- [ ] Convert 30 years of SAP role knowledge into a queryable corporate memory

## Guiding metrics

| Metric | Today | Target |
|--------|-------|--------|
| Time to answer an auditor question | days–weeks | minutes |
| Audit preparation cost | high | reduced |
| Over-privileged users detected | manual | automatic |
| New-joiner provisioning time | days | minutes |
