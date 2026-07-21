import { describe, expect, it, vi } from 'vitest';
import type { SearchResultItem } from '@trackly/contracts';
import type { CatalogCacheService } from './catalog-cache.service';
import type { IgdbClient } from './providers/igdb.client';
import type { TmdbClient } from './providers/tmdb.client';
import { CatalogService, interleaveByType } from './catalog.service';

/** Cache transparent : exécute directement le fetcher (le cache a ses propres tests). */
const passthroughCache = {
  getOrFetch: vi.fn((_key: string, _ttl: number, fetcher: () => Promise<unknown>) => fetcher()),
} as unknown as CatalogCacheService;

function item(mediaType: SearchResultItem['mediaType'], title: string): SearchResultItem {
  return { mediaType, externalId: '1', title, year: null, posterUrl: null };
}

describe('CatalogService.search', () => {
  it('fusionne les résultats des fournisseurs', async () => {
    const igdb = { searchGames: vi.fn().mockResolvedValue([item('game', 'Zelda')]) };
    const tmdb = {
      searchFilms: vi.fn().mockResolvedValue([item('film', 'Matrix')]),
      searchSeries: vi.fn().mockResolvedValue([item('series', 'Dark')]),
    };
    const service = new CatalogService(
      passthroughCache,
      tmdb as unknown as TmdbClient,
      igdb as unknown as IgdbClient,
    );

    const response = await service.search('zelda');
    expect(response.results).toHaveLength(3);
    expect(response.degraded).toEqual([]);
  });

  it('un fournisseur en panne → résultats partiels + type signalé en dégradé (RT-3)', async () => {
    const igdb = { searchGames: vi.fn().mockRejectedValue(new Error('igdb down')) };
    const tmdb = {
      searchFilms: vi.fn().mockResolvedValue([item('film', 'Matrix')]),
      searchSeries: vi.fn().mockResolvedValue([]),
    };
    const service = new CatalogService(
      passthroughCache,
      tmdb as unknown as TmdbClient,
      igdb as unknown as IgdbClient,
    );

    const response = await service.search('matrix');
    expect(response.results.map((r) => r.title)).toEqual(['Matrix']);
    expect(response.degraded).toEqual(['game']);
  });

  it('filtre par type : seul le fournisseur concerné est interrogé', async () => {
    const igdb = { searchGames: vi.fn().mockResolvedValue([item('game', 'Zelda')]) };
    const tmdb = { searchFilms: vi.fn(), searchSeries: vi.fn() };
    const service = new CatalogService(
      passthroughCache,
      tmdb as unknown as TmdbClient,
      igdb as unknown as IgdbClient,
    );

    await service.search('zelda', 'game');
    expect(igdb.searchGames).toHaveBeenCalled();
    expect(tmdb.searchFilms).not.toHaveBeenCalled();
    expect(tmdb.searchSeries).not.toHaveBeenCalled();
  });
});

describe('interleaveByType', () => {
  it('alterne les types pour une liste équilibrée', () => {
    const mixed = interleaveByType([
      item('game', 'G1'),
      item('game', 'G2'),
      item('film', 'F1'),
      item('series', 'S1'),
    ]);
    expect(mixed.map((i) => i.title)).toEqual(['G1', 'F1', 'S1', 'G2']);
  });
});
