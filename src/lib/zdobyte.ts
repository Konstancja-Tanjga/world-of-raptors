'use client';

import { useCallback, useMemo } from 'react';
import { useChecklista } from './checklist';
import { useFiszki } from './fiszki';
import { dzisiaj, utworzMagazyn } from './magazyn';
import { stanNieba, zdobyteWStanie, type StanNieba, type StrukturaNieba } from './odznaki';
import { usePostep } from './postep';

/**
 * When each constellation, gold star and patch was first earned, and whether
 * "Moje niebo" has shown it yet (it plays its moment once). What is earned
 * stays earned: a lesson unticked or a flashcard forgotten later does not
 * take it back. `start` marks the first evaluation, when everything already
 * earned is recorded without being announced all at once; "Moje niebo"
 * still plays each moment once, so its first visit reveals all of it.
 */
export type Zdobyta = { data: string; pokazana?: boolean };
export type Zdobyte = Record<string, Zdobyta>;

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export function isZdobyte(value: unknown): value is Zdobyte {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value).every(
    (z) =>
      typeof z === 'object' &&
      z !== null &&
      typeof (z as Record<string, unknown>).data === 'string' &&
      DATA.test((z as Record<string, unknown>).data as string) &&
      ['undefined', 'boolean'].includes(typeof (z as Record<string, unknown>).pokazana),
  );
}

const magazyn = utworzMagazyn<Zdobyte>('wor:odznaki:v1', isZdobyte);
const START = 'start';

export function useZdobyte() {
  const zdobyte = magazyn.useMagazyn();

  /** Marks these as shown, so their moment does not play again. */
  const oznaczPokazane = useCallback((klucze: string[]) => {
    const obecne = magazyn.odczytaj();
    const next = { ...obecne };
    for (const k of klucze) if (next[k] && !next[k].pokazana) next[k] = { ...next[k], pokazana: true };
    return magazyn.zapisz(next);
  }, []);

  const zastapZdobyte = useCallback((next: Zdobyte) => magazyn.zapisz(next), []);

  return { zdobyte, oznaczPokazane, zastapZdobyte };
}

/**
 * After a backup is loaded: what the file recorded joins what this browser
 * recorded (the earlier date wins, so nothing earned is lost), and the next
 * evaluation, like the very first, records whatever the loaded progress has
 * earned besides without announcing it all at once. Returns whether the
 * browser kept the change.
 */
export function wczytajZKopii(zKopii: Zdobyte | undefined) {
  const next: Zdobyte = { ...magazyn.odczytaj() };
  for (const [klucz, z] of Object.entries(zKopii ?? {})) {
    const obecna = next[klucz];
    const data = obecna && obecna.data < z.data ? obecna.data : z.data;
    next[klucz] = obecna?.pokazana || z.pokazana ? { data, pokazana: true } : { data };
  }
  delete next[START];
  return magazyn.zapisz(next);
}

/** My sky as the three stores have it, or null while any of them loads. */
export function useStanNieba(struktura: StrukturaNieba): StanNieba | null {
  const { postep } = usePostep();
  const { fiszki } = useFiszki();
  const { lista } = useChecklista();
  return useMemo(
    () => (postep && fiszki && lista ? stanNieba(struktura, postep, fiszki, lista) : null),
    [struktura, postep, fiszki, lista],
  );
}

/**
 * Records with today's date whatever this state has earned that is not yet
 * recorded. Returns the keys to announce (none on the first evaluation) and
 * whether the browser kept the change.
 */
export function zapiszNowe(stan: StanNieba): { nowe: string[]; zapisano: boolean } {
  const obecne = magazyn.odczytaj();
  const pierwszyRaz = !obecne[START];
  const nowe = zdobyteWStanie(stan).filter((k) => !obecne[k]);
  if (!pierwszyRaz && nowe.length === 0) return { nowe: [], zapisano: true };
  const dzis = dzisiaj();
  const next: Zdobyte = { ...obecne, ...(pierwszyRaz ? { [START]: { data: dzis, pokazana: true } } : {}) };
  for (const k of nowe) next[k] = { data: dzis };
  return { nowe: pierwszyRaz ? [] : nowe, zapisano: magazyn.zapisz(next) };
}
