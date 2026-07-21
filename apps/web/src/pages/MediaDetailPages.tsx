import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import type { TimeToBeat } from '@trackly/contracts';
import { getFilmDetail, getGameDetail, getSeriesDetail } from '../api/catalog';
import { ApiClientError } from '../api/client';
import { AddToLibraryPanel } from '../components/library/AddToLibrary';
import { fr } from '../i18n/fr';
import { formatHoursFromSeconds, formatMinutes } from '../utils/format';

// ── Blocs partagés ──────────────────────────────────────────────────────────

function DetailShell({
  isPending,
  error,
  children,
}: {
  isPending: boolean;
  error: unknown;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-6">
      <p className="mb-4">
        <Link to="/recherche" className="text-sm text-primary hover:underline">
          {fr.media.backToSearch}
        </Link>
      </p>
      {isPending ? (
        <div className="space-y-4" aria-hidden>
          <div className="h-56 animate-pulse rounded-2xl bg-(--border)/50" />
          <div className="h-6 w-2/3 animate-pulse rounded bg-(--border)/50" />
          <div className="h-24 animate-pulse rounded bg-(--border)/50" />
        </div>
      ) : error ? (
        <p role="alert" className="text-dropped">
          {error instanceof ApiClientError && error.statusCode === 404
            ? fr.media.notFound
            : fr.search.error}
        </p>
      ) : (
        children
      )}
    </main>
  );
}

function MetaRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <p className="text-sm">
      <span className="text-(--text-muted)">{label} : </span>
      {value}
    </p>
  );
}

function Chips({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-(--border) bg-(--surface) px-2.5 py-0.5 text-xs"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

/** Les trois durées de complétion — le différenciateur de Trackly. */
function TimeToBeatCards({ ttb }: { ttb: TimeToBeat | null }) {
  const entries = [
    { label: fr.media.ttbMain, seconds: ttb?.mainSeconds ?? null },
    { label: fr.media.ttbMainExtra, seconds: ttb?.mainExtraSeconds ?? null },
    { label: fr.media.ttbCompletionist, seconds: ttb?.completionistSeconds ?? null },
  ];
  return (
    <section aria-label={fr.media.ttbTitle} className="mt-6">
      <h2 className="mb-2 text-lg font-semibold">{fr.media.ttbTitle}</h2>
      <div className="grid grid-cols-3 gap-3">
        {entries.map((entry) => (
          <div
            key={entry.label}
            className="rounded-xl border border-(--border) bg-(--surface) p-3 text-center"
          >
            <p className="text-xs text-(--text-muted)">{entry.label}</p>
            <p className="mt-1 text-xl font-bold text-primary">
              {entry.seconds ? `≈ ${formatHoursFromSeconds(entry.seconds)}` : '—'}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-(--text-muted)">
        {ttb
          ? `${ttb.submissionCount} ${fr.media.ttbSubmissions} · ${fr.media.ttbSource}`
          : `${fr.media.ttbUnknown} — ${fr.media.ttbSource}`}
      </p>
    </section>
  );
}

function Hero({
  backdropUrl,
  posterUrl,
  title,
}: {
  backdropUrl: string | null;
  posterUrl: string | null;
  title: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-(--border) bg-(--surface)">
      {backdropUrl ? (
        <img src={backdropUrl} alt="" className="h-48 w-full object-cover opacity-60 sm:h-64" />
      ) : (
        <div className="h-24" aria-hidden />
      )}
      <div className="flex items-end gap-4 p-4 sm:absolute sm:inset-x-0 sm:bottom-0">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt=""
            className="-mt-16 w-24 shrink-0 rounded-lg border border-(--border) shadow-md sm:mt-0 sm:w-28"
          />
        ) : null}
        <h1 className="pb-1 text-2xl font-bold drop-shadow-sm">{title}</h1>
      </div>
    </div>
  );
}

// ── Pages ───────────────────────────────────────────────────────────────────

export function GameDetailPage() {
  const { id } = useParams({ from: '/media/game/$id' });
  const { data, isPending, error } = useQuery({
    queryKey: ['catalog', 'game', id],
    queryFn: () => getGameDetail(id),
  });

  return (
    <DetailShell isPending={isPending} error={error}>
      {data ? (
        <>
          <Hero
            backdropUrl={data.screenshotUrls[0] ?? null}
            posterUrl={data.coverUrl}
            title={data.title}
          />
          <AddToLibraryPanel mediaType="game" externalId={id} platforms={data.platforms} />
          <div className="mt-4 space-y-2">
            <Chips items={data.genres} />
            <MetaRow label={fr.media.releaseDate} value={data.releaseDate} />
            <MetaRow label={fr.media.platforms} value={data.platforms.join(', ') || null} />
            <MetaRow label={fr.media.developers} value={data.developers.join(', ') || null} />
            <MetaRow label={fr.media.publishers} value={data.publishers.join(', ') || null} />
          </div>
          <TimeToBeatCards ttb={data.timeToBeat} />
          {data.summary ? (
            <section className="mt-6">
              <p className="text-sm leading-relaxed text-(--text-muted)">{data.summary}</p>
              <p className="mt-1 text-xs italic text-(--text-muted)">{fr.media.summaryEnNote}</p>
            </section>
          ) : null}
          <p className="mt-8 text-xs text-(--text-muted)">{fr.media.attributionIgdb}</p>
        </>
      ) : null}
    </DetailShell>
  );
}

export function FilmDetailPage() {
  const { id } = useParams({ from: '/media/film/$id' });
  const { data, isPending, error } = useQuery({
    queryKey: ['catalog', 'film', id],
    queryFn: () => getFilmDetail(id),
  });

  return (
    <DetailShell isPending={isPending} error={error}>
      {data ? (
        <>
          <Hero backdropUrl={data.backdropUrl} posterUrl={data.posterUrl} title={data.title} />
          <AddToLibraryPanel mediaType="film" externalId={id} />
          <div className="mt-4 space-y-2">
            <Chips items={data.genres} />
            <MetaRow label={fr.media.releaseDate} value={data.releaseDate} />
            <MetaRow
              label={fr.media.runtime}
              value={data.runtimeMinutes ? formatMinutes(data.runtimeMinutes) : null}
            />
            <MetaRow
              label={fr.media.rating}
              value={data.rating ? `${data.rating.toFixed(1)}/10` : null}
            />
          </div>
          {data.overview ? (
            <p className="mt-6 text-sm leading-relaxed text-(--text-muted)">{data.overview}</p>
          ) : null}
          <p className="mt-8 text-xs text-(--text-muted)">{fr.media.attributionTmdb}</p>
        </>
      ) : null}
    </DetailShell>
  );
}

export function SeriesDetailPage() {
  const { id } = useParams({ from: '/media/series/$id' });
  const { data, isPending, error } = useQuery({
    queryKey: ['catalog', 'series', id],
    queryFn: () => getSeriesDetail(id),
  });

  return (
    <DetailShell isPending={isPending} error={error}>
      {data ? (
        <>
          <Hero backdropUrl={data.backdropUrl} posterUrl={data.posterUrl} title={data.title} />
          <AddToLibraryPanel mediaType="series" externalId={id} />
          <div className="mt-4 space-y-2">
            <Chips items={data.genres} />
            <MetaRow label={fr.media.releaseDate} value={data.firstAirDate} />
            <MetaRow label={fr.media.status} value={data.status} />
            <MetaRow
              label={fr.media.runtime}
              value={
                data.episodeRunTimeMinutes
                  ? `${formatMinutes(data.episodeRunTimeMinutes)} / épisode`
                  : null
              }
            />
            <MetaRow
              label={fr.media.rating}
              value={data.rating ? `${data.rating.toFixed(1)}/10` : null}
            />
          </div>
          <section className="mt-6">
            <h2 className="mb-2 text-lg font-semibold">{fr.media.seasons}</h2>
            <ul className="space-y-1.5">
              {data.seasons.map((season) => (
                <li
                  key={season.seasonNumber}
                  className="flex items-center justify-between rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-sm"
                >
                  <span>{season.name}</span>
                  <span className="text-(--text-muted)">
                    {season.episodeCount} {fr.media.episodes}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          {data.overview ? (
            <p className="mt-6 text-sm leading-relaxed text-(--text-muted)">{data.overview}</p>
          ) : null}
          <p className="mt-8 text-xs text-(--text-muted)">{fr.media.attributionTmdb}</p>
        </>
      ) : null}
    </DetailShell>
  );
}
