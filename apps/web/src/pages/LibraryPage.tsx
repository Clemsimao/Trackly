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
import { Icon, MEDIA_ICON, type IconName } from '../components/Icon';
import { Poster } from '../components/Poster';
import { Select } from '../components/Select';
import { fr } from '../i18n/fr';
import { formatMinutes } from '../utils/format';
import { useDocumentTitle } from '../utils/useDocumentTitle';

type TypeFilter = MediaType | 'all';
type SortKey = 'recent' | 'title';

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

/**
 * Les fournisseurs livrent le même genre en deux langues (IGDB en anglais, TMDB
 * en français) : « Adventure » et « Aventure » apparaissaient en double dans le
 * filtre. On replie les doublons connus sur un libellé canonique, appliqué à la
 * fois aux options ET au filtrage pour que la sélection reste cohérente.
 */
const GENRE_CANON: Record<string, string> = {
  adventure: 'Aventure',
  aventure: 'Aventure',
};

function canonGenre(raw: string): string {
  return GENRE_CANON[raw.toLowerCase()] ?? raw;
}

/**
 * La couleur code le STATUT — et seulement lui. Les états « pas encore
 * commencé » (envie, backlog, à voir, à lire) restent volontairement neutres :
 * un gris n'est pas une absence de repère, c'est le repère juste.
 */
const STATUS_COLOR: Record<string, string> = {
  PLAYING: 'bg-progress',
  WATCHING: 'bg-progress',
  READING: 'bg-progress',
  FINISHED: 'bg-done',
  COMPLETED: 'bg-done',
  SEEN: 'bg-done',
  DROPPED: 'bg-dropped',
  DISLIKED: 'bg-dropped',
  REJECTED: 'bg-dropped',
  PAUSED: 'bg-paused',
};

const NEUTRAL_STATUS = 'bg-(--ramp-3)';

export function LibraryPage() {
  useDocumentTitle(fr.library.title);
  const { data, isPending, isError } = useQuery({ queryKey: ['library'], queryFn: getLibrary });
  const [type, setType] = useState<TypeFilter>('all');
  const [status, setStatus] = useState('');
  const [genre, setGenre] = useState('');
  const [platform, setPlatform] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('recent');

  const rows = useMemo(() => (data ? toRows(data) : []), [data]);

  const filtered = rows
    .filter(
      (row) =>
        (type === 'all' || row.mediaType === type) &&
        (!status || row.status === status) &&
        (!genre || row.genres.some((g) => canonGenre(g) === genre)) &&
        (!platform || row.platforms.includes(platform)) &&
        (!favoritesOnly || row.favorite),
    )
    .sort((a, b) =>
      sort === 'title'
        ? a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' })
        : b.updatedAt.localeCompare(a.updatedAt),
    );

  const typedRows = type === 'all' ? rows : rows.filter((row) => row.mediaType === type);
  const genres = [...new Set(typedRows.flatMap((row) => row.genres.map(canonGenre)))].sort();
  const platforms = [...new Set(rows.flatMap((row) => row.platforms))].sort();

  // Un compteur par onglet : on sait ce qu'on va filtrer avant de cliquer.
  const countFor = (value: TypeFilter) =>
    value === 'all' ? rows.length : rows.filter((row) => row.mediaType === value).length;

  const resetFilters = () => {
    setType('all');
    setStatus('');
    setGenre('');
    setPlatform('');
    setFavoritesOnly(false);
  };

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-6 sm:px-6">
      <h1 className="mb-4 font-display text-2xl font-semibold">{fr.library.title}</h1>

      <div role="group" aria-label="Filtrer par type" className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((filter) => (
          <FilterPill
            key={filter.value}
            active={type === filter.value}
            onClick={() => {
              setType(filter.value);
              setStatus('');
              setGenre('');
            }}
            icon={filter.value === 'all' ? undefined : MEDIA_ICON[filter.value]}
            count={countFor(filter.value)}
          >
            {filter.label}
          </FilterPill>
        ))}
        <FilterPill
          active={favoritesOnly}
          onClick={() => setFavoritesOnly((v) => !v)}
          icon="star"
          count={rows.filter((row) => row.favorite).length}
        >
          {fr.library.filters.favorites}
        </FilterPill>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {type !== 'all' ? (
          <Select value={status} onChange={setStatus} label={fr.media.status}>
            <option value="">{fr.library.filters.anyStatus}</option>
            {Object.entries(STATUS_OPTIONS[type]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        ) : null}
        {genres.length > 0 ? (
          <Select value={genre} onChange={setGenre} label={fr.media.genres}>
            <option value="">{fr.library.filters.anyGenre}</option>
            {genres.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        ) : null}
        {(type === 'all' || type === 'game') && platforms.length > 0 ? (
          <Select value={platform} onChange={setPlatform} label={fr.media.platforms}>
            <option value="">{fr.library.filters.anyPlatform}</option>
            {platforms.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        ) : null}
        <Select
          value={sort}
          onChange={(value) => setSort(value as SortKey)}
          label={fr.library.filters.sort}
        >
          <option value="recent">{fr.library.filters.sortRecent}</option>
          <option value="title">{fr.library.filters.sortTitle}</option>
        </Select>

        {rows.length > 0 ? (
          <span className="tabular ml-auto text-sm text-(--text-muted)">
            {filtered.length}{' '}
            {filtered.length > 1 ? fr.library.counts.works : fr.library.counts.work}
          </span>
        ) : null}
      </div>

      <div className="mt-6" aria-live="polite">
        {isPending ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-x-4 gap-y-6">
            {Array.from({ length: 12 }, (_, i) => (
              <li key={i} aria-hidden>
                <div className="aspect-[2/3] animate-pulse rounded-lg bg-(--border)/50" />
                <div className="mt-2 h-3 animate-pulse rounded bg-(--border)/50" />
              </li>
            ))}
          </ul>
        ) : isError ? (
          <p role="alert" className="text-dropped">
            {fr.library.error}
          </p>
        ) : rows.length === 0 ? (
          <EmptyLibrary />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-(--border) px-4 py-8 text-center">
            <p className="text-(--text-muted)">{fr.library.emptyFiltered}</p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-3 rounded-lg border border-(--border) px-3.5 py-2 text-sm font-medium transition hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {fr.library.emptyFilteredCta}
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-x-4 gap-y-6">
            {filtered.map((row) => (
              <LibraryCard key={row.key} row={row} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function FilterPill({
  active,
  onClick,
  icon,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: IconName;
  count: number;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        active
          ? 'border-primary bg-primary font-semibold text-white'
          : 'border-(--border) bg-(--surface) hover:border-primary'
      }`}
    >
      {icon ? (
        <Icon name={icon} className={`h-3.5 w-3.5 ${active ? '' : 'text-(--text-muted)'}`} />
      ) : null}
      {children}
      <span className={`tabular text-xs ${active ? 'text-white/75' : 'text-(--text-muted)'}`}>
        {count}
      </span>
    </button>
  );
}

function LibraryCard({ row }: { row: Row }) {
  const statusClass = STATUS_COLOR[row.status] ?? NEUTRAL_STATUS;
  const details = [
    row.progress,
    row.platforms.join(', ') || null,
    row.rating ? `${row.rating}/10` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li>
      <Link
        to={DETAIL_PATH[row.mediaType]}
        params={{ entryId: row.entryId }}
        className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Poster
          url={row.posterUrl}
          title={row.title}
          statusClass={statusClass}
          className="aspect-[2/3] transition group-hover:-translate-y-0.5"
          sizes="8rem"
        />
        <p className="mt-2 line-clamp-2 min-h-[2.15rem] text-sm leading-snug font-semibold">
          {row.title}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-(--text-muted)">
          <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusClass}`} />
          <span className="truncate">{row.statusLabel}</span>
          {row.favorite ? <Icon name="star" className="h-3 w-3 shrink-0 text-paused" /> : null}
          <Icon name={MEDIA_ICON[row.mediaType]} className="ml-auto h-3.5 w-3.5 shrink-0" />
        </p>
        {details ? <p className="truncate text-xs text-(--text-muted)">{details}</p> : null}
      </Link>
    </li>
  );
}

/** Écran vide : un titre, ce que ça apporte, et l'action. Pas un constat. */
function EmptyLibrary() {
  return (
    <div className="rounded-xl border border-dashed border-(--border) px-6 py-10 text-center">
      <Icon name="library" className="mx-auto h-8 w-8 text-(--text-muted)" />
      <h2 className="mt-3 font-display text-lg font-semibold">{fr.library.emptyTitle}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-(--text-muted)">
        {fr.library.emptyHint}
      </p>
      <Link
        to="/recherche"
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Icon name="search" className="h-4 w-4" />
        {fr.library.emptyCta}
      </Link>
    </div>
  );
}
