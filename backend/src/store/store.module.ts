import { Global, Module } from '@nestjs/common';
import { StoreService } from './store.service';

/**
 * Global so every feature module can inject the shared in-memory store
 * without re-importing it.
 */
@Global()
@Module({
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
