/**
 * The rules of B7's two exercises, kept pure so they can be tested: the bird
 * yardstick (put birds in order of size) and the silhouette guess (group,
 * then species).
 */

/** The list in a random order that is never the one given (when it can differ), so the answer is not already in place. */
export function wymieszaj<T>(lista: readonly T[], los: () => number = Math.random): T[] {
  const wynik = [...lista];
  if (wynik.length < 2) return wynik;
  do {
    for (let i = wynik.length - 1; i > 0; i--) {
      const j = Math.floor(los() * (i + 1));
      [wynik[i], wynik[j]] = [wynik[j], wynik[i]];
    }
  } while (wynik.every((x, i) => x === lista[i]));
  return wynik;
}

/** The list with the item at `i` moved one place up (-1) or down (+1); unchanged at either end. */
export function przesun<T>(lista: readonly T[], i: number, o: -1 | 1): T[] {
  const j = i + o;
  if (i < 0 || i >= lista.length || j < 0 || j >= lista.length) return [...lista];
  const wynik = [...lista];
  [wynik[i], wynik[j]] = [wynik[j], wynik[i]];
  return wynik;
}

/** The middle of a range in cm, the size a bird is ordered by. */
export const srodek = ([od, doCm]: readonly [number, number]) => (od + doCm) / 2;

/**
 * For each place in `kolejnosc` (smallest first), whether the bird there
 * belongs there. Birds of the same size may swap places.
 */
export function ocenKolejnosc(kolejnosc: readonly string[], wielkosc: Readonly<Record<string, number>>): boolean[] {
  const wzor = [...kolejnosc].sort((a, b) => wielkosc[a] - wielkosc[b]);
  return kolejnosc.map((id, i) => wielkosc[id] === wielkosc[wzor[i]]);
}

/**
 * The species offered for a silhouette: the right one, its look-alikes and
 * then others of its group, `ile` in all, in alphabetical order so the place
 * of the right answer gives nothing away.
 */
export function opcjeGatunku(
  id: string,
  wszystkie: readonly { id: string; pl: string; grupa: string; mylona_z: readonly string[] }[],
  ile = 4,
): string[] {
  const g = wszystkie.find((x) => x.id === id);
  if (!g) return [];
  const kandydaci = [
    ...g.mylona_z,
    ...wszystkie.filter((x) => x.grupa === g.grupa && x.id !== id).map((x) => x.id),
    ...wszystkie.filter((x) => x.grupa !== g.grupa && x.id !== id).map((x) => x.id),
  ];
  const wybrane = [id, ...new Set(kandydaci)].slice(0, ile);
  const nazwa = new Map(wszystkie.map((x) => [x.id, x.pl]));
  return wybrane.sort((a, b) => (nazwa.get(a) ?? a).localeCompare(nazwa.get(b) ?? b, 'pl'));
}
