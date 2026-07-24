import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GameDetail, SearchResultItem } from '@trackly/contracts';
import { fetchExternal, waitBeforeRetry } from '../../common/http';
import {
  NotFoundInProviderError,
  ProviderNotConfiguredError,
  ProviderRequestError,
} from '../provider.errors';
import {
  mapGameDetail,
  mapGameSearchResult,
  type IgdbGameDetail,
  type IgdbSearchGame,
  type IgdbTimeToBeat,
} from './igdb.mappers';

const API_URL = 'https://api.igdb.com/v4';
const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
/** IGDB limite à 4 req/s : on espace nos appels de 300 ms (docs/cadrage/05). */
const MIN_REQUEST_INTERVAL_MS = 300;
const MAX_429_RETRIES = 2;

@Injectable()
export class IgdbClient {
  private readonly logger = new Logger(IgdbClient.name);
  private token: { value: string; expiresAt: number } | null = null;
  private requestChain: Promise<unknown> = Promise.resolve();

  constructor(private readonly config: ConfigService) {}

  get isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('IGDB_CLIENT_ID') && this.config.get<string>('IGDB_CLIENT_SECRET'),
    );
  }

  async searchGames(query: string): Promise<SearchResultItem[]> {
    const safe = query.replace(/["\\]/g, ' ').trim();
    const body = `search "${safe}"; fields id,name,first_release_date,cover.image_id; limit 10;`;
    const games = await this.query<IgdbSearchGame[]>('games', body);
    return games.map(mapGameSearchResult);
  }

  async getGame(externalId: string): Promise<GameDetail> {
    const id = Number(externalId);
    if (!Number.isInteger(id)) throw new NotFoundInProviderError('igdb', externalId);

    const body =
      `fields name,summary,first_release_date,genres.name,platforms.name,` +
      `involved_companies.company.name,involved_companies.developer,involved_companies.publisher,` +
      `cover.image_id,screenshots.image_id; where id = ${id};`;
    const games = await this.query<IgdbGameDetail[]>('games', body);
    const game = games[0];
    if (!game) throw new NotFoundInProviderError('igdb', externalId);

    // Les durées de complétion vivent dans un endpoint dédié (game_time_to_beats)
    const ttbs = await this.query<IgdbTimeToBeat[]>(
      'game_time_to_beats',
      `fields hastily,normally,completely,count; where game_id = ${id}; limit 1;`,
    );
    return mapGameDetail(game, ttbs[0]);
  }

  /** Sérialise les appels pour respecter la limite de débit IGDB. */
  private query<T>(endpoint: string, body: string): Promise<T> {
    const next = this.requestChain.then(async () => {
      const result = await this.doQuery<T>(endpoint, body);
      await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS));
      return result;
    });
    // La chaîne ne doit jamais se rompre, même si un appel échoue
    this.requestChain = next.catch(() => undefined);
    return next;
  }

  private async doQuery<T>(endpoint: string, body: string, attempt = 0): Promise<T> {
    const token = await this.getToken();
    const clientId = this.config.get<string>('IGDB_CLIENT_ID') as string;

    const response = await fetchExternal(`${API_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body,
    });

    if (response.status === 429) {
      if (attempt >= MAX_429_RETRIES) throw new ProviderRequestError('igdb', 429);
      this.logger.warn(`IGDB 429 — nouvel essai ${attempt + 1}/${MAX_429_RETRIES}`);
      await waitBeforeRetry(response, attempt);
      return this.doQuery<T>(endpoint, body, attempt + 1);
    }
    if (response.status === 401) {
      // Jeton révoqué côté Twitch : on l'oublie, le prochain appel en refera un
      this.token = null;
      throw new ProviderRequestError('igdb', 401);
    }
    if (!response.ok) throw new ProviderRequestError('igdb', response.status);
    return (await response.json()) as T;
  }

  /** OAuth2 client credentials Twitch ; jeton (~64 j) mis en cache mémoire. */
  private async getToken(): Promise<string> {
    const clientId = this.config.get<string>('IGDB_CLIENT_ID');
    const clientSecret = this.config.get<string>('IGDB_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new ProviderNotConfiguredError('igdb');

    if (this.token && this.token.expiresAt > Date.now() + 60_000) {
      return this.token.value;
    }

    const url = new URL(TOKEN_URL);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('client_secret', clientSecret);
    url.searchParams.set('grant_type', 'client_credentials');

    const response = await fetchExternal(url, { method: 'POST' });
    if (!response.ok) throw new ProviderRequestError('igdb-auth', response.status);
    const data = (await response.json()) as { access_token: string; expires_in: number };

    this.token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    this.logger.log('Jeton IGDB renouvelé');
    return data.access_token;
  }
}
