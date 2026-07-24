import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { IgdbClient } from './igdb.client';

describe('IgdbClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('borne les nouvelles tentatives sur une réponse 429 persistante', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), { status: 200 }),
      )
      .mockResolvedValue(new Response(null, { status: 429, headers: { 'Retry-After': '0' } }));
    vi.stubGlobal('fetch', fetchMock);

    const config = {
      get: vi.fn((key: string) => {
        if (key === 'IGDB_CLIENT_ID') return 'client';
        if (key === 'IGDB_CLIENT_SECRET') return 'secret';
        return undefined;
      }),
    };
    const client = new IgdbClient(config as unknown as ConfigService);

    await expect(client.searchGames('test')).rejects.toMatchObject({ status: 429 });
    // 1 requête OAuth + 1 appel initial + 2 nouvelles tentatives.
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
