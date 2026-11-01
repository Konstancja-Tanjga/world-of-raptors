/*
 * The rules of module B8's virtual watch point, pure so the build and the
 * tests can run them: which birds cross the sky when (`rozklad`), how big and
 * fast each one is, and how a count is scored (`ocena`). The scene that draws
 * them is PunktObserwacyjny.tsx; the sessions are content/punkt-obserwacyjny.json.
 */

import type { StylLotu } from './sylwetki';

export type Wysokosc = 'nisko' | 'srednio' | 'wysoko';

/** One species in a session: how many birds, in flocks of how many, at what height. */
export type GatunekSesji = { id: string; ile: number; stado?: [number, number]; wysokosc: Wysokosc };

export type Sesja = {
  id: string;
  tytul: string;
  /** Where and when, as the scene's caption says it. */
  miejsce: string;
  opis: string;
  /** Seconds the session lasts. */
  czas: number;
  /** 1: birds cross from left to right, -1: from right to left. */
  kierunek: 1 | -1;
  gatunki: GatunekSesji[];
  /** The species offered as answers, the session's own among them. */
  opcje: string[];
};

/** What the scene needs to know about a species. */
export type PtakPunktu = { id: string; pl: string; rozpietosc: number; styl: StylLotu };

/** One flock (or a lone bird) crossing the sky. */
export type Przelot = {
  n: number;
  gatunek: string;
  /** Seconds after the start when its first bird enters. */
  start: number;
  /** Height on the screen, 0 top to 1 bottom. */
  y: number;
  /** Size: the wingspan as a fraction of the sky's width. */
  skala: number;
  /** Speed in sky-widths a second. */
  predkosc: number;
  /** Heading off the straight line, in radians. */
  kat: number;
  /** The flock's birds: offsets from its leader in wingspans [along, across], and a phase so they do not beat in step. */
  ptaki: { dx: number; dy: number; faza: number }[];
};

/** How fast each flight style crosses the sky, in widths a second: a falcon in a hurry, a vulture in no hurry at all. */
const PREDKOSC: Record<StylLotu, number> = {
  szybuje: 0.055,
  'kreci-ogonem': 0.065,
  kolysze: 0.07,
  zawisa: 0.08,
  'macha-i-szybuje': 0.095,
  szybki: 0.13,
};

/** Height shrinks a bird: high birds are small specks. */
export const SKALA_WYSOKOSCI: Record<Wysokosc, number> = { nisko: 1, srednio: 0.62, wysoko: 0.38 };

/** A deterministic random source (mulberry32): one seed, one session. */
export function losowe(ziarno: number) {
  let a = ziarno >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How long a flock needs to cross the sky (seconds), so the last ones still get across before the end. */
export const czasPrzelotu = (p: Pick<Przelot, 'predkosc' | 'skala' | 'ptaki'>) =>
  (1 + p.skala * (2 + Math.max(0, ...p.ptaki.map((x) => x.dx)))) / p.predkosc;

/**
 * Every flock of a session with its time, height, size and speed: the birds
 * of each species split into flocks of its size, spread over the session so
 * the last has time to cross. The same seed gives the same session.
 */
export function rozklad(sesja: Sesja, ptaki: Record<string, PtakPunktu>, ziarno: number): Przelot[] {
  const los = losowe(ziarno);
  const wynik: Omit<Przelot, 'n'>[] = [];
  for (const g of sesja.gatunki) {
    const ptak = ptaki[g.id];
    if (!ptak) throw new Error(`punkt: gatunku ${g.id} nie ma wśród ptaków sesji ${sesja.id}`);
    let zostalo = g.ile;
    while (zostalo > 0) {
      const [od, doo] = g.stado ?? [1, 1];
      const ile = Math.min(zostalo, od + Math.floor(los() * (doo - od + 1)));
      zostalo -= ile;
      // A bird is as big as its wingspan at its height, with a little spread so heights are not three steps.
      const skala = (ptak.rozpietosc / 100) * 0.075 * SKALA_WYSOKOSCI[g.wysokosc] * (0.85 + los() * 0.3);
      const predkosc = PREDKOSC[ptak.styl] * (0.85 + los() * 0.3);
      const pasmo: Record<Wysokosc, [number, number]> = { nisko: [0.45, 0.8], srednio: [0.25, 0.65], wysoko: [0.12, 0.5] };
      const [y0, y1] = pasmo[g.wysokosc];
      const przelot = {
        gatunek: g.id,
        start: 0,
        y: y0 + los() * (y1 - y0),
        skala,
        predkosc,
        kat: (los() - 0.5) * 0.35,
        // A loose, staggered flock: each bird a wingspan or two behind and beside the last.
        ptaki: Array.from({ length: ile }, (_, i) => ({
          dx: i === 0 ? 0 : i * (0.9 + los() * 1.3),
          dy: i === 0 ? 0 : (los() - 0.5) * Math.min(6, 1.5 + i * 0.6),
          faza: los() * 10,
        })),
      };
      const zapas = Math.max(0, sesja.czas - czasPrzelotu(przelot) - 2);
      przelot.start = 1 + los() * zapas;
      wynik.push(przelot);
    }
  }
  return wynik.sort((a, b) => a.start - b.start).map((p, n) => ({ ...p, n }));
}

/** A row of the summary: a species, how many crossed, how many were counted right, and how many it was taken for wrongly. */
export type WierszOceny = { gatunek: string; przelecialo: number; dobrze: number; mylnie: number };

/**
 * Scores a count: `odpowiedzi` is the species named for each flock (by its
 * number); a flock counts all its birds. A flock taken for another species is
 * counted under that species as a mistake; a flock no one named was missed.
 */
export function ocena(przeloty: Przelot[], odpowiedzi: Record<number, string>) {
  const wiersze = new Map<string, WierszOceny>();
  const wiersz = (g: string) => {
    if (!wiersze.has(g)) wiersze.set(g, { gatunek: g, przelecialo: 0, dobrze: 0, mylnie: 0 });
    return wiersze.get(g)!;
  };
  let wszystkie = 0;
  let dobrze = 0;
  let przeoczone = 0;
  for (const p of przeloty) {
    const ile = p.ptaki.length;
    wszystkie += ile;
    wiersz(p.gatunek).przelecialo += ile;
    const odp = odpowiedzi[p.n];
    if (odp === undefined) przeoczone += ile;
    else if (odp === p.gatunek) {
      wiersz(p.gatunek).dobrze += ile;
      dobrze += ile;
    } else wiersz(odp).mylnie += ile;
  }
  return { wiersze: [...wiersze.values()].sort((a, b) => b.przelecialo - a.przelecialo), wszystkie, dobrze, przeoczone };
}

/** A kettle's estimate scored: how far off it was, in percent of the true number. */
export const bladSzacunku = (prawda: number, szacunek: number) => Math.round((Math.abs(szacunek - prawda) / prawda) * 100);
