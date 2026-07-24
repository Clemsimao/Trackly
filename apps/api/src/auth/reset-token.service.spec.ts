import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { ResetTokenService } from './reset-token.service';
import { hashToken } from './session.service';

function makePrismaMock() {
  return {
    passwordResetToken: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

describe('ResetTokenService', () => {
  it('consomme le jeton avec une écriture conditionnelle atomique', async () => {
    const prisma = makePrismaMock();
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
    const service = new ResetTokenService(prisma as unknown as PrismaService);

    await expect(service.consume('secret-token')).resolves.toBe('user-1');
    expect(prisma.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashToken('secret-token') },
    });
    expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'token-1',
        usedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      data: { usedAt: expect.any(Date) },
    });
  });

  it('rejette le perdant d’une consommation concurrente', async () => {
    const prisma = makePrismaMock();
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    const service = new ResetTokenService(prisma as unknown as PrismaService);

    await expect(service.consume('secret-token')).resolves.toBeNull();
  });
});
