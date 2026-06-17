import {
  BadRequestException,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { RiskService } from '../risk/risk.service';
import { StoreService } from '../store/store.service';

/** Loosely-typed uploaded file to avoid a hard dependency on @types/multer. */
interface UploadedFile {
  fieldname: string;
  originalname: string;
  buffer: Buffer;
}

@Controller('data')
export class DataController {
  constructor(
    private readonly store: StoreService,
    private readonly risk: RiskService,
  ) {}

  /** Re-seed the store from three uploaded CSV files. */
  @Post('upload')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'users', maxCount: 1 },
      { name: 'roles', maxCount: 1 },
      { name: 'authorizations', maxCount: 1 },
      { name: 'assignments', maxCount: 1 },
    ]),
  )
  upload(@UploadedFiles() files: Record<string, UploadedFile[]>) {
    const required = ['users', 'roles', 'authorizations'];
    for (const key of required) {
      if (!files?.[key]?.[0]) {
        throw new BadRequestException(`Missing required CSV file: "${key}"`);
      }
    }
    this.store.load({
      users: files.users[0].buffer.toString('utf-8'),
      roles: files.roles[0].buffer.toString('utf-8'),
      authorizations: files.authorizations[0].buffer.toString('utf-8'),
      assignments: files.assignments?.[0]?.buffer.toString('utf-8'),
    });
    return { status: 'ok', ...this.counts() };
  }

  /** Reset back to the bundled sample data. */
  @Post('reset')
  reset() {
    this.store.reseedFromSampleData();
    return { status: 'ok', ...this.counts() };
  }

  private counts() {
    return {
      users: this.store.getUsers().length,
      roles: this.store.getRoles().length,
      authorizations: this.store.getAuthorizations().length,
      sodFindings: this.risk.findSodViolations().length,
    };
  }
}
