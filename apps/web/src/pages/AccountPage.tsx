import { useState } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { meQueryOptions } from '../api/auth';
import { deleteAccount, downloadExport } from '../api/account';
import { ApiClientError } from '../api/client';
import { fr } from '../i18n/fr';

export function AccountPage() {
  const { data: user } = useSuspenseQuery(meQueryOptions);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
      <h1 className="text-2xl font-bold">{fr.account.title}</h1>
      {user ? (
        <div className="mt-4 rounded-2xl border border-(--border) bg-(--surface) p-5">
          <p className="text-lg font-semibold">{user.displayName}</p>
          <p className="text-sm text-(--text-muted)">{user.email}</p>
        </div>
      ) : null}

      <ExportSection />
      <DangerSection />
    </main>
  );
}

/** RGPD — droit d'accès. */
function ExportSection() {
  const mutation = useMutation({ mutationFn: downloadExport });

  return (
    <section className="mt-6 rounded-2xl border border-(--border) bg-(--surface) p-5">
      <h2 className="text-lg font-semibold">{fr.account.exportTitle}</h2>
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
function DangerSection() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => deleteAccount(password),
    onSuccess: async () => {
      queryClient.clear();
      await navigate({ to: '/connexion' });
    },
  });

  return (
    <section className="mt-6 rounded-2xl border border-dropped/40 bg-(--surface) p-5">
      <h2 className="text-lg font-semibold text-dropped">{fr.account.dangerTitle}</h2>
      <p className="mt-1 text-sm text-(--text-muted)">{fr.account.dangerHint}</p>
      <form
        className="mt-3 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (window.confirm(fr.account.dangerConfirm)) mutation.mutate();
        }}
      >
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
