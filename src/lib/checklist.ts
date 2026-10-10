'use client';

import { useCallback } from 'react';
import { dzisiaj, utworzMagazyn } from './magazyn';
import {
  checklistaZDowolnej,
  isChecklista,
  przelaczObserwacje,
  zmienObserwacje,
  type Checklista,
  type ZmianaObserwacji,
} from './obserwacje';

export { dzisiaj };
export { jestWidziany, widziane, type Checklista, type Obserwacja } from './obserwacje';

const teraz = () => new Date().toISOString();

const magazyn = utworzMagazyn<Checklista>('wor:checklista:v2', isChecklista, {
  poprzednia: { klucz: 'wor:checklista:v1', migruj: checklistaZDowolnej },
});

/**
 * The checklist store (schema and rules: obserwacje.ts). `lista` is `null`
 * until the browser copy has been read, so the server render and first paint
 * show a loading state rather than an empty list that then fills in. Every
 * change returns whether it was actually saved.
 */
export function useChecklista() {
  const lista = magazyn.useMagazyn();

  const przelacz = useCallback(
    (id: string) => magazyn.zapisz(przelaczObserwacje(magazyn.odczytaj(), id, dzisiaj(), teraz())),
    [],
  );

  const aktualizuj = useCallback(
    (id: string, zmiana: ZmianaObserwacji) => magazyn.zapisz(zmienObserwacje(magazyn.odczytaj(), id, zmiana, teraz())),
    [],
  );

  const zastap = useCallback((next: Checklista) => magazyn.zapisz(next), []);

  return { lista, przelacz, aktualizuj, zastap };
}
