/**
 * The checklist's filter by one of my places ("Moje miejsca"): which birds I
 * have seen there. No React and no browser APIs, so tests can run it.
 *
 * A bird counts as seen at a place when its checklist entry names the place
 * (the first sighting's place) or when a sighting in the field log names it
 * or was made within PROMIEN_KM of it: the log keeps every sighting, the
 * checklist only the first.
 */
import { wpisy, type Dziennik } from './dziennik';
import { kluczNazwy, ptakiWMiejscu, type MojeMiejsce } from './mojeMiejsca';
import type { Checklista } from './obserwacje';
import { odleglosc } from './punkty';

/** As far as "Tu, gdzie jestem" looks for a place of mine. */
export const PROMIEN_KM = 1;

export function ptakiMojegoMiejsca(miejsce: MojeMiejsce, lista: Checklista, dziennik: Dziennik): Set<string> {
  const ptaki = new Set(ptakiWMiejscu(lista, miejsce.nazwa));
  const k = kluczNazwy(miejsce.nazwa);
  for (const [, w] of wpisy(dziennik)) {
    if ((w.miejsce && kluczNazwy(w.miejsce) === k) || (w.punkt && odleglosc(w.punkt, miejsce) <= PROMIEN_KM)) ptaki.add(w.gatunek);
  }
  return ptaki;
}
