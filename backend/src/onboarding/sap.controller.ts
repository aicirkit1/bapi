import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import type { CreateConnectionDto } from './connections.service';
import { ConnectorsService } from './connectors.service';
import { SyncService } from './sync.service';

@Controller('sap')
export class SapController {
  constructor(
    private readonly connections: ConnectionsService,
    private readonly connectors: ConnectorsService,
    private readonly sync: SyncService,
  ) {}

  // ---- Connections ---------------------------------------------------------

  @Get('connections')
  listConnections() {
    return this.connections.list();
  }

  @Post('connections')
  createConnection(@Body() dto: CreateConnectionDto) {
    return this.connections.create(dto);
  }

  @Post('connections/demo')
  createDemo() {
    return this.connections.createDemo();
  }

  @Post('connections/:id/test')
  testConnection(@Param('id') id: string) {
    const conn = this.connections.test(id);
    if (!conn) throw new NotFoundException(`Connection ${id} not found`);
    return conn;
  }

  // ---- Connectors ----------------------------------------------------------

  @Get('connectors')
  catalogue() {
    return this.connectors.catalogue();
  }

  // ---- Sync ----------------------------------------------------------------

  @Post('sync/start')
  startSync() {
    return this.sync.start();
  }

  @Get('sync/:jobId/status')
  syncStatus(@Param('jobId') jobId: string) {
    const status = this.sync.status(jobId);
    if (!status) throw new NotFoundException(`Sync job ${jobId} not found`);
    return status;
  }
}
