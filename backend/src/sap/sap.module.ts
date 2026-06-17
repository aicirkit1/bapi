import { Global, Module } from '@nestjs/common';
import { MockSapConnector } from './mock-sap.connector';
import { SAP_CONNECTOR } from './sap-connector.interface';

/**
 * Binds the SapConnector port to the active implementation.
 *
 * To go live against a real SAP system, implement `BapiSapConnector` and change
 * the single `useClass` below — every consumer keeps working unchanged.
 */
@Global()
@Module({
  providers: [
    MockSapConnector,
    { provide: SAP_CONNECTOR, useClass: MockSapConnector },
  ],
  exports: [SAP_CONNECTOR],
})
export class SapModule {}
