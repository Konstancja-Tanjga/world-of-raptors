import type { Zdjecie } from './types';

/** The thumbnail widths Wikimedia Commons serves (other widths are refused). */
const STOPNIE = [960, 1280, 1920, 3840];

/**
 * `srcset` for a Commons photo: the stored 960 px thumbnail plus the larger
 * steps the original is big enough for, so a full-width hero is sharp on a
 * retina screen and a phone still downloads the small file. Own photos and
 * full-size originals have no thumbnail URL to vary and get no `srcset`.
 */
export function srcSetCommons(z: Zdjecie): string | undefined {
  const m = z.src.match(/^(.*\/thumb\/.+\/)(\d+)px-([^/?]+)(\?.*)?$/);
  if (!m || !z.oryginal) return undefined;
  const [, poczatek, , plik] = m;
  const szerokosci = STOPNIE.filter((w) => w <= z.oryginal![0]);
  if (szerokosci.length < 2) return undefined;
  return szerokosci.map((w) => `${poczatek}${w}px-${plik} ${w}w`).join(', ');
}

/** `object-position` for a crop of this photo: its focal point, or a default that suits perched birds. */
export function polozenie(z: Pick<Zdjecie, 'fokus'>): string {
  return z.fokus ? `${z.fokus[0]}% ${z.fokus[1]}%` : '50% 25%';
}
