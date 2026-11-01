/**
 * The rules of B9's flock count, kept pure so they can be tested. A flock of
 * waders resting on the mud is drawn from a seed: birds packed in clumps,
 * smaller and denser towards the far edge, as perspective makes them. The
 * reader estimates it by blocks (count ten, see how many tens fit) and is
 * scored by how far off the estimate is; counters tend to undercount big
 * flocks, so the feedback says which way the miss went.
 */

/** A bird of the flock: its place in fractions of the picture (0 at the top left) and its size. */
export type PtakStada = { x: number; y: number; r: number };

/** A generator of numbers in [0, 1) from a seed, so one seed always draws the same flock. */
export function losZZiarna(ziarno: number): () => number {
  let s = ziarno % 2147483647 || 1;
  if (s < 0) s += 2147483646;
  const dalej = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  // A small seed's first numbers are all near 0; a few steps spread them.
  for (let i = 0; i < 8; i++) dalej();
  return dalej;
}

/** The three rounds, smallest first: a flock you could count one by one, one you must count by tens, and one by hundreds. */
export const RUNDY_STADA: readonly (readonly [number, number])[] = [
  [35, 70],
  [140, 260],
  [450, 800],
];

export function liczebnosc(runda: number, los: () => number): number {
  const [od, doIlu] = RUNDY_STADA[runda];
  return od + Math.floor(los() * (doIlu - od + 1));
}

/**
 * `ile` birds in the lower two thirds of the picture (the upper third is
 * water and sky), in three to six clumps; the far ones (small y) are smaller,
 * and no two overlap much, so every bird can be counted. A clump that runs
 * out of room spreads wider, so the flock always has exactly `ile` birds:
 * the round's range is what the reader is told. A grid of cells holds the
 * birds already placed, so each new one is checked against its neighbours only.
 */
export function rysujStado(ile: number, los: () => number): PtakStada[] {
  const skupiska = Array.from({ length: 3 + Math.floor(los() * 4) }, () => ({ x: 0.15 + los() * 0.7, y: 0.45 + los() * 0.4, s: 0.06 + los() * 0.1 }));
  const ptaki: PtakStada[] = [];
  // Cells larger than any two birds' clearance, so a clash can only be in the 3×3 cells around.
  const KOMORKA = 0.025;
  const siatka = new Map<string, PtakStada[]>();
  const klucz = (i: number, j: number) => `${i}:${j}`;
  let nieudane = 0;
  while (ptaki.length < ile) {
    if (nieudane > 200) {
      for (const k of skupiska) k.s *= 1.15;
      nieudane = 0;
    }
    const k = skupiska[Math.floor(los() * skupiska.length)];
    // A rough normal spread around the clump, wider than tall, as a flock on a flat shore looks.
    const g = () => los() + los() + los() - 1.5;
    const x = k.x + g() * k.s * 1.6;
    const y = k.y + g() * k.s * 0.5;
    const r = 0.004 + 0.005 * ((y - 0.36) / 0.61);
    const i = Math.floor(x / KOMORKA);
    const j = Math.floor(y / KOMORKA);
    const sasiedzi = [-1, 0, 1].flatMap((di) => [-1, 0, 1].flatMap((dj) => siatka.get(klucz(i + di, j + dj)) ?? []));
    if (x < 0.03 || x > 0.97 || y < 0.36 || y > 0.97 || sasiedzi.some((p) => Math.hypot((p.x - x) * 1.6, p.y - y) < (p.r + r) * 1.1)) {
      nieudane++;
      continue;
    }
    const ptak = { x, y, r };
    ptaki.push(ptak);
    siatka.set(klucz(i, j), [...(siatka.get(klucz(i, j)) ?? []), ptak]);
    nieudane = 0;
  }
  return ptaki;
}

/** The ten birds nearest a bird near the middle of the flock: the block the answer shows. */
export function blokDziesieciu(ptaki: readonly PtakStada[]): number[] {
  if (!ptaki.length) return [];
  const sx = ptaki.reduce((s, p) => s + p.x, 0) / ptaki.length;
  const sy = ptaki.reduce((s, p) => s + p.y, 0) / ptaki.length;
  const odl = (p: PtakStada, x: number, y: number) => Math.hypot(p.x - x, p.y - y);
  const srodek = ptaki.reduce((n, p, i) => (odl(p, sx, sy) < odl(ptaki[n], sx, sy) ? i : n), 0);
  return ptaki
    .map((p, i) => [i, odl(p, ptaki[srodek].x, ptaki[srodek].y)] as const)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 10)
    .map(([i]) => i);
}

export type OcenaSzacunku = {
  /** The miss as a fraction of the true count: −0.2 is 20% too few. */
  blad: number;
  /** Within a fifth either way: as good as a field count gets for a flock this size. */
  trafiony: boolean;
  kierunek: 'za-malo' | 'za-duzo' | 'dokladnie';
};

export function ocenSzacunek(szacunek: number, prawda: number): OcenaSzacunku {
  const blad = (szacunek - prawda) / prawda;
  return { blad, trafiony: Math.abs(blad) <= 0.2, kierunek: szacunek === prawda ? 'dokladnie' : szacunek < prawda ? 'za-malo' : 'za-duzo' };
}
