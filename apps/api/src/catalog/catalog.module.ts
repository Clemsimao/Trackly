import { Module } from '@nestjs/common';
import { CatalogCacheService } from './catalog-cache.service';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { IgdbClient } from './providers/igdb.client';
import { OpenLibraryClient } from './providers/openlibrary.client';
import { TmdbClient } from './providers/tmdb.client';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, CatalogCacheService, TmdbClient, IgdbClient, OpenLibraryClient],
  exports: [CatalogService],
})
export class CatalogModule {}
