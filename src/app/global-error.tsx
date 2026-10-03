'use client';

import '@bighat/ui/styles.css';
import './motyw.css';
import './globals.css';
import { useEffect } from 'react';
import { ButtonLink } from '@/components/ButtonLink';
import { Button, StateBlock } from '@/components/ds';

/**
 * The last resort, when the root layout itself fails. It replaces the whole
 * document, so it brings its own <html>, <body> and styles, and has no frame.
 */
export default function BladGlowny({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pl">
      <body className="bh-root">
        <title>Błąd, World of Raptors</title>
        <main className="page">
          <StateBlock
            state="error"
            title="Nie udało się otworzyć kursu"
            description="Spróbuj jeszcze raz za chwilę. Postęp, lista i fiszki są zapisane w tej przeglądarce, więc nic nie przepadło."
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
        </main>
      </body>
    </html>
  );
}
