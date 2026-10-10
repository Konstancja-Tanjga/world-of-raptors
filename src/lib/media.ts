import type { Aktywnosc } from './types';

export type ZewnetrznyLink = { label: string; href: string };

const yt = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

/**
 * Where to see and hear a species. YouTube links are searches, not specific
 * videos, so they never go stale or point at the wrong bird. Birds of marshes
 * (`aktywnosc` null) get identification and voice, as they are told apart on
 * the ground and by ear rather than overhead.
 */
export function linkiGatunku(g: { lat: string; en: string; aktywnosc: Aktywnosc | null }): ZewnetrznyLink[] {
  const lat = g.lat.replace(/ /g, '_');
  const wideo =
    g.aktywnosc === null
      ? [
          { label: 'Filmy: jak rozpoznać (YouTube)', href: yt(`${g.en} identification`) },
          { label: 'Filmy: głos (YouTube)', href: yt(`${g.en} ${g.lat} call`) },
        ]
      : g.aktywnosc === 'nocny'
      ? [
          { label: 'Filmy: głos (YouTube)', href: yt(`${g.en} ${g.lat} call`) },
          { label: 'Filmy (YouTube)', href: yt(`${g.en} ${g.lat}`) },
        ]
      : [
          { label: 'Filmy: jak rozpoznać (YouTube)', href: yt(`${g.en} identification`) },
          { label: 'Filmy: w locie (YouTube)', href: yt(`${g.en} ${g.lat} in flight`) },
        ];
  return [
    ...wideo,
    { label: 'Głosy (xeno-canto)', href: `https://xeno-canto.org/explore?query=${encodeURIComponent(g.lat)}` },
    { label: 'Więcej zdjęć (Wikimedia Commons)', href: `https://commons.wikimedia.org/wiki/Category:${lat}` },
    { label: 'Artykuł (Wikipedia, po angielsku)', href: `https://en.wikipedia.org/wiki/${lat}` },
    { label: 'Obserwacje na mapie (iNaturalist)', href: `https://www.inaturalist.org/taxa/search?q=${encodeURIComponent(g.lat)}` },
  ];
}
