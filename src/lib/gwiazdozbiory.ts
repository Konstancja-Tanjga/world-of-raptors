/**
 * Each module's constellation: a bird that stands for the module, drawn as
 * stars at the corners of its silhouette. Twelve different birds, so no two
 * look alike when the night sky shows them all. The keys are module slugs,
 * also stored in zdobyte.ts. content.ts draws the stars at build (`gwiazdy()`
 * in sylwetka.ts) and checks that every ready module has one and every bird
 * has a silhouette; this module needs no silhouette generator, so placing
 * the stars does not bring it to the browser ("Moje niebo" ships without it).
 */
export const GWIAZDOZBIORY: Record<string, { gatunek: string; nazwa: string }> = {
  'kim-sa-drapiezniki': { gatunek: 'sokol-wedrowny', nazwa: 'Sokół' },
  anatomia: { gatunek: 'orzel-przedni', nazwa: 'Orzeł' },
  'polowanie-i-ekologia': { gatunek: 'pustulka', nazwa: 'Pustułka' },
  rozrod: { gatunek: 'bielik', nazwa: 'Bielik' },
  wedrowki: { gatunek: 'sep-plowy', nazwa: 'Sęp' },
  ochrona: { gatunek: 'orlosep', nazwa: 'Orłosęp' },
  'ludzie-i-drapiezniki': { gatunek: 'plomykowka', nazwa: 'Płomykówka' },
  metoda: { gatunek: 'myszolow', nazwa: 'Myszołów' },
  polska: { gatunek: 'kania-ruda', nazwa: 'Kania' },
  gibraltar: { gatunek: 'trzmielojad', nazwa: 'Trzmielojad' },
  'poludnie-hiszpanii': { gatunek: 'orzel-iberyjski', nazwa: 'Orzeł iberyjski' },
  sowy: { gatunek: 'puchacz', nazwa: 'Puchacz' },
};

/** A star at [x, y], in fractions of the bird's box (0 at the top left). */
export type Gwiazda = [number, number];

/** A module's constellation as the pages get it: its name, its bird, and its stars (the first is the front of the head). */
export type Gwiazdozbior = { nazwa: string; gatunek: string; gwiazdy: Gwiazda[]; proporcja: number };

/**
 * Where a constellation sits: its centre and width in fractions of the sky,
 * and its tilt in degrees.
 */
export type Polozenie = { x: number; y: number; szer: number; obrot: number };

const KOLUMNY = [0.135, 0.375, 0.625, 0.865];
const WIERSZE = [0.19, 0.5, 0.8];
/**
 * Small offsets (dx within ±0.01, dy within ±0.02: ukladNaNiebie relies on
 * those bounds) and tilts, one per place, so a grid of constellations reads
 * as a sky rather than a table.
 */
const DRGANIE: [number, number, number][] = [
  [0, -0.02, -10], [0.01, 0.02, 6], [-0.01, -0.01, -14], [0, 0.02, 9],
  [0.01, 0.01, 4], [0, -0.02, -8], [-0.01, 0.02, 12], [0.01, -0.01, -6],
  [0, 0.01, 8], [-0.01, -0.02, -10], [0.01, 0.02, 6], [0, -0.01, -5],
];

/** How many constellations the "Moje niebo" map has places for (the build checks). */
export const MIEJSCA_NA_MAPIE = KOLUMNY.length * WIERSZE.length;

/**
 * The map on "Moje niebo": a loose four-by-three field in course order (A1
 * at the top left, B5 at the bottom right); the narrow version is two
 * columns. A thirteenth module needs another row in WIERSZE, a seventh on the
 * narrow map and a taller WYMIARY in MapaGwiazdozbiorow.tsx.
 */
export function polozenieNaMapie(indeks: number, waska: boolean): Polozenie {
  const [dx, dy, obrot] = DRGANIE[indeks % DRGANIE.length];
  if (waska) {
    const kolumna = indeks % 2;
    const wiersz = Math.floor(indeks / 2);
    return { x: (kolumna ? 0.72 : 0.28) + dx, y: (wiersz + 0.45) / 6 + dy / 3, szer: 0.36, obrot };
  }
  return { x: KOLUMNY[indeks % 4] + dx, y: WIERSZE[Math.floor(indeks / 4)] + dy, szer: 0.19, obrot };
}

/** A constellation's stars placed in a field `szer` × `wys` pixels wide and high: [x, y] in its pixels. */
export function gwiazdyNaNiebie(
  { gwiazdy, proporcja }: Pick<Gwiazdozbior, 'gwiazdy' | 'proporcja'>,
  p: Polozenie,
  szer: number,
  wys: number,
): [number, number][] {
  const w = p.szer * szer;
  const h = w * proporcja;
  const kat = (p.obrot * Math.PI) / 180;
  return gwiazdy.map(([sx, sy]) => {
    const x = (sx - 0.5) * w;
    const y = (sy - 0.5) * h;
    return [p.x * szer + x * Math.cos(kat) - y * Math.sin(kat), p.y * wys + x * Math.sin(kat) + y * Math.cos(kat)];
  });
}

/** A rectangle of the sky in pixels. */
export type Pole = [lewo: number, gora: number, prawo: number, dol: number];

const NAJWIEKSZY_OBROT = (Math.max(...DRGANIE.map(([, , o]) => Math.abs(o))) * Math.PI) / 180;

/**
 * Where the constellations go in the home page's night sky, in course order:
 * a loose grid over one of the free fields (`pola`: beside the text, above
 * it), each slot nudged and tilted (DRGANIE) and kept clear of the moon's
 * disc. Each number of columns gets as few rows as hold every module. Of
 * those grids, in every field, the winner lets the constellations be largest
 * (up to `maks` pixels wide), then has the most room around them (the larger
 * field), then has cells closest to a tilted constellation's own shape, so
 * the sky between them is even both ways. Null when none holds them at least
 * `min` pixels wide (a phone whose text fills the sky). Positions are fractions of the `szer` × `wys` sky,
 * like polozenieNaMapie's.
 */
export function ukladNaNiebie(
  ile: number,
  proporcja: number,
  pola: Pole[],
  ksiezyc: { x: number; y: number; r: number },
  szer: number,
  wys: number,
  { min = 44, maks = 120 } = {},
): Polozenie[] | null {
  // The box a constellation fills at its steepest tilt, in widths of its bird.
  const sin = Math.sin(NAJWIEKSZY_OBROT);
  const cos = Math.cos(NAJWIEKSZY_OBROT);
  const naSzerokosc = cos + proporcja * sin;
  const naWysokosc = sin + proporcja * cos;
  const ksztalt = naSzerokosc / naWysokosc;
  let najlepszy: { ocena: number[]; miejsca: Polozenie[] } | null = null;
  for (const [x0, y0, x1, y1] of pola) {
    const pw = x1 - x0;
    const ph = y1 - y0;
    if (pw <= 0 || ph <= 0) continue;
    for (let kolumny = 1; kolumny <= ile; kolumny++) {
      const najmniej = Math.ceil(ile / kolumny);
      // A row or two more than needed, for the slots the moon takes.
      for (let wiersze = najmniej; wiersze <= najmniej + 2; wiersze++) {
        const kw = pw / kolumny;
        const kh = ph / wiersze;
        const w = Math.min(maks, (kw * 0.85) / naSzerokosc, (kh * 0.85) / naWysokosc);
        const h = w * proporcja;
        const miejsca: Polozenie[] = [];
        for (let j = 0; j < wiersze; j++) {
          for (let i = 0; i < kolumny; i++) {
            const [dx, dy, obrot] = DRGANIE[(j * kolumny + i) % DRGANIE.length];
            // Nudged within what the cell has to spare, so neighbours never touch.
            const cx = x0 + (i + 0.5) * kw + (dx / 0.01) * (kw - w * naSzerokosc) * 0.3;
            const cy = y0 + (j + 0.5) * kh + (dy / 0.02) * (kh - w * naWysokosc) * 0.3;
            const kat = Math.abs((obrot * Math.PI) / 180);
            const bw = w * Math.cos(kat) + h * Math.sin(kat);
            const bh = w * Math.sin(kat) + h * Math.cos(kat);
            const ox = Math.max(Math.abs(ksiezyc.x - cx) - bw / 2, 0);
            const oy = Math.max(Math.abs(ksiezyc.y - cy) - bh / 2, 0);
            if (Math.hypot(ox, oy) > ksiezyc.r) miejsca.push({ x: cx / szer, y: cy / wys, szer: w / szer, obrot });
          }
        }
        if (miejsca.length < ile) continue;
        // The first difference decides (the area in units of 100 × 100 px, the
        // shape as how far the cell's proportions are from the constellation's).
        const ocena = [Math.round(w), Math.round((pw * ph) / 1e4), -Math.round(Math.abs(Math.log(kw / kh / ksztalt)) * 100)];
        const roznica = najlepszy ? ocena.findIndex((v, k) => v !== najlepszy!.ocena[k]) : 0;
        if (!najlepszy || (roznica >= 0 && ocena[roznica] > najlepszy.ocena[roznica])) {
          najlepszy = { ocena, miejsca: miejsca.slice(0, ile) };
        }
        break;
      }
    }
  }
  if (!najlepszy || najlepszy.ocena[0] < min) return null;
  return najlepszy.miejsca;
}
