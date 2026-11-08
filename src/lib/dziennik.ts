/**
 * The field log ("Dziennik obserwacji"): every sighting, many per species,
 * each with its day, time, count, place name, point (from the phone's GPS or
 * picked on a map) and note. Free of React and browser APIs so the build,
 * backups, the sync and tests can use it; the store is dziennikMagazyn.ts.
 *
 * The checklist stays what says a species was seen (Moje niebo, the life
 * list, the patches read it). A sighting of a species not yet seen ticks it,
 * and an earlier sighting moves its first date back (`checklistaPoWpisie`).
 *
 * Shaped for syncing like the other stores: every entry says when it last
 * changed (`zmieniono`), and removing one keeps it as a tombstone
 * (`usuniety: true`) so the removal reaches the other devices.
 */

import type { Checklista } from './obserwacje';
import { odleglosc, type Wspolrzedne } from './punkty';

export const ZRODLA_PUNKTU = ['gps', 'mapa'] as const;
export type ZrodloPunktu = (typeof ZRODLA_PUNKTU)[number];

/** Where the bird was seen: from the phone's position (with its accuracy) or picked on a map. */
export type Punkt = Wspolrzedne & { zrodlo: ZrodloPunktu; /** Metres, from the GPS. */ dokladnosc?: number };

export type WpisDziennika = {
  /** A species id: the atlas, the birds of marshes or the rest of Europe's birds (ptaki-europy.json). */
  gatunek: string;
  /** Local date (YYYY-MM-DD). */
  data: string;
  /** Local time (HH:MM). */
  godzina?: string;
  /** How many birds. */
  liczba?: number;
  /** The place's name as I call it. */
  miejsce?: string;
  punkt?: Punkt;
  notatka?: string;
  /** Removed: kept so that the removal syncs. */
  usuniety?: true;
  /** When this entry last changed (ISO 8601). */
  zmieniono: string;
};

/** The log, keyed by each sighting's id (a UUID made on the device). */
export type Dziennik = Record<string, WpisDziennika>;

/** What the form gives: an entry without its bookkeeping. */
export type DaneWpisu = Omit<WpisDziennika, 'zmieniono' | 'usuniety'>;

/** The server's limits (supabase/migrations/), checked here too so nothing is refused there. */
export const LIMITY = { miejsce: 200, notatka: 2000, liczba: 100_000, dokladnosc: 100_000 } as const;

export const ID_WPISU = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const ID_GATUNKU = /^[a-z0-9-]{1,60}$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const GODZINA = /^([01]\d|2[0-3]):[0-5]\d$/;

const jestSlownikiem = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const tekstLubBrak = (v: unknown, max: number) => v === undefined || (typeof v === 'string' && v.length <= max);

export function isPunkt(v: unknown): v is Punkt {
  if (!jestSlownikiem(v)) return false;
  const { szer, dl, zrodlo, dokladnosc } = v;
  return (
    typeof szer === 'number' &&
    typeof dl === 'number' &&
    Math.abs(szer) <= 90 &&
    Math.abs(dl) <= 180 &&
    ZRODLA_PUNKTU.includes(zrodlo as ZrodloPunktu) &&
    (dokladnosc === undefined || (typeof dokladnosc === 'number' && dokladnosc >= 0 && dokladnosc <= LIMITY.dokladnosc))
  );
}

export function isWpis(v: unknown): v is WpisDziennika {
  if (!jestSlownikiem(v)) return false;
  return (
    typeof v.gatunek === 'string' &&
    ID_GATUNKU.test(v.gatunek) &&
    typeof v.data === 'string' &&
    DATA.test(v.data) &&
    (v.godzina === undefined || (typeof v.godzina === 'string' && GODZINA.test(v.godzina))) &&
    (v.liczba === undefined || (Number.isInteger(v.liczba) && (v.liczba as number) >= 1 && (v.liczba as number) <= LIMITY.liczba)) &&
    tekstLubBrak(v.miejsce, LIMITY.miejsce) &&
    tekstLubBrak(v.notatka, LIMITY.notatka) &&
    (v.punkt === undefined || isPunkt(v.punkt)) &&
    (v.usuniety === undefined || v.usuniety === true) &&
    typeof v.zmieniono === 'string'
  );
}

export function isDziennik(v: unknown): v is Dziennik {
  return jestSlownikiem(v) && Object.entries(v).every(([id, w]) => ID_WPISU.test(id) && isWpis(w));
}

/** The entry as stored: empty texts dropped, texts trimmed and cut to the server's limits, the accuracy in whole metres. */
export function oczyscWpis(dane: DaneWpisu): DaneWpisu {
  const wpis: DaneWpisu = { gatunek: dane.gatunek, data: dane.data };
  if (dane.godzina) wpis.godzina = dane.godzina;
  if (dane.liczba !== undefined && Number.isFinite(dane.liczba)) {
    wpis.liczba = Math.min(LIMITY.liczba, Math.max(1, Math.round(dane.liczba)));
  }
  const miejsce = dane.miejsce?.trim().slice(0, LIMITY.miejsce);
  if (miejsce) wpis.miejsce = miejsce;
  const notatka = dane.notatka?.trim().slice(0, LIMITY.notatka);
  if (notatka) wpis.notatka = notatka;
  if (dane.punkt) {
    const { szer, dl, zrodlo, dokladnosc } = dane.punkt;
    wpis.punkt = { szer, dl, zrodlo };
    if (dokladnosc !== undefined) wpis.punkt.dokladnosc = Math.min(LIMITY.dokladnosc, Math.round(dokladnosc));
  }
  return wpis;
}

/** Adds an entry, or replaces the one under `id` (a removed one comes back). */
export function zapiszWpis(dziennik: Readonly<Dziennik>, id: string, dane: DaneWpisu, teraz: string): Dziennik {
  return { ...dziennik, [id]: { ...oczyscWpis(dane), zmieniono: teraz } };
}

/** Removes an entry, keeping it as a tombstone. */
export function usunWpis(dziennik: Readonly<Dziennik>, id: string, teraz: string): Dziennik {
  const byl = dziennik[id];
  if (!byl) return { ...dziennik };
  return { ...dziennik, [id]: { ...byl, usuniety: true, zmieniono: teraz } };
}

/** The entries not removed, the latest sighting first (by day, then time; an entry without a time last in its day). */
export function wpisy(dziennik: Readonly<Dziennik>, gatunek?: string): [string, WpisDziennika][] {
  return Object.entries(dziennik)
    .filter(([, w]) => !w.usuniety && (gatunek === undefined || w.gatunek === gatunek))
    .sort(([, a], [, b]) => (b.data + (b.godzina ?? '')).localeCompare(a.data + (a.godzina ?? '')));
}

/**
 * The checklist after a sighting: a species not seen (or unticked) becomes
 * seen, dated by the sighting and named by its place when the entry has none;
 * a sighting earlier than the checklist's first date moves the date back, with
 * the place. Anything else leaves the checklist as it was (the same object, so
 * the caller can skip the save).
 */
export function checklistaPoWpisie(lista: Readonly<Checklista>, wpis: DaneWpisu, teraz: string): Readonly<Checklista> {
  const byla = lista[wpis.gatunek];
  const miejsce = wpis.miejsce?.trim() || undefined;
  if (!byla?.widziany) {
    return {
      ...lista,
      [wpis.gatunek]: {
        ...byla,
        widziany: true,
        data: wpis.data,
        ...(miejsce ? { miejsce } : byla?.miejsce ? { miejsce: byla.miejsce } : {}),
        zmieniono: teraz,
      },
    };
  }
  if (byla.data && byla.data <= wpis.data) return lista;
  const nowa = { ...byla, data: wpis.data, zmieniono: teraz };
  if (miejsce) nowa.miejsce = miejsce;
  return { ...lista, [wpis.gatunek]: nowa };
}

/** How near an earlier point must be for its place name to be offered again (km). */
export const PROMIEN_NAZWY_KM = 0.5;

/** The name of the nearest earlier sighting within PROMIEN_NAZWY_KM of a point, to fill in the place. */
export function nazwaWPoblizu(dziennik: Readonly<Dziennik>, punkt: Wspolrzedne): string | undefined {
  let najblizej: { km: number; nazwa: string } | undefined;
  for (const w of Object.values(dziennik)) {
    if (w.usuniety || !w.punkt || !w.miejsce) continue;
    const km = odleglosc(punkt, w.punkt);
    if (km <= PROMIEN_NAZWY_KM && (!najblizej || km < najblizej.km)) najblizej = { km, nazwa: w.miejsce };
  }
  return najblizej?.nazwa;
}

/** Place names used before, the most used first, for the form's suggestions. */
export function uzyteMiejsca(dziennik: Readonly<Dziennik>): string[] {
  const ile = new Map<string, number>();
  for (const w of Object.values(dziennik)) if (!w.usuniety && w.miejsce) ile.set(w.miejsce, (ile.get(w.miejsce) ?? 0) + 1);
  return [...ile.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pl')).map(([n]) => n);
}

/** A point as degrees for reading ("52.2297° N, 21.0122° E"), five decimals, about a metre. */
export function punktSlownie(p: Wspolrzedne) {
  const st = (v: number, plus: string, minus: string) => `${Math.abs(v).toFixed(5)}° ${v >= 0 ? plus : minus}`;
  return `${st(p.szer, 'N', 'S')}, ${st(p.dl, 'E', 'W')}`;
}

/** A Polish noun after a number: `odmiana(1, ['ptak', 'ptaki', 'ptaków'])` is "ptak", 3 "ptaki", 5 and 12 "ptaków". */
export function odmiana(n: number, [jeden, kilka, wiele]: readonly [string, string, string]) {
  if (n === 1) return jeden;
  const reszta = n % 10;
  const nascie = n % 100 >= 12 && n % 100 <= 14;
  return reszta >= 2 && reszta <= 4 && !nascie ? kilka : wiele;
}
