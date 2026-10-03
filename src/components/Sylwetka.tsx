import { obrys, POZA_SZYBOWANIE, ramka, sciezka, type Poza } from '@/lib/sylwetka';
import { POZY, SYLWETKI } from '@/lib/sylwetki';

/**
 * A species' silhouette from below, as a static SVG (no script): the shape
 * the B1 lessons teach. Decorative by default; pass `opis` when the drawing
 * itself carries information (e.g. an identification plate).
 *
 * `skala` draws it at true relative size: 1 = the widest atlas wingspan fills
 * the box, so several silhouettes side by side compare like on a plate.
 */
export function Sylwetka({
  id,
  poza,
  opis,
  klasa,
  skala,
}: {
  id: string;
  poza?: Poza;
  opis?: string;
  klasa?: string;
  /** Wingspan in cm and the widest wingspan in the set, for drawings at scale. */
  skala?: { cm: number; maks: number };
}) {
  const ksztalt = SYLWETKI[id];
  if (!ksztalt) return null;
  const punkty = obrys(ksztalt, poza ?? POZY[id] ?? POZA_SZYBOWANIE);
  const [x, y, w, h] = ramka(punkty);
  const margines = 4;
  let viewBox = `${x - margines} ${y - margines} ${w + 2 * margines} ${h + 2 * margines}`;
  if (skala) {
    // The box is as wide as the widest bird; this one is drawn at its share.
    const k = skala.maks / skala.cm;
    const szer = 200 * k + 2 * margines;
    const wys = 140 * k;
    viewBox = `${-szer / 2} ${y + h / 2 - wys / 2} ${szer} ${wys}`;
  }
  return (
    <svg
      className={klasa ?? 'sylwetka'}
      viewBox={viewBox}
      role={opis ? 'img' : undefined}
      aria-label={opis}
      aria-hidden={opis ? undefined : true}
      focusable="false"
    >
      <path d={sciezka(punkty, 0.12)} />
    </svg>
  );
}
