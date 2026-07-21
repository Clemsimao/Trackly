import { Controller, Get } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { DashboardResponse } from '@trackly/contracts';
import { CurrentUser } from '../auth/current-user.decorator';
import { DashboardService } from './dashboard.service';

/** Budget temps (Lot 4) — session requise (guard global). */
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  getDashboard(@CurrentUser() user: User): Promise<DashboardResponse> {
    return this.dashboard.getDashboard(user.id);
  }
}
