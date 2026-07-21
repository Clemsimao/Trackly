import { apiErrorSchema } from '@trackly/contracts';

/** Erreur API normalisée (forme définie dans @trackly/contracts). */
export class ApiClientError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    /** Corps brut : certaines erreurs portent du contexte (ex. 409 → entryId existant). */
    readonly body?: unknown,
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
      throw new ApiClientError(parsed.data.statusCode, parsed.data.code, parsed.data.message, body);
    }
    throw new ApiClientError(response.status, 'UNKNOWN', `Erreur ${response.status}`);
  }

  // Mutations sans corps de réponse (204)
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Extrait l'identifiant d'entrée d'un 409 « déjà dans ta bibliothèque ». */
export function existingEntryId(error: unknown): string | null {
  if (error instanceof ApiClientError && error.code === 'ALREADY_IN_LIBRARY') {
    const body = error.body as { entryId?: string } | undefined;
    return body?.entryId ?? null;
  }
  return null;
}
