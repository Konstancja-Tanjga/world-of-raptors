'use client';

import { kluczLekcji, usePostep } from '@/lib/postep';
import { Checkbox, StateBlock } from './ds';
import { useOstrzezenieZapisu } from './useOstrzezenieZapisu';

/** "I finished this lesson" — feeds the ticks in the sidebar. */
export function LessonComplete({
  modul,
  lekcja,
  quiz,
}: {
  modul: string;
  lekcja: string;
  /** The lesson has a quiz, and passing it ticks this box. */
  quiz: boolean;
}) {
  const { postep, ustaw } = usePostep();
  const sprawdzZapis = useOstrzezenieZapisu();

  if (!postep) return <StateBlock state="loading" title="Wczytywanie postępu" scope="inline" />;

  const klucz = kluczLekcji(modul, lekcja);
  const data = postep[klucz];
  return (
    <Checkbox
      label="Ukończyłam tę lekcję"
      description={
        data
          ? `Ukończona ${data}.`
          : quiz
            ? 'Zaznaczy się sama, gdy zaliczysz quiz. Moduł jest zaliczony, gdy ukończysz wszystkie lekcje.'
            : 'Zaznacz, żeby w menu było widać postęp modułu.'
      }
      checked={Boolean(data)}
      onChange={(e) => sprawdzZapis(ustaw(klucz, e.target.checked))}
    />
  );
}
