import type { Metadata } from 'next';
import '@bighat/ui/styles.css';
import './globals.css';
import { AppFrame } from '@/components/AppFrame';
import { ToastProvider } from '@/components/ds';
import { czytajMarkdown, gotoweModuly, progQuizu } from '@/lib/content';

export const metadata: Metadata = {
  title: { default: 'World of Raptors', template: '%s, World of Raptors' },
  description: 'Prywatny kurs o ptakach drapieżnych: biologia i rozpoznawanie w terenie.',
  robots: { index: false, follow: false },
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
    <html lang="pl">
      <body className="bh-root">
        <ToastProvider>
          <AppFrame moduly={await nawigacja}>{children}</AppFrame>
        </ToastProvider>
      </body>
    </html>
  );
}
