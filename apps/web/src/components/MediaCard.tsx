import { Link } from '@tanstack/react-router';
import type { MediaType, SearchResultItem } from '@trackly/contracts';
import { fr } from '../i18n/fr';
import { Icon, MEDIA_ICON } from './Icon';
import { Poster } from './Poster';
import { QuickAddButton } from './library/AddToLibrary';

const TYPE_PATH: Record<MediaType, string> = {
  game: '/media/game/$id',
  film: '/media/film/$id',
  series: '/media/series/$id',
  book: '/media/book/$id',
};

export function MediaCard({ item }: { item: SearchResultItem }) {
  const mediaType = item.mediaType;

  return (
    <Link
      to={TYPE_PATH[mediaType]}
      params={{ id: item.externalId }}
      className="group relative block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <QuickAddButton item={item} />
      <Poster
        url={item.posterUrl}
        title={item.title}
        className="aspect-[2/3] transition group-hover:-translate-y-0.5"
        sizes="(min-width: 768px) 12rem, 45vw"
      />
      <p className="mt-2 line-clamp-2 min-h-[2.15rem] font-display text-sm leading-snug font-medium">
        {item.title}
      </p>
      {/*
        Le type est porté par l'ICÔNE, jamais par la couleur : celle-ci est
        réservée au statut. Une pastille verte « Série » ici et une pastille
        verte « Vu » dans la bibliothèque faisaient dire deux choses au même
        signal.
      */}
      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-(--text-muted)">
        <Icon name={MEDIA_ICON[mediaType]} className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{fr.media.typeLabel[mediaType]}</span>
        {item.year ? <span className="tabular ml-auto shrink-0">{item.year}</span> : null}
      </p>
    </Link>
  );
}
