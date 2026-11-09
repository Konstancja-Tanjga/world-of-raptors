import type { Metadata } from 'next';
import { DziennikView } from '@/components/dziennik/DziennikView';
import { ptakiDziennika } from './ptaki';
import { NaglowekStrony } from '@/components/NaglowekStrony';
import { ZakladkiTerenu } from '@/components/ZakladkiTerenu';

// Personal: my sightings, kept in this browser; nothing for a search engine.
export const metadata: Metadata = { title: 'Dziennik obserwacji', robots: { index: false } };

export default function DziennikPage() {
  return (
    <div className="page">
      <NaglowekStrony
        tytul={
          <>
            Teren<span className="visually-hidden">: Dziennik obserwacji</span>
          </>
        }
      />
      <ZakladkiTerenu biezaca="/dziennik" />
      <DziennikView ptaki={ptakiDziennika} />
    </div>
  );
}
