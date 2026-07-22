import { Module } from '@nestjs/common';
import { LibraryModule } from '../library/library.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [LibraryModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
