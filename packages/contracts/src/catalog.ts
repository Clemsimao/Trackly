import { z } from 'zod';
import { mediaTypeSchema } from './media';

/** Lot 2 — catalogue : formes normalisées, indépendantes des fournisseurs (TMDB/IGDB). */

// ── Recherche ───────────────────────────────────────────────────────────────

export const searchResultItemSchema = z.object({
  mediaType: mediaTypeSchema,
  /** Identifiant chez le fournisseur (IGDB ou TMDB), toujours transporté en chaîne. */
  externalId: z.string(),
  title: z.string(),
  year: z.number().int().nullable(),
  posterUrl: z.string().url().nullable(),
});
export type SearchResultItem = z.infer<typeof searchResultItemSchema>;

export const searchResponseSchema = z.object({
  query: z.string(),
  results: z.array(searchResultItemSchema),
  /** Fournisseurs en échec pendant cette recherche (résultats partiels, RT-3). */
  degraded: z.array(mediaTypeSchema),
});
export type SearchResponse = z.infer<typeof searchResponseSchema>;

// ── Fiches détail ───────────────────────────────────────────────────────────

/** Durées de complétion IGDB (secondes) — le cœur du budget temps. */
export const timeToBeatSchema = z.object({
  mainSeconds: z.number().int().nullable(),
  mainExtraSeconds: z.number().int().nullable(),
  completionistSeconds: z.number().int().nullable(),
  submissionCount: z.number().int(),
});
export type TimeToBeat = z.infer<typeof timeToBeatSchema>;

export const gameDetailSchema = z.object({
  mediaType: z.literal('game'),
  externalId: z.string(),
  title: z.string(),
  /** IGDB ne fournit pas de traduction : résumé en anglais (documenté, docs/cadrage/05). */
  summary: z.string().nullable(),
  coverUrl: z.string().url().nullable(),
  screenshotUrls: z.array(z.string().url()),
  releaseDate: z.string().nullable(),
  genres: z.array(z.string()),
  platforms: z.array(z.string()),
  developers: z.array(z.string()),
  publishers: z.array(z.string()),
  timeToBeat: timeToBeatSchema.nullable(),
});
export type GameDetail = z.infer<typeof gameDetailSchema>;

export const filmDetailSchema = z.object({
  mediaType: z.literal('film'),
  externalId: z.string(),
  title: z.string(),
  overview: z.string().nullable(),
  posterUrl: z.string().url().nullable(),
  backdropUrl: z.string().url().nullable(),
  releaseDate: z.string().nullable(),
  runtimeMinutes: z.number().int().nullable(),
  genres: z.array(z.string()),
  rating: z.number().nullable(),
});
export type FilmDetail = z.infer<typeof filmDetailSchema>;

export const bookDetailSchema = z.object({
  mediaType: z.literal('book'),
  /** Open Library work id (ex. OL45804W) — l'œuvre, pas une édition. */
  externalId: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  /** OL : first_sentence ou description d'œuvre — couverture partielle (~40-57 %, docs/cadrage/17). */
  description: z.string().nullable(),
  coverUrl: z.string().url().nullable(),
  firstPublishYear: z.number().int().nullable(),
  /** Médiane toutes éditions (number_of_pages_median) — défaut du pagesTotal personnel. */
  medianPages: z.number().int().nullable(),
  /** Une édition de référence pour préremplir l'ISBN (facultatif). */
  isbn13: z.string().nullable(),
  subjects: z.array(z.string()),
});
export type BookDetail = z.infer<typeof bookDetailSchema>;

export const seasonSummarySchema = z.object({
  seasonNumber: z.number().int(),
  name: z.string(),
  episodeCount: z.number().int(),
  airDate: z.string().nullable(),
});
export type SeasonSummary = z.infer<typeof seasonSummarySchema>;

export const seriesDetailSchema = z.object({
  mediaType: z.literal('series'),
  externalId: z.string(),
  title: z.string(),
  overview: z.string().nullable(),
  posterUrl: z.string().url().nullable(),
  backdropUrl: z.string().url().nullable(),
  firstAirDate: z.string().nullable(),
  status: z.string().nullable(),
  genres: z.array(z.string()),
  episodeRunTimeMinutes: z.number().int().nullable(),
  /** Saisons « spéciales » (numéro 0) exclues ; les épisodes arrivent au Lot 3. */
  seasons: z.array(seasonSummarySchema),
  rating: z.number().nullable(),
});
export type SeriesDetail = z.infer<typeof seriesDetailSchema>;
