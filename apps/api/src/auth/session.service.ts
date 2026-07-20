import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Session, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const SESSION_COOKIE = 'trackly_session';

const DAY_MS = 24 * 60 * 60 * 1000;
/** « Rester connecté » : 30 jours ; sinon session courte de 24 h (docs/cadrage/15). */
const REMEMBER_TTL_MS = 30 * DAY_MS;
const SHORT_TTL_MS = 1 * DAY_MS;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    rememberMe: boolean,
  ): Promise<{ token: string; maxAgeMs: number | null }> {
    const token = randomBytes(32).toString('base64url');
    const ttl = rememberMe ? REMEMBER_TTL_MS : SHORT_TTL_MS;
    await this.prisma.session.create({
      data: {
        tokenHash: hashToken(token),
        userId,
        expiresAt: new Date(Date.now() + ttl),
      },
    });
    // Cookie persistant seulement si « rester connecté » ; sinon cookie de session navigateur
    return { token, maxAgeMs: rememberMe ? ttl : null };
  }

  /** Valide un jeton et rafraîchit lastUsedAt. Retourne null si inconnu ou expiré. */
  async validate(token: string): Promise<(Session & { user: User }) | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!session) return null;
    if (session.expiresAt < new Date()) {
      await this.prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      return null;
    }
    // Rafraîchissement paresseux (au plus une écriture par minute)
    if (Date.now() - session.lastUsedAt.getTime() > 60_000) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() },
      });
    }
    return session;
  }

  async revoke(token: string): Promise<void> {
    await this.prisma.session
      .delete({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined);
  }

  /** Révoque toutes les sessions d'un utilisateur (reset mdp, story A3). */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }
}
