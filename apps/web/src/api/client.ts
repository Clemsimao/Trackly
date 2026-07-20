import { apiErrorSchema } from '@trackly/contracts';

/** Erreur API normalisée (forme définie dans @trackly/contracts). */
export class ApiClientError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const parsed = apiErrorSchema.safeParse(body);
    if (parsed.success) {
      throw new ApiClientError(parsed.data.statusCode, parsed.data.code, parsed.data.message);
    }
    throw new ApiClientError(response.status, 'UNKNOWN', `Erreur ${response.status}`);
  }

  return (await response.json()) as T;
}
