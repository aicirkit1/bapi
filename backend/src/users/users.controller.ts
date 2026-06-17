import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query('q') q?: string, @Query('department') department?: string) {
    return this.users.list({ q, department });
  }

  // Static routes before the parameterised ":id" route.
  @Get('recommend')
  recommend(@Query('userId') userId?: string) {
    if (!userId) throw new BadRequestException('userId query param is required');
    return this.users.recommend(userId);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.users.getOne(id);
  }

  @Get(':id/explain')
  explain(@Param('id') id: string, @Query('roleId') roleId?: string) {
    if (!roleId) throw new BadRequestException('roleId query param is required');
    return this.users.explain(id, roleId);
  }
}
