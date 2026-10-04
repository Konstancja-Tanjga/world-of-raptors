'use client';

import { useMemo } from 'react';
import { useChecklista } from './checklist';
import { useFiszki } from './fiszki';
import { dzisiaj, utworzMagazyn } from './magazyn';
import { stanNieba, zdobyteWStanie, type KluczOdznaki, type StanNieba, type StrukturaNieba } from './odznaki';
import { usePostep } from './postep';

/**
 * When each constellation, gold star and patch was first earned, and whether
 * "Moje niebo" has played its moment (once). What is earned stays earned: a
 * lesson unticked or a flashcard forgotten later does not take it back.
 * `start` marks the first evaluation, which records whatever is already
 * earned silently, rather than in a burst of toasts; "Moje niebo" still plays
 * each moment once, so its first visit reveals all of it. Every write here
 * starts from the stored copy as it is now and only adds to it, since another
 * tab may have saved in the meantime.
 */
export type Zdobyta = { data: string; pokazana?: boolean };
export type Zdobyte = Record<string, Zdobyta>;

const DATA = /^\d{4}-\d{2}-\d{2}$/;
/** A real calendar day: an impossible one (2026-13-01) would break the dates "Moje niebo" prints. */
const czyData = (d: unknown) => {
  if (typeof d !== 'string' || !DATA.test(d)) return false;
  const t = Date.parse(`${d}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === d;
};

export function isZdobyte(value: unknown): value is Zdobyte {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value).every((z) => {
    if (typeof z !== 'object' || z === null) return false;
    const r = z as Record<string, unknown>;
    return czyData(r.data) && ['undefined', 'boolean'].includes(typeof r.pokazana);
  });
}

const magazyn = utworzMagazyn<Zdobyte>('wor:odznaki:v1', isZdobyte);
const START = 'start';

/** What I have earned, by key (without the `start` mark); `null` until the browser copy has been read. */
export function useZdobyte(): Zdobyte | null {
  const wszystkie = magazyn.useMagazyn();
  return useMemo(() => (wszystkie ? Object.fromEntries(Object.entries(wszystkie).filter(([k]) => k !== START)) : null), [wszystkie]);
}

/**
 * Marks these moments as played, so they do not play again. A key not yet
 * recorded (the watcher loads after the page, and may not have run) is
 * recorded here with today's date. Returns whether the browser kept it.
 */
export function oznaczPokazane(klucze: string[]) {
  const next: Zdobyte = { ...magazyn.odczytajAktualne() };
  for (const k of klucze) if (!next[k]?.pokazana) next[k] = { data: next[k]?.data ?? dzisiaj(), pokazana: true };
  return magazyn.zapisz(next);
}

/**
 * After a backup is loaded: what the file recorded joins what this browser
 * recorded (the earlier date wins, so nothing earned is lost), and the next
 * evaluation, like the very first, records silently whatever the loaded
 * progress has earned besides. Returns whether the browser kept the change.
 */
export function wczytajZKopii(zKopii: Zdobyte | undefined) {
  const next: Zdobyte = { ...magazyn.odczytajAktualne() };
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
export function zapiszNowe(stan: StanNieba): { nowe: KluczOdznaki[]; zapisano: boolean } {
  const obecne = magazyn.odczytajAktualne();
  const pierwszyRaz = !obecne[START];
  const nowe = zdobyteWStanie(stan).filter((k) => !obecne[k]);
  if (!pierwszyRaz && nowe.length === 0) return { nowe: [], zapisano: true };
  const dzis = dzisiaj();
  const next: Zdobyte = { ...obecne, ...(pierwszyRaz ? { [START]: { data: dzis, pokazana: true } } : {}) };
  for (const k of nowe) next[k] = { data: dzis };
  return { nowe: pierwszyRaz ? [] : nowe, zapisano: magazyn.zapisz(next) };
}
