'use client';

import { useEffect, useState } from 'react';
import { utworzMagazyn } from '@/lib/magazyn';
import {
  adresyPrognozy,
  godzina,
  MIEJSCA_PLANERA,
  najlepsze,
  oknaMiejsca,
  prognozaZOdpowiedzi,
  terazWHiszpanii,
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
/** The site last chosen: a convenience (a refused save just keeps the default), not in backups. */
const wybor = utworzMagazyn<Wybor>('wor:planer:v1', isWybor);

type Stan = { stan: 'wczytywanie' } | { stan: 'blad' } | { stan: 'gotowe'; okna: Okno[] };

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
  const miejsce: MiejscePlanera = zapisany?.miejsce ?? 'marismas-barbate';
  const [stan, setStan] = useState<Stan>({ stan: 'wczytywanie' });
  const [proba, setProba] = useState(0);

  useEffect(() => {
    const przerwij = new AbortController();
    const adresy = adresyPrognozy(miejsce);
    const pobierz = async (url: string) => {
      const r = await fetch(url, { signal: przerwij.signal });
      if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
      return r.json();
    };
    // A new site or a retry starts from the loading state; the fetch can only run in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStan({ stan: 'wczytywanie' });
    Promise.all([pobierz(adresy.pogoda), adresy.plywy ? pobierz(adresy.plywy) : Promise.resolve(null)])
      .then(([pogoda, plywy]) => {
        const prognoza = prognozaZOdpowiedzi(pogoda, plywy);
        if (!prognoza) throw new Error('unexpected forecast shape');
        setStan({ stan: 'gotowe', okna: oknaMiejsca(miejsce, prognoza, terazWHiszpanii()) });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('[planer] forecast failed', err);
        setStan({ stan: 'blad' });
      });
    return () => przerwij.abort();
  }, [miejsce, proba]);

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
          description="Planer potrzebuje internetu: pływy i pogodę pobiera z Open-Meteo. Sprawdź połączenie i spróbuj jeszcze raz."
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
          title="Brak dobrych okien w najbliższych dniach"
          description={plywy ? 'Przypływy w tych dniach wypadają nocą albo o świcie. Zajrzyj za kilka dni.' : 'Prognoza nie daje w tych dniach dobrego czasu.'}
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
                <li key={o.od}>
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
                <li key={o.od}>
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
