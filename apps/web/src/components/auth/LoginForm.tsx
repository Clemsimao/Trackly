import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { loginBodySchema, type LoginBody, type PublicUser } from '@trackly/contracts';
import { login } from '../../api/auth';
import { ApiClientError } from '../../api/client';
import { fr } from '../../i18n/fr';
import { Field } from '../Field';

// rememberMe a un défaut zod : le type saisi (input) diffère du type validé (output)
type LoginInput = z.input<typeof loginBodySchema>;

export function LoginForm({ onSuccess }: { onSuccess: (user: PublicUser) => void }) {
  const {
    register: field,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput, unknown, LoginBody>({
    resolver: zodResolver(loginBodySchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const mutation = useMutation({ mutationFn: login, onSuccess });

  return (
    <form onSubmit={handleSubmit((body) => mutation.mutate(body))} noValidate className="space-y-4">
      <Field
        label={fr.fields.email}
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...field('email')}
      />
      <Field
        label={fr.fields.password}
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...field('password')}
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 accent-primary" {...field('rememberMe')} />
        {fr.fields.rememberMe}
      </label>

      {mutation.isError ? (
        <p role="alert" className="text-sm text-dropped">
          {mutation.error instanceof ApiClientError ? mutation.error.message : fr.auth.genericError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-white hover:bg-primary-strong disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {mutation.isPending ? fr.auth.loginPending : fr.auth.loginAction}
      </button>
    </form>
  );
}
