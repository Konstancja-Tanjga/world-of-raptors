/**
 * "Moje miejsca": observation places the owner adds herself, from her phone's
 * location, with a name, the date of her first visit and a note. No directive
 * and no browser APIs, so the rules can be tested; the store is
 * mojeMiejscaMagazyn.ts.
 *
 * Shaped like the checklist for syncing: every entry says when it last
 * changed (`zmieniono`), and removing a place keeps it as a tombstone
 * (`usuniete`) so the removal reaches other devices.
 *
 * An observation on the checklist names its place as text (`miejsce`), so a
 * place's birds are the observations whose text is the place's name, compared
 * without case, surrounding or doubled spaces; renaming a place renames it in
 * those observations too.
 */
import type { Checklista } from './obserwacje';
import { odleglosc, type Wspolrzedne } from './punkty';

export type MojeMiejsce = Wspolrzedne & {
  nazwa: string;
  /** How far off the phone said the position could be, in metres. */
  dokladnosc?: number;
  /** Local date (YYYY-MM-DD) of the first visit. */
  data: string;
  notatka?: string;
  /** When this entry last changed (ISO 8601). */
  zmieniono: string;
  /** Removed: kept so the removal syncs. */
  usuniete?: true;
};

export type MojeMiejsca = Record<string, MojeMiejsce>;

/**
 * The server's limits on the name and the note (supabase/migrations/), checked
 * here first. `NAJWIECEJ_MIEJSC` is the app's own cap on places not removed;
 * the server caps all rows, removed ones included, at 1000.
 */
export const NAJDLUZSZA_NAZWA = 80;
export const NAJDLUZSZA_NOTATKA = 2000;
export const NAJWIECEJ_MIEJSC = 500;

export const ID_MIEJSCA = /^[a-z0-9-]{1,60}$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date as YYYY-MM-DD (not 2026-13-40). */
export function jestData(v: string) {
  if (!DATA.test(v)) return false;
  const [r, m, d] = v.split('-').map(Number);
  const t = new Date(Date.UTC(r, m - 1, d));
  return t.getUTCFullYear() === r && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** A name as it is stored: trimmed, single spaces. */
export const normalizujNazwe = (nazwa: string) => nazwa.trim().replace(/\s+/g, ' ');

const jestSlownikiem = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function isMojeMiejsce(v: unknown): v is MojeMiejsce {
  if (!jestSlownikiem(v)) return false;
  // The server's rules too, so a stored place is never one the account refuses for good.
  return (
    typeof v.nazwa === 'string' &&
    v.nazwa === normalizujNazwe(v.nazwa) &&
    v.nazwa.length >= 1 &&
    v.nazwa.length <= NAJDLUZSZA_NAZWA &&
    typeof v.szer === 'number' &&
    Math.abs(v.szer) <= 90 &&
    typeof v.dl === 'number' &&
    Math.abs(v.dl) <= 180 &&
    (v.dokladnosc === undefined || (Number.isInteger(v.dokladnosc) && (v.dokladnosc as number) >= 0)) &&
    typeof v.data === 'string' &&
    jestData(v.data) &&
    (v.notatka === undefined || (typeof v.notatka === 'string' && v.notatka.length <= NAJDLUZSZA_NOTATKA)) &&
    typeof v.zmieniono === 'string' &&
    (v.usuniete === undefined || v.usuniete === true)
  );
}

export function isMojeMiejsca(v: unknown): v is MojeMiejsca {
  return jestSlownikiem(v) && Object.entries(v).every(([id, m]) => ID_MIEJSCA.test(id) && isMojeMiejsce(m));
}

/** A place's name as observations are matched against it: no case, no surrounding or doubled spaces. */
export const kluczNazwy = (nazwa: string) => normalizujNazwe(nazwa).toLocaleLowerCase('pl');

/** The places not removed, by name. */
export function aktywne(miejsca: MojeMiejsca): [string, MojeMiejsce][] {
  return Object.entries(miejsca)
    .filter(([, m]) => !m.usuniete)
    .sort(([, a], [, b]) => a.nazwa.localeCompare(b.nazwa, 'pl'));
}

/** What the owner fills in for a place. */
export type DaneMiejsca = Pick<MojeMiejsce, 'nazwa' | 'szer' | 'dl' | 'dokladnosc' | 'data' | 'notatka'>;

/**
 * Why a place cannot be saved under `id` as it is, in Polish, or null when it
 * can. A name may not repeat another place's, unless it is the name this place
 * already has (two places with one name can arrive from two devices, and each
 * must stay editable).
 */
export function bladMiejsca(miejsca: MojeMiejsca, dane: DaneMiejsca, id: string): string | null {
  const nazwa = normalizujNazwe(dane.nazwa);
  const obecne = miejsca[id] && !miejsca[id].usuniete ? miejsca[id] : null;
  if (!nazwa) return 'Wpisz nazwę miejsca.';
  if (nazwa.length > NAJDLUZSZA_NAZWA) return `Nazwa może mieć najwyżej ${NAJDLUZSZA_NAZWA} znaków.`;
  const bezZmianyNazwy = obecne !== null && kluczNazwy(obecne.nazwa) === kluczNazwy(nazwa);
  if (!bezZmianyNazwy && aktywne(miejsca).some(([inne, m]) => inne !== id && kluczNazwy(m.nazwa) === kluczNazwy(nazwa))) {
    return 'Masz już miejsce o tej nazwie.';
  }
  if (!jestData(dane.data)) return 'Wpisz datę pierwszej wizyty.';
  if ((dane.notatka?.trim() ?? '').length > NAJDLUZSZA_NOTATKA) return `Notatka może mieć najwyżej ${NAJDLUZSZA_NOTATKA} znaków.`;
  if (!(Math.abs(dane.szer) <= 90 && Math.abs(dane.dl) <= 180)) return 'Położenie miejsca jest nieprawidłowe.';
  if (!obecne && aktywne(miejsca).length >= NAJWIECEJ_MIEJSC) return `Można zapisać najwyżej ${NAJWIECEJ_MIEJSC} miejsc.`;
  return null;
}

function oczysc(dane: DaneMiejsca, zmieniono: string): MojeMiejsce {
  const m: MojeMiejsce = { nazwa: normalizujNazwe(dane.nazwa), szer: dane.szer, dl: dane.dl, data: dane.data, zmieniono };
  if (dane.dokladnosc !== undefined) m.dokladnosc = Math.round(dane.dokladnosc);
  const notatka = dane.notatka?.trim();
  if (notatka) m.notatka = notatka;
  return m;
}

/** The places with this one added or replaced (call `bladMiejsca` first). */
export const zapiszMiejsce = (miejsca: MojeMiejsca, id: string, dane: DaneMiejsca, teraz: string): MojeMiejsca => ({
  ...miejsca,
  [id]: oczysc(dane, teraz),
});

/** The places with this one removed: a tombstone that keeps its fields, as an unticked species does. */
export function usunMiejsce(miejsca: MojeMiejsca, id: string, teraz: string): MojeMiejsca {
  const m = miejsca[id];
  return m ? { ...miejsca, [id]: { ...m, usuniete: true, zmieniono: teraz } } : miejsca;
}

/** Two copies merged entry by entry, the newer change winning (a backup loaded onto a device). */
export function scalMiejsca(tutaj: MojeMiejsca, przyszle: MojeMiejsca): MojeMiejsca {
  const wynik = { ...tutaj };
  for (const [id, m] of Object.entries(przyszle)) {
    if (!wynik[id] || m.zmieniono > wynik[id].zmieniono) wynik[id] = m;
  }
  return wynik;
}

/** The species seen at a place: the ticked observations whose place is its name. */
export function ptakiWMiejscu(lista: Checklista, nazwa: string): string[] {
  const k = kluczNazwy(nazwa);
  return Object.entries(lista)
    .filter(([, o]) => o.widziany && o.miejsce !== undefined && kluczNazwy(o.miejsce) === k)
    .map(([id]) => id);
}

/**
 * The checklist with a place's old name replaced by the new one in every
 * observation that names it (ticked or not, so ticking one again keeps it).
 * The same list when nothing names it, so the caller can skip saving.
 */
export function przemianujWChecklisci(lista: Checklista, stara: string, nowa: string, teraz: string): Checklista {
  const k = kluczNazwy(stara);
  const docelowa = normalizujNazwe(nowa);
  let zmieniona = false;
  const wynik: Checklista = { ...lista };
  for (const [id, o] of Object.entries(lista)) {
    // Already the new name, letter for letter: nothing to change (a retried rename, or none at all).
    if (o.miejsce !== undefined && kluczNazwy(o.miejsce) === k && o.miejsce !== docelowa) {
      wynik[id] = { ...o, miejsce: docelowa, zmieniono: teraz };
      zmieniona = true;
    }
  }
  return zmieniona ? wynik : lista;
}

/**
 * A backup's checklist made to agree with the places kept after merging the
 * backup's places: where a place's newer name here won over the file's, the
 * file's observations still say the file's name, so they get the kept one.
 */
export function zgodzZMiejscami(lista: Checklista, zPliku: MojeMiejsca, poScaleniu: MojeMiejsca, teraz: string): Checklista {
  let wynik = lista;
  for (const [id, m] of Object.entries(zPliku)) {
    const zostalo = poScaleniu[id];
    if (zostalo && !zostalo.usuniete && kluczNazwy(zostalo.nazwa) !== kluczNazwy(m.nazwa)) {
      wynik = przemianujWChecklisci(wynik, m.nazwa, zostalo.nazwa, teraz);
    }
  }
  return wynik;
}

/** The owner's place nearest a position, if one is within `km`. */
export function najblizszeMoje(miejsca: MojeMiejsca, z: Wspolrzedne, km: number): { id: string; miejsce: MojeMiejsce; km: number } | null {
  let najlepsze: { id: string; miejsce: MojeMiejsce; km: number } | null = null;
  for (const [id, m] of aktywne(miejsca)) {
    const d = odleglosc(z, m);
    if (d <= km && (!najlepsze || d < najlepsze.km)) najlepsze = { id, miejsce: m, km: d };
  }
  return najlepsze;
}
