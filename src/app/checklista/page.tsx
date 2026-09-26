import type { Metadata } from 'next';
import { ChecklistView } from '@/components/ChecklistView';
import { gatunki } from '@/lib/content';

export const metadata: Metadata = { title: 'Moja checklista' };

export default function ChecklistaPage() {
  return (
    <div className="page">
      <div className="stack">
        <h1 className="page-title">Moja checklista</h1>
        <p className="lead">
          Odhaczam gatunki, które zaobserwowałam. Przy każdym mogę zapisać datę, miejsce i
          notatkę. Filtr „Region” pokazuje ptaki z wybranej okolicy.
        </p>
      </div>
      <ChecklistView gatunki={gatunki} />
    </div>
  );
}
