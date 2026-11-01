import type { Metadata, Viewport } from 'next';
import { Newsreader, Poltawski_Nowy } from 'next/font/google';
import '@bighat/ui/styles.css';
import './motyw.css';
import './globals.css';
import { AppFrame } from '@/components/AppFrame';
import { ToastProvider } from '@/components/ds';
import { Sylwetka } from '@/components/Sylwetka';
import { czytajMarkdown, gotoweModuly, progQuizu, strukturaNieba } from '@/lib/content';
import { ZNAK } from '@/lib/rysunki';
import { ADRES, OPEN_GRAPH, X } from '@/lib/seo';

// Titles: an antiqua drawn for Polish, its diacritics designed in from the start.
const poltawski = Poltawski_Nowy({
  subsets: ['latin', 'latin-ext'],
  style: ['normal', 'italic'],
  variable: '--font-poltawski',
  display: 'swap',
});

// Reading: optical sizes from captions to display, and an italic for Latin names.
const newsreader = Newsreader({
  subsets: ['latin', 'latin-ext'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--font-newsreader',
  display: 'swap',
});

export const metadata: Metadata = {
  // Production origin for absolute metadata URLs such as the share card's; Vercel previews and next dev use their own.
  metadataBase: new URL(ADRES),
  title: { default: 'World of Raptors', template: '%s, World of Raptors' },
  description:
    // At most 160 characters, which is what a search result or a link preview shows.
    'Kurs o ptakach drapieżnych: jak je rozpoznać w terenie, od Polski po Cieśninę Gibraltarską. Pomysł i treść: Konstancja Tanjga-Nawrot; projekt i kod z Claude.',
  authors: [{ name: 'Konstancja Tanjga-Nawrot' }],
  creator: 'Konstancja Tanjga-Nawrot',
  openGraph: OPEN_GRAPH,
  twitter: { card: 'summary_large_image', site: X, creator: X },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f3e9' },
    { media: '(prefers-color-scheme: dark)', color: '#0a1018' },
  ],
};

const nawigacja = Promise.all(
  gotoweModuly.map(async ({ id, slug, tytul, lekcje }) => ({
    id,
    slug,
    tytul,
    lekcje: await Promise.all(
      lekcje.map(async (l) => ({
        slug: l.slug,
        tytul: l.tytul,
        progQuizu: progQuizu(await czytajMarkdown(`moduly/${slug}/${l.slug}.md`), `moduly/${slug}/${l.slug}.md`),
      })),
    ),
  })),
);

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pl" className={`${poltawski.variable} ${newsreader.variable}`}>
      <body className="bh-root">
        <ToastProvider>
          <AppFrame moduly={await nawigacja} znak={<Sylwetka id={ZNAK} klasa="znak" />} struktura={strukturaNieba()}>
            {children}
          </AppFrame>
        </ToastProvider>
      </body>
    </html>
  );
}
