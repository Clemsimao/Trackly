import { z } from 'zod';

/**
 * Contrat partagé entre le front et l'API.
 * Règle : toute forme de donnée qui traverse la frontière HTTP est décrite ici,
 * validée côté API (source de vérité) et typée côté front.
 */

export * from './auth';

// ── Référentiels transverses ────────────────────────────────────────────────

export const mediaTypeSchema = z.enum(['game', 'series', 'film']);
export type MediaType = z.infer<typeof mediaTypeSchema>;

/** Provenance d'un champ : récupéré automatiquement, saisi ou modifié par l'utilisateur. */
export const fieldProvenanceSchema = z.enum(['auto', 'manual', 'overridden']);
export type FieldProvenance = z.infer<typeof fieldProvenanceSchema>;

// ── Santé de l'API ──────────────────────────────────────────────────────────

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('trackly-api'),
  version: z.string(),
  timestamp: z.string().datetime(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
