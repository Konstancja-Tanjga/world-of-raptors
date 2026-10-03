import type { Metadata } from 'next';
import { ChecklistView } from '@/components/ChecklistView';
import { Sylwetka } from '@/components/Sylwetka';
import { gatunki } from '@/lib/content';

export const metadata: Metadata = { title: 'Moja checklista' };

export default function ChecklistaPage() {
  return (
    <div className="page">
      <header className="naglowek-strony">
        <p className="eyebrow">Moja lista</p>
        <h1 className="naglowek-strony__tytul">Moja checklista</h1>
        <p className="naglowek-strony__lead">
          Odhaczam gatunki, które zaobserwowałam. Przy każdym mogę zapisać datę, miejsce, notatkę i
          własne zdjęcia. Filtr „Region” pokazuje ptaki z wybranej okolicy.
        </p>
      </header>
      <ChecklistView
        gatunki={gatunki}
        sylwetki={Object.fromEntries(gatunki.map((g) => [g.id, <Sylwetka key={g.id} id={g.id} klasa="sylwetka" dokladnosc={0.4} />]))}
      />
    </div>
  );
}
