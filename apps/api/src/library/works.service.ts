import { Injectable, Logger } from '@nestjs/common';
import type { Prisma, SeriesWork } from '@prisma/client';
import type { FilmDetail, GameDetail, SeriesDetail } from '@trackly/contracts';
import { CatalogService } from '../catalog/catalog.service';
import { PrismaService } from '../prisma/prisma.service';

/** Snapshot d'œuvre plus vieux que 7 jours : rafraîchi au prochain ajout. */
const WORK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Œuvres partagées : snapshots normalisés des fournisseurs, persistés en base.
 * La bibliothèque reste consultable même si TMDB/IGDB sont en panne (RT-3) —
 * en cas d'échec de rafraîchissement, on garde le snapshot périmé.
 */
@Injectable()
export class WorksService {
  private readonly logger = new Logger(WorksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
  ) {}

  async ensureGameWork(igdbId: string) {
    const existing = await this.prisma.gameWork.findUnique({ where: { igdbId } });
    if (existing && !this.isStale(existing.refreshedAt)) return existing;
    try {
      const detail = await this.catalog.getGame(igdbId);
      return await this.prisma.gameWork.upsert({
        where: { igdbId },
        create: this.gameData(igdbId, detail),
        update: this.gameData(igdbId, detail),
      });
    } catch (error) {
      if (existing) {
        this.logger.warn(`Rafraîchissement du jeu ${igdbId} en échec, snapshot conservé`);
        return existing;
      }
      throw error;
    }
  }

  async ensureSeriesWork(tmdbId: string) {
    const existing = await this.prisma.seriesWork.findUnique({ where: { tmdbId } });
    if (existing && !this.isStale(existing.refreshedAt)) return existing;
    try {
      const detail = await this.catalog.getSeries(tmdbId);
      return await this.prisma.seriesWork.upsert({
        where: { tmdbId },
        create: this.tmdbData(tmdbId, detail),
        update: this.tmdbData(tmdbId, detail),
      });
    } catch (error) {
      if (existing) {
        this.logger.warn(`Rafraîchissement de la série ${tmdbId} en échec, snapshot conservé`);
        return existing;
      }
      throw error;
    }
  }

  async ensureFilmWork(tmdbId: string) {
    const existing = await this.prisma.filmWork.findUnique({ where: { tmdbId } });
    if (existing && !this.isStale(existing.refreshedAt)) return existing;
    try {
      const detail = await this.catalog.getFilm(tmdbId);
      return await this.prisma.filmWork.upsert({
        where: { tmdbId },
        create: this.tmdbData(tmdbId, detail),
        update: this.tmdbData(tmdbId, detail),
      });
    } catch (error) {
      if (existing) {
        this.logger.warn(`Rafraîchissement du film ${tmdbId} en échec, snapshot conservé`);
        return existing;
      }
      throw error;
    }
  }

  /**
   * Alimente les EpisodeRecord d'une saison depuis /tv/{id}/season/{n} —
   * seule source fiable des durées par épisode (episode_run_time : 10 % de couverture).
   * Re-synchronise si la saison compte plus d'épisodes que ce qui est stocké
   * (série en cours de diffusion).
   */
  async ensureSeasonEpisodes(work: SeriesWork, seasonNumber: number) {
    const payload = work.payload as unknown as SeriesDetail;
    const summary = payload.seasons.find((s) => s.seasonNumber === seasonNumber);
    const stored = await this.prisma.episodeRecord.count({
      where: { seriesWorkId: work.id, seasonNumber },
    });
    if (stored > 0 && (!summary || stored >= summary.episodeCount)) return;

    const episodes = await this.catalog.getSeasonEpisodes(work.tmdbId, seasonNumber);
    for (const episode of episodes) {
      const data = {
        name: episode.name,
        runtimeMinutes: episode.runtimeMinutes,
        airDate: episode.airDate ? new Date(episode.airDate) : null,
      };
      await this.prisma.episodeRecord.upsert({
        where: {
          seriesWorkId_seasonNumber_episodeNumber: {
            seriesWorkId: work.id,
            seasonNumber,
            episodeNumber: episode.episodeNumber,
          },
        },
        create: {
          seriesWorkId: work.id,
          seasonNumber,
          episodeNumber: episode.episodeNumber,
          ...data,
        },
        update: data,
      });
    }
  }

  private isStale(refreshedAt: Date): boolean {
    return Date.now() - refreshedAt.getTime() > WORK_TTL_MS;
  }

  private gameData(igdbId: string, detail: GameDetail) {
    return {
      igdbId,
      title: detail.title,
      payload: detail as unknown as Prisma.InputJsonValue,
      refreshedAt: new Date(),
    };
  }

  private tmdbData(tmdbId: string, detail: SeriesDetail | FilmDetail) {
    return {
      tmdbId,
      title: detail.title,
      payload: detail as unknown as Prisma.InputJsonValue,
      refreshedAt: new Date(),
    };
  }
}
