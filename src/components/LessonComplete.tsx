'use client';

import { kluczLekcji, usePostep } from '@/lib/postep';
import { Card, Checkbox, StateBlock } from './ds';
import { useOstrzezenieZapisu } from './useOstrzezenieZapisu';

/** "I finished this lesson" — feeds the ticks in the sidebar. */
export function LessonComplete({
  modul,
  lekcja,
  ostatnia,
}: {
  modul: string;
  lekcja: string;
  /** Last lesson of the module: finishing it may complete the module. */
  ostatnia: boolean;
}) {
  const { postep, ustaw } = usePostep();
  const sprawdzZapis = useOstrzezenieZapisu();

  if (!postep) return <StateBlock state="loading" title="Wczytywanie postępu" scope="inline" />;

  const klucz = kluczLekcji(modul, lekcja);
  const data = postep[klucz];
  return (
    <Card padding="snug" accent={data ? 'success' : 'none'}>
      <Checkbox
        label="Ukończyłam tę lekcję"
        description={
          data
            ? `Ukończona ${data}.`
            : ostatnia
              ? 'Zaznacz po zrobieniu quizu. Moduł jest zaliczony, gdy ukończysz wszystkie lekcje.'
              : 'Zaznacz, żeby w menu było widać postęp modułu.'
        }
        checked={Boolean(data)}
        onChange={(e) => sprawdzZapis(ustaw(klucz, e.target.checked))}
      />
    </Card>
  );
}
