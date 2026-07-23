import type { MediaType } from '@trackly/contracts';

/**
 * Types de média branchés côté front.
 *
 * La verticale livres est livrée côté API (recherche, bibliothèque, budget
 * temps) mais l'UI n'est pas encore construite : pas de fiche livre, pas de
 * page bibliothèque livre. En attendant, les livres sont EXCLUS ici et filtrés
 * à la frontière des données — le compilateur garantit ainsi qu'aucun chemin de
 * rendu ne les atteint, plutôt que d'afficher des liens morts.
 *
 * Pour rebrancher les livres : retirer l'exclusion, et les `Record<ShelfMediaType>`
 * signaleront d'eux-mêmes chaque endroit à compléter.
 */
export type ShelfMediaType = Exclude<MediaType, 'book'>;

export function isShelfType(type: MediaType): type is ShelfMediaType {
  return type !== 'book';
}
