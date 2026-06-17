import { Module } from '@nestjs/common';
import { RiskModule } from '../risk/risk.module';
import { DataController } from './data.controller';
import { MetaController } from './meta.controller';

@Module({
  imports: [RiskModule],
  controllers: [DataController, MetaController],
})
export class DataModule {}
