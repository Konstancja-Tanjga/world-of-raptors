'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { jestWidziany, useChecklista } from '@/lib/checklist';
import { opisBleduLokalizacji, pobierzPozycje } from '@/lib/lokalizacja';
import { odmiana } from '@/lib/odmiana';
import { kiedySlownie, PROMIEN_KM, DNI_WSTECZ, zaokraglij, type Podpowiedz, type Warunki } from '@/lib/podpowiedzi';
import { wspolrzedneZTekstu, type Wspolrzedne } from '@/lib/punkty';
import { Badge, Button, Checkbox, Input, StateBlock } from './ds';
import { NazwaPtaka } from './NazwaPtaka';

type Odpowiedz = { punkt: Wspolrzedne; dzis: string; warunki: Warunki | null; ptaki: Podpowiedz[]; braki?: ('pogoda' | 'rzadkie')[] };
type Stan =
  | { stan: 'spokoj' }
  | { stan: 'lokalizuje' }
  | { stan: 'laduje' }
  | { stan: 'blad'; tytul: string; opis: string }
  | { stan: 'wynik'; dane: Odpowiedz };

/** How many birds show before "Pokaż wszystkie". */
const NA_START = 15;

const NOWA_KARTA = <span className="visually-hidden">, otwiera się w nowej karcie</span>;

/**
 * "Co tu zobaczę": from my position (or typed coordinates), the birds
 * eBird's observers reported within 25 km in the last 30 days, the most
 * recent first, weighed by the weather there now (src/lib/podpowiedzi.ts,
 * through the route /podpowiedzi, which holds the eBird key). Birds I have not
 * ticked yet are marked, and each known one links to adding a sighting.
 */
export function CoTuZobacze() {
  const { lista } = useChecklista();
  const [stan, setStan] = useState<Stan>({ stan: 'spokoj' });
  const [wspolrzedne, setWspolrzedne] = useState('');
  const [wpisz, setWpisz] = useState(false);
  const [tylkoNowe, setTylkoNowe] = useState(false);
  const [wszystkie, setWszystkie] = useState(false);
  const zadanie = useRef(0);

  async function sprawdz(punkt: Wspolrzedne, numer: number) {
    setStan({ stan: 'laduje' });
    const p = zaokraglij(punkt);
    let r: Response;
    try {
      r = await fetch(`/podpowiedzi?szer=${p.szer}&dl=${p.dl}`);
    } catch (err) {
      if (numer !== zadanie.current) return;
      console.error('[co-tu] request failed', err);
      setStan({ stan: 'blad', tytul: 'Brak połączenia', opis: 'Podpowiedzi potrzebują internetu. Spróbuj, kiedy złapiesz zasięg.' });
      return;
    }
    if (numer !== zadanie.current) return;
    if (!r.ok) {
      const blad = await r.json().catch(() => null);
      if (numer !== zadanie.current) return;
      setStan({
        stan: 'blad',
        tytul: 'Nie udało się pobrać podpowiedzi',
        opis:
          blad?.blad === 'konfiguracja'
            ? 'Podpowiedzi nie są jeszcze skonfigurowane na serwerze (brak klucza eBird).'
            : blad?.blad === 'ebird'
              ? 'eBird nie odpowiedział. Zwykle to chwilowe: spróbuj za kilka minut.'
              : `Serwer odpowiedział błędem (HTTP ${r.status}).`,
      });
      return;
    }
    try {
      const dane = (await r.json()) as Odpowiedz;
      if (numer !== zadanie.current) return;
      setWszystkie(false);
      setStan({ stan: 'wynik', dane });
    } catch (err) {
      if (numer !== zadanie.current) return;
      console.error('[co-tu] answer unreadable', err);
      setStan({ stan: 'blad', tytul: 'Nie udało się odczytać podpowiedzi', opis: 'Spróbuj jeszcze raz za chwilę.' });
    }
  }

  function zlokalizuj() {
    const numer = ++zadanie.current;
    setStan({ stan: 'lokalizuje' });
    pobierzPozycje().then(
      (pos) => {
        if (numer === zadanie.current) void sprawdz(pos, numer);
      },
      (err: unknown) => {
        if (numer !== zadanie.current) return;
        setStan({ stan: 'blad', tytul: 'Nie udało się ustalić lokalizacji', opis: `${opisBleduLokalizacji(err)} Możesz też wpisać współrzędne.` });
      },
    );
  }

  function zWspolrzednych(e: FormEvent) {
    e.preventDefault();
    const p = wspolrzedneZTekstu(wspolrzedne);
    if (p) void sprawdz(p, ++zadanie.current);
  }

  const zajety = stan.stan === 'lokalizuje' || stan.stan === 'laduje';
  const dane = stan.stan === 'wynik' ? stan.dane : null;
  const widziany = (p: Podpowiedz) => Boolean(p.id && lista && jestWidziany(lista, p.id));
  const ptaki = dane ? dane.ptaki.filter((p) => !tylkoNowe || !widziany(p)) : [];
  const pokazane = wszystkie ? ptaki : ptaki.slice(0, NA_START);

  return (
    // data-prywatne: the list marks what I have not seen yet, so "Zgłoś poprawkę" cannot point at it.
    <div className="stack co-tu" data-prywatne>
      <div className="punkty__przyciski">
        <Button onClick={zlokalizuj} loading={zajety} loadingLabel={stan.stan === 'lokalizuje' ? 'Ustalam lokalizację' : 'Pobieram podpowiedzi'} disabled={zajety}>
          Co tu zobaczę?
        </Button>
        <Button variant="secondary" aria-expanded={wpisz} onClick={() => setWpisz(!wpisz)}>
          Inny punkt
        </Button>
      </div>
      {wpisz && (
        <form className="punkty__start" onSubmit={zWspolrzednych} aria-label="Podpowiedzi dla punktu">
          <Input
            label="Współrzędne"
            description="Szerokość i długość w stopniach, np. 36.01, -5.60"
            inputMode="decimal"
            value={wspolrzedne}
            onChange={(e) => setWspolrzedne(e.target.value)}
            error={wspolrzedne.trim() && !wspolrzedneZTekstu(wspolrzedne) ? 'Wpisz dwie liczby, np. 52.23, 21.01.' : undefined}
          />
          <Button type="submit" variant="secondary" disabled={zajety || !wspolrzedneZTekstu(wspolrzedne)}>
            Pokaż podpowiedzi
          </Button>
        </form>
      )}

      <p className="visually-hidden" aria-live="polite">
        {dane ? `${dane.ptaki.length} ${odmiana(dane.ptaki.length, ['gatunek', 'gatunki', 'gatunków'])} w podpowiedziach` : ''}
      </p>
      {stan.stan === 'blad' && <StateBlock state="error" title={stan.tytul} description={stan.opis} scope="section" />}
      {stan.stan === 'laduje' && <StateBlock state="loading" title="Pobieram obserwacje z okolicy" scope="section" />}

      {dane && (
        <>
          {dane.braki?.length ? (
            <p className="muted">
              {dane.braki.includes('pogoda') && 'Pogoda się nie wczytała, więc kolejność nie uwzględnia warunków. '}
              {dane.braki.includes('rzadkie') && 'Oznaczenia rzadkości się nie wczytały. '}
              Spróbuj za kilka minut.
            </p>
          ) : null}
          {dane.warunki?.uwagi.length ? (
            <ul className="co-tu__warunki" aria-label="Warunki teraz">
              {dane.warunki.uwagi.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          ) : null}
          {dane.ptaki.length === 0 ? (
            <StateBlock
              state="empty"
              title="Nikt nie zgłosił tu ostatnio ptaków"
              description={`W eBird nie ma obserwacji z ostatnich ${DNI_WSTECZ} dni w promieniu ${PROMIEN_KM} km. Moje obserwacje będą tu pierwsze.`}
              scope="section"
            />
          ) : (
            <>
              <div className="co-tu__opcje">
                <p className="muted">
                  {dane.ptaki.length} {odmiana(dane.ptaki.length, ['gatunek zgłoszony', 'gatunki zgłoszone', 'gatunków zgłoszonych'])} w ostatnich {DNI_WSTECZ} dniach do {PROMIEN_KM} km stąd, od najbardziej prawdopodobnych.
                </p>
                <Checkbox label="Tylko te, których jeszcze nie widziałam" checked={tylkoNowe} onChange={(e) => setTylkoNowe(e.target.checked)} />
              </div>
              {ptaki.length === 0 ? (
                <StateBlock
                  state="empty"
                  title="Wszystkie już widziane"
                  description="Każdy z tych gatunków jest już na mojej checkliście."
                  action={
                    <Button size="sm" variant="secondary" onClick={() => setTylkoNowe(false)}>
                      Pokaż wszystkie
                    </Button>
                  }
                  scope="section"
                />
              ) : (
                <ol className="co-tu__lista">
                  {pokazane.map((p) => (
                    <li key={p.kod} className="co-tu__ptak">
                      <p className="co-tu__nazwa">
                        <strong>
                          {p.id && p.wKursie ? (
                            <Link href={`/gatunki/${p.id}`} className="text-link">
                              <NazwaPtaka id={p.id} pl={p.pl} />
                            </Link>
                          ) : p.id ? (
                            <NazwaPtaka id={p.id} pl={p.pl} />
                          ) : (
                            p.pl
                          )}
                        </strong>{' '}
                        <span className="muted" translate="no" lang="la">
                          {p.lat}
                        </span>
                      </p>
                      <div className="punkt__znaczniki">
                        {p.rzadki && <Badge tone="warning">Rzadki tutaj</Badge>}
                        {lista && !widziany(p) && <Badge tone="success">Jeszcze go nie widziałam</Badge>}
                      </div>
                      <p className="co-tu__ostatnio">
                        Ostatnio {kiedySlownie(p.dni)}
                        {p.liczba ? `, ${p.liczba} szt.` : ''}
                        {p.miejsce ? `, ${p.miejsce}` : ''}
                      </p>
                      {p.id && (
                        <Link href={`/dziennik/obserwacja?gatunek=${p.id}`} className="text-link">
                          Dodaj obserwację<span className="visually-hidden">: {p.pl}</span>
                        </Link>
                      )}
                    </li>
                  ))}
                </ol>
              )}
              {!wszystkie && ptaki.length > NA_START && (
                <Button variant="secondary" onClick={() => setWszystkie(true)}>
                  Pokaż wszystkie ({ptaki.length})
                </Button>
              )}
            </>
          )}
        </>
      )}

      <p className="muted planer__uwaga">
        Obserwacje:{' '}
        <a href="https://ebird.org" target="_blank" rel="noreferrer" className="text-link">
          eBird
          {NOWA_KARTA}
        </a>{' '}
        (Cornell Lab of Ornithology); pogoda:{' '}
        <a href="https://open-meteo.com" target="_blank" rel="noreferrer" className="text-link">
          Open-Meteo
          {NOWA_KARTA}
        </a>
        . Mój punkt, zaokrąglony do ok. 1 km, trafia do serwera kursu, eBird i Open-Meteo; nie zapisuję go. To, że ptak był
        tu zgłoszony, nie znaczy, że go zobaczę: to podpowiedź, na co patrzeć.
      </p>
    </div>
  );
}
