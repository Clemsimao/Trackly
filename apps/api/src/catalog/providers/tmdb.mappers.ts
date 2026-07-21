import type { FilmDetail, SearchResultItem, SeasonSummary, SeriesDetail } from '@trackly/contracts';

/**
 * Mappers purs TMDB → formes normalisées du contrat.
 * Les types d'entrée reflètent les champs réellement consommés (contrat implicite,
 * verrouillé par les tests sur fixtures — docs/cadrage/14).
 */

const IMG = 'https://image.tmdb.org/t/p';

export function posterUrl(path: string | null | undefined): string | null {
  return path ? `${IMG}/w342${path}` : null;
}

export function backdropUrl(path: string | null | undefined): string | null {
  return path ? `${IMG}/w1280${path}` : null;
}

function yearOf(date: string | null | undefined): number | null {
  if (!date) return null;
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function emptyToNull(text: string | null | undefined): string | null {
  return text ? text : null;
}

export interface TmdbSearchMovie {
  id: number;
  title: string;
  release_date?: string | null;
  poster_path?: string | null;
}

export function mapMovieSearchResult(movie: TmdbSearchMovie): SearchResultItem {
  return {
    mediaType: 'film',
    externalId: String(movie.id),
    title: movie.title,
    year: yearOf(movie.release_date),
    posterUrl: posterUrl(movie.poster_path),
  };
}

export interface TmdbSearchTv {
  id: number;
  name: string;
  first_air_date?: string | null;
  poster_path?: string | null;
}

export function mapTvSearchResult(tv: TmdbSearchTv): SearchResultItem {
  return {
    mediaType: 'series',
    externalId: String(tv.id),
    title: tv.name,
    year: yearOf(tv.first_air_date),
    posterUrl: posterUrl(tv.poster_path),
  };
}

export interface TmdbMovieDetail {
  id: number;
  title: string;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string | null;
  runtime?: number | null;
  genres?: Array<{ name: string }>;
  vote_average?: number | null;
}

export function mapMovieDetail(movie: TmdbMovieDetail): FilmDetail {
  return {
    mediaType: 'film',
    externalId: String(movie.id),
    title: movie.title,
    overview: emptyToNull(movie.overview),
    posterUrl: posterUrl(movie.poster_path),
    backdropUrl: backdropUrl(movie.backdrop_path),
    releaseDate: emptyToNull(movie.release_date),
    runtimeMinutes: movie.runtime ?? null,
    genres: (movie.genres ?? []).map((g) => g.name),
    rating: movie.vote_average ?? null,
  };
}

export interface TmdbTvDetail {
  id: number;
  name: string;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  first_air_date?: string | null;
  status?: string | null;
  episode_run_time?: number[];
  genres?: Array<{ name: string }>;
  vote_average?: number | null;
  seasons?: Array<{
    season_number: number;
    name: string;
    episode_count: number;
    air_date?: string | null;
  }>;
}

export function mapTvDetail(tv: TmdbTvDetail): SeriesDetail {
  const seasons: SeasonSummary[] = (tv.seasons ?? [])
    // La saison 0 (« spéciaux ») fausserait le budget temps : exclue du suivi
    .filter((season) => season.season_number > 0)
    .map((season) => ({
      seasonNumber: season.season_number,
      name: season.name,
      episodeCount: season.episode_count,
      airDate: season.air_date ?? null,
    }));

  const runtimes = tv.episode_run_time ?? [];
  const episodeRunTime =
    runtimes.length > 0 ? Math.round(runtimes.reduce((a, b) => a + b, 0) / runtimes.length) : null;

  return {
    mediaType: 'series',
    externalId: String(tv.id),
    title: tv.name,
    overview: emptyToNull(tv.overview),
    posterUrl: posterUrl(tv.poster_path),
    backdropUrl: backdropUrl(tv.backdrop_path),
    firstAirDate: emptyToNull(tv.first_air_date),
    status: tv.status ?? null,
    genres: (tv.genres ?? []).map((g) => g.name),
    episodeRunTimeMinutes: episodeRunTime,
    seasons,
    rating: tv.vote_average ?? null,
  };
}
