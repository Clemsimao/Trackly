import { z } from 'zod';

/** Épopée A — contrats d'authentification (docs/cadrage/12, stories A1-A3). */

export const emailSchema = z.string().trim().toLowerCase().email('E-mail invalide').max(254);

/** A1 : minimum 12 caractères (stratégie sécurité, docs/cadrage/15). */
export const passwordSchema = z
  .string()
  .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
  .max(128, 'Le mot de passe est trop long');

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1, 'Le pseudo est requis').max(50),
});
export type RegisterBody = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Le mot de passe est requis').max(128),
  rememberMe: z.boolean().optional().default(false),
});
export type LoginBody = z.infer<typeof loginBodySchema>;

export const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;

export const resetPasswordBodySchema = z.object({
  token: z.string().min(32).max(256),
  password: passwordSchema,
});
export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;

export const publicUserSchema = z.object({
  id: z.string().uuid(),
  email: emailSchema,
  displayName: z.string(),
  createdAt: z.string().datetime(),
  /** Date d'effacement prévue si une suppression est en cours (A5), sinon null. */
  deletionScheduledFor: z.string().datetime().nullable().default(null),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

export const authSuccessSchema = z.object({
  user: publicUserSchema,
});
export type AuthSuccess = z.infer<typeof authSuccessSchema>;

export const okResponseSchema = z.object({
  ok: z.literal(true),
});
export type OkResponse = z.infer<typeof okResponseSchema>;

/** Forme d'erreur normalisée renvoyée par l'API. */
export const apiErrorSchema = z.object({
  statusCode: z.number(),
  code: z.string(),
  message: z.string(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
