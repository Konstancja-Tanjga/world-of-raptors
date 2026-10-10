/**
 * Syncing the browser stores with a signed-in account (Supabase tables from
 * supabase/migrations/). No React and no browser APIs, so tests can run it
 * against the real migrations; the glue to the stores and to Supabase is in
 * synchronizacjaPrzegladarki.ts.
 *
 * Local-first: the stores stay the copy the app reads and writes. A pass
 * pulls what changed on the server since the last pass, merges it into the
 * stores by the same rules the server's triggers apply (the newer change wins;
 * achievements keep the earliest date and "shown"), then sends every local
 * entry the server does not know in its current form. What "known" means is
 * kept per entry in `znane` (a fingerprint of the last version both sides
 * agreed on), so a change made offline, or signed out, is sent at the next
 * pass, and an entry that only arrived from the server is not sent back.
 */

import type { Checklista, Obserwacja } from './obserwacje';
import { isFiszki, type Fiszki, type ZapisFiszki } from './fiszki';
import type { Postep } from './postep';
import type { Zdobyte } from './zdobyte';

/** When each lesson's state last changed on this device, and which were unticked (kept so the untick syncs). */
export type SladyPostepu = Record<string, { t: string; usunieta?: true }>;

/** Progress with its change times: `postep` is the store the app reads, `slady` its side record. */
export type PostepZeSladami = { postep: Postep; slady: SladyPostepu };

type Wiersz = Record<string, unknown>;
type Pomin = (klucz: string, powod: string) => void;
const nic: Pomin = () => {};

/**
 * One synced table: how a store's entries become rows and how rows from the
 * server merge back. `scal` must be pure and must skip rows it cannot read
 * (a row written by a newer or buggy app version must not break a pass).
 */
export type Tabela<L> = {
  nazwa: 'lesson_progress' | 'observations' | 'flashcards' | 'user_badges';
  /** The key column (with user_id, the table's primary key). */
  klucz: string;
  wiersze(lokalne: L): Wiersz[];
  /** `pomin` hears of every row skipped as unreadable, with the reason. */
  scal(lokalne: L, zdalne: Wiersz[], pomin?: Pomin): L;
  /** The store without one entry, so that `scal` takes the server's version of it whatever its time. */
  bez(lokalne: L, klucz: string): L;
  /** The version of a row, local or remote: equal fingerprints mean both sides hold the same. */
  odcisk(w: Wiersz): string;
};

/** A time from the server or a store as ISO 8601 with milliseconds, or null when it is not a time. */
export function czas(v: unknown): string | null {
  if (!(v instanceof Date) && typeof v !== 'string') return null;
  const ms = v instanceof Date ? v.getTime() : Date.parse(v);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/** A date (YYYY-MM-DD) from the server (string or Date at midnight UTC), or null. */
function dzien(v: unknown): string | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

/** A copy of a record without one key. */
function bezKlucza<T>(rekord: Record<string, T>, k: string): Record<string, T> {
  const kopia = { ...rekord };
  delete kopia[k];
  return kopia;
}

const tekst = (v: unknown) => (typeof v === 'string' ? v : undefined);
const nowszy = (zdalny: string, lokalny: string | undefined) => lokalny === undefined || zdalny >= lokalny;
const odciskZmiany = (w: Wiersz) => `${czas(w.updated_at)}|${w.deleted_at ? 'x' : ''}`;

/** The server's limits on text (supabase/migrations/): longer text is cut so the row is not refused. */
const NAJWIECEJ = { place: 200, note: 2000 } as const;

// ---- Lessons ----

/** A lesson finished with no recorded change time (finished before syncing existed): noon of the day it was finished. */
const czasUkonczenia = (data: string) => `${data}T12:00:00.000Z`;

export const LEKCJE: Tabela<PostepZeSladami> = {
  nazwa: 'lesson_progress',
  klucz: 'lesson_id',
  wiersze({ postep, slady }) {
    const wiersze: Wiersz[] = [];
    for (const [id, data] of Object.entries(postep)) {
      wiersze.push({ lesson_id: id, completed_on: data, updated_at: slady[id]?.t ?? czasUkonczenia(data), deleted_at: null });
    }
    for (const [id, s] of Object.entries(slady)) {
      if (s.usunieta && !(id in postep)) wiersze.push({ lesson_id: id, completed_on: null, updated_at: s.t, deleted_at: s.t });
    }
    return wiersze;
  },
  scal(lokalne, zdalne, pomin = nic) {
    const postep = { ...lokalne.postep };
    const slady = { ...lokalne.slady };
    for (const w of zdalne) {
      const id = tekst(w.lesson_id);
      const t = czas(w.updated_at);
      const usunieta = Boolean(w.deleted_at);
      const data = dzien(w.completed_on);
      if (!id || !t || (!usunieta && !data)) {
        pomin(String(w.lesson_id), 'no id, time or date');
        continue;
      }
      const lokalny = slady[id]?.t ?? (postep[id] ? czasUkonczenia(postep[id]) : undefined);
      if (!nowszy(t, lokalny)) continue;
      if (usunieta) {
        delete postep[id];
        slady[id] = { t, usunieta: true };
      } else {
        postep[id] = data!;
        slady[id] = { t };
      }
    }
    return { postep, slady };
  },
  bez: ({ postep, slady }, k) => ({ postep: bezKlucza(postep, k), slady: bezKlucza(slady, k) }),
  odcisk: odciskZmiany,
};

// ---- The checklist ----

export const OBSERWACJE: Tabela<Checklista> = {
  nazwa: 'observations',
  klucz: 'species_slug',
  wiersze(lista) {
    return Object.entries(lista).map(([id, o]) => ({
      species_slug: id,
      observed_on: o.data ?? null,
      place: o.miejsce?.slice(0, NAJWIECEJ.place) ?? null,
      note: o.notatka?.slice(0, NAJWIECEJ.note) ?? null,
      updated_at: o.zmieniono,
      // An unticked species keeps its fields, so ticking it again on any device restores them.
      deleted_at: o.widziany ? null : o.zmieniono,
    }));
  },
  scal(lokalne, zdalne, pomin = nic) {
    const lista = { ...lokalne };
    for (const w of zdalne) {
      const id = tekst(w.species_slug);
      const t = czas(w.updated_at);
      if (!id || !t) {
        pomin(String(w.species_slug), 'no id or time');
        continue;
      }
      if (!nowszy(t, czas(lista[id]?.zmieniono) ?? undefined)) continue;
      const o: Obserwacja = { widziany: !w.deleted_at, zmieniono: t };
      const data = dzien(w.observed_on);
      if (data) o.data = data;
      if (tekst(w.place)) o.miejsce = tekst(w.place);
      if (tekst(w.note)) o.notatka = tekst(w.note);
      lista[id] = o;
    }
    return lista;
  },
  bez: bezKlucza,
  odcisk: odciskZmiany,
};

// ---- Flashcards ----

/** A card changes when it is answered: its last answer is its change time. */
const czasKarty = (z: ZapisFiszki) => z.last_review ?? z.due;

export const FISZKI: Tabela<Fiszki> = {
  nazwa: 'flashcards',
  klucz: 'card_id',
  wiersze(fiszki) {
    return Object.entries(fiszki).map(([id, z]) => ({ card_id: id, card: z, updated_at: czasKarty(z), deleted_at: null }));
  },
  scal(lokalne, zdalne, pomin = nic) {
    const fiszki = { ...lokalne };
    for (const w of zdalne) {
      const id = tekst(w.card_id);
      const t = czas(w.updated_at);
      // Cards are never removed by syncing: a schedule lost on one device is not a reason to lose it on all.
      if (w.deleted_at) continue;
      // The store's own check: a card ts-fsrs cannot schedule would block the flashcard page.
      if (!id || !t || !isFiszki({ [id]: w.card })) {
        pomin(String(w.card_id), 'no id or time, or a card the app cannot schedule');
        continue;
      }
      // By the card's own last answer, not the row's time, which the server caps when a clock runs fast.
      const karta = w.card as ZapisFiszki;
      if (!nowszy(czas(czasKarty(karta)) ?? t, fiszki[id] ? (czas(czasKarty(fiszki[id])) ?? undefined) : undefined)) continue;
      fiszki[id] = karta;
    }
    return fiszki;
  },
  bez: bezKlucza,
  odcisk: (w) => {
    const karta = w.card as ZapisFiszki | undefined;
    return `${czas(karta?.last_review ?? karta?.due) ?? czas(w.updated_at)}`;
  },
};

// ---- Achievements ----

export const ODZNAKI: Tabela<Zdobyte> = {
  nazwa: 'user_badges',
  klucz: 'badge_id',
  wiersze(zdobyte) {
    return Object.entries(zdobyte).map(([id, z]) => ({ badge_id: id, awarded_on: z.data, shown: Boolean(z.pokazana) }));
  },
  scal(lokalne, zdalne, pomin = nic) {
    const zdobyte = { ...lokalne };
    for (const w of zdalne) {
      const id = tekst(w.badge_id);
      const data = dzien(w.awarded_on);
      if (!id || !data) {
        pomin(String(w.badge_id), 'no id or date');
        continue;
      }
      const obecna = zdobyte[id];
      const najwczesniej = obecna && obecna.data < data ? obecna.data : data;
      const pokazana = Boolean(obecna?.pokazana) || w.shown === true;
      zdobyte[id] = pokazana ? { data: najwczesniej, pokazana: true } : { data: najwczesniej };
    }
    return zdobyte;
  },
  bez: bezKlucza,
  odcisk: (w) => `${dzien(w.awarded_on)}|${w.shown === true}`,
};

// ---- A pass ----

/** What one device remembers between passes, for the account it last synced. */
export type StanSynchronizacji = {
  uzytkownik: string | null;
  /** Per table, the latest server time (synced_at) seen. */
  kursory: Record<string, string>;
  /** Per table, per key, the fingerprint both sides last agreed on. */
  znane: Record<string, Record<string, string>>;
};

export const PUSTY_STAN: StanSynchronizacji = { uzytkownik: null, kursory: {}, znane: {} };

export function isStanSynchronizacji(v: unknown): v is StanSynchronizacji {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  const slownik = (x: unknown) => typeof x === 'object' && x !== null && !Array.isArray(x);
  return (
    (s.uzytkownik === null || typeof s.uzytkownik === 'string') &&
    slownik(s.kursory) &&
    Object.values(s.kursory as object).every((c) => typeof c === 'string') &&
    slownik(s.znane) &&
    Object.values(s.znane as object).every((t) => slownik(t) && Object.values(t).every((o) => typeof o === 'string'))
  );
}

/** The server side of a pass: Supabase in the browser, the migrations on PGlite in tests. */
export type Zdalne = {
  /** Rows with synced_at after `od` (all when null), each with its synced_at. */
  pobierz(tabela: string, od: string | null): Promise<Wiersz[]>;
  /** The server's current rows for these keys (those it has). */
  pobierzKlucze(tabela: string, klucz: string, klucze: string[]): Promise<Wiersz[]>;
  /** Upserts the rows (on the table's key). Throws when the server refuses. */
  wyslij(tabela: string, klucz: string, wiersze: Wiersz[]): Promise<void>;
};

/** A table joined to its store: read the store, and save it back (false when the browser refuses). */
export type Polaczenie<L> = { tabela: Tabela<L>; czytaj(): L; zapisz(l: L): boolean };

/** The browser refused to save a store: nothing the server or the network can fix. */
export class OdmowaZapisu extends Error {
  name = 'OdmowaZapisu';
}

/** Why a table did not sync in this pass. */
export type BladTabeli = { tabela: string; rodzaj: 'przegladarka' | 'siec' | 'serwer'; opis: string };

/**
 * A refusal the same row will always get (a failed check, the account's
 * limit, a value of the wrong type, row level security): retrying cannot help,
 * so the row is skipped, not retried forever.
 */
function trwalaOdmowa(err: unknown) {
  const kod = typeof err === 'object' && err !== null && 'code' in err ? String(err.code) : '';
  return /^(22|23|54)/.test(kod) || kod === '42501';
}

function opisBledu(err: unknown) {
  if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') return err.message;
  return String(err);
}

function bladTabeli(tabela: string, err: unknown): BladTabeli {
  if (err instanceof OdmowaZapisu) return { tabela, rodzaj: 'przegladarka', opis: err.message };
  // fetch() rejects with a TypeError when the server cannot be reached at all.
  if (err instanceof TypeError) return { tabela, rodzaj: 'siec', opis: err.message };
  return { tabela, rodzaj: 'serwer', opis: opisBledu(err) };
}

/**
 * Pulls start this far before the last server time seen: a row committed a
 * moment after another can carry an earlier synced_at, and pulling a row
 * twice is harmless.
 */
const ZAKLADKA_MS = 2 * 60 * 1000;
const PACZKA = 500;

export type WynikSynchronizacji = {
  stan: StanSynchronizacji;
  /** Per table, how many local entries were sent (on the first pass: what this device added to the account). */
  wyslane: Record<string, number>;
  /** Per table, how many entries the server's copy changed here. */
  pobrane: Record<string, number>;
  /** Per table, local entries the server will never accept as they are (logged, not retried until they change). */
  odrzucone: Record<string, number>;
  /** Tables that did not sync in this pass; the others did. */
  bledy: BladTabeli[];
  /** This device had not synced with this account before. */
  pierwsza: boolean;
};

/**
 * One pass for the signed-in `uzytkownik`. Each table syncs on its own: a
 * table that fails is reported in `bledy` and the others go on. The caller
 * decides beforehand what to do when the device last synced another account
 * (see KONTA.md); here a different account simply starts from an empty
 * `znane`, so everything local is offered to it.
 */
export async function synchronizuj(
  zdalne: Zdalne,
  // Each element pairs a table with its own store type; `any` only relaxes the array's element type.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  polaczenia: Polaczenie<any>[],
  poprzedni: StanSynchronizacji,
  uzytkownik: string,
): Promise<WynikSynchronizacji> {
  const pierwsza = poprzedni.uzytkownik !== uzytkownik;
  const stan: StanSynchronizacji = pierwsza
    ? { uzytkownik, kursory: {}, znane: {} }
    : { uzytkownik, kursory: { ...poprzedni.kursory }, znane: structuredClone(poprzedni.znane) };
  const wynik: WynikSynchronizacji = { stan, wyslane: {}, pobrane: {}, odrzucone: {}, bledy: [], pierwsza };

  for (const polaczenie of polaczenia) {
    try {
      await synchronizujTabele(zdalne, polaczenie, wynik);
    } catch (err) {
      console.error(`[synchronizacja] ${polaczenie.tabela.nazwa} did not sync`, err);
      wynik.bledy.push(bladTabeli(polaczenie.tabela.nazwa, err));
    }
  }
  return wynik;
}

async function synchronizujTabele<L>(zdalne: Zdalne, { tabela, czytaj, zapisz }: Polaczenie<L>, wynik: WynikSynchronizacji) {
  const { stan } = wynik;
  const znane = (stan.znane[tabela.nazwa] ??= {});
  const klucz = (w: Wiersz) => String(w[tabela.klucz]);
  const pomin: Pomin = (k, powod) => console.warn(`[synchronizacja] skipped ${tabela.nazwa} ${k} from the server: ${powod}`);

  /** Merges server rows in, saves the store if they changed it, and records them as known. Returns how many entries changed. */
  const przyjmij = (wiersze: Wiersz[]) => {
    if (wiersze.length === 0) return 0;
    const przed = czytaj();
    const po = tabela.scal(przed, wiersze, pomin);
    const odciski = new Map(tabela.wiersze(przed).map((w) => [klucz(w), tabela.odcisk(w)]));
    const zmienione = tabela.wiersze(po).filter((w) => odciski.get(klucz(w)) !== tabela.odcisk(w)).length;
    if (zmienione > 0 && !zapisz(po)) throw new OdmowaZapisu(`przeglądarka nie zapisała danych (${tabela.nazwa})`);
    for (const w of wiersze) znane[klucz(w)] = tabela.odcisk(w);
    return zmienione;
  };

  // 1. What changed on the server since the last pass, merged in.
  const kursor = stan.kursory[tabela.nazwa];
  const od = kursor ? new Date(Date.parse(kursor) - ZAKLADKA_MS).toISOString() : null;
  const zdalneWiersze = await zdalne.pobierz(tabela.nazwa, od);
  let pobrane = przyjmij(zdalneWiersze);
  for (const w of zdalneWiersze) {
    const s = czas(w.synced_at);
    if (s && (!stan.kursory[tabela.nazwa] || s > stan.kursory[tabela.nazwa])) stan.kursory[tabela.nazwa] = s;
  }

  // 2. What the server does not have in its current form, sent.
  const doWyslania = tabela.wiersze(czytaj()).filter((w) => znane[klucz(w)] !== tabela.odcisk(w));
  let odrzucone = 0;
  let przyjete = 0;
  for (let i = 0; i < doWyslania.length; i += PACZKA) {
    const paczka = doWyslania.slice(i, i + PACZKA);
    try {
      await zdalne.wyslij(tabela.nazwa, tabela.klucz, paczka);
    } catch (err) {
      if (!trwalaOdmowa(err)) throw err;
      // One row the server will never take must not hold back the others: send them one by one.
      for (const w of paczka) {
        try {
          await zdalne.wyslij(tabela.nazwa, tabela.klucz, [w]);
        } catch (blad) {
          if (!trwalaOdmowa(blad)) throw blad;
          console.warn(`[synchronizacja] the server refused ${tabela.nazwa} ${klucz(w)}; kept here, not sent again until it changes`, blad);
          znane[klucz(w)] = tabela.odcisk(w);
          odrzucone++;
        }
      }
    }
    // 3. What the server holds now for what was sent. The server keeps a newer change rather than
    // the one sent (another device's, or one this device restored from an older backup), so take
    // its version, and agree only on what it really holds.
    const teraz = await zdalne.pobierzKlucze(tabela.nazwa, tabela.klucz, paczka.map(klucz));
    const wyslane = new Map(paczka.map((w) => [klucz(w), tabela.odcisk(w)]));
    const lokalne = new Map(tabela.wiersze(czytaj()).map((w) => [klucz(w), w]));
    const zwykle: Wiersz[] = [];
    for (const w of teraz) {
      const k = klucz(w);
      const tutaj = lokalne.get(k);
      const sw = czas(w.updated_at);
      const st = czas(tutaj?.updated_at);
      // The server caps a change time more than five minutes ahead of its own (a device clock running
      // fast), so it holds this device's change with an earlier time. Take the server's time here too,
      // or later changes from other devices would compare against a time from the future. Only while
      // the entry is still the one sent: an edit made meanwhile is newer and goes in the next pass.
      if (tutaj && sw && st && sw < st && tabela.odcisk(tutaj) === wyslane.get(k)) {
        if (!zapisz(tabela.scal(tabela.bez(czytaj(), k), [w], pomin))) {
          throw new OdmowaZapisu(`przeglądarka nie zapisała danych (${tabela.nazwa})`);
        }
        znane[k] = tabela.odcisk(w);
        przyjete++;
        continue;
      }
      // Taken as sent, or merged with what the server had (achievements): either way it is on the account now.
      if (wyslane.get(k) === tabela.odcisk(w) || tabela.nazwa === 'user_badges') przyjete++;
      zwykle.push(w);
    }
    pobrane += przyjmij(zwykle);
  }
  wynik.wyslane[tabela.nazwa] = przyjete;
  wynik.odrzucone[tabela.nazwa] = odrzucone;
  wynik.pobrane[tabela.nazwa] = pobrane;
}
