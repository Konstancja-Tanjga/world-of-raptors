'use client';

import { useEffect, useState } from 'react';
import { utworzMagazyn } from '@/lib/magazyn';
import {
  adresyPrognozy,
  godzina,
  MIEJSCA_PLANERA,
  najlepsze,
  NiepelnaPrognoza,
  oknaMiejsca,
  prognozaZOdpowiedzi,
  type MiejscePlanera,
  type Okno,
} from '@/lib/planer';
import { Badge, Button, Card, SegmentedControl, StateBlock } from './ds';

type Wybor = { miejsce?: MiejscePlanera };
function isWybor(v: unknown): v is Wybor {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const m = (v as Wybor).miejsce;
  return m === undefined || MIEJSCA_PLANERA.some((x) => x.value === m);
}
/** The site last chosen: a convenience, not in backups (a refused save keeps it for this visit only). */
const wybor = utworzMagazyn<Wybor>('wor:planer:v1', isWybor);

/** What went wrong, so the page can say what helps: the connection, Open-Meteo's answer, or missing data. */
type Blad = { rodzaj: 'siec' } | { rodzaj: 'serwis'; status: number } | { rodzaj: 'dane' };
type Stan = { stan: 'wczytywanie' } | { stan: 'blad'; blad: Blad } | { stan: 'gotowe'; okna: Okno[] };

class BladSerwisu extends Error {
  name = 'BladSerwisu';
  status: number;
  constructor(status: number) {
    super(`Open-Meteo answered HTTP ${status}`);
    this.status = status;
  }
}

const OPIS_BLEDU: Record<Blad['rodzaj'], (b: Blad) => string> = {
  siec: () => 'Planer potrzebuje internetu: pływy i pogodę pobiera z Open-Meteo. Sprawdź połączenie i spróbuj jeszcze raz.',
  serwis: (b) =>
    `Open-Meteo odpowiedziało błędem${b.rodzaj === 'serwis' ? ` (HTTP ${b.status})` : ''}. Zwykle to chwilowe: spróbuj za kilka minut.`,
  dane: () =>
    'Prognoza przyszła niepełna (brak pływów albo pogody na większość godzin), więc nie ma z czego liczyć. Spróbuj później albo sprawdź tablicę pływów.',
};

const DZIEN = new Intl.DateTimeFormat('pl', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const dzien = (data: string) => {
  const [r, m, d] = data.split('-').map(Number);
  return DZIEN.format(new Date(Date.UTC(r, m - 1, d)));
};

/** The rules' score in words (a Badge carries a status, never a bare number). */
function warunki(ocena: number): { tekst: string; ton: 'success' | 'info' | 'neutral' | 'warning' } {
  if (ocena >= 75) return { tekst: 'Bardzo dobre warunki', ton: 'success' };
  if (ocena >= 55) return { tekst: 'Dobre warunki', ton: 'info' };
  if (ocena >= 40) return { tekst: 'Średnie warunki', ton: 'neutral' };
  return { tekst: 'Słabe warunki', ton: 'warning' };
}

function KartaOkna({ o, najlepsze: wyroznione }: { o: Okno; najlepsze?: boolean }) {
  const w = warunki(o.ocena);
  return (
    <Card padding="snug" accent={wyroznione ? 'success' : 'none'}>
      <div className="planer__okno">
        <p className="planer__dzien">{dzien(o.data)}</p>
        <p className="planer__godziny">
          {godzina(o.od)}–{godzina(o.do)}
        </p>
        <Badge tone={w.ton}>{w.tekst}</Badge>
        <ul className="planer__powody">
          {o.powody.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/**
 * "Kiedy jechać": pick a site, and the page fetches ten days of tide and
 * weather from Open-Meteo, then lists the best times to be there by the
 * course's rules (lib/planer.ts), the best three first, then day by day.
 */
export function PlanerWyjazdu() {
  const zapisany = wybor.useMagazyn();
  // null until the stored choice is read: nothing is fetched or shown for a guessed site.
  const miejsce: MiejscePlanera | null = zapisany ? (zapisany.miejsce ?? 'marismas-barbate') : null;
  const [stan, setStan] = useState<Stan>({ stan: 'wczytywanie' });
  const [proba, setProba] = useState(0);

  useEffect(() => {
    if (!miejsce) return;
    const przerwij = new AbortController();
    const adresy = adresyPrognozy(miejsce);
    const pobierz = async (url: string) => {
      const r = await fetch(url, { signal: przerwij.signal });
      if (!r.ok) throw new BladSerwisu(r.status);
      return r.json();
    };
    // A new site or a retry starts from the loading state; the fetch can only run in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStan({ stan: 'wczytywanie' });
    Promise.all([pobierz(adresy.pogoda), adresy.plywy ? pobierz(adresy.plywy) : Promise.resolve(null)])
      .then(([pogoda, plywy]) => {
        if (przerwij.signal.aborted) return;
        setStan({ stan: 'gotowe', okna: oknaMiejsca(miejsce, prognozaZOdpowiedzi(pogoda, plywy), Date.now() / 60000) });
      })
      .catch((err: unknown) => {
        // The site changed or the page closed: this answer is no longer wanted.
        if (przerwij.signal.aborted) return;
        console.error('[planer] forecast failed', err);
        setStan({
          stan: 'blad',
          blad:
            err instanceof BladSerwisu
              ? { rodzaj: 'serwis', status: err.status }
              : err instanceof NiepelnaPrognoza || err instanceof SyntaxError
                ? { rodzaj: 'dane' }
                : { rodzaj: 'siec' },
        });
      });
    return () => przerwij.abort();
  }, [miejsce, proba]);

  if (!miejsce) return <StateBlock state="loading" title="Wczytywanie planera" scope="section" />;
  const plywy = MIEJSCA_PLANERA.find((m) => m.value === miejsce)!.plywy;

  return (
    <div className="stack">
      <div className="scroll-x">
        <SegmentedControl
          legend="Gdzie chcesz pojechać"
          showLegend
          value={miejsce}
          onChange={(v) => wybor.zapisz({ miejsce: v as MiejscePlanera })}
          options={MIEJSCA_PLANERA.map((m) => ({ value: m.value, label: m.label }))}
        />
      </div>
      <p className="muted">
        {plywy
          ? 'Liczę według pływów: najlepiej być na miejscu, gdy woda rośnie, od ok. trzech godzin przed pełnym przypływem. Dochodzą do tego światło dnia, deszcz i wiatr.'
          : 'La Janda nie ma pływów. Liczę według pory dnia (drapieżniki szybują, gdy powietrze się nagrzeje), deszczu i wiatru; lewant przesuwa przelot na zachód, nad równinę.'}
      </p>

      {stan.stan === 'wczytywanie' ? (
        <StateBlock state="loading" title="Pobieram prognozę pływów i pogody" scope="section" />
      ) : stan.stan === 'blad' ? (
        <StateBlock
          state="error"
          title="Nie udało się pobrać prognozy"
          description={OPIS_BLEDU[stan.blad.rodzaj](stan.blad)}
          action={
            <Button size="sm" variant="secondary" onClick={() => setProba((n) => n + 1)}>
              Spróbuj ponownie
            </Button>
          }
          scope="section"
        />
      ) : stan.okna.length === 0 ? (
        <StateBlock
          state="empty"
          title="Brak terminów w najbliższych dniach"
          description={
            plywy
              ? 'W prognozie nie ma przypływu, przed którym woda rosłaby w świetle dnia, albo dzisiejsze okno już minęło. Zajrzyj jutro.'
              : 'Dzisiejsze okno już minęło, a dalszych dni nie ma w prognozie. Zajrzyj jutro.'
          }
          scope="section"
        />
      ) : (
        <>
          <section className="stack" aria-labelledby="planer-najlepsze">
            <h2 id="planer-najlepsze" className="checklist__naglowek">
              Najlepsze terminy
            </h2>
            <ol className="planer__lista">
              {najlepsze(stan.okna, 3).map((o, i) => (
                <li key={o.start}>
                  <KartaOkna o={o} najlepsze={i === 0} />
                </li>
              ))}
            </ol>
          </section>
          <section className="stack" aria-labelledby="planer-dni">
            <h2 id="planer-dni" className="checklist__naglowek">
              Dzień po dniu
            </h2>
            <ul className="planer__lista">
              {stan.okna.map((o) => (
                <li key={o.start}>
                  <KartaOkna o={o} />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <p className="muted planer__uwaga">
        To reguły z kursu, nie liczenie ptaków: ptaki nie czytają prognoz. Pływy pochodzą z modelu i mogą różnić się od
        tablicy portowej o ok. pół godziny, a w kanałach wyżej w marismas woda przychodzi później, więc przyjedź z zapasem
        i sprawdź{' '}
        <a href="https://tablademareas.com/es/cadiz/barbate/prevision/mareas" target="_blank" rel="noreferrer" className="text-link">
          tablicę pływów Barbate
          <span className="visually-hidden">, otwiera się w nowej karcie</span>
        </a>
        . Prognoza:{' '}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="text-link">
          Open-Meteo.com
          <span className="visually-hidden">, otwiera się w nowej karcie</span>
        </a>{' '}
        (CC BY 4.0).
      </p>
    </div>
  );
}
