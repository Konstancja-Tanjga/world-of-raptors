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

/** Places from a backup, merged in by their change times: a file never takes back a place added since. */
export const wczytajMiejscaZKopii = (zKopii: MojeMiejsca) => magazyn.zapisz(scalMiejsca(magazyn.odczytajAktualne(), zKopii));

/** A new place's id: random, so two devices adding places offline never pick the same one. */
export const noweIdMiejsca = () => crypto.randomUUID();

/**
 * The owner's places (rules: mojeMiejsca.ts). `miejsca` is `null` until the
 * browser copy has been read. Saving a place under a new name renames it in
 * the checklist's observations too. Every change returns whether it was saved.
 */
export function useMojeMiejsca() {
  const miejsca = magazyn.useMagazyn();

  const zapisz = useCallback((id: string, dane: DaneMiejsca) => {
    const t = teraz();
    const przed = magazyn.odczytaj()[id];
    if (!magazyn.zapisz(zapiszMiejsce(magazyn.odczytaj(), id, dane, t))) return false;
    if (przed && !przed.usuniete && przed.nazwa !== dane.nazwa.trim()) return przemianujMiejsceWChecklisci(przed.nazwa, dane.nazwa, t);
    return true;
  }, []);

  const usun = useCallback((id: string) => magazyn.zapisz(usunMiejsce(magazyn.odczytaj(), id, teraz())), []);

  return { miejsca, zapisz, usun };
}
