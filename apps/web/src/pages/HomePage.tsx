import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { logout, meQueryOptions } from '../api/auth';
import { getLibrary } from '../api/library';
import { ApiStatus } from '../components/ApiStatus';
import { fr } from '../i18n/fr';

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
        <p className="mt-2 text-(--text-muted)">{fr.home.lotDone}</p>
        <Link
          to="/recherche"
          className="mt-5 block rounded-xl border border-(--border) bg-(--bg) px-4 py-3 text-(--text-muted) transition hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          🔍 {fr.home.searchCta}
        </Link>
        <InProgressStrip />
        <div className="mt-4">
          <ApiStatus />
        </div>
        <button
          type="button"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="mt-6 rounded-lg border border-(--border) px-4 py-2 text-sm hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          {fr.auth.logoutAction}
        </button>
      </div>
    </main>
  );
}

/** « En ce moment » : jeux en cours (note de reprise) et séries en cours (P2/P3). */
function InProgressStrip() {
  const { data } = useQuery({ queryKey: ['library'], queryFn: getLibrary });
  if (!data) return null;

  const playingGames = data.games.filter((game) => game.status === 'PLAYING');
  const watchingSeries = data.series.filter((series) => series.status === 'WATCHING');
  const hasContent = playingGames.length > 0 || watchingSeries.length > 0;
  const hasLibrary = data.games.length + data.series.length + data.films.length > 0;

  return (
    <section className="mt-6" aria-label={fr.library.home.inProgress}>
      <h2 className="mb-2 text-lg font-semibold">{fr.library.home.inProgress}</h2>
      {!hasContent ? (
        <p className="text-sm text-(--text-muted)">
          {hasLibrary ? fr.library.home.empty : fr.library.empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {playingGames.map((game) => {
            const active = game.ownerships.find((o) => o.status === 'PLAYING');
            return (
              <li key={game.entryId}>
                <Link
                  to="/bibliotheque/jeu/$entryId"
                  params={{ entryId: game.entryId }}
                  className="block rounded-xl border border-(--border) bg-(--bg) px-4 py-3 transition hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <p className="font-semibold">
                    🎮 {game.work.title}
                    {active ? (
                      <span className="ml-2 text-sm font-normal text-(--text-muted)">
                        {active.platform}
                        {active.progressPercent != null ? ` · ${active.progressPercent} %` : ''}
                      </span>
                    ) : null}
                  </p>
                </Link>
              </li>
            );
          })}
          {watchingSeries.map((series) => (
            <li key={series.entryId}>
              <Link
                to="/bibliotheque/serie/$entryId"
                params={{ entryId: series.entryId }}
                className="block rounded-xl border border-(--border) bg-(--bg) px-4 py-3 transition hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
              >
                <p className="font-semibold">
                  📺 {series.work.title}
                  <span className="ml-2 text-sm font-normal text-(--text-muted)">
                    {series.watchedEpisodes}/{series.totalEpisodes} {fr.media.episodes}
                  </span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/bibliotheque"
        className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
      >
        {fr.library.home.seeLibrary}
      </Link>
    </section>
  );
}
