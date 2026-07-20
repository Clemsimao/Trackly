import { useQuery } from '@tanstack/react-query';
import { healthResponseSchema } from '@trackly/contracts';
import { fr } from '../i18n/fr';

async function fetchHealth() {
  const response = await fetch('/api/health');
  if (!response.ok) throw new Error(`API ${response.status}`);
  return healthResponseSchema.parse(await response.json());
}

export function ApiStatus() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  });

  if (isPending) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-(--text-muted)">
        <span className="size-2 animate-pulse rounded-full bg-(--border)" aria-hidden />
        {fr.home.apiChecking}
      </span>
    );
  }

  if (isError) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-dropped">
        <span className="size-2 rounded-full bg-dropped" aria-hidden />
        {fr.home.apiDown}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-sm text-done">
      <span className="size-2 rounded-full bg-done" aria-hidden />
      {fr.home.apiOk} — v{data.version}
    </span>
  );
}
