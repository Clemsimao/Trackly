import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { forgotPasswordBodySchema, type ForgotPasswordBody } from '@trackly/contracts';
import { forgotPassword } from '../../api/auth';
import { fr } from '../../i18n/fr';
import { Field } from '../Field';

export function ForgotPasswordForm() {
  const {
    register: field,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordBody>({
    resolver: zodResolver(forgotPasswordBodySchema),
    defaultValues: { email: '' },
  });

  const mutation = useMutation({ mutationFn: forgotPassword });

  // Même message quel que soit le résultat : on ne révèle pas si l'e-mail existe (A3)
  if (mutation.isSuccess) {
    return <p className="text-sm text-done">{fr.auth.forgotDone}</p>;
  }

  return (
    <form onSubmit={handleSubmit((body) => mutation.mutate(body))} noValidate className="space-y-4">
      <p className="text-sm text-(--text-muted)">{fr.auth.forgotHint}</p>
      <Field
        label={fr.fields.email}
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...field('email')}
      />

      {mutation.isError ? (
        <p role="alert" className="text-sm text-dropped">
          {fr.auth.genericError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-white hover:bg-primary-strong disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {mutation.isPending ? fr.auth.forgotPending : fr.auth.forgotAction}
      </button>
    </form>
  );
}
