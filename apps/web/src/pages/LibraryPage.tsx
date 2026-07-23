import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type {
  LibraryBookItem,
  LibraryFilmItem,
  LibraryGameItem,
  LibraryResponse,
  LibrarySeriesItem,
  MediaType,
} from '@trackly/contracts';
import { getLibrary } from '../api/library';
import { fr } from '../i18n/fr';
import { formatMinutes } from '../utils/format';

type TypeFilter = MediaType | 'all';

const TYPE_FILTERS: Array<{ value: TypeFilter; label: string }> = [
  { value: 'all', label: fr.library.filters.all },
  { value: 'game', label: fr.library.filters.games },
  { value: 'series', label: fr.library.filters.series },
  { value: 'film', label: fr.library.filters.films },
  { value: 'book', label: fr.library.filters.books },
];

const STATUS_OPTIONS: Record<MediaType, Record<string, string>> = {
  game: fr.library.gameStatus,
  series: fr.library.seriesStatus,
  film: fr.library.filmStatus,
  book: fr.library.bookStatus,
};

/** Ligne homogène pour l'affichage et le filtrage, quel que soit le type. */
interface Row {
  key: string;
  mediaType: MediaType;
  entryId: string;
  title: string;
  posterUrl: string | null;
  year: number | null;
  genres: string[];
  status: string;
  statusLabel: string;
  favorite: boolean;
  rating: number | null;
  progress: string | null;
  platforms: string[];
  updatedAt: string;
}

function toRows(library: LibraryResponse): Row[] {
  const games = library.games.map((item: LibraryGameItem): Row => ({
    key: `game-${item.entryId}`,
    mediaType: 'game',
    entryId: item.entryId,
    title: item.work.title,
    posterUrl: item.work.posterUrl,
    year: item.work.year,
    genres: item.work.genres,
    status: item.status,
    statusLabel: fr.library.gameStatus[item.status],
    favorite: item.favorite,
    rating: item.rating,
    progress: gameProgress(item),
    platforms: item.ownerships.map((o) => o.platform),
    updatedAt: item.updatedAt,
  }));
  const series = library.series.map((item: LibrarySeriesItem): Row => ({
    key: `series-${item.entryId}`,
    mediaType: 'series',
    entryId: item.entryId,
    title: item.work.title,
    posterUrl: item.work.posterUrl,
    year: item.work.year,
    genres: item.work.genres,
    status: item.status,
    statusLabel: fr.library.seriesStatus[item.status],
    favorite: item.favorite,
    rating: item.rating,
    progress: item.totalEpisodes > 0 ? `${item.watchedEpisodes}/${item.totalEpisodes} ép.` : null,
    platforms: [],
    updatedAt: item.updatedAt,
  }));
  const films = library.films.map((item: LibraryFilmItem): Row => ({
    key: `film-${item.entryId}`,
    mediaType: 'film',
    entryId: item.entryId,
    title: item.work.title,
    posterUrl: item.work.posterUrl,
    year: item.work.year,
    genres: item.work.genres,
    status: item.status,
    statusLabel: fr.library.filmStatus[item.status],
    favorite: item.favorite,
    rating: item.rating,
    progress: item.runtimeMinutes ? formatMinutes(item.runtimeMinutes) : null,
    platforms: [],
    updatedAt: item.updatedAt,
  }));
  const books = library.books.map((item: LibraryBookItem): Row => ({
    key: `book-${item.entryId}`,
    mediaType: 'book',
    entryId: item.entryId,
    title: item.work.title,
    posterUrl: item.work.posterUrl,
    year: item.work.year,
    genres: item.work.genres,
    status: item.status,
    statusLabel: fr.library.bookStatus[item.status],
    favorite: item.favorite,
    rating: item.rating,
    progress:
      item.pagesTotal != null && item.currentPage > 0
        ? `${fr.library.book.pagesShort} ${item.currentPage}/${item.pagesTotal}`
        : null,
    platforms: [],
    updatedAt: item.updatedAt,
  }));
  return [...games, ...series, ...films, ...books].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

function gameProgress(item: LibraryGameItem): string | null {
  const active =
    item.ownerships.find((o) => o.status === 'PLAYING') ??
    item.ownerships.find((o) => o.status === 'PAUSED') ??
    item.ownerships[0];
  if (!active) return null;
  const parts: string[] = [];
  if (active.hoursPlayed > 0) parts.push(`${active.hoursPlayed} ${fr.library.counts.hours}`);
  if (active.progressPercent != null) parts.push(`${active.progressPercent} %`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

const DETAIL_PATH: Record<MediaType, string> = {
  game: '/bibliotheque/jeu/$entryId',
  series: '/bibliotheque/serie/$entryId',
  film: '/bibliotheque/film/$entryId',
  book: '/bibliotheque/livre/$entryId',
};

const STATUS_BADGE: Record<string, string> = {
  PLAYING: 'bg-progress/15 text-progress',
  WATCHING: 'bg-progress/15 text-progress',
  READING: 'bg-progress/15 text-progress',
  FINISHED: 'bg-done/15 text-done',
  COMPLETED: 'bg-done/15 text-done',
  SEEN: 'bg-done/15 text-done',
  DROPPED: 'bg-dropped/15 text-dropped',
  DISLIKED: 'bg-dropped/15 text-dropped',
  REJECTED: 'bg-dropped/15 text-dropped',
  PAUSED: 'bg-paused/15 text-paused',
};

export function LibraryPage() {
  const { data, isPending, isError } = useQuery({ queryKey: ['library'], queryFn: getLibrary });
  const [type, setType] = useState<TypeFilter>('all');
  const [status, setStatus] = useState('');
  const [genre, setGenre] = useState('');
  const [platform, setPlatform] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const rows = useMemo(() => (data ? toRows(data) : []), [data]);

  const filtered = rows.filter(
    (row) =>
      (type === 'all' || row.mediaType === type) &&
      (!status || row.status === status) &&
      (!genre || row.genres.includes(genre)) &&
      (!platform || row.platforms.includes(platform)) &&
      (!favoritesOnly || row.favorite),
  );

  const typedRows = type === 'all' ? rows : rows.filter((row) => row.mediaType === type);
  const genres = [...new Set(typedRows.flatMap((row) => row.genres))].sort();
  const platforms = [...new Set(rows.flatMap((row) => row.platforms))].sort();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-6">
      <h1 className="mb-4 font-display text-2xl font-semibold">{fr.library.title}</h1>

      <div role="group" aria-label="Filtrer par type" className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => {
              setType(filter.value);
              setStatus('');
              setGenre('');
            }}
            aria-pressed={type === filter.value}
            className={`rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline-2 focus-visible:outline-primary ${
              type === filter.value
                ? 'border-primary bg-primary text-white'
                : 'border-(--border) bg-(--surface) hover:border-primary'
            }`}
          >
            {filter.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setFavoritesOnly((v) => !v)}
          aria-pressed={favoritesOnly}
          className={`rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline-2 focus-visible:outline-primary ${
            favoritesOnly
              ? 'border-primary bg-primary text-white'
              : 'border-(--border) bg-(--surface) hover:border-primary'
          }`}
        >
          {fr.library.filters.favorites}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {type !== 'all' ? (
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label={fr.media.status}
            className="rounded-lg border border-(--border) bg-(--surface) px-3 py-1.5 text-sm"
          >
            <option value="">{fr.library.filters.anyStatus}</option>
            {Object.entries(STATUS_OPTIONS[type]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ) : null}
        {genres.length > 0 ? (
          <select
            value={genre}
            onChange={(event) => setGenre(event.target.value)}
            aria-label={fr.media.genres}
            className="rounded-lg border border-(--border) bg-(--surface) px-3 py-1.5 text-sm"
          >
            <option value="">{fr.library.filters.anyGenre}</option>
            {genres.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : null}
        {(type === 'all' || type === 'game') && platforms.length > 0 ? (
          <select
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
            aria-label={fr.media.platforms}
            className="rounded-lg border border-(--border) bg-(--surface) px-3 py-1.5 text-sm"
          >
            <option value="">{fr.library.filters.anyPlatform}</option>
            {platforms.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="mt-6" aria-live="polite">
        {isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-(--border)/50" aria-hidden />
            ))}
          </div>
        ) : isError ? (
          <p role="alert" className="text-dropped">
            {fr.library.error}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-(--text-muted)">
            {fr.library.empty}{' '}
            <Link to="/recherche" className="font-semibold text-link hover:underline">
              {fr.nav.search} →
            </Link>
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-(--text-muted)">{fr.library.emptyFiltered}</p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((row) => (
              <li key={row.key}>
                <Link
                  to={DETAIL_PATH[row.mediaType]}
                  params={{ entryId: row.entryId }}
                  className="flex gap-4 rounded-xl border border-(--border) bg-(--surface) p-3 transition hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-(--border)/40">
                    {row.posterUrl ? (
                      <img
                        src={row.posterUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl" aria-hidden>
                        🎲
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[row.status] ?? 'bg-primary/15 text-link'}`}
                      >
                        {row.statusLabel}
                      </span>
                      <span className="text-xs text-(--text-muted)">
                        {fr.media.typeLabel[row.mediaType]}
                      </span>
                      {row.favorite ? (
                        <span aria-label={fr.library.opinion.favorite}>⭐</span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate font-semibold">
                      {row.title}
                      {row.year ? (
                        <span className="ml-2 text-sm font-normal text-(--text-muted)">
                          {row.year}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-sm text-(--text-muted)">
                      {[
                        row.progress,
                        row.platforms.join(', ') || null,
                        row.rating ? `★ ${row.rating}/10` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
