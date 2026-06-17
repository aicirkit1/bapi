import { Controller, Get, Param, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  overview() {
    return this.analytics.overview();
  }

  @Get('risk-scores')
  riskScores() {
    return this.analytics.allRiskScores();
  }

  @Get('risk-scores/:userId')
  userScore(@Param('userId') userId: string) {
    return this.analytics.scoreUser(userId);
  }

  @Get('dormant')
  dormant() {
    return this.analytics.dormantAssignments();
  }

  @Get('graph')
  graph(@Query('department') department?: string) {
    return this.analytics.graph(department);
  }

  @Get('audit-report')
  auditReport() {
    return this.analytics.auditReport();
  }
}
