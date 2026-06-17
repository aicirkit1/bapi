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
      name: 'SAP RFC Connector',
      description: 'Reads master data over RFC function modules.',
      status: 'READY',
      enabled: true,
    },
    {
      id: 'bapi',
      name: 'SAP BAPI Connector',
      description: 'Calls standard BAPIs for users, roles and authorizations.',
      status: 'READY',
      enabled: true,
    },
    {
      id: 'table',
      name: 'SAP Table Reader',
      description: 'Reads USR02 / AGR_* / TSTCT tables directly.',
      status: 'READY',
      enabled: true,
    },
    {
      id: 'role-analyzer',
      name: 'Role Analyzer',
      description: 'Builds the user ↔ role ↔ authorization graph.',
      status: 'READY',
      enabled: true,
    },
    {
      id: 'risk-engine',
      name: 'Risk Engine',
      description: 'Evaluates SoD, SAP_ALL, critical access and more.',
      status: 'READY',
      enabled: true,
    },
    {
      id: 'ai-agent',
      name: 'AI Agent',
      description: 'Tool-calling assistant grounded in the imported data.',
      status: 'READY',
      enabled: true,
    },
  ];

  readonly dataSources: DataSource[] = [
    { id: 'users', label: 'Users', table: 'USR02', defaultSelected: true },
    { id: 'roles', label: 'Roles', table: 'AGR_DEFINE', defaultSelected: true },
    {
      id: 'user-roles',
      label: 'User Role Assignments',
      table: 'AGR_USERS',
      defaultSelected: true,
    },
    {
      id: 'authorizations',
      label: 'Authorization Objects',
      table: 'AGR_1251',
      defaultSelected: true,
    },
    {
      id: 'transactions',
      label: 'Transactions',
      table: 'TSTCT',
      defaultSelected: true,
    },
    {
      id: 'critical-rules',
      label: 'Critical Access Rules',
      table: 'SACF',
      defaultSelected: true,
    },
    {
      id: 'change-logs',
      label: 'Change Logs',
      table: 'CDHDR',
      defaultSelected: false,
    },
  ];

  catalogue() {
    return { connectors: this.connectors, dataSources: this.dataSources };
  }
}
