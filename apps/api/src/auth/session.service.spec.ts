import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { hashToken, SessionService } from './session.service';

function makePrismaMock() {
  return {
    session: {
      create: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

describe('SessionService', () => {
  it('crée une session : jeton opaque, seul le hash part en base', async () => {
    const prisma = makePrismaMock();
    const service = new SessionService(prisma as unknown as PrismaService);

    const { token, maxAgeMs } = await service.create('user-1', false);

    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(maxAgeMs).toBeNull(); // sans « rester connecté » : cookie de session navigateur
    const stored = prisma.session.create.mock.calls[0]?.[0].data;
    expect(stored.tokenHash).toBe(hashToken(token));
    expect(stored.tokenHash).not.toBe(token);
  });

  it('« rester connecté » donne un cookie persistant de 30 jours', async () => {
    const prisma = makePrismaMock();
    const service = new SessionService(prisma as unknown as PrismaService);
    const { maxAgeMs } = await service.create('user-1', true);
    expect(maxAgeMs).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('rejette une session expirée et la supprime', async () => {
    const prisma = makePrismaMock();
    prisma.session.findUnique.mockResolvedValue({
      id: 's1',
      expiresAt: new Date(Date.now() - 1000),
      lastUsedAt: new Date(),
      user: { id: 'user-1' },
    });
    const service = new SessionService(prisma as unknown as PrismaService);

    expect(await service.validate('un-jeton')).toBeNull();
    expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
  });

  it('valide une session active', async () => {
    const prisma = makePrismaMock();
    prisma.session.findUnique.mockResolvedValue({
      id: 's1',
      expiresAt: new Date(Date.now() + 60_000),
      lastUsedAt: new Date(),
      user: { id: 'user-1' },
    });
    const service = new SessionService(prisma as unknown as PrismaService);

    const session = await service.validate('un-jeton');
    expect(session?.user.id).toBe('user-1');
  });
});
