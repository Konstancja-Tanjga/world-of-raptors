import type { Metadata } from 'next';
import { DziennikView } from '@/components/dziennik/DziennikView';
import { ptakiDziennika } from './ptaki';
import { NaglowekStrony } from '@/components/NaglowekStrony';

// Personal: my sightings, kept in this browser; nothing for a search engine.
export const metadata: Metadata = { title: 'Dziennik obserwacji', robots: { index: false } };

export default function DziennikPage() {
  return (
    <div className="page">
      <NaglowekStrony tytul="Dziennik obserwacji" />
      <DziennikView ptaki={ptakiDziennika} />
    </div>
  );
}
