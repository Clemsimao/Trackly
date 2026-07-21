import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { LibrarySeriesService } from './library-series.service';
import type { WorksService } from './works.service';

const entry = { id: 'e1', userId: 'u1', seriesWorkId: 'w1', status: 'TO_WATCH' };
const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
const inAMonth = new Date(Date.now() + 30 * 24 * 3600 * 1000);

function makeDeps() {
  const prisma = {
    seriesEntry: {
      findFirst: vi.fn().mockResolvedValue({ ...entry }),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
    seriesWork: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'w1', tmdbId: '1396', payload: {} }),
    },
    episodeRecord: {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    episodeWatch: {
      upsert: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
  const works = { ensureSeasonEpisodes: vi.fn().mockResolvedValue(undefined) };
  const service = new LibrarySeriesService(
    prisma as unknown as PrismaService,
    works as unknown as WorksService,
  );
  return { prisma, works, service };
}

describe('LibrarySeriesService.markEpisode (story D1)', () => {
  let deps: ReturnType<typeof makeDeps>;
  beforeEach(() => {
    deps = makeDeps();
  });

  it('marque un épisode diffusé (upsert : idempotent)', async () => {
    deps.prisma.episodeRecord.findFirst.mockResolvedValue({
      id: 'ep1',
      seriesWorkId: 'w1',
      airDate: yesterday,
    });
    await deps.service.markEpisode('u1', 'e1', 'ep1');
    expect(deps.prisma.episodeWatch.upsert).toHaveBeenCalledWith({
      where: { userId_episodeId: { userId: 'u1', episodeId: 'ep1' } },
      create: { userId: 'u1', episodeId: 'ep1' },
      update: {},
    });
  });

  it('refuse un épisode non diffusé (CA D1)', async () => {
    deps.prisma.episodeRecord.findFirst.mockResolvedValue({
      id: 'ep2',
      seriesWorkId: 'w1',
      airDate: inAMonth,
    });
    await expect(deps.service.markEpisode('u1', 'e1', 'ep2')).rejects.toThrow(BadRequestException);
    expect(deps.prisma.episodeWatch.upsert).not.toHaveBeenCalled();
  });

  it('premier épisode d’une série « à voir » → passe en cours', async () => {
    deps.prisma.episodeRecord.findFirst.mockResolvedValue({
      id: 'ep1',
      seriesWorkId: 'w1',
      airDate: yesterday,
    });
    await deps.service.markEpisode('u1', 'e1', 'ep1');
    expect(deps.prisma.seriesEntry.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { status: 'WATCHING' },
    });
  });
});

describe('LibrarySeriesService.markSeason (story D1 — saison entière)', () => {
  it('ne marque que les épisodes déjà diffusés, sans doublons', async () => {
    const deps = makeDeps();
    deps.prisma.episodeRecord.findMany.mockResolvedValue([{ id: 'ep1' }, { id: 'ep2' }]);
    await deps.service.markSeason('u1', 'e1', 1);
    const where = deps.prisma.episodeRecord.findMany.mock.calls[0]?.[0]?.where;
    expect(where.airDate.lte).toBeInstanceOf(Date);
    expect(deps.prisma.episodeWatch.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 'u1', episodeId: 'ep1' },
        { userId: 'u1', episodeId: 'ep2' },
      ],
      skipDuplicates: true,
    });
  });
});

describe('LibrarySeriesService.deleteEntry', () => {
  it('efface aussi l’historique de visionnage personnel (RGPD)', async () => {
    const deps = makeDeps();
    await deps.service.deleteEntry('u1', 'e1');
    expect(deps.prisma.episodeWatch.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', episode: { seriesWorkId: 'w1' } },
    });
  });
});
