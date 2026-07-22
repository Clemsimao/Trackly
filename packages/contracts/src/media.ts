import { z } from 'zod';

// ── Référentiels transverses ────────────────────────────────────────────────

export const mediaTypeSchema = z.enum(['game', 'series', 'film', 'book']);
export type MediaType = z.infer<typeof mediaTypeSchema>;

/** Provenance d'un champ : récupéré automatiquement, saisi ou modifié par l'utilisateur. */
export const fieldProvenanceSchema = z.enum(['auto', 'manual', 'overridden']);
export type FieldProvenance = z.infer<typeof fieldProvenanceSchema>;
