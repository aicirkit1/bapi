import { Controller, Get, Param, Query } from '@nestjs/common';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  list(@Query('q') q?: string, @Query('area') area?: string) {
    return this.roles.list({ q, area });
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.roles.getOne(id);
  }
}
