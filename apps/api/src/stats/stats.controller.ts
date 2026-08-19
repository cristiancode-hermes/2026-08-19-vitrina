import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/current-user';

@ApiTags('stats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  dashboard() {
    return this.stats.dashboard();
  }
}
