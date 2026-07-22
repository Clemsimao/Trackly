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

/** RGPD — suppression définitive du compte, confirmée par mot de passe. */
export function deleteAccount(password: string): Promise<void> {
  return apiFetch<void>('/api/account', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
}
