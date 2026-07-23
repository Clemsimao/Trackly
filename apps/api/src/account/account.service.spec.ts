import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { DELETION_GRACE_DAYS } from '@trackly/contracts';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import type { MailService } from '../mail/mail.service';
import { AccountService } from './account.service';

const JOUR_MS = 24 * 60 * 60 * 1000;

function makePrisma(user: Record<string, unknown> = {}) {
  return {
    user: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: 'u1',
        email: 'j@t.fr',
        displayName: 'Julien',
        passwordHash: 'h',
        deletionRequestedAt: null,
        ...user,
      }),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
    gameEntry: { findMany: vi.fn().mockResolvedValue([]) },
    seriesEntry: { findMany: vi.fn().mockResolvedValue([]) },
    filmEntry: { findMany: vi.fn().mockResolvedValue([]) },
    bookEntry: { findMany: vi.fn().mockResolvedValue([]) },
    episodeWatch: { findMany: vi.fn().mockResolvedValue([]) },
    fieldOverride: { findMany: vi.fn().mockResolvedValue([]) },
  } as unknown as PrismaService;
}

function makeMail() {
  return {
    sendDeletionRequested: vi.fn().mockResolvedValue(undefined),
    sendDeletionCompleted: vi.fn().mockResolvedValue(undefined),
  } as unknown as MailService;
}

const config = { get: vi.fn().mockReturnValue('https://trackly.test') } as unknown as ConfigService;

function makeService(prisma: PrismaService, motDePasseValide = true, mail = makeMail()) {
  const passwords = new PasswordService();
  vi.spyOn(passwords, 'verify').mockResolvedValue(motDePasseValide);
  return { service: new AccountService(prisma, passwords, mail, config), mail };
}

describe('AccountService — export (RGPD)', () => {
  it('l’export contient le profil et toutes les sections de données', async () => {
    const { service } = makeService(makePrisma());
    const data = await service.exportData('u1');
    expect(data.format).toBe('trackly-export-v1');
    expect(data.profile).toMatchObject({ email: 'j@t.fr', displayName: 'Julien' });
    for (const section of ['games', 'series', 'episodesWatched', 'films', 'books', 'overrides']) {
      expect(data[section]).toEqual([]);
    }
  });
});

describe('AccountService — suppression avec délai de grâce (CA A5)', () => {
  it('mot de passe incorrect → 400, rien n’est marqué ni supprimé', async () => {
    const prisma = makePrisma();
    const { service } = makeService(prisma, false);

    await expect(service.requestDeletion('u1', 'mauvais')).rejects.toThrow(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('mot de passe correct → le compte est marqué, PAS supprimé, et l’e-mail part', async () => {
    const prisma = makePrisma();
    const { service, mail } = makeService(prisma);

    const echeance = await service.requestDeletion('u1', 'bon');

    expect(prisma.user.delete).not.toHaveBeenCalled();
    const data = vi.mocked(prisma.user.update).mock.calls[0]?.[0].data as Record<string, unknown>;
    expect(data.deletionRequestedAt).toBeInstanceOf(Date);
    expect(data.deletionTokenHash).toEqual(expect.any(String));

    const attendu = Date.now() + DELETION_GRACE_DAYS * JOUR_MS;
    expect(Math.abs(echeance.getTime() - attendu)).toBeLessThan(5000);

    // le lien d'annulation doit être utilisable sans session
    const [destinataire, url] = vi.mocked(mail.sendDeletionRequested).mock.calls[0] ?? [];
    expect(destinataire).toBe('j@t.fr');
    expect(url).toContain('/annulation-suppression?token=');
  });

  it('demande répétée → l’échéance ne bouge pas, aucun nouveau jeton', async () => {
    const dejaDemande = new Date(Date.now() - 2 * JOUR_MS);
    const prisma = makePrisma({ deletionRequestedAt: dejaDemande });
    const { service, mail } = makeService(prisma);

    const echeance = await service.requestDeletion('u1', 'bon');

    expect(echeance.getTime()).toBe(dejaDemande.getTime() + DELETION_GRACE_DAYS * JOUR_MS);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(mail.sendDeletionRequested).not.toHaveBeenCalled();
  });

  it('annulation par jeton → les deux champs sont remis à null', async () => {
    const prisma = makePrisma();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      deletionRequestedAt: new Date(),
    } as never);
    const { service } = makeService(prisma);

    await service.cancelDeletionByToken('un-jeton');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { deletionRequestedAt: null, deletionTokenHash: null },
    });
  });

  it('jeton inconnu ou suppression déjà annulée → 400', async () => {
    const prisma = makePrisma();
    const { service } = makeService(prisma);
    await expect(service.cancelDeletionByToken('inconnu')).rejects.toThrow(BadRequestException);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      deletionRequestedAt: null,
    } as never);
    await expect(service.cancelDeletionByToken('perime')).rejects.toThrow(BadRequestException);
  });
});

describe('AccountService — purge à l’échéance (CA A5)', () => {
  it('ne purge que les comptes dont le délai est écoulé', async () => {
    const prisma = makePrisma();
    const { service } = makeService(prisma);
    const maintenant = new Date('2026-08-01T12:00:00Z');

    await service.purgeExpiredDeletions(maintenant);

    const where = vi.mocked(prisma.user.findMany).mock.calls[0]?.[0]?.where as {
      deletionRequestedAt: { lte: Date };
    };
    expect(where.deletionRequestedAt.lte).toEqual(
      new Date(maintenant.getTime() - DELETION_GRACE_DAYS * JOUR_MS),
    );
  });

  it('purge, puis confirme par e-mail à l’adresse lue AVANT la suppression', async () => {
    const prisma = makePrisma();
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'u1', email: 'j@t.fr' },
      { id: 'u2', email: 'c@t.fr' },
    ] as never);
    const { service, mail } = makeService(prisma);

    const nombre = await service.purgeExpiredDeletions();

    expect(nombre).toBe(2);
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u2' } });
    expect(mail.sendDeletionCompleted).toHaveBeenCalledWith('j@t.fr');
    expect(mail.sendDeletionCompleted).toHaveBeenCalledWith('c@t.fr');
  });

  it('un e-mail de confirmation qui échoue ne rejoue pas la purge', async () => {
    const prisma = makePrisma();
    vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: 'u1', email: 'j@t.fr' }] as never);
    const mail = makeMail();
    vi.mocked(mail.sendDeletionCompleted).mockRejectedValue(new Error('Resend HS'));
    const { service } = makeService(prisma, true, mail);

    await expect(service.purgeExpiredDeletions()).resolves.toBe(1);
    expect(prisma.user.delete).toHaveBeenCalledTimes(1);
  });
});
