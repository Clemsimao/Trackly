import { defineConfig, devices } from '@playwright/test';

/**
 * E2E (Lot 5, docs/cadrage/14) : parcours réels contre l'API compilée et le
 * build de prod servi par vite preview. Nécessite un Postgres migré
 * (DATABASE_URL) — exécuté dans la CI avec un service Postgres.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: 'node ../api/dist/main.js',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'pnpm preview',
      port: 4173,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
