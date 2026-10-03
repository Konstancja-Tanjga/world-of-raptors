import type { Metadata, Viewport } from 'next';
import { Newsreader, Poltawski_Nowy } from 'next/font/google';
import '@bighat/ui/styles.css';
import './motyw.css';
import './globals.css';
import { AppFrame } from '@/components/AppFrame';
import { ToastProvider } from '@/components/ds';
import { Sylwetka } from '@/components/Sylwetka';
import { czytajMarkdown, gotoweModuly, progQuizu } from '@/lib/content';

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
  title: { default: 'World of Raptors', template: '%s, World of Raptors' },
  description: 'Prywatny kurs o ptakach drapieżnych: biologia i rozpoznawanie w terenie. Pomysł i treść: Konstancja Tanjga.',
  authors: [{ name: 'Konstancja Tanjga' }],
  creator: 'Konstancja Tanjga',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f3e9' },
    { media: '(prefers-color-scheme: dark)', color: '#0a1018' },
  ],
};

const nawigacja = Promise.all(
  gotoweModuly.map(async ({ id, slug, tytul, sciezka, lekcje }) => ({
    id,
    slug,
    tytul,
    sciezka,
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
          <AppFrame moduly={await nawigacja} znak={<Sylwetka id="kania-ruda" klasa="znak" />}>
            {children}
          </AppFrame>
        </ToastProvider>
      </body>
    </html>
  );
}
