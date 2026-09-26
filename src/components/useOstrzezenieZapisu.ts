'use client';

import { useCallback } from 'react';
import { useToast } from './ds';

// Module-level so the warning shows once per visit, not on every keystroke.
let ostrzezono = false;

/**
 * Pass it the result of a save. If the browser refused to store the change,
 * tell the user once that it will be gone after a reload.
 */
export function useOstrzezenieZapisu() {
  const { notify } = useToast();
  return useCallback(
    (zapisano: boolean) => {
      if (zapisano || ostrzezono) return;
      ostrzezono = true;
      notify({
        tone: 'warning',
        title: 'Nie udało się zapisać zmian',
        description:
          'Przeglądarka blokuje pamięć strony (np. tryb prywatny albo brak miejsca). Zmiany znikną po odświeżeniu.',
        duration: null,
      });
    },
    [notify],
  );
}
