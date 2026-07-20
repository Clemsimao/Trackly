import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hache puis vérifie un mot de passe', async () => {
    const hash = await service.hash('mon-mot-de-passe-solide');
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await service.verify(hash, 'mon-mot-de-passe-solide')).toBe(true);
  });

  it('rejette un mauvais mot de passe', async () => {
    const hash = await service.hash('mon-mot-de-passe-solide');
    expect(await service.verify(hash, 'mauvais-mot-de-passe')).toBe(false);
  });

  it('rejette sans lever sur un hash corrompu', async () => {
    expect(await service.verify('pas-un-hash', 'peu-importe')).toBe(false);
  });

  it('verifyDummy ne lève jamais (lissage du temps de réponse)', async () => {
    await expect(service.verifyDummy('peu-importe')).resolves.toBeUndefined();
  });
});
