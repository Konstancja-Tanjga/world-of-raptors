/**
 * The atlas's region (types.ts REGIONY) a point lies in, for "Rozpoznaj":
 * from the phone's position or a point picked on a map, counted here, so the
 * point never leaves the browser. The shapes are rough on purpose: the
 * question is which birds to expect, and a few kilometres over a border
 * change nothing.
 *
 * - gibraltar: within 40 km of Tarifa, Algeciras and Gibraltar included
 *   (checked first: the Strait is inside southern Spain's box);
 * - poludnie-hiszpanii: Andalusia and Murcia, roughly 35.9–38.8° N,
 *   7.6° W–0.6° W;
 * - polska: Poland's bounding box, 49.0–54.9° N, 14.1–24.2° E.
 */
import { odleglosc, type Wspolrzedne } from './punkty';
import type { Region } from './types';

const TARIFA: Wspolrzedne = { szer: 36.0129, dl: -5.6058 };
export const CIESNINA_KM = 40;

const w = (p: Wspolrzedne, [szer0, szer1]: [number, number], [dl0, dl1]: [number, number]) =>
  p.szer >= szer0 && p.szer <= szer1 && p.dl >= dl0 && p.dl <= dl1;

/** The region of a point, or null when it lies outside all three. */
export function regionPunktu(p: Wspolrzedne): Region | null {
  if (odleglosc(p, TARIFA) <= CIESNINA_KM) return 'gibraltar';
  if (w(p, [35.9, 38.8], [-7.6, -0.6])) return 'poludnie-hiszpanii';
  if (w(p, [49.0, 54.9], [14.1, 24.2])) return 'polska';
  return null;
}
