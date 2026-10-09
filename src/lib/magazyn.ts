'use client';

import { useSyncExternalStore } from 'react';
import { dataLokalna } from './daty';

/**
 * Where a store keeps its text: the browser's localStorage today. Stores talk
 * to this, never to localStorage, so a synced backend can take its place.
 * Every method may throw when the browser refuses (blocked storage, quota).
 */
export type AdapterMagazynu = {
  czytaj(klucz: string): string | null;
  zapisz(klucz: string, tekst: string): void;
  /** Calls `zmiana` when another tab (or device) changes `klucz`; returns the unsubscribe. */
  nasluchuj(klucz: string, zmiana: () => void): () => void;
};

export const adapterPrzegladarki: AdapterMagazynu = {
  czytaj: (klucz) => window.localStorage.getItem(klucz),
  zapisz: (klucz, tekst) => window.localStorage.setItem(klucz, tekst),
  nasluchuj(klucz, zmiana) {
    const onStorage = (e: StorageEvent) => {
      // `key` is null when another tab cleared all storage.
      if (e.key === klucz || e.key === null) zmiana();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  },
};

/**
 * The store's previous version: read once, when the current key does not
 * exist yet, then moved forward with `migruj` and saved under the current
 * key. The old key is left as it was, a copy to go back to.
 */
export type PoprzedniaWersja<T> = { klucz: string; migruj: (stare: unknown) => T | null };

/**
 * A small store for one piece of personal data (the checklist, lesson
 * progress, flashcards, earned dates). Two things it refuses to do silently:
 *
 * - Stored data that cannot be read (bad JSON, failed validation, a failed
 *   migration) is copied to `<key>:bad` before the store starts empty, so the
 *   next save cannot destroy the only copy of someone's observations.
 * - A save the browser refuses (private mode, quota) makes `zapisz` return
 *   `false`, so the caller can tell the user the change will not survive a
 *   reload instead of showing it as saved.
 *
 * Keys carry a version (`wor:checklista:v2`). A change of shape gets a new key
 * and a `poprzednia` that migrates the old one forward.
 */
export function utworzMagazyn<T extends object>(
  key: string,
  poprawny: (v: unknown) => v is T,
  { adapter = adapterPrzegladarki, poprzednia }: { adapter?: AdapterMagazynu; poprzednia?: PoprzedniaWersja<T> } = {},
) {
  const listeners = new Set<() => void>();
  let cache: T | null = null;
  // The stored text the cache was read from or last saved as, to tell when another tab has saved since.
  let surowy: string | null = null;

  function zachowajUszkodzone(raw: string) {
    console.error(`[${key}] stored data unreadable; preserved under ${key}:bad`);
    try {
      if (adapter.czytaj(`${key}:bad`) === null) adapter.zapisz(`${key}:bad`, raw);
    } catch {
      // Nothing more we can do; the original is still under `key` until the next save.
    }
  }

  function odczytaj(): T {
    if (cache) return cache;
    let raw: string | null = null;
    try {
      raw = adapter.czytaj(key);
    } catch {
      raw = null; // storage blocked: behave as a fresh, empty store
    }
    surowy = raw;
    if (raw === null) {
      cache = przeniesPoprzednia() ?? ({} as T);
      return cache;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (poprawny(parsed)) {
        cache = parsed;
        return cache;
      }
    } catch {
      // fall through to preserving the unreadable copy
    }
    zachowajUszkodzone(raw);
    cache = {} as T;
    return cache;
  }

  /**
   * The previous version's data moved forward and saved under `key`, or null
   * when there is none. If the save is refused, the next read migrates again.
   */
  function przeniesPoprzednia(): T | null {
    if (!poprzednia) return null;
    let stary: string | null;
    try {
      stary = adapter.czytaj(poprzednia.klucz);
    } catch {
      return null;
    }
    if (stary === null) return null;
    let nowe: T | null = null;
    try {
      const wynik = poprzednia.migruj(JSON.parse(stary));
      if (wynik !== null && poprawny(wynik)) nowe = wynik;
    } catch {
      // fall through
    }
    if (!nowe) {
      // The old key keeps its copy; `:bad` says why this store starts empty.
      zachowajUszkodzone(stary);
      return null;
    }
    try {
      const tekst = JSON.stringify(nowe);
      adapter.zapisz(key, tekst);
      surowy = tekst;
    } catch (err) {
      console.warn(`[${key}] could not save the migrated copy`, err);
    }
    return nowe;
  }

  /**
   * The stored copy as it is now, to change and save back: the cache hears of
   * other tabs' saves only while a hook subscribes. With storage blocked, the
   * cache is all there is.
   */
  function odczytajAktualne(): T {
    try {
      if (adapter.czytaj(key) !== surowy) cache = null;
    } catch {
      // blocked: keep the cache
    }
    return odczytaj();
  }

  /** Saves and notifies subscribers. Returns false if the browser refused to store it. */
  function zapisz(next: T): boolean {
    cache = next;
    let ok = true;
    try {
      const tekst = JSON.stringify(next);
      adapter.zapisz(key, tekst);
      surowy = tekst;
    } catch (err) {
      console.warn(`[${key}] could not save`, err);
      ok = false;
    }
    listeners.forEach((l) => l());
    return ok;
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const przestan = adapter.nasluchuj(key, () => {
      cache = null;
      listener();
    });
    return () => {
      listeners.delete(listener);
      przestan();
    };
  }

  /**
   * `null` until the browser copy has been read (always on the server and
   * during hydration), so nothing renders a guessed state that then flips.
   */
  function useMagazyn(): Readonly<T> | null {
    return useSyncExternalStore(subscribe, odczytaj, () => null);
  }

  return { odczytaj, odczytajAktualne, zapisz, useMagazyn };
}

export function dzisiaj() {
  return dataLokalna();
}
