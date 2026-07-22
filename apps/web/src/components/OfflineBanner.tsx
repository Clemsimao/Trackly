import { useEffect, useState } from 'react';
import { fr } from '../i18n/fr';

/**
 * Bandeau d'état réseau (CA G1 : « bandeau clair hors ligne »).
 *
 * `navigator.onLine` ne prouve pas qu'Internet répond — il dit seulement que
 * l'appareil a une interface active. C'est suffisant ici : le faux positif
 * (connecté au wifi mais sans accès) se traduit de toute façon par des données
 * périmées à l'écran, ce que le bandeau annonce déjà.
 */
export function OfflineBanner() {
  const [horsLigne, setHorsLigne] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  );
  const [retabli, setRetabli] = useState(false);

  useEffect(() => {
    const perdue = () => {
      setHorsLigne(true);
      setRetabli(false);
    };
    const revenue = () => {
      setHorsLigne(false);
      setRetabli(true);
    };
    window.addEventListener('offline', perdue);
    window.addEventListener('online', revenue);
    return () => {
      window.removeEventListener('offline', perdue);
      window.removeEventListener('online', revenue);
    };
  }, []);

  // Le retour en ligne s'annonce brièvement, puis s'efface de lui-même.
  useEffect(() => {
    if (!retabli) return;
    const t = setTimeout(() => setRetabli(false), 4000);
    return () => clearTimeout(t);
  }, [retabli]);

  if (!horsLigne && !retabli) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`px-6 py-2 text-center text-sm ${
        horsLigne ? 'bg-paused/15 text-paused' : 'bg-done/15 text-done'
      }`}
    >
      {horsLigne ? fr.network.offline : fr.network.backOnline}
    </div>
  );
}
