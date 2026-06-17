import { Controller, Get, Inject } from '@nestjs/common';
import { RiskService } from '../risk/risk.service';
import { SAP_CONNECTOR } from '../sap/sap-connector.interface';
import type { SapConnector } from '../sap/sap-connector.interface';
import { StoreService } from '../store/store.service';

@Controller()
export class MetaController {
  constructor(
    private readonly store: StoreService,
    private readonly risk: RiskService,
    @Inject(SAP_CONNECTOR) private readonly sap: SapConnector,
  ) {}

  @Get('health')
  health() {
    return {
      status: 'ok',
      sapConnector: this.sap.source,
      time: new Date().toISOString(),
    };
  }

  @Get('stats')
  stats() {
    const findings = this.risk.findSodViolations();
    return {
      users: this.store.getUsers().length,
      roles: this.store.getRoles().length,
      authorizations: this.store.getAuthorizations().length,
      assignments: this.store.getAssignments().length,
      sodFindings: findings.length,
      sodHigh: findings.filter((f) => f.severity === 'HIGH').length,
      departments: [
        ...new Set(this.store.getUsers().map((u) => u.department)),
      ].length,
    };
  }
}
