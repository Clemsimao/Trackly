import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PasswordService } from '../auth/password.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * RGPD (Lot 5) : droit d'accès (export complet) et droit à l'effacement.
 * L'export contient TOUTES les données personnelles ; la suppression s'appuie
 * sur les cascades du schéma (sessions, entrées, possessions, journal,
 * visionnages, overrides) — les œuvres partagées, non personnelles, restent.
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  async exportData(userId: string): Promise<Record<string, unknown>> {
    const [user, gameEntries, seriesEntries, filmEntries, watches, overrides] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { email: true, displayName: true, createdAt: true },
      }),
      this.prisma.gameEntry.findMany({
        where: { userId },
        include: {
          gameWork: { select: { igdbId: true, title: true } },
          ownerships: { include: { progressUpdates: { orderBy: { createdAt: 'asc' } } } },
        },
      }),
      this.prisma.seriesEntry.findMany({
        where: { userId },
        include: { seriesWork: { select: { tmdbId: true, title: true } } },
      }),
      this.prisma.filmEntry.findMany({
        where: { userId },
        include: { filmWork: { select: { tmdbId: true, title: true } } },
      }),
      this.prisma.episodeWatch.findMany({
        where: { userId },
        include: {
          episode: {
            select: {
              seasonNumber: true,
              episodeNumber: true,
              name: true,
              seriesWork: { select: { title: true } },
            },
          },
        },
      }),
      this.prisma.fieldOverride.findMany({ where: { userId } }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      format: 'trackly-export-v1',
      profile: user,
      games: gameEntries.map((entry) => ({
        title: entry.gameWork.title,
        igdbId: entry.gameWork.igdbId,
        rating: entry.rating,
        review: entry.review,
        notes: entry.notes,
        favorite: entry.favorite,
        addedAt: entry.createdAt,
        ownerships: entry.ownerships.map((o) => ({
          platform: o.platform,
          status: o.status,
          hoursPlayed: o.hoursPlayed,
          progressPercent: o.progressPercent,
          nextObjective: o.nextObjective,
          resumeNote: o.resumeNote,
          completionTarget: o.completionTarget,
          purchaseDate: o.purchaseDate,
          startedAt: o.startedAt,
          finishedAt: o.finishedAt,
          lastPlayedAt: o.lastPlayedAt,
          trophiesEarned: o.trophiesEarned,
          trophiesTotal: o.trophiesTotal,
          journal: o.progressUpdates.map((u) => ({
            at: u.createdAt,
            hoursPlayed: u.hoursPlayed,
            progressPercent: u.progressPercent,
            note: u.note,
          })),
        })),
      })),
      series: seriesEntries.map((entry) => ({
        title: entry.seriesWork.title,
        tmdbId: entry.seriesWork.tmdbId,
        status: entry.status,
        rating: entry.rating,
        review: entry.review,
        notes: entry.notes,
        favorite: entry.favorite,
        addedAt: entry.createdAt,
      })),
      episodesWatched: watches.map((watch) => ({
        series: watch.episode.seriesWork.title,
        season: watch.episode.seasonNumber,
        episode: watch.episode.episodeNumber,
        name: watch.episode.name,
        watchedAt: watch.watchedAt,
      })),
      films: filmEntries.map((entry) => ({
        title: entry.filmWork.title,
        tmdbId: entry.filmWork.tmdbId,
        status: entry.status,
        watchedAt: entry.watchedAt,
        rewatch: entry.rewatch,
        watchedWith: entry.watchedWith,
        rating: entry.rating,
        review: entry.review,
        notes: entry.notes,
        favorite: entry.favorite,
        addedAt: entry.createdAt,
      })),
      overrides: overrides.map((override) => ({
        entityType: override.entityType,
        entityId: override.entityId,
        field: override.fieldName,
        value: override.value,
        source: override.source,
      })),
    };
  }

  /** Suppression définitive, confirmée par mot de passe. Les cascades font le reste. */
  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await this.passwords.verify(user.passwordHash, password);
    if (!valid) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_PASSWORD',
        message: 'Mot de passe incorrect.',
      });
    }
    await this.prisma.user.delete({ where: { id: userId } });
    this.logger.log(`Compte supprimé (RGPD) : ${userId}`);
  }
}
