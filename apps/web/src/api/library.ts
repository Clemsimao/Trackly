import {
  addedResponseSchema,
  filmEntryDetailSchema,
  gameEntryDetailSchema,
  libraryResponseSchema,
  seasonEpisodesResponseSchema,
  seriesEntryDetailSchema,
  type AddedResponse,
  type AddFilmBody,
  type AddGameBody,
  type AddOwnershipBody,
  type AddSeriesBody,
  type FilmEntryDetail,
  type GameEntryDetail,
  type LibraryResponse,
  type SeasonEpisodesResponse,
  type SeriesEntryDetail,
  type UpdateDurationsBody,
  type UpdateFilmEntryBody,
  type UpdateGameEntryBody,
  type UpdateOwnershipBody,
  type UpdateSeriesEntryBody,
} from '@trackly/contracts';
import { apiFetch } from './client';

const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });
const patch = (body: unknown): RequestInit => ({ method: 'PATCH', body: JSON.stringify(body) });

export async function getLibrary(): Promise<LibraryResponse> {
  return libraryResponseSchema.parse(await apiFetch<unknown>('/api/library'));
}

// ── Jeux ────────────────────────────────────────────────────────────────────

export async function addGame(body: AddGameBody): Promise<AddedResponse> {
  return addedResponseSchema.parse(await apiFetch<unknown>('/api/library/games', json(body)));
}

export async function getGameEntry(entryId: string): Promise<GameEntryDetail> {
  return gameEntryDetailSchema.parse(await apiFetch<unknown>(`/api/library/games/${entryId}`));
}

export function updateGameEntry(entryId: string, body: UpdateGameEntryBody): Promise<void> {
  return apiFetch<void>(`/api/library/games/${entryId}`, patch(body));
}

export function deleteGameEntry(entryId: string): Promise<void> {
  return apiFetch<void>(`/api/library/games/${entryId}`, { method: 'DELETE' });
}

export function updateDurations(entryId: string, body: UpdateDurationsBody): Promise<void> {
  return apiFetch<void>(`/api/library/games/${entryId}/durations`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function addOwnership(entryId: string, body: AddOwnershipBody): Promise<void> {
  return apiFetch<void>(`/api/library/games/${entryId}/ownerships`, json(body));
}

export function updateOwnership(ownershipId: string, body: UpdateOwnershipBody): Promise<void> {
  return apiFetch<void>(`/api/library/games/ownerships/${ownershipId}`, patch(body));
}

export function deleteOwnership(ownershipId: string): Promise<void> {
  return apiFetch<void>(`/api/library/games/ownerships/${ownershipId}`, { method: 'DELETE' });
}

// ── Séries ──────────────────────────────────────────────────────────────────

export async function addSeries(body: AddSeriesBody): Promise<AddedResponse> {
  return addedResponseSchema.parse(await apiFetch<unknown>('/api/library/series', json(body)));
}

export async function getSeriesEntry(entryId: string): Promise<SeriesEntryDetail> {
  return seriesEntryDetailSchema.parse(await apiFetch<unknown>(`/api/library/series/${entryId}`));
}

export function updateSeriesEntry(entryId: string, body: UpdateSeriesEntryBody): Promise<void> {
  return apiFetch<void>(`/api/library/series/${entryId}`, patch(body));
}

export function deleteSeriesEntry(entryId: string): Promise<void> {
  return apiFetch<void>(`/api/library/series/${entryId}`, { method: 'DELETE' });
}

export async function getSeasonEpisodes(
  entryId: string,
  seasonNumber: number,
): Promise<SeasonEpisodesResponse> {
  return seasonEpisodesResponseSchema.parse(
    await apiFetch<unknown>(`/api/library/series/${entryId}/seasons/${seasonNumber}/episodes`),
  );
}

export function markEpisode(entryId: string, episodeId: string): Promise<void> {
  return apiFetch<void>(`/api/library/series/${entryId}/episodes/${episodeId}/watch`, {
    method: 'POST',
  });
}

export function unmarkEpisode(entryId: string, episodeId: string): Promise<void> {
  return apiFetch<void>(`/api/library/series/${entryId}/episodes/${episodeId}/watch`, {
    method: 'DELETE',
  });
}

export function markSeason(entryId: string, seasonNumber: number): Promise<void> {
  return apiFetch<void>(`/api/library/series/${entryId}/seasons/${seasonNumber}/watch`, {
    method: 'POST',
  });
}

export function unmarkSeason(entryId: string, seasonNumber: number): Promise<void> {
  return apiFetch<void>(`/api/library/series/${entryId}/seasons/${seasonNumber}/watch`, {
    method: 'DELETE',
  });
}

// ── Films ───────────────────────────────────────────────────────────────────

export async function addFilm(body: AddFilmBody): Promise<AddedResponse> {
  return addedResponseSchema.parse(await apiFetch<unknown>('/api/library/films', json(body)));
}

export async function getFilmEntry(entryId: string): Promise<FilmEntryDetail> {
  return filmEntryDetailSchema.parse(await apiFetch<unknown>(`/api/library/films/${entryId}`));
}

export function updateFilmEntry(entryId: string, body: UpdateFilmEntryBody): Promise<void> {
  return apiFetch<void>(`/api/library/films/${entryId}`, patch(body));
}

export function deleteFilmEntry(entryId: string): Promise<void> {
  return apiFetch<void>(`/api/library/films/${entryId}`, { method: 'DELETE' });
}
