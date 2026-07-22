import { z } from 'zod';

/** Lot 5 — RGPD : export et suppression du compte (exigence V1 du cahier des charges). */

export const deleteAccountBodySchema = z.object({
  password: z.string().min(1, 'Mot de passe requis pour confirmer la suppression'),
});
export type DeleteAccountBody = z.infer<typeof deleteAccountBodySchema>;
