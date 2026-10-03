import type { Metadata } from 'next';
import { Markdown } from '@/components/Markdown';
import { Kurs } from '@/components/start/Kurs';
import { czytajMarkdown, gotoweModuly } from '@/lib/content';
import { odmiana } from '@/lib/odmiana';

export const metadata: Metadata = { title: 'Plan kursu' };

/**
 * "Kurs" in the navigation: the modules first, as cards with my progress,
 * then the course plan as written (its own `#` title is dropped, the page
 * has one).
 */
export default async function PlanPage() {
  const plan = (await czytajMarkdown('PLAN-KURSU.md')).replace(/^#\s.*\n+/, '');
  const lekcji = gotoweModuly.reduce((n, m) => n + m.lekcje.length, 0);
  return (
    <div className="page">
      <header className="naglowek-strony">
        <p className="eyebrow">Kurs</p>
        <h1 className="naglowek-strony__tytul">Plan kursu</h1>
        <p className="naglowek-strony__lead">
          Dwie ścieżki, {gotoweModuly.length} {odmiana(gotoweModuly.length, ['moduł', 'moduły', 'modułów'])} i {lekcji}{' '}
          {odmiana(lekcji, ['lekcja', 'lekcje', 'lekcji'])}. Biologia tłumaczy, dlaczego drapieżnik wygląda i lata tak, a nie
          inaczej; rozpoznawanie uczy, jak wykorzystać to w terenie.
        </p>
      </header>
      <Kurs naglowek={false} />
      <div className="plan__tekst">
        <Markdown source={plan} baseDir="" />
      </div>
    </div>
  );
}
