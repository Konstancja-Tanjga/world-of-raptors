/**
 * "Rozpoznaj krok po kroku": which atlas species fit what the observer saw,
 * in the manner of Merlin's Step by Step. No directive and no browser APIs,
 * so the rules can be tested; the page asks the questions (Rozpoznaj.tsx).
 *
 * Every step can be skipped. A region rules a species out; the other steps
 * only score it, because size and colour are easy to misjudge in the field:
 * a neighbouring size still scores half, and colours score the share of the
 * chosen ones the species shows. The species are ranked by the mean score of
 * the steps answered.
 */
import type { Region } from './types';

export const KOLORY = [
  { value: 'bialy', label: 'Biały' },
  { value: 'szary', label: 'Szary' },
  { value: 'czarny', label: 'Czarny' },
  { value: 'brazowy', label: 'Brązowy' },
  { value: 'rudy', label: 'Rudy' },
  { value: 'plowy', label: 'Płowy, kremowy' },
] as const;
export type Kolor = (typeof KOLORY)[number]['value'];
/** As many colours as Merlin asks for: the ones that stood out. */
export const NAJWIECEJ_KOLOROW = 3;

export const ZACHOWANIA = [
  { value: 'krazy', label: 'Krążył wysoko na rozłożonych skrzydłach' },
  { value: 'zawisa', label: 'Zawisał w miejscu, trzepocząc skrzydłami' },
  { value: 'nisko', label: 'Leciał nisko nad polem, łąką albo trzciną' },
  { value: 'goni', label: 'Gonił ptaki albo spadał z wysoka' },
  { value: 'woda', label: 'Polował nad wodą' },
  { value: 'slup', label: 'Siedział na słupie, drzewie albo skale' },
  { value: 'ziemia', label: 'Siedział na ziemi' },
  { value: 'noc', label: 'Latał albo odzywał się po zmroku' },
] as const;
export type Zachowanie = (typeof ZACHOWANIA)[number]['value'];

/** The behaviour step asks in two: flying, perched or after dark first, then (for the first two) how. */
export const RODZAJE_ZACHOWAN = [
  { value: 'lot', label: 'Leciał', zachowania: ['krazy', 'zawisa', 'nisko', 'goni', 'woda'] },
  { value: 'siedzi', label: 'Siedział', zachowania: ['slup', 'ziemia'] },
  { value: 'noc', label: 'Latał albo odzywał się po zmroku', zachowania: ['noc'] },
] as const satisfies readonly { value: string; label: string; zachowania: readonly Zachowanie[] }[];
export type RodzajZachowania = (typeof RODZAJE_ZACHOWAN)[number]['value'];

/** The behaviours a kind of behaviour covers. */
export const zachowaniaRodzaju = (r: RodzajZachowania): readonly Zachowanie[] => RODZAJE_ZACHOWAN.find((x) => x.value === r)!.zachowania;

/** A familiar bird the size step measures against (content/miarka.json, B7). */
export type Odniesienie = { id: string; pl: string; dlugosc_cm: [number, number] };

/** One size to choose: a familiar bird and the body lengths it stands for. */
export type Wielkosc = { id: string; pl: string; od: number; do: number };

const srodek = ([a, b]: [number, number]) => (a + b) / 2;

/**
 * The size choices: one per familiar bird, smallest first, each reaching
 * halfway to its neighbours' lengths (the smallest from 0, the largest on
 * without end).
 */
export function wielkosci(odniesienia: Odniesienie[]): Wielkosc[] {
  const po = [...odniesienia].sort((a, b) => srodek(a.dlugosc_cm) - srodek(b.dlugosc_cm));
  return po.map((o, i) => ({
    id: o.id,
    pl: o.pl,
    od: i === 0 ? 0 : (srodek(po[i - 1].dlugosc_cm) + srodek(o.dlugosc_cm)) / 2,
    do: i === po.length - 1 ? Infinity : (srodek(o.dlugosc_cm) + srodek(po[i + 1].dlugosc_cm)) / 2,
  }));
}

/** What a species brings to the steps. */
export type CechyRozpoznania = {
  id: string;
  regiony: Region[];
  dlugosc_cm: [number, number];
  kolory: Kolor[];
  zachowania: Zachowanie[];
};

/** The answers so far; a step left out was skipped. */
export type Odpowiedzi = {
  region?: Region;
  wielkosc?: string;
  kolory?: Kolor[];
  /** The kind of behaviour, and, when the observer could tell, the behaviour itself. */
  rodzaj?: RodzajZachowania;
  zachowanie?: Zachowanie;
};

export type Ocena = 'pasuje' | 'blisko' | 'nie';
/** How a species fits each step answered, and its mean score (0–1). */
export type Dopasowanie<G> = {
  gatunek: G;
  wynik: number;
  wielkosc?: Ocena;
  /** The chosen colours it shows, out of how many were chosen. */
  kolory?: { trafione: number; z: number };
  zachowanie?: Ocena;
};

const naklada = (a: [number, number], od: number, doCm: number) => a[0] < doCm && a[1] >= od;

/**
 * The species that fit the answers, best first (equal scores keep the given
 * order). Species of another region are left out; so are those that fit no
 * answered step at all.
 */
export function dopasuj<G extends CechyRozpoznania>(gatunki: G[], odp: Odpowiedzi, skala: Wielkosc[]): Dopasowanie<G>[] {
  const i = odp.wielkosc ? skala.findIndex((w) => w.id === odp.wielkosc) : -1;
  const kolory = odp.kolory?.length ? odp.kolory : null;
  const wyniki: Dopasowanie<G>[] = [];
  for (const g of gatunki) {
    if (odp.region && !g.regiony.includes(odp.region)) continue;
    const d: Dopasowanie<G> = { gatunek: g, wynik: 0 };
    const punkty: number[] = [];
    if (i >= 0) {
      const w = skala[i];
      const obok = [skala[i - 1], skala[i + 1]].filter(Boolean);
      d.wielkosc = naklada(g.dlugosc_cm, w.od, w.do) ? 'pasuje' : obok.some((s) => naklada(g.dlugosc_cm, s.od, s.do)) ? 'blisko' : 'nie';
      punkty.push(d.wielkosc === 'pasuje' ? 1 : d.wielkosc === 'blisko' ? 0.5 : 0);
    }
    if (kolory) {
      const trafione = kolory.filter((k) => g.kolory.includes(k)).length;
      d.kolory = { trafione, z: kolory.length };
      punkty.push(trafione / kolory.length);
    }
    const szukane = odp.zachowanie ? [odp.zachowanie] : odp.rodzaj ? zachowaniaRodzaju(odp.rodzaj) : null;
    if (szukane) {
      d.zachowanie = szukane.some((z) => g.zachowania.includes(z)) ? 'pasuje' : 'nie';
      punkty.push(d.zachowanie === 'pasuje' ? 1 : 0);
    }
    d.wynik = punkty.length ? punkty.reduce((a, b) => a + b, 0) / punkty.length : 1;
    if (d.wynik > 0) wyniki.push(d);
  }
  return wyniki.map((d, n) => ({ d, n })).sort((a, b) => b.d.wynik - a.d.wynik || a.n - b.n).map(({ d }) => d);
}

/** The best matches are those less than this far below the top score; the rest wait behind "show more". */
export const ROZNICA_NAJLEPSZYCH = 0.25;

/** Splits matches into the best and the rest (all are best while nothing is answered: every score is 1). */
export function najlepsze<G>(wyniki: Dopasowanie<G>[]) {
  const szczyt = wyniki[0]?.wynik ?? 0;
  const granica = szczyt - ROZNICA_NAJLEPSZYCH;
  const i = wyniki.findIndex((w) => w.wynik <= granica);
  return i < 0 ? { najlepsze: wyniki, reszta: [] } : { najlepsze: wyniki.slice(0, i), reszta: wyniki.slice(i) };
}
