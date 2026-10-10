'use client';

import { useState } from 'react';
import { useKonto, wyloguj } from '@/lib/konto';
import { Button, StateBlock } from './ds';
import { PrzyciskGoogle } from './PrzyciskGoogle';

/** Sign in with Google, see who is signed in, sign out. */
export function KontoView() {
  const konto = useKonto();
  const [blad, setBlad] = useState<string>();

  if (konto.stan === 'wylaczone') return null;
  if (konto.stan === 'wczytywanie') return <StateBlock state="loading" title="Sprawdzanie konta" scope="section" />;
  if (konto.stan === 'gosc') return <PrzyciskGoogle />;

  const { email, created_at } = konto.uzytkownik;
  return (
    <div className="stack">
      <p>
        Zalogowano jako <strong>{email}</strong>. Konto założone{' '}
        {new Date(created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}.
      </p>
      {blad && (
        <StateBlock
          state="error"
          title="Nie udało się wylogować"
          description={`Serwer kont odpowiedział: „${blad}”. Spróbuj jeszcze raz.`}
          scope="section"
        />
      )}
      <div className="row">
        <Button
          variant="secondary"
          onClick={async () => {
            setBlad((await wyloguj()).blad);
          }}
        >
          Wyloguj
        </Button>
      </div>
    </div>
  );
}
