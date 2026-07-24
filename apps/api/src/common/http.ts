/** Délai maximal commun aux dépendances HTTP externes. */
export const EXTERNAL_REQUEST_TIMEOUT_MS = 8_000;

export function fetchExternal(input: string | URL, init: RequestInit = {}): Promise<Response> {
  return fetch(input, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(EXTERNAL_REQUEST_TIMEOUT_MS),
  });
}

/** Respecte Retry-After, avec un plafond pour ne pas immobiliser un worker. */
export async function waitBeforeRetry(response: Response, attempt: number): Promise<void> {
  const retryAfter = response.headers.get('retry-after');
  let delayMs = 500 * 2 ** attempt;

  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) {
      delayMs = seconds * 1_000;
    } else {
      const date = Date.parse(retryAfter);
      if (Number.isFinite(date)) delayMs = Math.max(0, date - Date.now());
    }
  }

  await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 10_000)));
}
