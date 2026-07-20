import { useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
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
import { isDark, toggleTheme } from './theme';

interface RouterContext {
  queryClient: QueryClient;
}

function RootLayout() {
  const [dark, setDark] = useState(isDark);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-5">
        <Link to="/" className="text-xl font-bold tracking-tight text-primary">
          {fr.app.name}
        </Link>
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
      <footer className="py-6 text-center text-sm text-(--text-muted)">{fr.app.tagline}</footer>
    </div>
  );
}

const rootRoute = createRootRouteWithContext<RouterContext>()({ component: RootLayout });

/** Route protégée type : session exigée, sinon renvoi vers la connexion. */
const accueilRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/accueil',
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.ensureQueryData(meQueryOptions);
    if (!user) {
      throw redirect({ to: '/connexion', search: { redirect: location.href } });
    }
  },
  component: HomePage,
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
