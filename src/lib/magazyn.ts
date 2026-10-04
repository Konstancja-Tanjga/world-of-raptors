'use client';

import { useSyncExternalStore } from 'react';
import { dataLokalna } from './daty';

/**
 * A small localStorage-backed store shared by the checklist and lesson
 * progress. Two things it refuses to do silently:
 *
 * - Stored data that cannot be read (bad JSON, failed validation) is copied to
 *   `<key>:bad` before the store starts empty, so the next save cannot destroy
 *   the only copy of someone's observations.
 * - A save the browser refuses (private mode, quota) makes `zapisz` return
 *   `false`, so the caller can tell the user the change will not survive a
 *   reload instead of showing it as saved.
 */
export function utworzMagazyn<T extends object>(key: string, poprawny: (v: unknown) => v is T) {
  const listeners = new Set<() => void>();
  let cache: T | null = null;
  // The stored text the cache was read from or last saved as, to tell when another tab has saved since.
  let surowy: string | null = null;

  function zachowajUszkodzone(raw: string) {
    console.error(`[${key}] stored data unreadable; preserved under ${key}:bad`);
    try {
      if (window.localStorage.getItem(`${key}:bad`) === null) {
        window.localStorage.setItem(`${key}:bad`, raw);
      }
    } catch {
      // Nothing more we can do; the original is still under `key` until the next save.
    }
  }

  function odczytaj(): T {
    if (cache) return cache;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      raw = null; // storage blocked: behave as a fresh, empty store
    }
    surowy = raw;
    if (raw === null) {
      cache = {} as T;
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
   * The stored copy as it is now, to change and save back: the cache hears of
   * other tabs' saves only while a hook subscribes. With storage blocked, the
   * cache is all there is.
   */
  function odczytajAktualne(): T {
    try {
      if (window.localStorage.getItem(key) !== surowy) cache = null;
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
      window.localStorage.setItem(key, tekst);
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
    const onStorage = (e: StorageEvent) => {
      // `key` is null when another tab cleared all storage.
      if (e.key === key || e.key === null) {
        cache = null;
        listener();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
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
