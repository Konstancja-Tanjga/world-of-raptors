/**
 * The rules of B9's colour-ring exercise, kept pure so they can be tested.
 * A combination is read as the Wader Study Group asks: the bird's left leg
 * first, each leg above the "knee" (really the ankle: the tibia, goleń) and
 * below it (the tarsus, skok), each section top to bottom, one letter per
 * colour. Confusing the bird's left with the observer's is the commonest
 * error, so the exercise shows birds facing either way and says when an
 * answer is the right combination with the legs swapped.
 */

/** The letters of the WSG colour code (black is N, for noir, so it is not read as blue) and the metal ring, m. */
export const KOLORY_OBRACZEK = {
  W: 'biała',
  N: 'czarna',
  R: 'czerwona',
  O: 'pomarańczowa',
  Y: 'żółta',
  G: 'zielona',
  L: 'limonkowa',
  B: 'niebieska',
  m: 'metalowa',
} as const;

export type KodObraczki = keyof typeof KOLORY_OBRACZEK;

/** The four sections a ring can sit on, in the order a combination is read. */
export const POLA_NOG = ['lewaGolen', 'lewaSkok', 'prawaGolen', 'prawaSkok'] as const;
export type PoleNogi = (typeof POLA_NOG)[number];

/** The rings on each section, top to bottom. */
export type Kombinacja = Record<PoleNogi, KodObraczki[]>;

const KOLOROWE = (Object.keys(KOLORY_OBRACZEK) as KodObraczki[]).filter((k) => k !== 'm');
const NAJWIECEJ_NA_POLU = 2;

/** The combination as written: left leg, then right; each leg "above/below" the knee, a dash for a bare section. */
export function zapisKombinacji(k: Kombinacja): string {
  const pole = (p: PoleNogi) => k[p].join('') || '–';
  return `${pole('lewaGolen')}/${pole('lewaSkok')} ${pole('prawaGolen')}/${pole('prawaSkok')}`;
}

/**
 * What the reader typed in one section, as ring codes: case-insensitive
 * letters, spaces and commas ignored, except that m is the metal ring and
 * every other letter a colour. Null when a letter is not in the code.
 */
export function czytajPole(tekst: string): KodObraczki[] | null {
  const kody: KodObraczki[] = [];
  for (const znak of tekst.replace(/[\s,.;/\-–—]/g, '')) {
    const kod = (znak.toLowerCase() === 'm' ? 'm' : znak.toUpperCase()) as KodObraczki;
    if (!(kod in KOLORY_OBRACZEK)) return null;
    kody.push(kod);
  }
  return kody;
}

/** The same rings with the legs swapped: what a reader writes who took the bird's left for their own. */
export function zLustra(k: Kombinacja): Kombinacja {
  return { lewaGolen: k.prawaGolen, lewaSkok: k.prawaSkok, prawaGolen: k.lewaGolen, prawaSkok: k.lewaSkok };
}

const takieSame = (a: Kombinacja, b: Kombinacja) => POLA_NOG.every((p) => a[p].join() === b[p].join());

export type OcenaObraczek = {
  dobrze: boolean;
  /** The right rings on the wrong legs (never set for a combination that reads the same both ways). */
  lustro: boolean;
  /** The sections read wrong. */
  bledne: PoleNogi[];
};

export function ocenKombinacje(odpowiedz: Kombinacja, wzor: Kombinacja): OcenaObraczek {
  const bledne = POLA_NOG.filter((p) => odpowiedz[p].join() !== wzor[p].join());
  const lustro = bledne.length > 0 && !takieSame(wzor, zLustra(wzor)) && takieSame(odpowiedz, zLustra(wzor));
  return { dobrze: bledne.length === 0, lustro, bledne };
}

/**
 * A combination like a real project's: a metal ring and three or four
 * colours, at most two to a section, never two of one colour touching (they
 * would read as one long ring), and never the same on both legs (it could
 * not tell left from right).
 */
export function losujKombinacje(los: () => number = Math.random): Kombinacja {
  const losuj = <T>(lista: readonly T[]) => lista[Math.floor(los() * lista.length)];
  for (let proba = 0; proba < 1000; proba++) {
    const k: Kombinacja = { lewaGolen: [], lewaSkok: [], prawaGolen: [], prawaSkok: [] };
    k[losuj(POLA_NOG)].push('m');
    const kolorow = 3 + Math.floor(los() * 2);
    let ulozone = 0;
    for (let proba = 0; ulozone < kolorow && proba < 50; proba++) {
      const pole = losuj(POLA_NOG);
      const kolor = losuj(KOLOROWE);
      if (k[pole].length >= NAJWIECEJ_NA_POLU || k[pole].at(-1) === kolor) continue;
      k[pole].push(kolor);
      ulozone++;
    }
    if (ulozone === kolorow && !takieSame(k, zLustra(k))) return k;
  }
  // Only a broken generator gets here (Math.random never does); a hang would be worse than an error.
  throw new Error('losujKombinacje: nie udało się ułożyć kombinacji w 1000 próbach');
}

/** Which of the bird's legs the observer sees on their left: a bird facing you shows its right leg there. */
export type Widok = 'przodem' | 'tylem';
export const nogaPoLewej = (widok: Widok): 'lewa' | 'prawa' => (widok === 'przodem' ? 'prawa' : 'lewa');
