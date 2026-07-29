import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import type { DashboardItem, DashboardResponse, MediaType } from '@trackly/contracts';
import { logout, meQueryOptions } from '../api/auth';
import { purgerCacheLocal } from '../api/persist';
import { getDashboard } from '../api/dashboard';
import { ApiStatus } from '../components/ApiStatus';
import { Icon, MEDIA_ICON } from '../components/Icon';
import { Poster } from '../components/Poster';
import { fr } from '../i18n/fr';
import { formatHoursFromSeconds } from '../utils/format';
import { useDocumentTitle } from '../utils/useDocumentTitle';
import { useDominantColor } from '../utils/useDominantColor';

const ITEM_PATH: Record<MediaType, string> = {
  game: '/bibliotheque/jeu/$entryId',
  series: '/bibliotheque/serie/$entryId',
  film: '/bibliotheque/film/$entryId',
  book: '/bibliotheque/livre/$entryId',
};

export function HomePage() {
  useDocumentTitle(fr.nav.home);
  const { data: user } = useSuspenseQuery(meQueryOptions);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      // Le cache hors ligne contient la bibliothèque : il ne survit pas à la déconnexion.
      await purgerCacheLocal(queryClient);
      queryClient.setQueryData(meQueryOptions.queryKey, null);
      await navigate({ to: '/connexion' });
    },
  });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:px-6 sm:py-10">
      <p className="eyebrow text-(--text-muted)">{fr.home.eyebrow}</p>
      <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        {fr.home.welcome} <span className="text-link">{user?.displayName}</span>
      </h1>

      <Link
        to="/recherche"
        className="mt-5 flex max-w-xl items-center gap-2.5 rounded-xl border border-(--border) bg-(--surface) px-4 py-2.5 text-sm text-(--text-muted) transition hover:border-primary hover:text-(--text) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Icon name="search" className="h-4 w-4" />
        {fr.home.searchCta}
      </Link>

      <DashboardOverview />

      <div className="mt-8 flex flex-wrap items-center gap-2.5 border-t border-(--border) pt-5">
        <Link
          to="/compte"
          className="rounded-lg border border-(--border) px-3.5 py-2 text-sm hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          {fr.account.link}
        </Link>
        <button
          type="button"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="rounded-lg border border-(--border) px-3.5 py-2 text-sm hover:border-primary focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
        >
          {fr.auth.logoutAction}
        </button>
        {/*
          Repère d'exploitation, réservé au compte exploitant : « API
          opérationnelle — v0.1.0 » est du vocabulaire de système, sans valeur
          pour qui utilise l'app. Le cas qui le concerne, être hors ligne, est
          déjà traité par le bandeau en haut de l'écran.
        */}
        {user?.isAdmin ? (
          <div className="ml-auto">
            <ApiStatus />
          </div>
        ) : null}
      </div>
    </main>
  );
}

/**
 * L'activité courante est l'information principale : la première entrée en
 * cours prend tout le bandeau, les suivantes s'alignent sur l'étagère en
 * dessous. Le budget temps ferme la page — visible, mais subordonné.
 */
function DashboardOverview() {
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard });
  if (!data) return null;

  const [hero, ...reste] = data.inProgress;

  return (
    <div className="mt-8">
      {hero ? <ResumeHero item={hero} /> : <EmptyResume />}

      {reste.length > 0 ? <Shelf items={reste} /> : null}

      <BudgetStrip data={data} />
    </div>
  );
}

/**
 * Rien en cours : une invitation, avec les deux issues possibles. Le lien vers
 * la bibliothèque doit rester présent ici — c'est la seule porte de sortie de
 * l'écran quand il n'y a rien à reprendre.
 */
function EmptyResume() {
  return (
    <section
      aria-labelledby="resume-heading"
      className="rounded-xl border border-dashed border-(--border) px-5 py-8 text-center"
    >
      <h2 id="resume-heading" className="font-display text-lg font-semibold">
        {fr.library.home.emptyTitle}
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-(--text-muted)">
        {fr.library.home.empty}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        <Link
          to="/bibliotheque"
          className="rounded-lg border border-(--border) px-3.5 py-2 text-sm font-medium transition hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {fr.library.home.seeLibrary}
        </Link>
        <Link
          to="/recherche"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Icon name="search" className="h-4 w-4" />
          {fr.library.emptyCta}
        </Link>
      </div>
    </section>
  );
}

/** Le bandeau « à reprendre » — teinté par la couleur dominante de l'affiche. */
function ResumeHero({ item }: { item: DashboardItem }) {
  const tint = useDominantColor(item.posterUrl);

  return (
    <section aria-labelledby="resume-heading">
      <Link
        to={ITEM_PATH[item.mediaType]}
        params={{ entryId: item.entryId }}
        style={tint ? ({ '--tint': tint } as React.CSSProperties) : undefined}
        className="tinted group block overflow-hidden rounded-xl border border-(--border) p-5 transition hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-7"
      >
        <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-8">
          <Poster
            url={item.posterUrl}
            title={item.title}
            className="aspect-[2/3] shadow-lg"
            sizes="(min-width: 640px) 11rem, 6.5rem"
          />
          <div className="min-w-0">
            <p className="eyebrow text-(--text-muted)">{fr.library.home.heroEyebrow}</p>
            <h2
              id="resume-heading"
              className="mt-1 font-display text-2xl leading-tight font-semibold sm:text-4xl"
            >
              {item.title}
            </h2>

            <p className="mt-2 flex items-center gap-1.5 text-sm text-(--text-muted)">
              <Icon name={MEDIA_ICON[item.mediaType]} className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {fr.media.typeLabel[item.mediaType]}
                {item.subtitle ? ` · ${item.subtitle}` : ''}
              </span>
            </p>

            <p className="mt-4 flex items-baseline gap-2">
              {item.remainingSeconds != null ? (
                <>
                  <span className="display-figure text-2xl sm:text-3xl">
                    {formatHoursFromSeconds(item.remainingSeconds)}
                  </span>
                  <span className="text-sm text-(--text-muted)">
                    {fr.library.home.heroRemaining}
                  </span>
                </>
              ) : (
                <span className="text-sm text-(--text-muted)">
                  {fr.library.home.heroRemainingUnknown}
                </span>
              )}
            </p>

            <span className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-primary-strong">
              <Icon name="play" className="h-4 w-4" />
              {fr.library.home.heroResume}
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}

/**
 * L'étagère : les autres œuvres commencées, posées côte à côte. Elle défile
 * horizontalement plutôt que de s'empiler — une rangée d'affiches se parcourt
 * du regard, une liste verticale se lit ligne à ligne.
 */
function Shelf({ items }: { items: DashboardItem[] }) {
  return (
    <section aria-labelledby="shelf-heading" className="mt-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="shelf-heading" className="font-display text-lg font-semibold">
          {fr.library.home.alsoInProgress}
        </h2>
        <Link
          to="/bibliotheque"
          className="shrink-0 text-xs font-semibold text-link hover:underline"
        >
          {fr.library.home.seeLibrary}
        </Link>
      </div>

      {/*
        Rangée défilante au doigt sur mobile ; à partir de sm la largeur suffit,
        l'étagère se range donc en grille qui retourne à la ligne. Sans ça un
        débordement de quelques pixels suffisait à faire apparaître la barre de
        défilement native — épaisse et à boutons flèches sous Windows.
      */}
      <ul className="scroll-discret mt-3 grid grid-flow-col justify-start gap-4 overflow-x-auto border-b border-(--border) pb-4 [grid-auto-columns:7rem] sm:grid-flow-row sm:grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] sm:gap-y-6 sm:overflow-x-visible">
        {items.map((item) => (
          <li key={`${item.mediaType}-${item.entryId}`}>
            <Link
              to={ITEM_PATH[item.mediaType]}
              params={{ entryId: item.entryId }}
              className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Poster
                url={item.posterUrl}
                title={item.title}
                className="aspect-[2/3] transition group-hover:-translate-y-0.5"
                sizes="8rem"
              />
              <p className="mt-2 line-clamp-2 min-h-[2.05rem] text-sm leading-snug font-semibold">
                {item.title}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-(--text-muted)">
                <Icon name={MEDIA_ICON[item.mediaType]} className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {item.remainingSeconds != null
                    ? formatHoursFromSeconds(item.remainingSeconds)
                    : fr.media.ttbUnknown}
                </span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface MediaLine {
  type: MediaType;
  label: string;
  seconds: number;
  ramp: string;
}

/**
 * Le budget temps — le chiffre propre à Trackly.
 *
 * Les quatre segments sont des CATÉGORIES, pas des états : ils sont donc peints
 * sur une rampe de gris et non avec les couleurs de statut. C'est l'icône qui
 * identifie le média.
 */
function BudgetStrip({ data }: { data: DashboardResponse }) {
  const lines = mediaLines(data);
  const totalLines = lines.reduce((sum, line) => sum + line.seconds, 0);

  return (
    <section
      aria-labelledby="budget-heading"
      className="mt-8 rounded-xl border border-(--border) bg-(--surface-raised) p-5 sm:px-7 sm:py-6"
    >
      {totalLines === 0 ? (
        <>
          <h2 id="budget-heading" className="font-display text-base font-semibold">
            {fr.library.budget.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-(--text-muted)">
            {fr.library.budget.empty}
          </p>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-(--text-muted)" id="budget-heading">
                {fr.library.budget.totalPrefix}
              </p>
              <p className="display-figure mt-1 text-4xl leading-none sm:text-5xl">
                {formatHoursFromSeconds(data.totalSeconds)}
              </p>
            </div>
            {data.totalEstimated ? (
              <p className="max-w-xs text-xs leading-relaxed text-(--text-muted)">
                {fr.library.budget.estimatedNote}
              </p>
            ) : null}
          </div>

          <div
            className="mt-5 flex h-2.5 gap-0.5 overflow-hidden rounded-full"
            role="img"
            aria-label={lines
              .filter((line) => line.seconds > 0)
              .map((line) => `${line.label} ${formatHoursFromSeconds(line.seconds)}`)
              .join(', ')}
          >
            {lines
              .filter((line) => line.seconds > 0)
              .map((line) => (
                <span
                  key={line.type}
                  className={line.ramp}
                  style={{ width: `${(line.seconds / totalLines) * 100}%` }}
                />
              ))}
          </div>

          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {lines.map((line) => (
              <li key={line.type} className="flex items-center gap-2">
                <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${line.ramp}`} />
                <Icon
                  name={MEDIA_ICON[line.type]}
                  className="h-4 w-4 shrink-0 text-(--text-muted)"
                />
                <span className="text-(--text-muted)">{line.label}</span>
                <span className="tabular font-semibold">
                  {line.seconds > 0 ? formatHoursFromSeconds(line.seconds) : '—'}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function mediaLines(data: DashboardResponse): MediaLine[] {
  const { games, series, films, books } = data;
  return [
    {
      type: 'game',
      label: fr.library.budget.games,
      seconds: games.inProgress.seconds + games.backlog.seconds,
      ramp: 'bg-(--ramp-1)',
    },
    {
      type: 'series',
      label: fr.library.budget.series,
      seconds: series.inProgress.seconds + series.toWatch.seconds,
      ramp: 'bg-(--ramp-2)',
    },
    {
      type: 'film',
      label: fr.library.budget.films,
      seconds: films.toWatch.seconds,
      ramp: 'bg-(--ramp-3)',
    },
    {
      type: 'book',
      label: fr.library.budget.books,
      seconds: books.inProgress.seconds + books.toRead.seconds,
      ramp: 'bg-(--ramp-4)',
    },
  ];
}
