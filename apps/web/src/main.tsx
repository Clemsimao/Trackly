import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { RouterProvider } from '@tanstack/react-router';
import { buster, DUREE_MAX_MS, persister } from './api/persist';
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

const router = createAppRouter(queryClient);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: DUREE_MAX_MS,
        buster,
        // On ne persiste que ce qui a abouti : ni erreurs, ni requêtes en vol.
        dehydrateOptions: { shouldDehydrateQuery: (query) => query.state.status === 'success' },
      }}
    >
      <RouterProvider router={router} />
    </PersistQueryClientProvider>
  </StrictMode>,
);
