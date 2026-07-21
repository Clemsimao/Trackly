import { Injectable } from '@nestjs/common';
import type {
  FilmDetail,
  GameDetail,
  LibraryFilmItem,
  LibraryGameItem,
  LibraryResponse,
  LibrarySeriesItem,
  SeriesDetail,
  WorkSummary,
} from '@trackly/contracts';
import { deriveGameStatus } from '@trackly/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { toDateOnly } from './serialize';

/**
 * La bibliothèque complète en une réponse : à l'échelle d'une bibliothèque
 * personnelle (quelques centaines d'entrées), filtres et tris se font côté client.
 */
@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async getLibrary(userId: string): Promise<LibraryResponse> {
    const [gameEntries, seriesEntries, filmEntries] = await Promise.all([
      this.prisma.gameEntry.findMany({
        where: { userId },
        include: { gameWork: true, ownerships: { orderBy: { createdAt: 'asc' } } },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.seriesEntry.findMany({
        where: { userId },
        include: { seriesWork: true },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.filmEntry.findMany({
        where: { userId },
        include: { filmWork: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const seriesWorkIds = seriesEntries.map((entry) => entry.seriesWorkId);
    const watches = seriesWorkIds.length
      ? await this.prisma.episodeWatch.findMany({
          where: { userId, episode: { seriesWorkId: { in: seriesWorkIds } } },
          select: { episode: { select: { seriesWorkId: true } } },
        })
      : [];
    const watchedByWork = new Map<string, number>();
    for (const watch of watches) {
      const workId = watch.episode.seriesWorkId;
      watchedByWork.set(workId, (watchedByWork.get(workId) ?? 0) + 1);
    }

    return {
      games: gameEntries.map((entry): LibraryGameItem => {
        const detail = entry.gameWork.payload as unknown as GameDetail;
        return {
          entryId: entry.id,
          igdbId: entry.gameWork.igdbId,
          work: {
            title: detail.title,
            posterUrl: detail.coverUrl,
            year: yearOf(detail.releaseDate),
            genres: detail.genres,
          },
          status: deriveGameStatus(entry.ownerships.map((o) => o.status)),
          favorite: entry.favorite,
          rating: entry.rating,
          ownerships: entry.ownerships.map((o) => ({
            id: o.id,
            platform: o.platform,
            status: o.status,
            hoursPlayed: o.hoursPlayed,
            progressPercent: o.progressPercent,
          })),
          updatedAt: entry.updatedAt.toISOString(),
        };
      }),
      series: seriesEntries.map((entry): LibrarySeriesItem => {
        const detail = entry.seriesWork.payload as unknown as SeriesDetail;
        return {
          entryId: entry.id,
          tmdbId: entry.seriesWork.tmdbId,
          work: summaryOf(detail.title, detail.posterUrl, detail.firstAirDate, detail.genres),
          status: entry.status,
          favorite: entry.favorite,
          rating: entry.rating,
          watchedEpisodes: watchedByWork.get(entry.seriesWorkId) ?? 0,
          totalEpisodes: detail.seasons.reduce((sum, season) => sum + season.episodeCount, 0),
          updatedAt: entry.updatedAt.toISOString(),
        };
      }),
      films: filmEntries.map((entry): LibraryFilmItem => {
        const detail = entry.filmWork.payload as unknown as FilmDetail;
        return {
          entryId: entry.id,
          tmdbId: entry.filmWork.tmdbId,
          work: summaryOf(detail.title, detail.posterUrl, detail.releaseDate, detail.genres),
          runtimeMinutes: detail.runtimeMinutes,
          status: entry.status,
          favorite: entry.favorite,
          rating: entry.rating,
          watchedAt: toDateOnly(entry.watchedAt),
          updatedAt: entry.updatedAt.toISOString(),
        };
      }),
    };
  }
}

function yearOf(date: string | null): number | null {
  if (!date) return null;
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function summaryOf(
  title: string,
  posterUrl: string | null,
  date: string | null,
  genres: string[],
): WorkSummary {
  return { title, posterUrl, year: yearOf(date), genres };
}
