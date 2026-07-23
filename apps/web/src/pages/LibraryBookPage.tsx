import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import type { BookEntryDetail, BookStatus } from '@trackly/contracts';
import { bookStatusSchema } from '@trackly/contracts';
import { deleteBookEntry, getBookEntry, updateBookEntry } from '../api/library';
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
import { formatHoursFromSeconds } from '../utils/format';

export function LibraryBookPage() {
  const { entryId } = useParams({ from: '/bibliotheque/livre/$entryId' });
  const { data, isPending, error } = useQuery({
    queryKey: ['library', 'book', entryId],
    queryFn: () => getBookEntry(entryId),
  });

  return (
    <LibraryShell isPending={isPending} error={error}>
      {data ? <BookEntryView key={data.entryId + data.currentPage} entry={data} /> : null}
    </LibraryShell>
  );
}

function BookEntryView({ entry }: { entry: BookEntryDetail }) {
  const subtitle = [
    entry.work.authors.join(', ') || null,
    entry.pagesTotal != null ? `${entry.pagesTotal} ${fr.media.pages.toLowerCase()}` : null,
  ]
    .filter(Boolean)
    .join(' — ');

  return (
    <>
      <EntryHeader
        posterUrl={entry.work.coverUrl}
        title={entry.work.title}
        badge={fr.library.bookStatus[entry.status]}
        subtitle={subtitle || null}
      />

      <RemainingTime entry={entry} />
      <ProgressEditor entry={entry} />
      <EditionEditor entry={entry} />
      <Journal entry={entry} />

      <OpinionEditor
        initial={entry}
        onSave={(value) => updateBookEntry(entry.entryId, value)}
        invalidateKeys={[['library']]}
      />
      <DeleteEntryButton onDelete={() => deleteBookEntry(entry.entryId)} />
    </>
  );
}

/** Le chiffre qui justifie la verticale : combien d'heures de lecture restent. */
function RemainingTime({ entry }: { entry: BookEntryDetail }) {
  return (
    <Section title={fr.library.book.remainingTitle}>
      {entry.remainingSeconds != null ? (
        <>
          <p className="display-figure text-4xl leading-none">
            {formatHoursFromSeconds(entry.remainingSeconds)}
          </p>
          <p className="mt-2 text-xs text-(--text-muted)">
            {entry.pagesPerHour != null
              ? `${Math.round(entry.pagesPerHour)} ${fr.library.book.speedUnit} — ${fr.library.book.speedCalibrated}`
              : fr.library.book.speedDefault}
          </p>
        </>
      ) : (
        <p className="text-sm text-(--text-muted)">{fr.library.book.remainingUnknown}</p>
      )}
    </Section>
  );
}

/** Statut + progression : page ou %, note de reprise, durée de session (calibration). */
function ProgressEditor({ entry }: { entry: BookEntryDetail }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>(entry.status);
  const [currentPage, setCurrentPage] = useState(String(entry.currentPage || ''));
  const [progressPercent, setProgressPercent] = useState(
    entry.progressPercent != null ? String(entry.progressPercent) : '',
  );
  const [resumeNote, setResumeNote] = useState(entry.resumeNote ?? '');
  const [minutesRead, setMinutesRead] = useState('');
  const [journalNote, setJournalNote] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const page = Number(currentPage);
      const percent = progressPercent === '' ? null : Number(progressPercent);
      const minutes = Number(minutesRead);
      return updateBookEntry(entry.entryId, {
        status: status as BookStatus,
        // N'envoie que ce qui a changé : chaque champ transmis crée une ligne de journal
        ...(Number.isFinite(page) && page !== entry.currentPage ? { currentPage: page } : {}),
        ...(percent !== entry.progressPercent ? { progressPercent: percent } : {}),
        resumeNote: resumeNote.trim() || null,
        ...(Number.isInteger(minutes) && minutes > 0 ? { minutesRead: minutes } : {}),
        ...(journalNote.trim() ? { journalNote: journalNote.trim() } : {}),
      });
    },
    onSuccess: async () => {
      setMinutesRead('');
      setJournalNote('');
      await queryClient.invalidateQueries({ queryKey: ['library'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return (
    <Section title={fr.library.book.progressTitle}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div role="group" aria-label={fr.media.status} className="flex flex-wrap gap-2">
          {bookStatusSchema.options.map((value) => (
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
              {fr.library.bookStatus[value]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-(--text-muted)">{fr.library.book.currentPage}</span>
            <input
              type="number"
              min={0}
              max={entry.pagesTotal ?? 20000}
              value={currentPage}
              onChange={(event) => setCurrentPage(event.target.value)}
              className={`w-28 ${inputClass}`}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-(--text-muted)">{fr.library.book.progressPercent}</span>
            <input
              type="number"
              min={0}
              max={100}
              value={progressPercent}
              onChange={(event) => setProgressPercent(event.target.value)}
              title={fr.library.book.progressPercentHint}
              className={`w-24 ${inputClass}`}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-(--text-muted)">{fr.library.book.minutesRead}</span>
            <input
              type="number"
              min={1}
              max={1440}
              value={minutesRead}
              onChange={(event) => setMinutesRead(event.target.value)}
              className={`w-28 ${inputClass}`}
            />
          </label>
        </div>
        <p className="text-xs text-(--text-muted)">{fr.library.book.minutesReadHint}</p>

        <label className="block text-sm">
          <span className="text-(--text-muted)">{fr.library.book.resumeNote}</span>
          <input
            value={resumeNote}
            onChange={(event) => setResumeNote(event.target.value)}
            placeholder={fr.library.book.resumeNoteHint}
            className={`mt-1 w-full ${inputClass}`}
          />
        </label>

        <label className="block text-sm">
          <span className="text-(--text-muted)">{fr.library.book.journalNote}</span>
          <input
            value={journalNote}
            onChange={(event) => setJournalNote(event.target.value)}
            className={`mt-1 w-full ${inputClass}`}
          />
        </label>

        <SaveButton pending={mutation.isPending} saved={mutation.isSuccess} />
      </form>
    </Section>
  );
}

/** Pages de MON édition (décision docs/cadrage/17) : médiane OL par défaut, valeur perso sinon. */
function EditionEditor({ entry }: { entry: BookEntryDetail }) {
  const queryClient = useQueryClient();
  const [pagesTotal, setPagesTotal] = useState(
    entry.pagesTotal != null ? String(entry.pagesTotal) : '',
  );
  const [isbn, setIsbn] = useState(entry.editionIsbn ?? '');

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['library'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const mutation = useMutation({
    mutationFn: () => {
      const pages = Number(pagesTotal);
      return updateBookEntry(entry.entryId, {
        ...(Number.isInteger(pages) && pages > 0 && pages !== entry.pagesTotal
          ? { pagesTotal: pages }
          : {}),
        editionIsbn: isbn.trim() || null,
      });
    },
    onSuccess: invalidate,
  });

  const resetMutation = useMutation({
    mutationFn: () => updateBookEntry(entry.entryId, { pagesTotal: null }),
    onSuccess: invalidate,
  });

  return (
    <Section title={fr.library.book.editionTitle}>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-(--text-muted)">
            {fr.library.book.pagesTotal}{' '}
            <span className="italic">
              (
              {entry.pagesSource === 'manual'
                ? fr.library.book.pagesManual
                : fr.library.book.pagesAuto}
              )
            </span>
          </span>
          <input
            type="number"
            min={1}
            max={20000}
            value={pagesTotal}
            onChange={(event) => setPagesTotal(event.target.value)}
            title={fr.library.book.pagesHint}
            className={`w-28 ${inputClass}`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-(--text-muted)">{fr.library.book.isbn}</span>
          <input
            value={isbn}
            onChange={(event) => setIsbn(event.target.value)}
            className={`w-44 ${inputClass}`}
          />
        </label>
        <SaveButton pending={mutation.isPending} saved={mutation.isSuccess} />
        {entry.pagesSource === 'manual' ? (
          <button
            type="button"
            disabled={resetMutation.isPending}
            onClick={() => resetMutation.mutate()}
            className="rounded-lg border border-(--border) px-3 py-2 text-sm hover:border-primary focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
          >
            {fr.library.book.pagesReset}
          </button>
        ) : null}
      </form>
      <p className="mt-2 text-xs text-(--text-muted)">{fr.library.book.pagesHint}</p>
    </Section>
  );
}

function Journal({ entry }: { entry: BookEntryDetail }) {
  return (
    <Section title={fr.library.journal.title}>
      {entry.journal.length === 0 ? (
        <p className="text-sm text-(--text-muted)">{fr.library.journal.empty}</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {entry.journal.map((update) => (
            <li
              key={update.id}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-lg border border-(--border) bg-(--bg) px-3 py-2"
            >
              <span className="text-xs text-(--text-muted)">
                {new Date(update.createdAt).toLocaleDateString('fr-FR')}
              </span>
              {update.currentPage != null ? (
                <span>
                  {fr.library.book.pagesShort} {update.currentPage}
                </span>
              ) : null}
              {update.progressPercent != null ? <span>{update.progressPercent} %</span> : null}
              {update.minutesRead != null ? (
                <span className="text-(--text-muted)">{update.minutesRead} min</span>
              ) : null}
              {update.note ? <span className="text-(--text-muted)">{update.note}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
