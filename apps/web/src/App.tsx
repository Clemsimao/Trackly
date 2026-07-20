import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { healthResponseSchema } from '@trackly/contracts';
import { isDark, toggleTheme } from './theme';

async function fetchHealth() {
  const response = await fetch('/api/health');
  if (!response.ok) throw new Error(`API ${response.status}`);
  return healthResponseSchema.parse(await response.json());
}

function ApiStatus() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  });

  if (isPending) {
    return (
      <div className="flex items-center gap-2 text-(--text-muted)">
        <span className="size-2.5 animate-pulse rounded-full bg-(--border)" aria-hidden />
        Vérification de l'API…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-dropped">
        <span className="size-2.5 rounded-full bg-dropped" aria-hidden />
        API injoignable
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-done">
      <span className="size-2.5 rounded-full bg-done" aria-hidden />
      API opérationnelle — v{data.version}
    </div>
  );
}

export function App() {
  const [dark, setDark] = useState(isDark);

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <span className="text-xl font-bold tracking-tight text-primary">Trackly</span>
        <button
          type="button"
          onClick={() => setDark(toggleTheme())}
          aria-label={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
          className="rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-sm hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          {dark ? '☀️ Clair' : '🌙 Sombre'}
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">
          Hello <span className="text-primary">Trackly</span> 👋
        </h1>
        <p className="max-w-md text-balance text-(--text-muted)">
          Ta bibliothèque de jeux, séries et films arrive. Socle du Lot 0 : monorepo, API, base de
          données, CI et déploiement.
        </p>
        <div className="rounded-xl border border-(--border) bg-(--surface) px-5 py-4 shadow-sm">
          <ApiStatus />
        </div>
      </main>

      <footer className="py-6 text-center text-sm text-(--text-muted)">
        Lot 0 — socle technique · <span className="font-medium">V1 en construction</span>
      </footer>
    </div>
  );
}
