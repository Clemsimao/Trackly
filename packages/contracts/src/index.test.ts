import { describe, expect, it } from 'vitest';
import { healthResponseSchema, mediaTypeSchema } from './index';

describe('healthResponseSchema', () => {
  it('accepte une réponse santé valide', () => {
    const result = healthResponseSchema.safeParse({
      status: 'ok',
      service: 'trackly-api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it('rejette un statut inconnu', () => {
    const result = healthResponseSchema.safeParse({
      status: 'down',
      service: 'trackly-api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });
});

describe('mediaTypeSchema', () => {
  it('accepte les quatre types de médias', () => {
    for (const type of ['game', 'series', 'film', 'book']) {
      expect(mediaTypeSchema.safeParse(type).success).toBe(true);
    }
  });

  it('rejette un type inconnu', () => {
    expect(mediaTypeSchema.safeParse('podcast').success).toBe(false);
  });
});
