import { useState } from 'react';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Link,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { meQueryOptions } from './api/auth';
import { fr } from './i18n/fr';
import { HomePage } from './pages/HomePage';
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages/AuthPages';
import { FilmDetailPage, GameDetailPage, SeriesDetailPage } from './pages/MediaDetailPages';
import { SearchPage } from './pages/SearchPage';
import { isDark, toggleTheme } from './theme';

interface RouterContext {
  queryClient: QueryClient;
}

function RootLayout() {
  const [dark, setDark] = useState(isDark);
  const { data: user } = useQuery(meQueryOptions);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-5">
          <Link to="/" className="text-xl font-bold tracking-tight text-primary">
            {fr.app.name}
          </Link>
          {user ? (
            <nav className="flex items-center gap-4 text-sm" aria-label="Navigation principale">
              <Link
                to="/accueil"
                className="text-(--text-muted) hover:text-primary [&.active]:font-semibold [&.active]:text-primary"
              >
                {fr.nav.home}
              </Link>
              <Link
                to="/recherche"
                className="text-(--text-muted) hover:text-primary [&.active]:font-semibold [&.active]:text-primary"
              >
                {fr.nav.search}
              </Link>
            </nav>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setDark(toggleTheme())}
          aria-label={dark ? fr.theme.toLight : fr.theme.toDark}
          className="rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-sm hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          {dark ? fr.theme.light : fr.theme.dark}
        </button>
      </header>
      <Outlet />
      <footer className="space-y-1 py-6 text-center text-sm text-(--text-muted)">
        <p>{fr.app.tagline}</p>
        <p className="text-xs">{fr.media.attributionTmdb}</p>
      </footer>
    </div>
  );
}

const rootRoute = createRootRouteWithContext<RouterContext>()({ component: RootLayout });

/** Session exigée, sinon renvoi vers la connexion avec retour après login. */
async function requireAuth({
  context,
  location,
}: {
  context: RouterContext;
  location: { href: string };
}) {
  const user = await context.queryClient.ensureQueryData(meQueryOptions);
  if (!user) {
    throw redirect({ to: '/connexion', search: { redirect: location.href } });
  }
}

const accueilRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accueil',
  beforeLoad: requireAuth,
  component: HomePage,
});

const rechercheRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recherche',
  beforeLoad: requireAuth,
  component: SearchPage,
});

const gameDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/media/game/$id',
  beforeLoad: requireAuth,
  component: GameDetailPage,
});

const filmDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/media/film/$id',
  beforeLoad: requireAuth,
  component: FilmDetailPage,
});

const seriesDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/media/series/$id',
  beforeLoad: requireAuth,
  component: SeriesDetailPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/accueil' });
  },
});

/** Si déjà connecté, les pages d'auth renvoient vers l'accueil. */
async function redirectIfAuthenticated({ context }: { context: RouterContext }) {
  const user = await context.queryClient.ensureQueryData(meQueryOptions);
  if (user) throw redirect({ to: '/accueil' });
}

const connexionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/connexion',
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: redirectIfAuthenticated,
  component: LoginPage,
});

const inscriptionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inscription',
  beforeLoad: redirectIfAuthenticated,
  component: RegisterPage,
});

const motDePasseOublieRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mot-de-passe-oublie',
  component: ForgotPasswordPage,
});

const reinitialisationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reinitialisation',
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
  component: ResetPasswordPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  accueilRoute,
  rechercheRoute,
  gameDetailRoute,
  filmDetailRoute,
  seriesDetailRoute,
  connexionRoute,
  inscriptionRoute,
  motDePasseOublieRoute,
  reinitialisationRoute,
]);

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({ routeTree, context: { queryClient } });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
