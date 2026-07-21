import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import type { FilmEntryDetail, FilmStatus } from '@trackly/contracts';
import { filmStatusSchema } from '@trackly/contracts';
import { deleteFilmEntry, getFilmEntry, updateFilmEntry } from '../api/library';
import {
  DeleteEntryButton,
  EntryHeader,
  LibraryShell,
  OpinionEditor,
  SaveButton,
  Section,
  inputClass,
} from '../components/library/shared';
import { fr } from '../i18n/fr';
import { formatMinutes } from '../utils/format';

export function LibraryFilmPage() {
  const { entryId } = useParams({ from: '/bibliotheque/film/$entryId' });
  const { data, isPending, error } = useQuery({
    queryKey: ['library', 'film', entryId],
    queryFn: () => getFilmEntry(entryId),
  });

  return (
    <LibraryShell isPending={isPending} error={error}>
      {data ? <FilmEntryView entry={data} /> : null}
    </LibraryShell>
  );
}

function FilmEntryView({ entry }: { entry: FilmEntryDetail }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>(entry.status);
  const [watchedAt, setWatchedAt] = useState(entry.watchedAt ?? '');
  const [rewatch, setRewatch] = useState(entry.rewatch);
  const [watchedWith, setWatchedWith] = useState(entry.watchedWith ?? '');

  const mutation = useMutation({
    mutationFn: () =>
      updateFilmEntry(entry.entryId, {
        status: status as FilmStatus,
        watchedAt: watchedAt || null,
        rewatch,
        watchedWith: watchedWith.trim() || null,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['library'] }),
  });

  const subtitle = [
    entry.work.genres.join(' · ') || null,
    entry.work.runtimeMinutes ? formatMinutes(entry.work.runtimeMinutes) : null,
  ]
    .filter(Boolean)
    .join(' — ');

  return (
    <>
      <EntryHeader
        posterUrl={entry.work.posterUrl}
        title={entry.work.title}
        badge={fr.library.filmStatus[entry.status]}
        subtitle={subtitle || null}
      />

      <Section title={fr.media.status}>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <div role="group" aria-label={fr.media.status} className="flex flex-wrap gap-2">
            {filmStatusSchema.options.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                aria-pressed={status === value}
                className={`rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline-2 focus-visible:outline-primary ${
                  status === value
                    ? 'border-primary bg-primary text-white'
                    : 'border-(--border) bg-(--bg) hover:border-primary'
                }`}
              >
                {fr.library.filmStatus[value]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {status === 'SEEN' ? (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-(--text-muted)">{fr.library.film.watchedAt}</span>
                  <input
                    type="date"
                    value={watchedAt}
                    onChange={(event) => setWatchedAt(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-(--text-muted)">{fr.library.film.watchedWith}</span>
                  <input
                    value={watchedWith}
                    onChange={(event) => setWatchedWith(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={rewatch}
                    onChange={(event) => setRewatch(event.target.checked)}
                    className="size-4 accent-(--color-primary)"
                  />
                  {fr.library.film.rewatch}
                </label>
              </>
            ) : null}
          </div>

          <SaveButton pending={mutation.isPending} saved={mutation.isSuccess} />
        </form>
      </Section>

      <OpinionEditor
        initial={entry}
        onSave={(value) => updateFilmEntry(entry.entryId, value)}
        invalidateKeys={[['library']]}
      />
      <DeleteEntryButton onDelete={() => deleteFilmEntry(entry.entryId)} />
    </>
  );
}
