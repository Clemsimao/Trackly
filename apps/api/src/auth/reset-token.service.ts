import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hashToken } from './session.service';

/** TTL du lien de réinitialisation : 1 h (story A3). */
const RESET_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class ResetTokenService {
  constructor(private readonly prisma: PrismaService) {}

  /** Crée un jeton et invalide les précédents (un seul lien valide à la fois). */
  async create(userId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
      this.prisma.passwordResetToken.create({
        data: {
          tokenHash: hashToken(token),
          userId,
          expiresAt: new Date(Date.now() + RESET_TTL_MS),
        },
      }),
    ]);
    return token;
  }

  /** Consomme un jeton valide (non expiré, non utilisé). Retourne le userId ou null. */
  async consume(token: string): Promise<string | null> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!record || record.usedAt !== null || record.expiresAt < new Date()) return null;
    const consumed = await this.prisma.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) return null;
    return record.userId;
  }
}
