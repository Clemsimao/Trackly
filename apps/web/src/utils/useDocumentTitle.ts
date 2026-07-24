import { useEffect } from 'react';
import { fr } from '../i18n/fr';

/**
 * Fixe le titre de l'onglet par page. Sans titre (fiche en cours de chargement),
 * on retombe sur le nom de l'app seul plutôt que d'afficher « undefined ».
 */
export function useDocumentTitle(title?: string | null): void {
  useEffect(() => {
    document.title = title ? `${title} — ${fr.app.name}` : fr.app.name;
    return () => {
      document.title = fr.app.name;
    };
  }, [title]);
}
