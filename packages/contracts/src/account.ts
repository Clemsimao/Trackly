import { z } from 'zod';

/** Lot 5 — RGPD : export et suppression du compte (exigence V1 du cahier des charges). */

export const deleteAccountBodySchema = z.object({
  password: z.string().min(1, 'Mot de passe requis pour confirmer la suppression'),
});
export type DeleteAccountBody = z.infer<typeof deleteAccountBodySchema>;

/** Délai de grâce avant purge définitive (CA A5). */
export const DELETION_GRACE_DAYS = 7;

/** Réponse à une demande de suppression : la date d'effacement effectif. */
export const deletionScheduledSchema = z.object({
  scheduledFor: z.string().datetime(),
});
export type DeletionScheduled = z.infer<typeof deletionScheduledSchema>;

/** Annulation depuis le lien reçu par e-mail (sans être connecté). */
export const cancelDeletionBodySchema = z.object({
  token: z.string().min(1),
});
export type CancelDeletionBody = z.infer<typeof cancelDeletionBodySchema>;
