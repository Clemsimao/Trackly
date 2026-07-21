import type { GameDetail, SearchResultItem, TimeToBeat } from '@trackly/contracts';

/** Mappers purs IGDB → formes normalisées (types = champs consommés, testés sur fixtures). */

const IMG = 'https://images.igdb.com/igdb/image/upload';

export function coverUrl(imageId: string | null | undefined): string | null {
  return imageId ? `${IMG}/t_cover_big/${imageId}.jpg` : null;
}

export function screenshotUrl(imageId: string): string {
  return `${IMG}/t_screenshot_big/${imageId}.jpg`;
}

function yearOf(unixSeconds: number | null | undefined): number | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).getUTCFullYear();
}

function isoDateOf(unixSeconds: number | null | undefined): string | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

export interface IgdbSearchGame {
  id: number;
  name: string;
  first_release_date?: number;
  cover?: { image_id: string };
}

export function mapGameSearchResult(game: IgdbSearchGame): SearchResultItem {
  return {
    mediaType: 'game',
    externalId: String(game.id),
    title: game.name,
    year: yearOf(game.first_release_date),
    posterUrl: coverUrl(game.cover?.image_id),
  };
}

export interface IgdbGameDetail {
  id: number;
  name: string;
  summary?: string;
  first_release_date?: number;
  genres?: Array<{ name: string }>;
  platforms?: Array<{ name: string }>;
  involved_companies?: Array<{
    company: { name: string };
    developer: boolean;
    publisher: boolean;
  }>;
  cover?: { image_id: string };
  screenshots?: Array<{ image_id: string }>;
}

export interface IgdbTimeToBeat {
  hastily?: number;
  normally?: number;
  completely?: number;
  count?: number;
}

/**
 * Correspondance IGDB → objectif de complétion Trackly (docs/cadrage/05) :
 * hastily = histoire principale, normally = histoire + annexes, completely = 100 %.
 */
export function mapTimeToBeat(ttb: IgdbTimeToBeat | undefined): TimeToBeat | null {
  if (!ttb) return null;
  const main = ttb.hastily ?? null;
  const mainExtra = ttb.normally ?? null;
  const completionist = ttb.completely ?? null;
  if (main === null && mainExtra === null && completionist === null) return null;
  return {
    mainSeconds: main,
    mainExtraSeconds: mainExtra,
    completionistSeconds: completionist,
    submissionCount: ttb.count ?? 0,
  };
}

export function mapGameDetail(game: IgdbGameDetail, ttb: IgdbTimeToBeat | undefined): GameDetail {
  const companies = game.involved_companies ?? [];
  return {
    mediaType: 'game',
    externalId: String(game.id),
    title: game.name,
    summary: game.summary ?? null,
    coverUrl: coverUrl(game.cover?.image_id),
    screenshotUrls: (game.screenshots ?? []).slice(0, 6).map((s) => screenshotUrl(s.image_id)),
    releaseDate: isoDateOf(game.first_release_date),
    genres: (game.genres ?? []).map((g) => g.name),
    platforms: (game.platforms ?? []).map((p) => p.name),
    developers: companies.filter((c) => c.developer).map((c) => c.company.name),
    publishers: companies.filter((c) => c.publisher).map((c) => c.company.name),
    timeToBeat: mapTimeToBeat(ttb),
  };
}
