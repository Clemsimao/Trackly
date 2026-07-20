import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from './LoginForm';

function renderForm(onSuccess = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <LoginForm onSuccess={onSuccess} />
    </QueryClientProvider>,
  );
  return onSuccess;
}

const user = {
  id: '5f6a2b1c-0000-4000-8000-000000000000',
  email: 'julien@test.fr',
  displayName: 'Julien',
  createdAt: new Date().toISOString(),
};

describe('LoginForm', () => {
  it('connexion réussie → onSuccess avec l’utilisateur', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ user }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    const onSuccess = renderForm();

    await userEvent.type(screen.getByLabelText(/e-mail/i), 'julien@test.fr');
    await userEvent.type(screen.getByLabelText(/mot de passe/i), 'un-mot-de-passe');
    await userEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSuccess.mock.calls[0]?.[0]).toMatchObject({ email: 'julien@test.fr' });
  });

  it('identifiants invalides → le message de l’API est affiché', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            statusCode: 401,
            code: 'INVALID_CREDENTIALS',
            message: 'E-mail ou mot de passe incorrect.',
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    const onSuccess = renderForm();

    await userEvent.type(screen.getByLabelText(/e-mail/i), 'julien@test.fr');
    await userEvent.type(screen.getByLabelText(/mot de passe/i), 'mauvais');
    await userEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou mot de passe incorrect.');
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
