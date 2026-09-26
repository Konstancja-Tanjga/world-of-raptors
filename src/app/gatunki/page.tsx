import type { Metadata } from 'next';
import { AtlasView } from '@/components/AtlasView';
import { gatunki } from '@/lib/content';

export const metadata: Metadata = { title: 'Atlas gatunków' };

export default function GatunkiPage() {
  return (
    <div className="page">
      <div className="stack">
        <h1 className="page-title">Atlas gatunków</h1>
        <p className="lead">
          Wszystkie gatunki z modułów kursu: ptaki dzienne i sowy z Polski, cieśniny i południa
          Hiszpanii.
        </p>
      </div>
      <AtlasView gatunki={gatunki} />
    </div>
  );
}
