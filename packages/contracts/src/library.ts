import { z } from 'zod';
import { fieldProvenanceSchema } from './media';
import {
  bookDetailSchema,
  filmDetailSchema,
  gameDetailSchema,
  seriesDetailSchema,
} from './catalog';

/** Lot 3 — bibliothèque et suivi (docs/cadrage/10 et 12, épopées C, D, E). */

// ── Statuts (alignés sur les enums Prisma) ──────────────────────────────────

/** Statut affiché d'un jeu. WISHLIST = aucune possession (envie ≠ backlog, décision phase A). */
export const gameStatusSchema = z.enum([
  'WISHLIST',
  'BACKLOG',
  'PLAYING',
  'PAUSED',
  'FINISHED',
  'COMPLETED',
  'DROPPED',
]);
export type GameStatus = z.infer<typeof gameStatusSchema>;

/** Statut d'une possession (une copie sur une plateforme) : jamais WISHLIST. */
export const ownershipStatusSchema = z.enum([
  'BACKLOG',
  'PLAYING',
  'PAUSED',
  'FINISHED',
  'COMPLETED',
  'DROPPED',
]);
export type OwnershipStatus = z.infer<typeof ownershipStatusSchema>;

export const completionTargetSchema = z.enum(['MAIN', 'MAIN_EXTRA', 'COMPLETIONIST']);
export type CompletionTarget = z.infer<typeof completionTargetSchema>;

export const seriesStatusSchema = z.enum(['TO_WATCH', 'WATCHING', 'PAUSED', 'FINISHED', 'DROPPED']);
export type SeriesStatus = z.infer<typeof seriesStatusSchema>;

export const filmStatusSchema = z.enum(['TO_WATCH', 'SEEN', 'DISLIKED', 'DROPPED', 'REJECTED']);
export type FilmStatus = z.infer<typeof filmStatusSchema>;

/** Livres : miroir des séries — TO_READ couvre l'envie ET la pile à lire. */
export const bookStatusSchema = z.enum(['TO_READ', 'READING', 'PAUSED', 'FINISHED', 'DROPPED']);
export type BookStatus = z.infer<typeof bookStatusSchema>;

/**
 * Statut affiché d'un jeu à partir de ses possessions (le plus « actif » gagne).
 * Sans possession : liste d'envies.
 */
const STATUS_PRECEDENCE: OwnershipStatus[] = [
  'PLAYING',
  'PAUSED',
  'BACKLOG',
  'COMPLETED',
  'FINISHED',
  'DROPPED',
];
export function deriveGameStatus(ownershipStatuses: OwnershipStatus[]): GameStatus {
  if (ownershipStatuses.length === 0) return 'WISHLIST';
  for (const status of STATUS_PRECEDENCE) {
    if (ownershipStatuses.includes(status)) return status;
  }
  return 'BACKLOG';
}

// ── Champs communs ──────────────────────────────────────────────────────────

export const ratingSchema = z.number().int().min(1).max(10);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ');
const shortTextSchema = z.string().trim().max(500);
const longTextSchema = z.string().trim().max(5000);

// ── Ajout à la bibliothèque (B2) ────────────────────────────────────────────

export const addGameBodySchema = z
  .object({
    igdbId: z.string().min(1),
    status: gameStatusSchema.default('WISHLIST'),
    platform: z.string().trim().min(1).max(60).optional(),
  })
  .refine((body) => body.status === 'WISHLIST' || Boolean(body.platform), {
    message: 'Indique la plateforme sur laquelle tu possèdes le jeu',
    path: ['platform'],
  });
export type AddGameBody = z.input<typeof addGameBodySchema>;

export const addSeriesBodySchema = z.object({
  tmdbId: z.string().min(1),
  status: seriesStatusSchema.default('TO_WATCH'),
});
export type AddSeriesBody = z.input<typeof addSeriesBodySchema>;

export const addFilmBodySchema = z.object({
  tmdbId: z.string().min(1),
  status: filmStatusSchema.default('TO_WATCH'),
});
export type AddFilmBody = z.input<typeof addFilmBodySchema>;

export const addBookBodySchema = z.object({
  olWorkId: z.string().min(1),
  status: bookStatusSchema.default('TO_READ'),
});
export type AddBookBody = z.input<typeof addBookBodySchema>;

// ── Mises à jour ────────────────────────────────────────────────────────────

const opinionFieldsSchema = z.object({
  rating: ratingSchema.nullable().optional(),
  review: longTextSchema.nullable().optional(),
  notes: longTextSchema.nullable().optional(),
  favorite: z.boolean().optional(),
});

export const updateGameEntryBodySchema = opinionFieldsSchema;
export type UpdateGameEntryBody = z.infer<typeof updateGameEntryBodySchema>;

export const addOwnershipBodySchema = z.object({
  platform: z.string().trim().min(1).max(60),
  status: ownershipStatusSchema.default('BACKLOG'),
});
export type AddOwnershipBody = z.input<typeof addOwnershipBodySchema>;

export const updateOwnershipBodySchema = z.object({
  status: ownershipStatusSchema.optional(),
  platform: z.string().trim().min(1).max(60).optional(),
  hoursPlayed: z.number().min(0).max(100000).optional(),
  progressPercent: z.number().int().min(0).max(100).nullable().optional(),
  nextObjective: shortTextSchema.nullable().optional(),
  resumeNote: z.string().trim().max(2000).nullable().optional(),
  purchaseDate: isoDateSchema.nullable().optional(),
  startedAt: isoDateSchema.nullable().optional(),
  finishedAt: isoDateSchema.nullable().optional(),
  lastPlayedAt: isoDateSchema.nullable().optional(),
  trophiesEarned: z.number().int().min(0).nullable().optional(),
  trophiesTotal: z.number().int().min(0).nullable().optional(),
  completionTarget: completionTargetSchema.optional(),
  /** Note libre pour l'entrée de journal créée par cette mise à jour (C2). */
  journalNote: shortTextSchema.optional(),
});
export type UpdateOwnershipBody = z.infer<typeof updateOwnershipBodySchema>;

/** Durées éditables (C3) : null = revenir à la valeur automatique. */
export const updateDurationsBodySchema = z.object({
  mainSeconds: z.number().int().positive().nullable().optional(),
  mainExtraSeconds: z.number().int().positive().nullable().optional(),
  completionistSeconds: z.number().int().positive().nullable().optional(),
});
export type UpdateDurationsBody = z.infer<typeof updateDurationsBodySchema>;

export const updateSeriesEntryBodySchema = opinionFieldsSchema.extend({
  status: seriesStatusSchema.optional(),
});
export type UpdateSeriesEntryBody = z.infer<typeof updateSeriesEntryBodySchema>;

export const updateFilmEntryBodySchema = opinionFieldsSchema.extend({
  status: filmStatusSchema.optional(),
  watchedAt: isoDateSchema.nullable().optional(),
  rewatch: z.boolean().optional(),
  watchedWith: shortTextSchema.nullable().optional(),
});
export type UpdateFilmEntryBody = z.infer<typeof updateFilmEntryBodySchema>;

export const updateBookEntryBodySchema = opinionFieldsSchema.extend({
  status: bookStatusSchema.optional(),
  /** Pages de MON édition (décision docs/cadrage/17) : null = revenir à la médiane OL. */
  pagesTotal: z.number().int().min(1).max(20000).nullable().optional(),
  editionIsbn: z.string().trim().max(17).nullable().optional(),
  currentPage: z.number().int().min(0).max(20000).optional(),
  progressPercent: z.number().int().min(0).max(100).nullable().optional(),
  resumeNote: z.string().trim().max(2000).nullable().optional(),
  startedAt: isoDateSchema.nullable().optional(),
  finishedAt: isoDateSchema.nullable().optional(),
  /** Durée de la session de lecture (calibration de la vitesse) — jamais l'horloge murale. */
  minutesRead: z.number().int().min(1).max(1440).optional(),
  /** Note libre pour l'entrée de journal créée par cette mise à jour (C2). */
  journalNote: shortTextSchema.optional(),
});
export type UpdateBookEntryBody = z.infer<typeof updateBookEntryBodySchema>;

// ── Bibliothèque (liste) ────────────────────────────────────────────────────

export const workSummarySchema = z.object({
  title: z.string(),
  posterUrl: z.string().url().nullable(),
  year: z.number().int().nullable(),
  genres: z.array(z.string()),
});
export type WorkSummary = z.infer<typeof workSummarySchema>;

export const ownershipSummarySchema = z.object({
  id: z.string().uuid(),
  platform: z.string(),
  status: ownershipStatusSchema,
  hoursPlayed: z.number(),
  progressPercent: z.number().int().nullable(),
});

export const libraryGameItemSchema = z.object({
  entryId: z.string().uuid(),
  igdbId: z.string(),
  work: workSummarySchema,
  status: gameStatusSchema,
  favorite: z.boolean(),
  rating: ratingSchema.nullable(),
  ownerships: z.array(ownershipSummarySchema),
  updatedAt: z.string().datetime(),
});
export type LibraryGameItem = z.infer<typeof libraryGameItemSchema>;

export const librarySeriesItemSchema = z.object({
  entryId: z.string().uuid(),
  tmdbId: z.string(),
  work: workSummarySchema,
  status: seriesStatusSchema,
  favorite: z.boolean(),
  rating: ratingSchema.nullable(),
  watchedEpisodes: z.number().int(),
  totalEpisodes: z.number().int(),
  updatedAt: z.string().datetime(),
});
export type LibrarySeriesItem = z.infer<typeof librarySeriesItemSchema>;

export const libraryFilmItemSchema = z.object({
  entryId: z.string().uuid(),
  tmdbId: z.string(),
  work: workSummarySchema,
  runtimeMinutes: z.number().int().nullable(),
  status: filmStatusSchema,
  favorite: z.boolean(),
  rating: ratingSchema.nullable(),
  watchedAt: z.string().nullable(),
  updatedAt: z.string().datetime(),
});
export type LibraryFilmItem = z.infer<typeof libraryFilmItemSchema>;

export const libraryBookItemSchema = z.object({
  entryId: z.string().uuid(),
  olWorkId: z.string(),
  work: workSummarySchema,
  status: bookStatusSchema,
  favorite: z.boolean(),
  rating: ratingSchema.nullable(),
  currentPage: z.number().int(),
  pagesTotal: z.number().int().nullable(),
  progressPercent: z.number().int().nullable(),
  updatedAt: z.string().datetime(),
});
export type LibraryBookItem = z.infer<typeof libraryBookItemSchema>;

export const libraryResponseSchema = z.object({
  games: z.array(libraryGameItemSchema),
  series: z.array(librarySeriesItemSchema),
  films: z.array(libraryFilmItemSchema),
  books: z.array(libraryBookItemSchema),
});
export type LibraryResponse = z.infer<typeof libraryResponseSchema>;

// ── Fiches bibliothèque (détail) ────────────────────────────────────────────

/** Une durée effective : valeur + provenance (auto / manuel / modifié) — exigence forte. */
export const durationWithProvenanceSchema = z.object({
  seconds: z.number().int().nullable(),
  provenance: fieldProvenanceSchema.nullable(),
});
export type DurationWithProvenance = z.infer<typeof durationWithProvenanceSchema>;

export const ownershipDetailSchema = z.object({
  id: z.string().uuid(),
  platform: z.string(),
  status: ownershipStatusSchema,
  hoursPlayed: z.number(),
  progressPercent: z.number().int().nullable(),
  nextObjective: z.string().nullable(),
  resumeNote: z.string().nullable(),
  purchaseDate: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  lastPlayedAt: z.string().nullable(),
  trophiesEarned: z.number().int().nullable(),
  trophiesTotal: z.number().int().nullable(),
  completionTarget: completionTargetSchema,
});
export type OwnershipDetail = z.infer<typeof ownershipDetailSchema>;

export const journalEntrySchema = z.object({
  id: z.string().uuid(),
  platform: z.string(),
  createdAt: z.string().datetime(),
  hoursPlayed: z.number().nullable(),
  progressPercent: z.number().int().nullable(),
  note: z.string().nullable(),
});
export type JournalEntry = z.infer<typeof journalEntrySchema>;

export const gameEntryDetailSchema = z.object({
  entryId: z.string().uuid(),
  work: gameDetailSchema,
  status: gameStatusSchema,
  favorite: z.boolean(),
  rating: ratingSchema.nullable(),
  review: z.string().nullable(),
  notes: z.string().nullable(),
  durations: z.object({
    main: durationWithProvenanceSchema,
    mainExtra: durationWithProvenanceSchema,
    completionist: durationWithProvenanceSchema,
  }),
  ownerships: z.array(ownershipDetailSchema),
  journal: z.array(journalEntrySchema),
});
export type GameEntryDetail = z.infer<typeof gameEntryDetailSchema>;

export const episodeStateSchema = z.object({
  id: z.string().uuid(),
  seasonNumber: z.number().int(),
  episodeNumber: z.number().int(),
  name: z.string(),
  runtimeMinutes: z.number().int().nullable(),
  airDate: z.string().nullable(),
  /** Épisode annoncé mais non diffusé : non marquable, hors temps restant immédiat (D1). */
  aired: z.boolean(),
  watched: z.boolean(),
  watchedAt: z.string().datetime().nullable(),
});
export type EpisodeState = z.infer<typeof episodeStateSchema>;

export const seasonStateSchema = z.object({
  seasonNumber: z.number().int(),
  name: z.string(),
  episodeCount: z.number().int(),
  airDate: z.string().nullable(),
  watchedCount: z.number().int(),
});
export type SeasonState = z.infer<typeof seasonStateSchema>;

export const seriesEntryDetailSchema = z.object({
  entryId: z.string().uuid(),
  work: seriesDetailSchema,
  status: seriesStatusSchema,
  favorite: z.boolean(),
  rating: ratingSchema.nullable(),
  review: z.string().nullable(),
  notes: z.string().nullable(),
  seasons: z.array(seasonStateSchema),
  watchedEpisodes: z.number().int(),
  totalEpisodes: z.number().int(),
  lastWatchedAt: z.string().datetime().nullable(),
});
export type SeriesEntryDetail = z.infer<typeof seriesEntryDetailSchema>;

export const seasonEpisodesResponseSchema = z.object({
  seasonNumber: z.number().int(),
  episodes: z.array(episodeStateSchema),
});
export type SeasonEpisodesResponse = z.infer<typeof seasonEpisodesResponseSchema>;

export const filmEntryDetailSchema = z.object({
  entryId: z.string().uuid(),
  work: filmDetailSchema,
  status: filmStatusSchema,
  favorite: z.boolean(),
  rating: ratingSchema.nullable(),
  review: z.string().nullable(),
  notes: z.string().nullable(),
  watchedAt: z.string().nullable(),
  rewatch: z.boolean(),
  watchedWith: z.string().nullable(),
});
export type FilmEntryDetail = z.infer<typeof filmEntryDetailSchema>;

export const bookJournalEntrySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  currentPage: z.number().int().nullable(),
  progressPercent: z.number().int().nullable(),
  minutesRead: z.number().int().nullable(),
  note: z.string().nullable(),
});
export type BookJournalEntry = z.infer<typeof bookJournalEntrySchema>;

export const bookEntryDetailSchema = z.object({
  entryId: z.string().uuid(),
  work: bookDetailSchema,
  status: bookStatusSchema,
  favorite: z.boolean(),
  rating: ratingSchema.nullable(),
  review: z.string().nullable(),
  notes: z.string().nullable(),
  /** Pages effectives + provenance : auto (médiane OL) ou manual (mon édition). */
  pagesTotal: z.number().int().nullable(),
  pagesSource: fieldProvenanceSchema,
  editionIsbn: z.string().nullable(),
  currentPage: z.number().int(),
  progressPercent: z.number().int().nullable(),
  resumeNote: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  /** Vitesse calibrée de l'utilisateur (p/h), null tant qu'aucune session mesurée. */
  pagesPerHour: z.number().nullable(),
  remainingSeconds: z.number().int().nullable(),
  /** true tant que le calcul repose sur la vitesse de repli (30 p/h). */
  estimated: z.boolean(),
  journal: z.array(bookJournalEntrySchema),
});
export type BookEntryDetail = z.infer<typeof bookEntryDetailSchema>;

/** Réponse d'ajout : l'identifiant d'entrée créé (ou existant en cas de doublon). */
export const addedResponseSchema = z.object({
  entryId: z.string().uuid(),
});
export type AddedResponse = z.infer<typeof addedResponseSchema>;
