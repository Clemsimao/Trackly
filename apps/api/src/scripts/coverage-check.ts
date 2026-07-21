/**
 * Test empirique de couverture (RT-5, docs/cadrage/13 — Lot 2).
 * Mesure sur un échantillon réel : durées IGDB disponibles ? synopsis TMDB en FR ?
 *
 * Usage (nécessite TMDB_API_TOKEN, IGDB_CLIENT_ID, IGDB_CLIENT_SECRET) :
 *   en dev   : pnpm --filter @trackly/api exec tsx src/scripts/coverage-check.ts
 *   en prod  : docker compose -f compose.prod.yml exec api node dist/scripts/coverage-check.js
 */
import { ConfigService } from '@nestjs/config';
import { IgdbClient } from '../catalog/providers/igdb.client';
import { TmdbClient } from '../catalog/providers/tmdb.client';

const GAMES = [
  'Elden Ring',
  'The Legend of Zelda: Tears of the Kingdom',
  'Baldur’s Gate 3',
  'God of War Ragnarök',
  'Hollow Knight',
  'Hades',
  'Cyberpunk 2077',
  'The Witcher 3',
  'Red Dead Redemption 2',
  'Ghost of Tsushima',
  'Horizon Forbidden West',
  'Stardew Valley',
  'Celeste',
  'Sekiro',
  'Bloodborne',
  'Persona 5 Royal',
  'Final Fantasy VII Rebirth',
  'Super Mario Odyssey',
  'Metroid Dread',
  'Silksong',
  'Clair Obscur: Expedition 33',
  'Astro Bot',
  'Balatro',
  'Disco Elysium',
  'Outer Wilds',
  'Returnal',
  'Death Stranding',
  'Alan Wake 2',
  'Split Fiction',
  'Doom Eternal',
];
const SERIES = [
  'Breaking Bad',
  'Dark',
  'Arcane',
  'The Last of Us',
  'Severance',
  'The Bear',
  'Fallout',
  'One Piece',
  'Stranger Things',
  'The Expanse',
  'Chernobyl',
  'Better Call Saul',
  'Andor',
  'Shogun',
  'The Wire',
  'Succession',
  'Peaky Blinders',
  'Lupin',
  'Le Bureau des légendes',
  'Dix pour cent',
];
const FILMS = [
  'Oppenheimer',
  'Dune : Deuxième partie',
  'Interstellar',
  'Parasite',
  'Le Voyage de Chihiro',
  'The Dark Knight',
  'Inception',
  'Everything Everywhere All at Once',
  'La Haine',
  'Amélie Poulain',
  'Blade Runner 2049',
  'Mad Max: Fury Road',
  'Whiplash',
  'Le Comte de Monte-Cristo',
  'Spider-Man: Across the Spider-Verse',
  'The Grand Budapest Hotel',
  'Drive',
  'Anatomie d’une chute',
  'Old Boy',
  'Seven',
];

function pct(n: number, total: number): string {
  return `${Math.round((n / total) * 100)} % (${n}/${total})`;
}

async function main() {
  const config = new ConfigService();
  const tmdb = new TmdbClient(config);
  const igdb = new IgdbClient(config);

  console.log('— Jeux (IGDB) —');
  let found = 0;
  let withTtb = 0;
  let withCover = 0;
  for (const name of GAMES) {
    try {
      const results = await igdb.searchGames(name);
      const first = results[0];
      if (!first) {
        console.log(`  ✗ introuvable : ${name}`);
        continue;
      }
      found++;
      const detail = await igdb.getGame(first.externalId);
      if (detail.coverUrl) withCover++;
      if (detail.timeToBeat?.mainSeconds || detail.timeToBeat?.mainExtraSeconds) {
        withTtb++;
      } else {
        console.log(`  ⚠ sans durées : ${name}`);
      }
    } catch (error) {
      console.log(`  ✗ erreur pour ${name} : ${String(error)}`);
    }
  }
  console.log(`  Trouvés : ${pct(found, GAMES.length)}`);
  console.log(`  Avec durées (game_time_to_beats) : ${pct(withTtb, found)}`);
  console.log(`  Avec jaquette : ${pct(withCover, found)}`);

  console.log('\n— Séries (TMDB) —');
  let sFound = 0;
  let sFr = 0;
  let sRuntime = 0;
  for (const name of SERIES) {
    try {
      const results = await tmdb.searchSeries(name);
      const first = results[0];
      if (!first) continue;
      sFound++;
      const detail = await tmdb.getSeries(first.externalId);
      if (detail.overview) sFr++;
      if (detail.episodeRunTimeMinutes) sRuntime++;
    } catch (error) {
      console.log(`  ✗ erreur pour ${name} : ${String(error)}`);
    }
  }
  console.log(`  Trouvées : ${pct(sFound, SERIES.length)}`);
  console.log(`  Synopsis FR : ${pct(sFr, sFound)}`);
  console.log(`  Durée d'épisode connue : ${pct(sRuntime, sFound)}`);

  console.log('\n— Films (TMDB) —');
  let fFound = 0;
  let fFr = 0;
  let fRuntime = 0;
  for (const name of FILMS) {
    try {
      const results = await tmdb.searchFilms(name);
      const first = results[0];
      if (!first) continue;
      fFound++;
      const detail = await tmdb.getFilm(first.externalId);
      if (detail.overview) fFr++;
      if (detail.runtimeMinutes) fRuntime++;
    } catch (error) {
      console.log(`  ✗ erreur pour ${name} : ${String(error)}`);
    }
  }
  console.log(`  Trouvés : ${pct(fFound, FILMS.length)}`);
  console.log(`  Synopsis FR : ${pct(fFr, fFound)}`);
  console.log(`  Durée connue : ${pct(fRuntime, fFound)}`);

  console.log('\n→ Reporter ces chiffres dans docs/cadrage/05 (point ouvert n°2).');
}

void main();
