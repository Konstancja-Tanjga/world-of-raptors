'use client';

import { useCallback, useSyncExternalStore } from 'react';

/** One observed species. Presence of the key is what marks it as seen. */
export type Obserwacja = {
  /** ISO date (YYYY-MM-DD) of the first observation. */
  data?: string;
  miejsce?: string;
  notatka?: string;
};

export type Checklista = Record<string, Obserwacja>;

const KEY = 'wor:checklista:v1';
const listeners = new Set<() => void>();
let cache: Checklista | null = null;

function read(): Checklista {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    cache = isChecklista(parsed) ? parsed : {};
  } catch {
    cache = {};
  }
  return cache;
}

function write(next: Checklista) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the in-memory copy still works for this visit.
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

export function isChecklista(value: unknown): value is Checklista {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value).every(
    (o) =>
      typeof o === 'object' &&
      o !== null &&
      ['data', 'miejsce', 'notatka'].every(
        (k) => (o as Record<string, unknown>)[k] === undefined || typeof (o as Record<string, unknown>)[k] === 'string',
      ),
  );
}

export function dzisiaj() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * The checklist lives in localStorage. `lista` is `null` until the browser
 * copy has been read, so the server render and first paint show a loading
 * state rather than an empty list that then fills in.
 */
export function useChecklista() {
  const lista = useSyncExternalStore(subscribe, read, () => null);

  const przelacz = useCallback((id: string) => {
    const current = { ...read() };
    if (current[id]) delete current[id];
    else current[id] = { data: dzisiaj() };
    write(current);
  }, []);

  const aktualizuj = useCallback((id: string, patch: Obserwacja) => {
    const current = read();
    write({ ...current, [id]: { ...current[id], ...patch } });
  }, []);

  const zastap = useCallback((next: Checklista) => write(next), []);

  return { lista, przelacz, aktualizuj, zastap };
}
