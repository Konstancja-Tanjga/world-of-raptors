'use client';

import { useCallback } from 'react';
import { dzisiaj, utworzMagazyn } from './magazyn';

export { dzisiaj };

/** One observed species. Presence of the key is what marks it as seen. */
export type Obserwacja = {
  /** Local date (YYYY-MM-DD) of the first observation. */
  data?: string;
  miejsce?: string;
  notatka?: string;
};

export type Checklista = Record<string, Obserwacja>;

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

const magazyn = utworzMagazyn<Checklista>('wor:checklista:v1', isChecklista);

/**
 * The checklist lives in localStorage. `lista` is `null` until the browser
 * copy has been read, so the server render and first paint show a loading
 * state rather than an empty list that then fills in. Every change returns
 * whether it was actually saved.
 */
export function useChecklista() {
  const lista = magazyn.useMagazyn();

  const przelacz = useCallback((id: string) => {
    const current = { ...magazyn.odczytaj() };
    if (current[id]) delete current[id];
    else current[id] = { data: dzisiaj() };
    return magazyn.zapisz(current);
  }, []);

  const aktualizuj = useCallback((id: string, patch: Obserwacja) => {
    const current = magazyn.odczytaj();
    return magazyn.zapisz({ ...current, [id]: { ...current[id], ...patch } });
  }, []);

  const zastap = useCallback((next: Checklista) => magazyn.zapisz(next), []);

  return { lista, przelacz, aktualizuj, zastap };
}
