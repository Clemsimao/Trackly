import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  filmStatusSchema,
  gameStatusSchema,
  seriesStatusSchema,
  type AddedResponse,
  type GameStatus,
  type SearchResultItem,
} from '@trackly/contracts';
import { addFilm, addGame, addSeries } from '../../api/library';
import { existingEntryId } from '../../api/client';
import { fr } from '../../i18n/fr';
import { isShelfType, type ShelfMediaType } from '../../utils/mediaTypes';

/** Chemin de la fiche bibliothèque pour un type de média (hors livres, cf. mediaTypes). */
export const LIBRARY_PATH: Record<ShelfMediaType, string> = {
  game: '/bibliotheque/jeu/$entryId',
  film: '/bibliotheque/film/$entryId',
  series: '/bibliotheque/serie/$entryId',
};

function addWithDefaults(item: SearchResultItem): Promise<AddedResponse> {
  // Statuts par défaut du cahier des charges : jeu → envie, film/série → à voir
  if (item.mediaType === 'game') return addGame({ igdbId: item.externalId });
  if (item.mediaType === 'film') return addFilm({ tmdbId: item.externalId });
  return addSeries({ tmdbId: item.externalId });
}

/**
 * Ajout en 1 interaction depuis une carte de résultat (story B2 : « 2 taps »
 * recherche comprise). Après ajout — ou si déjà présent — devient un lien vers la fiche.
 */
export function QuickAddButton({ item }: { item: SearchResultItem }) {
  const queryClient = useQueryClient();
  const [entryId, setEntryId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => addWithDefaults(item),
    onSuccess: async (added) => {
      setEntryId(added.entryId);
      await queryClient.invalidateQueries({ queryKey: ['library'] });
    },
    onError: (error) => {
      const existing = existingEntryId(error);
      if (existing) setEntryId(existing);
    },
  });

  // Les livres sont écartés en amont (SearchPage) ; ce filet garantit le typage.
  if (!isShelfType(item.mediaType)) return null;

  if (entryId) {
    return (
      <Link
        to={LIBRARY_PATH[item.mediaType]}
        params={{ entryId }}
        onClick={(event) => event.stopPropagation()}
        aria-label={fr.library.openEntry}
        title={fr.library.openEntry}
        className="absolute right-2 top-2 z-10 rounded-full bg-done px-2.5 py-1 text-sm font-bold text-white shadow-md focus-visible:outline-2 focus-visible:outline-primary"
      >
        ✓
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={mutation.isPending}
      aria-label={fr.library.quickAdd}
      title={fr.library.quickAdd}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        mutation.mutate();
      }}
      className="absolute right-2 top-2 z-10 rounded-full bg-primary px-2.5 py-1 text-sm font-bold text-white shadow-md transition hover:bg-primary-strong disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {mutation.isPending ? '…' : '+'}
    </button>
  );
}

const GAME_STATUSES = gameStatusSchema.options;
const SERIES_STATUSES = seriesStatusSchema.options;
const FILM_STATUSES = filmStatusSchema.options;

interface PanelProps {
  // Monté uniquement sur les fiches jeu/série/film ; les livres n'ont pas encore
  // de fiche côté front (cf. mediaTypes), d'où ShelfMediaType et non MediaType.
  mediaType: ShelfMediaType;
  externalId: string;
  /** Plateformes connues du jeu (IGDB) — proposées au choix, avec saisie libre. */
  platforms?: string[];
}

/** Panneau d'ajout complet des fiches catalogue : statut précis + plateforme (jeux). */
export function AddToLibraryPanel({ mediaType, externalId, platforms = [] }: PanelProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>(mediaType === 'game' ? 'WISHLIST' : 'TO_WATCH');
  const [platform, setPlatform] = useState<string>(platforms[0] ?? '__other__');
  const [customPlatform, setCustomPlatform] = useState('');
  const [existing, setExisting] = useState<string | null>(null);

  const statuses: readonly string[] =
    mediaType === 'game' ? GAME_STATUSES : mediaType === 'series' ? SERIES_STATUSES : FILM_STATUSES;
  const statusLabels: Record<string, string> =
    mediaType === 'game'
      ? fr.library.gameStatus
      : mediaType === 'series'
        ? fr.library.seriesStatus
        : fr.library.filmStatus;
  const needsPlatform = mediaType === 'game' && status !== 'WISHLIST';
  const chosenPlatform = platform === '__other__' ? customPlatform.trim() : platform;

  const mutation = useMutation({
    mutationFn: () => {
      if (mediaType === 'game') {
        return addGame({
          igdbId: externalId,
          status: status as GameStatus,
          platform: needsPlatform ? chosenPlatform : undefined,
        });
      }
      if (mediaType === 'film') {
        return addFilm({ tmdbId: externalId, status: status as never });
      }
      return addSeries({ tmdbId: externalId, status: status as never });
    },
    onSuccess: async (added) => {
      await queryClient.invalidateQueries({ queryKey: ['library'] });
      await navigate({ to: LIBRARY_PATH[mediaType], params: { entryId: added.entryId } });
    },
    onError: (error) => {
      const entryId = existingEntryId(error);
      if (entryId) setExisting(entryId);
    },
  });

  if (existing) {
    return (
      <div className="mt-6 rounded-xl border border-(--border) bg-(--surface) p-4">
        <p className="text-sm">{fr.library.alreadyInLibrary}.</p>
        <Link
          to={LIBRARY_PATH[mediaType]}
          params={{ entryId: existing }}
          className="mt-1 inline-block text-sm font-semibold text-link hover:underline"
        >
          {fr.library.openEntry}
        </Link>
      </div>
    );
  }

  return (
    <form
      className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-(--border) bg-(--surface) p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (needsPlatform && !chosenPlatform) return;
        mutation.mutate();
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-(--text-muted)">{fr.library.addAs}</span>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-lg border border-(--border) bg-(--bg) px-3 py-2"
        >
          {statuses.map((value) => (
            <option key={value} value={value}>
              {statusLabels[value]}
            </option>
          ))}
        </select>
      </label>

      {needsPlatform ? (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-(--text-muted)">{fr.library.platformLabel}</span>
            <select
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              className="rounded-lg border border-(--border) bg-(--bg) px-3 py-2"
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
              value={customPlatform}
              onChange={(event) => setCustomPlatform(event.target.value)}
              placeholder={fr.library.platformCustomPlaceholder}
              aria-label={fr.library.platformLabel}
              className="rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm"
            />
          ) : null}
        </>
      ) : null}

      <button
        type="submit"
        disabled={mutation.isPending || (needsPlatform && !chosenPlatform)}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-strong disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {mutation.isPending ? fr.library.addPending : fr.library.add}
      </button>

      {mutation.isError && !existing ? (
        <p role="alert" className="w-full text-sm text-dropped">
          {fr.auth.genericError}
        </p>
      ) : null}
    </form>
  );
}
