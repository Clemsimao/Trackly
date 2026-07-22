import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { DeletionPurgeTask } from './deletion-purge.task';

@Module({
  imports: [AuthModule, MailModule, ScheduleModule.forRoot()],
  controllers: [AccountController],
  providers: [AccountService, DeletionPurgeTask],
})
export class AccountModule {}
