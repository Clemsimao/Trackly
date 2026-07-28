import type { ReactNode } from 'react';
import type { MediaType } from '@trackly/contracts';

/**
 * Jeu d'icônes maison. Les emoji ont été retirés de l'interface : ils sont
 * dessinés différemment par chaque système (Windows, Android, iOS), restent
 * multicolores au milieu d'une palette volontairement désaturée, et leur
 * ligne de base désaligne les libellés qu'ils accompagnent.
 *
 * Contrainte de dessin : chaque silhouette doit rester identifiable à 14 px,
 * la plus petite taille utilisée (ligne de métadonnées d'une fiche).
 */
export type IconName =
  | 'game'
  | 'series'
  | 'film'
  | 'book'
  | 'home'
  | 'library'
  | 'search'
  | 'star'
  | 'play'
  | 'sun'
  | 'moon'
  | 'check';

const STROKE: Partial<Record<IconName, ReactNode>> = {
  game: (
    <>
      <path d="M9.3 7.5h5.4a5.6 5.6 0 0 1 5.5 4.5l.7 3.7a2.3 2.3 0 0 1-4.2 1.7l-1.3-2H8.6l-1.3 2a2.3 2.3 0 0 1-4.2-1.7l.7-3.7a5.6 5.6 0 0 1 5.5-4.5Z" />
      <path d="M7.6 10.9v2.4M6.4 12.1h2.4" />
      <circle cx="16.3" cy="12.1" r="1.05" fill="currentColor" stroke="none" />
    </>
  ),
  series: (
    <>
      <rect x="2.5" y="8.2" width="19" height="12" rx="2.4" />
      <path d="m7.6 3.4 4.4 4.8 4.4-4.8" />
    </>
  ),
  film: (
    <>
      <rect x="2.5" y="8.4" width="19" height="11.6" rx="2.2" />
      <path d="M2.5 13.2h19" />
      <path d="m7.4 8.4 2.3 4.8M12.4 8.4l2.3 4.8M17.4 8.4l2.3 4.8" />
    </>
  ),
  book: <path d="M6.2 3.6h11.3a1 1 0 0 1 1 1v14.8a1 1 0 0 1-1 1H6.2a2.6 2.6 0 1 1 0-5.2h12.3" />,
  home: (
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.8 9.2V20h12.4V9.2" />
    </>
  ),
  library: (
    <>
      <rect x="3.2" y="4.8" width="4.4" height="15.2" rx="1.2" />
      <rect x="9.4" y="4.8" width="4.4" height="15.2" rx="1.2" />
      <rect x="15.4" y="4.8" width="4.4" height="15.2" rx="1.2" transform="rotate(13 17.6 12.4)" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.4 4.4" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.2M12 19.2v2.2M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.4 19.6 6 18M18 6l1.6-1.6" />
    </>
  ),
  moon: <path d="M20 14.2A8.4 8.4 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2Z" />,
  check: <path d="m4.5 12.5 5 5 10-11" />,
};

/** Icônes pleines : elles doivent lire comme un aplat, pas comme un contour. */
const FILLED: Partial<Record<IconName, ReactNode>> = {
  star: (
    <path d="M12 3.1a.5.5 0 0 1 .45.28l2.4 4.87 5.37.78a.5.5 0 0 1 .28.85l-3.89 3.79.92 5.35a.5.5 0 0 1-.73.53L12 17.02l-4.8 2.53a.5.5 0 0 1-.73-.53l.92-5.35-3.89-3.79a.5.5 0 0 1 .28-.85l5.37-.78 2.4-4.87A.5.5 0 0 1 12 3.1Z" />
  ),
  play: (
    <path d="M8 5.4v13.2a.6.6 0 0 0 .92.5l10.4-6.6a.6.6 0 0 0 0-1L8.92 4.9a.6.6 0 0 0-.92.5Z" />
  ),
};

export function Icon({ name, className = 'h-4 w-4' }: { name: IconName; className?: string }) {
  const filled = FILLED[name];
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      focusable="false"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {filled ?? STROKE[name]}
    </svg>
  );
}

/** Le TYPE de média est porté par l'icône — jamais par la couleur, qui code le statut. */
export const MEDIA_ICON: Record<MediaType, IconName> = {
  game: 'game',
  series: 'series',
  film: 'film',
  book: 'book',
};
