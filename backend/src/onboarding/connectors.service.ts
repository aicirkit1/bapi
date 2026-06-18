import { Injectable } from '@nestjs/common';

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

/**
 * Static catalogue of the "connectors" and data sources presented during
 * onboarding. Gives the demo a real product feel; the actual ingest is handled
 * by the mock provider today (and a real RFC/BAPI provider later).
 */
@Injectable()
export class ConnectorsService {
  readonly connectors: Connector[] = [
    {
      id: 'rfc',
      name: 'SAP RFC-Konnektor',
      description: 'Liest Stammdaten über RFC-Funktionsbausteine.',
      status: 'READY',
      enabled: true,
    },
    {
      id: 'bapi',
      name: 'SAP BAPI-Konnektor',
      description: 'Ruft Standard-BAPIs für Benutzer, Rollen und Berechtigungen auf.',
      status: 'READY',
      enabled: true,
    },
    {
      id: 'table',
      name: 'SAP-Tabellenleser',
      description: 'Liest die Tabellen USR02 / AGR_* / TSTCT direkt.',
      status: 'READY',
      enabled: true,
    },
    {
      id: 'role-analyzer',
      name: 'Rollenanalysator',
      description: 'Erstellt den Graphen Benutzer ↔ Rolle ↔ Berechtigung.',
      status: 'READY',
      enabled: true,
    },
    {
      id: 'risk-engine',
      name: 'Risiko-Engine',
      description: 'Bewertet Funktionstrennung (SoD), SAP_ALL, kritische Zugriffe und mehr.',
      status: 'READY',
      enabled: true,
    },
    {
      id: 'ai-agent',
      name: 'KI-Agent',
      description: 'Werkzeugbasierter Assistent auf Grundlage der importierten Daten.',
      status: 'READY',
      enabled: true,
    },
  ];

  readonly dataSources: DataSource[] = [
    { id: 'users', label: 'Benutzer', table: 'USR02', defaultSelected: true },
    { id: 'roles', label: 'Rollen', table: 'AGR_DEFINE', defaultSelected: true },
    {
      id: 'user-roles',
      label: 'Benutzer-Rollen-Zuweisungen',
      table: 'AGR_USERS',
      defaultSelected: true,
    },
    {
      id: 'authorizations',
      label: 'Berechtigungsobjekte',
      table: 'AGR_1251',
      defaultSelected: true,
    },
    {
      id: 'transactions',
      label: 'Transaktionen',
      table: 'TSTCT',
      defaultSelected: true,
    },
    {
      id: 'critical-rules',
      label: 'Kritische Zugriffsregeln',
      table: 'SACF',
      defaultSelected: true,
    },
    {
      id: 'change-logs',
      label: 'Änderungsprotokolle',
      table: 'CDHDR',
      defaultSelected: false,
    },
  ];

  catalogue() {
    return { connectors: this.connectors, dataSources: this.dataSources };
  }
}
