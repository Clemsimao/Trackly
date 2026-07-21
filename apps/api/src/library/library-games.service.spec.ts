import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { LibraryGamesService } from './library-games.service';
import type { OverridesService } from './overrides.service';
import type { WorksService } from './works.service';

const work = { id: 'w1', igdbId: '42', title: 'Elden Ring' };

function makeDeps() {
  const prisma = {
    gameEntry: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: 'e1' }),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
    gameOwnership: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn(),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
    gameProgressUpdate: {
      create: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    gameWork: { findUniqueOrThrow: vi.fn() },
    fieldOverride: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
  };
  const works = { ensureGameWork: vi.fn().mockResolvedValue(work) };
  const overrides = { getGameDurations: vi.fn(), setGameDurations: vi.fn() };
  const service = new LibraryGamesService(
    prisma as unknown as PrismaService,
    works as unknown as WorksService,
    overrides as unknown as OverridesService,
  );
  return { prisma, works, overrides, service };
}

describe('LibraryGamesService.add (story B2)', () => {
  it('envie : entrée sans possession', async () => {
    const { prisma, service } = makeDeps();
    const result = await service.add('u1', { igdbId: '42', status: 'WISHLIST' });
    expect(result).toEqual({ entryId: 'e1' });
    const data = prisma.gameEntry.create.mock.calls[0]?.[0]?.data;
    expect(data.ownerships).toBeUndefined();
  });

  it('possédé : la possession est créée avec la plateforme', async () => {
    const { prisma, service } = makeDeps();
    await service.add('u1', { igdbId: '42', status: 'PLAYING', platform: 'PC' });
    const data = prisma.gameEntry.create.mock.calls[0]?.[0]?.data;
    expect(data.ownerships.create).toEqual({ platform: 'PC', status: 'PLAYING' });
  });

  it('doublon → 409 avec l’identifiant existant (CA B2 : proposer d’ouvrir la fiche)', async () => {
    const { prisma, service } = makeDeps();
    prisma.gameEntry.findUnique.mockResolvedValue({ id: 'existing' });
    const attempt = service.add('u1', { igdbId: '42', status: 'WISHLIST' });
    await expect(attempt).rejects.toThrow(ConflictException);
    await attempt.catch((error: ConflictException) => {
      expect(error.getResponse()).toMatchObject({
        code: 'ALREADY_IN_LIBRARY',
        entryId: 'existing',
      });
    });
  });
});

describe('LibraryGamesService.updateOwnership (stories C1/C2)', () => {
  const baseOwnership = {
    id: 'o1',
    entryId: 'e1',
    platform: 'PC',
    status: 'PLAYING',
    hoursPlayed: 10,
    progressPercent: 20,
    startedAt: new Date('2026-07-01'),
    finishedAt: null,
  };

  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => {
    deps = makeDeps();
    deps.prisma.gameOwnership.findFirst.mockResolvedValue({ ...baseOwnership });
  });

  it('progression modifiée → entrée de journal + dernière session datée', async () => {
    await deps.service.updateOwnership('u1', 'o1', { hoursPlayed: 12, journalNote: 'Boss vaincu' });
    expect(deps.prisma.gameProgressUpdate.create).toHaveBeenCalledWith({
      data: { ownershipId: 'o1', hoursPlayed: 12, progressPercent: null, note: 'Boss vaincu' },
    });
    const data = deps.prisma.gameOwnership.update.mock.calls[0]?.[0]?.data;
    expect(data.lastPlayedAt).toBeInstanceOf(Date);
  });

  it('valeurs inchangées sans note → pas de bruit dans le journal', async () => {
    await deps.service.updateOwnership('u1', 'o1', { hoursPlayed: 10, progressPercent: 20 });
    expect(deps.prisma.gameProgressUpdate.create).not.toHaveBeenCalled();
  });

  it('statut terminé sans date fournie → date de fin automatique', async () => {
    await deps.service.updateOwnership('u1', 'o1', { status: 'FINISHED' });
    const data = deps.prisma.gameOwnership.update.mock.calls[0]?.[0]?.data;
    expect(data.finishedAt).toBeInstanceOf(Date);
  });

  it('la note de reprise se met à jour sans toucher au journal (story C2)', async () => {
    await deps.service.updateOwnership('u1', 'o1', { resumeNote: 'Reprendre au donjon nord' });
    expect(deps.prisma.gameProgressUpdate.create).not.toHaveBeenCalled();
    const data = deps.prisma.gameOwnership.update.mock.calls[0]?.[0]?.data;
    expect(data.resumeNote).toBe('Reprendre au donjon nord');
  });
});

describe('LibraryGamesService.deleteEntry', () => {
  it('supprime aussi les overrides personnels du jeu (rien d’orphelin)', async () => {
    const { prisma, service } = makeDeps();
    prisma.gameEntry.findFirst.mockResolvedValue({
      id: 'e1',
      gameWorkId: 'w1',
      ownerships: [],
    });
    await service.deleteEntry('u1', 'e1');
    expect(prisma.fieldOverride.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', entityType: 'game_work', entityId: 'w1' },
    });
    expect(prisma.gameEntry.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
  });
});
