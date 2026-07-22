import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SeriesEntry } from '@prisma/client';
import type {
  AddedResponse,
  EpisodeState,
  SeasonEpisodesResponse,
  SeriesDetail,
  SeriesEntryDetail,
  SeriesStatus,
  UpdateSeriesEntryBody,
} from '@trackly/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { todayDateOnly } from './serialize';
import { WorksService } from './works.service';

@Injectable()
export class LibrarySeriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly works: WorksService,
  ) {}

  async add(userId: string, input: { tmdbId: string; status: string }): Promise<AddedResponse> {
    const work = await this.works.ensureSeriesWork(input.tmdbId);
    const existing = await this.prisma.seriesEntry.findUnique({
      where: { userId_seriesWorkId: { userId, seriesWorkId: work.id } },
    });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        code: 'ALREADY_IN_LIBRARY',
        message: 'Déjà dans ta bibliothèque.',
        entryId: existing.id,
      });
    }
    const entry = await this.prisma.seriesEntry.create({
      data: { userId, seriesWorkId: work.id, status: input.status as SeriesStatus },
    });
    return { entryId: entry.id };
  }

  async getDetail(userId: string, entryId: string): Promise<SeriesEntryDetail> {
    const entry = await this.findEntry(userId, entryId);
    const work = await this.prisma.seriesWork.findUniqueOrThrow({
      where: { id: entry.seriesWorkId },
    });
    const detail = work.payload as unknown as SeriesDetail;
    const watches = await this.prisma.episodeWatch.findMany({
      where: { userId, episode: { seriesWorkId: work.id } },
      select: { watchedAt: true, episode: { select: { seasonNumber: true } } },
    });
    const watchedBySeason = new Map<number, number>();
    let lastWatchedAt: Date | null = null;
    for (const watch of watches) {
      const season = watch.episode.seasonNumber;
      watchedBySeason.set(season, (watchedBySeason.get(season) ?? 0) + 1);
      if (!lastWatchedAt || watch.watchedAt > lastWatchedAt) lastWatchedAt = watch.watchedAt;
    }
    return {
      entryId: entry.id,
      work: detail,
      status: entry.status,
      favorite: entry.favorite,
      rating: entry.rating,
      review: entry.review,
      notes: entry.notes,
      seasons: detail.seasons.map((season) => ({
        seasonNumber: season.seasonNumber,
        name: season.name,
        episodeCount: season.episodeCount,
        airDate: season.airDate,
        watchedCount: watchedBySeason.get(season.seasonNumber) ?? 0,
      })),
      watchedEpisodes: watches.length,
      totalEpisodes: detail.seasons.reduce((sum, season) => sum + season.episodeCount, 0),
      lastWatchedAt: lastWatchedAt ? lastWatchedAt.toISOString() : null,
    };
  }

  async listSeasonEpisodes(
    userId: string,
    entryId: string,
    seasonNumber: number,
  ): Promise<SeasonEpisodesResponse> {
    const entry = await this.findEntry(userId, entryId);
    const work = await this.prisma.seriesWork.findUniqueOrThrow({
      where: { id: entry.seriesWorkId },
    });
    await this.works.ensureSeasonEpisodes(work, seasonNumber);
    const records = await this.prisma.episodeRecord.findMany({
      where: { seriesWorkId: work.id, seasonNumber },
      orderBy: { episodeNumber: 'asc' },
      include: { watches: { where: { userId } } },
    });
    const today = todayDateOnly();
    return {
      seasonNumber,
      episodes: records.map((record): EpisodeState => {
        const watch = record.watches[0];
        return {
          id: record.id,
          seasonNumber: record.seasonNumber,
          episodeNumber: record.episodeNumber,
          name: record.name,
          runtimeMinutes: record.runtimeMinutes,
          airDate: record.airDate ? record.airDate.toISOString().slice(0, 10) : null,
          aired: record.airDate !== null && record.airDate <= today,
          watched: Boolean(watch),
          watchedAt: watch ? watch.watchedAt.toISOString() : null,
        };
      }),
    };
  }

  /** Marquage idempotent (CA D1) ; un épisode non diffusé n'est pas marquable. */
  async markEpisode(userId: string, entryId: string, episodeId: string): Promise<void> {
    const entry = await this.findEntry(userId, entryId);
    const episode = await this.prisma.episodeRecord.findFirst({
      where: { id: episodeId, seriesWorkId: entry.seriesWorkId },
    });
    if (!episode) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'EPISODE_NOT_FOUND',
        message: 'Épisode introuvable.',
      });
    }
    if (!episode.airDate || episode.airDate > todayDateOnly()) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'EPISODE_NOT_AIRED',
        message: 'Cet épisode n’est pas encore diffusé.',
      });
    }
    await this.prisma.episodeWatch.upsert({
      where: { userId_episodeId: { userId, episodeId } },
      create: { userId, episodeId },
      update: {},
    });
    await this.syncStatusWithProgress(entry);
  }

  async unmarkEpisode(userId: string, entryId: string, episodeId: string): Promise<void> {
    const entry = await this.findEntry(userId, entryId);
    await this.prisma.episodeWatch.deleteMany({ where: { userId, episodeId } });
    await this.syncStatusWithProgress(entry);
  }

  /** Marque tous les épisodes déjà diffusés de la saison (CA D1 : saison entière). */
  async markSeason(userId: string, entryId: string, seasonNumber: number): Promise<void> {
    const entry = await this.findEntry(userId, entryId);
    const work = await this.prisma.seriesWork.findUniqueOrThrow({
      where: { id: entry.seriesWorkId },
    });
    await this.works.ensureSeasonEpisodes(work, seasonNumber);
    const aired = await this.prisma.episodeRecord.findMany({
      where: { seriesWorkId: work.id, seasonNumber, airDate: { lte: todayDateOnly() } },
      select: { id: true },
    });
    await this.prisma.episodeWatch.createMany({
      data: aired.map((episode) => ({ userId, episodeId: episode.id })),
      skipDuplicates: true,
    });
    await this.syncStatusWithProgress(entry);
  }

  async unmarkSeason(userId: string, entryId: string, seasonNumber: number): Promise<void> {
    const entry = await this.findEntry(userId, entryId);
    await this.prisma.episodeWatch.deleteMany({
      where: { userId, episode: { seriesWorkId: entry.seriesWorkId, seasonNumber } },
    });
    await this.syncStatusWithProgress(entry);
  }

  async updateEntry(userId: string, entryId: string, body: UpdateSeriesEntryBody): Promise<void> {
    await this.findEntry(userId, entryId);
    await this.prisma.seriesEntry.update({
      where: { id: entryId },
      data: { ...body, status: body.status as SeriesStatus | undefined },
    });
  }

  async deleteEntry(userId: string, entryId: string): Promise<void> {
    const entry = await this.findEntry(userId, entryId);
    // RGPD : retirer la série efface aussi l'historique de visionnage personnel
    await this.prisma.episodeWatch.deleteMany({
      where: { userId, episode: { seriesWorkId: entry.seriesWorkId } },
    });
    await this.prisma.seriesEntry.delete({ where: { id: entryId } });
  }

  /**
   * Aligne le statut sur l'avancement réel, dans les deux sens :
   * premier épisode marqué sur une série « à voir » → en cours ;
   * dernier épisode marqué → terminée ; épisode démarqué (ou saison ajoutée
   * au catalogue) sur une série terminée → de nouveau en cours.
   *
   * « En pause » et « abandonnée » sont des choix explicites : on n'y touche pas,
   * sauf si tout a été vu — auquel cas la série est terminée, quoi qu'il arrive.
   */
  private async syncStatusWithProgress(entry: SeriesEntry): Promise<void> {
    if (entry.status === 'DROPPED') return;

    const work = await this.prisma.seriesWork.findUniqueOrThrow({
      where: { id: entry.seriesWorkId },
    });
    const detail = work.payload as unknown as SeriesDetail;
    const totalEpisodes = detail.seasons.reduce((sum, season) => sum + season.episodeCount, 0);
    const watched = await this.prisma.episodeWatch.count({
      where: { userId: entry.userId, episode: { seriesWorkId: entry.seriesWorkId } },
    });

    let next: SeriesStatus | null = null;
    if (totalEpisodes > 0 && watched >= totalEpisodes) next = 'FINISHED';
    else if (entry.status === 'FINISHED') next = 'WATCHING';
    else if (entry.status === 'TO_WATCH' && watched > 0) next = 'WATCHING';

    if (next && next !== entry.status) {
      await this.prisma.seriesEntry.update({ where: { id: entry.id }, data: { status: next } });
    }
  }

  private async findEntry(userId: string, entryId: string): Promise<SeriesEntry> {
    const entry = await this.prisma.seriesEntry.findFirst({ where: { id: entryId, userId } });
    if (!entry) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'ENTRY_NOT_FOUND',
        message: 'Entrée introuvable dans ta bibliothèque.',
      });
    }
    return entry;
  }
}
