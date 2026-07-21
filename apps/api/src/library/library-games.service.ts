import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { GameEntry, GameOwnership } from '@prisma/client';
import type {
  AddedResponse,
  GameDetail,
  GameEntryDetail,
  JournalEntry,
  OwnershipDetail,
  UpdateDurationsBody,
  UpdateGameEntryBody,
  UpdateOwnershipBody,
} from '@trackly/contracts';
import { deriveGameStatus, type OwnershipStatus } from '@trackly/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { OverridesService } from './overrides.service';
import { fromDateOnly, toDateOnly, todayDateOnly } from './serialize';
import { WorksService } from './works.service';

type AddGameInput = { igdbId: string; status: string; platform?: string };

@Injectable()
export class LibraryGamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly works: WorksService,
    private readonly overrides: OverridesService,
  ) {}

  /** Ajout en 2 interactions (story B2) : statut envie par défaut, plateforme si possédé. */
  async add(userId: string, input: AddGameInput): Promise<AddedResponse> {
    const work = await this.works.ensureGameWork(input.igdbId);
    const existing = await this.prisma.gameEntry.findUnique({
      where: { userId_gameWorkId: { userId, gameWorkId: work.id } },
    });
    if (existing) {
      // CA B2 : proposer d'ouvrir la fiche existante plutôt que dupliquer
      throw new ConflictException({
        statusCode: 409,
        code: 'ALREADY_IN_LIBRARY',
        message: 'Déjà dans ta bibliothèque.',
        entryId: existing.id,
      });
    }
    const entry = await this.prisma.gameEntry.create({
      data: {
        userId,
        gameWorkId: work.id,
        ownerships:
          input.status !== 'WISHLIST' && input.platform
            ? {
                create: {
                  platform: input.platform,
                  status: input.status as OwnershipStatus,
                },
              }
            : undefined,
      },
    });
    return { entryId: entry.id };
  }

  async getDetail(userId: string, entryId: string): Promise<GameEntryDetail> {
    const entry = await this.findEntry(userId, entryId);
    const [work, journal] = await Promise.all([
      this.prisma.gameWork.findUniqueOrThrow({ where: { id: entry.gameWorkId } }),
      this.prisma.gameProgressUpdate.findMany({
        where: { ownership: { entryId } },
        include: { ownership: { select: { platform: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);
    const detail = work.payload as unknown as GameDetail;
    const durations = await this.overrides.getGameDurations(userId, work.id, detail.timeToBeat);
    return {
      entryId: entry.id,
      work: detail,
      status: deriveGameStatus(entry.ownerships.map((o) => o.status)),
      favorite: entry.favorite,
      rating: entry.rating,
      review: entry.review,
      notes: entry.notes,
      durations,
      ownerships: entry.ownerships.map(mapOwnership),
      journal: journal.map((update): JournalEntry => ({
        id: update.id,
        platform: update.ownership.platform,
        createdAt: update.createdAt.toISOString(),
        hoursPlayed: update.hoursPlayed,
        progressPercent: update.progressPercent,
        note: update.note,
      })),
    };
  }

  async updateEntry(userId: string, entryId: string, body: UpdateGameEntryBody): Promise<void> {
    await this.findEntry(userId, entryId);
    await this.prisma.gameEntry.update({ where: { id: entryId }, data: body });
  }

  async deleteEntry(userId: string, entryId: string): Promise<void> {
    const entry = await this.findEntry(userId, entryId);
    // Les overrides personnels n'ont plus de raison d'être sans l'entrée (RGPD : rien d'orphelin)
    await this.prisma.fieldOverride.deleteMany({
      where: { userId, entityType: 'game_work', entityId: entry.gameWorkId },
    });
    await this.prisma.gameEntry.delete({ where: { id: entryId } });
  }

  async addOwnership(
    userId: string,
    entryId: string,
    body: { platform: string; status: string },
  ): Promise<void> {
    await this.findEntry(userId, entryId);
    const duplicate = await this.prisma.gameOwnership.findUnique({
      where: { entryId_platform: { entryId, platform: body.platform } },
    });
    if (duplicate) {
      throw new ConflictException({
        statusCode: 409,
        code: 'PLATFORM_ALREADY_OWNED',
        message: 'Tu possèdes déjà ce jeu sur cette plateforme.',
      });
    }
    await this.prisma.gameOwnership.create({
      data: { entryId, platform: body.platform, status: body.status as OwnershipStatus },
    });
  }

  /**
   * Mise à jour d'une possession. Toute évolution de progression (heures, %, note)
   * alimente le journal (story C2). Transitions automatiques raisonnables :
   * passage en cours → date de début, terminé/100 % → date de fin, progression → dernière session.
   */
  async updateOwnership(
    userId: string,
    ownershipId: string,
    body: UpdateOwnershipBody,
  ): Promise<void> {
    const ownership = await this.findOwnership(userId, ownershipId);
    const progressChanged =
      (body.hoursPlayed !== undefined && body.hoursPlayed !== ownership.hoursPlayed) ||
      (body.progressPercent !== undefined && body.progressPercent !== ownership.progressPercent);

    const today = todayDateOnly();
    const data: Record<string, unknown> = {
      status: body.status,
      platform: body.platform,
      hoursPlayed: body.hoursPlayed,
      progressPercent: body.progressPercent,
      nextObjective: body.nextObjective,
      resumeNote: body.resumeNote,
      purchaseDate: fromDateOnly(body.purchaseDate),
      startedAt: fromDateOnly(body.startedAt),
      finishedAt: fromDateOnly(body.finishedAt),
      lastPlayedAt: fromDateOnly(body.lastPlayedAt),
      trophiesEarned: body.trophiesEarned,
      trophiesTotal: body.trophiesTotal,
      completionTarget: body.completionTarget,
    };
    if (body.status === 'PLAYING' && !ownership.startedAt && body.startedAt === undefined) {
      data.startedAt = today;
    }
    if (
      (body.status === 'FINISHED' || body.status === 'COMPLETED') &&
      !ownership.finishedAt &&
      body.finishedAt === undefined
    ) {
      data.finishedAt = today;
    }
    if (progressChanged && body.lastPlayedAt === undefined) {
      data.lastPlayedAt = today;
    }

    await this.prisma.gameOwnership.update({ where: { id: ownershipId }, data });

    if (progressChanged || body.journalNote) {
      await this.prisma.gameProgressUpdate.create({
        data: {
          ownershipId,
          hoursPlayed: body.hoursPlayed !== undefined ? body.hoursPlayed : null,
          progressPercent: body.progressPercent !== undefined ? body.progressPercent : null,
          note: body.journalNote ?? null,
        },
      });
    }
  }

  async deleteOwnership(userId: string, ownershipId: string): Promise<void> {
    await this.findOwnership(userId, ownershipId);
    // L'entrée reste : sans possession, le jeu redevient une envie (liste d'envies)
    await this.prisma.gameOwnership.delete({ where: { id: ownershipId } });
  }

  async updateDurations(userId: string, entryId: string, body: UpdateDurationsBody): Promise<void> {
    const entry = await this.findEntry(userId, entryId);
    const work = await this.prisma.gameWork.findUniqueOrThrow({
      where: { id: entry.gameWorkId },
    });
    const detail = work.payload as unknown as GameDetail;
    await this.overrides.setGameDurations(userId, work.id, detail.timeToBeat, body);
  }

  private async findEntry(
    userId: string,
    entryId: string,
  ): Promise<GameEntry & { ownerships: GameOwnership[] }> {
    const entry = await this.prisma.gameEntry.findFirst({
      where: { id: entryId, userId },
      include: { ownerships: { orderBy: { createdAt: 'asc' } } },
    });
    if (!entry) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'ENTRY_NOT_FOUND',
        message: 'Entrée introuvable dans ta bibliothèque.',
      });
    }
    return entry;
  }

  private async findOwnership(userId: string, ownershipId: string): Promise<GameOwnership> {
    const ownership = await this.prisma.gameOwnership.findFirst({
      where: { id: ownershipId, entry: { userId } },
    });
    if (!ownership) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'OWNERSHIP_NOT_FOUND',
        message: 'Possession introuvable.',
      });
    }
    return ownership;
  }
}

function mapOwnership(ownership: GameOwnership): OwnershipDetail {
  return {
    id: ownership.id,
    platform: ownership.platform,
    status: ownership.status,
    hoursPlayed: ownership.hoursPlayed,
    progressPercent: ownership.progressPercent,
    nextObjective: ownership.nextObjective,
    resumeNote: ownership.resumeNote,
    purchaseDate: toDateOnly(ownership.purchaseDate),
    startedAt: toDateOnly(ownership.startedAt),
    finishedAt: toDateOnly(ownership.finishedAt),
    lastPlayedAt: toDateOnly(ownership.lastPlayedAt),
    trophiesEarned: ownership.trophiesEarned,
    trophiesTotal: ownership.trophiesTotal,
    completionTarget: ownership.completionTarget,
  };
}
