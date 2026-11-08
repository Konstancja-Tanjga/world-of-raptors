'use client';

import { useCallback } from 'react';
import { checklistaDoSynchronizacji } from './checklist';
import { checklistaPoWpisie, isDziennik, usunWpis, zapiszWpis, type DaneWpisu, type Dziennik } from './dziennik';
import { utworzMagazyn } from './magazyn';

export { wpisy, type Dziennik, type WpisDziennika, type DaneWpisu } from './dziennik';

const magazyn = utworzMagazyn<Dziennik>('wor:dziennik:v1', isDziennik);

const teraz = () => new Date().toISOString();

/**
 * What saving a sighting did: `wpis` is the log's own save (`niepoprawny`: an
 * entry the store's check refuses, never saved; `odmowa`: the browser refused
 * it), `checklista` whether the species' tick, if it needed one, was saved.
 */
export type WynikZapisu = { wpis: 'zapisany' | 'niepoprawny' | 'odmowa'; checklista: boolean };

/** The field log, read and saved by the sync (synchronizacjaPrzegladarki.ts) and by backups. */
export const dziennikDoSynchronizacji = {
  czytaj: () => magazyn.odczytajAktualne(),
  zapisz: (d: Dziennik) => magazyn.zapisz(d),
  subskrybuj: magazyn.subskrybuj,
};

/** A new sighting's id. */
export const noweIdWpisu = () => crypto.randomUUID();

/**
 * The field log store (rules: dziennik.ts). `dziennik` is `null` until the
 * browser copy has been read. Saving a sighting also ticks its species on the
 * checklist (or moves its first date back). The two saves are reported
 * apart: a sighting kept in the log is not lost when only the checklist's
 * tick was refused, and the caller says which.
 */
export function useDziennik() {
  const dziennik = magazyn.useMagazyn();

  const zapisz = useCallback((id: string, dane: DaneWpisu): WynikZapisu => {
    const t = teraz();
    const nowy = zapiszWpis(magazyn.odczytajAktualne(), id, dane, t);
    if (!nowy) {
      console.error('[dziennik] refused an entry the store could not read back', id, dane);
      return { wpis: 'niepoprawny', checklista: false };
    }
    if (!magazyn.zapisz(nowy)) return { wpis: 'odmowa', checklista: false };
    const lista = checklistaDoSynchronizacji.czytaj();
    const po = checklistaPoWpisie(lista, dane, t);
    return { wpis: 'zapisany', checklista: po === lista || checklistaDoSynchronizacji.zapisz({ ...po }) };
  }, []);

  const usun = useCallback((id: string) => magazyn.zapisz(usunWpis(magazyn.odczytajAktualne(), id, teraz())), []);

  const zastap = useCallback((d: Dziennik) => magazyn.zapisz(d), []);

  return { dziennik, zapisz, usun, zastap };
}
