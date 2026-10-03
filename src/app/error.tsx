'use client';

import { useEffect } from 'react';
import { ButtonLink } from '@/components/ButtonLink';
import { Button, StateBlock } from '@/components/ds';

/**
 * A page that broke while rendering. The pages are built ahead, so this is a
 * component failing in the browser or a connection lost between pages; the
 * frame stays, and the reader can try again or go back to the start.
 */
export default function Blad({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page">
      <StateBlock
        state="error"
        title="Nie udało się pokazać tej strony"
        description="Spróbuj jeszcze raz albo wróć na start. Postęp, lista i fiszki są zapisane w tej przeglądarce, więc nic nie przepadło."
        action={
          <Button size="sm" onClick={() => retry()}>
            Spróbuj ponownie
          </Button>
        }
        secondaryAction={
          <ButtonLink href="/" size="sm" variant="secondary">
            Wróć na start
          </ButtonLink>
        }
        diagnostics={error.digest ? `Identyfikator błędu: ${error.digest}` : undefined}
        scope="page"
      />
    </div>
  );
}
