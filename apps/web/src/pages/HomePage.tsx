import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import type { BudgetBucket, DashboardItem, MediaType } from '@trackly/contracts';
import { logout, meQueryOptions } from '../api/auth';
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
      queryClient.setQueryData(meQueryOptions.queryKey, null);
      await navigate({ to: '/connexion' });
    },
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="rounded-2xl border border-(--border) bg-(--surface) p-6 shadow-sm">
        <h1 className="text-2xl font-bold">
          {fr.home.welcome} <span className="text-primary">{user?.displayName}</span> 👋
        </h1>
        <Link
          to="/recherche"
          className="mt-4 block rounded-xl border border-(--border) bg-(--bg) px-4 py-3 text-(--text-muted) transition hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          🔍 {fr.home.searchCta}
        </Link>
        <BudgetDashboard />
        <div className="mt-4">
          <ApiStatus />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
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
            className="rounded-lg border border-(--border) px-4 py-2 text-sm hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
          >
            {fr.auth.logoutAction}
          </button>
        </div>
      </div>
    </main>
  );
}

/** Le budget temps (Lot 4) : la réponse à « j'ai combien d'heures de retard ? ». */
function BudgetDashboard() {
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard });
  if (!data) return null;

  const hasContent =
    data.games.inProgress.count +
      data.games.backlog.count +
      data.games.wishlist.count +
      data.series.inProgress.count +
      data.series.toWatch.count +
      data.films.toWatch.count >
    0;

  return (
    <section className="mt-6" aria-label={fr.library.budget.title}>
      <h2 className="mb-2 text-lg font-semibold">{fr.library.budget.title}</h2>
      {!hasContent ? (
        <p className="text-sm text-(--text-muted)">{fr.library.budget.empty}</p>
      ) : (
        <>
          <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3">
            <p className="text-sm text-(--text-muted)">{fr.library.budget.totalPrefix}</p>
            <p className="text-3xl font-bold text-primary">
              ≈ {formatHoursFromSeconds(data.totalSeconds)}
            </p>
            {data.totalEstimated ? (
              <p className="mt-1 text-xs text-(--text-muted)">{fr.library.budget.estimatedNote}</p>
            ) : null}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <BudgetCard
              title={`🎮 ${fr.library.budget.games}`}
              lines={[
                [fr.library.budget.inProgressLabel, data.games.inProgress],
                [fr.library.budget.backlogLabel, data.games.backlog],
                [fr.library.budget.wishlistLabel, data.games.wishlist],
              ]}
            />
            <BudgetCard
              title={`📺 ${fr.library.budget.series}`}
              lines={[
                [fr.library.budget.inProgressLabel, data.series.inProgress],
                [fr.library.budget.toWatchLabel, data.series.toWatch],
              ]}
            />
            <BudgetCard
              title={`🎬 ${fr.library.budget.films}`}
              lines={[[fr.library.budget.toWatchLabel, data.films.toWatch]]}
            />
          </div>

          {data.inProgress.length > 0 ? (
            <>
              <h3 className="mb-2 mt-5 font-semibold">{fr.library.home.inProgress}</h3>
              <ul className="space-y-2">
                {data.inProgress.map((item) => (
                  <InProgressRow key={`${item.mediaType}-${item.entryId}`} item={item} />
                ))}
              </ul>
            </>
          ) : null}
        </>
      )}
      <Link
        to="/bibliotheque"
        className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
      >
        {fr.library.home.seeLibrary}
      </Link>
    </section>
  );
}

function BudgetCard({ title, lines }: { title: string; lines: Array<[string, BudgetBucket]> }) {
  return (
    <div className="rounded-xl border border-(--border) bg-(--bg) p-3">
      <p className="font-semibold">{title}</p>
      <dl className="mt-1 space-y-0.5 text-sm">
        {lines.map(([label, bucket]) => (
          <div key={label} className="flex justify-between gap-2">
            <dt className="text-(--text-muted)">
              {label} ({bucket.count})
            </dt>
            <dd className="font-medium">
              {bucket.count === 0
                ? '—'
                : `≈ ${formatHoursFromSeconds(bucket.seconds)}${bucket.unknownCount > 0 ? ' *' : ''}`}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const ITEM_PATH: Record<MediaType, string> = {
  game: '/bibliotheque/jeu/$entryId',
  series: '/bibliotheque/serie/$entryId',
  film: '/bibliotheque/film/$entryId',
};

function InProgressRow({ item }: { item: DashboardItem }) {
  return (
    <li>
      <Link
        to={ITEM_PATH[item.mediaType]}
        params={{ entryId: item.entryId }}
        className="flex items-center justify-between gap-3 rounded-xl border border-(--border) bg-(--bg) px-4 py-3 transition hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
      >
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {item.mediaType === 'game' ? '🎮' : item.mediaType === 'series' ? '📺' : '🎬'}{' '}
            {item.title}
          </p>
          {item.subtitle ? <p className="text-sm text-(--text-muted)">{item.subtitle}</p> : null}
        </div>
        <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-sm font-semibold text-primary">
          {item.remainingSeconds != null
            ? `≈ ${formatHoursFromSeconds(item.remainingSeconds)}`
            : '?'}
        </span>
      </Link>
    </li>
  );
}
