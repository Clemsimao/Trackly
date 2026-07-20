import { describe, expect, it } from 'vitest';
import { emailSchema, loginBodySchema, passwordSchema, registerBodySchema } from './auth';

describe('contrats auth', () => {
  it('normalise les e-mails (minuscules, sans espaces)', () => {
    expect(emailSchema.parse('  Julien@Test.FR ')).toBe('julien@test.fr');
  });

  it('exige 12 caractères minimum pour le mot de passe (A1)', () => {
    expect(passwordSchema.safeParse('a'.repeat(11)).success).toBe(false);
    expect(passwordSchema.safeParse('a'.repeat(12)).success).toBe(true);
  });

  it('registerBodySchema rejette un pseudo vide', () => {
    const result = registerBodySchema.safeParse({
      email: 'a@b.fr',
      password: 'mot-de-passe-ok',
      displayName: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('loginBodySchema : rememberMe vaut false par défaut', () => {
    const parsed = loginBodySchema.parse({ email: 'a@b.fr', password: 'x' });
    expect(parsed.rememberMe).toBe(false);
  });
});
