import { describe, expect, it } from 'vitest';
import { addGameBodySchema, deriveGameStatus, updateOwnershipBodySchema } from './library';

describe('deriveGameStatus', () => {
  it('sans possession → liste d’envies', () => {
    expect(deriveGameStatus([])).toBe('WISHLIST');
  });

  it('le statut le plus « actif » gagne (terminé PS5 + en cours PC → en cours)', () => {
    expect(deriveGameStatus(['FINISHED', 'PLAYING'])).toBe('PLAYING');
    expect(deriveGameStatus(['DROPPED', 'BACKLOG'])).toBe('BACKLOG');
    expect(deriveGameStatus(['FINISHED', 'COMPLETED'])).toBe('COMPLETED');
    expect(deriveGameStatus(['DROPPED'])).toBe('DROPPED');
  });
});

describe('addGameBodySchema', () => {
  it('statut par défaut : envie, sans plateforme requise (B2)', () => {
    const parsed = addGameBodySchema.parse({ igdbId: '42' });
    expect(parsed.status).toBe('WISHLIST');
  });

  it('un statut possédé exige la plateforme', () => {
    expect(addGameBodySchema.safeParse({ igdbId: '42', status: 'PLAYING' }).success).toBe(false);
    expect(
      addGameBodySchema.safeParse({ igdbId: '42', status: 'PLAYING', platform: 'PC' }).success,
    ).toBe(true);
  });
});

describe('updateOwnershipBodySchema', () => {
  it('borne le pourcentage et le format des dates', () => {
    expect(updateOwnershipBodySchema.safeParse({ progressPercent: 101 }).success).toBe(false);
    expect(updateOwnershipBodySchema.safeParse({ startedAt: '21/07/2026' }).success).toBe(false);
    expect(
      updateOwnershipBodySchema.safeParse({ progressPercent: 55, startedAt: '2026-07-21' }).success,
    ).toBe(true);
  });
});
