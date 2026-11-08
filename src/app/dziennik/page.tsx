import type { Metadata } from 'next';
import { DziennikView } from '@/components/dziennik/DziennikView';
import { ptakiDziennika } from './ptaki';

// Personal: my sightings, kept in this browser; nothing for a search engine.
export const metadata: Metadata = { title: 'Dziennik obserwacji', robots: { index: false } };

export default function DziennikPage() {
  return (
    <div className="page">
      <header className="naglowek-strony">
        <p className="eyebrow">Moja lista</p>
        <h1 className="naglowek-strony__tytul">Dziennik obserwacji</h1>
        <p className="naglowek-strony__lead">
          Każda moja obserwacja z dniem, godziną, liczbą ptaków i miejscem, także z punktem z telefonu albo z mapy.
          Pierwsza obserwacja gatunku odhacza go na checkliście.
        </p>
      </header>
      <DziennikView ptaki={ptakiDziennika} />
    </div>
  );
}
