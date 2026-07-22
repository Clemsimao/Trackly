import { describe, expect, it, vi } from 'vitest';
import type { LibraryBooksService } from '../library/library-books.service';
import type { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

/** Vitesse non calibrée par défaut : les tests livres la fixent explicitement. */
function makeLibraryBooks(pagesPerHour: number | null = null) {
  return {
    userPagesPerHour: vi.fn().mockResolvedValue(pagesPerHour),
  } as unknown as LibraryBooksService;
}

const H = 3600;

const gameWork = (title: string, main: number | null) => ({
  payload: {
    mediaType: 'game',
    title,
    coverUrl: null,
    timeToBeat:
      main != null
        ? {
            mainSeconds: main,
            mainExtraSeconds: null,
            completionistSeconds: null,
            submissionCount: 5,
          }
        : null,
  },
});

function makePrisma(data: {
  gameEntries?: unknown[];
  seriesEntries?: unknown[];
  filmEntries?: unknown[];
  bookEntries?: unknown[];
  overrides?: unknown[];
  /** Épisodes vus, sous la forme renvoyée par Prisma : { episode: { seriesWorkId } } */
  episodeWatches?: unknown[];
}) {
  return {
    gameEntry: { findMany: vi.fn().mockResolvedValue(data.gameEntries ?? []) },
    seriesEntry: { findMany: vi.fn().mockResolvedValue(data.seriesEntries ?? []) },
    filmEntry: { findMany: vi.fn().mockResolvedValue(data.filmEntries ?? []) },
    bookEntry: { findMany: vi.fn().mockResolvedValue(data.bookEntries ?? []) },
    fieldOverride: { findMany: vi.fn().mockResolvedValue(data.overrides ?? []) },
    episodeWatch: { findMany: vi.fn().mockResolvedValue(data.episodeWatches ?? []) },
    episodeRecord: {
      groupBy: vi.fn().mockResolvedValue([]),
      findMany: vi.fn().mockResolvedValue([]),
    },
  } as unknown as PrismaService;
}

describe('DashboardService — assemblage du budget temps', () => {
  it('répartit les jeux dans les bons compartiments et exclut les terminés', async () => {
    const prisma = makePrisma({
      gameEntries: [
        {
          id: 'e1',
          gameWorkId: 'w1',
          gameWork: gameWork('En cours', 10 * H),
          ownerships: [
            {
              status: 'PLAYING',
              platform: 'PC',
              completionTarget: 'MAIN',
              hoursPlayed: 4,
              progressPercent: null,
            },
          ],
        },
        {
          id: 'e2',
          gameWorkId: 'w2',
          gameWork: gameWork('Backlog', 20 * H),
          ownerships: [
            {
              status: 'BACKLOG',
              platform: 'PS5',
              completionTarget: 'MAIN',
              hoursPlayed: 0,
              progressPercent: null,
            },
          ],
        },
        {
          id: 'e3',
          gameWorkId: 'w3',
          gameWork: gameWork('Envie', 8 * H),
          ownerships: [],
        },
        {
          id: 'e4',
          gameWorkId: 'w4',
          gameWork: gameWork('Fini', 30 * H),
          ownerships: [
            {
              status: 'FINISHED',
              platform: 'PC',
              completionTarget: 'MAIN',
              hoursPlayed: 30,
              progressPercent: null,
            },
          ],
        },
      ],
    });
    const dashboard = await new DashboardService(prisma, makeLibraryBooks()).getDashboard('u1');

    expect(dashboard.games.inProgress).toMatchObject({ count: 1, seconds: 6 * H });
    expect(dashboard.games.backlog).toMatchObject({ count: 1, seconds: 20 * H });
    expect(dashboard.games.wishlist).toMatchObject({ count: 1, seconds: 8 * H });
    // Le total « tout finir » exclut les envies (pas encore possédées)
    expect(dashboard.totalSeconds).toBe(26 * H);
    expect(dashboard.inProgress.map((i) => i.title)).toEqual(['En cours']);
  });

  it('un override personnel remplace la durée IGDB dans le calcul', async () => {
    const prisma = makePrisma({
      gameEntries: [
        {
          id: 'e1',
          gameWorkId: 'w1',
          gameWork: gameWork('Modifié', 10 * H),
          ownerships: [
            {
              status: 'PLAYING',
              platform: 'PC',
              completionTarget: 'MAIN',
              hoursPlayed: 0,
              progressPercent: null,
            },
          ],
        },
      ],
      overrides: [
        { entityId: 'w1', fieldName: 'mainSeconds', value: 15 * H, source: 'overridden' },
      ],
    });
    const dashboard = await new DashboardService(prisma, makeLibraryBooks()).getDashboard('u1');
    expect(dashboard.games.inProgress.seconds).toBe(15 * H);
  });

  it('jeu sans aucune durée → compté « à estimer », pas dans le total', async () => {
    const prisma = makePrisma({
      gameEntries: [
        {
          id: 'e1',
          gameWorkId: 'w1',
          gameWork: gameWork('Sans durée', null),
          ownerships: [
            {
              status: 'BACKLOG',
              platform: 'PC',
              completionTarget: 'MAIN',
              hoursPlayed: 0,
              progressPercent: null,
            },
          ],
        },
      ],
    });
    const dashboard = await new DashboardService(prisma, makeLibraryBooks()).getDashboard('u1');
    expect(dashboard.games.backlog).toMatchObject({ count: 1, seconds: 0, unknownCount: 1 });
    expect(dashboard.totalEstimated).toBe(true);
  });

  it('série à voir sans épisodes chargés → estimation via la durée TMDB', async () => {
    const prisma = makePrisma({
      seriesEntries: [
        {
          id: 's1',
          seriesWorkId: 'sw1',
          status: 'TO_WATCH',
          seriesWork: {
            payload: {
              mediaType: 'series',
              title: 'Série',
              posterUrl: null,
              episodeRunTimeMinutes: 50,
              seasons: [{ seasonNumber: 1, name: 'S1', episodeCount: 8, airDate: null }],
            },
          },
        },
      ],
    });
    const dashboard = await new DashboardService(prisma, makeLibraryBooks()).getDashboard('u1');
    expect(dashboard.series.toWatch).toMatchObject({
      count: 1,
      seconds: 8 * 50 * 60,
      estimated: true,
    });
  });

  it('série intégralement vue → hors « en ce moment », même restée en statut WATCHING', async () => {
    // Cas relevé en prod le 2026-07-22 : Severance, 19/19 ép., 0 h restante,
    // trônait en tête de « En ce moment » à cause du tri par temps croissant.
    const prisma = makePrisma({
      seriesEntries: [
        {
          id: 's1',
          seriesWorkId: 'sw1',
          status: 'WATCHING',
          seriesWork: {
            payload: {
              mediaType: 'series',
              title: 'Severance',
              posterUrl: null,
              episodeRunTimeMinutes: 50,
              seasons: [{ seasonNumber: 1, name: 'S1', episodeCount: 19, airDate: null }],
            },
          },
        },
      ],
      episodeWatches: Array.from({ length: 19 }, () => ({ episode: { seriesWorkId: 'sw1' } })),
    });
    const dashboard = await new DashboardService(prisma, makeLibraryBooks()).getDashboard('u1');
    expect(dashboard.inProgress).toHaveLength(0);
    expect(dashboard.series.inProgress.count).toBe(0);
    expect(dashboard.totalSeconds).toBe(0);
  });

  it('les « en cours » sont triés par temps restant croissant', async () => {
    const prisma = makePrisma({
      gameEntries: [
        {
          id: 'long',
          gameWorkId: 'w1',
          gameWork: gameWork('Long', 60 * H),
          ownerships: [
            {
              status: 'PLAYING',
              platform: 'PC',
              completionTarget: 'MAIN',
              hoursPlayed: 0,
              progressPercent: null,
            },
          ],
        },
        {
          id: 'court',
          gameWorkId: 'w2',
          gameWork: gameWork('Court', 2 * H),
          ownerships: [
            {
              status: 'PAUSED',
              platform: 'PC',
              completionTarget: 'MAIN',
              hoursPlayed: 1,
              progressPercent: null,
            },
          ],
        },
      ],
    });
    const dashboard = await new DashboardService(prisma, makeLibraryBooks()).getDashboard('u1');
    expect(dashboard.inProgress.map((i) => i.title)).toEqual(['Court', 'Long']);
  });
});

describe('DashboardService — livres (docs/cadrage/17)', () => {
  const bookWork = (title: string, medianPages: number | null) => ({
    payload: { mediaType: 'book', title, coverUrl: null, medianPages },
  });

  it('répartit lecture en cours / pile à lire, vitesse calibrée appliquée', async () => {
    const prisma = makePrisma({
      bookEntries: [
        {
          id: 'b1',
          status: 'READING',
          bookWork: bookWork('En cours', 300),
          pagesTotal: 300,
          currentPage: 100,
          progressPercent: null,
        },
        {
          id: 'b2',
          status: 'TO_READ',
          bookWork: bookWork('À lire', 200),
          pagesTotal: 200,
          currentPage: 0,
          progressPercent: null,
        },
        {
          id: 'b3',
          status: 'FINISHED',
          bookWork: bookWork('Fini', 400),
          pagesTotal: 400,
          currentPage: 400,
          progressPercent: null,
        },
      ],
    });
    // 40 p/h calibrées : 200 p restantes → 5 h ; pile à lire 200 p → 5 h
    const dashboard = await new DashboardService(prisma, makeLibraryBooks(40)).getDashboard('u1');

    expect(dashboard.books.inProgress).toMatchObject({ count: 1, seconds: 5 * H });
    expect(dashboard.books.toRead).toMatchObject({ count: 1, seconds: 5 * H });
    expect(dashboard.books.inProgress.estimated).toBe(false);
    expect(dashboard.totalSeconds).toBe(10 * H);
    expect(dashboard.inProgress.map((i) => i.title)).toEqual(['En cours']);
    expect(dashboard.inProgress[0]?.subtitle).toBe('p. 100/300');
  });

  it('sans calibration : repli 30 p/h, signalé estimé ; pages inconnues → à estimer', async () => {
    const prisma = makePrisma({
      bookEntries: [
        {
          id: 'b1',
          status: 'READING',
          bookWork: bookWork('Repli', 300),
          pagesTotal: 300,
          currentPage: 0,
          progressPercent: null,
        },
        {
          id: 'b2',
          status: 'TO_READ',
          bookWork: bookWork('Sans pages', null),
          pagesTotal: null,
          currentPage: 0,
          progressPercent: null,
        },
      ],
    });
    const dashboard = await new DashboardService(prisma, makeLibraryBooks(null)).getDashboard('u1');

    // 300 p à 30 p/h → 10 h, marqué estimé (vitesse de repli)
    expect(dashboard.books.inProgress).toMatchObject({
      count: 1,
      seconds: 10 * H,
      estimated: true,
    });
    // pagesTotal null : compté mais exclu du total, signalé à estimer
    expect(dashboard.books.toRead).toMatchObject({ count: 1, seconds: 0, unknownCount: 1 });
    expect(dashboard.totalEstimated).toBe(true);
  });
});
