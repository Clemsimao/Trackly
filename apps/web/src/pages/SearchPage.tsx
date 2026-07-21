import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { MediaType } from '@trackly/contracts';
import { searchCatalog } from '../api/catalog';
import { MediaCard } from '../components/MediaCard';
import { fr } from '../i18n/fr';
import { useDebouncedValue } from '../utils/useDebouncedValue';

const TYPE_FILTERS: Array<{ value: MediaType | undefined; label: string }> = [
  { value: undefined, label: fr.search.typeAll },
  { value: 'game', label: fr.search.typeGame },
  { value: 'film', label: fr.search.typeFilm },
  { value: 'series', label: fr.search.typeSeries },
];

export function SearchPage() {
  const [input, setInput] = useState('');
  const [type, setType] = useState<MediaType | undefined>(undefined);
  const query = useDebouncedValue(input.trim(), 300);
  const enabled = query.length >= 2;

  const { data, isFetching, isError } = useQuery({
    queryKey: ['catalog', 'search', query, type ?? 'all'],
    queryFn: () => searchCatalog(query, type),
    enabled,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-6">
      <h1 className="mb-4 text-2xl font-bold">{fr.search.title}</h1>

      <input
        type="search"
        autoFocus
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={fr.search.placeholder}
        aria-label={fr.search.title}
        className="w-full rounded-xl border border-(--border) bg-(--surface) px-4 py-3 text-lg outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
      />

      <div role="group" aria-label="Filtrer par type" className="mt-3 flex flex-wrap gap-2">
        {TYPE_FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            onClick={() => setType(filter.value)}
            aria-pressed={type === filter.value}
            className={`rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline-2 focus-visible:outline-primary ${
              type === filter.value
                ? 'border-primary bg-primary text-white'
                : 'border-(--border) bg-(--surface) hover:border-primary'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mt-6" aria-live="polite">
        {!enabled ? (
          <p className="text-(--text-muted)">{fr.search.minChars}</p>
        ) : isError ? (
          <p role="alert" className="text-dropped">
            {fr.search.error}
          </p>
        ) : (
          <>
            {data && data.degraded.length > 0 ? (
              <p className="mb-3 text-sm text-paused">{fr.search.degraded}</p>
            ) : null}
            {isFetching && !data ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {Array.from({ length: 8 }, (_, i) => (
                  <div
                    key={i}
                    className="aspect-[2/3] animate-pulse rounded-xl bg-(--border)/50"
                    aria-hidden
                  />
                ))}
              </div>
            ) : data && data.results.length === 0 ? (
              <p className="text-(--text-muted)">{fr.search.empty}</p>
            ) : data ? (
              <div
                className={`grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 ${isFetching ? 'opacity-60' : ''}`}
              >
                {data.results.map((item) => (
                  <MediaCard key={`${item.mediaType}-${item.externalId}`} item={item} />
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
