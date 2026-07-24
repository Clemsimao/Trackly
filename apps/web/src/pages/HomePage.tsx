import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import type { DashboardItem, DashboardResponse, MediaType } from '@trackly/contracts';
import { logout, meQueryOptions } from '../api/auth';
import { purgerCacheLocal } from '../api/persist';
import { getDashboard } from '../api/dashboard';
import { ApiStatus } from '../components/ApiStatus';
import { fr } from '../i18n/fr';
import { formatHoursFromSeconds } from '../utils/format';
import { useDocumentTitle } from '../utils/useDocumentTitle';

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
        <span aria-hidden>🔍</span>
        {fr.home.searchCta}
      </Link>

      <DashboardOverview />

      <div className="mt-7 flex flex-wrap items-center gap-2.5 border-t border-(--border) pt-5">
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
        <div className="ml-auto">
          <ApiStatus />
        </div>
      </div>
    </main>
  );
}

/**
 * L'activité courante est l'information principale. Le budget reste visible,
 * mais dans une colonne secondaire compacte sur les écrans larges.
 */
function DashboardOverview() {
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard });
  if (!data) return null;

  const totalCount =
    data.games.inProgress.count +
    data.games.backlog.count +
    data.games.wishlist.count +
    data.series.inProgress.count +
    data.series.toWatch.count +
    data.films.toWatch.count +
    data.books.inProgress.count +
    data.books.toRead.count;

  return (
    <div className="mt-8 grid items-start gap-5 md:grid-cols-[minmax(0,1.55fr)_minmax(15rem,0.85fr)] md:gap-6">
      <section aria-labelledby="in-progress-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="in-progress-heading" className="font-display text-xl font-semibold">
            {fr.library.home.inProgress}
          </h2>
          <SeeLibraryLink compact />
        </div>

        {data.inProgress.length > 0 ? (
          <ul className="mt-3 space-y-2.5">
            {data.inProgress.map((item) => (
              <InProgressRow key={`${item.mediaType}-${item.entryId}`} item={item} />
            ))}
          </ul>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-(--border) px-4 py-5">
            <p className="text-sm text-(--text-muted)">{fr.library.home.empty}</p>
          </div>
        )}
      </section>

      <BudgetCard data={data} totalCount={totalCount} />
    </div>
  );
}

function BudgetCard({ data, totalCount }: { data: DashboardResponse; totalCount: number }) {
  const lines = mediaLines(data);

  return (
    <section
      aria-labelledby="budget-heading"
      className="rounded-xl border border-(--border) bg-(--surface) p-4 sm:p-5"
    >
      <h2 id="budget-heading" className="font-display text-base font-semibold">
        {fr.library.budget.title}
      </h2>

      {totalCount === 0 ? (
        <p className="mt-2 text-sm leading-relaxed text-(--text-muted)">
          {fr.library.budget.empty}
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow text-(--text-muted)">{fr.library.budget.totalPrefix}</p>
              <p className="display-figure mt-1 text-3xl leading-none sm:text-4xl">
                {formatHoursFromSeconds(data.totalSeconds)}
              </p>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-(--border) pt-4">
            {lines.map((line) => (
              <div key={line.label} className="min-w-0">
                <dt className="truncate text-xs text-(--text-muted)">
                  <span aria-hidden className="mr-1.5">
                    {line.icon}
                  </span>
                  {line.label}
                </dt>
                <dd className="tabular mt-0.5 text-sm font-semibold text-(--text)">
                  {line.seconds > 0 ? formatHoursFromSeconds(line.seconds) : '—'}
                </dd>
              </div>
            ))}
          </dl>

          {data.totalEstimated ? (
            <p className="mt-4 border-t border-(--border) pt-3 text-[0.7rem] leading-relaxed text-(--text-muted)">
              {fr.library.budget.estimatedNote}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

function SeeLibraryLink({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/bibliotheque"
      className={
        compact
          ? 'shrink-0 text-xs font-semibold text-link hover:underline'
          : 'mt-4 inline-block text-sm font-semibold text-link hover:underline'
      }
    >
      {fr.library.home.seeLibrary}
    </Link>
  );
}

interface MediaLine {
  icon: string;
  label: string;
  seconds: number;
}

function mediaLines(data: DashboardResponse): MediaLine[] {
  const { games, series, films, books } = data;
  return [
    {
      icon: '🎮',
      label: fr.library.budget.games,
      seconds: games.inProgress.seconds + games.backlog.seconds,
    },
    {
      icon: '📺',
      label: fr.library.budget.series,
      seconds: series.inProgress.seconds + series.toWatch.seconds,
    },
    {
      icon: '🎬',
      label: fr.library.budget.films,
      seconds: films.toWatch.seconds,
    },
    {
      icon: '📖',
      label: fr.library.budget.books,
      seconds: books.inProgress.seconds + books.toRead.seconds,
    },
  ];
}

const ITEM_PATH: Record<MediaType, string> = {
  game: '/bibliotheque/jeu/$entryId',
  series: '/bibliotheque/serie/$entryId',
  film: '/bibliotheque/film/$entryId',
  book: '/bibliotheque/livre/$entryId',
};

const ITEM_ICON: Record<MediaType, string> = {
  game: '🎮',
  series: '📺',
  film: '🎬',
  book: '📖',
};

function InProgressRow({ item }: { item: DashboardItem }) {
  const mediaType = item.mediaType;

  return (
    <li>
      <Link
        to={ITEM_PATH[mediaType]}
        params={{ entryId: item.entryId }}
        className="group flex items-center gap-3.5 rounded-xl border border-(--border) bg-(--surface) p-3 transition hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
      >
        <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-(--border)/50">
          {item.posterUrl ? (
            <img
              src={item.posterUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-lg" aria-hidden>
              {ITEM_ICON[mediaType]}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-medium sm:text-[1.05rem]">{item.title}</p>
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
