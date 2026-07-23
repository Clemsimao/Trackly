import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  BookDetail,
  FilmDetail,
  GameDetail,
  MediaType,
  SearchResponse,
  SeriesDetail,
} from '@trackly/contracts';
import { mediaTypeSchema } from '@trackly/contracts';
import { NotFoundInProviderError, ProviderNotConfiguredError } from './provider.errors';
import { CatalogService } from './catalog.service';

/** Routes protégées par défaut (session requise) : nos quotas fournisseurs le sont aussi. */
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('search')
  async search(@Query('q') q?: string, @Query('type') type?: string): Promise<SearchResponse> {
    const query = (q ?? '').trim();
    if (query.length < 2) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'QUERY_TOO_SHORT',
        message: 'Saisis au moins 2 caractères.',
      });
    }
    let mediaType: MediaType | undefined;
    if (type) {
      const parsed = mediaTypeSchema.safeParse(type);
      if (!parsed.success) {
        throw new BadRequestException({
          statusCode: 400,
          code: 'INVALID_MEDIA_TYPE',
          message: 'Type de média inconnu.',
        });
      }
      mediaType = parsed.data;
    }
    return this.catalog.search(query, mediaType);
  }

  @Get('games/:id')
  getGame(@Param('id') id: string): Promise<GameDetail> {
    return this.wrap(() => this.catalog.getGame(id));
  }

  @Get('films/:id')
  getFilm(@Param('id') id: string): Promise<FilmDetail> {
    return this.wrap(() => this.catalog.getFilm(id));
  }

  @Get('series/:id')
  getSeries(@Param('id') id: string): Promise<SeriesDetail> {
    return this.wrap(() => this.catalog.getSeries(id));
  }

  @Get('books/:id')
  getBook(@Param('id') id: string): Promise<BookDetail> {
    return this.wrap(() => this.catalog.getBook(id));
  }

  /** Traduit les erreurs de la couche fournisseurs en réponses HTTP normalisées. */
  private async wrap<T>(fn: () => Promise<T>): Promise<T> {
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
      throw new ServiceUnavailableException({
        statusCode: 503,
        code: 'PROVIDER_UNAVAILABLE',
        message: 'Source externe momentanément indisponible. Réessaie dans un instant.',
      });
    }
  }
}
