'use client';

import { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID, nowyNonce, zalogujTokenemGoogle } from '@/lib/konto';
import { StateBlock } from './ds';

/** The parts of Google Identity Services (accounts.google.com/gsi/client) used here. */
type Gsi = {
  accounts: {
    id: {
      initialize(opcje: {
        client_id: string;
        callback: (odpowiedz: { credential: string }) => void;
        nonce: string;
        ux_mode: 'popup';
        use_fedcm_for_button: boolean;
      }): void;
      renderButton(
        rodzic: HTMLElement,
        opcje: { type: 'standard'; theme: 'outline'; size: 'large'; text: 'signin_with'; shape: 'pill'; locale: string },
      ): void;
    };
  };
};

const SKRYPT = 'https://accounts.google.com/gsi/client';
let wczytywanie: Promise<Gsi> | null = null;

function wczytajGsi(): Promise<Gsi> {
  wczytywanie ??= new Promise((ok, blad) => {
    const s = document.createElement('script');
    s.src = SKRYPT;
    s.async = true;
    s.onload = () => {
      const gsi = (window as unknown as { google?: Gsi }).google;
      if (gsi) ok(gsi);
      else blad(new Error('gsi missing after load'));
    };
    s.onerror = () => {
      wczytywanie = null; // let a later visit try again
      blad(new Error('gsi script failed to load'));
    };
    document.head.append(s);
  });
  return wczytywanie;
}

/**
 * Google's own "Zaloguj się przez Google" button. Google requires its button
 * to be drawn by Google (see DS-GAPS.md), so this is the one control on the
 * page that is not Big Hat's. The popup returns an ID token, which signs in to
 * Supabase; useKonto() then sees the session.
 */
export function PrzyciskGoogle() {
  const miejsce = useRef<HTMLDivElement>(null);
  const [blad, setBlad] = useState<string>();
  const [nieWczytany, setNieWczytany] = useState(false);

  useEffect(() => {
    let aktywny = true;
    (async () => {
      let gsi: Gsi;
      try {
        gsi = await wczytajGsi();
      } catch (err) {
        console.error('[konto] Google sign-in did not load', err);
        if (aktywny) setNieWczytany(true);
        return;
      }
      const { surowy, hash } = await nowyNonce();
      if (!aktywny || !miejsce.current) return;
      gsi.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        nonce: hash,
        ux_mode: 'popup',
        use_fedcm_for_button: true,
        callback: async ({ credential }) => {
          setBlad(undefined);
          const wynik = await zalogujTokenemGoogle(credential, surowy);
          if (wynik.blad) setBlad(wynik.blad);
        },
      });
      gsi.accounts.id.renderButton(miejsce.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        locale: 'pl',
      });
    })();
    return () => {
      aktywny = false;
    };
  }, []);

  if (nieWczytany) {
    return (
      <StateBlock
        state="error"
        title="Nie udało się wczytać logowania Google"
        description="Przeglądarka nie pobrała przycisku Google. Często blokuje go rozszerzenie do blokowania reklam albo śledzenia. Wyłącz je na tej stronie i odśwież ją. Twój postęp w tej przeglądarce jest bez zmian."
        scope="section"
      />
    );
  }

  return (
    <div className="stack">
      {blad && (
        <StateBlock
          state="error"
          title="Nie udało się zalogować"
          description={`Serwer kont odpowiedział: „${blad}”. Twój postęp w tej przeglądarce jest bez zmian. Spróbuj jeszcze raz.`}
          scope="section"
        />
      )}
      <div ref={miejsce} />
    </div>
  );
}
