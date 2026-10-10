'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { checklistaDoSynchronizacji } from './checklist';
import { fiszkiDoSynchronizacji } from './fiszki';
import { utworzMagazyn } from './magazyn';
import { postepDoSynchronizacji } from './postep';
import {
  FISZKI,
  isStanSynchronizacji,
  LEKCJE,
  OBSERWACJE,
  ODZNAKI,
  PUSTY_STAN,
  synchronizuj,
  type BladTabeli,
  type StanSynchronizacji,
  type WynikSynchronizacji,
  type Zdalne,
} from './synchronizacja';
import { zdobyteDoSynchronizacji } from './zdobyte';

/*
 * The sync engine (synchronizacja.ts) joined to the browser: the stores, the
 * signed-in Supabase client, and when to run a pass. It runs only while
 * someone is signed in (Synchronizacja.tsx starts and stops it).
 */

const stanMagazyn = utworzMagazyn<StanSynchronizacji>('wor:synchro:v1', isStanSynchronizacji);

/** Set around the pass's own (synchronous) saves, so they are not taken for changes to send. */
let wlasnyZapis = false;
const zapisWlasny =
  <L>(zapisz: (l: L) => boolean) =>
  (l: L) => {
    wlasnyZapis = true;
    try {
      return zapisz(l);
    } finally {
      wlasnyZapis = false;
    }
  };

// Achievements first: they are on the device before the progress that earns them arrives, so the
// watcher (StraznikOdznak) does not announce as new what the account already has.
const POLACZENIA = [
  { tabela: ODZNAKI, ...zdobyteDoSynchronizacji, zapisz: zapisWlasny(zdobyteDoSynchronizacji.zapisz) },
  { tabela: LEKCJE, ...postepDoSynchronizacji, zapisz: zapisWlasny(postepDoSynchronizacji.zapisz) },
  { tabela: OBSERWACJE, ...checklistaDoSynchronizacji, zapisz: zapisWlasny(checklistaDoSynchronizacji.zapisz) },
  { tabela: FISZKI, ...fiszkiDoSynchronizacji, zapisz: zapisWlasny(fiszkiDoSynchronizacji.zapisz) },
];

/**
 * supabase-js does not throw when the server cannot be reached: it returns an
 * error whose message is the fetch failure. Make that a TypeError, as fetch
 * itself throws, so the engine reports it as the network, not the server.
 */
function bladSupabase(error: { message: string; code?: string }) {
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(error.message)) return new TypeError(error.message);
  return error;
}

const STRONA = 1000;

/** Supabase's API as the engine's server side. Rows go out with the signed-in user's id. */
function zdalneSupabase(sb: SupabaseClient, uzytkownik: string): Zdalne {
  return {
    async pobierz(tabela, od) {
      const wszystkie: Record<string, unknown>[] = [];
      for (let strona = 0; ; strona++) {
        let zapytanie = sb.from(tabela).select('*').order('synced_at').range(strona * STRONA, (strona + 1) * STRONA - 1);
        if (od) zapytanie = zapytanie.gt('synced_at', od);
        const { data, error } = await zapytanie;
        if (error) throw bladSupabase(error);
        wszystkie.push(...data);
        if (data.length < STRONA) return wszystkie;
      }
    },
    async pobierzKlucze(tabela, klucz, klucze) {
      const wszystkie: Record<string, unknown>[] = [];
      // A long list of keys would make a URL too long: ask in parts.
      for (let i = 0; i < klucze.length; i += 100) {
        const { data, error } = await sb.from(tabela).select('*').in(klucz, klucze.slice(i, i + 100));
        if (error) throw bladSupabase(error);
        wszystkie.push(...data);
      }
      return wszystkie;
    },
    async wyslij(tabela, klucz, wiersze) {
      const { error } = await sb
        .from(tabela)
        .upsert(wiersze.map((w) => ({ ...w, user_id: uzytkownik })), { onConflict: `user_id,${klucz}` });
      if (error) throw bladSupabase(error);
    },
  };
}

// ---- What the page shows ----

export type StatusSynchronizacji =
  /** Not started (yet): before the sync loads, or when it could not. */
  | { stan: 'nieaktywna' }
  | { stan: 'trwa' }
  /** `bledy`: tables that did not sync in the last pass (the others did). */
  | { stan: 'gotowe'; kiedy: string; bledy: BladTabeli[]; odrzucone: number }
  | { stan: 'offline' }
  /** This device last synced another account: nothing syncs until the person chooses. */
  | { stan: 'inneKonto'; blad?: string };

let status: StatusSynchronizacji = { stan: 'nieaktywna' };
const sluchacze = new Set<() => void>();
function ustawStatus(s: StatusSynchronizacji) {
  status = s;
  sluchacze.forEach((l) => l());
}

export function useStatusSynchronizacji() {
  return useSyncExternalStore(
    (l) => {
      sluchacze.add(l);
      return () => sluchacze.delete(l);
    },
    () => status,
    () => status,
  );
}

// ---- Running ----

type Aktywna = {
  sb: SupabaseClient;
  uzytkownik: string;
  powiadom: (wynik: WynikSynchronizacji) => void;
  zatrzymaj: () => void;
  /** Waiting for the person's choice about another account's data: no pass may run. */
  czekaNaWybor: boolean;
};

let aktywna: Aktywna | null = null;
let trwa: Promise<void> | null = null;
let jeszczeRaz = false;

/** Runs one pass now, or one more right after the pass under way. */
function przepustka() {
  const ta = aktywna;
  if (!ta || ta.czekaNaWybor) return;
  if (trwa) {
    jeszczeRaz = true;
    return;
  }
  trwa = (async () => {
    if (!navigator.onLine) {
      ustawStatus({ stan: 'offline' });
      return;
    }
    ustawStatus({ stan: 'trwa' });
    let wynik: WynikSynchronizacji;
    try {
      wynik = await synchronizuj(zdalneSupabase(ta.sb, ta.uzytkownik), POLACZENIA, stanMagazyn.odczytajAktualne(), ta.uzytkownik);
    } catch (err) {
      // The engine reports a table's failure in `bledy`; this is a fault in the pass itself.
      console.error('[synchronizacja] pass failed', err);
      wynik = {
        stan: stanMagazyn.odczytajAktualne(),
        wyslane: {},
        pobrane: {},
        odrzucone: {},
        bledy: [{ tabela: 'wszystkie', rodzaj: 'serwer', opis: String(err) }],
        pierwsza: false,
      };
    }
    // Signed out, or another account signed in, while the pass ran: what it learnt is not this session's to keep.
    if (aktywna !== ta) return;
    const bledy = [...wynik.bledy];
    if (!stanMagazyn.zapisz(wynik.stan)) {
      bledy.push({ tabela: 'stan', rodzaj: 'przegladarka', opis: 'przeglądarka nie zapisała stanu synchronizacji' });
    } else {
      ta.powiadom(wynik);
    }
    if (bledy.length > 0 && bledy.every((b) => b.rodzaj === 'siec') && !navigator.onLine) {
      ustawStatus({ stan: 'offline' });
      return;
    }
    const odrzucone = Object.values(wynik.odrzucone).reduce((a, b) => a + b, 0);
    ustawStatus({ stan: 'gotowe', kiedy: new Date().toISOString(), bledy, odrzucone });
  })().finally(() => {
    trwa = null;
    if (jeszczeRaz) {
      jeszczeRaz = false;
      przepustka();
    }
  });
}

const PO_ZMIANIE_MS = 3000;
const CO_ILE_MS = 5 * 60 * 1000;

/**
 * Starts syncing for the signed-in person: a pass now, a few seconds after
 * every change to a store, when the connection or the tab comes back, and
 * every five minutes. If this device last synced another account, nothing
 * runs until `rozstrzygnij` says what to do with this device's data.
 */
export function uruchomSynchronizacje(sb: SupabaseClient, uzytkownik: string, powiadom: Aktywna['powiadom']) {
  zatrzymajSynchronizacje();
  const poprzedni = stanMagazyn.odczytajAktualne().uzytkownik;
  let opoznienie: ReturnType<typeof setTimeout> | undefined;
  const poZmianie = () => {
    if (wlasnyZapis) return; // the pass's own save, not a change to send
    clearTimeout(opoznienie);
    // A change during a pass waits for the next one, a few seconds after the change.
    opoznienie = setTimeout(przepustka, PO_ZMIANIE_MS);
  };
  const poPowrocie = () => {
    if (document.visibilityState === 'visible') przepustka();
  };
  const odsubskrybuj = POLACZENIA.map((p) => p.subskrybuj(poZmianie));
  window.addEventListener('online', przepustka);
  document.addEventListener('visibilitychange', poPowrocie);
  const zegar = setInterval(przepustka, CO_ILE_MS);
  const czekaNaWybor = poprzedni !== null && poprzedni !== uzytkownik && maDane();
  aktywna = {
    sb,
    uzytkownik,
    powiadom,
    czekaNaWybor,
    zatrzymaj() {
      clearTimeout(opoznienie);
      clearInterval(zegar);
      odsubskrybuj.forEach((o) => o());
      window.removeEventListener('online', przepustka);
      document.removeEventListener('visibilitychange', poPowrocie);
    },
  };
  if (czekaNaWybor) ustawStatus({ stan: 'inneKonto' });
  else przepustka();
}

export function zatrzymajSynchronizacje() {
  aktywna?.zatrzymaj();
  aktywna = null;
  ustawStatus({ stan: 'nieaktywna' });
}

/** Whether this browser holds any course data of its own. */
function maDane() {
  const { postep } = postepDoSynchronizacji.czytaj();
  return (
    Object.keys(postep).length > 0 ||
    Object.keys(checklistaDoSynchronizacji.czytaj()).length > 0 ||
    Object.keys(fiszkiDoSynchronizacji.czytaj()).length > 0
  );
}

/**
 * The choice when this device last synced another account: `dolacz` adds
 * this device's data to the signed-in account; `zastap` clears it first, so
 * the device shows the signed-in account's data only. Nothing syncs until
 * the choice has been carried out in full: a clear the browser refuses keeps
 * the choice open, so a later pass cannot send what was meant to go.
 */
export function rozstrzygnij(wybor: 'dolacz' | 'zastap') {
  const ta = aktywna;
  if (!ta?.czekaNaWybor) return;
  if (wybor === 'zastap') {
    const czyszczenie: [string, () => boolean][] = [
      ['odznaki', () => zdobyteDoSynchronizacji.zapisz({})],
      ['lekcje', () => postepDoSynchronizacji.zapisz({ postep: {}, slady: {} })],
      ['checklista', () => checklistaDoSynchronizacji.zapisz({})],
      ['fiszki', () => fiszkiDoSynchronizacji.zapisz({})],
    ];
    wlasnyZapis = true;
    const nieWyczyszczone = czyszczenie.filter(([, wyczysc]) => !wyczysc()).map(([nazwa]) => nazwa);
    wlasnyZapis = false;
    if (nieWyczyszczone.length > 0) {
      ustawStatus({
        stan: 'inneKonto',
        blad: `Przeglądarka nie pozwoliła usunąć: ${nieWyczyszczone.join(', ')}. Nic nie zostało wysłane do konta.`,
      });
      return;
    }
  }
  if (!stanMagazyn.zapisz(PUSTY_STAN)) {
    ustawStatus({ stan: 'inneKonto', blad: 'Przeglądarka nie zapisała wyboru. Nic nie zostało wysłane do konta.' });
    return;
  }
  ta.czekaNaWybor = false;
  przepustka();
}

/** A pass now (the "Synchronizuj teraz" button). */
export const synchronizujTeraz = przepustka;
