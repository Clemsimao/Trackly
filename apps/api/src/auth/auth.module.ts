import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { ResetTokenService } from './reset-token.service';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';

@Module({
  imports: [MailModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, SessionService, ResetTokenService, SessionGuard],
  exports: [SessionService, SessionGuard],
})
export class AuthModule {}
