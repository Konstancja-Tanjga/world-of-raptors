'use client';

import Link from 'next/link';
import { useChecklista } from '@/lib/checklist';
import { Card, Progress, StateBlock } from './ds';

export function ChecklistSummary({ ids }: { ids: string[] }) {
  const { lista } = useChecklista();

  return (
    <Card>
      <div className="stack">
        <h2 className="section-title">Moja checklista</h2>
        {lista ? (
          <Progress
            label="Zaobserwowane gatunki"
            value={ids.filter((id) => lista[id]).length}
            max={ids.length}
            valueText={`${ids.filter((id) => lista[id]).length} z ${ids.length}`}
          />
        ) : (
          <StateBlock state="loading" title="Wczytywanie checklisty" scope="inline" />
        )}
        <Link href="/checklista" className="text-link">
          Odhacz obserwacje
        </Link>
      </div>
    </Card>
  );
}
