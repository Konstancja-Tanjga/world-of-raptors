'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useKonto, wyloguj } from '@/lib/konto';
import { odmiana } from '@/lib/odmiana';
import type { BladTabeli } from '@/lib/synchronizacja';
import { rozstrzygnij, synchronizujTeraz, useStatusSynchronizacji } from '@/lib/synchronizacjaPrzegladarki';
import { Button, StateBlock } from './ds';
import { PrzyciskGoogle } from './PrzyciskGoogle';

const godzina = (iso: string) => new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

const CZESCI: Record<string, string> = {
  lesson_progress: 'lekcje',
  observations: 'checklista',
  flashcards: 'fiszki',
  user_badges: 'odznaki',
  stan: 'stan synchronizacji',
  wszystkie: 'całość',
};

/** Why some parts did not sync, in words: the browser, the connection, or the server. */
function opisBledow(bledy: BladTabeli[]) {
  const czesci = bledy.map((b) => CZESCI[b.tabela] ?? b.tabela).join(', ');
  const tabele = ['lesson_progress', 'observations', 'flashcards', 'user_badges'];
  const resztaDzialala = !bledy.some((b) => b.tabela === 'wszystkie') && tabele.some((t) => !bledy.some((b) => b.tabela === t));
  const zdania = [
    resztaDzialala ? `Nie zsynchronizowały się: ${czesci}. Reszta jest zsynchronizowana.` : 'Nic się nie zsynchronizowało.',
  ];
  if (bledy.some((b) => b.rodzaj === 'przegladarka')) {
    zdania.push('Przeglądarka nie zapisała danych, np. przez brak miejsca albo tryb prywatny. Zmiany z konta nie trafiły do tej przeglądarki.');
  }
  if (bledy.some((b) => b.rodzaj === 'siec')) zdania.push('Nie udało się połączyć z serwerem kont.');
  const serwer = bledy.find((b) => b.rodzaj === 'serwer');
  if (serwer) zdania.push(`Serwer kont odpowiedział: „${serwer.opis}”.`);
  zdania.push('Zmiany zrobione tutaj zostają w tej przeglądarce i wyślą się przy następnej synchronizacji.');
  return zdania.join(' ');
}

/** Where the sync stands, and the choice when this browser holds another account's data. */
function StanSynchronizacji() {
  const status = useStatusSynchronizacji();
  // The sync loads after the page: a few seconds of "not started" is loading; longer, it did not start.
  const [dlugo, setDlugo] = useState(false);
  useEffect(() => {
    if (status.stan !== 'nieaktywna') return;
    const t = setTimeout(() => setDlugo(true), 8000);
    return () => clearTimeout(t);
  }, [status.stan]);

  switch (status.stan) {
    case 'nieaktywna':
      if (dlugo) {
        return (
          <StateBlock
            state="error"
            title="Synchronizacja nie uruchomiła się"
            description="Często po aktualizacji kursu. Odśwież stronę. Do tego czasu zmiany zapisują się w tej przeglądarce."
            scope="section"
          />
        );
      }
      return <StateBlock state="loading" title="Uruchamianie synchronizacji" scope="inline" />;
    case 'trwa':
      return <StateBlock state="loading" title="Synchronizacja trwa" scope="inline" />;
    case 'gotowe':
      if (status.bledy.length > 0) {
        return (
          <StateBlock
            state="error"
            title="Część postępu się nie zsynchronizowała"
            description={opisBledow(status.bledy)}
            action={
              <Button size="sm" variant="secondary" onClick={synchronizujTeraz}>
                Spróbuj ponownie
              </Button>
            }
            scope="section"
          />
        );
      }
      return (
        <div className="stack">
          <div className="row">
            <p className="muted">Postęp zsynchronizowany o {godzina(status.kiedy)}.</p>
            <Button variant="ghost" size="sm" onClick={synchronizujTeraz}>
              Synchronizuj teraz
            </Button>
          </div>
          {status.odrzucone > 0 && (
            <p className="muted">
              Serwer nie przyjął {status.odrzucone} {odmiana(status.odrzucone, ['wpisu', 'wpisów', 'wpisów'])}. Zostają tylko w tej przeglądarce.
            </p>
          )}
        </div>
      );
    case 'offline':
      return (
        <p className="muted">
          Brak internetu. Zmiany zapisują się w tej przeglądarce i wyślą się same, gdy połączenie wróci.
        </p>
      );
    case 'inneKonto':
      return (
        <section className="stack" aria-labelledby="inne-konto">
          <h2 id="inne-konto" className="section-title">
            W tej przeglądarce jest postęp innego konta
          </h2>
          <p>
            Ostatnio synchronizowało się tu inne konto. Ten postęp można dołączyć do konta, na które się
            teraz zalogowano, albo usunąć go z przeglądarki i pobrać tylko dane tego konta. Do czasu
            wyboru nic się nie synchronizuje.
          </p>
          <p className="muted">
            Usunięcie dotyczy lekcji, checklisty, fiszek i odznak w tej przeglądarce. Moje zdjęcia
            zostają. Jeśli ten postęp jest potrzebny, najpierw zapisz <Link href="/checklista#kopia">kopię w pliku</Link>.
          </p>
          {status.blad && <StateBlock state="error" title="Nie udało się wykonać wyboru" description={status.blad} scope="section" />}
          <div className="row">
            <Button onClick={() => rozstrzygnij('dolacz')}>Dołącz do tego konta</Button>
            <Button variant="secondary" tone="critical" onClick={() => rozstrzygnij('zastap')}>
              Usuń i pobierz dane konta
            </Button>
          </div>
        </section>
      );
  }
}

/** Sign in with Google, see who is signed in and how syncing goes, sign out. */
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
      <StanSynchronizacji />
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
      <p className="muted">Po wylogowaniu postęp zostaje w tej przeglądarce, ale przestaje się synchronizować.</p>
    </div>
  );
}
