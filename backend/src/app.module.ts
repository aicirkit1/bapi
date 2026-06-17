import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { AiModule } from './ai/ai.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DataModule } from './data/data.module';
import { FindingsModule } from './findings/findings.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { RiskModule } from './risk/risk.module';
import { RolesModule } from './roles/roles.module';
import { SapModule } from './sap/sap.module';
import { StoreModule } from './store/store.module';
import { UsersModule } from './users/users.module';

/**
 * In production the built Angular app is copied into ./public and served by
 * Nest at the root, while the API stays under /api (same origin, no CORS).
 * Imported last and excluded from /api so the SPA fallback never shadows the API.
 */
const publicDir = join(process.cwd(), 'public');
const staticModules = existsSync(publicDir)
  ? [
      ServeStaticModule.forRoot({
        rootPath: publicDir,
        exclude: ['/api/{*splat}'],
      }),
    ]
  : [];

@Module({
  imports: [
    StoreModule, // global in-memory store (seeded on boot)
    SapModule, // global SapConnector port (mock today, BAPI later)
    OnboardingModule, // /sap/* — connection center, connectors, sync job
    DataModule, // /health, /stats, /data/upload, /data/reset
    UsersModule, // /users, explain, recommend
    RolesModule, // /roles
    RiskModule, // /risk/sod, /risk/rules
    FindingsModule, // /findings/* — unified risk findings + actions
    AnalyticsModule, // /analytics/* — risk scoring, graph, audit report
    AiModule, // /ai/chat
    ...staticModules, // serve built Angular SPA (production only)
  ],
})
export class AppModule {}
