import { useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ApiClientError } from '../../api/client';
import { fr } from '../../i18n/fr';

export function LibraryShell({
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
        <Link to="/bibliotheque" className="text-sm text-link hover:underline">
          {fr.library.backToLibrary}
        </Link>
      </p>
      {isPending ? (
        <div className="space-y-4" aria-hidden>
          <div className="h-40 animate-pulse rounded-2xl bg-(--border)/50" />
          <div className="h-6 w-2/3 animate-pulse rounded bg-(--border)/50" />
          <div className="h-24 animate-pulse rounded bg-(--border)/50" />
        </div>
      ) : error ? (
        <p role="alert" className="text-dropped">
          {error instanceof ApiClientError && error.statusCode === 404
            ? fr.media.notFound
            : fr.library.error}
        </p>
      ) : (
        children
      )}
    </main>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl border border-(--border) bg-(--surface) p-4">
      <h2 className="mb-3 font-display text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function EntryHeader({
  posterUrl,
  title,
  badge,
  subtitle,
}: {
  posterUrl: string | null;
  title: string;
  badge: string;
  subtitle?: string | null;
}) {
  return (
    <div className="flex items-start gap-4">
      {posterUrl ? (
        <img
          src={posterUrl}
          alt=""
          className="w-24 shrink-0 rounded-lg border border-(--border) shadow-md sm:w-28"
        />
      ) : null}
      <div>
        <span className="inline-block rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-link">
          {badge}
        </span>
        <h1 className="mt-1 font-display text-2xl font-semibold">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-(--text-muted)">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export const inputClass =
  'rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40';

export function SaveButton({ pending, saved }: { pending: boolean; saved: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-strong disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {pending ? fr.library.savePending : saved ? fr.library.saved : fr.library.save}
    </button>
  );
}

interface OpinionValue {
  rating: number | null;
  favorite: boolean;
  review: string | null;
  notes: string | null;
}

/** « Mon avis » — commun aux trois types : note /10, favori, critique, notes. */
export function OpinionEditor({
  initial,
  onSave,
  invalidateKeys,
}: {
  initial: OpinionValue;
  onSave: (value: OpinionValue) => Promise<void>;
  invalidateKeys: string[][];
}) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(initial.rating);
  const [favorite, setFavorite] = useState(initial.favorite);
  const [review, setReview] = useState(initial.review ?? '');
  const [notes, setNotes] = useState(initial.notes ?? '');

  const mutation = useMutation({
    mutationFn: () =>
      onSave({ rating, favorite, review: review.trim() || null, notes: notes.trim() || null }),
    onSuccess: async () => {
      await Promise.all(
        invalidateKeys.map((key) => queryClient.invalidateQueries({ queryKey: key })),
      );
    },
  });

  return (
    <Section title={fr.library.opinion.title}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-(--text-muted)">{fr.library.opinion.rating}</span>
            <select
              value={rating ?? ''}
              onChange={(event) =>
                setRating(event.target.value === '' ? null : Number(event.target.value))
              }
              className={inputClass}
            >
              <option value="">{fr.library.opinion.noRating}</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
                <option key={value} value={value}>
                  {value}/10
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setFavorite((v) => !v)}
            aria-pressed={favorite}
            className={`rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline-2 focus-visible:outline-primary ${
              favorite
                ? 'border-paused bg-paused/15 text-paused'
                : 'border-(--border) bg-(--surface) hover:border-paused'
            }`}
          >
            {favorite ? '⭐' : '☆'} {fr.library.opinion.favorite}
          </button>
        </div>
        <label className="block text-sm">
          <span className="text-(--text-muted)">{fr.library.opinion.review}</span>
          <textarea
            value={review}
            onChange={(event) => setReview(event.target.value)}
            rows={3}
            className={`mt-1 w-full ${inputClass}`}
          />
        </label>
        <label className="block text-sm">
          <span className="text-(--text-muted)">{fr.library.opinion.notes}</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            className={`mt-1 w-full ${inputClass}`}
          />
        </label>
        <SaveButton pending={mutation.isPending} saved={mutation.isSuccess} />
      </form>
    </Section>
  );
}

/** Suppression avec confirmation, puis retour à la bibliothèque. */
export function DeleteEntryButton({ onDelete }: { onDelete: () => Promise<void> }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: onDelete,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['library'] });
      await navigate({ to: '/bibliotheque' });
    },
  });

  return (
    <button
      type="button"
      disabled={mutation.isPending}
      onClick={() => {
        if (window.confirm(fr.library.removeConfirm)) mutation.mutate();
      }}
      className="mt-8 rounded-lg border border-dropped/40 px-4 py-2 text-sm text-dropped transition hover:bg-dropped/10 focus-visible:outline-2 focus-visible:outline-dropped"
    >
      {fr.library.remove}
    </button>
  );
}
