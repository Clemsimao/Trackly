import { randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DELETION_GRACE_DAYS } from '@trackly/contracts';
import { PasswordService } from '../auth/password.service';
import { hashToken } from '../auth/session.service';
import { MailService } from '../mail/mail.service';
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
    private readonly mail: MailService,
    private readonly config: ConfigService,
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

  /**
   * Demande de suppression (CA A5) : rien n'est effacé tout de suite. Le compte
   * est marqué, l'utilisateur reçoit un lien d'annulation, et la purge s'exécute
   * à l'échéance du délai de grâce.
   *
   * Les sessions ne sont volontairement PAS révoquées : sans elles, impossible
   * de se reconnecter pour annuler, alors que l'annulation est tout l'intérêt
   * du délai. Le lien à jeton reste le filet pour qui a perdu l'accès.
   */
  async requestDeletion(userId: string, password: string): Promise<Date> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await this.passwords.verify(user.passwordHash, password);
    if (!valid) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_PASSWORD',
        message: 'Mot de passe incorrect.',
      });
    }

    // Demande déjà en cours : on ne repousse pas l'échéance, on renvoie la même.
    if (user.deletionRequestedAt) {
      return deadline(user.deletionRequestedAt);
    }

    const token = randomBytes(32).toString('base64url');
    const requestedAt = new Date();
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletionRequestedAt: requestedAt, deletionTokenHash: hashToken(token) },
    });

    const echeance = deadline(requestedAt);
    const base = this.config.get<string>('APP_URL') ?? 'http://localhost:5173';
    await this.mail.sendDeletionRequested(
      user.email,
      `${base}/annulation-suppression?token=${token}`,
      echeance,
    );
    this.logger.log(`Suppression demandée (RGPD) : ${userId}, échéance ${echeance.toISOString()}`);
    return echeance;
  }

  /** Annulation depuis le lien reçu par e-mail — ne demande aucune session. */
  async cancelDeletionByToken(token: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { deletionTokenHash: hashToken(token) },
    });
    if (!user || !user.deletionRequestedAt) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_DELETION_TOKEN',
        message: 'Ce lien d’annulation n’est plus valable.',
      });
    }
    await this.clearDeletion(user.id);
  }

  /** Annulation depuis l'application, par l'utilisateur connecté. */
  async cancelDeletion(userId: string): Promise<void> {
    await this.clearDeletion(userId);
  }

  /**
   * Purge les comptes dont le délai de grâce est écoulé. Les cascades du schéma
   * effacent le reste ; les œuvres partagées, non personnelles, subsistent.
   * L'adresse est lue AVANT la suppression : après, il n'y a plus personne à prévenir.
   */
  async purgeExpiredDeletions(now = new Date()): Promise<number> {
    const limite = new Date(now.getTime() - DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
    const dus = await this.prisma.user.findMany({
      where: { deletionRequestedAt: { not: null, lte: limite } },
      select: { id: true, email: true },
    });

    for (const user of dus) {
      await this.prisma.user.delete({ where: { id: user.id } });
      this.logger.log(`Compte purgé (RGPD) : ${user.id}`);
      try {
        await this.mail.sendDeletionCompleted(user.email);
      } catch (error) {
        // La purge, elle, a bien eu lieu : un e-mail perdu ne doit pas la rejouer.
        this.logger.error(`Confirmation de purge non envoyée à ${user.email}`, error);
      }
    }
    return dus.length;
  }

  private async clearDeletion(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletionRequestedAt: null, deletionTokenHash: null },
    });
    this.logger.log(`Suppression annulée (RGPD) : ${userId}`);
  }
}

/** Échéance de purge pour une demande faite à cette date. */
function deadline(requestedAt: Date): Date {
  return new Date(requestedAt.getTime() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
}
