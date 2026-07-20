import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import type { MailService } from '../mail/mail.service';
import type { ResetTokenService } from './reset-token.service';
import type { SessionService } from './session.service';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';

function makeDeps() {
  const prisma = {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  };
  const sessions = { revokeAllForUser: vi.fn().mockResolvedValue(undefined) };
  const resetTokens = { create: vi.fn().mockResolvedValue('jeton'), consume: vi.fn() };
  const mail = { sendPasswordReset: vi.fn().mockResolvedValue(undefined) };
  const config = { get: vi.fn().mockReturnValue('https://trackly.test') };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    new PasswordService(),
    sessions as unknown as SessionService,
    resetTokens as unknown as ResetTokenService,
    mail as unknown as MailService,
    config as unknown as ConfigService,
  );
  return { service, prisma, sessions, resetTokens, mail };
}

describe('AuthService', () => {
  it('register : hache le mot de passe (jamais stocké en clair)', async () => {
    const { service, prisma } = makeDeps();
    prisma.user.create.mockResolvedValue({ id: 'u1' });

    await service.register('a@b.fr', 'mot-de-passe-tres-long', 'Julien');

    const data = prisma.user.create.mock.calls[0]?.[0].data;
    expect(data.passwordHash).toMatch(/^\$argon2id\$/);
    expect(data.passwordHash).not.toContain('mot-de-passe-tres-long');
  });

  it('register : e-mail déjà pris → message générique sans révéler l’existence', async () => {
    const { service, prisma } = makeDeps();
    prisma.user.create.mockRejectedValue({ code: 'P2002' });

    await expect(service.register('a@b.fr', 'mot-de-passe-tres-long', 'J')).rejects.toThrow(
      ConflictException,
    );
    await expect(service.register('a@b.fr', 'mot-de-passe-tres-long', 'J')).rejects.toMatchObject({
      response: { code: 'REGISTRATION_FAILED' },
    });
  });

  it('login : e-mail inconnu et mauvais mot de passe donnent la même erreur', async () => {
    const { service, prisma } = makeDeps();
    const passwords = new PasswordService();

    prisma.user.findUnique.mockResolvedValue(null);
    const unknownEmail = await service.login('inconnu@b.fr', 'x'.repeat(12)).catch((e) => e);

    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      passwordHash: await passwords.hash('le-bon-mot-de-passe'),
    });
    const wrongPassword = await service.login('a@b.fr', 'mauvais-mot-de-passe').catch((e) => e);

    expect(unknownEmail).toBeInstanceOf(UnauthorizedException);
    expect(wrongPassword).toBeInstanceOf(UnauthorizedException);
    expect(unknownEmail.response.message).toBe(wrongPassword.response.message);
  });

  it('forgot-password : e-mail inconnu → aucun envoi, aucune erreur', async () => {
    const { service, prisma, mail } = makeDeps();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.requestPasswordReset('inconnu@b.fr')).resolves.toBeUndefined();
    expect(mail.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('forgot-password : e-mail connu → lien envoyé vers APP_URL', async () => {
    const { service, prisma, mail } = makeDeps();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.fr' });

    await service.requestPasswordReset('a@b.fr');

    const [to, url] = mail.sendPasswordReset.mock.calls[0] ?? [];
    expect(to).toBe('a@b.fr');
    expect(url).toContain('https://trackly.test/reinitialisation?token=');
  });

  it('reset-password : jeton invalide → 401, aucune session révoquée', async () => {
    const { service, resetTokens, sessions } = makeDeps();
    resetTokens.consume.mockResolvedValue(null);

    await expect(
      service.resetPassword('jeton-invalide-mais-assez-long', 'nouveau-mdp-solide'),
    ).rejects.toThrow(UnauthorizedException);
    expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('reset-password : jeton valide → nouveau hash + toutes les sessions révoquées', async () => {
    const { service, prisma, resetTokens, sessions } = makeDeps();
    resetTokens.consume.mockResolvedValue('u1');

    await service.resetPassword('jeton-valide-suffisamment-long', 'nouveau-mdp-solide');

    expect(prisma.user.update).toHaveBeenCalled();
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith('u1');
  });
});
