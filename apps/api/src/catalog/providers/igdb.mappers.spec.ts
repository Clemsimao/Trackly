import { describe, expect, it } from 'vitest';
import { gameDetailSchema } from '@trackly/contracts';
import { mapGameDetail, mapTimeToBeat } from './igdb.mappers';

// Fixture figée reflétant la forme réelle des réponses IGDB (contrat, docs/cadrage/14)
const gameDetail = {
  id: 119133,
  name: 'Elden Ring',
  summary: 'A vast world full of excitement.',
  first_release_date: 1645747200, // 2022-02-25
  genres: [{ name: 'Role-playing (RPG)' }],
  platforms: [{ name: 'PlayStation 5' }, { name: 'PC (Microsoft Windows)' }],
  involved_companies: [
    { company: { name: 'FromSoftware' }, developer: true, publisher: false },
    { company: { name: 'Bandai Namco' }, developer: false, publisher: true },
  ],
  cover: { image_id: 'co4jni' },
  screenshots: [{ image_id: 'sc1' }, { image_id: 'sc2' }],
};

describe('mappers IGDB', () => {
  it('jeu : mappe vers la forme normalisée et valide le contrat', () => {
    const detail = mapGameDetail(gameDetail, { hastily: 180000, normally: 288000, count: 120 });
    expect(gameDetailSchema.safeParse(detail).success).toBe(true);
    expect(detail.releaseDate).toBe('2022-02-25');
    expect(detail.developers).toEqual(['FromSoftware']);
    expect(detail.publishers).toEqual(['Bandai Namco']);
    expect(detail.coverUrl).toContain('t_cover_big/co4jni.jpg');
  });

  it('durées : hastily→histoire, normally→+annexes, completely→100 % (docs/cadrage/05)', () => {
    const ttb = mapTimeToBeat({ hastily: 100, normally: 200, completely: 300, count: 42 });
    expect(ttb).toEqual({
      mainSeconds: 100,
      mainExtraSeconds: 200,
      completionistSeconds: 300,
      submissionCount: 42,
    });
  });

  it('durées : partielles conservées, absentes → null (jamais 0 silencieux, RT-6)', () => {
    const partial = mapTimeToBeat({ normally: 200, count: 3 });
    expect(partial?.mainSeconds).toBeNull();
    expect(partial?.mainExtraSeconds).toBe(200);

    expect(mapTimeToBeat(undefined)).toBeNull();
    expect(mapTimeToBeat({ count: 0 })).toBeNull();
  });

  it('captures d’écran limitées à 6', () => {
    const many = {
      ...gameDetail,
      screenshots: Array.from({ length: 10 }, (_, i) => ({ image_id: `s${i}` })),
    };
    expect(mapGameDetail(many, undefined).screenshotUrls).toHaveLength(6);
  });
});
