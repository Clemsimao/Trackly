import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { RouterProvider } from '@tanstack/react-router';
import { UNAUTHORIZED_EVENT } from './api/client';
import { buster, DUREE_MAX_MS, persister, purgerCacheLocal } from './api/persist';
import { createAppRouter } from './router';
// Police auto-hébergée (0 €, hors ligne, sans CDN tiers) — direction « Minimal & net »
import '@fontsource-variable/inter';
import './styles.css';

// Politique réseau globale (les composants n'en décident pas individuellement)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // Doit couvrir la durée de persistance, sinon les données restaurées
      // seraient collectées avant d'avoir pu servir hors ligne.
      gcTime: DUREE_MAX_MS,
    },
  },
});

if (typeof window !== 'undefined') {
  window.addEventListener(UNAUTHORIZED_EVENT, () => {
    void purgerCacheLocal(queryClient);
  });
}

const router = createAppRouter(queryClient);

/**
 * La restauration du cache est attendue AVANT le premier rendu.
 *
 * Le routeur résout ses routes hors de React : son `beforeLoad` lit le cache
 * directement. Avec le composant PersistQueryClientProvider, la restauration
 * est asynchrone et la première route peut se résoudre sur un cache encore
 * vide — hors ligne, l'utilisateur se retrouve alors renvoyé vers la connexion
 * alors que ses données sont bien sur l'appareil. On séquence donc à la main.
 */
async function demarrer() {
  try {
    // Signature : [désabonnement, promesse de restauration] — c'est la SECONDE
    // qu'il faut attendre ; `await` sur la première se résoudrait sans rien faire.
    const [, restauration] = persistQueryClient({
      queryClient,
      persister,
      maxAge: DUREE_MAX_MS,
      buster,
      // On ne persiste que ce qui a abouti : ni erreurs, ni requêtes en vol.
      dehydrateOptions: { shouldDehydrateQuery: (query) => query.state.status === 'success' },
    });
    await restauration;
  } catch {
    // localStorage plein, refusé ou corrompu : on démarre sans hors-ligne
    // plutôt que de ne pas démarrer du tout.
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}

void demarrer();
