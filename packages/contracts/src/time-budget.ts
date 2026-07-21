import { z } from 'zod';
import { mediaTypeSchema } from './media';
import type { CompletionTarget, DurationWithProvenance, OwnershipStatus } from './library';

/**
 * Lot 4 — budget temps : le cœur différenciateur de Trackly.
 * Module PUR (aucune E/S) : mêmes calculs côté API (tableau de bord) et côté
 * front (fiches). Concentré de tests — stratégie docs/cadrage/14.
 * Toutes les durées internes sont en secondes.
 */

// ── Jeux ────────────────────────────────────────────────────────────────────

export interface GameDurationsInput {
  main: DurationWithProvenance;
  mainExtra: DurationWithProvenance;
  completionist: DurationWithProvenance;
}

/**
 * Durée totale retenue pour un objectif de complétion.
 * Si la durée de l'objectif est inconnue, on se replie sur la plus proche
 * disponible (jamais de silence : mieux vaut une estimation qu'un « ? »).
 */
export function targetDurationSeconds(
  durations: GameDurationsInput,
  target: CompletionTarget,
): number | null {
  const byTarget: Record<CompletionTarget, Array<number | null>> = {
    MAIN: [durations.main.seconds, durations.mainExtra.seconds, durations.completionist.seconds],
    MAIN_EXTRA: [
      durations.mainExtra.seconds,
      durations.completionist.seconds,
      durations.main.seconds,
    ],
    COMPLETIONIST: [
      durations.completionist.seconds,
      durations.mainExtra.seconds,
      durations.main.seconds,
    ],
  };
  return byTarget[target].find((seconds) => seconds != null) ?? null;
}

export interface GameProgressInput {
  status: OwnershipStatus | 'WISHLIST';
  hoursPlayed: number;
  progressPercent: number | null;
}

/**
 * Temps restant pour atteindre l'objectif.
 * - terminé/100 % → 0 ;
 * - % de progression renseigné → il prime (plus fiable que les heures brutes) ;
 * - sinon durée − heures jouées, plancher à 0 ;
 * - durée totalement inconnue → null (le jeu est signalé « à estimer »).
 */
export function gameRemainingSeconds(
  durations: GameDurationsInput,
  target: CompletionTarget,
  progress: GameProgressInput,
): number | null {
  if (progress.status === 'FINISHED' || progress.status === 'COMPLETED') return 0;
  const total = targetDurationSeconds(durations, target);
  if (total == null) return null;
  if (progress.progressPercent != null) {
    return Math.round(total * (1 - progress.progressPercent / 100));
  }
  return Math.max(0, Math.round(total - progress.hoursPlayed * 3600));
}

// ── Séries ──────────────────────────────────────────────────────────────────

/** Durée d'épisode de repli quand ni TMDB ni les épisodes connus n'aident. */
export const DEFAULT_EPISODE_RUNTIME_MINUTES = 40;

export interface SeriesBudgetInput {
  /** Épisodes annoncés (somme des saisons, spéciaux exclus). */
  totalEpisodes: number;
  watchedEpisodes: number;
  /** Runtimes des épisodes connus (en base), non vus et déjà diffusés. */
  knownUnwatchedRuntimesMinutes: Array<number | null>;
  /** Épisodes connus en base (vus ou non) — le reste est estimé. */
  knownEpisodes: number;
  /** Durée moyenne d'épisode annoncée par TMDB au niveau série (souvent absente). */
  seriesRuntimeMinutes: number | null;
}

export interface EstimatedSeconds {
  seconds: number;
  /** Une partie du calcul repose sur une durée moyenne, pas sur les épisodes réels. */
  estimated: boolean;
}

/**
 * Temps restant d'une série = épisodes connus non vus (runtimes réels) +
 * épisodes pas encore chargés en base × durée de repli
 * (médiane des runtimes connus → durée série TMDB → 40 min).
 */
export function seriesRemaining(input: SeriesBudgetInput): EstimatedSeconds {
  const fallbackMinutes =
    median(input.knownUnwatchedRuntimesMinutes.filter((r): r is number => r != null)) ??
    input.seriesRuntimeMinutes ??
    DEFAULT_EPISODE_RUNTIME_MINUTES;

  let seconds = 0;
  let estimated = false;
  for (const runtime of input.knownUnwatchedRuntimesMinutes) {
    if (runtime != null) {
      seconds += runtime * 60;
    } else {
      seconds += fallbackMinutes * 60;
      estimated = true;
    }
  }

  const unknownEpisodes = Math.max(0, input.totalEpisodes - input.knownEpisodes);
  if (unknownEpisodes > 0) {
    seconds += unknownEpisodes * fallbackMinutes * 60;
    estimated = true;
  }
  return { seconds, estimated };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] as number;
  return ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

/**
 * « Je suis à l'étape X sur Y » (chapitre, quête, boss…) → % de progression.
 * Approximation assumée : les étapes n'ont pas toutes la même longueur.
 * Renvoie null si les entrées ne permettent pas un calcul sensé.
 */
export function percentFromStep(step: number, total: number): number | null {
  if (!Number.isFinite(step) || !Number.isFinite(total)) return null;
  if (total <= 0 || step < 0) return null;
  return Math.min(100, Math.round((step / total) * 100));
}

// ── Films ───────────────────────────────────────────────────────────────────

export function filmRemainingSeconds(runtimeMinutes: number | null): number | null {
  return runtimeMinutes != null ? runtimeMinutes * 60 : null;
}

// ── Tableau de bord (contrat HTTP) ──────────────────────────────────────────

export const budgetBucketSchema = z.object({
  count: z.number().int(),
  seconds: z.number().int(),
  estimated: z.boolean(),
  /** Entrées sans aucune durée connue : exclues du total, à estimer à la main. */
  unknownCount: z.number().int(),
});
export type BudgetBucket = z.infer<typeof budgetBucketSchema>;

export const dashboardItemSchema = z.object({
  mediaType: mediaTypeSchema,
  entryId: z.string().uuid(),
  title: z.string(),
  posterUrl: z.string().url().nullable(),
  subtitle: z.string().nullable(),
  remainingSeconds: z.number().int().nullable(),
  estimated: z.boolean(),
});
export type DashboardItem = z.infer<typeof dashboardItemSchema>;

export const dashboardResponseSchema = z.object({
  /** Tout finir (en cours + backlog + à voir, envies exclues). */
  totalSeconds: z.number().int(),
  totalEstimated: z.boolean(),
  games: z.object({
    inProgress: budgetBucketSchema,
    backlog: budgetBucketSchema,
    wishlist: budgetBucketSchema,
  }),
  series: z.object({
    inProgress: budgetBucketSchema,
    toWatch: budgetBucketSchema,
  }),
  films: z.object({
    toWatch: budgetBucketSchema,
  }),
  /** En cours, triés par temps restant croissant — les victoires rapides d'abord. */
  inProgress: z.array(dashboardItemSchema),
});
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
