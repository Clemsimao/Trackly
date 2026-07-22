import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import type { QueryClient } from '@tanstack/react-query';

/**
 * Persistance locale du cache React Query — CA G1 : « consultation en lecture des
 * dernières données chargées hors connexion ».
 *
 * La règle du Lot 5 « /api n'est JAMAIS mis en cache » reste valable **pour le
 * service worker** : son cache HTTP est partagé, indexé par URL et survit à la
 * déconnexion sans qu'on puisse le vider proprement. Ici c'est un cache
 * applicatif dont on maîtrise le cycle de vie : purgé à la déconnexion et sur
 * toute réponse 401, invalidé à chaque déploiement, expiré au bout de 7 jours.
 *
 * Contrepartie assumée : la bibliothèque de l'utilisateur (titres, progression,
 * e-mail) est écrite en clair dans le localStorage de SON appareil. Rien de
 * sensible au sens RGPD strict, mais ce n'est plus « aucune donnée sur le
 * disque » : c'est le prix du hors-ligne. Un XSS y aurait accès — comme il
 * aurait accès à l'API elle-même via le cookie de session.
 */
const CLE = 'trackly-cache';

/** Une semaine : au-delà, mieux vaut un écran vide qu'un état trompeur. */
export const DUREE_MAX_MS = 7 * 24 * 60 * 60 * 1000;

export const persister = createSyncStoragePersister({
  storage: typeof window === 'undefined' ? undefined : window.localStorage,
  key: CLE,
  // Le localStorage peut être plein ou refusé (navigation privée) : on dégrade
  // en silence vers une app sans hors-ligne plutôt que de casser le rendu.
  retry: () => undefined,
});

/**
 * Identifiant de build : change à chaque déploiement, ce qui invalide le cache.
 * Évite qu'un ancien état restauré ne rencontre une nouvelle forme de données.
 */
export const buster = __BUILD_ID__;

/** Déconnexion ou session expirée : plus rien ne doit rester sur l'appareil. */
export async function purgerCacheLocal(queryClient: QueryClient): Promise<void> {
  queryClient.clear();
  await persister.removeClient();
}
