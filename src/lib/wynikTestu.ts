/**
 * Scoring the starting test (Moduł 0) and what it suggests: no React and no
 * browser APIs, so tests can run it. The test is the same at the start and at
 * the end of the course, so two results compare question for question.
 */
import type { PytanieTestu, RodzajPytaniaTestu } from './types';

export type WynikTestu = {
  /** Local date (YYYY-MM-DD) the test was finished. */
  data: string;
  /** The chosen option per question id. */
  odpowiedzi: Record<string, number>;
};

export type Punkty = { dobrze: number; z: number };

export type Podsumowanie = {
  razem: Punkty;
  a: Punkty;
  b: Punkty;
  czesci: Record<RodzajPytaniaTestu, Punkty>;
};

export function podsumuj(pytania: Pick<PytanieTestu, 'id' | 'rodzaj' | 'sciezka' | 'poprawna'>[], odpowiedzi: Record<string, number>): Podsumowanie {
  const zero = (): Punkty => ({ dobrze: 0, z: 0 });
  const p: Podsumowanie = { razem: zero(), a: zero(), b: zero(), czesci: { sylwetka: zero(), zdjecie: zero(), glos: zero(), wiedza: zero() } };
  for (const q of pytania) {
    const dobrze = odpowiedzi[q.id] === q.poprawna ? 1 : 0;
    for (const k of [p.razem, p[q.sciezka], p.czesci[q.rodzaj]]) {
      k.z += 1;
      k.dobrze += dobrze;
    }
  }
  return p;
}

/** At least `licznik/mianownik` right, compared without rounding (4 of 6 is two thirds exactly). */
const conajmniej = ({ dobrze, z }: Punkty, licznik: number, mianownik: number) => dobrze * mianownik >= z * licznik;

export type Polecenie = { modul: string; tekst: string };

/**
 * Where to start on each path. Path B starts with the method (B1) unless the
 * silhouettes are already known, since every regional module assumes them;
 * path A starts at A1 unless most answers were right.
 */
export function polecenia(p: Podsumowanie): { a: Polecenie; b: Polecenie } {
  const a =
    conajmniej(p.a, 3, 4)
      ? { modul: 'kim-sa-drapiezniki', tekst: 'Biologię znam już dobrze: mogę zacząć od dowolnego modułu ścieżki A, na przykład od tego, który najbardziej mnie ciekawi.' }
      : { modul: 'kim-sa-drapiezniki', tekst: 'Zacznę od A1: kim są ptaki drapieżne, skąd się wzięły i co je łączy. Kolejne moduły ścieżki A na tym budują.' };
  const gatunki = { dobrze: p.czesci.zdjecie.dobrze + p.czesci.glos.dobrze, z: p.czesci.zdjecie.z + p.czesci.glos.z };
  const b =
    !conajmniej(p.czesci.sylwetka, 4, 5)
      ? { modul: 'metoda', tekst: 'Zacznę od B1: osiem grup sylwetek i kolejność patrzenia. Moduły regionalne zakładają, że to już znam.' }
      : !conajmniej(gatunki, 2, 3)
        ? { modul: 'polska', tekst: 'Grupy sylwetek już rozpoznaję. Teraz gatunki: B2 Ptaki drapieżne Polski, a głosy sów w B5.' }
        : { modul: 'gibraltar', tekst: 'Rozpoznaję dobrze. Mogę wybrać moduł regionalny: B3 Cieśnina Gibraltarska albo B4 Południe Hiszpanii.' };
  return { a, b };
}
