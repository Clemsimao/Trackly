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
import { AccountPage } from './pages/AccountPage';
import { HomePage } from './pages/HomePage';
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages/AuthPages';
import { LibraryFilmPage } from './pages/LibraryFilmPage';
import { LibraryGamePage } from './pages/LibraryGamePage';
import { LibraryPage } from './pages/LibraryPage';
import { LibrarySeriesPage } from './pages/LibrarySeriesPage';
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
    <div className="flex min-h-dvh flex-col pb-16 sm:pb-0">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-6 py-5">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-display text-2xl font-semibold tracking-tight text-(--text)">
            {fr.app.name}
            <span className="text-accent">.</span>
          </Link>
          {/* Nav inline sur desktop ; sur mobile elle passe en barre d'onglets en bas */}
          {user ? (
            <nav
              className="hidden items-center gap-5 text-sm sm:flex"
              aria-label="Navigation principale"
            >
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="text-(--text-muted) hover:text-link [&.active]:font-semibold [&.active]:text-link"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setDark(toggleTheme())}
          aria-label={dark ? fr.theme.toLight : fr.theme.toDark}
          className="shrink-0 rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-sm hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          {dark ? fr.theme.light : fr.theme.dark}
        </button>
      </header>
      <Outlet />
      <footer className="space-y-1 py-6 text-center text-sm text-(--text-muted)">
        <p>{fr.app.tagline}</p>
        <p className="text-xs">{fr.media.attributionTmdb}</p>
      </footer>

      {/* Barre d'onglets mobile — navigation au pouce, comme une app native */}
      {user ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-20 flex border-t border-(--border) bg-(--surface)/95 backdrop-blur sm:hidden"
          aria-label="Navigation mobile"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs text-(--text-muted) [&.active]:text-link"
            >
              <span aria-hidden className="text-lg leading-none">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

const NAV_ITEMS = [
  { to: '/accueil', label: fr.nav.home, icon: '🏠' },
  { to: '/bibliotheque', label: fr.nav.library, icon: '📚' },
  { to: '/recherche', label: fr.nav.search, icon: '🔍' },
] as const;

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

const compteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/compte',
  beforeLoad: requireAuth,
  component: AccountPage,
});

const bibliothequeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bibliotheque',
  beforeLoad: requireAuth,
  component: LibraryPage,
});

const libraryGameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bibliotheque/jeu/$entryId',
  beforeLoad: requireAuth,
  component: LibraryGamePage,
});

const librarySeriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bibliotheque/serie/$entryId',
  beforeLoad: requireAuth,
  component: LibrarySeriesPage,
});

const libraryFilmRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bibliotheque/film/$entryId',
  beforeLoad: requireAuth,
  component: LibraryFilmPage,
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
  compteRoute,
  bibliothequeRoute,
  libraryGameRoute,
  librarySeriesRoute,
  libraryFilmRoute,
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
