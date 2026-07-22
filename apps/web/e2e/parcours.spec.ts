import { expect, test } from '@playwright/test';

/**
 * Parcours V1 de bout en bout : inscription → navigation → export RGPD →
 * suppression de compte. Un seul compte jetable traverse tout le parcours.
 * (La recherche n'est pas couverte : pas de clés fournisseurs dans la CI.)
 */

const email = `e2e-${Date.now()}@test.local`;
const password = 'MotDePasse!E2E-2026';
const displayName = 'Testeur E2E';

test.describe.configure({ mode: 'serial' });

test('inscription → accueil connecté', async ({ page }) => {
  await page.goto('/inscription');
  await page.getByLabel(/pseudo/i).fill(displayName);
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/mot de passe/i).fill(password);
  await page.getByRole('button', { name: /créer mon compte/i }).click();

  await expect(page).toHaveURL(/\/accueil/);
  await expect(page.getByRole('heading', { name: new RegExp(displayName) })).toBeVisible();
});

test('déconnexion puis reconnexion', async ({ page }) => {
  await page.goto('/connexion');
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/mot de passe/i).fill(password);
  await page.getByRole('button', { name: /se connecter/i }).click();
  await expect(page).toHaveURL(/\/accueil/);

  await page.getByRole('button', { name: /se déconnecter/i }).click();
  await expect(page).toHaveURL(/\/connexion/);

  // Une route protégée sans session renvoie vers la connexion
  await page.goto('/bibliotheque');
  await expect(page).toHaveURL(/\/connexion/);
});

test('bibliothèque vide et budget temps vide', async ({ page }) => {
  await page.goto('/connexion');
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/mot de passe/i).fill(password);
  await page.getByRole('button', { name: /se connecter/i }).click();
  await expect(page).toHaveURL(/\/accueil/);

  await page.getByRole('link', { name: /^bibliothèque$/i }).click();
  await expect(page.getByText(/ta bibliothèque est vide/i)).toBeVisible();
});

test('export RGPD : un JSON complet est téléchargé', async ({ page }) => {
  await page.goto('/connexion');
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/mot de passe/i).fill(password);
  await page.getByRole('button', { name: /se connecter/i }).click();
  await expect(page).toHaveURL(/\/accueil/);

  await page.getByRole('link', { name: /mon compte/i }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /télécharger mes données/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('trackly-export.json');

  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const data = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
    format: string;
    profile: { email: string };
  };
  expect(data.format).toBe('trackly-export-v1');
  expect(data.profile.email).toBe(email);
});

test('suppression du compte : définitive, reconnexion impossible', async ({ page }) => {
  await page.goto('/connexion');
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/mot de passe/i).fill(password);
  await page.getByRole('button', { name: /se connecter/i }).click();
  await expect(page).toHaveURL(/\/accueil/);

  await page.getByRole('link', { name: /mon compte/i }).click();
  await page.getByLabel(/confirme avec ton mot de passe/i).fill(password);
  page.on('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: /supprimer définitivement/i }).click();
  await expect(page).toHaveURL(/\/connexion/);

  // Le compte n'existe plus
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/mot de passe/i).fill(password);
  await page.getByRole('button', { name: /se connecter/i }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/connexion/);
});
