import { Injectable } from '@nestjs/common';
import type {
  BudgetBucket,
  CompletionTarget,
  DashboardItem,
  DashboardResponse,
  FilmDetail,
  GameDetail,
  SeriesDetail,
  TimeToBeat,
} from '@trackly/contracts';
import {
  filmRemainingSeconds,
  gameRemainingSeconds,
  seriesRemaining,
  type GameDurationsInput,
  type OwnershipStatus,
} from '@trackly/contracts';
import { todayDateOnly } from '../library/serialize';
import { PrismaService } from '../prisma/prisma.service';

/** Le plus « actif » d'abord — même précédence que deriveGameStatus. */
const ACTIVE_PRECEDENCE: OwnershipStatus[] = [
  'PLAYING',
  'PAUSED',
  'BACKLOG',
  'COMPLETED',
  'FINISHED',
  'DROPPED',
];

function emptyBucket(): BudgetBucket {
  return { count: 0, seconds: 0, estimated: false, unknownCount: 0 };
}

function addToBucket(
  bucket: BudgetBucket,
  remainingSeconds: number | null,
  estimated = false,
): void {
  bucket.count += 1;
  if (remainingSeconds == null) {
    bucket.unknownCount += 1;
    return;
  }
  bucket.seconds += remainingSeconds;
  if (estimated) bucket.estimated = true;
}

/**
 * Tableau de bord du budget temps (Lot 4) : assemble la bibliothèque et
 * délègue tous les calculs au module pur @trackly/contracts/time-budget.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string): Promise<DashboardResponse> {
    const [gameEntries, seriesEntries, filmEntries] = await Promise.all([
      this.prisma.gameEntry.findMany({
        where: { userId },
        include: { gameWork: true, ownerships: true },
      }),
      this.prisma.seriesEntry.findMany({ where: { userId }, include: { seriesWork: true } }),
      this.prisma.filmEntry.findMany({ where: { userId }, include: { filmWork: true } }),
    ]);

    const games = { inProgress: emptyBucket(), backlog: emptyBucket(), wishlist: emptyBucket() };
    const series = { inProgress: emptyBucket(), toWatch: emptyBucket() };
    const films = { toWatch: emptyBucket() };
    const inProgress: DashboardItem[] = [];

    // ── Jeux : durées effectives (overrides personnels par-dessus IGDB) ──────
    const overrides = await this.prisma.fieldOverride.findMany({
      where: { userId, entityType: 'game_work' },
    });
    const overridesByWork = new Map<string, Map<string, number>>();
    for (const override of overrides) {
      const byField = overridesByWork.get(override.entityId) ?? new Map<string, number>();
      byField.set(override.fieldName, override.value as number);
      overridesByWork.set(override.entityId, byField);
    }

    for (const entry of gameEntries) {
      const detail = entry.gameWork.payload as unknown as GameDetail;
      const durations = effectiveDurations(
        detail.timeToBeat,
        overridesByWork.get(entry.gameWorkId),
      );
      const active = [...entry.ownerships].sort(
        (a, b) => ACTIVE_PRECEDENCE.indexOf(a.status) - ACTIVE_PRECEDENCE.indexOf(b.status),
      )[0];
      const status: OwnershipStatus | 'WISHLIST' = active?.status ?? 'WISHLIST';
      const target: CompletionTarget = active?.completionTarget ?? 'MAIN';
      const remaining = gameRemainingSeconds(durations, target, {
        status,
        hoursPlayed: active?.hoursPlayed ?? 0,
        progressPercent: active?.progressPercent ?? null,
      });

      if (status === 'PLAYING' || status === 'PAUSED') {
        addToBucket(games.inProgress, remaining);
        inProgress.push({
          mediaType: 'game',
          entryId: entry.id,
          title: detail.title,
          posterUrl: detail.coverUrl,
          subtitle: active
            ? [
                active.platform,
                active.progressPercent != null ? `${active.progressPercent} %` : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : null,
          remainingSeconds: remaining,
          estimated: false,
        });
      } else if (status === 'WISHLIST') {
        addToBucket(games.wishlist, remaining);
      } else if (status === 'BACKLOG') {
        addToBucket(games.backlog, remaining);
      }
      // terminé / 100 % / abandonné : plus rien à budgéter
    }

    // ── Séries : runtimes réels connus + estimation du reste ────────────────
    const workIds = seriesEntries.map((entry) => entry.seriesWorkId);
    const [watchRows, knownCounts, unwatchedAired] = workIds.length
      ? await Promise.all([
          this.prisma.episodeWatch.findMany({
            where: { userId, episode: { seriesWorkId: { in: workIds } } },
            select: { episode: { select: { seriesWorkId: true } } },
          }),
          this.prisma.episodeRecord.groupBy({
            by: ['seriesWorkId'],
            where: { seriesWorkId: { in: workIds } },
            _count: { _all: true },
          }),
          this.prisma.episodeRecord.findMany({
            where: {
              seriesWorkId: { in: workIds },
              airDate: { lte: todayDateOnly() },
              watches: { none: { userId } },
            },
            select: { seriesWorkId: true, runtimeMinutes: true },
          }),
        ])
      : [[], [], []];

    const watchedByWork = new Map<string, number>();
    for (const row of watchRows) {
      const id = row.episode.seriesWorkId;
      watchedByWork.set(id, (watchedByWork.get(id) ?? 0) + 1);
    }
    const knownByWork = new Map(knownCounts.map((row) => [row.seriesWorkId, row._count._all]));
    const runtimesByWork = new Map<string, Array<number | null>>();
    for (const row of unwatchedAired) {
      const list = runtimesByWork.get(row.seriesWorkId) ?? [];
      list.push(row.runtimeMinutes);
      runtimesByWork.set(row.seriesWorkId, list);
    }

    for (const entry of seriesEntries) {
      if (entry.status === 'FINISHED' || entry.status === 'DROPPED') continue;
      const detail = entry.seriesWork.payload as unknown as SeriesDetail;
      const totalEpisodes = detail.seasons.reduce((sum, season) => sum + season.episodeCount, 0);
      const watched = watchedByWork.get(entry.seriesWorkId) ?? 0;
      const result = seriesRemaining({
        totalEpisodes,
        watchedEpisodes: watched,
        knownUnwatchedRuntimesMinutes: runtimesByWork.get(entry.seriesWorkId) ?? [],
        knownEpisodes: knownByWork.get(entry.seriesWorkId) ?? 0,
        seriesRuntimeMinutes: detail.episodeRunTimeMinutes,
      });

      if (entry.status === 'WATCHING' || entry.status === 'PAUSED') {
        addToBucket(series.inProgress, result.seconds, result.estimated);
        inProgress.push({
          mediaType: 'series',
          entryId: entry.id,
          title: detail.title,
          posterUrl: detail.posterUrl,
          subtitle: `${watched}/${totalEpisodes} ép.`,
          remainingSeconds: result.seconds,
          estimated: result.estimated,
        });
      } else {
        addToBucket(series.toWatch, result.seconds, result.estimated);
      }
    }

    // ── Films ───────────────────────────────────────────────────────────────
    for (const entry of filmEntries) {
      if (entry.status !== 'TO_WATCH') continue;
      const detail = entry.filmWork.payload as unknown as FilmDetail;
      addToBucket(films.toWatch, filmRemainingSeconds(detail.runtimeMinutes));
    }

    // Victoires rapides d'abord ; temps inconnu en dernier
    inProgress.sort(
      (a, b) =>
        (a.remainingSeconds ?? Number.MAX_SAFE_INTEGER) -
        (b.remainingSeconds ?? Number.MAX_SAFE_INTEGER),
    );

    const countedBuckets = [
      games.inProgress,
      games.backlog,
      series.inProgress,
      series.toWatch,
      films.toWatch,
    ];
    return {
      totalSeconds: countedBuckets.reduce((sum, bucket) => sum + bucket.seconds, 0),
      totalEstimated: countedBuckets.some((bucket) => bucket.estimated || bucket.unknownCount > 0),
      games,
      series,
      films,
      inProgress: inProgress.slice(0, 10),
    };
  }
}

function effectiveDurations(
  snapshot: TimeToBeat | null,
  overrides: Map<string, number> | undefined,
): GameDurationsInput {
  const resolve = (field: 'mainSeconds' | 'mainExtraSeconds' | 'completionistSeconds') => {
    const override = overrides?.get(field);
    if (override != null) return { seconds: override, provenance: 'overridden' as const };
    const auto = snapshot?.[field] ?? null;
    return { seconds: auto, provenance: auto != null ? ('auto' as const) : null };
  };
  return {
    main: resolve('mainSeconds'),
    mainExtra: resolve('mainExtraSeconds'),
    completionist: resolve('completionistSeconds'),
  };
}
