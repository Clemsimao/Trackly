import { z } from 'zod';

const baseEnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL est requise'),
  APP_URL: z.string().url('APP_URL doit être une URL valide').default('http://localhost:5173'),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  TMDB_API_TOKEN: z.string().optional(),
  IGDB_CLIENT_ID: z.string().optional(),
  IGDB_CLIENT_SECRET: z.string().optional(),
});

export type Environment = z.infer<typeof baseEnvironmentSchema>;

/** Refuse une configuration incohérente avant que l'API accepte du trafic. */
export function validateEnvironment(raw: Record<string, unknown>): Environment {
  const parsed = baseEnvironmentSchema
    .superRefine((env, context) => {
      if (env.NODE_ENV === 'production') {
        if (!env.APP_URL.startsWith('https://')) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['APP_URL'],
            message: 'APP_URL doit utiliser HTTPS en production',
          });
        }
      }

      const hasIgdbId = Boolean(env.IGDB_CLIENT_ID);
      const hasIgdbSecret = Boolean(env.IGDB_CLIENT_SECRET);
      if (hasIgdbId !== hasIgdbSecret) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['IGDB_CLIENT_SECRET'],
          message: 'IGDB_CLIENT_ID et IGDB_CLIENT_SECRET doivent être configurés ensemble',
        });
      }
    })
    .safeParse(raw);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'environnement'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Configuration invalide — ${details}`);
  }

  return parsed.data;
}
