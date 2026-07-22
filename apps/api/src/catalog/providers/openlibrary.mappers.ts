import type { BookDetail, SearchResultItem } from '@trackly/contracts';

/**
 * Formes brutes Open Library (search.json) — champs demandés via `fields`.
 * L'œuvre (work) est l'unité, pas l'édition (docs/cadrage/17, décision n°2).
 */
export interface OlSearchDoc {
  /** Ex. "/works/OL45804W" */
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  number_of_pages_median?: number;
  isbn?: string[];
  first_sentence?: string[];
  subject?: string[];
}

const COVERS_BASE = 'https://covers.openlibrary.org/b/id';

export function workIdOf(key: string): string {
  return key.replace(/^\/works\//, '');
}

function coverUrl(coverId: number | undefined, size: 'M' | 'L'): string | null {
  return coverId ? `${COVERS_BASE}/${coverId}-${size}.jpg` : null;
}

/** Premier ISBN-13 plausible (978/979) — sert de préremplissage d'édition. */
export function pickIsbn13(isbns: string[] | undefined): string | null {
  if (!isbns) return null;
  return isbns.find((isbn) => /^97[89]\d{10}$/.test(isbn.replace(/-/g, ''))) ?? null;
}

export function mapBookSearchResult(doc: OlSearchDoc): SearchResultItem {
  return {
    mediaType: 'book',
    externalId: workIdOf(doc.key),
    title: doc.title,
    year: doc.first_publish_year ?? null,
    posterUrl: coverUrl(doc.cover_i, 'M'),
  };
}

/**
 * Fiche détail depuis un doc de recherche (search.json?q=key:…) + la description
 * du work JSON quand elle existe (première phrase en repli — couverture partielle).
 */
export function mapBookDetail(doc: OlSearchDoc, description: string | null): BookDetail {
  return {
    mediaType: 'book',
    externalId: workIdOf(doc.key),
    title: doc.title,
    authors: doc.author_name ?? [],
    description: description ?? doc.first_sentence?.[0] ?? null,
    coverUrl: coverUrl(doc.cover_i, 'L'),
    firstPublishYear: doc.first_publish_year ?? null,
    medianPages: doc.number_of_pages_median ?? null,
    isbn13: pickIsbn13(doc.isbn),
    subjects: (doc.subject ?? []).slice(0, 8),
  };
}

/** La description d'un work OL est une chaîne ou un objet { value } selon les fiches. */
export function extractWorkDescription(raw: unknown): string | null {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && 'value' in raw) {
    const value = (raw as { value: unknown }).value;
    return typeof value === 'string' ? value : null;
  }
  return null;
}
