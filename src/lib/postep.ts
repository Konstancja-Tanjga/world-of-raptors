'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { dzisiaj } from './checklist';

/** Finished lessons, keyed "modul/lekcja", valued with the ISO date finished. */
export type Postep = Record<string, string>;

const KEY = 'wor:postep:v1';
const listeners = new Set<() => void>();
let cache: Postep | null = null;

function isPostep(value: unknown): value is Postep {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === 'string')
  );
}

function read(): Postep {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    cache = isPostep(parsed) ? parsed : {};
  } catch {
    cache = {};
  }
  return cache;
}

function write(next: Postep) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: progress still works for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
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

export const kluczLekcji = (modul: string, lekcja: string) => `${modul}/${lekcja}`;

/**
 * Course progress in localStorage. `postep` is `null` until the browser copy
 * has been read, so nothing claims "0 of 5" before the real value is known.
 */
export function usePostep() {
  const postep = useSyncExternalStore(subscribe, read, () => null);

  const ustaw = useCallback((klucz: string, ukonczona: boolean) => {
    const next = { ...read() };
    if (ukonczona) next[klucz] = dzisiaj();
    else delete next[klucz];
    write(next);
  }, []);

  return { postep, ustaw };
}
