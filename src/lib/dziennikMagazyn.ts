'use client';

import { useCallback } from 'react';
import { checklistaDoSynchronizacji } from './checklist';
import { checklistaPoWpisie, isDziennik, usunWpis, zapiszWpis, type DaneWpisu, type Dziennik } from './dziennik';
import { utworzMagazyn } from './magazyn';

export { wpisy, type Dziennik, type WpisDziennika, type DaneWpisu } from './dziennik';

const magazyn = utworzMagazyn<Dziennik>('wor:dziennik:v1', isDziennik);

const teraz = () => new Date().toISOString();

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
 * checklist (or moves its first date back); both saves are reported together,
 * so the caller can warn when either was refused.
 */
export function useDziennik() {
  const dziennik = magazyn.useMagazyn();

  const zapisz = useCallback((id: string, dane: DaneWpisu) => {
    const t = teraz();
    if (!magazyn.zapisz(zapiszWpis(magazyn.odczytajAktualne(), id, dane, t))) return false;
    const lista = checklistaDoSynchronizacji.czytaj();
    const po = checklistaPoWpisie(lista, dane, t);
    return po === lista || checklistaDoSynchronizacji.zapisz({ ...po });
  }, []);

  const usun = useCallback((id: string) => magazyn.zapisz(usunWpis(magazyn.odczytajAktualne(), id, teraz())), []);

  const zastap = useCallback((d: Dziennik) => magazyn.zapisz(d), []);

  return { dziennik, zapisz, usun, zastap };
}
