/**
 * L'affiche — la matière première de l'application. Trois responsabilités :
 * l'image, le repli quand le fournisseur n'en a pas, et le liseré de statut.
 *
 * Le repli n'est plus un pictogramme unique pour les quatre médias : le titre
 * y est composé en étiquette de tranche, ce qui reste lisible et identifie
 * l'œuvre. Le TYPE, lui, est porté par l'icône qui accompagne la vignette.
 */
export function Poster({
  url,
  title,
  statusClass,
  className = '',
  sizes,
}: {
  url: string | null;
  title: string;
  /** Classe de fond du liseré de statut, ex. « bg-done ». Omis = pas de liseré. */
  statusClass?: string;
  className?: string;
  sizes?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-(--surface-raised) ring-1 ring-(--border) ${className}`}
    >
      {url ? (
        <img src={url} alt="" loading="lazy" sizes={sizes} className="h-full w-full object-cover" />
      ) : (
        <span className="poster-fallback absolute inset-0 grid place-content-center px-1.5 text-center text-[0.55rem] text-(--text-muted)">
          {title}
        </span>
      )}
      {statusClass ? (
        <span aria-hidden className={`absolute inset-x-0 bottom-0 h-[3px] ${statusClass}`} />
      ) : null}
    </div>
  );
}
