import type { Metadata } from 'next';
import { ChecklistView } from '@/components/ChecklistView';
import { Sylwetka } from '@/components/Sylwetka';
import { gatunki, listaMiejsca, ptakiEuropy, ptakiNaLiscie } from '@/lib/content';
import { NaglowekStrony } from '@/components/NaglowekStrony';

// Personal: what I saw, learned and earned, kept in this browser; nothing for a search engine.
export const metadata: Metadata = { title: 'Moja checklista', robots: { index: false } };

export default function ChecklistaPage() {
  return (
    <div className="page">
      <NaglowekStrony tytul="Checklista" />
      <ChecklistView
        ptaki={ptakiNaLiscie}
        pozostale={ptakiEuropy}
        sylwetki={Object.fromEntries(gatunki.map((g) => [g.id, <Sylwetka key={g.id} id={g.id} klasa="sylwetka" dokladnosc={0.4} />]))}
        listyMiejsc={{ 'marismas-barbate': listaMiejsca('marismas-barbate') }}
      />
    </div>
  );
}
