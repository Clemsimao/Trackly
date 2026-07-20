import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { registerBodySchema, type PublicUser, type RegisterBody } from '@trackly/contracts';
import { register as registerApi } from '../../api/auth';
import { ApiClientError } from '../../api/client';
import { fr } from '../../i18n/fr';
import { Field } from '../Field';
import { PasswordStrength } from '../PasswordStrength';

export function RegisterForm({ onSuccess }: { onSuccess: (user: PublicUser) => void }) {
  const {
    register: field,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterBody>({
    resolver: zodResolver(registerBodySchema),
    defaultValues: { email: '', password: '', displayName: '' },
  });

  const mutation = useMutation({ mutationFn: registerApi, onSuccess });
  const password = watch('password');

  return (
    <form onSubmit={handleSubmit((body) => mutation.mutate(body))} noValidate className="space-y-4">
      <Field
        label={fr.fields.displayName}
        type="text"
        autoComplete="nickname"
        error={errors.displayName?.message}
        {...field('displayName')}
      />
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
        autoComplete="new-password"
        error={errors.password?.message}
        {...field('password')}
      >
        <PasswordStrength password={password ?? ''} />
      </Field>

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
        {mutation.isPending ? fr.auth.registerPending : fr.auth.registerAction}
      </button>
    </form>
  );
}
