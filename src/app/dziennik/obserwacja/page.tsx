import type { Metadata } from 'next';
import { FormularzObserwacji } from '@/components/dziennik/FormularzObserwacji';
import { ptakiDziennika } from '../ptaki';
import { NaglowekStrony } from '@/components/NaglowekStrony';

// Personal: a form for my own sightings; nothing for a search engine.
export const metadata: Metadata = { title: 'Obserwacja', robots: { index: false } };

export default function ObserwacjaPage() {
  return (
    <div className="page">
      <NaglowekStrony tytul="Obserwacja" />
      <FormularzObserwacji ptaki={ptakiDziennika} />
    </div>
  );
}
