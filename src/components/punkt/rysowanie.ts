import { obrys, POZA_SZYBOWANIE, type Poza } from '@/lib/sylwetka';
import { POZY, pozaWLocie, SYLWETKI, type StylLotu } from '@/lib/sylwetki';

/*
 * Drawing flying silhouettes on a 2D canvas for B8's watch point and kettle.
 * Outlines are cached per species and pose, rounded to a few steps, so a sky
 * of fifty birds draws the generator's numbers only a handful of times.
 */

const pamiec = new Map<string, Path2D>();
const krok = (x: number) => Math.round(x * 20) / 20;

/** A species' outline in a pose, as a path one unit (one wingspan) wide, the head towards -y. */
function sciezka(id: string, poza: Poza) {
  const klucz = `${id}:${krok(poza.wznios)}:${krok(poza.zgiecie)}:${krok(poza.ogon)}`;
  let p = pamiec.get(klucz);
  if (!p) {
    p = new Path2D();
    const k = SYLWETKI[id];
    if (k) {
      obrys(k, { wznios: krok(poza.wznios), zgiecie: krok(poza.zgiecie), ogon: krok(poza.ogon) }).forEach(([x, y], i) =>
        i === 0 ? p!.moveTo(x / 200, y / 200) : p!.lineTo(x / 200, y / 200),
      );
      p.closePath();
    }
    pamiec.set(klucz, p);
  }
  return p;
}

/** The pose a species flies in `t` seconds into its flight, and its tilt in radians. */
export function pozaPtaka(id: string, styl: StylLotu, t: number) {
  const { poza, przechyl } = pozaWLocie(styl, t, POZY[id] ?? POZA_SZYBOWANIE);
  return { poza, przechyl: (przechyl * Math.PI) / 180 };
}

/**
 * Draws one bird: centred at (x, y) in CSS pixels, `rozpietosc` pixels across,
 * heading `kierunek` radians (0: to the right), banked by `przechyl` (which
 * narrows the span as a tilted bird does from below).
 */
export function rysujPtaka(
  ctx: CanvasRenderingContext2D,
  dpr: number,
  id: string,
  poza: Poza,
  x: number,
  y: number,
  kierunek: number,
  rozpietosc: number,
  przechyl = 0,
) {
  const c = Math.cos(kierunek + Math.PI / 2);
  const s = Math.sin(kierunek + Math.PI / 2);
  const sx = rozpietosc * Math.cos(przechyl);
  const sy = rozpietosc;
  ctx.setTransform(dpr * c * sx, dpr * s * sx, -dpr * s * sy, dpr * c * sy, dpr * x, dpr * y);
  ctx.fill(sciezka(id, poza));
}

/** Fits a canvas's backing store to its CSS size and the screen's density; returns the CSS size and density. */
export function dopasujPlotno(canvas: HTMLCanvasElement) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const szer = canvas.clientWidth;
  const wys = canvas.clientHeight;
  if (canvas.width !== Math.round(szer * dpr) || canvas.height !== Math.round(wys * dpr)) {
    canvas.width = Math.round(szer * dpr);
    canvas.height = Math.round(wys * dpr);
  }
  return { szer, wys, dpr };
}
