'use client';

import { ButtonLink } from '@/components/ButtonLink';
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
        <div>
          <ButtonLink href="/checklista" variant="secondary">
            Odhacz obserwacje
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}
