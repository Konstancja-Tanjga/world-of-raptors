'use client';

import { useCallback } from 'react';
import { dzisiaj, utworzMagazyn } from './magazyn';
import type { WynikTestu } from './wynikTestu';

/**
 * The starting test's results in this browser: the first attempt, kept for
 * good, and the latest one, so taking the test again at the end of the course
 * shows the progress. Not synced with the account yet (KONTA.md).
 */
export type WynikiTestu = { pierwszy?: WynikTestu; ostatni?: WynikTestu };

const jestWynikiem = (w: unknown): w is WynikTestu =>
  typeof w === 'object' &&
  w !== null &&
  typeof (w as WynikTestu).data === 'string' &&
  typeof (w as WynikTestu).odpowiedzi === 'object' &&
  (w as WynikTestu).odpowiedzi !== null &&
  Object.values((w as WynikTestu).odpowiedzi).every((o) => Number.isInteger(o));

export function isWynikiTestu(v: unknown): v is WynikiTestu {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const w = v as Record<string, unknown>;
  return (w.pierwszy === undefined || jestWynikiem(w.pierwszy)) && (w.ostatni === undefined || jestWynikiem(w.ostatni));
}

const magazyn = utworzMagazyn<WynikiTestu>('wor:test-startowy:v1', isWynikiTestu);

/** `wyniki` is `null` until the browser copy has been read. `zapisz` returns whether the browser kept it. */
export function useWynikiTestu() {
  const wyniki = magazyn.useMagazyn();
  const zapisz = useCallback((odpowiedzi: Record<string, number>) => {
    const obecne = magazyn.odczytajAktualne();
    const wynik: WynikTestu = { data: dzisiaj(), odpowiedzi };
    return magazyn.zapisz({ pierwszy: obecne.pierwszy ?? wynik, ostatni: wynik });
  }, []);
  return { wyniki, zapisz };
}
