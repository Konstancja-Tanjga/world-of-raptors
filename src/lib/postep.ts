'use client';

import { useCallback } from 'react';
import { dzisiaj, utworzMagazyn } from './magazyn';
import type { PostepZeSladami, SladyPostepu } from './synchronizacja';

/** Finished lessons, keyed "modul/lekcja", valued with the local date (YYYY-MM-DD) finished. */
export type Postep = Record<string, string>;

export function isPostep(value: unknown): value is Postep {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === 'string')
  );
}

const magazyn = utworzMagazyn<Postep>('wor:postep:v1', isPostep);

export function isSladyPostepu(value: unknown): value is SladyPostepu {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (s) =>
        typeof s === 'object' &&
        s !== null &&
        typeof (s as Record<string, unknown>).t === 'string' &&
        [undefined, true].includes((s as Record<string, unknown>).usunieta as undefined | true),
    )
  );
}

/**
 * When each lesson's state last changed here, and which were unticked: the
 * progress store itself keeps only finished lessons and their dates, so
 * syncing needs this beside it to tell a newer untick from an older tick.
 */
const slady = utworzMagazyn<SladyPostepu>('wor:postep:slady:v1', isSladyPostepu);

/** Saves progress and records, for every lesson whose state it changes, when and whether it was unticked. */
function zapiszZeSladami(next: Postep) {
  const przed = magazyn.odczytajAktualne();
  const t = new Date().toISOString();
  const noweSlady: SladyPostepu = { ...slady.odczytajAktualne() };
  for (const k of new Set([...Object.keys(przed), ...Object.keys(next)])) {
    if (przed[k] === next[k]) continue;
    noweSlady[k] = k in next ? { t } : { t, usunieta: true };
  }
  // The side record first: progress saved without it would lose an untick from the sync, which a
  // later pull could then undo. If it is refused, nothing is saved and the caller warns.
  if (!slady.zapisz(noweSlady)) return false;
  return magazyn.zapisz(next);
}

/** Progress and its change times, read and saved by the sync (synchronizacjaPrzegladarki.ts). */
export const postepDoSynchronizacji = {
  czytaj: (): PostepZeSladami => ({ postep: magazyn.odczytajAktualne(), slady: slady.odczytajAktualne() }),
  zapisz: (p: PostepZeSladami) => slady.zapisz(p.slady) && magazyn.zapisz(p.postep),
  subskrybuj: magazyn.subskrybuj,
};

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
    return zapiszZeSladami(next);
  }, []);

  const zastapPostep = useCallback((next: Postep) => zapiszZeSladami(next), []);

  return { postep, ustaw, zastapPostep };
}
