import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { BookEntry, Prisma } from '@prisma/client';
import type {
  AddedResponse,
  BookDetail,
  BookEntryDetail,
  BookStatus,
  UpdateBookEntryBody,
} from '@trackly/contracts';
import { bookRemainingSeconds, readingSpeed, type ReadingSession } from '@trackly/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { fromDateOnly, toDateOnly, todayDateOnly } from './serialize';
import { WorksService } from './works.service';

@Injectable()
export class LibraryBooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly works: WorksService,
  ) {}

  async add(userId: string, input: { olWorkId: string; status: string }): Promise<AddedResponse> {
    const work = await this.works.ensureBookWork(input.olWorkId);
    const existing = await this.prisma.bookEntry.findUnique({
      where: { userId_bookWorkId: { userId, bookWorkId: work.id } },
    });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        code: 'ALREADY_IN_LIBRARY',
        message: 'Déjà dans ta bibliothèque.',
        entryId: existing.id,
      });
    }
    const detail = work.payload as unknown as BookDetail;
    const entry = await this.prisma.bookEntry.create({
      data: {
        userId,
        bookWorkId: work.id,
        status: input.status as BookStatus,
        // Décision docs/cadrage/17 : la médiane OL préremplit MON édition (provenance auto)
        pagesTotal: detail.medianPages,
        pagesSource: 'auto',
        editionIsbn: detail.isbn13,
        startedAt: input.status === 'READING' ? todayDateOnly() : null,
        finishedAt: input.status === 'FINISHED' ? todayDateOnly() : null,
      },
    });
    return { entryId: entry.id };
  }

  async getDetail(userId: string, entryId: string): Promise<BookEntryDetail> {
    const entry = await this.findEntry(userId, entryId);
    const [work, journal, pagesPerHour] = await Promise.all([
      this.prisma.bookWork.findUniqueOrThrow({ where: { id: entry.bookWorkId } }),
      this.prisma.bookProgressUpdate.findMany({
        where: { entryId: entry.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      this.userPagesPerHour(userId),
    ]);
    const remaining = bookRemainingSeconds(
      {
        status: entry.status,
        pagesTotal: entry.pagesTotal,
        currentPage: entry.currentPage,
        progressPercent: entry.progressPercent,
      },
      pagesPerHour,
    );
    return {
      entryId: entry.id,
      work: work.payload as unknown as BookDetail,
      status: entry.status,
      favorite: entry.favorite,
      rating: entry.rating,
      review: entry.review,
      notes: entry.notes,
      pagesTotal: entry.pagesTotal,
      pagesSource: entry.pagesSource === 'manual' ? 'manual' : 'auto',
      editionIsbn: entry.editionIsbn,
      currentPage: entry.currentPage,
      progressPercent: entry.progressPercent,
      resumeNote: entry.resumeNote,
      startedAt: toDateOnly(entry.startedAt),
      finishedAt: toDateOnly(entry.finishedAt),
      pagesPerHour,
      remainingSeconds: remaining,
      estimated: pagesPerHour == null,
      journal: journal.map((update) => ({
        id: update.id,
        createdAt: update.createdAt.toISOString(),
        currentPage: update.currentPage,
        progressPercent: update.progressPercent,
        minutesRead: update.minutesRead,
        note: update.note,
      })),
    };
  }

  async updateEntry(userId: string, entryId: string, body: UpdateBookEntryBody): Promise<void> {
    const entry = await this.findEntry(userId, entryId);
    const { journalNote, minutesRead, ...fields } = body;
    const data: Prisma.BookEntryUpdateInput = {
      ...fields,
      status: body.status as BookStatus | undefined,
      startedAt: fromDateOnly(body.startedAt),
      finishedAt: fromDateOnly(body.finishedAt),
    };

    // Pages de MON édition : null = revenir à la médiane OL (provenance auto)
    if (body.pagesTotal !== undefined) {
      if (body.pagesTotal === null) {
        const work = await this.prisma.bookWork.findUniqueOrThrow({
          where: { id: entry.bookWorkId },
        });
        data.pagesTotal = (work.payload as unknown as BookDetail).medianPages;
        data.pagesSource = 'auto';
      } else {
        data.pagesSource = 'manual';
      }
    }

    // Dates par défaut aux transitions de statut (miroir des films, story E1)
    if (body.status === 'READING' && !entry.startedAt && body.startedAt === undefined) {
      data.startedAt = todayDateOnly();
    }
    if (body.status === 'FINISHED') {
      if (!entry.finishedAt && body.finishedAt === undefined) data.finishedAt = todayDateOnly();
      // Terminer aligne la progression (le temps restant passe à 0 par le statut)
      if (body.currentPage === undefined && entry.pagesTotal != null) {
        data.currentPage = entry.pagesTotal;
      }
    }

    await this.prisma.bookEntry.update({ where: { id: entryId }, data });

    // Journal (story C2 transposée) : une ligne dès qu'une progression est saisie
    if (
      body.currentPage !== undefined ||
      body.progressPercent !== undefined ||
      minutesRead !== undefined ||
      journalNote !== undefined
    ) {
      await this.prisma.bookProgressUpdate.create({
        data: {
          entryId: entry.id,
          currentPage: body.currentPage ?? null,
          progressPercent: body.progressPercent ?? null,
          minutesRead: minutesRead ?? null,
          note: journalNote ?? null,
        },
      });
    }
  }

  async deleteEntry(userId: string, entryId: string): Promise<void> {
    await this.findEntry(userId, entryId);
    await this.prisma.bookEntry.delete({ where: { id: entryId } });
  }

  /**
   * Vitesse de lecture personnelle, tous livres confondus : Δpages entre mises à
   * jour consécutives d'une même entrée, sommées sur les sessions horodatées
   * (fenêtre des 30 dernières). Délègue le calcul au module pur.
   */
  async userPagesPerHour(userId: string): Promise<number | null> {
    const updates = await this.prisma.bookProgressUpdate.findMany({
      where: { entry: { userId }, minutesRead: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { entryId: true, currentPage: true, minutesRead: true, createdAt: true },
    });
    if (updates.length === 0) return null;

    const sessions: ReadingSession[] = [];
    for (const update of updates) {
      if (update.currentPage == null || update.minutesRead == null) continue;
      const previous = await this.prisma.bookProgressUpdate.findFirst({
        where: {
          entryId: update.entryId,
          createdAt: { lt: update.createdAt },
          currentPage: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        select: { currentPage: true },
      });
      sessions.push({
        deltaPages: update.currentPage - (previous?.currentPage ?? 0),
        minutesRead: update.minutesRead,
      });
    }
    return readingSpeed(sessions);
  }

  private async findEntry(userId: string, entryId: string): Promise<BookEntry> {
    const entry = await this.prisma.bookEntry.findFirst({ where: { id: entryId, userId } });
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
