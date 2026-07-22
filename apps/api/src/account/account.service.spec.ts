import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { AccountService } from './account.service';

function makePrisma() {
  return {
    user: {
      findUniqueOrThrow: vi
        .fn()
        .mockResolvedValue({ id: 'u1', email: 'j@t.fr', displayName: 'Julien', passwordHash: 'h' }),
      delete: vi.fn().mockResolvedValue({}),
    },
    gameEntry: { findMany: vi.fn().mockResolvedValue([]) },
    seriesEntry: { findMany: vi.fn().mockResolvedValue([]) },
    filmEntry: { findMany: vi.fn().mockResolvedValue([]) },
    episodeWatch: { findMany: vi.fn().mockResolvedValue([]) },
    fieldOverride: { findMany: vi.fn().mockResolvedValue([]) },
  } as unknown as PrismaService;
}

describe('AccountService (RGPD)', () => {
  it('l’export contient le profil et toutes les sections de données', async () => {
    const service = new AccountService(makePrisma(), new PasswordService());
    const data = await service.exportData('u1');
    expect(data.format).toBe('trackly-export-v1');
    expect(data.profile).toMatchObject({ email: 'j@t.fr', displayName: 'Julien' });
    for (const section of ['games', 'series', 'episodesWatched', 'films', 'overrides']) {
      expect(data[section]).toEqual([]);
    }
  });

  it('mot de passe incorrect → 400, le compte reste intact', async () => {
    const prisma = makePrisma();
    const passwords = new PasswordService();
    vi.spyOn(passwords, 'verify').mockResolvedValue(false);
    const service = new AccountService(prisma, passwords);

    await expect(service.deleteAccount('u1', 'mauvais')).rejects.toThrow(BadRequestException);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('mot de passe correct → suppression définitive (les cascades font le ménage)', async () => {
    const prisma = makePrisma();
    const passwords = new PasswordService();
    vi.spyOn(passwords, 'verify').mockResolvedValue(true);
    const service = new AccountService(prisma, passwords);

    await service.deleteAccount('u1', 'bon-mot-de-passe');
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });
});
