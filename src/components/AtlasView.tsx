'use client';

import Link from 'next/link';
import { useChecklista } from '@/lib/checklist';
import type { Gatunek } from '@/lib/types';
import { Badge, Card, StateBlock } from './ds';
import { SpeciesFilters, useFiltry } from './SpeciesFilters';

export function AtlasView({ gatunki }: { gatunki: Gatunek[] }) {
  const { filtry, setFiltry, wynik } = useFiltry(gatunki);
  const { lista } = useChecklista();

  return (
    <div className="stack">
      <SpeciesFilters filtry={filtry} onChange={setFiltry} />
      <p className="muted" aria-live="polite">
        Gatunki: {wynik.length} z {gatunki.length}
      </p>
      {wynik.length === 0 ? (
        <StateBlock
          state="empty"
          icon="🔭"
          title="Brak gatunków w tym filtrze"
          description="Zmień region, aktywność albo wyszukiwaną nazwę."
          scope="section"
        />
      ) : (
        <ul className="grid">
          {wynik.map((g) => (
            <li key={g.id}>
              <Card>
                <div className="species-card">
                  <h2 className="species-card__title">
                    <Link href={`/gatunki/${g.id}`} className="text-link">
                      {g.pl}
                    </Link>
                  </h2>
                  <p className="latin">{g.lat}</p>
                  <div className="chips">
                    <Badge>{g.grupa}</Badge>
                    {g.status.includes('rzadki') && <Badge tone="warning">rzadki</Badge>}
                    {lista?.[g.id] && (
                      <Badge tone="success" dot>
                        zaobserwowany
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
