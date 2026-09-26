import type { Gatunek } from './types';

export type ZewnetrznyLink = { label: string; href: string };

const yt = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

/**
 * Where to see and hear a species. YouTube links are searches, not specific
 * videos, so they never go stale or point at the wrong bird.
 */
export function linkiGatunku(g: Gatunek): ZewnetrznyLink[] {
  const lat = g.lat.replace(/ /g, '_');
  const wideo =
    g.aktywnosc === 'nocny'
      ? [
          { label: `YouTube: ${g.en}, głos`, href: yt(`${g.en} ${g.lat} call`) },
          { label: `YouTube: ${g.en}`, href: yt(`${g.en} ${g.lat}`) },
        ]
      : [
          { label: `YouTube: ${g.en}, rozpoznawanie`, href: yt(`${g.en} identification`) },
          { label: `YouTube: ${g.en} w locie`, href: yt(`${g.en} ${g.lat} in flight`) },
        ];
  return [
    ...wideo,
    { label: 'Głosy: xeno-canto', href: `https://xeno-canto.org/explore?query=${encodeURIComponent(g.lat)}` },
    { label: 'Zdjęcia: Wikimedia Commons', href: `https://commons.wikimedia.org/wiki/Category:${lat}` },
    { label: 'Wikipedia (EN)', href: `https://en.wikipedia.org/wiki/${lat}` },
    { label: 'Obserwacje: iNaturalist', href: `https://www.inaturalist.org/taxa/search?q=${encodeURIComponent(g.lat)}` },
  ];
}
