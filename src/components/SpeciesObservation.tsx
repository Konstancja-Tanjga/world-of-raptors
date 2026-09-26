'use client';

import Link from 'next/link';
import { useChecklista } from '@/lib/checklist';
import { Card, Checkbox, StateBlock } from './ds';

/** The checklist entry for one species, shown on its atlas card. */
export function SpeciesObservation({ id, nazwa }: { id: string; nazwa: string }) {
  const { lista, przelacz } = useChecklista();

  if (!lista) return <StateBlock state="loading" title="Wczytywanie checklisty" scope="inline" />;

  const obs = lista[id];
  return (
    <Card padding="snug" accent={obs ? 'success' : 'none'}>
      <div className="checklist__row">
        <Checkbox
          label={`Zaobserwowałam: ${nazwa}`}
          description={
            obs
              ? [obs.data && `Data: ${obs.data}`, obs.miejsce && `Miejsce: ${obs.miejsce}`]
                  .filter(Boolean)
                  .join(' · ') || undefined
              : 'Zaznacz, żeby dodać gatunek do checklisty.'
          }
          checked={Boolean(obs)}
          onChange={() => przelacz(id)}
        />
        <Link href="/checklista" className="text-link">
          Otwórz checklistę
        </Link>
      </div>
    </Card>
  );
}
