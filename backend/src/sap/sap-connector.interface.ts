import { Authorization, Role, User } from '../common/types';

/**
 * The single abstraction over SAP. The MVP serves seeded CSV data through
 * `MockSapConnector`; the Pilot phase drops in a `BapiSapConnector` (BAPI/RFC)
 * behind the same interface — no consumer changes required.
 */
export interface SapConnector {
  /** A human-readable identifier of the active connector (shown in /health). */
  readonly source: string;

  getUsers(): Promise<User[]>;
  getRoles(): Promise<Role[]>;
  getAuthorizations(): Promise<Authorization[]>;
  getUserRoles(userId: string): Promise<Role[]>;
}

/** DI token for the SapConnector port. */
export const SAP_CONNECTOR = Symbol('SAP_CONNECTOR');
