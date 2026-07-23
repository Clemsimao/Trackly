import { Link } from '@tanstack/react-router';
import type { SearchResultItem } from '@trackly/contracts';
import { fr } from '../i18n/fr';
import { isShelfType, type ShelfMediaType } from '../utils/mediaTypes';
import { QuickAddButton } from './library/AddToLibrary';

const TYPE_STYLE: Record<ShelfMediaType, string> = {
  game: 'bg-primary/15 text-link',
  film: 'bg-progress/15 text-progress',
  series: 'bg-done/15 text-done',
};

const TYPE_PATH: Record<ShelfMediaType, string> = {
  game: '/media/game/$id',
  film: '/media/film/$id',
  series: '/media/series/$id',
};

export function MediaCard({ item }: { item: SearchResultItem }) {
  // Filet : les livres sont filtrés en amont (SearchPage), on ne les rend jamais.
  const mediaType = item.mediaType;
  if (!isShelfType(mediaType)) return null;

  return (
    <Link
      to={TYPE_PATH[mediaType]}
      params={{ id: item.externalId }}
      className="group relative overflow-hidden rounded-xl border border-(--border) bg-(--surface) transition hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
    >
      <QuickAddButton item={item} />
      <div className="aspect-[2/3] w-full bg-(--border)/40">
        {item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl" aria-hidden>
            🎲
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLE[mediaType]}`}
        >
          {fr.media.typeLabel[mediaType]}
        </span>
        <p className="line-clamp-2 font-display text-sm font-medium leading-snug">{item.title}</p>
        {item.year ? <p className="text-xs text-(--text-muted)">{item.year}</p> : null}
      </div>
    </Link>
  );
}
