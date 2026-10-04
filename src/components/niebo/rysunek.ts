import 'server-only';
import { obrys, POZA_SZYBOWANIE, ramka, sciezka } from '@/lib/sylwetka';
import { POZY, SYLWETKI } from '@/lib/sylwetki';

/** A species' silhouette as path data with its own box, for drawing inside a larger SVG. */
export type Rysunek = { d: string; viewBox: string; proporcja: number };

/**
 * Drawn on the server and passed to the patches as data, so the silhouette
 * generator stays out of the browser's bundle.
 */
export function rysunek(id: string): Rysunek {
  const ksztalt = SYLWETKI[id];
  if (!ksztalt) throw new Error(`niebo: ${id} nie ma sylwetki`);
  const punkty = obrys(ksztalt, POZY[id] ?? POZA_SZYBOWANIE);
  const [x, y, w, h] = ramka(punkty);
  return { d: sciezka(punkty, 0.25), viewBox: `${x - 2} ${y - 2} ${w + 4} ${h + 4}`, proporcja: (h + 4) / (w + 4) };
}
