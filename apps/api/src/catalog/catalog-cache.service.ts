import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Cache générique des réponses fournisseurs, en base (une seule infrastructure,
 * docs/cadrage/03). Comportement : frais → servi ; périmé → re-fetch ; re-fetch
 * en échec avec du périmé disponible → on sert le périmé (résilience RT-3).
 */
@Injectable()
export class CatalogCacheService {
  private readonly logger = new Logger(CatalogCacheService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrFetch<T>(cacheKey: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.prisma.catalogCache.findUnique({ where: { cacheKey } });
    const now = new Date();

    if (cached && cached.expiresAt > now) {
      return cached.payload as T;
    }

    try {
      const fresh = await fetcher();
      await this.prisma.catalogCache.upsert({
        where: { cacheKey },
        create: {
          cacheKey,
          payload: fresh as object,
          fetchedAt: now,
          expiresAt: new Date(now.getTime() + ttlMs),
        },
        update: {
          payload: fresh as object,
          fetchedAt: now,
          expiresAt: new Date(now.getTime() + ttlMs),
        },
      });
      return fresh;
    } catch (error) {
      if (cached) {
        this.logger.warn(`Fournisseur en échec pour ${cacheKey} — cache périmé servi`);
        return cached.payload as T;
      }
      throw error;
    }
  }
}
