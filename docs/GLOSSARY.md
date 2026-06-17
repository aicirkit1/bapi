# Glossary

| Term | Meaning |
|------|---------|
| **SAP** | Enterprise software running core bank processes (finance, HR, etc.). |
| **BAPI** | *Business Application Programming Interface* — SAP's standard, secure interface that lets external systems read/call SAP functionality. The platform's future real-data connector uses it. |
| **RFC** | *Remote Function Call* — SAP's protocol for calling function modules (incl. BAPIs) remotely. |
| **Role** | A bundle of SAP authorizations granted to users (e.g. `Z_CREDIT_APPROVE`). |
| **Authorization object** | The granular SAP permission unit (e.g. `F_BKPF_BUK`) with fields/values. |
| **T-Code (Transaction Code)** | Shortcut identifying an SAP transaction/screen (e.g. `F-53` post payment). |
| **SoD (Segregation of Duties)** | Control principle: no single person should both perform and approve a sensitive action (e.g. create *and* approve a payment). Violations are a fraud/control risk. |
| **Prüfer** | German for *auditor/examiner* — internal, external or regulatory reviewers who question why access exists. |
| **Role mining** | Analysing actual usage to discover sensible, minimal roles. |
| **Over-provisioning** | Holding more authorizations than the job requires — a security risk. |
| **Grounding** | Restricting the AI's answer to the bank's actual ingested data, not model priors. |
