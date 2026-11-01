/**
 * "Punkty obserwacji": where to stand to watch birds (content/punkty-obserwacji.json)
 * and which points lie nearest a place. No directive and no browser APIs, so
 * the rules can be tested; the page finds the place (PunktyObserwacji.tsx),
 * by name through Open-Meteo's geocoding or from the browser's location.
 *
 * The wind rule follows the course (B3 lesson 1): in autumn a Levante, from
 * the east, drifts the passage west towards Tarifa, a Poniente, from the
 * west, east towards Algeciras and Gibraltar. A point with no wind listed
 * works whatever blows.
 */
import type { MiejscePlanera } from './planer';

export const OKOLICE = [
  { value: 'okolice-tarify', label: 'Okolice Tarify' },
  { value: 'okolice-algeciras', label: 'Okolice Algeciras i Gibraltaru' },
  { value: 'la-janda-i-barbate', label: 'La Janda i Barbate' },
  { value: 'polska', label: 'Polska' },
] as const;
export type Okolica = (typeof OKOLICE)[number]['value'];

export const WIATRY = ['lewant', 'poniente'] as const;
export type Wiatr = (typeof WIATRY)[number];

export type Wspolrzedne = { szer: number; dl: number };

export type PunktObserwacji = Wspolrzedne & {
  id: string;
  nazwa: string;
  okolica: Okolica;
  /** A migration watchpoint, or a site for resident and wintering birds. */
  rodzaj: 'przelot' | 'lokalne';
  wysokosc_m?: number;
  /** The coordinates mark the area, not the exact spot. */
  przyblizone?: boolean;
  opis: string;
  dojazd: string;
  /** The autumn winds that make it the place to be; empty when the wind does not choose it. */
  wiatr: Wiatr[];
  /** Months (1–12) worth going, and the best of them. */
  miesiace: number[];
  szczyt: number[];
  pora_dnia: string;
  /** Ids from gatunki.json or ptaki-mokradel.json. */
  gatunki: string[];
  inne_ptaki?: string;
  /** "modul/lekcja": the lesson about the place. */
  lekcja: string;
  /** The trip planner's site, when it plans this place. */
  planer?: MiejscePlanera;
  zrodla: { nazwa: string; url: string }[];
  /** What is still to check by hand (listed by `next dev`, never on a page). */
  todo?: string;
};

export const MIESIACE = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export const NAZWY_MIESIECY = [
  'styczeń',
  'luty',
  'marzec',
  'kwiecień',
  'maj',
  'czerwiec',
  'lipiec',
  'sierpień',
  'wrzesień',
  'październik',
  'listopad',
  'grudzień',
];

const PROMIEN_ZIEMI_KM = 6371;
const rad = (st: number) => (st * Math.PI) / 180;

/** Great-circle distance in kilometres (haversine). */
export function odleglosc(a: Wspolrzedne, b: Wspolrzedne) {
  const dSzer = rad(b.szer - a.szer);
  const dDl = rad(b.dl - a.dl);
  const h = Math.sin(dSzer / 2) ** 2 + Math.cos(rad(a.szer)) * Math.cos(rad(b.szer)) * Math.sin(dDl / 2) ** 2;
  return 2 * PROMIEN_ZIEMI_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const KIERUNKI = [
  'na północ',
  'na północny wschód',
  'na wschód',
  'na południowy wschód',
  'na południe',
  'na południowy zachód',
  'na zachód',
  'na północny zachód',
];

/** Which way b lies from a, as one of eight compass directions in Polish ("na południowy zachód"). */
export function kierunek(a: Wspolrzedne, b: Wspolrzedne) {
  const y = Math.sin(rad(b.dl - a.dl)) * Math.cos(rad(b.szer));
  const x = Math.cos(rad(a.szer)) * Math.sin(rad(b.szer)) - Math.sin(rad(a.szer)) * Math.cos(rad(b.szer)) * Math.cos(rad(b.dl - a.dl));
  const azymut = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return KIERUNKI[Math.round(azymut / 45) % 8];
}

export type PunktOdMiejsca<P extends Wspolrzedne = PunktObserwacji> = { punkt: P; km: number; kierunek: string };

/** Points from the nearest to the farthest, each with its distance and direction from `z`. */
export function najblizsze<P extends Wspolrzedne>(punkty: P[], z: Wspolrzedne): PunktOdMiejsca<P>[] {
  return punkty
    .map((punkt) => ({ punkt, km: odleglosc(z, punkt), kierunek: kierunek(z, punkt) }))
    .sort((a, b) => a.km - b.km);
}

/** Whether a point suits the wind: it is chosen by that wind, or by none. */
export const naWiatr = (p: Pick<PunktObserwacji, 'wiatr'>, wiatr: Wiatr | null) => !wiatr || !p.wiatr.length || p.wiatr.includes(wiatr);

const LICZBA = String.raw`(-?\d{1,3}(?:[.,]\d+)?)`;
// "36.01, -5.60", "36.01 -5.60", "36,01; -5,60": a comma is a separator only between dotted numbers.
const PARA_KROPKI = new RegExp(String.raw`^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$`);
const PARA_SREDNIK = new RegExp(String.raw`^\s*${LICZBA}\s*;\s*${LICZBA}\s*$`);
const PARA_SPACJA = new RegExp(String.raw`^\s*${LICZBA}\s+${LICZBA}\s*$`);

/** Coordinates typed as "latitude, longitude" in decimal degrees, or null when the text is not a pair in range. */
export function wspolrzedneZTekstu(tekst: string): Wspolrzedne | null {
  const m = PARA_KROPKI.exec(tekst) ?? PARA_SREDNIK.exec(tekst) ?? PARA_SPACJA.exec(tekst);
  if (!m) return null;
  const [szer, dl] = [m[1], m[2]].map((s) => Number(s.replace(',', '.')));
  if (!(Math.abs(szer) <= 90 && Math.abs(dl) <= 180)) return null;
  return { szer, dl };
}

/** A place found by name. */
export type ZnalezioneMiejsce = Wspolrzedne & { nazwa: string; opis: string };

/** Open-Meteo's geocoding address for a name, answered in Polish. */
export const adresGeokodowania = (nazwa: string) =>
  `https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: nazwa.trim(), count: '5', language: 'pl', format: 'json' })}`;

export class NiepelnaOdpowiedz extends Error {
  name = 'NiepelnaOdpowiedz';
}

/**
 * The places in an Open-Meteo geocoding answer. No match comes back without
 * `results`, which is an empty list here; an answer of another shape throws.
 */
export function miejscaZGeokodowania(odp: unknown): ZnalezioneMiejsce[] {
  if (typeof odp !== 'object' || odp === null) throw new NiepelnaOdpowiedz('geocoding: not an object');
  const wyniki = (odp as { results?: unknown }).results;
  if (wyniki === undefined) return [];
  if (!Array.isArray(wyniki)) throw new NiepelnaOdpowiedz('geocoding: results is not a list');
  return wyniki.map((w) => {
    const { name, latitude, longitude, admin1, country } = w as Record<string, unknown>;
    if (typeof name !== 'string' || typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new NiepelnaOdpowiedz('geocoding: a result without a name or coordinates');
    }
    const opis = [admin1, country].filter((s): s is string => typeof s === 'string' && s !== '' && s !== name).join(', ');
    return { nazwa: name, opis, szer: latitude, dl: longitude };
  });
}

/** OpenStreetMap centred on a point, with a marker. */
export const adresMapy = (p: Wspolrzedne) => `https://www.openstreetmap.org/?mlat=${p.szer}&mlon=${p.dl}#map=15/${p.szer}/${p.dl}`;

/** Directions to a point in Google Maps, which opens the app on a phone. */
export const adresTrasy = (p: Wspolrzedne) => `https://www.google.com/maps/dir/?api=1&destination=${p.szer},${p.dl}`;

/**
 * Months as ranges in Roman numerals ("II–V, VII–XI"), a run across the new
 * year kept whole ("XII–II"), or "cały rok".
 */
export function zakresMiesiecy(miesiace: number[]) {
  const w = new Set(miesiace);
  if (w.size === 12) return 'cały rok';
  const poprzedni = (m: number) => ((m + 10) % 12) + 1;
  const nastepny = (m: number) => (m % 12) + 1;
  const zakresy: string[] = [];
  // Every run starts at a month whose predecessor is missing; with fewer than 12 months, one always is.
  for (let m = 1; m <= 12; m++) {
    if (!w.has(m) || w.has(poprzedni(m))) continue;
    let koniec = m;
    while (w.has(nastepny(koniec))) koniec = nastepny(koniec);
    zakresy.push(koniec === m ? MIESIACE[m - 1] : `${MIESIACE[m - 1]}–${MIESIACE[koniec - 1]}`);
  }
  return zakresy.join(', ');
}
