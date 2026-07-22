import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import type { SeasonState, SeriesEntryDetail, SeriesStatus } from '@trackly/contracts';
import { seriesRemaining, seriesStatusSchema } from '@trackly/contracts';
import {
  deleteSeriesEntry,
  getSeasonEpisodes,
  getSeriesEntry,
  markEpisode,
  markSeason,
  unmarkEpisode,
  unmarkSeason,
  updateSeriesEntry,
} from '../api/library';
import {
  DeleteEntryButton,
  EntryHeader,
  LibraryShell,
  OpinionEditor,
  Section,
  inputClass,
} from '../components/library/shared';
import { fr } from '../i18n/fr';
import { formatHoursFromSeconds, formatMinutes } from '../utils/format';

export function LibrarySeriesPage() {
  const { entryId } = useParams({ from: '/bibliotheque/serie/$entryId' });
  const { data, isPending, error } = useQuery({
    queryKey: ['library', 'series', entryId],
    queryFn: () => getSeriesEntry(entryId),
  });

  return (
    <LibraryShell isPending={isPending} error={error}>
      {data ? <SeriesEntryView entry={data} /> : null}
    </LibraryShell>
  );
}

function SeriesEntryView({ entry }: { entry: SeriesEntryDetail }) {
  const queryClient = useQueryClient();
  const percent =
    entry.totalEpisodes > 0 ? Math.round((entry.watchedEpisodes / entry.totalEpisodes) * 100) : 0;

  const statusMutation = useMutation({
    mutationFn: (status: SeriesStatus) => updateSeriesEntry(entry.entryId, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['library'] }),
  });

  return (
    <>
      <EntryHeader
        posterUrl={entry.work.posterUrl}
        title={entry.work.title}
        badge={fr.library.seriesStatus[entry.status]}
        subtitle={entry.work.genres.join(' · ') || null}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-(--text-muted)">{fr.media.status}</span>
          <select
            value={entry.status}
            onChange={(event) => statusMutation.mutate(event.target.value as SeriesStatus)}
            disabled={statusMutation.isPending}
            className={inputClass}
          >
            {seriesStatusSchema.options.map((value) => (
              <option key={value} value={value}>
                {fr.library.seriesStatus[value]}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-(--text-muted)">
          {fr.library.series.progress} : {entry.watchedEpisodes}/{entry.totalEpisodes}{' '}
          {fr.media.episodes} ({percent} %)
        </p>
        <RemainingBadge entry={entry} />
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-2 h-2 overflow-hidden rounded-full bg-(--border)/60"
      >
        <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>

      <Section title={fr.media.seasons}>
        <div className="space-y-2">
          {entry.seasons.map((season) => (
            <SeasonRow key={season.seasonNumber} entryId={entry.entryId} season={season} />
          ))}
        </div>
      </Section>

      <OpinionEditor
        initial={entry}
        onSave={(value) => updateSeriesEntry(entry.entryId, value)}
        invalidateKeys={[['library']]}
      />
      <DeleteEntryButton onDelete={() => deleteSeriesEntry(entry.entryId)} />
    </>
  );
}

/**
 * Estimation côté client : les runtimes réels des épisodes non chargés sont
 * inconnus ici, d'où le repli sur la durée moyenne (le tableau de bord, lui,
 * utilise les épisodes réels en base).
 */
function RemainingBadge({ entry }: { entry: SeriesEntryDetail }) {
  if (entry.watchedEpisodes >= entry.totalEpisodes) return null;
  const remaining = seriesRemaining({
    totalEpisodes: entry.totalEpisodes,
    watchedEpisodes: entry.watchedEpisodes,
    knownUnwatchedRuntimesMinutes: [],
    knownEpisodes: entry.watchedEpisodes,
    seriesRuntimeMinutes: entry.work.episodeRunTimeMinutes,
  });
  return (
    <span className="rounded-full bg-primary/15 px-2.5 py-1 text-sm font-semibold text-link">
      ≈ {formatHoursFromSeconds(remaining.seconds)} {fr.library.budget.remainingSuffix}
    </span>
  );
}

function SeasonRow({ entryId, season }: { entryId: string; season: SeasonState }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const complete = season.watchedCount >= season.episodeCount && season.episodeCount > 0;

  const { data, isPending, isError } = useQuery({
    queryKey: ['library', 'series', entryId, 'season', season.seasonNumber],
    queryFn: () => getSeasonEpisodes(entryId, season.seasonNumber),
    enabled: open,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['library'] });

  const episodeMutation = useMutation({
    mutationFn: ({ episodeId, watched }: { episodeId: string; watched: boolean }) =>
      watched ? unmarkEpisode(entryId, episodeId) : markEpisode(entryId, episodeId),
    onSuccess: invalidate,
  });

  const seasonMutation = useMutation({
    mutationFn: (mark: boolean) =>
      mark ? markSeason(entryId, season.seasonNumber) : unmarkSeason(entryId, season.seasonNumber),
    onSuccess: invalidate,
  });

  return (
    <div className="rounded-xl border border-(--border) bg-(--bg)">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:text-link focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span className="font-medium">
          {complete ? '✅ ' : ''}
          {season.name}
        </span>
        <span className="text-(--text-muted)">
          {season.watchedCount}/{season.episodeCount} · {open ? '▾' : '▸'}
        </span>
      </button>

      {open ? (
        <div className="border-t border-(--border) p-3">
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => seasonMutation.mutate(true)}
              disabled={seasonMutation.isPending}
              className="rounded-lg border border-(--border) px-3 py-1.5 text-xs hover:border-primary disabled:opacity-60"
            >
              {fr.library.series.markAll}
            </button>
            <button
              type="button"
              onClick={() => seasonMutation.mutate(false)}
              disabled={seasonMutation.isPending}
              className="rounded-lg border border-(--border) px-3 py-1.5 text-xs hover:border-primary disabled:opacity-60"
            >
              {fr.library.series.unmarkAll}
            </button>
          </div>
          {isPending ? (
            <div className="space-y-1.5" aria-hidden>
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-(--border)/50" />
              ))}
            </div>
          ) : isError ? (
            <p role="alert" className="text-sm text-dropped">
              {fr.library.series.episodesError}
            </p>
          ) : data ? (
            <ul className="space-y-1">
              {data.episodes.map((episode) => (
                <li key={episode.id}>
                  <button
                    type="button"
                    disabled={!episode.aired || episodeMutation.isPending}
                    onClick={() =>
                      episodeMutation.mutate({ episodeId: episode.id, watched: episode.watched })
                    }
                    aria-pressed={episode.watched}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-primary ${
                      episode.watched ? 'text-(--text-muted)' : ''
                    } ${episode.aired ? 'hover:bg-(--surface)' : 'opacity-50'}`}
                  >
                    <span aria-hidden className="w-5 text-center">
                      {episode.watched ? '✅' : '⬜'}
                    </span>
                    <span className="w-10 shrink-0 text-xs text-(--text-muted)">
                      E{String(episode.episodeNumber).padStart(2, '0')}
                    </span>
                    <span className={`flex-1 truncate ${episode.watched ? 'line-through' : ''}`}>
                      {episode.name}
                    </span>
                    <span className="shrink-0 text-xs text-(--text-muted)">
                      {!episode.aired
                        ? fr.library.series.notAired
                        : episode.runtimeMinutes
                          ? formatMinutes(episode.runtimeMinutes)
                          : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
