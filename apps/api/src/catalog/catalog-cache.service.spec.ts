import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { CatalogCacheService } from './catalog-cache.service';

function makePrisma() {
  return {
    catalogCache: {
      findUnique: vi.fn(),
      upsert: vi.fn().mockResolvedValue({}),
    },
  };
}

describe('CatalogCacheService', () => {
  it('cache frais → servi sans appeler le fournisseur', async () => {
    const prisma = makePrisma();
    prisma.catalogCache.findUnique.mockResolvedValue({
      payload: { hit: true },
      expiresAt: new Date(Date.now() + 60_000),
    });
    const service = new CatalogCacheService(prisma as unknown as PrismaService);
    const fetcher = vi.fn();

    expect(await service.getOrFetch('k', 1000, fetcher)).toEqual({ hit: true });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('cache périmé → re-fetch et mise à jour', async () => {
    const prisma = makePrisma();
    prisma.catalogCache.findUnique.mockResolvedValue({
      payload: { old: true },
      expiresAt: new Date(Date.now() - 1000),
    });
    const service = new CatalogCacheService(prisma as unknown as PrismaService);
    const fetcher = vi.fn().mockResolvedValue({ fresh: true });

    expect(await service.getOrFetch('k', 1000, fetcher)).toEqual({ fresh: true });
    expect(prisma.catalogCache.upsert).toHaveBeenCalled();
  });

  it('fournisseur en panne + cache périmé disponible → le périmé est servi (RT-3)', async () => {
    const prisma = makePrisma();
    prisma.catalogCache.findUnique.mockResolvedValue({
      payload: { stale: true },
      expiresAt: new Date(Date.now() - 1000),
    });
    const service = new CatalogCacheService(prisma as unknown as PrismaService);
    const fetcher = vi.fn().mockRejectedValue(new Error('down'));

    expect(await service.getOrFetch('k', 1000, fetcher)).toEqual({ stale: true });
  });

  it('fournisseur en panne sans aucun cache → l’erreur remonte', async () => {
    const prisma = makePrisma();
    prisma.catalogCache.findUnique.mockResolvedValue(null);
    const service = new CatalogCacheService(prisma as unknown as PrismaService);

    await expect(
      service.getOrFetch('k', 1000, () => Promise.reject(new Error('down'))),
    ).rejects.toThrow('down');
  });
});
