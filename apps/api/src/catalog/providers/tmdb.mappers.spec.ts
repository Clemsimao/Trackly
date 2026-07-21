import { describe, expect, it } from 'vitest';
import { filmDetailSchema, seriesDetailSchema } from '@trackly/contracts';
import {
  mapMovieDetail,
  mapMovieSearchResult,
  mapSeasonEpisodes,
  mapTvDetail,
} from './tmdb.mappers';

// Fixtures figées reflétant la forme réelle des réponses TMDB (contrat, docs/cadrage/14)
const movieDetail = {
  id: 603,
  title: 'Matrix',
  overview: 'Un pirate informatique découvre la vérité sur la réalité.',
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
  release_date: '1999-06-23',
  runtime: 136,
  genres: [{ name: 'Action' }, { name: 'Science-Fiction' }],
  vote_average: 8.2,
};

const tvDetail = {
  id: 1396,
  name: 'Breaking Bad',
  overview: 'Un professeur de chimie...',
  poster_path: '/bb.jpg',
  backdrop_path: null,
  first_air_date: '2008-01-20',
  status: 'Ended',
  episode_run_time: [45, 47],
  genres: [{ name: 'Drame' }],
  vote_average: 8.9,
  seasons: [
    { season_number: 0, name: 'Épisodes spéciaux', episode_count: 9, air_date: null },
    { season_number: 1, name: 'Saison 1', episode_count: 7, air_date: '2008-01-20' },
    { season_number: 2, name: 'Saison 2', episode_count: 13, air_date: '2009-03-08' },
  ],
};

describe('mappers TMDB', () => {
  it('film : mappe vers la forme normalisée et valide le contrat', () => {
    const detail = mapMovieDetail(movieDetail);
    expect(filmDetailSchema.safeParse(detail).success).toBe(true);
    expect(detail.runtimeMinutes).toBe(136);
    expect(detail.posterUrl).toBe('https://image.tmdb.org/t/p/w342/poster.jpg');
    expect(detail.genres).toEqual(['Action', 'Science-Fiction']);
  });

  it('film : champs absents → null, jamais de chaîne vide', () => {
    const detail = mapMovieDetail({ id: 1, title: 'X', overview: '', poster_path: null });
    expect(detail.overview).toBeNull();
    expect(detail.posterUrl).toBeNull();
    expect(detail.runtimeMinutes).toBeNull();
  });

  it('série : exclut la saison 0 (spéciaux) du suivi', () => {
    const detail = mapTvDetail(tvDetail);
    expect(seriesDetailSchema.safeParse(detail).success).toBe(true);
    expect(detail.seasons.map((s) => s.seasonNumber)).toEqual([1, 2]);
  });

  it('série : durée d’épisode = moyenne arrondie des durées connues', () => {
    expect(mapTvDetail(tvDetail).episodeRunTimeMinutes).toBe(46);
    expect(mapTvDetail({ ...tvDetail, episode_run_time: [] }).episodeRunTimeMinutes).toBeNull();
  });

  it('recherche : extrait l’année de la date de sortie', () => {
    const item = mapMovieSearchResult({ id: 603, title: 'Matrix', release_date: '1999-06-23' });
    expect(item.year).toBe(1999);
    expect(item.mediaType).toBe('film');
  });
});

describe('mapSeasonEpisodes (Lot 3)', () => {
  it('normalise les épisodes avec runtime et date de diffusion', () => {
    const episodes = mapSeasonEpisodes({
      episodes: [
        { episode_number: 1, name: 'Pilot', runtime: 58, air_date: '2008-01-20' },
        { episode_number: 2, name: '', runtime: null, air_date: null },
      ],
    });
    expect(episodes[0]).toEqual({
      episodeNumber: 1,
      name: 'Pilot',
      runtimeMinutes: 58,
      airDate: '2008-01-20',
    });
    // Nom absent → libellé de repli ; runtime/date inconnus → null (jamais 0)
    expect(episodes[1]).toEqual({
      episodeNumber: 2,
      name: 'Épisode 2',
      runtimeMinutes: null,
      airDate: null,
    });
  });

  it('saison sans épisodes → liste vide', () => {
    expect(mapSeasonEpisodes({})).toEqual([]);
  });
});
