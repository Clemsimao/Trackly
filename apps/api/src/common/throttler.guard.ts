import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * Derrière Cloudflare Tunnel + nginx, la vraie IP du client est dans
 * CF-Connecting-IP — sans ça, tout le monde partagerait le même compteur.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Request): Promise<string> {
    return (req.headers['cf-connecting-ip'] as string | undefined) ?? req.ip ?? 'unknown';
  }
}
