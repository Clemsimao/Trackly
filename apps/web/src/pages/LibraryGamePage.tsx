import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import type {
  CompletionTarget,
  GameDurationsInput,
  GameEntryDetail,
  JournalEntry,
  OwnershipDetail,
  OwnershipStatus,
  UpdateOwnershipBody,
} from '@trackly/contracts';
import {
  completionTargetSchema,
  gameRemainingSeconds,
  ownershipStatusSchema,
} from '@trackly/contracts';
import {
  addOwnership,
  deleteGameEntry,
  deleteOwnership,
  getGameEntry,
  updateDurations,
  updateGameEntry,
  updateOwnership,
} from '../api/library';
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

export function LibraryGamePage() {
  const { entryId } = useParams({ from: '/bibliotheque/jeu/$entryId' });
  const { data, isPending, error } = useQuery({
    queryKey: ['library', 'game', entryId],
    queryFn: () => getGameEntry(entryId),
  });

  return (
    <LibraryShell isPending={isPending} error={error}>
      {data ? <GameEntryView entry={data} /> : null}
    </LibraryShell>
  );
}

function GameEntryView({ entry }: { entry: GameEntryDetail }) {
  const resumeNotes = entry.ownerships.filter((o) => o.resumeNote);
  return (
    <>
      <EntryHeader
        posterUrl={entry.work.coverUrl}
        title={entry.work.title}
        badge={fr.library.gameStatus[entry.status]}
        subtitle={entry.work.genres.join(' · ') || null}
      />

      {/* La note de reprise en évidence : la mémoire entre deux sessions (P2 < 60 s) */}
      {resumeNotes.length > 0 ? (
        <div className="mt-4 rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm">
          {resumeNotes.map((o) => (
            <p key={o.id}>
              <span className="font-semibold">📌 {o.platform} :</span> {o.resumeNote}
            </p>
          ))}
        </div>
      ) : null}

      <DurationsSection entry={entry} />
      <OwnershipsSection entry={entry} />
      <OpinionEditor
        initial={entry}
        onSave={(value) => updateGameEntry(entry.entryId, value)}
        invalidateKeys={[['library']]}
      />
      <JournalSection journal={entry.journal} />
      <DeleteEntryButton onDelete={() => deleteGameEntry(entry.entryId)} />
    </>
  );
}

// ── Durées avec provenance (exigence du cahier des charges) ─────────────────

const DURATION_FIELDS = [
  { key: 'main', bodyKey: 'mainSeconds', label: fr.media.ttbMain },
  { key: 'mainExtra', bodyKey: 'mainExtraSeconds', label: fr.media.ttbMainExtra },
  { key: 'completionist', bodyKey: 'completionistSeconds', label: fr.media.ttbCompletionist },
] as const;

function DurationsSection({ entry }: { entry: GameEntryDetail }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const initialHours = () =>
    Object.fromEntries(
      DURATION_FIELDS.map((field) => {
        const seconds = entry.durations[field.key].seconds;
        return [field.key, seconds ? String(Math.round((seconds / 3600) * 10) / 10) : ''];
      }),
    ) as Record<string, string>;
  const [hours, setHours] = useState(initialHours);

  const mutation = useMutation({
    mutationFn: () => {
      const initial = initialHours();
      const body: Record<string, number | null> = {};
      for (const field of DURATION_FIELDS) {
        if (hours[field.key] === initial[field.key]) continue; // inchangé : ne rien écraser
        const raw = hours[field.key]?.trim() ?? '';
        body[field.bodyKey] = raw === '' ? null : Math.round(Number(raw) * 3600);
      }
      return updateDurations(entry.entryId, body);
    },
    onSuccess: async () => {
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ['library', 'game', entry.entryId] });
    },
  });

  return (
    <Section title={fr.library.durations.title}>
      <div className="grid grid-cols-3 gap-3">
        {DURATION_FIELDS.map((field) => {
          const duration = entry.durations[field.key];
          return (
            <div
              key={field.key}
              className="rounded-xl border border-(--border) bg-(--bg) p-3 text-center"
            >
              <p className="text-xs text-(--text-muted)">{field.label}</p>
              {editing ? (
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={hours[field.key]}
                  onChange={(event) =>
                    setHours((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                  aria-label={`${field.label} (heures)`}
                  className={`mt-1 w-full text-center ${inputClass}`}
                />
              ) : (
                <p className="tabular mt-1 text-xl text-accent">
                  {duration.seconds ? `≈ ${formatHoursFromSeconds(duration.seconds)}` : '—'}
                </p>
              )}
              {duration.provenance ? (
                <p className="mt-1 text-xs text-(--text-muted)">
                  {fr.library.durations.provenance[duration.provenance]}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-(--text-muted)">
        {editing ? fr.library.durations.hint : fr.library.durations.provenanceLegend}
      </p>
      <div className="mt-3 flex gap-2">
        {editing ? (
          <>
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-strong disabled:opacity-60"
            >
              {mutation.isPending ? fr.library.savePending : fr.library.save}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setHours(initialHours());
              }}
              className="rounded-lg border border-(--border) px-4 py-2 text-sm hover:border-primary"
            >
              {fr.library.durations.cancel}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-(--border) px-4 py-2 text-sm hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
          >
            {fr.library.durations.edit}
          </button>
        )}
      </div>
    </Section>
  );
}

// ── Possessions et progression ──────────────────────────────────────────────

function OwnershipsSection({ entry }: { entry: GameEntryDetail }) {
  return (
    <Section title={fr.library.ownership.title}>
      <div className="space-y-4">
        {entry.ownerships.map((ownership) => (
          <OwnershipCard key={ownership.id} ownership={ownership} durations={entry.durations} />
        ))}
        <AddOwnershipForm entryId={entry.entryId} platforms={entry.work.platforms} />
      </div>
    </Section>
  );
}

function OwnershipCard({
  ownership,
  durations,
}: {
  ownership: OwnershipDetail;
  durations: GameDurationsInput;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    status: ownership.status as string,
    hoursPlayed: String(ownership.hoursPlayed || ''),
    progressPercent: ownership.progressPercent != null ? String(ownership.progressPercent) : '',
    nextObjective: ownership.nextObjective ?? '',
    resumeNote: ownership.resumeNote ?? '',
    completionTarget: ownership.completionTarget as string,
    journalNote: '',
    purchaseDate: ownership.purchaseDate ?? '',
    startedAt: ownership.startedAt ?? '',
    finishedAt: ownership.finishedAt ?? '',
    lastPlayedAt: ownership.lastPlayedAt ?? '',
    trophiesEarned: ownership.trophiesEarned != null ? String(ownership.trophiesEarned) : '',
    trophiesTotal: ownership.trophiesTotal != null ? String(ownership.trophiesTotal) : '',
  });
  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['library'] });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const body: UpdateOwnershipBody = {
        status: form.status as OwnershipStatus,
        hoursPlayed: form.hoursPlayed === '' ? 0 : Number(form.hoursPlayed),
        progressPercent: form.progressPercent === '' ? null : Number(form.progressPercent),
        nextObjective: form.nextObjective.trim() || null,
        resumeNote: form.resumeNote.trim() || null,
        completionTarget: form.completionTarget as UpdateOwnershipBody['completionTarget'],
        journalNote: form.journalNote.trim() || undefined,
        purchaseDate: form.purchaseDate || null,
        startedAt: form.startedAt || null,
        finishedAt: form.finishedAt || null,
        lastPlayedAt: form.lastPlayedAt || null,
        trophiesEarned: form.trophiesEarned === '' ? null : Number(form.trophiesEarned),
        trophiesTotal: form.trophiesTotal === '' ? null : Number(form.trophiesTotal),
      };
      return updateOwnership(ownership.id, body);
    },
    onSuccess: async () => {
      setForm((prev) => ({ ...prev, journalNote: '' }));
      await invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteOwnership(ownership.id),
    onSuccess: invalidate,
  });

  return (
    <form
      className="rounded-xl border border-(--border) bg-(--bg) p-4"
      onSubmit={(event) => {
        event.preventDefault();
        saveMutation.mutate();
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          🎮 {ownership.platform}
          <RemainingChip form={form} durations={durations} />
        </h3>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(fr.library.ownership.deleteConfirm)) deleteMutation.mutate();
          }}
          className="text-xs text-dropped hover:underline"
        >
          {fr.library.ownership.delete}
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-(--text-muted)">{fr.library.ownership.status}</span>
          <select
            value={form.status}
            onChange={(event) => set('status')(event.target.value)}
            className={inputClass}
          >
            {ownershipStatusSchema.options.map((value) => (
              <option key={value} value={value}>
                {fr.library.gameStatus[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-(--text-muted)">{fr.library.ownership.completionTarget}</span>
          <select
            value={form.completionTarget}
            onChange={(event) => set('completionTarget')(event.target.value)}
            className={inputClass}
          >
            {completionTargetSchema.options.map((value) => (
              <option key={value} value={value}>
                {fr.library.completionTarget[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-(--text-muted)">{fr.library.ownership.hours}</span>
          <input
            type="number"
            min="0"
            step="0.5"
            value={form.hoursPlayed}
            onChange={(event) => set('hoursPlayed')(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-(--text-muted)">{fr.library.ownership.progress}</span>
          <input
            type="number"
            min="0"
            max="100"
            value={form.progressPercent}
            onChange={(event) => set('progressPercent')(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-(--text-muted)">{fr.library.ownership.nextObjective}</span>
          <input
            value={form.nextObjective}
            onChange={(event) => set('nextObjective')(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-(--text-muted)">{fr.library.ownership.resumeNote}</span>
          <textarea
            value={form.resumeNote}
            onChange={(event) => set('resumeNote')(event.target.value)}
            rows={2}
            placeholder={fr.library.ownership.resumeNoteHint}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-(--text-muted)">{fr.library.ownership.journalNote}</span>
          <input
            value={form.journalNote}
            onChange={(event) => set('journalNote')(event.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-(--text-muted) hover:text-link">
          {fr.library.ownership.moreDetails}
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(
            [
              ['purchaseDate', fr.library.ownership.purchaseDate],
              ['startedAt', fr.library.ownership.startedAt],
              ['finishedAt', fr.library.ownership.finishedAt],
              ['lastPlayedAt', fr.library.ownership.lastPlayedAt],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex flex-col gap-1 text-sm">
              <span className="text-(--text-muted)">{label}</span>
              <input
                type="date"
                value={form[key]}
                onChange={(event) => set(key)(event.target.value)}
                className={inputClass}
              />
            </label>
          ))}
          <div className="flex items-end gap-2 text-sm sm:col-span-2">
            <label className="flex flex-col gap-1">
              <span className="text-(--text-muted)">{fr.library.ownership.trophies}</span>
              <input
                type="number"
                min="0"
                value={form.trophiesEarned}
                onChange={(event) => set('trophiesEarned')(event.target.value)}
                className={`w-24 ${inputClass}`}
              />
            </label>
            <span className="pb-2 text-(--text-muted)">{fr.library.ownership.trophiesOf}</span>
            <input
              type="number"
              min="0"
              aria-label={`${fr.library.ownership.trophies} (total)`}
              value={form.trophiesTotal}
              onChange={(event) => set('trophiesTotal')(event.target.value)}
              className={`w-24 ${inputClass}`}
            />
          </div>
        </div>
      </details>

      <div className="mt-4">
        <SaveButton pending={saveMutation.isPending} saved={saveMutation.isSuccess} />
      </div>
    </form>
  );
}

/** Temps restant vers l'objectif, recalculé en direct pendant la saisie (moteur partagé). */
function RemainingChip({
  form,
  durations,
}: {
  form: { status: string; completionTarget: string; hoursPlayed: string; progressPercent: string };
  durations: GameDurationsInput;
}) {
  const remaining = gameRemainingSeconds(durations, form.completionTarget as CompletionTarget, {
    status: form.status as OwnershipStatus,
    hoursPlayed: form.hoursPlayed === '' ? 0 : Number(form.hoursPlayed),
    progressPercent: form.progressPercent === '' ? null : Number(form.progressPercent),
  });
  if (remaining == null) return null;
  return (
    <span className="ml-2 rounded-full bg-primary/15 px-2.5 py-0.5 text-sm font-semibold text-link">
      ≈ {formatHoursFromSeconds(remaining)} {fr.library.budget.remainingSuffix}
    </span>
  );
}

function AddOwnershipForm({ entryId, platforms }: { entryId: string; platforms: string[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState(platforms[0] ?? '__other__');
  const [custom, setCustom] = useState('');
  const chosen = platform === '__other__' ? custom.trim() : platform;

  const mutation = useMutation({
    mutationFn: () => addOwnership(entryId, { platform: chosen, status: 'BACKLOG' }),
    onSuccess: async () => {
      setOpen(false);
      setCustom('');
      await queryClient.invalidateQueries({ queryKey: ['library'] });
    },
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-dashed border-(--border) px-4 py-2 text-sm text-(--text-muted) transition hover:border-primary hover:text-link focus-visible:outline-2 focus-visible:outline-primary"
      >
        {fr.library.ownership.addAction}
      </button>
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-(--border) p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (chosen) mutation.mutate();
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-(--text-muted)">{fr.library.ownership.addTitle}</span>
        <select
          value={platform}
          onChange={(event) => setPlatform(event.target.value)}
          className={inputClass}
        >
          {platforms.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
          <option value="__other__">{fr.library.platformOther}</option>
        </select>
      </label>
      {platform === '__other__' ? (
        <input
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          placeholder={fr.library.platformCustomPlaceholder}
          aria-label={fr.library.platformLabel}
          className={inputClass}
        />
      ) : null}
      <button
        type="submit"
        disabled={mutation.isPending || !chosen}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-strong disabled:opacity-60"
      >
        {mutation.isPending ? fr.library.addPending : fr.library.add}
      </button>
      {mutation.isError ? (
        <p role="alert" className="w-full text-sm text-dropped">
          {fr.auth.genericError}
        </p>
      ) : null}
    </form>
  );
}

// ── Journal ─────────────────────────────────────────────────────────────────

function JournalSection({ journal }: { journal: JournalEntry[] }) {
  return (
    <Section title={fr.library.journal.title}>
      {journal.length === 0 ? (
        <p className="text-sm text-(--text-muted)">{fr.library.journal.empty}</p>
      ) : (
        <ul className="space-y-2">
          {journal.map((update) => (
            <li
              key={update.id}
              className="rounded-lg border border-(--border) bg-(--bg) p-3 text-sm"
            >
              <p className="text-xs text-(--text-muted)">
                {new Date(update.createdAt).toLocaleDateString('fr-FR')} · {update.platform}
                {update.hoursPlayed != null ? ` · ${update.hoursPlayed} h` : ''}
                {update.progressPercent != null ? ` · ${update.progressPercent} %` : ''}
              </p>
              {update.note ? <p className="mt-1">{update.note}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
