import { describe, expect, it } from 'vitest';
import { passwordScore } from './PasswordStrength';

describe('passwordScore', () => {
  it('vide → pas de score', () => {
    expect(passwordScore('')).toBe(-1);
  });

  it('moins de 12 caractères → trop court', () => {
    expect(passwordScore('court1!A')).toBe(0);
  });

  it('12+ caractères monotones → faible', () => {
    expect(passwordScore('aaaaaaaaaaaa')).toBe(1);
  });

  it('mélange complet et long → excellent', () => {
    expect(passwordScore('Tr4ckly!des-jeux-et-series')).toBe(4);
  });
});
