import { Body, Controller, Delete, Get, Header, HttpCode, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { User } from '@prisma/client';
import { deleteAccountBodySchema, type DeleteAccountBody } from '@trackly/contracts';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { SESSION_COOKIE } from '../auth/session.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AccountService } from './account.service';

@Controller('account')
export class AccountController {
  constructor(private readonly account: AccountService) {}

  /** RGPD — droit d'accès : toutes les données personnelles en un JSON téléchargeable. */
  @Get('export')
  @Header('Content-Disposition', 'attachment; filename="trackly-export.json"')
  exportData(@CurrentUser() user: User): Promise<Record<string, unknown>> {
    return this.account.exportData(user.id);
  }

  /** RGPD — droit à l'effacement : suppression définitive, confirmée par mot de passe. */
  @Delete()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(204)
  async deleteAccount(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(deleteAccountBodySchema)) body: DeleteAccountBody,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.account.deleteAccount(user.id, body.password);
    res.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }
}
