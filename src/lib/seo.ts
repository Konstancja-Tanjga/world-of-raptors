import { odkoduj } from './tagi';

/*
 * What search engines read: the production address, page descriptions made from
 * the course's own Markdown, and structured data. No browser APIs: the build runs it.
 */

/** The production origin: `metadataBase`, the sitemap and robots.txt, and structured data all use it. */
export const ADRES = 'https://world-of-raptors.vercel.app';

/** My handle on X, for the link previews X draws. */
export const X = '@KTanjga';

/**
 * Open Graph for every page. A page that sets its own `openGraph` replaces this
 * whole object (Next merges metadata shallowly), so it spreads it first.
 */
export const OPEN_GRAPH = { type: 'website', locale: 'pl_PL', siteName: 'World of Raptors' } as const;

/**
 * The author as structured data. `sameAs` names her other profiles, so a search
 * for her name can connect them to this course.
 */
export const AUTORKA = {
  '@type': 'Person',
  name: 'Konstancja Tanjga-Nawrot',
  url: `${ADRES}/o-projekcie`,
  sameAs: [
    'https://konstancja-tanjga.github.io/portfolio-site/',
    'https://github.com/Konstancja-Tanjga',
    'https://www.linkedin.com/in/konstancja-tanjga/',
    'https://x.com/KTanjga',
  ],
};

/** Roughly what Google shows under a result before it cuts the snippet. */
const DLUGOSC_OPISU = 160;

/** Inline Markdown as one line of plain text: emphasis, links, code and tags dropped, entities decoded. */
export function zwyklyTekst(md: string) {
  return odkoduj(
    md
      .replace(/<[^>]+>/g, '')
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/(\*{1,3}|_{1,3}|`)(\S(?:.*?\S)?)\1/g, '$2'),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

/** A page description from Markdown, cut at a word with "…" when it runs past what a result shows. */
export function opis(md: string) {
  const tekst = zwyklyTekst(md);
  if (tekst.length <= DLUGOSC_OPISU) return tekst;
  const ciecie = tekst.lastIndexOf(' ', DLUGOSC_OPISU - 1);
  return `${tekst.slice(0, ciecie > 0 ? ciecie : DLUGOSC_OPISU - 1).replace(/[\s.,;:–—-]+$/, '')}…`;
}

/** Structured data for a `<script type="application/ld+json">`, with `<` escaped so the text cannot close the tag. */
export function jsonLd(dane: object) {
  return JSON.stringify({ '@context': 'https://schema.org', ...dane }).replace(/</g, '\\u003c');
}
