import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { meQueryOptions } from '../api/auth';
import { purgerCacheLocal } from '../api/persist';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { ResetPasswordForm } from '../components/auth/ResetPasswordForm';
import { fr } from '../i18n/fr';
import { useDocumentTitle } from '../utils/useDocumentTitle';

function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  useDocumentTitle(title);
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10">
      <div className="rounded-2xl border border-(--border) bg-(--surface) p-6 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold">{title}</h1>
        {children}
      </div>
    </main>
  );
}

export function LoginPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const search = useSearch({ from: '/connexion' });

  return (
    <AuthCard title={fr.auth.loginTitle}>
      <LoginForm
        onSuccess={async (user) => {
          await purgerCacheLocal(queryClient);
          queryClient.setQueryData(meQueryOptions.queryKey, user);
          await navigate({ to: search.redirect ?? '/accueil' });
        }}
      />
      <div className="mt-6 space-y-2 text-sm text-(--text-muted)">
        <p>
          <Link to="/mot-de-passe-oublie" className="text-link hover:underline">
            {fr.auth.forgotLink}
          </Link>
        </p>
        <p>
          {fr.auth.noAccount}{' '}
          {/* Lien au fil du texte : souligné en permanence, la couleur seule ne suffit pas (WCAG 1.4.1) */}
          <Link to="/inscription" className="text-link underline underline-offset-2">
            {fr.auth.registerLink}
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}

export function RegisterPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return (
    <AuthCard title={fr.auth.registerTitle}>
      <RegisterForm
        onSuccess={async (user) => {
          await purgerCacheLocal(queryClient);
          queryClient.setQueryData(meQueryOptions.queryKey, user);
          await navigate({ to: '/accueil' });
        }}
      />
      <p className="mt-6 text-sm text-(--text-muted)">
        {/* Idem : lien au fil du texte */}
        {fr.auth.hasAccount}{' '}
        <Link to="/connexion" className="text-link underline underline-offset-2">
          {fr.auth.loginLink}
        </Link>
      </p>
    </AuthCard>
  );
}

export function ForgotPasswordPage() {
  return (
    <AuthCard title={fr.auth.forgotTitle}>
      <ForgotPasswordForm />
      <p className="mt-6 text-sm text-(--text-muted)">
        <Link to="/connexion" className="text-link hover:underline">
          {fr.auth.loginLink}
        </Link>
      </p>
    </AuthCard>
  );
}

export function ResetPasswordPage() {
  const search = useSearch({ from: '/reinitialisation' });
  const navigate = useNavigate();

  return (
    <AuthCard title={fr.auth.resetTitle}>
      {search.token ? (
        <ResetPasswordForm
          token={search.token}
          onDone={() => void navigate({ to: '/connexion' })}
        />
      ) : (
        <p className="text-sm text-dropped">{fr.auth.resetMissingToken}</p>
      )}
    </AuthCard>
  );
}
