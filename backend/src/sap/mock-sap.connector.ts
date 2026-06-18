import { Injectable } from '@nestjs/common';
import { Authorization, Role, User } from '../common/types';
import { StoreService } from '../store/store.service';
import { SapConnector } from './sap-connector.interface';

/**
 * Serves the in-memory (CSV-seeded) data "as if SAP were there".
 *
 * This realises the project brief's idea of treating SAP as a pluggable
 * connector/MCP for the demo, then swapping the real system in later.
 */
@Injectable()
export class MockSapConnector implements SapConnector {
  readonly source = 'Mock (Beispieldaten)';

  constructor(private readonly store: StoreService) {}

  async getUsers(): Promise<User[]> {
    return this.store.getUsers();
  }

  async getRoles(): Promise<Role[]> {
    return this.store.getRoles();
  }

  async getAuthorizations(): Promise<Authorization[]> {
    return this.store.getAuthorizations();
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    return this.store.getUserRoles(userId);
  }
}
