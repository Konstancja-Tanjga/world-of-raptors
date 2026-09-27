import type { Metadata } from 'next';
import '@bighat/ui/styles.css';
import './globals.css';
import { AppFrame } from '@/components/AppFrame';
import { ToastProvider } from '@/components/ds';
import { gotoweModuly } from '@/lib/content';

export const metadata: Metadata = {
  title: { default: 'World of Raptors', template: '%s, World of Raptors' },
  description: 'Prywatny kurs o ptakach drapieżnych: biologia i rozpoznawanie w terenie.',
  robots: { index: false, follow: false },
};

const nawigacja = gotoweModuly.map(({ id, slug, tytul, sciezka, lekcje }) => ({
  id,
  slug,
  tytul,
  sciezka,
  lekcje: lekcje.map((l) => l.slug),
}));

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pl">
      <body className="bh-root">
        <ToastProvider>
          <AppFrame moduly={nawigacja}>{children}</AppFrame>
        </ToastProvider>
      </body>
    </html>
  );
}
