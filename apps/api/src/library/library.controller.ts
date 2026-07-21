import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { z } from 'zod';
import {
  addFilmBodySchema,
  addGameBodySchema,
  addOwnershipBodySchema,
  addSeriesBodySchema,
  updateDurationsBodySchema,
  updateFilmEntryBodySchema,
  updateGameEntryBodySchema,
  updateOwnershipBodySchema,
  updateSeriesEntryBodySchema,
} from '@trackly/contracts';
import type {
  AddedResponse,
  FilmEntryDetail,
  GameEntryDetail,
  LibraryResponse,
  SeasonEpisodesResponse,
  SeriesEntryDetail,
} from '@trackly/contracts';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  NotFoundInProviderError,
  ProviderNotConfiguredError,
  ProviderRequestError,
} from '../catalog/provider.errors';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { LibraryFilmsService } from './library-films.service';
import { LibraryGamesService } from './library-games.service';
import { LibrarySeriesService } from './library-series.service';
import { LibraryService } from './library.service';

/** Bibliothèque personnelle — toutes les routes exigent une session (guard global). */
@Controller('library')
export class LibraryController {
  constructor(
    private readonly library: LibraryService,
    private readonly games: LibraryGamesService,
    private readonly series: LibrarySeriesService,
    private readonly films: LibraryFilmsService,
  ) {}

  @Get()
  getLibrary(@CurrentUser() user: User): Promise<LibraryResponse> {
    return this.library.getLibrary(user.id);
  }

  // ── Jeux ──────────────────────────────────────────────────────────────────

  @Post('games')
  addGame(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(addGameBodySchema)) body: z.output<typeof addGameBodySchema>,
  ): Promise<AddedResponse> {
    return this.wrapProvider(() => this.games.add(user.id, body));
  }

  @Get('games/:entryId')
  getGame(@CurrentUser() user: User, @Param('entryId') entryId: string): Promise<GameEntryDetail> {
    return this.games.getDetail(user.id, entryId);
  }

  @Patch('games/:entryId')
  @HttpCode(204)
  async updateGame(
    @CurrentUser() user: User,
    @Param('entryId') entryId: string,
    @Body(new ZodValidationPipe(updateGameEntryBodySchema))
    body: z.output<typeof updateGameEntryBodySchema>,
  ): Promise<void> {
    await this.games.updateEntry(user.id, entryId, body);
  }

  @Delete('games/:entryId')
  @HttpCode(204)
  async deleteGame(@CurrentUser() user: User, @Param('entryId') entryId: string): Promise<void> {
    await this.games.deleteEntry(user.id, entryId);
  }

  @Put('games/:entryId/durations')
  @HttpCode(204)
  async updateDurations(
    @CurrentUser() user: User,
    @Param('entryId') entryId: string,
    @Body(new ZodValidationPipe(updateDurationsBodySchema))
    body: z.output<typeof updateDurationsBodySchema>,
  ): Promise<void> {
    await this.games.updateDurations(user.id, entryId, body);
  }

  @Post('games/:entryId/ownerships')
  @HttpCode(204)
  async addOwnership(
    @CurrentUser() user: User,
    @Param('entryId') entryId: string,
    @Body(new ZodValidationPipe(addOwnershipBodySchema))
    body: z.output<typeof addOwnershipBodySchema>,
  ): Promise<void> {
    await this.games.addOwnership(user.id, entryId, body);
  }

  @Patch('games/ownerships/:ownershipId')
  @HttpCode(204)
  async updateOwnership(
    @CurrentUser() user: User,
    @Param('ownershipId') ownershipId: string,
    @Body(new ZodValidationPipe(updateOwnershipBodySchema))
    body: z.output<typeof updateOwnershipBodySchema>,
  ): Promise<void> {
    await this.games.updateOwnership(user.id, ownershipId, body);
  }

  @Delete('games/ownerships/:ownershipId')
  @HttpCode(204)
  async deleteOwnership(
    @CurrentUser() user: User,
    @Param('ownershipId') ownershipId: string,
  ): Promise<void> {
    await this.games.deleteOwnership(user.id, ownershipId);
  }

  // ── Séries ────────────────────────────────────────────────────────────────

  @Post('series')
  addSeries(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(addSeriesBodySchema)) body: z.output<typeof addSeriesBodySchema>,
  ): Promise<AddedResponse> {
    return this.wrapProvider(() => this.series.add(user.id, body));
  }

  @Get('series/:entryId')
  getSeries(
    @CurrentUser() user: User,
    @Param('entryId') entryId: string,
  ): Promise<SeriesEntryDetail> {
    return this.series.getDetail(user.id, entryId);
  }

  @Patch('series/:entryId')
  @HttpCode(204)
  async updateSeries(
    @CurrentUser() user: User,
    @Param('entryId') entryId: string,
    @Body(new ZodValidationPipe(updateSeriesEntryBodySchema))
    body: z.output<typeof updateSeriesEntryBodySchema>,
  ): Promise<void> {
    await this.series.updateEntry(user.id, entryId, body);
  }

  @Delete('series/:entryId')
  @HttpCode(204)
  async deleteSeries(@CurrentUser() user: User, @Param('entryId') entryId: string): Promise<void> {
    await this.series.deleteEntry(user.id, entryId);
  }

  @Get('series/:entryId/seasons/:seasonNumber/episodes')
  listSeasonEpisodes(
    @CurrentUser() user: User,
    @Param('entryId') entryId: string,
    @Param('seasonNumber', ParseIntPipe) seasonNumber: number,
  ): Promise<SeasonEpisodesResponse> {
    return this.wrapProvider(() => this.series.listSeasonEpisodes(user.id, entryId, seasonNumber));
  }

  @Post('series/:entryId/episodes/:episodeId/watch')
  @HttpCode(204)
  async markEpisode(
    @CurrentUser() user: User,
    @Param('entryId') entryId: string,
    @Param('episodeId') episodeId: string,
  ): Promise<void> {
    await this.series.markEpisode(user.id, entryId, episodeId);
  }

  @Delete('series/:entryId/episodes/:episodeId/watch')
  @HttpCode(204)
  async unmarkEpisode(
    @CurrentUser() user: User,
    @Param('entryId') entryId: string,
    @Param('episodeId') episodeId: string,
  ): Promise<void> {
    await this.series.unmarkEpisode(user.id, entryId, episodeId);
  }

  @Post('series/:entryId/seasons/:seasonNumber/watch')
  @HttpCode(204)
  async markSeason(
    @CurrentUser() user: User,
    @Param('entryId') entryId: string,
    @Param('seasonNumber', ParseIntPipe) seasonNumber: number,
  ): Promise<void> {
    await this.wrapProvider(() => this.series.markSeason(user.id, entryId, seasonNumber));
  }

  @Delete('series/:entryId/seasons/:seasonNumber/watch')
  @HttpCode(204)
  async unmarkSeason(
    @CurrentUser() user: User,
    @Param('entryId') entryId: string,
    @Param('seasonNumber', ParseIntPipe) seasonNumber: number,
  ): Promise<void> {
    await this.series.unmarkSeason(user.id, entryId, seasonNumber);
  }

  // ── Films ─────────────────────────────────────────────────────────────────

  @Post('films')
  addFilm(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(addFilmBodySchema)) body: z.output<typeof addFilmBodySchema>,
  ): Promise<AddedResponse> {
    return this.wrapProvider(() => this.films.add(user.id, body));
  }

  @Get('films/:entryId')
  getFilm(@CurrentUser() user: User, @Param('entryId') entryId: string): Promise<FilmEntryDetail> {
    return this.films.getDetail(user.id, entryId);
  }

  @Patch('films/:entryId')
  @HttpCode(204)
  async updateFilm(
    @CurrentUser() user: User,
    @Param('entryId') entryId: string,
    @Body(new ZodValidationPipe(updateFilmEntryBodySchema))
    body: z.output<typeof updateFilmEntryBodySchema>,
  ): Promise<void> {
    await this.films.updateEntry(user.id, entryId, body);
  }

  @Delete('films/:entryId')
  @HttpCode(204)
  async deleteFilm(@CurrentUser() user: User, @Param('entryId') entryId: string): Promise<void> {
    await this.films.deleteEntry(user.id, entryId);
  }

  /** Les ajouts passent par les fournisseurs : mêmes traductions HTTP qu'au catalogue. */
  private async wrapProvider<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof NotFoundInProviderError) {
        throw new NotFoundException({
          statusCode: 404,
          code: 'MEDIA_NOT_FOUND',
          message: 'Contenu introuvable.',
        });
      }
      if (error instanceof ProviderNotConfiguredError) {
        throw new ServiceUnavailableException({
          statusCode: 503,
          code: 'PROVIDER_NOT_CONFIGURED',
          message: `Source ${error.provider} non configurée sur le serveur.`,
        });
      }
      if (error instanceof ProviderRequestError) {
        throw new ServiceUnavailableException({
          statusCode: 503,
          code: 'PROVIDER_UNAVAILABLE',
          message: 'Source externe momentanément indisponible. Réessaie dans un instant.',
        });
      }
      // Les 409/404 métier (doublon, entrée introuvable…) remontent tels quels
      if (error instanceof HttpException) throw error;
      throw error;
    }
  }
}
