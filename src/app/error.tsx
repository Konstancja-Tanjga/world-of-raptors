'use client';

import { useEffect } from 'react';
import { ButtonLink } from '@/components/ButtonLink';
import { Button, StateBlock } from '@/components/ds';

/**
 * A page that broke while rendering: a component failing in the browser, a
 * connection lost between pages, or the home page (rendered per request)
 * failing on the server, which arrives as a digest to match the server log.
 * The frame stays. "Wróć na start" loads the start afresh, because a link
 * within the app would not leave an error on the start page itself.
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
          <ButtonLink href="/" size="sm" variant="secondary" pelneWczytanie>
            Wróć na start
          </ButtonLink>
        }
        diagnostics={error.digest ? `Identyfikator błędu: ${error.digest}` : error.message || undefined}
        scope="page"
      />
    </div>
  );
}
