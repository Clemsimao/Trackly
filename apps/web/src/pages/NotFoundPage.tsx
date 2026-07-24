import { Link } from '@tanstack/react-router';
import { fr } from '../i18n/fr';
import { useDocumentTitle } from '../utils/useDocumentTitle';

/** 404 en français, cohérente avec le reste de l'app (défaut TanStack = « Not Found » nu). */
export function NotFoundPage() {
  useDocumentTitle(fr.notFound.title);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <p className="font-display text-6xl font-semibold text-link">{fr.notFound.code}</p>
      <h1 className="mt-4 font-display text-2xl font-semibold">{fr.notFound.title}</h1>
      <p className="mt-2 text-(--text-muted)">{fr.notFound.message}</p>
      <Link
        to="/accueil"
        className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {fr.notFound.backHome}
      </Link>
    </main>
  );
}
