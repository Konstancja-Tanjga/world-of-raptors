import type { Metadata } from 'next';
import { FormularzObserwacji } from '@/components/dziennik/FormularzObserwacji';
import { ptakiDziennika } from '../ptaki';

// Personal: a form for my own sightings; nothing for a search engine.
export const metadata: Metadata = { title: 'Obserwacja', robots: { index: false } };

export default function ObserwacjaPage() {
  return (
    <div className="page">
      <header className="naglowek-strony">
        <p className="eyebrow">Dziennik obserwacji</p>
        <h1 className="naglowek-strony__tytul">Obserwacja</h1>
      </header>
      <FormularzObserwacji ptaki={ptakiDziennika} />
    </div>
  );
}
