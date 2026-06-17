import { Controller, Get, Query } from '@nestjs/common';
import type { Severity } from '../common/types';
import { RiskService } from './risk.service';

@Controller('risk')
export class RiskController {
  constructor(private readonly risk: RiskService) {}

  @Get('sod')
  getSodFindings(@Query('severity') severity?: Severity) {
    return this.risk.findSodViolations(severity);
  }

  @Get('rules')
  getRules() {
    return this.risk.getRules();
  }
}
