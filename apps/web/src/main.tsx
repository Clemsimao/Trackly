import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { createAppRouter } from './router';
// Polices auto-hébergées (0 €, hors ligne, sans CDN tiers) — direction « Almanach »
import '@fontsource-variable/fraunces/full.css'; // titres — serif de caractère
import '@fontsource-variable/inter'; // corps
import '@fontsource/space-mono/400.css'; // chiffres tabulaires — le relevé
import '@fontsource/space-mono/700.css';
import './styles.css';

// Politique réseau globale (les composants n'en décident pas individuellement)
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

const router = createAppRouter(queryClient);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
