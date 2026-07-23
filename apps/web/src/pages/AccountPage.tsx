import { useState } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { meQueryOptions } from '../api/auth';
import { cancelAccountDeletion, downloadExport, requestAccountDeletion } from '../api/account';
import { ApiClientError } from '../api/client';
import { fr } from '../i18n/fr';

export function AccountPage() {
  const { data: user } = useSuspenseQuery(meQueryOptions);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <h1 className="font-display text-2xl font-semibold">{fr.account.title}</h1>
      {user ? (
        <div className="mt-4 rounded-2xl border border-(--border) bg-(--surface) p-5">
          <p className="text-lg font-semibold">{user.displayName}</p>
          <p className="text-sm text-(--text-muted)">{user.email}</p>
        </div>
      ) : null}

      <ExportSection />
      {/* Tant qu'une suppression est en cours, on n'en propose pas une seconde :
          seule l'annulation a du sens (A5). */}
      {user?.deletionScheduledFor ? (
        <ScheduledSection scheduledFor={user.deletionScheduledFor} />
      ) : (
        <DangerSection email={user?.email ?? ''} />
      )}
    </main>
  );
}

/** Suppression programmée : l'écran ne propose plus que le retour en arrière. */
function ScheduledSection({ scheduledFor }: { scheduledFor: string }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: cancelAccountDeletion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meQueryOptions.queryKey }),
  });

  return (
    <section className="mt-6 rounded-2xl border border-dropped/40 bg-(--surface) p-5">
      <h2 className="font-display text-lg font-semibold text-dropped">
        {fr.account.scheduledTitle}
      </h2>
      <p className="mt-1 text-sm">
        {fr.account.scheduledOn}{' '}
        <strong>{new Date(scheduledFor).toLocaleDateString('fr-FR', DATE_LONGUE)}</strong>.
      </p>
      <p className="mt-1 text-sm text-(--text-muted)">{fr.account.scheduledMail}</p>
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-strong disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {mutation.isPending ? fr.account.cancelPending : fr.account.cancelAction}
      </button>
      {mutation.isError ? (
        <p role="alert" className="mt-2 text-sm text-dropped">
          {fr.account.cancelError}
        </p>
      ) : null}
    </section>
  );
}

const DATE_LONGUE = { day: 'numeric', month: 'long', year: 'numeric' } as const;

/** RGPD — droit d'accès. */
function ExportSection() {
  const mutation = useMutation({ mutationFn: downloadExport });

  return (
    <section className="mt-6 rounded-2xl border border-(--border) bg-(--surface) p-5">
      <h2 className="font-display text-lg font-semibold">{fr.account.exportTitle}</h2>
      <p className="mt-1 text-sm text-(--text-muted)">{fr.account.exportHint}</p>
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-strong disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {mutation.isPending ? fr.account.exportPending : `⬇️ ${fr.account.exportAction}`}
      </button>
      {mutation.isError ? (
        <p role="alert" className="mt-2 text-sm text-dropped">
          {fr.account.exportError}
        </p>
      ) : null}
    </section>
  );
}

/** RGPD — droit à l'effacement : mot de passe + confirmation explicite. */
function DangerSection({ email }: { email: string }) {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');

  // La session est conservée : l'utilisateur doit pouvoir revenir annuler.
  // On rafraîchit simplement le profil pour basculer sur l'écran « programmée ».
  const mutation = useMutation({
    mutationFn: () => requestAccountDeletion(password),
    onSuccess: async () => {
      setPassword('');
      await queryClient.invalidateQueries({ queryKey: meQueryOptions.queryKey });
    },
  });

  return (
    <section className="mt-6 rounded-2xl border border-dropped/40 bg-(--surface) p-5">
      <h2 className="font-display text-lg font-semibold text-dropped">{fr.account.dangerTitle}</h2>
      <p className="mt-1 text-sm text-(--text-muted)">{fr.account.dangerHint}</p>
      <form
        className="mt-3 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (window.confirm(fr.account.dangerConfirm)) mutation.mutate();
        }}
      >
        {/* Champ username caché : associe le mot de passe au compte pour les
            gestionnaires de mots de passe et l'accessibilité (recommandation navigateur). */}
        <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />
        <label className="block text-sm">
          <span className="text-(--text-muted)">{fr.account.dangerPasswordLabel}</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm outline-none focus-visible:border-dropped focus-visible:ring-2 focus-visible:ring-dropped/40"
          />
        </label>
        {mutation.isError ? (
          <p role="alert" className="text-sm text-dropped">
            {mutation.error instanceof ApiClientError
              ? mutation.error.message
              : fr.auth.genericError}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={mutation.isPending || password.length === 0}
          className="rounded-lg border border-dropped bg-dropped/10 px-4 py-2 text-sm font-semibold text-dropped transition hover:bg-dropped/20 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-dropped"
        >
          {mutation.isPending ? fr.account.dangerPending : fr.account.dangerAction}
        </button>
      </form>
    </section>
  );
}
