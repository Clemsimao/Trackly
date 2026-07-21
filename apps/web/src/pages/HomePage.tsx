import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { logout, meQueryOptions } from '../api/auth';
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
        <p className="text-(--text-muted)">{fr.home.nextUp}</p>
        <Link
          to="/recherche"
          className="mt-5 block rounded-xl border border-(--border) bg-(--bg) px-4 py-3 text-(--text-muted) transition hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          🔍 {fr.home.searchCta}
        </Link>
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
