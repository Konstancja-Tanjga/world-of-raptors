import type { Metadata } from 'next';
import { ChecklistView } from '@/components/ChecklistView';
import { Sylwetka } from '@/components/Sylwetka';
import { gatunki, listaMiejsca, ptakiNaLiscie } from '@/lib/content';

// Personal: what I saw, learned and earned, kept in this browser; nothing for a search engine.
export const metadata: Metadata = { title: 'Moja checklista', robots: { index: false } };

export default function ChecklistaPage() {
  return (
    <div className="page">
      <header className="naglowek-strony">
        <p className="eyebrow">Moja lista</p>
        <h1 className="naglowek-strony__tytul">Moja checklista</h1>
        <p className="naglowek-strony__lead">
          Odhaczam gatunki, które zaobserwowałam. Przy każdym mogę zapisać datę, miejsce, notatkę i
          własne zdjęcia. Filtr „Region” pokazuje ptaki z wybranej okolicy, a „Miejsce” listę terenową, na przykład
          Marismas del Barbate.
        </p>
      </header>
      <ChecklistView
        ptaki={ptakiNaLiscie}
        sylwetki={Object.fromEntries(gatunki.map((g) => [g.id, <Sylwetka key={g.id} id={g.id} klasa="sylwetka" dokladnosc={0.4} />]))}
        listyMiejsc={{ 'marismas-barbate': listaMiejsca('marismas-barbate') }}
      />
    </div>
  );
}
