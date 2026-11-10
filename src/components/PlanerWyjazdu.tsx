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
import Link from 'next/link';
import { Accordion, AccordionItem, Badge, Button, Card, SegmentedControl, StateBlock } from './ds';

type Wybor = { miejsce?: MiejscePlanera };
function isWybor(v: unknown): v is Wybor {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const m = (v as Wybor).miejsce;
  return m === undefined || MIEJSCA_PLANERA.some((x) => x.value === m);
}
/** The site last chosen: a convenience, not in backups (a refused save keeps it for this visit only). */
const wybor = utworzMagazyn<Wybor>('wor:planer:v1', isWybor);

/** Switches the planner to a site and remembers it as the last choice (the observation points' planner link, which then scrolls to #kiedy). */
export const wybierzMiejscePlanera = (miejsce: MiejscePlanera) => wybor.zapisz({ miejsce });

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

/** The best window, in full: day, hours, conditions and why. */
function NajlepszeOkno({ o }: { o: Okno }) {
  const w = warunki(o.ocena);
  return (
    <Card padding="snug" accent="success">
      <div className="planer__okno">
        <p className="planer__dzien">Najlepiej: {dzien(o.data)}</p>
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

/** One day as a row: the day, the hours and a bar of the score; the reasons fold under it. */
function WierszDnia({ o, najlepszy }: { o: Okno; najlepszy: boolean }) {
  const w = warunki(o.ocena);
  return (
    <AccordionItem
      id={`okno-${o.start}`}
      title={
        <span className="planer__wiersz" data-najlepszy={najlepszy ? '' : undefined}>
          <span className="planer__wiersz-dzien">{dzien(o.data)}</span>
          <span className="planer__wiersz-godziny">
            {godzina(o.od)}–{godzina(o.do)}
          </span>
          {/* The badge says it in words; the bar shows the score at a glance. */}
          <span className="planer__ocena" aria-hidden="true" data-ton={w.ton}>
            <span style={{ inlineSize: `${Math.max(6, Math.min(100, o.ocena))}%` }} />
          </span>
          <span className="planer__wiersz-warunki">
            <Badge tone={w.ton}>{w.tekst}</Badge>
          </span>
        </span>
      }
    >
      <ul className="planer__powody">
        {o.powody.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </AccordionItem>
  );
}

/**
 * "Kiedy jechać": pick a site, and the page fetches ten days of tide and
 * weather from Open-Meteo, then lists the best times to be there by the
 * course's rules (lib/planer.ts): the best one in full, then day by day.
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
  const najlepszeOkno = stan.stan === 'gotowe' ? najlepsze(stan.okna, 1)[0] : undefined;

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
        {plywy ? 'Najlepiej, gdy woda rośnie: od ok. 3 h przed przypływem, za dnia.' : 'Najlepiej 11:00–16:30, bez deszczu i silnego wiatru.'}{' '}
        <Link href="/moduly/barbate/02-przed-wyjsciem" className="text-link">
          Skąd te zasady
        </Link>
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
        <div className="planer__wyniki">
          <NajlepszeOkno o={najlepszeOkno!} />
          <section className="stack" aria-labelledby="planer-dni">
            <h2 id="planer-dni" className="checklist__naglowek">
              Dzień po dniu
            </h2>
            <Accordion headingLevel={3}>
                {stan.okna.map((o) => (
                  <WierszDnia key={o.start} o={o} najlepszy={o.start === najlepszeOkno?.start} />
                ))}
            </Accordion>
          </section>
        </div>
      )}

      <p className="muted planer__uwaga">
        {plywy && (
          <>
            Pływy z modelu bywają ok. pół godziny przed{' '}
            <a href="https://tablademareas.com/es/cadiz/barbate/prevision/mareas" target="_blank" rel="noreferrer" className="text-link">
              tablicą portu Barbate
              <span className="visually-hidden">, otwiera się w nowej karcie</span>
            </a>
            , a w kanałach marismas woda przychodzi później: przyjedź z zapasem.{' '}
          </>
        )}
        Prognoza:{' '}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="text-link">
          Open-Meteo.com
          <span className="visually-hidden">, otwiera się w nowej karcie</span>
        </a>{' '}
        (CC BY 4.0).
      </p>
    </div>
  );
}
