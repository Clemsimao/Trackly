import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import type { DashboardItem, DashboardResponse, MediaType } from '@trackly/contracts';
import { logout, meQueryOptions } from '../api/auth';
import { purgerCacheLocal } from '../api/persist';
import { getDashboard } from '../api/dashboard';
import { ApiStatus } from '../components/ApiStatus';
import { fr } from '../i18n/fr';
import { formatHoursFromSeconds } from '../utils/format';

export function HomePage() {
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
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <p className="eyebrow text-(--text-muted)">{fr.home.eyebrow}</p>
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
        {fr.home.welcome} <span className="text-link">{user?.displayName}</span>
      </h1>

      <Link
        to="/recherche"
        className="mt-5 flex items-center gap-3 rounded-xl border border-(--border) bg-(--surface) px-4 py-3 text-(--text-muted) transition hover:border-primary hover:text-(--text) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span aria-hidden className="text-lg">
          🔍
        </span>
        {fr.home.searchCta}
      </Link>

      <BudgetLedger />

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-(--border) pt-5">
        <Link
          to="/compte"
          className="rounded-lg border border-(--border) px-4 py-2 text-sm hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          {fr.account.link}
        </Link>
        <button
          type="button"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="rounded-lg border border-(--border) px-4 py-2 text-sm hover:border-primary focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
        >
          {fr.auth.logoutAction}
        </button>
        <div className="ml-auto">
          <ApiStatus />
        </div>
      </div>
    </main>
  );
}

/**
 * La signature de Trackly : ton budget temps traité comme le solde d'un carnet.
 * Total en gros chiffre-héros (serif), sous-soldes par média alignés au cordeau
 * en typo tabulaire — un relevé de tes loisirs restants.
 */
function BudgetLedger() {
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard });
  if (!data) return null;

  const totalCount =
    data.games.inProgress.count +
    data.games.backlog.count +
    data.games.wishlist.count +
    data.series.inProgress.count +
    data.series.toWatch.count +
    data.films.toWatch.count;

  if (totalCount === 0) {
    return (
      <section className="mt-8" aria-label={fr.library.budget.title}>
        <LedgerHeading />
        <p className="mt-3 text-sm text-(--text-muted)">{fr.library.budget.empty}</p>
        <SeeLibraryLink />
      </section>
    );
  }

  const lines = mediaLines(data);

  return (
    <section className="mt-8" aria-label={fr.library.budget.title}>
      <LedgerHeading />

      <div className="mt-3 rounded-xl border border-(--border) bg-(--surface) p-5 sm:p-6">
        <p className="eyebrow text-(--text-muted)">{fr.library.budget.totalPrefix}</p>
        <p className="display-figure mt-1.5 text-5xl leading-none sm:text-6xl">
          {formatHoursFromSeconds(data.totalSeconds)}
        </p>
        {data.totalEstimated ? (
          <p className="mt-2 text-xs text-(--text-muted)">{fr.library.budget.estimatedNote}</p>
        ) : null}

        {/* Le relevé : une ligne par média, heures alignées à droite */}
        <dl className="mt-5 divide-y divide-(--border) border-t border-(--border)">
          {lines.map((line) => (
            <div key={line.label} className="flex items-baseline justify-between gap-4 py-3">
              <dt>
                <span className="font-display font-medium">
                  <span aria-hidden className="mr-2">
                    {line.icon}
                  </span>
                  {line.label}
                </span>
                <span className="mt-0.5 block text-xs text-(--text-muted)">{line.caption}</span>
              </dt>
              <dd className="tabular shrink-0 text-lg font-semibold text-(--text)">
                {line.seconds > 0 ? formatHoursFromSeconds(line.seconds) : '—'}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {data.inProgress.length > 0 ? (
        <div className="mt-6">
          <p className="eyebrow text-(--text-muted)">{fr.library.home.inProgress}</p>
          <ul className="mt-3 space-y-2.5">
            {data.inProgress.map((item) => (
              <InProgressRow key={`${item.mediaType}-${item.entryId}`} item={item} />
            ))}
          </ul>
        </div>
      ) : null}

      <SeeLibraryLink />
    </section>
  );
}

function LedgerHeading() {
  return <h2 className="font-display text-xl font-semibold">{fr.library.budget.title}</h2>;
}

function SeeLibraryLink() {
  return (
    <Link
      to="/bibliotheque"
      className="mt-4 inline-block text-sm font-semibold text-link hover:underline"
    >
      {fr.library.home.seeLibrary}
    </Link>
  );
}

interface MediaLine {
  icon: string;
  label: string;
  seconds: number;
  caption: string;
}

function mediaLines(data: DashboardResponse): MediaLine[] {
  const { games, series, films } = data;
  return [
    {
      icon: '🎮',
      label: fr.library.budget.games,
      seconds: games.inProgress.seconds + games.backlog.seconds,
      caption: `${games.inProgress.count} ${fr.library.budget.inProgressLabel} · ${games.backlog.count} ${fr.library.budget.backlogLabel} · ${games.wishlist.count} ${fr.library.budget.wishlistLabel}`,
    },
    {
      icon: '📺',
      label: fr.library.budget.series,
      seconds: series.inProgress.seconds + series.toWatch.seconds,
      caption: `${series.inProgress.count} ${fr.library.budget.inProgressLabel} · ${series.toWatch.count} ${fr.library.budget.toWatchLabel}`,
    },
    {
      icon: '🎬',
      label: fr.library.budget.films,
      seconds: films.toWatch.seconds,
      caption: `${films.toWatch.count} ${fr.library.budget.toWatchLabel}`,
    },
  ];
}

const ITEM_PATH: Record<MediaType, string> = {
  game: '/bibliotheque/jeu/$entryId',
  series: '/bibliotheque/serie/$entryId',
  film: '/bibliotheque/film/$entryId',
};

const ITEM_ICON: Record<MediaType, string> = {
  game: '🎮',
  series: '📺',
  film: '🎬',
};

function InProgressRow({ item }: { item: DashboardItem }) {
  return (
    <li>
      <Link
        to={ITEM_PATH[item.mediaType]}
        params={{ entryId: item.entryId }}
        className="group flex items-center gap-3 rounded-xl border border-(--border) bg-(--surface) p-2.5 transition hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
      >
        <div className="h-16 w-11 shrink-0 overflow-hidden rounded-md bg-(--border)/50">
          {item.posterUrl ? (
            <img
              src={item.posterUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-lg" aria-hidden>
              {ITEM_ICON[item.mediaType]}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-medium">{item.title}</p>
          {item.subtitle ? (
            <p className="truncate text-sm text-(--text-muted)">{item.subtitle}</p>
          ) : null}
        </div>
        <span className="tabular shrink-0 rounded-full bg-primary/12 px-2.5 py-1 text-sm font-medium text-link">
          {item.remainingSeconds != null ? formatHoursFromSeconds(item.remainingSeconds) : '?'}
        </span>
      </Link>
    </li>
  );
}
