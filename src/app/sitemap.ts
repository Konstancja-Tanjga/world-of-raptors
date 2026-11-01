import type { MetadataRoute } from 'next';
import { gotoweModuly, ptakiNaLiscie } from '@/lib/content';
import { ADRES } from '@/lib/seo';

/**
 * Every public page: the course, the atlas, the tools and the About page. The
 * personal pages (checklist, flashcards, Moje niebo, account) are noindex and
 * left out; so are the atlas's filters, which share the atlas's canonical address.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const sciezki = [
    '/',
    '/plan',
    '/gatunki',
    '/rozpoznaj',
    '/rozpoznaj/glos',
    '/kiedy-i-gdzie',
    '/test-startowy',
    '/o-projekcie',
    ...gotoweModuly.flatMap((m) => [`/moduly/${m.slug}`, ...m.lekcje.map((l) => `/moduly/${m.slug}/${l.slug}`)]),
    ...ptakiNaLiscie.map((p) => `/gatunki/${p.id}`),
  ];
  return sciezki.map((s) => ({ url: s === '/' ? ADRES : `${ADRES}${s}` }));
}
