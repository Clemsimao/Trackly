import { describe, expect, it } from 'vitest';
import type { GameDurationsInput } from './time-budget';
import {
  DEFAULT_EPISODE_RUNTIME_MINUTES,
  DEFAULT_PAGES_PER_HOUR,
  MAX_PAGES_PER_HOUR,
  MIN_PAGES_PER_HOUR,
  bookRemainingSeconds,
  filmRemainingSeconds,
  gameRemainingSeconds,
  readingSpeed,
  seriesRemaining,
  targetDurationSeconds,
} from './time-budget';

const H = 3600;

function durations(
  main: number | null,
  mainExtra: number | null,
  completionist: number | null,
): GameDurationsInput {
  return {
    main: { seconds: main, provenance: main != null ? 'auto' : null },
    mainExtra: { seconds: mainExtra, provenance: mainExtra != null ? 'auto' : null },
    completionist: { seconds: completionist, provenance: completionist != null ? 'auto' : null },
  };
}

describe('targetDurationSeconds — choix de la durée selon l’objectif', () => {
  const full = durations(10 * H, 26 * H, 55 * H);

  it('objectif renseigné → sa durée', () => {
    expect(targetDurationSeconds(full, 'MAIN')).toBe(10 * H);
    expect(targetDurationSeconds(full, 'MAIN_EXTRA')).toBe(26 * H);
    expect(targetDurationSeconds(full, 'COMPLETIONIST')).toBe(55 * H);
  });

  it('durée de l’objectif absente → repli sur la plus proche', () => {
    expect(targetDurationSeconds(durations(null, 26 * H, null), 'MAIN')).toBe(26 * H);
    expect(targetDurationSeconds(durations(10 * H, null, null), 'COMPLETIONIST')).toBe(10 * H);
    expect(targetDurationSeconds(durations(10 * H, null, 55 * H), 'MAIN_EXTRA')).toBe(55 * H);
  });

  it('aucune durée → null (jeu à estimer manuellement)', () => {
    expect(targetDurationSeconds(durations(null, null, null), 'MAIN')).toBeNull();
  });
});

describe('gameRemainingSeconds', () => {
  const full = durations(10 * H, 26 * H, 55 * H);

  it('le % de progression prime sur les heures jouées', () => {
    const remaining = gameRemainingSeconds(full, 'MAIN', {
      status: 'PLAYING',
      hoursPlayed: 9, // incohérent exprès : le % doit gagner
      progressPercent: 50,
    });
    expect(remaining).toBe(5 * H);
  });

  it('sans % : durée − heures jouées', () => {
    const remaining = gameRemainingSeconds(full, 'MAIN_EXTRA', {
      status: 'PLAYING',
      hoursPlayed: 6,
      progressPercent: null,
    });
    expect(remaining).toBe(20 * H);
  });

  it('plus d’heures que la durée → 0, jamais négatif', () => {
    const remaining = gameRemainingSeconds(full, 'MAIN', {
      status: 'PLAYING',
      hoursPlayed: 120,
      progressPercent: null,
    });
    expect(remaining).toBe(0);
  });

  it('terminé ou 100 % → 0, même sans durées connues', () => {
    const none = durations(null, null, null);
    expect(
      gameRemainingSeconds(none, 'MAIN', {
        status: 'FINISHED',
        hoursPlayed: 3,
        progressPercent: null,
      }),
    ).toBe(0);
    expect(
      gameRemainingSeconds(none, 'MAIN', {
        status: 'COMPLETED',
        hoursPlayed: 3,
        progressPercent: null,
      }),
    ).toBe(0);
  });

  it('envie (pas commencé) → durée complète de l’objectif', () => {
    const remaining = gameRemainingSeconds(full, 'MAIN', {
      status: 'WISHLIST',
      hoursPlayed: 0,
      progressPercent: null,
    });
    expect(remaining).toBe(10 * H);
  });

  it('aucune durée connue → null (signalé, pas silencieux)', () => {
    const remaining = gameRemainingSeconds(durations(null, null, null), 'MAIN', {
      status: 'PLAYING',
      hoursPlayed: 2,
      progressPercent: null,
    });
    expect(remaining).toBeNull();
  });
});

describe('seriesRemaining', () => {
  it('épisodes connus avec runtimes réels → somme exacte, non estimée', () => {
    const result = seriesRemaining({
      totalEpisodes: 10,
      watchedEpisodes: 7,
      knownUnwatchedRuntimesMinutes: [45, 50, 47],
      knownEpisodes: 10,
      seriesRuntimeMinutes: null,
    });
    expect(result).toEqual({ seconds: (45 + 50 + 47) * 60, estimated: false });
  });

  it('épisodes pas encore chargés → estimés à la médiane des runtimes connus', () => {
    const result = seriesRemaining({
      totalEpisodes: 20, // 10 connus, 10 inconnus
      watchedEpisodes: 8,
      knownUnwatchedRuntimesMinutes: [40, 60], // médiane 50
      knownEpisodes: 10,
      seriesRuntimeMinutes: 999, // ne doit PAS être utilisé : la médiane prime
      // 2 connus non vus (40+60) + 10 inconnus × 50
    });
    expect(result.seconds).toBe((40 + 60 + 10 * 50) * 60);
    expect(result.estimated).toBe(true);
  });

  it('aucun runtime connu → durée série TMDB, sinon 40 min par défaut', () => {
    const viaTmdb = seriesRemaining({
      totalEpisodes: 8,
      watchedEpisodes: 0,
      knownUnwatchedRuntimesMinutes: [],
      knownEpisodes: 0,
      seriesRuntimeMinutes: 55,
    });
    expect(viaTmdb).toEqual({ seconds: 8 * 55 * 60, estimated: true });

    const fallback = seriesRemaining({
      totalEpisodes: 8,
      watchedEpisodes: 0,
      knownUnwatchedRuntimesMinutes: [],
      knownEpisodes: 0,
      seriesRuntimeMinutes: null,
    });
    expect(fallback).toEqual({
      seconds: 8 * DEFAULT_EPISODE_RUNTIME_MINUTES * 60,
      estimated: true,
    });
  });

  it('runtime manquant sur un épisode connu → repli pour cet épisode seulement', () => {
    const result = seriesRemaining({
      totalEpisodes: 3,
      watchedEpisodes: 0,
      knownUnwatchedRuntimesMinutes: [30, null, 30], // médiane des connus = 30
      knownEpisodes: 3,
      seriesRuntimeMinutes: null,
    });
    expect(result).toEqual({ seconds: 90 * 60, estimated: true });
  });

  it('tout vu → 0', () => {
    const result = seriesRemaining({
      totalEpisodes: 10,
      watchedEpisodes: 10,
      knownUnwatchedRuntimesMinutes: [],
      knownEpisodes: 10,
      seriesRuntimeMinutes: 45,
    });
    expect(result).toEqual({ seconds: 0, estimated: false });
  });
});

describe('filmRemainingSeconds', () => {
  it('durée connue → secondes ; inconnue → null', () => {
    expect(filmRemainingSeconds(136)).toBe(136 * 60);
    expect(filmRemainingSeconds(null)).toBeNull();
  });
});

describe('readingSpeed — calibration de la vitesse de lecture', () => {
  it('aucune session mesurée → null (on retombera sur le défaut)', () => {
    expect(readingSpeed([])).toBeNull();
    expect(readingSpeed([{ deltaPages: 10, minutesRead: 0 }])).toBeNull();
    expect(readingSpeed([{ deltaPages: 0, minutesRead: 30 }])).toBeNull();
  });

  it('Σ Δpages ÷ Σ minutes sur les sessions exploitables', () => {
    // 40 p en 60 min + 20 p en 60 min = 60 p en 2 h → 30 p/h
    expect(
      readingSpeed([
        { deltaPages: 40, minutesRead: 60 },
        { deltaPages: 20, minutesRead: 60 },
      ]),
    ).toBe(30);
  });

  it('les sessions inexploitables sont ignorées, pas la calibration entière', () => {
    expect(
      readingSpeed([
        { deltaPages: 40, minutesRead: 60 },
        { deltaPages: 0, minutesRead: 15 }, // relecture sur place : ignorée
      ]),
    ).toBe(40);
  });

  it('vitesses aberrantes bornées au garde-fou [5, 200] p/h', () => {
    // 500 p en 10 min (faute de frappe) → plafonné
    expect(readingSpeed([{ deltaPages: 500, minutesRead: 10 }])).toBe(MAX_PAGES_PER_HOUR);
    // 1 p en 120 min → plancher
    expect(readingSpeed([{ deltaPages: 1, minutesRead: 120 }])).toBe(MIN_PAGES_PER_HOUR);
  });
});

describe('bookRemainingSeconds', () => {
  const reading = {
    status: 'READING',
    pagesTotal: 300,
    currentPage: 100,
    progressPercent: null,
  } as const;

  it('pages restantes ÷ vitesse calibrée', () => {
    // 200 pages restantes à 40 p/h → 5 h
    expect(bookRemainingSeconds({ ...reading }, 40)).toBe(5 * 3600);
  });

  it('sans calibration → vitesse de repli 30 p/h', () => {
    // 200 pages à 30 p/h → 24000 s
    expect(bookRemainingSeconds({ ...reading }, null)).toBe(
      Math.round((200 / DEFAULT_PAGES_PER_HOUR) * 3600),
    );
  });

  it('le % de progression prime sur la page courante (liseuses)', () => {
    const remaining = bookRemainingSeconds(
      { status: 'READING', pagesTotal: 300, currentPage: 100, progressPercent: 90 },
      30,
    );
    // 10 % de 10 h → 1 h, malgré une page courante incohérente
    expect(remaining).toBe(3600);
  });

  it('terminé → 0, même avec une page courante en retard', () => {
    expect(
      bookRemainingSeconds(
        { status: 'FINISHED', pagesTotal: 300, currentPage: 10, progressPercent: null },
        30,
      ),
    ).toBe(0);
  });

  it('page courante au-delà du total → plancher 0', () => {
    expect(
      bookRemainingSeconds(
        { status: 'READING', pagesTotal: 300, currentPage: 350, progressPercent: null },
        30,
      ),
    ).toBe(0);
  });

  it('pages totales inconnues → null (livre « à estimer »)', () => {
    expect(
      bookRemainingSeconds(
        { status: 'READING', pagesTotal: null, currentPage: 50, progressPercent: null },
        30,
      ),
    ).toBeNull();
  });
});
