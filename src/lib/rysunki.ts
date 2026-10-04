/**
 * Atlas species that the code itself names for its drawings. content.ts
 * checks at build that each is in the atlas with a silhouette, so renaming a
 * species fails the build instead of quietly emptying a scene. The birds of
 * "Moje niebo" are named in its own files (the constellations in
 * gwiazdozbiory.ts, the patches in odznaki.ts) and checked the same way.
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

/**
 * The kettle on the card a shared link shows (app/opengraph-image.tsx):
 * soaring migrants circling in a thermal on the right of the card, placed by
 * hand like a still from the home sky (position and width in pixels of the
 * 1200 × 630 card, heading in degrees, the nearer birds larger and darker).
 */
export const KOCIOL_KARTY = [
  { id: 'sep-plowy', x: 790, y: 120, szer: 250, obrot: -14, krycie: 0.95 },
  { id: 'gadozer', x: 960, y: 330, szer: 170, obrot: 28, krycie: 0.9 },
  { id: 'kania-czarna', x: 760, y: 400, szer: 135, obrot: -36, krycie: 0.85 },
  { id: 'trzmielojad', x: 1040, y: 150, szer: 118, obrot: 52, krycie: 0.75 },
  { id: 'myszolow', x: 905, y: 60, szer: 84, obrot: 168, krycie: 0.6 },
  { id: 'scierwnik', x: 1060, y: 470, szer: 96, obrot: -62, krycie: 0.7 },
  { id: 'orzelek-wlochaty', x: 700, y: 270, szer: 70, obrot: 120, krycie: 0.55 },
];

/** Every species named above, for the build-time check. */
export const GATUNKI_RYSUNKOW = [
  ZNAK,
  ...Object.values(PRZEWODNICY_SCIEZEK),
  ...KOCIOL.map((p) => p.id),
  ...SOWY_NOCY.map((p) => p.id),
  ...KOCIOL_KARTY.map((p) => p.id),
];
