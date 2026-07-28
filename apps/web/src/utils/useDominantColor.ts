import { useEffect, useState } from 'react';

/**
 * Couleur dominante d'une affiche, pour teinter le bandeau « à reprendre ».
 *
 * C'est le geste signature de la direction « Étagère » : l'œuvre colore sa
 * propre place dans l'interface. L'échantillonnage se fait sur un canvas
 * minuscule (16×24), une fois, au chargement de l'image.
 *
 * Deux garde-fous :
 * - les pixels quasi gris sont ignorés, sinon toutes les affiches convergent
 *   vers le même beige boueux ;
 * - si le canvas est souillé (image tierce sans en-tête CORS) `getImageData`
 *   lève : on renvoie null et le bandeau reste neutre. La teinte est un bonus,
 *   jamais une dépendance.
 */
export function useDominantColor(url: string | null): string | null {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    setColor(null);
    if (!url) return;

    let annule = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (annule) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 24;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 16, 24);
        const { data } = ctx.getImageData(0, 0, 16, 24);

        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let i = 0; i < data.length; i += 4) {
          const pr = data[i];
          const pg = data[i + 1];
          const pb = data[i + 2];
          const pa = data[i + 3];
          if (pr == null || pg == null || pb == null || pa == null) continue;
          if (pa < 200) continue;
          if (Math.max(pr, pg, pb) - Math.min(pr, pg, pb) < 18) continue; // pixel gris
          r += pr;
          g += pg;
          b += pb;
          n += 1;
        }
        if (n === 0 || annule) return;
        setColor(`rgb(${Math.round(r / n)} ${Math.round(g / n)} ${Math.round(b / n)})`);
      } catch {
        // Canvas souillé ou indisponible : pas de teinte, le bandeau reste neutre.
      }
    };

    img.src = url;
    return () => {
      annule = true;
    };
  }, [url]);

  return color;
}
