import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

describe('App', () => {
  it('affiche le nom et le statut API quand elle répond', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 'ok',
            service: 'trackly-api',
            version: '0.1.0',
            timestamp: new Date().toISOString(),
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    renderApp();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Trackly');
    expect(await screen.findByText(/API opérationnelle/)).toBeInTheDocument();
  });

  it('signale une API injoignable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('réseau')));

    renderApp();

    expect(await screen.findByText(/API injoignable/)).toBeInTheDocument();
  });
});
