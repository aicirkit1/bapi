import { Module } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { ConnectorsService } from './connectors.service';
import { SapController } from './sap.controller';
import { SyncService } from './sync.service';

/**
 * The "product flow" backend: connection center, connector catalogue and the
 * data-sync job that the onboarding UI walks the user through.
 */
@Module({
  controllers: [SapController],
  providers: [ConnectionsService, ConnectorsService, SyncService],
})
export class OnboardingModule {}
