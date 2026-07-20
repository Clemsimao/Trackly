import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { passwordSchema } from '@trackly/contracts';
import { resetPassword } from '../../api/auth';
import { ApiClientError } from '../../api/client';
import { fr } from '../../i18n/fr';
import { Field } from '../Field';
import { PasswordStrength } from '../PasswordStrength';

const formSchema = z.object({ password: passwordSchema });
type FormValues = z.infer<typeof formSchema>;

export function ResetPasswordForm({ token, onDone }: { token: string; onDone: () => void }) {
  const {
    register: field,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => resetPassword({ token, password: values.password }),
  });
  const password = watch('password');

  if (mutation.isSuccess) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-done">{fr.auth.resetDone}</p>
        <button
          type="button"
          onClick={onDone}
          className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-white hover:bg-primary-strong"
        >
          {fr.auth.loginAction}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((body) => mutation.mutate(body))} noValidate className="space-y-4">
      <Field
        label={fr.fields.newPassword}
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
        {mutation.isPending ? fr.auth.resetPending : fr.auth.resetAction}
      </button>
    </form>
  );
}
