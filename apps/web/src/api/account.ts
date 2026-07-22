import { deletionScheduledSchema, type DeletionScheduled } from '@trackly/contracts';
import { apiFetch } from './client';

/** RGPD — télécharge l'export JSON complet des données personnelles. */
export async function downloadExport(): Promise<void> {
  const response = await fetch('/api/account/export');
  if (!response.ok) throw new Error(`Export impossible (${response.status})`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'trackly-export.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * RGPD — demande de suppression (A5). Rien n'est effacé tout de suite :
 * la réponse donne la date d'effacement effectif, après le délai de grâce.
 */
export async function requestAccountDeletion(password: string): Promise<DeletionScheduled> {
  const data = await apiFetch<unknown>('/api/account', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
  return deletionScheduledSchema.parse(data);
}

/** Annulation par l'utilisateur connecté. */
export function cancelAccountDeletion(): Promise<void> {
  return apiFetch<void>('/api/account/deletion', { method: 'DELETE' });
}

/** Annulation depuis le lien reçu par e-mail — ne nécessite pas de session. */
export function cancelAccountDeletionByToken(token: string): Promise<void> {
  return apiFetch<void>('/api/account/deletion/cancel', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}
