import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './environment';

const base = {
  DATABASE_URL: 'postgresql://trackly:trackly@localhost:5432/trackly',
  APP_URL: 'http://localhost:5173',
};

describe('validateEnvironment', () => {
  it('accepte une configuration de développement minimale', () => {
    expect(validateEnvironment(base)).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
    });
  });

  it('refuse une URL publique sans HTTPS en production', () => {
    expect(() => validateEnvironment({ ...base, NODE_ENV: 'production' })).toThrow(
      /APP_URL.*HTTPS/,
    );
  });

  it('peut démarrer sans fournisseur mail sans journaliser les messages', () => {
    const environment = validateEnvironment({
      ...base,
      NODE_ENV: 'production',
      APP_URL: 'https://trackly.test',
    });
    expect(environment.NODE_ENV).toBe('production');
    expect(environment).not.toHaveProperty('RESEND_API_KEY');
  });

  it('refuse une configuration IGDB partielle', () => {
    expect(() => validateEnvironment({ ...base, IGDB_CLIENT_ID: 'id' })).toThrow(
      /IGDB_CLIENT_SECRET/,
    );
  });
});
