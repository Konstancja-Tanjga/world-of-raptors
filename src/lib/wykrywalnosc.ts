/**
 * The rules of A14's detectability exercise (`<ile-ich-jest>`), kept pure so
 * they can be tested. A count is never the number of birds present: each of
 * the N territorial males is heard only if it calls during the visit, with
 * probability p, so a count is a binomial draw (C = p · N on average, after
 * the GIOŚ guide *Monitoring ptaków lęgowych*, 2015, pp. 22–25). From the
 * same p follow a species' detectability on one visit, D = 1 − (1 − p)^N, the
 * chance of having found it after n visits, K = 1 − (1 − D)^n, and how many
 * empty visits it takes to be fairly sure it is not there.
 */

import { losZZiarna } from './stado';

export { losZZiarna };

/** A male's place on the plot, in fractions of its side (0 at the top left). */
export type Samiec = { x: number; y: number };

/** The listening conditions the exercise offers, each with the share of males that call on one visit. */
export const WARUNKI = [
  { id: 'cicha', etykieta: 'Cicha noc', p: 0.7 },
  { id: 'przecietna', etykieta: 'Przeciętna noc', p: 0.5 },
  { id: 'wietrzna', etykieta: 'Wietrzna noc', p: 0.25 },
] as const;
export type Warunki = (typeof WARUNKI)[number]['id'];

/** How many males hold territories on a new plot: between 6 and 14, so a count is never the whole answer. */
export const NAJMNIEJ_SAMCOW = 6;
export const NAJWIECEJ_SAMCOW = 14;

export function liczbaSamcow(los: () => number): number {
  return NAJMNIEJ_SAMCOW + Math.floor(los() * (NAJWIECEJ_SAMCOW - NAJMNIEJ_SAMCOW + 1));
}

/**
 * `ile` males spread over the plot as territories are: no two closer than a
 * fifth of the side at first, the limit relaxed when the plot runs out of
 * room, and none on the edge, so every dot can be drawn whole.
 */
export function rozmiescSamce(ile: number, los: () => number): Samiec[] {
  const samce: Samiec[] = [];
  let odstep = 0.2;
  let proby = 0;
  while (samce.length < ile) {
    if (proby > 300) {
      odstep *= 0.85;
      proby = 0;
    }
    const s = { x: 0.08 + los() * 0.84, y: 0.08 + los() * 0.84 };
    if (samce.some((t) => Math.hypot(t.x - s.x, t.y - s.y) < odstep)) {
      proby++;
      continue;
    }
    samce.push(s);
    proby = 0;
  }
  return samce;
}

/** One visit: which of the N males called (and so were heard), each with probability p. */
export function kontrola(n: number, p: number, los: () => number): boolean[] {
  return Array.from({ length: n }, () => los() < p);
}

/** The result of one visit to a plot with N males, from a seed. */
export function liczenie(n: number, p: number, ziarno: number): number {
  return kontrola(n, p, losZZiarna(ziarno)).filter(Boolean).length;
}

/**
 * The results of `ile` virtual visits to the same plot, as the guide's
 * figures 2.1 and 2.2 show them: how many visits ended with 0, 1, … N males.
 */
export function rozkladWynikow(n: number, p: number, ile: number, ziarno: number): number[] {
  const los = losZZiarna(ziarno);
  const rozklad = new Array<number>(n + 1).fill(0);
  for (let i = 0; i < ile; i++) rozklad[kontrola(n, p, los).filter(Boolean).length]++;
  return rozklad;
}

/**
 * The narrowest run of results around the middle that holds at least `udzial`
 * of the visits: "in 95 visits out of 100 you hear between a and b males".
 * Trimmed from both tails, the rarer end first.
 */
export function zakresWynikow(rozklad: readonly number[], udzial = 0.95): [number, number] {
  const razem = rozklad.reduce((s, x) => s + x, 0);
  if (!razem) return [0, 0];
  let od = 0;
  let doK = rozklad.length - 1;
  let odcieto = 0;
  const wolno = razem * (1 - udzial);
  while (od < doK) {
    const lewy = rozklad[od];
    const prawy = rozklad[doK];
    const mniejszy = lewy <= prawy ? lewy : prawy;
    if (odcieto + mniejszy > wolno) break;
    odcieto += mniejszy;
    if (lewy <= prawy) od++;
    else doK--;
  }
  return [od, doK];
}

/** The chance of hearing at least one of N males on one visit: a species' detectability, D = 1 − (1 − p)^N. */
export function wykrywalnoscGatunku(p: number, n: number): number {
  return 1 - (1 - p) ** n;
}

/** The chance of having found a species present at least once in n visits, each finding it with probability D: K = 1 − (1 − D)^n. */
export function kumulatywna(d: number, n: number): number {
  return 1 - (1 - d) ** n;
}

/**
 * How many visits, all empty, before you can be `pewnosc` sure you would have
 * found the species had it been there: the smallest n with K ≥ pewnosc,
 * ⌈ln(1 − pewnosc) / ln(1 − D)⌉. A species found every time needs one visit;
 * one never found can never be ruled out (Infinity).
 */
export function kontroliDoPewnosci(d: number, pewnosc: number): number {
  if (d >= 1) return 1;
  if (d <= 0 || pewnosc >= 1) return Infinity;
  if (pewnosc <= 0) return 0;
  // A hair off, so 1 − (1 − D)^n landing on the target in floating point still counts as reaching it.
  return Math.max(1, Math.ceil(Math.log(1 - pewnosc) / Math.log(1 - d) - 1e-9));
}

/** The plain estimate from counts made in the same conditions: their mean divided by p (N = C / p). */
export function oszacowanie(wyniki: readonly number[], p: number): number | null {
  if (!wyniki.length || p <= 0) return null;
  return wyniki.reduce((s, x) => s + x, 0) / wyniki.length / p;
}

/** How many different males were heard at least once over the visits so far. */
export function uslyszaneChocRaz(kontrole: readonly (readonly boolean[])[]): number {
  if (!kontrole.length) return 0;
  return kontrole[0].filter((_, i) => kontrole.some((k) => k[i])).length;
}

/** The two forms of the lesson tag: visits to a plot, or how many empty visits rule a species out. */
export type WariantIleIchJest = 'kontrole' | 'powroty';

/** A tag's `data-wariant`, checked: the build stops on any other (the lesson tag is read on the server). */
export function wariantIleIchJest(tekst: string): WariantIleIchJest {
  const w = tekst || 'kontrole';
  if (w !== 'kontrole' && w !== 'powroty') throw new Error(`<ile-ich-jest>: nieznany wariant „${tekst}” (kontrole albo powroty)`);
  return w;
}
