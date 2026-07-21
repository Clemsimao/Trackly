import { Link } from '@tanstack/react-router';
import type { SearchResultItem } from '@trackly/contracts';
import { fr } from '../i18n/fr';
import { QuickAddButton } from './library/AddToLibrary';

const TYPE_STYLE: Record<SearchResultItem['mediaType'], string> = {
  game: 'bg-primary/15 text-primary',
  film: 'bg-progress/15 text-progress',
  series: 'bg-done/15 text-done',
};

const TYPE_PATH: Record<SearchResultItem['mediaType'], string> = {
  game: '/media/game/$id',
  film: '/media/film/$id',
  series: '/media/series/$id',
};

export function MediaCard({ item }: { item: SearchResultItem }) {
  return (
    <Link
      to={TYPE_PATH[item.mediaType]}
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
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLE[item.mediaType]}`}
        >
          {fr.media.typeLabel[item.mediaType]}
        </span>
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{item.title}</p>
        {item.year ? <p className="text-xs text-(--text-muted)">{item.year}</p> : null}
      </div>
    </Link>
  );
}
