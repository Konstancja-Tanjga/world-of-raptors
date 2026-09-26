'use client';

import { useCallback } from 'react';
import { dzisiaj, utworzMagazyn } from './magazyn';

/** Finished lessons, keyed "modul/lekcja", valued with the local date (YYYY-MM-DD) finished. */
export type Postep = Record<string, string>;

function isPostep(value: unknown): value is Postep {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === 'string')
  );
}

const magazyn = utworzMagazyn<Postep>('wor:postep:v1', isPostep);

export const kluczLekcji = (modul: string, lekcja: string) => `${modul}/${lekcja}`;

/**
 * Course progress in localStorage. `postep` is `null` until the browser copy
 * has been read, so the menu shows no ✓/○ and the lesson checkbox does not
 * render unchecked before the real value is known. `ustaw` returns whether
 * the change was actually saved.
 */
export function usePostep() {
  const postep = magazyn.useMagazyn();

  const ustaw = useCallback((klucz: string, ukonczona: boolean) => {
    const next = { ...magazyn.odczytaj() };
    if (ukonczona) next[klucz] = dzisiaj();
    else delete next[klucz];
    return magazyn.zapisz(next);
  }, []);

  return { postep, ustaw };
}
