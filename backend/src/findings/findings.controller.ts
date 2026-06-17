import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import type { Severity } from '../common/types';
import { FindingsService } from './findings.service';
import type { FindingStatus, RiskType } from './findings.service';

@Controller('findings')
export class FindingsController {
  constructor(private readonly findings: FindingsService) {}

  @Get()
  list(
    @Query('severity') severity?: Severity,
    @Query('riskType') riskType?: RiskType,
    @Query('status') status?: FindingStatus,
    @Query('q') q?: string,
  ) {
    return this.findings.filter({ severity, riskType, status, q });
  }

  @Get('summary')
  summary() {
    return this.findings.summary();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    const finding = this.findings.byId(id);
    if (!finding) throw new NotFoundException(`Finding ${id} not found`);
    return finding;
  }

  @Post(':id/action')
  action(@Param('id') id: string, @Body() body: { status?: FindingStatus }) {
    const allowed: FindingStatus[] = ['OPEN', 'ACCEPTED', 'REMEDIATION'];
    if (!body?.status || !allowed.includes(body.status)) {
      throw new BadRequestException(
        `status must be one of ${allowed.join(', ')}`,
      );
    }
    const updated = this.findings.setStatus(id, body.status);
    if (!updated) throw new NotFoundException(`Finding ${id} not found`);
    return updated;
  }
}
