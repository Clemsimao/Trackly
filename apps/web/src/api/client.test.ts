import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, apiFetch, UNAUTHORIZED_EVENT } from './client';

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('signale globalement une session expirée sur toute réponse 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            statusCode: 401,
            code: 'UNAUTHENTICATED',
            message: 'Connexion requise',
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    const listener = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, listener, { once: true });

    await expect(apiFetch('/api/library')).rejects.toBeInstanceOf(ApiClientError);
    expect(listener).toHaveBeenCalledOnce();
  });
});
