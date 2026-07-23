import {
  bookDetailSchema,
  filmDetailSchema,
  gameDetailSchema,
  searchResponseSchema,
  seriesDetailSchema,
  type BookDetail,
  type FilmDetail,
  type GameDetail,
  type MediaType,
  type SearchResponse,
  type SeriesDetail,
} from '@trackly/contracts';
import { apiFetch } from './client';

export async function searchCatalog(query: string, type?: MediaType): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (type) params.set('type', type);
  const data = await apiFetch<unknown>(`/api/catalog/search?${params}`);
  return searchResponseSchema.parse(data);
}

export async function getGameDetail(id: string): Promise<GameDetail> {
  return gameDetailSchema.parse(await apiFetch<unknown>(`/api/catalog/games/${id}`));
}

export async function getFilmDetail(id: string): Promise<FilmDetail> {
  return filmDetailSchema.parse(await apiFetch<unknown>(`/api/catalog/films/${id}`));
}

export async function getSeriesDetail(id: string): Promise<SeriesDetail> {
  return seriesDetailSchema.parse(await apiFetch<unknown>(`/api/catalog/series/${id}`));
}

export async function getBookDetail(id: string): Promise<BookDetail> {
  return bookDetailSchema.parse(await apiFetch<unknown>(`/api/catalog/books/${id}`));
}
