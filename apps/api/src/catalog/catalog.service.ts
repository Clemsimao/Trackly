import { Injectable, Logger } from '@nestjs/common';
import type {
  FilmDetail,
  GameDetail,
  MediaType,
  SearchResponse,
  SearchResultItem,
  SeriesDetail,
} from '@trackly/contracts';
import { CatalogCacheService } from './catalog-cache.service';
import { IgdbClient } from './providers/igdb.client';
import { TmdbClient } from './providers/tmdb.client';

const HOUR_MS = 60 * 60 * 1000;
const SEARCH_TTL_MS = 24 * HOUR_MS;
/** Fiches : 7 jours — bien en deçà des 6 mois maximum autorisés par TMDB. */
const DETAIL_TTL_MS = 7 * 24 * HOUR_MS;

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    private readonly cache: CatalogCacheService,
    private readonly tmdb: TmdbClient,
    private readonly igdb: IgdbClient,
  ) {}

  /** Recherche fusionnée multi-fournisseurs, tolérante aux pannes partielles. */
  async search(rawQuery: string, type?: MediaType): Promise<SearchResponse> {
    const query = rawQuery.trim();
    const normalized = query.toLowerCase();
    const wanted = (t: MediaType) => !type || type === t;
    const degraded: MediaType[] = [];

    const tasks: Array<Promise<SearchResultItem[]>> = [];
    const taskTypes: MediaType[] = [];

    if (wanted('game')) {
      tasks.push(
        this.cache.getOrFetch(`search:game:${normalized}`, SEARCH_TTL_MS, () =>
          this.igdb.searchGames(query),
        ),
      );
      taskTypes.push('game');
    }
    if (wanted('film')) {
      tasks.push(
        this.cache.getOrFetch(`search:film:${normalized}`, SEARCH_TTL_MS, () =>
          this.tmdb.searchFilms(query),
        ),
      );
      taskTypes.push('film');
    }
    if (wanted('series')) {
      tasks.push(
        this.cache.getOrFetch(`search:series:${normalized}`, SEARCH_TTL_MS, () =>
          this.tmdb.searchSeries(query),
        ),
      );
      taskTypes.push('series');
    }

    const settled = await Promise.allSettled(tasks);
    const results: SearchResultItem[] = [];
    settled.forEach((outcome, index) => {
      if (outcome.status === 'fulfilled') {
        results.push(...outcome.value);
      } else {
        // Panne ou fournisseur non configuré : résultats partiels plutôt que rien
        degraded.push(taskTypes[index] as MediaType);
        this.logger.warn(`Recherche ${taskTypes[index]} en échec : ${String(outcome.reason)}`);
      }
    });

    // Entrelace les types (jeu, film, série, jeu…) pour une liste équilibrée
    return { query, results: interleaveByType(results), degraded };
  }

  getGame(externalId: string): Promise<GameDetail> {
    return this.cache.getOrFetch(`game:${externalId}`, DETAIL_TTL_MS, () =>
      this.igdb.getGame(externalId),
    );
  }

  getFilm(externalId: string): Promise<FilmDetail> {
    return this.cache.getOrFetch(`film:${externalId}`, DETAIL_TTL_MS, () =>
      this.tmdb.getFilm(externalId),
    );
  }

  getSeries(externalId: string): Promise<SeriesDetail> {
    return this.cache.getOrFetch(`series:${externalId}`, DETAIL_TTL_MS, () =>
      this.tmdb.getSeries(externalId),
    );
  }

  /** Sans cache applicatif : les épisodes sont persistés en EpisodeRecord (Lot 3). */
  getSeasonEpisodes(externalId: string, seasonNumber: number) {
    return this.tmdb.getSeasonEpisodes(externalId, seasonNumber);
  }
}

export function interleaveByType(items: SearchResultItem[]): SearchResultItem[] {
  const buckets = new Map<string, SearchResultItem[]>();
  for (const item of items) {
    const bucket = buckets.get(item.mediaType) ?? [];
    bucket.push(item);
    buckets.set(item.mediaType, bucket);
  }
  const lists = [...buckets.values()];
  const output: SearchResultItem[] = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      const item = list[i];
      if (item) output.push(item);
    }
  }
  return output;
}
