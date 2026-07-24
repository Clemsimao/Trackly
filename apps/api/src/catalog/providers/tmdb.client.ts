import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FilmDetail, SearchResultItem, SeriesDetail } from '@trackly/contracts';
import { fetchExternal, waitBeforeRetry } from '../../common/http';
import {
  NotFoundInProviderError,
  ProviderNotConfiguredError,
  ProviderRequestError,
} from '../provider.errors';
import {
  mapMovieDetail,
  mapMovieSearchResult,
  mapSeasonEpisodes,
  mapTvDetail,
  mapTvSearchResult,
  type ProviderEpisode,
  type TmdbMovieDetail,
  type TmdbSearchMovie,
  type TmdbSearchTv,
  type TmdbSeasonDetail,
  type TmdbTvDetail,
} from './tmdb.mappers';

const BASE_URL = 'https://api.themoviedb.org/3';

/** Client TMDB (films + séries), données en français (docs/cadrage/05). */
@Injectable()
export class TmdbClient {
  private readonly logger = new Logger(TmdbClient.name);

  constructor(private readonly config: ConfigService) {}

  get isConfigured(): boolean {
    return Boolean(this.config.get<string>('TMDB_API_TOKEN'));
  }

  async searchFilms(query: string): Promise<SearchResultItem[]> {
    const data = await this.get<{ results: TmdbSearchMovie[] }>('/search/movie', {
      query,
      include_adult: 'false',
    });
    return data.results.slice(0, 10).map(mapMovieSearchResult);
  }

  async searchSeries(query: string): Promise<SearchResultItem[]> {
    const data = await this.get<{ results: TmdbSearchTv[] }>('/search/tv', {
      query,
      include_adult: 'false',
    });
    return data.results.slice(0, 10).map(mapTvSearchResult);
  }

  async getFilm(externalId: string): Promise<FilmDetail> {
    const data = await this.get<TmdbMovieDetail>(`/movie/${encodeURIComponent(externalId)}`, {});
    return mapMovieDetail(data);
  }

  async getSeries(externalId: string): Promise<SeriesDetail> {
    const data = await this.get<TmdbTvDetail>(`/tv/${encodeURIComponent(externalId)}`, {});
    return mapTvDetail(data);
  }

  /** Épisodes d'une saison, avec runtime par épisode (Lot 3 — suivi et budget temps). */
  async getSeasonEpisodes(externalId: string, seasonNumber: number): Promise<ProviderEpisode[]> {
    const data = await this.get<TmdbSeasonDetail>(
      `/tv/${encodeURIComponent(externalId)}/season/${seasonNumber}`,
      {},
    );
    return mapSeasonEpisodes(data);
  }

  private async get<T>(path: string, params: Record<string, string>): Promise<T> {
    const token = this.config.get<string>('TMDB_API_TOKEN');
    if (!token) throw new ProviderNotConfiguredError('tmdb');

    const url = new URL(`${BASE_URL}${path}`);
    url.searchParams.set('language', 'fr-FR');
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

    const response = await fetchExternal(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (response.status === 404) throw new NotFoundInProviderError('tmdb', path);
    if (response.status === 429) {
      // Back-off unique puis nouvel essai (docs/cadrage/05 : respecter le 429)
      this.logger.warn('TMDB 429 — nouvel essai borné');
      await waitBeforeRetry(response, 0);
      const retry = await fetchExternal(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!retry.ok) throw new ProviderRequestError('tmdb', retry.status);
      return (await retry.json()) as T;
    }
    if (!response.ok) throw new ProviderRequestError('tmdb', response.status);
    return (await response.json()) as T;
  }
}
