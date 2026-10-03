import type { Ksztalt, Poza } from './sylwetka';

/**
 * Silhouette shapes of the atlas species, from the eight groups of B1 lesson 1
 * (plus owls) and each species' `sylwetka` cues in content/gatunki.json. They
 * are approximations, not measurements: proportions follow field guides, and
 * each shape was checked by eye against a photograph of the species in
 * flight, closely enough to show the differences the lessons teach (tail
 * fork, number of fingers, head projection, wing width) and no more.
 */

const MYSZOLOWY: Ksztalt = {
  glowa: 14, glowaSzer: 10, glowaPlaska: 0.15, tulow: 14, tulowDl: 38,
  ogonDl: 32, ogonNasada: 6.5, ogonKoniec: [10, 16], ogonSrodek: [1, 4], ogonOstry: 0, ogonRogi: 4, ogonBoki: 1.2,
  ramie: 40, nadgarstek: 0.48, nadgarstekY: -3, dlon: 38, koniecY: 6, koniecSzer: 25, koniecOkragly: 0.85,
  palce: 5, palceDl: 11, wybrzuszenie: 4.5, zwezenie: 1,
};

const KANIE: Ksztalt = {
  glowa: 15, glowaSzer: 8, glowaPlaska: 0.1, tulow: 12, tulowDl: 35,
  ogonDl: 44, ogonNasada: 5.5, ogonKoniec: [7.5, 14], ogonSrodek: [-12, -9], ogonOstry: 0.9, ogonRogi: 0.6, ogonBoki: 0.5,
  ramie: 32, nadgarstek: 0.45, nadgarstekY: -4.5, dlon: 29, koniecY: 14, koniecSzer: 20, koniecOkragly: 0.6,
  palce: 5, palceDl: 13, wybrzuszenie: 2.5, zwezenie: 0.5,
};

const BLOTNIAKI: Ksztalt = {
  glowa: 13, glowaSzer: 8, glowaPlaska: 0.2, tulow: 11, tulowDl: 34,
  ogonDl: 44, ogonNasada: 5, ogonKoniec: [7, 11.5], ogonSrodek: [2, 4], ogonOstry: 0, ogonRogi: 3, ogonBoki: 0.5,
  ramie: 31, nadgarstek: 0.47, nadgarstekY: -2, dlon: 29, koniecY: 9, koniecSzer: 18, koniecOkragly: 0.7,
  palce: 5, palceDl: 8, wybrzuszenie: 1.5, zwezenie: 0.5,
};

const KROGULCE: Ksztalt = {
  glowa: 12, glowaSzer: 8.5, glowaPlaska: 0.2, tulow: 13, tulowDl: 39,
  ogonDl: 50, ogonNasada: 6.5, ogonKoniec: [9, 15], ogonSrodek: [-1, 0], ogonOstry: 0.3, ogonRogi: 1.5, ogonBoki: 0.5,
  ramie: 47, nadgarstek: 0.5, nadgarstekY: -2, dlon: 45, koniecY: 5, koniecSzer: 32, koniecOkragly: 1,
  palce: 6, palceDl: 7, wybrzuszenie: 3, zwezenie: 0.5,
};

const SOKOLY: Ksztalt = {
  glowa: 11, glowaSzer: 9, glowaPlaska: 0.2, tulow: 13, tulowDl: 33,
  ogonDl: 42, ogonNasada: 5.5, ogonKoniec: [7.5, 12], ogonSrodek: [2, 4], ogonOstry: 0, ogonRogi: 3, ogonBoki: 0.4,
  ramie: 34, nadgarstek: 0.42, nadgarstekY: -3, dlon: 25, koniecY: 20, koniecSzer: 3, koniecOkragly: 0.5,
  palce: 0, palceDl: 0, wybrzuszenie: 1, zwezenie: 0,
};

const ORLY: Ksztalt = {
  glowa: 17, glowaSzer: 9.5, glowaPlaska: 0.15, tulow: 15, tulowDl: 39,
  ogonDl: 34, ogonNasada: 7.5, ogonKoniec: [11, 15], ogonSrodek: [0, 2], ogonOstry: 0.2, ogonRogi: 2.5, ogonBoki: 0.8,
  ramie: 39, nadgarstek: 0.48, nadgarstekY: -2, dlon: 41, koniecY: 6, koniecSzer: 33, koniecOkragly: 0.7,
  palce: 7, palceDl: 19, wybrzuszenie: 3, zwezenie: 1.5,
};

const SEPY: Ksztalt = {
  glowa: 9, glowaSzer: 11, glowaPlaska: 0.3, tulow: 17, tulowDl: 48,
  ogonDl: 18, ogonNasada: 8.5, ogonKoniec: [10.5, 13], ogonSrodek: [1, 2.5], ogonOstry: 0.2, ogonRogi: 4, ogonBoki: 0.5,
  ramie: 47, nadgarstek: 0.48, nadgarstekY: -1, dlon: 47, koniecY: 3, koniecSzer: 40, koniecOkragly: 0.7,
  palce: 7, palceDl: 25, wybrzuszenie: 3, zwezenie: 0.5,
};

const SOWY: Ksztalt = {
  glowa: 16, glowaSzer: 21, glowaPlaska: 0.1, tulow: 19, tulowDl: 36,
  ogonDl: 22, ogonNasada: 8, ogonKoniec: [10, 13.5], ogonSrodek: [2, 3.5], ogonOstry: 0, ogonRogi: 4, ogonBoki: 0.8,
  ramie: 42, nadgarstek: 0.47, nadgarstekY: -2, dlon: 40, koniecY: 6, koniecSzer: 28, koniecOkragly: 1,
  palce: 5, palceDl: 6, wybrzuszenie: 2, zwezenie: 0.5,
};

export const SYLWETKI: Record<string, Ksztalt> = {
  // Kanie
  'kania-ruda': { ...KANIE, ramie: 31, dlon: 28, nadgarstekY: -5.5, koniecY: 15.5, ogonDl: 50, ogonSrodek: [-16, -11] },
  'kania-czarna': {
    ...KANIE, ramie: 33, dlon: 31, nadgarstekY: -3.5, koniecY: 12, palce: 5.5, ogonDl: 40,
    ogonKoniec: [7.5, 14], ogonSrodek: [-5, -0.5], ogonOstry: 0.4, ogonRogi: 1.2,
  },
  kaniuk: {
    ...SOKOLY, glowa: 12, glowaSzer: 12, glowaPlaska: 0.35, tulow: 14, tulowDl: 34, ramie: 38, dlon: 27,
    nadgarstek: 0.44, koniecY: 15, koniecSzer: 5, ogonDl: 26, ogonNasada: 6, ogonKoniec: [7, 10.5],
    ogonSrodek: [-2, 0], ogonOstry: 0.5, ogonRogi: 1.5,
  },

  // Myszołowy
  myszolow: { ...MYSZOLOWY },
  kurhannik: { ...MYSZOLOWY, glowa: 13, tulowDl: 35, ramie: 36, dlon: 34, koniecY: 8, ogonDl: 32 },
  'myszolow-wlochaty': { ...MYSZOLOWY, ramie: 35, dlon: 33, koniecY: 9, ogonDl: 36, ogonKoniec: [9.5, 15] },
  trzmielojad: {
    ...MYSZOLOWY, glowa: 19, glowaSzer: 7.5, glowaPlaska: 0.1, ramie: 34, dlon: 37, zwezenie: 4, wybrzuszenie: 6.5,
    ogonDl: 39, ogonKoniec: [10, 15], ogonSrodek: [2, 4.5], ogonRogi: 6, ogonBoki: 2.5, palce: 5.5, palceDl: 7,
    koniecSzer: 23, nadgarstekY: -2,
  },

  // Orły
  'orzel-przedni': {
    ...ORLY, glowa: 17, ramie: 35, dlon: 42, zwezenie: 5.5, wybrzuszenie: 6.5, koniecSzer: 34, palceDl: 20,
    ogonDl: 39, ogonKoniec: [11, 17], ogonSrodek: [2, 5], ogonOstry: 0, ogonRogi: 5,
  },
  bielik: {
    ...ORLY, glowa: 27, glowaSzer: 11, tulow: 16, ramie: 46, dlon: 46, zwezenie: 0, wybrzuszenie: 2,
    koniecY: 4, koniecSzer: 38, palceDl: 21, ogonDl: 27, ogonKoniec: [10, 13], ogonSrodek: [9, 8],
    ogonOstry: 0.85, ogonRogi: 2,
  },
  'orzel-iberyjski': {
    ...ORLY, glowa: 19, ramie: 41, dlon: 41, wybrzuszenie: 1.5, zwezenie: 0.5, ogonDl: 35,
    ogonSrodek: [0, 1], ogonRogi: 2,
  },
  'orzel-poludniowy': {
    ...ORLY, glowa: 16, glowaSzer: 9, ramie: 35, dlon: 35, koniecSzer: 27, palce: 6, palceDl: 15,
    ogonDl: 43, ogonKoniec: [9.5, 13.5], ogonSrodek: [0, 1.5], ogonRogi: 2.5,
  },
  'orlik-krzykliwy': {
    ...ORLY, glowa: 15, glowaSzer: 8, ramie: 38, dlon: 38, wybrzuszenie: 2, zwezenie: 0.5, koniecSzer: 30,
    palceDl: 17, ogonDl: 27, ogonKoniec: [9.5, 12.5], ogonSrodek: [1, 2.5],
  },
  'orlik-grubodzioby': {
    ...ORLY, glowa: 16, glowaSzer: 9, ramie: 43, dlon: 43, wybrzuszenie: 2, zwezenie: 0.5, koniecSzer: 35,
    ogonDl: 25, ogonKoniec: [10, 13], ogonSrodek: [1, 2.5],
  },
  'orzelek-wlochaty': {
    ...ORLY, glowa: 15, glowaSzer: 8.5, tulow: 13, ramie: 34, dlon: 34, wybrzuszenie: 1, zwezenie: 0.5,
    koniecSzer: 26, palce: 6, palceDl: 14, ogonDl: 39, ogonNasada: 6.5, ogonKoniec: [9, 12.5], ogonSrodek: [0, 0],
    ogonOstry: 1, ogonRogi: 0.5,
  },
  gadozer: {
    ...ORLY, glowa: 16, glowaSzer: 15, glowaPlaska: 0.2, ramie: 40, dlon: 43, zwezenie: 2, koniecSzer: 36,
    palce: 6.5, palceDl: 17, ogonDl: 34, ogonKoniec: [9.5, 13.5], ogonSrodek: [0, 0.5], ogonOstry: 0.5, ogonRogi: 1.5,
  },

  // Rybołów
  rybolow: {
    ...KANIE, glowa: 14, glowaSzer: 7.5, tulow: 12, tulowDl: 33, ramie: 30, dlon: 28, nadgarstek: 0.42,
    nadgarstekY: -10, koniecY: 19, koniecSzer: 16, palce: 4, palceDl: 14, wybrzuszenie: 1.5,
    ogonDl: 28, ogonNasada: 6, ogonKoniec: [7.5, 10.5], ogonSrodek: [0, 1], ogonOstry: 0.3, ogonRogi: 1.5,
  },

  // Sępy
  'sep-plowy': { ...SEPY },
  'sep-plamisty': { ...SEPY, ramie: 43, dlon: 43, koniecSzer: 36, wybrzuszenie: 3.5 },
  'sep-kasztanowaty': {
    ...SEPY, ramie: 51, dlon: 51, wybrzuszenie: 1, koniecSzer: 44, palceDl: 28, ogonDl: 21,
    ogonSrodek: [3, 4], ogonOstry: 0.6,
  },
  scierwnik: {
    ...SEPY, glowa: 18, glowaSzer: 6.5, tulow: 13, tulowDl: 38, ramie: 36, dlon: 36, koniecSzer: 30, palce: 6,
    palceDl: 19, ogonDl: 34, ogonNasada: 6.5, ogonKoniec: [10.5, 13.5], ogonSrodek: [10, 9], ogonOstry: 1, ogonRogi: 2,
  },
  orlosep: {
    ...SEPY, glowa: 14, glowaSzer: 8.5, tulow: 14, tulowDl: 38, ramie: 34, dlon: 31, nadgarstek: 0.45,
    nadgarstekY: -3, koniecY: 14, koniecSzer: 12, koniecOkragly: 0.3, palce: 3, palceDl: 6, wybrzuszenie: 1.5,
    ogonDl: 52, ogonNasada: 7.5, ogonKoniec: [11.5, 14.5], ogonSrodek: [11, 9], ogonOstry: 0.9, ogonRogi: 2,
  },

  // Błotniaki
  'blotniak-stawowy': { ...BLOTNIAKI, ramie: 33, dlon: 31, koniecSzer: 20, palce: 5.5, palceDl: 9 },
  'blotniak-zbozowy': { ...BLOTNIAKI, ramie: 30, dlon: 29, koniecSzer: 19, koniecOkragly: 0.9 },
  'blotniak-lakowy': {
    ...BLOTNIAKI, ramie: 27, dlon: 24, koniecY: 13, koniecSzer: 12, koniecOkragly: 0.4, palce: 4, palceDl: 6,
    ogonDl: 45,
  },

  // Krogulce
  krogulec: { ...KROGULCE },
  jastrzab: {
    ...KROGULCE, glowa: 16, glowaSzer: 9.5, tulow: 15, ramie: 43, dlon: 40, wybrzuszenie: 5.5, koniecY: 7,
    koniecSzer: 28, palceDl: 8, ogonDl: 44, ogonKoniec: [10.5, 16], ogonSrodek: [2, 4], ogonOstry: 0, ogonRogi: 5,
  },

  // Sokoły
  pustulka: {
    ...SOKOLY, ramie: 31, dlon: 25, koniecY: 21, koniecSzer: 5, koniecOkragly: 0.7, ogonDl: 48,
    ogonKoniec: [7.5, 12.5], ogonSrodek: [3, 6], ogonRogi: 4,
  },
  pustuleczka: {
    ...SOKOLY, ramie: 30, dlon: 23, koniecY: 21, koniecSzer: 3.5, ogonDl: 47, ogonKoniec: [7, 11.5], ogonSrodek: [6, 7],
    ogonOstry: 0.8, ogonRogi: 2,
  },
  kobuz: {
    ...SOKOLY, ramie: 31, dlon: 20, nadgarstek: 0.4, nadgarstekY: -5, koniecY: 27, koniecSzer: 1, ogonDl: 35,
    ogonKoniec: [6.5, 9.5], ogonSrodek: [1, 2],
  },
  'sokol-wedrowny': {
    ...SOKOLY, glowa: 12, glowaSzer: 10.5, tulow: 16, ramie: 40, dlon: 28, koniecY: 18, koniecSzer: 3, ogonDl: 34,
    ogonNasada: 6.5, ogonKoniec: [8, 12], ogonSrodek: [1, 3],
  },
  'sokol-skalny': {
    ...SOKOLY, ramie: 31, dlon: 23, nadgarstekY: -4, koniecY: 25, koniecSzer: 2, ogonDl: 47, ogonKoniec: [7, 11],
  },
  drzemlik: { ...SOKOLY, ramie: 36, dlon: 28, nadgarstek: 0.44, koniecY: 15, koniecSzer: 5, ogonDl: 40 },

  // Sowy
  puchacz: { ...SOWY, glowa: 17, glowaSzer: 20, tulow: 20, ramie: 42, dlon: 40, ogonDl: 23, palceDl: 7 },
  puszczyk: { ...SOWY, glowa: 16, glowaSzer: 22, ramie: 45, dlon: 42, palceDl: 6, ogonDl: 21 },
  'puszczyk-uralski': {
    ...SOWY, glowa: 16, glowaSzer: 19, ramie: 42, dlon: 40, ogonDl: 36, ogonKoniec: [10.5, 14.5],
    ogonSrodek: [4, 6], ogonOstry: 0.4,
  },
  plomykowka: {
    ...SOWY, glowa: 15, glowaSzer: 17, ramie: 36, dlon: 34, koniecY: 8, koniecSzer: 23, palce: 4, palceDl: 5, ogonDl: 20,
  },
  uszatka: { ...SOWY, glowa: 14, glowaSzer: 16, ramie: 35, dlon: 33, koniecY: 8, koniecSzer: 25, palceDl: 6, ogonDl: 27 },
  'uszatka-blotna': {
    ...SOWY, glowa: 14, glowaSzer: 16, ramie: 33, dlon: 31, nadgarstekY: -3, koniecY: 10, koniecSzer: 24, ogonDl: 26,
  },
  pojdzka: {
    ...SOWY, glowa: 15, glowaSzer: 21, glowaPlaska: 0.45, ramie: 46, dlon: 44, koniecSzer: 33, palceDl: 6,
    tulowDl: 35, ogonDl: 18,
  },
  syczek: { ...SOWY, glowa: 14, glowaSzer: 17, ramie: 38, dlon: 34, koniecY: 8, koniecSzer: 21, palce: 3, palceDl: 3, ogonDl: 21 },
  wlochatka: { ...SOWY, glowa: 16, glowaSzer: 22, glowaPlaska: 0.5, ramie: 46, dlon: 44, koniecSzer: 33, palceDl: 5, ogonDl: 25 },
  soweczka: {
    ...SOWY, glowa: 14, glowaSzer: 19, ramie: 48, dlon: 44, koniecSzer: 33, palceDl: 5, ogonDl: 33, ogonKoniec: [8.5, 11.5],
  },
};

/**
 * Resting poses that differ from POZA_SZYBOWANIE, the one every other species
 * is drawn in: the kites and the osprey hold the hand angled back at the
 * wrist (B1: kites "złamane" w nadgarstku, the osprey's "M").
 */
export const POZY: Partial<Record<string, Poza>> = {
  'kania-ruda': { wznios: 0, zgiecie: 0.12, ogon: 0.6 },
  'kania-czarna': { wznios: 0, zgiecie: 0.1, ogon: 0.5 },
  rybolow: { wznios: 0, zgiecie: 0.15, ogon: 0.5 },
};

/**
 * How each diurnal species flies, after its `lot` cue in gatunki.json (B1
 * lesson 2, "Sposób lotu"): the silhouette flashcards and the species page's
 * "Jak lata" animate the silhouette this way, because the way a bird flies is
 * the second thing to look at after its shape. Every diurnal species has an
 * entry (content.ts checks at build).
 */
export type StylLotu = 'szybuje' | 'kreci-ogonem' | 'zawisa' | 'macha-i-szybuje' | 'szybki' | 'kolysze';

export const STYL_LOTU: Record<string, StylLotu> = {
  'kania-czarna': 'kreci-ogonem',
  'kania-ruda': 'kreci-ogonem',
  kaniuk: 'zawisa',
  trzmielojad: 'szybuje',
  myszolow: 'szybuje',
  kurhannik: 'zawisa',
  'myszolow-wlochaty': 'zawisa',
  'orzelek-wlochaty': 'szybuje',
  scierwnik: 'szybuje',
  gadozer: 'zawisa',
  rybolow: 'szybuje',
  'sep-plowy': 'szybuje',
  'sep-plamisty': 'szybuje',
  'sep-kasztanowaty': 'szybuje',
  'blotniak-lakowy': 'kolysze',
  'blotniak-zbozowy': 'kolysze',
  'blotniak-stawowy': 'kolysze',
  'orzel-iberyjski': 'szybuje',
  'orzel-poludniowy': 'szybuje',
  'orzel-przedni': 'szybuje',
  orlosep: 'szybuje',
  bielik: 'szybuje',
  'orlik-krzykliwy': 'szybuje',
  'orlik-grubodzioby': 'szybuje',
  pustulka: 'zawisa',
  pustuleczka: 'zawisa',
  kobuz: 'szybki',
  'sokol-wedrowny': 'szybki',
  'sokol-skalny': 'szybki',
  drzemlik: 'szybki',
  krogulec: 'macha-i-szybuje',
  jastrzab: 'macha-i-szybuje',
};

/**
 * One wingbeat at phase f (0–1): wings up, the downstroke, then the hand folds
 * on the way back up (the second half, while the wings rise). From below a
 * beat shows as the span shortening, by the cosine of the amplitude.
 */
function machniecie(f: number, amplituda: number, baza: Poza): Poza {
  const k = f * Math.PI * 2;
  return { wznios: amplituda * Math.cos(k), zgiecie: baza.zgiecie + Math.max(0, -Math.sin(k)) * 0.4 * amplituda, ogon: baza.ogon };
}

/**
 * The pose `t` seconds into a flight in the given style, and how far the bird
 * tilts (degrees). `baza` is the species' resting pose.
 */
export function pozaWLocie(styl: StylLotu, t: number, baza: Poza): { poza: Poza; przechyl: number } {
  switch (styl) {
    case 'zawisa':
      // The quickest beats of all, on the spot, tail fanned wide.
      return { poza: { ...machniecie((t * 4.2) % 1, 0.8, baza), ogon: 1 }, przechyl: Math.sin(t * 1.3) * 1.5 };
    case 'macha-i-szybuje': {
      // A burst of quick beats, then a glide.
      const w = t % 2.9;
      return w < 1 ? { poza: machniecie((w * 5) % 1, 0.85, baza), przechyl: 0 } : { poza: baza, przechyl: Math.sin(t * 0.9) * 2 };
    }
    case 'szybki':
      return { poza: machniecie((t * 3.5) % 1, 0.7, { ...baza, zgiecie: Math.max(baza.zgiecie, 0.18) }), przechyl: Math.sin(t * 0.8) * 2 };
    case 'kolysze':
      // A harrier's low glide, rocking from side to side; now and then a few slow beats.
      return {
        poza: t % 6 < 1.2 ? machniecie((t * 2.2) % 1, 0.75, baza) : { ...baza, wznios: 0.3 },
        przechyl: Math.sin(t * 2.6) * 7,
      };
    case 'kreci-ogonem':
      // A kite steers with its tail: it fans and closes all the time.
      return { poza: { ...baza, ogon: 0.55 + 0.42 * Math.sin(t * 2.4) }, przechyl: Math.sin(t * 0.7) * 5 };
    case 'szybuje':
      // Circling on still wings; only the tail breathes a little.
      return {
        poza: { ...baza, ogon: Math.min(1, Math.max(0, baza.ogon + 0.12 * Math.sin(t * 0.5))) },
        przechyl: Math.sin(t * 0.35) * 4,
      };
    default: {
      const nieznany: never = styl;
      throw new Error(`Nieznany styl lotu: ${String(nieznany)}`);
    }
  }
}
