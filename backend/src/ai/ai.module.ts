import { Module } from '@nestjs/common';
import { RiskModule } from '../risk/risk.module';
import { UsersModule } from '../users/users.module';
import { AiTools } from './ai-tools';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [RiskModule, UsersModule],
  controllers: [AiController],
  providers: [AiService, AiTools],
})
export class AiModule {}
