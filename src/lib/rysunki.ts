/**
 * Atlas species that the code itself names for its drawings. content.ts
 * checks at build that each is in the atlas with a silhouette, so renaming a
 * species fails the build instead of quietly emptying a scene.
 */

/** The course's mark, a red kite: the logo and the page that does not exist. */
export const ZNAK = 'kania-ruda';

/**
 * The bird that leads each course path in as it scrolls into view: the
 * course's red kite on biology, and on identification the common buzzard,
 * where B1 says to start (most big brown raptors over a Polish field are
 * buzzards).
 */
export const PRZEWODNICY_SCIEZEK: Record<'a' | 'b', string> = { a: 'kania-ruda', b: 'myszolow' };

/** A bird in the home sky: its wingspan in metres and how readily it flaps. */
export type PtakNieba = { id: string; rozpietosc: number; macha: number };

/** The home sky by day: a Strait-of-Gibraltar mix of soaring migrants. */
export const KOCIOL: PtakNieba[] = [
  { id: 'trzmielojad', rozpietosc: 1.42, macha: 0.35 },
  { id: 'trzmielojad', rozpietosc: 1.42, macha: 0.35 },
  { id: 'kania-czarna', rozpietosc: 1.45, macha: 0.3 },
  { id: 'orzelek-wlochaty', rozpietosc: 1.22, macha: 0.3 },
  { id: 'gadozer', rozpietosc: 1.8, macha: 0.2 },
  { id: 'sep-plowy', rozpietosc: 2.6, macha: 0.04 },
  { id: 'myszolow', rozpietosc: 1.2, macha: 0.35 },
  { id: 'scierwnik', rozpietosc: 1.62, macha: 0.15 },
];

/** The home sky at night: owls crossing the moon. */
export const SOWY_NOCY: PtakNieba[] = [
  { id: 'plomykowka', rozpietosc: 0.9, macha: 1 },
  { id: 'puszczyk', rozpietosc: 0.9, macha: 1 },
  { id: 'uszatka', rozpietosc: 0.95, macha: 1 },
];

/** Every species named above, for the build-time check. */
export const GATUNKI_RYSUNKOW = [ZNAK, ...Object.values(PRZEWODNICY_SCIEZEK), ...KOCIOL.map((p) => p.id), ...SOWY_NOCY.map((p) => p.id)];
