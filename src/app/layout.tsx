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
  metadataBase: new URL('https://world-of-raptors.vercel.app'),
  title: { default: 'World of Raptors', template: '%s, World of Raptors' },
  description:
    'Kurs o drapieżnikach dziennych i nocnych: jak żyją, polują i wędrują, i jak rozpoznać je w terenie, od polskich pól po Cieśninę Gibraltarską. Pomysł, plan i treść: Konstancja Tanjga. Projekt, ruch i kod: razem z Claude (Anthropic).',
  authors: [{ name: 'Konstancja Tanjga' }],
  creator: 'Konstancja Tanjga',
  openGraph: { type: 'website', locale: 'pl_PL', siteName: 'World of Raptors' },
  twitter: { card: 'summary_large_image' },
  robots: { index: false, follow: false },
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
