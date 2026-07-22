import { Body, Controller, Delete, Get, Header, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { User } from '@prisma/client';
import {
  cancelDeletionBodySchema,
  deleteAccountBodySchema,
  type CancelDeletionBody,
  type DeleteAccountBody,
  type DeletionScheduled,
} from '@trackly/contracts';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
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

  /**
   * RGPD — droit à l'effacement (CA A5) : la demande ouvre un délai de grâce,
   * elle n'efface rien immédiatement. La session est conservée, sans quoi
   * l'utilisateur ne pourrait pas revenir annuler.
   */
  @Delete()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async requestDeletion(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(deleteAccountBodySchema)) body: DeleteAccountBody,
  ): Promise<DeletionScheduled> {
    const scheduledFor = await this.account.requestDeletion(user.id, body.password);
    return { scheduledFor: scheduledFor.toISOString() };
  }

  /** Annulation par l'utilisateur connecté. */
  @Delete('deletion')
  @HttpCode(204)
  async cancelDeletion(@CurrentUser() user: User): Promise<void> {
    await this.account.cancelDeletion(user.id);
  }

  /**
   * Annulation depuis le lien reçu par e-mail : publique par nécessité, c'est
   * le recours de qui n'a plus accès à son compte. Le jeton fait l'authentification.
   */
  @Public()
  @Post('deletion/cancel')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(204)
  async cancelDeletionByToken(
    @Body(new ZodValidationPipe(cancelDeletionBodySchema)) body: CancelDeletionBody,
  ): Promise<void> {
    await this.account.cancelDeletionByToken(body.token);
  }
}
