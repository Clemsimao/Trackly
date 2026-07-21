import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { FilmEntry } from '@prisma/client';
import type {
  AddedResponse,
  FilmDetail,
  FilmEntryDetail,
  FilmStatus,
  UpdateFilmEntryBody,
} from '@trackly/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { fromDateOnly, toDateOnly, todayDateOnly } from './serialize';
import { WorksService } from './works.service';

@Injectable()
export class LibraryFilmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly works: WorksService,
  ) {}

  async add(userId: string, input: { tmdbId: string; status: string }): Promise<AddedResponse> {
    const work = await this.works.ensureFilmWork(input.tmdbId);
    const existing = await this.prisma.filmEntry.findUnique({
      where: { userId_filmWorkId: { userId, filmWorkId: work.id } },
    });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        code: 'ALREADY_IN_LIBRARY',
        message: 'Déjà dans ta bibliothèque.',
        entryId: existing.id,
      });
    }
    const entry = await this.prisma.filmEntry.create({
      data: {
        userId,
        filmWorkId: work.id,
        status: input.status as FilmStatus,
        watchedAt: input.status === 'SEEN' ? todayDateOnly() : null,
      },
    });
    return { entryId: entry.id };
  }

  async getDetail(userId: string, entryId: string): Promise<FilmEntryDetail> {
    const entry = await this.findEntry(userId, entryId);
    const work = await this.prisma.filmWork.findUniqueOrThrow({
      where: { id: entry.filmWorkId },
    });
    return {
      entryId: entry.id,
      work: work.payload as unknown as FilmDetail,
      status: entry.status,
      favorite: entry.favorite,
      rating: entry.rating,
      review: entry.review,
      notes: entry.notes,
      watchedAt: toDateOnly(entry.watchedAt),
      rewatch: entry.rewatch,
      watchedWith: entry.watchedWith,
    };
  }

  async updateEntry(userId: string, entryId: string, body: UpdateFilmEntryBody): Promise<void> {
    const entry = await this.findEntry(userId, entryId);
    const data: Record<string, unknown> = {
      ...body,
      status: body.status as FilmStatus | undefined,
      watchedAt: fromDateOnly(body.watchedAt),
    };
    // Marquer « vu » sans date : aujourd'hui par défaut (story E1)
    if (body.status === 'SEEN' && !entry.watchedAt && body.watchedAt === undefined) {
      data.watchedAt = todayDateOnly();
    }
    await this.prisma.filmEntry.update({ where: { id: entryId }, data });
  }

  async deleteEntry(userId: string, entryId: string): Promise<void> {
    await this.findEntry(userId, entryId);
    await this.prisma.filmEntry.delete({ where: { id: entryId } });
  }

  private async findEntry(userId: string, entryId: string): Promise<FilmEntry> {
    const entry = await this.prisma.filmEntry.findFirst({ where: { id: entryId, userId } });
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
