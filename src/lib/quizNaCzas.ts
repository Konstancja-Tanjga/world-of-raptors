/**
 * The rules of B9's timed photo quiz (after Cornell's SnapID), kept pure so
 * they can be tested: a round of photos of waders, each with four names to
 * pick from (the right one, its look-alikes first, then others), points for
 * a right answer plus a bonus for speed. Species answered wrong come back
 * more often in the next round, so the hard pairs get practised.
 */

export type GatunekQuizu = { id: string; pl: string; mylona_z: readonly string[]; zdjecia: number };

export type PytanieQuizu = {
  id: string;
  /** Which of the species' photos to show (an index into its photos). */
  zdjecie: number;
  /** The four ids offered, in a random order. */
  opcje: string[];
};

export const PYTAN_W_RUNDZIE = 10;
export const OPCJI = 4;
/** Seconds to answer, when the clock is on. */
export const SEKUNDY_NA_ODPOWIEDZ = 10;
const ZA_DOBRA = 100;
const NAJWIEKSZA_PREMIA = 50;

function przetasuj<T>(lista: T[], los: () => number): T[] {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(los() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

/** The right id, then its look-alikes, then others at random, `OPCJI` in all, shuffled. */
export function opcjePytania(id: string, pula: readonly GatunekQuizu[], los: () => number): string[] {
  const g = pula.find((x) => x.id === id);
  const wPuli = new Set(pula.map((x) => x.id));
  const podobne = przetasuj((g?.mylona_z ?? []).filter((m) => wPuli.has(m) && m !== id), los);
  const inne = przetasuj(
    pula.map((x) => x.id).filter((x) => x !== id && !podobne.includes(x)),
    los,
  );
  return przetasuj([id, ...podobne, ...inne].slice(0, OPCJI), los);
}

/**
 * A round of `ile` questions (fewer if the pool is smaller), no species
 * twice. Each species is drawn with weight 1, plus 2 for every time it was
 * answered wrong before (`bledy`), so a missed bird is likely to return.
 */
export function rundaQuizu(
  pula: readonly GatunekQuizu[],
  los: () => number,
  bledy: Readonly<Record<string, number>> = {},
  ile = PYTAN_W_RUNDZIE,
): PytanieQuizu[] {
  const zostaly = pula.filter((g) => g.zdjecia > 0);
  const wybrane: GatunekQuizu[] = [];
  while (wybrane.length < ile && zostaly.length) {
    const wagi = zostaly.map((g) => 1 + 2 * (bledy[g.id] ?? 0));
    let r = los() * wagi.reduce((a, b) => a + b, 0);
    let i = 0;
    while (i < wagi.length - 1 && r >= wagi[i]) r -= wagi[i++];
    wybrane.push(...zostaly.splice(i, 1));
  }
  return wybrane.map((g) => ({ id: g.id, zdjecie: Math.floor(los() * g.zdjecia), opcje: opcjePytania(g.id, pula, los) }));
}

/** Points for one answer: none when wrong; a right one earns 100, plus up to 50 for the seconds left on the clock (none without one). */
export function punktyZaOdpowiedz(dobrze: boolean, zostaloSekund: number | null): number {
  if (!dobrze) return 0;
  if (zostaloSekund === null) return ZA_DOBRA;
  const czesc = Math.max(0, Math.min(1, zostaloSekund / SEKUNDY_NA_ODPOWIEDZ));
  return ZA_DOBRA + Math.round(NAJWIEKSZA_PREMIA * czesc);
}
