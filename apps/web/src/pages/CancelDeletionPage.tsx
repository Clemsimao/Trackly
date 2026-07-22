import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useSearch } from '@tanstack/react-router';
import { cancelAccountDeletionByToken } from '../api/account';
import { fr } from '../i18n/fr';

/**
 * Annulation depuis le lien reçu par e-mail (CA A5). Publique : c'est le
 * recours de qui n'a plus accès à son compte, le jeton fait l'authentification.
 * L'annulation part au chargement — le lien n'existe que pour ça.
 */
export function CancelDeletionPage() {
  const { token } = useSearch({ from: '/annulation-suppression' });
  const mutation = useMutation({ mutationFn: cancelAccountDeletionByToken });
  const lance = useRef(false);

  useEffect(() => {
    // StrictMode monte deux fois en dev : sans garde, le jeton part deux fois.
    if (lance.current || !token) return;
    lance.current = true;
    mutation.mutate(token);
  }, [token, mutation]);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-16 text-center">
      <h1 className="font-display text-2xl font-semibold">{fr.deletionCancel.title}</h1>

      <p
        role="status"
        aria-live="polite"
        className={`mt-4 text-sm ${mutation.isError ? 'text-dropped' : 'text-(--text-muted)'}`}
      >
        {mutation.isPending || mutation.isIdle
          ? fr.deletionCancel.pending
          : mutation.isError
            ? fr.deletionCancel.error
            : fr.deletionCancel.success}
      </p>

      <Link
        to="/connexion"
        className="mt-6 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {fr.deletionCancel.toLogin}
      </Link>
    </main>
  );
}
