'use client';

import Link from 'next/link';
import { jestWidziany, useChecklista } from '@/lib/checklist';
import { Card, Checkbox, StateBlock } from './ds';
import { OwnPhotos } from './OwnPhotos';
import { useOstrzezenieZapisu } from './useOstrzezenieZapisu';

/** The checklist entry for one species, shown on its atlas card. */
export function SpeciesObservation({ id, nazwa }: { id: string; nazwa: string }) {
  const { lista, przelacz } = useChecklista();
  const sprawdzZapis = useOstrzezenieZapisu();

  if (!lista) return <StateBlock state="loading" title="Wczytywanie checklisty" scope="inline" />;

  const obs = jestWidziany(lista, id) ? lista[id] : undefined;
  return (
    <Card padding="snug" accent={obs ? 'success' : 'none'}>
      <div className="checklist__row">
        <Checkbox
          label={`Zaobserwowałam: ${nazwa}`}
          description={
            obs
              ? [obs.data && `Data: ${obs.data}`, obs.miejsce && `Miejsce: ${obs.miejsce}`]
                  .filter(Boolean)
                  .join(', ') || undefined
              : 'Zaznacz, żeby dodać gatunek do checklisty.'
          }
          checked={Boolean(obs)}
          onChange={() => sprawdzZapis(przelacz(id))}
        />
        <Link href="/checklista" className="text-link">
          Otwórz checklistę
        </Link>
      </div>
      <OwnPhotos gatunek={id} nazwa={nazwa} />
    </Card>
  );
}
