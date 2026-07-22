import { describe, expect, it } from 'vitest';
import {
  extractWorkDescription,
  mapBookDetail,
  mapBookSearchResult,
  pickIsbn13,
  workIdOf,
  type OlSearchDoc,
} from './openlibrary.mappers';

const dune: OlSearchDoc = {
  key: '/works/OL893415W',
  title: 'Dune',
  author_name: ['Frank Herbert'],
  first_publish_year: 1965,
  cover_i: 11481354,
  number_of_pages_median: 592,
  isbn: ['2266320480', '978-0-441-01359-3', '9780441013593'],
  first_sentence: ['In the week before their departure to Arrakis…'],
  subject: ['Science fiction', 'Deserts', 'Politics', 'Ecology'],
};

describe('workIdOf', () => {
  it('extrait l’identifiant du chemin /works/', () => {
    expect(workIdOf('/works/OL893415W')).toBe('OL893415W');
    expect(workIdOf('OL893415W')).toBe('OL893415W');
  });
});

describe('pickIsbn13', () => {
  it('premier ISBN-13 plausible (978/979), tirets tolérés', () => {
    expect(pickIsbn13(dune.isbn)).toBe('978-0-441-01359-3');
  });

  it('aucun ISBN-13 → null', () => {
    expect(pickIsbn13(['2266320480'])).toBeNull();
    expect(pickIsbn13(undefined)).toBeNull();
  });
});

describe('mapBookSearchResult', () => {
  it('résultat de recherche normalisé, couverture taille M', () => {
    expect(mapBookSearchResult(dune)).toEqual({
      mediaType: 'book',
      externalId: 'OL893415W',
      title: 'Dune',
      year: 1965,
      posterUrl: 'https://covers.openlibrary.org/b/id/11481354-M.jpg',
    });
  });

  it('champs absents → null, jamais undefined', () => {
    const minimal = mapBookSearchResult({ key: '/works/OL1W', title: 'Sans rien' });
    expect(minimal.year).toBeNull();
    expect(minimal.posterUrl).toBeNull();
  });
});

describe('mapBookDetail', () => {
  it('fiche complète : médiane de pages, auteurs, sujets bornés à 8', () => {
    const detail = mapBookDetail(dune, 'Grande saga du désert.');
    expect(detail.mediaType).toBe('book');
    expect(detail.medianPages).toBe(592);
    expect(detail.authors).toEqual(['Frank Herbert']);
    expect(detail.description).toBe('Grande saga du désert.');
    expect(detail.coverUrl).toBe('https://covers.openlibrary.org/b/id/11481354-L.jpg');
    expect(detail.subjects).toHaveLength(4);
  });

  it('sans description de work → repli sur la première phrase, sinon null', () => {
    expect(mapBookDetail(dune, null).description).toBe(
      'In the week before their departure to Arrakis…',
    );
    expect(mapBookDetail({ key: '/works/OL1W', title: 'Nu' }, null).description).toBeNull();
  });
});

describe('extractWorkDescription', () => {
  it('chaîne directe ou objet { value } selon les fiches OL', () => {
    expect(extractWorkDescription('texte')).toBe('texte');
    expect(extractWorkDescription({ value: 'texte' })).toBe('texte');
    expect(extractWorkDescription({ value: 42 })).toBeNull();
    expect(extractWorkDescription(undefined)).toBeNull();
  });
});
