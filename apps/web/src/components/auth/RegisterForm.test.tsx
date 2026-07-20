import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RegisterForm } from './RegisterForm';

describe('RegisterForm', () => {
  it('mot de passe trop court → erreur affichée, aucun appel réseau (A1)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <RegisterForm onSuccess={vi.fn()} />
      </QueryClientProvider>,
    );

    await userEvent.type(screen.getByLabelText(/pseudo/i), 'Julien');
    await userEvent.type(screen.getByLabelText(/e-mail/i), 'julien@test.fr');
    await userEvent.type(screen.getByLabelText(/mot de passe/i), 'court');
    await userEvent.click(screen.getByRole('button', { name: /créer mon compte/i }));

    expect(
      await screen.findByText(/au moins 12 caractères/i, { selector: '[role="alert"]' }),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("l'indicateur de robustesse réagit à la saisie", async () => {
    vi.stubGlobal('fetch', vi.fn());
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <RegisterForm onSuccess={vi.fn()} />
      </QueryClientProvider>,
    );

    await userEvent.type(screen.getByLabelText(/mot de passe/i), 'Tr4ckly!des-jeux-et-series');
    expect(screen.getByText(/robustesse/i)).toHaveTextContent(/excellent/i);
  });
});
