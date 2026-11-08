/**
 * The rules of A15's exercise "Czy to trend?", kept pure so they can be
 * tested. A population is drawn from a seed: a true rate of change a year,
 * random swings between years, and counts that see each bird only with some
 * probability (C = p · N), repeated a few times each season. The counts
 * become a yearly result (the mean of the season's counts, or the largest of
 * them), the results an index against the first year, and the index a
 * log-linear trend, classed as PECBMS classes the slopes TRIM gives: by the
 * slope's 95% confidence interval (slope ± 1.96 standard errors) against no
 * change (1.00) and ±5% a year (0.95, 1.05). See
 * https://pecbms.info/trends-and-indicators/species-trends/.
 */

import { losZZiarna } from './stado';

export { losZZiarna };

export type ParametrySerii = {
  /** How many years were counted. */
  lata: number;
  rokPoczatkowy: number;
  /** Birds (or territories) present in the first year. */
  n0: number;
  /** The true change, on the log scale, a year: 0.03 is about +3% a year. */
  tempo: number;
  /** How much a year swings around the trend: the standard deviation of its log. */
  wahania: number;
  /** The chance that one count finds a bird that is there (p). */
  wykrywalnosc: number;
  /** Counts a season. */
  kontrole: number;
};

export type Seria = {
  lata: number[];
  /** Birds actually present each year. */
  prawdziwe: number[];
  /** Each year's counts, `kontrole` of them. */
  liczenia: number[][];
};

/** A number from a standard normal distribution (Box–Muller). */
function normalny(los: () => number): number {
  const u = 1 - los();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * los());
}

/** How many of `n` birds one count finds, each with the chance `p`. */
export function liczenie(n: number, p: number, los: () => number): number {
  let wykryte = 0;
  for (let i = 0; i < n; i++) if (los() < p) wykryte++;
  return wykryte;
}

/** Never fewer birds than this: a population that has gone is a different lesson. */
const NAJMNIEJ = 5;

export function seria(p: ParametrySerii, los: () => number): Seria {
  const lata: number[] = [];
  const prawdziwe: number[] = [];
  const liczenia: number[][] = [];
  for (let t = 0; t < p.lata; t++) {
    // The first year is the start the reader is told about, without a swing of its own.
    const n = Math.max(NAJMNIEJ, Math.round(p.n0 * Math.exp(p.tempo * t + (t ? normalny(los) * p.wahania : 0))));
    lata.push(p.rokPoczatkowy + t);
    prawdziwe.push(n);
    liczenia.push(Array.from({ length: p.kontrole }, () => liczenie(n, p.wykrywalnosc, los)));
  }
  return { lata, prawdziwe, liczenia };
}

export type SposobWyniku = 'srednia' | 'najwiekszy';

/** A season's result: the mean of all its counts, or (the shortcut the GIOŚ guide warns against) the largest one. */
export function wynikRoku(liczenia: readonly number[], sposob: SposobWyniku): number {
  if (!liczenia.length) throw new Error('wynikRoku: brak liczeń');
  return sposob === 'najwiekszy' ? Math.max(...liczenia) : liczenia.reduce((s, c) => s + c, 0) / liczenia.length;
}

/** Each year's result as a multiple of the base year's (the first, unless said otherwise). */
export function indeksy(wyniki: readonly number[], rokBazowy = 0): number[] {
  const baza = wyniki[rokBazowy];
  if (!(baza > 0)) throw new Error('indeksy: wynik roku bazowego musi być większy od zera');
  return wyniki.map((w) => w / baza);
}

export type Trend = {
  /** The slope on the log scale: ln of the multiplier a year. */
  nachylenie: number;
  /** Its standard error. */
  blad: number;
  /** The multiplicative slope, exp(nachylenie): 0.97 is −3% a year. */
  mnoznik: number;
  /** The 95% confidence interval of the multiplier: exp(nachylenie ∓ 1.96 · blad). */
  dolna: number;
  gorna: number;
  /** ln of the fitted value in year 0, so the line can be drawn. */
  wyrazWolny: number;
  /** How many years the line was fitted to. */
  lat: number;
};

/**
 * A straight line through the logs of the values, by least squares: an
 * exponential trend, one number for its direction and pace. A year with
 * nothing counted is left out, as a log cannot take a zero (TRIM, which
 * models the counts themselves, keeps it). Needs at least three years.
 */
export function trendLogLiniowy(wartosci: readonly number[]): Trend {
  const punkty = wartosci.flatMap((v, t) => (v > 0 ? [[t, Math.log(v)] as const] : []));
  const n = punkty.length;
  if (n < 3) throw new Error('trendLogLiniowy: potrzeba co najmniej trzech lat z wynikiem');
  const sx = punkty.reduce((s, [x]) => s + x, 0) / n;
  const sy = punkty.reduce((s, [, y]) => s + y, 0) / n;
  const sxx = punkty.reduce((s, [x]) => s + (x - sx) ** 2, 0);
  const sxy = punkty.reduce((s, [x, y]) => s + (x - sx) * (y - sy), 0);
  const nachylenie = sxy / sxx;
  const wyrazWolny = sy - nachylenie * sx;
  const reszty = punkty.reduce((s, [x, y]) => s + (y - wyrazWolny - nachylenie * x) ** 2, 0);
  const blad = Math.sqrt(reszty / (n - 2) / sxx);
  return {
    nachylenie,
    blad,
    mnoznik: Math.exp(nachylenie),
    dolna: Math.exp(nachylenie - 1.96 * blad),
    gorna: Math.exp(nachylenie + 1.96 * blad),
    wyrazWolny,
    lat: n,
  };
}

/** The multiplier as a change in percent a year: 1.035 → 3.5. */
export const zmianaRoczna = (mnoznik: number) => (mnoznik - 1) * 100;

/** The change over the whole series in percent, as reports give it: the yearly multiplier compounded. */
export const zmianaCalkowita = (mnoznik: number, lat: number) => (mnoznik ** (lat - 1) - 1) * 100;

export type KlasaTrendu = 'silny-wzrost' | 'umiarkowany-wzrost' | 'stabilny' | 'niepewny' | 'umiarkowany-spadek' | 'silny-spadek';

/** PECBMS's six classes, from up to down, in Polish, with what each means. */
export const KLASY_TRENDU: readonly { id: KlasaTrendu; nazwa: string; opis: string }[] = [
  { id: 'silny-wzrost', nazwa: 'Silny wzrost', opis: 'pewnie szybciej niż 5% rocznie' },
  { id: 'umiarkowany-wzrost', nazwa: 'Umiarkowany wzrost', opis: 'pewny wzrost, ale nie pewnie szybszy niż 5% rocznie' },
  { id: 'stabilny', nazwa: 'Stabilny', opis: 'ani pewnego wzrostu, ani spadku, a zmiana na pewno mniejsza niż 5% rocznie' },
  { id: 'niepewny', nazwa: 'Niepewny', opis: 'ani pewnego wzrostu, ani spadku, ale dane nie wykluczają zmiany o ponad 5% rocznie' },
  { id: 'umiarkowany-spadek', nazwa: 'Umiarkowany spadek', opis: 'pewny spadek, ale nie pewnie szybszy niż 5% rocznie' },
  { id: 'silny-spadek', nazwa: 'Silny spadek', opis: 'pewnie szybciej niż 5% rocznie' },
];

/**
 * The PECBMS class of a trend, by its confidence interval: strong increase
 * when even the lower limit is above 1.05, moderate when it is above 1.00;
 * steep or moderate decline the same way down; when the interval holds 1.00,
 * stable if it stays within 0.95–1.05, else uncertain. A limit exactly on a
 * threshold counts towards the weaker class.
 */
export function klasa({ dolna, gorna }: Pick<Trend, 'dolna' | 'gorna'>): KlasaTrendu {
  if (dolna > 1.05) return 'silny-wzrost';
  if (dolna > 1) return 'umiarkowany-wzrost';
  if (gorna < 0.95) return 'silny-spadek';
  if (gorna < 1) return 'umiarkowany-spadek';
  return dolna > 0.95 && gorna < 1.05 ? 'stabilny' : 'niepewny';
}

export const nazwaKlasy = (k: KlasaTrendu) => KLASY_TRENDU.find((x) => x.id === k)!.nazwa;

/**
 * The rounds of the exercise: each a series length and how much its years
 * swing, from a long, calm series to a short, restless one, so that the last
 * rounds are where "Niepewny" is often the honest answer. The true rates are
 * dealt from TEMPA, so five rounds see five different populations.
 */
export const RUNDY_TRENDU: readonly { lata: number; wahania: number }[] = [
  { lata: 15, wahania: 0.08 },
  { lata: 12, wahania: 0.12 },
  { lata: 15, wahania: 0.15 },
  { lata: 10, wahania: 0.2 },
  { lata: 8, wahania: 0.25 },
];

/** True rates a year on the log scale: about −9%, −3%, 0, +3% and +9%. */
export const TEMPA = [-0.095, -0.03, 0, 0.03, 0.085] as const;

/** The rates in the order the rounds get them, shuffled by the seed. */
export function kolejnoscTemp(los: () => number): number[] {
  const t: number[] = [...TEMPA];
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(los() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

/** A round's population: its length and swings from RUNDY_TRENDU, the rate given, and a start and detectability from the seed. */
export function parametryRundy(runda: number, tempo: number, los: () => number): ParametrySerii {
  const { lata, wahania } = RUNDY_TRENDU[runda];
  return {
    lata,
    rokPoczatkowy: 2026 - lata,
    n0: 60 + Math.floor(los() * 101),
    tempo,
    wahania,
    wykrywalnosc: 0.45 + Math.round(los() * 30) / 100,
    kontrole: 3,
  };
}
