'use client';

import { useCallback } from 'react';
import { przemianujMiejsceWChecklisci } from './checklist';
import { utworzMagazyn } from './magazyn';
import { isMojeMiejsca, scalMiejsca, usunMiejsce, zapiszMiejsce, type DaneMiejsca, type MojeMiejsca } from './mojeMiejsca';

const teraz = () => new Date().toISOString();

const magazyn = utworzMagazyn<MojeMiejsca>('wor:miejsca:v1', isMojeMiejsca);

/** The places, read and saved by the sync (synchronizacjaPrzegladarki.ts) and by loading a backup. */
export const mojeMiejscaDoSynchronizacji = {
  czytaj: () => magazyn.odczytajAktualne(),
  zapisz: (m: MojeMiejsca) => magazyn.zapisz(m),
  subskrybuj: magazyn.subskrybuj,
};

/**
 * Places from a backup, merged in by their change times: a file never takes
 * back a place added or changed since. Returns whether it was saved, and the
 * places as merged (for making the backup's checklist agree with their names).
 */
export function wczytajMiejscaZKopii(zKopii: MojeMiejsca) {
  const po = scalMiejsca(magazyn.odczytajAktualne(), zKopii);
  return { zapisane: magazyn.zapisz(po), po };
}

/** A new place's id: random, so two devices adding places offline never pick the same one. */
export const noweIdMiejsca = () => crypto.randomUUID();

/**
 * The owner's places (rules: mojeMiejsca.ts). `miejsca` is `null` until the
 * browser copy has been read. Every change returns whether all of it was saved.
 *
 * `zapisz` with `staraNazwa` (the name the place had when its edit began,
 * kept by the caller, since a refused save still changes this visit's copy)
 * renames the place in the checklist's observations first and saves the place
 * only once they are renamed, so the two never disagree; a retry renames
 * whatever still has the old name.
 */
export function useMojeMiejsca() {
  const miejsca = magazyn.useMagazyn();

  const zapisz = useCallback((id: string, dane: DaneMiejsca, staraNazwa?: string) => {
    const t = teraz();
    if (staraNazwa !== undefined && !przemianujMiejsceWChecklisci(staraNazwa, dane.nazwa, t)) return false;
    return magazyn.zapisz(zapiszMiejsce(magazyn.odczytaj(), id, dane, t));
  }, []);

  const usun = useCallback((id: string) => magazyn.zapisz(usunMiejsce(magazyn.odczytaj(), id, teraz())), []);

  return { miejsca, zapisz, usun };
}
