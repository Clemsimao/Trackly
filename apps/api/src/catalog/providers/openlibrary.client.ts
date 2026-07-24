import { Injectable, Logger } from '@nestjs/common';
import type { BookDetail, SearchResultItem } from '@trackly/contracts';
import { fetchExternal, waitBeforeRetry } from '../../common/http';
import { NotFoundInProviderError, ProviderRequestError } from '../provider.errors';
import {
  extractWorkDescription,
  mapBookDetail,
  mapBookSearchResult,
  type OlSearchDoc,
} from './openlibrary.mappers';

const BASE_URL = 'https://openlibrary.org';
const SEARCH_FIELDS =
  'key,title,author_name,first_publish_year,cover_i,number_of_pages_median,isbn,first_sentence,subject';

/**
 * Client Open Library (livres) — sans clé, données CC0 (docs/cadrage/17).
 * OL demande un User-Agent identifiant ; pas de traduction FR des fiches :
 * titres tels que catalogués, description souvent absente (~40-57 % mesurés).
 */
@Injectable()
export class OpenLibraryClient {
  private readonly logger = new Logger(OpenLibraryClient.name);

  /** Pas de clé requise : le fournisseur livres est toujours disponible. */
  get isConfigured(): boolean {
    return true;
  }

  async searchBooks(query: string): Promise<SearchResultItem[]> {
    const data = await this.get<{ docs: OlSearchDoc[] }>('/search.json', {
      q: query,
      limit: '10',
      fields: SEARCH_FIELDS,
    });
    return data.docs.map(mapBookSearchResult);
  }

  async getBook(olWorkId: string): Promise<BookDetail> {
    // search.json?q=key:… renvoie médiane de pages, auteurs et couverture en un appel —
    // le work JSON ne sert qu'à la description (plus riche que first_sentence).
    const [search, work] = await Promise.all([
      this.get<{ docs: OlSearchDoc[] }>('/search.json', {
        q: `key:"/works/${olWorkId}"`,
        limit: '1',
        fields: SEARCH_FIELDS,
      }),
      this.getWorkDescription(olWorkId),
    ]);
    const doc = search.docs[0];
    if (!doc) throw new NotFoundInProviderError('openlibrary', olWorkId);
    return mapBookDetail(doc, work);
  }

  private async getWorkDescription(olWorkId: string): Promise<string | null> {
    try {
      const work = await this.get<{ description?: unknown }>(
        `/works/${encodeURIComponent(olWorkId)}.json`,
        {},
      );
      return extractWorkDescription(work.description);
    } catch (error) {
      // La description est un bonus : son échec ne bloque pas la fiche
      this.logger.warn(`Description du work ${olWorkId} indisponible : ${String(error)}`);
      return null;
    }
  }

  private async get<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

    const response = await fetchExternal(url, {
      headers: {
        // Identification demandée par la politique d'usage d'Open Library
        'User-Agent': 'Trackly/0.1 (suivi personnel de médias ; auto-hébergé)',
        Accept: 'application/json',
      },
    });

    if (response.status === 404) throw new NotFoundInProviderError('openlibrary', path);
    if (response.status === 429) {
      this.logger.warn('Open Library 429 — nouvel essai borné');
      await waitBeforeRetry(response, 0);
      const retry = await fetchExternal(url, {
        headers: {
          'User-Agent': 'Trackly/0.1 (suivi personnel de médias ; auto-hébergé)',
          Accept: 'application/json',
        },
      });
      if (!retry.ok) throw new ProviderRequestError('openlibrary', retry.status);
      return (await retry.json()) as T;
    }
    if (!response.ok) throw new ProviderRequestError('openlibrary', response.status);
    return (await response.json()) as T;
  }
}
