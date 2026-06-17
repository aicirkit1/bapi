import { Injectable } from '@nestjs/common';

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

export interface CreateConnectionDto {
  name?: string;
  host?: string;
  client?: string;
  systemNumber?: string;
  username?: string;
  password?: string;
  language?: string;
}

/**
 * Manages SAP connection definitions. In-memory for the MVP — a real deployment
 * would persist these (and never the password) in a secrets store.
 *
 * TODO: integrate node-rfc for real Test Connection against SAP.
 */
@Injectable()
export class ConnectionsService {
  private connections: SapConnection[] = [];
  private seq = 0;

  list(): SapConnection[] {
    return this.connections;
  }

  get(id: string): SapConnection | undefined {
    return this.connections.find((c) => c.id === id);
  }

  create(dto: CreateConnectionDto): SapConnection {
    const conn: SapConnection = {
      id: `conn_${++this.seq}`,
      name: dto.name?.trim() || 'SAP Production',
      host: dto.host?.trim() || '',
      client: dto.client?.trim() || '',
      systemNumber: dto.systemNumber?.trim() || '',
      username: dto.username?.trim() || '',
      language: dto.language?.trim() || 'EN',
      status: 'DISCONNECTED',
      createdAt: new Date().toISOString(),
    };
    this.connections.push(conn);
    return conn;
  }

  /** Spin up a ready-to-use demo connection (no real SAP required). */
  createDemo(): SapConnection {
    const conn: SapConnection = {
      id: `conn_${++this.seq}`,
      name: 'Demo SAP Sandbox',
      host: 'sandbox.demo.sap',
      client: '100',
      systemNumber: '00',
      username: 'DEMO_USER',
      language: 'EN',
      status: 'DEMO',
      createdAt: new Date().toISOString(),
    };
    this.connections.push(conn);
    return conn;
  }

  /**
   * Test a connection. The demo sandbox always succeeds; a real connection
   * fails here because no live SAP is wired up yet.
   *
   * TODO: connect real SAP via node-rfc and return the true ping result.
   */
  test(id: string): SapConnection | undefined {
    const conn = this.get(id);
    if (!conn) return undefined;
    conn.status = conn.status === 'DEMO' ? 'DEMO' : 'FAILED';
    return conn;
  }
}
