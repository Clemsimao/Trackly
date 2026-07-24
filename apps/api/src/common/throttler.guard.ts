import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * Express reconstruit l'IP cliente depuis X-Forwarded-For uniquement pour le
 * proxy de confiance configuré dans main.ts. On ne lit jamais directement un
 * en-tête fourni par le client.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Request): Promise<string> {
    return req.ip ?? 'unknown';
  }
}
