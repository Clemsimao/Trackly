import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { LibraryBooksService } from './library-books.service';
import { LibraryFilmsService } from './library-films.service';
import { LibraryGamesService } from './library-games.service';
import { LibrarySeriesService } from './library-series.service';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { OverridesService } from './overrides.service';
import { WorksService } from './works.service';

@Module({
  imports: [CatalogModule],
  controllers: [LibraryController],
  providers: [
    LibraryService,
    LibraryGamesService,
    LibrarySeriesService,
    LibraryFilmsService,
    LibraryBooksService,
    WorksService,
    OverridesService,
  ],
  /** La vitesse de lecture calibrée sert aussi au tableau de bord (budget temps). */
  exports: [LibraryBooksService],
})
export class LibraryModule {}
