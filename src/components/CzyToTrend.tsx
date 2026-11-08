'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  indeksy,
  klasa,
  KLASY_TRENDU,
  kolejnoscTemp,
  losZZiarna,
  nazwaKlasy,
  parametryRundy,
  RUNDY_TRENDU,
  seria,
  trendLogLiniowy,
  wynikRoku,
  zmianaCalkowita,
  zmianaRoczna,
  type KlasaTrendu,
  type SposobWyniku,
  type Trend,
} from '@/lib/trend';
import { odmiana } from '@/lib/odmiana';
import { Accordion, AccordionItem, Badge, Button, Card, Checkbox, RadioGroup, SegmentedControl, StateBlock, Table } from './ds';

/** The drawing's width before the page is measured; afterwards it is the box's own width in pixels, so labels keep their size on a phone. */
const SZER_POCZATKOWA = 640;
const MARGINES = { lewo: 44, prawo: 16, gora: 16, dol: 32 };

const liczba = (n: number, cyfry = 2) => n.toLocaleString('pl-PL', { minimumFractionDigits: cyfry, maximumFractionDigits: cyfry });
const procent = (p: number) => {
  const r = Math.round(p * 10) / 10;
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r).toLocaleString('pl-PL', { maximumFractionDigits: 1 })}%`;
};

type Rysunek = {
  lata: number[];
  indeks: number[];
  /** The trend fitted to the index (not to the raw results), drawn once the answer is in. */
  trend?: Trend;
  /** The true population as an index of its first year. */
  prawda?: number[];
  log: boolean;
  opis: string;
};

/** Ticks for the index axis: on the log scale the doublings and halvings, on the linear one steps of 0.25 or 0.5. */
function podzialka(min: number, max: number, log: boolean): number[] {
  if (log) return [0.125, 0.25, 0.5, 1, 2, 4, 8].filter((v) => v >= min * 0.999 && v <= max * 1.001);
  const krok = krokPodzialki(max);
  return Array.from({ length: Math.round(max / krok) + 1 }, (_, i) => i * krok);
}

const krokPodzialki = (max: number) => (max > 2.5 ? 1 : max > 1.5 ? 0.5 : 0.25);

/**
 * The index year by year as dots; after the answer, the log-linear trend as a
 * line and the true population as a dashed line, each named in the legend
 * (shape as well as colour). One axis: everything is an index of its first year.
 */
function Wykres({ lata, indeks, trend, prawda, log, opis }: Rysunek) {
  const pole = useRef<HTMLDivElement>(null);
  const [szer, setSzer] = useState(SZER_POCZATKOWA);
  useEffect(() => {
    const el = pole.current;
    if (!el) return;
    const obserwator = new ResizeObserver(([w]) => setSzer(Math.max(260, Math.round(w.contentRect.width))));
    obserwator.observe(el);
    return () => obserwator.disconnect();
  }, []);
  // Wide enough for a calm slope, tall enough on a phone to tell 0.9 from 1.1.
  const wys = Math.round(Math.min(320, Math.max(220, szer * 0.47)));
  const wszystkie = [...indeks, ...(prawda ?? []), 1];
  // The trend is fitted to the index itself, so its line is in index units.
  const naTrendzie = trend ? lata.map((_, t) => Math.exp(trend.wyrazWolny + trend.nachylenie * t)) : [];
  const dane = [...wszystkie, ...naTrendzie].filter((v) => v > 0);
  let min = Math.min(...dane);
  let max = Math.max(...dane);
  if (log) {
    min = Math.min(0.5, 2 ** Math.floor(Math.log2(min)));
    max = Math.max(2, 2 ** Math.ceil(Math.log2(max)));
  } else {
    min = 0;
    // Up to the next tick, so the highest dot sits under a labelled line.
    const krok = krokPodzialki(max);
    max = Math.max(1.5, Math.ceil(max / krok) * krok);
  }
  const x = (t: number) => MARGINES.lewo + (t / Math.max(1, lata.length - 1)) * (szer - MARGINES.lewo - MARGINES.prawo);
  const y = (v: number) => {
    const u = log ? (Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min)) : (v - min) / (max - min);
    return wys - MARGINES.dol - u * (wys - MARGINES.gora - MARGINES.dol);
  };
  const linia = (wartosci: number[]) => wartosci.map((v, t) => `${t ? 'L' : 'M'}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  // The base year and the last always, every co-th between, none crowding the last.
  const co = Math.ceil(lata.length / Math.max(3, Math.floor(szer / 80)));

  return (
    <div ref={pole}>
      <svg className="trend__wykres" viewBox={`0 0 ${szer} ${wys}`} role="img" aria-label={opis}>
        {podzialka(min, max, log).map((v) => (
          <g key={v}>
            <line className={v === 1 ? 'trend__baza' : 'trend__siatka'} x1={MARGINES.lewo} x2={szer - MARGINES.prawo} y1={y(v)} y2={y(v)} />
            <text className="trend__opis-osi" x={MARGINES.lewo - 6} y={y(v)} textAnchor="end" dominantBaseline="middle">
              {v.toLocaleString('pl-PL', { maximumFractionDigits: 3 })}
            </text>
          </g>
        ))}
        {lata.map((rok, t) =>
          t === 0 || t === lata.length - 1 || (t % co === 0 && lata.length - 1 - t >= co * 0.6) ? (
            <text key={rok} className="trend__opis-osi" x={x(t)} y={wys - MARGINES.dol + 18} textAnchor={t === 0 ? 'start' : t === lata.length - 1 ? 'end' : 'middle'}>
              {rok}
            </text>
          ) : null,
        )}
        {prawda && <path className="trend__prawda" d={linia(prawda)} />}
        {trend && <path className="trend__linia" d={linia(naTrendzie)} />}
        <path className="trend__laczenie" d={linia(indeks)} />
        {indeks.map((v, t) => (
          <circle key={lata[t]} className="trend__punkt" cx={x(t)} cy={y(v)} r={4}>
            <title>{`${lata[t]}: indeks ${liczba(v)}`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

type Wynik = { odpowiedz: KlasaTrendu; poprawna: KlasaTrendu };

/**
 * A15's exercise: five series of counts on one plot, from long and calm to
 * short and restless. The reader classes each as PECBMS would; the answer
 * shows the log-linear trend with its 95% interval, the class the data
 * support, and how the population really changed, and lets her recompute the
 * series from the largest of the three counts instead of their mean. The
 * class is judged on the data, not on the truth: that is all a monitoring
 * scheme has. Nothing is stored.
 */
export function CzyToTrend() {
  // Drawn after mount from a random seed, so the server and the browser agree.
  const [ziarno, setZiarno] = useState<number | null>(null);
  const [runda, setRunda] = useState(0);
  const [odpowiedz, setOdpowiedz] = useState<KlasaTrendu | ''>('');
  const [blad, setBlad] = useState<string>();
  const [wyniki, setWyniki] = useState<Wynik[]>([]);
  const [koniec, setKoniec] = useState(false);
  const [log, setLog] = useState(false);
  const [sposob, setSposob] = useState<SposobWyniku>('srednia');
  const fokus = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setZiarno(Math.floor(Math.random() * 2147483646) + 1);
  }, []);

  const tempa = useMemo(() => (ziarno === null ? [] : kolejnoscTemp(losZZiarna(ziarno))), [ziarno]);
  const dane = useMemo(() => {
    if (ziarno === null) return null;
    const los = losZZiarna(ziarno + (runda + 1) * 7919);
    const p = parametryRundy(runda, tempa[runda], los);
    return { p, s: seria(p, los) };
  }, [ziarno, runda, tempa]);

  const odpowiedziano = wyniki.length > runda;
  useEffect(() => {
    if (odpowiedziano || koniec) fokus.current?.querySelector<HTMLElement>('[tabindex="-1"]')?.focus();
  }, [odpowiedziano, koniec]);

  if (!dane) return <StateBlock state="loading" title="Przygotowuję serię liczeń" scope="inline" />;

  const { p, s } = dane;
  const zeSredniej = s.liczenia.map((l) => wynikRoku(l, 'srednia'));
  const trendSredniej = trendLogLiniowy(zeSredniej);
  const poprawna = klasa(trendSredniej);
  const pokazany = odpowiedziano ? sposob : 'srednia';
  const wynikiRoku = s.liczenia.map((l) => wynikRoku(l, pokazany));
  const indeks = indeksy(wynikiRoku);
  const trend = pokazany === 'srednia' ? trendSredniej : trendLogLiniowy(wynikiRoku);
  const prawda = indeksy(s.prawdziwe);
  const ostatnia = runda === RUNDY_TRENDU.length - 1;

  const sprawdz = () => {
    if (!odpowiedz) {
      setBlad('Wybierz jedną z sześciu kategorii.');
      return;
    }
    setBlad(undefined);
    setWyniki([...wyniki, { odpowiedz, poprawna }]);
  };
  const dalej = () => {
    if (ostatnia) {
      setKoniec(true);
      return;
    }
    setRunda(runda + 1);
    setOdpowiedz('');
    setSposob('srednia');
  };
  const odNowa = () => {
    setZiarno(Math.floor(Math.random() * 2147483646) + 1);
    setRunda(0);
    setWyniki([]);
    setOdpowiedz('');
    setSposob('srednia');
    setKoniec(false);
  };

  if (koniec) {
    const trafione = wyniki.filter((w) => w.odpowiedz === w.poprawna).length;
    return (
      <Card actions={<Button onClick={odNowa}>Nowe serie</Button>}>
        <div className="cwiczenie" ref={fokus}>
          <p className="cwiczenie__tytul" tabIndex={-1}>
            Trafione kategorie: {trafione} z {wyniki.length}
          </p>
          <p className="cwiczenie__polecenie">
            Długa, spokojna seria zwykle mówi prawdę o populacji. Krótka i rozchwiana często pozwala uczciwie powiedzieć tylko „niepewny”, nawet gdy populacja naprawdę spada. Dlatego monitoring trwa latami, a pojedynczy zły rok to jeszcze nie trend.
          </p>
        </div>
      </Card>
    );
  }

  const zmianaPrawdziwa = zmianaRoczna(Math.exp(p.tempo));
  const opisWykresu = odpowiedziano
    ? `Indeks liczebności z lat ${s.lata[0]}–${s.lata.at(-1)}, linia trendu ${procent(zmianaRoczna(trend.mnoznik))} rocznie i prawdziwa liczebność populacji (linia przerywana).`
    : `Indeks liczebności z lat ${s.lata[0]}–${s.lata.at(-1)}: ${indeks.map((v, t) => `${s.lata[t]} ${liczba(v)}`).join(', ')}.`;

  return (
    <Card actions={odpowiedziano ? <Button onClick={dalej}>{ostatnia ? 'Zobacz wynik' : 'Następna seria'}</Button> : <Button onClick={sprawdz}>Sprawdź</Button>}>
      <div className="cwiczenie trend" ref={fokus}>
        <p className="cwiczenie__polecenie">
          Seria {runda + 1} z {RUNDY_TRENDU.length}. Jedna powierzchnia, {s.lata.length} lat, w każdym sezonie trzy kontrole. Każda kropka to {pokazany === 'srednia' ? 'średnia z trzech liczeń' : 'największe z trzech liczeń'}{' '}
          jako wielokrotność wyniku z {s.lata[0]} roku. Jak PECBMS sklasyfikowałby ten trend?
        </p>
        <Wykres lata={s.lata} indeks={indeks} trend={odpowiedziano ? trendLogLiniowy(indeks) : undefined} prawda={odpowiedziano ? prawda : undefined} log={log} opis={opisWykresu} />
        <ul className="trend__legenda">
          <li>
            <svg viewBox="0 0 24 12" aria-hidden="true">
              <circle className="trend__punkt" cx="12" cy="6" r="4" />
            </svg>
            Indeks z liczeń
          </li>
          {odpowiedziano && (
            <>
              <li>
                <svg viewBox="0 0 24 12" aria-hidden="true">
                  <line className="trend__linia" x1="0" x2="24" y1="6" y2="6" />
                </svg>
                Trend log-liniowy
              </li>
              <li>
                <svg viewBox="0 0 24 12" aria-hidden="true">
                  <line className="trend__prawda" x1="0" x2="24" y1="6" y2="6" />
                </svg>
                Prawdziwa liczebność
              </li>
            </>
          )}
        </ul>
        <Checkbox label="Skala logarytmiczna" checked={log} onChange={(e) => setLog(e.target.checked)} />

        {!odpowiedziano && (
          <RadioGroup
            legend="Kategoria trendu"
            value={odpowiedz}
            onChange={(v) => setOdpowiedz(v as KlasaTrendu)}
            error={blad}
            options={KLASY_TRENDU.map((k) => ({ value: k.id, label: k.nazwa, description: k.opis }))}
          />
        )}

        {odpowiedziano && (
          <div className="quiz__feedback" aria-live="polite" tabIndex={-1}>
            <Badge tone={wyniki[runda].odpowiedz === poprawna ? 'success' : 'critical'}>
              {wyniki[runda].odpowiedz === poprawna ? 'Ta sama kategoria' : `Dane mówią: ${nazwaKlasy(poprawna).toLowerCase()}`}
            </Badge>
            <span>
              Trend ze średnich: {procent(zmianaRoczna(trendSredniej.mnoznik))} rocznie, przedział 95% od {procent(zmianaRoczna(trendSredniej.dolna))} do{' '}
              {procent(zmianaRoczna(trendSredniej.gorna))}, czyli kategoria „{nazwaKlasy(poprawna).toLowerCase()}”.{' '}
              {p.tempo === 0 ? 'Prawdziwa populacja nie miała trendu: wahała się wokół stałej średniej i liczyła' : `Prawdziwa populacja zmieniała się średnio o ${procent(zmianaPrawdziwa)} rocznie i liczyła`} {s.prawdziwe[0]} {odmiana(s.prawdziwe[0], ['ptaka', 'ptaki', 'ptaków'])} na początku, a {s.prawdziwe.at(-1)}{' '}
              {odmiana(s.prawdziwe.at(-1)!, ['ptaka', 'ptaki', 'ptaków'])} na końcu. Liczący widział przy jednej kontroli
              średnio ok. {Math.round(p.wykrywalnosc * 100)}% z nich.
            </span>
          </div>
        )}

        {odpowiedziano && (
          <>
            <SegmentedControl
              legend="Wynik sezonu"
              showLegend
              value={sposob}
              onChange={(v) => setSposob(v as SposobWyniku)}
              options={[
                { value: 'srednia', label: 'Średnia z trzech' },
                { value: 'najwiekszy', label: 'Największy z trzech' },
              ]}
            />
            {sposob === 'najwiekszy' && (
              <p className="cwiczenie__wynik">
                Z największego liczenia: {procent(zmianaRoczna(trend.mnoznik))} rocznie, przedział od {procent(zmianaRoczna(trend.dolna))} do{' '}
                {procent(zmianaRoczna(trend.gorna))}, kategoria „{nazwaKlasy(klasa(trend)).toLowerCase()}”. Wyniki są wyższe, ale to dwa z trzech liczeń wyrzucone do kosza.{' '}
                {klasa(trend) === poprawna
                  ? 'Tu wahania między latami są dużo większe niż różnice między kontrolami, więc kategoria się nie zmienia.'
                  : `Tym razem kategoria jest inna niż ze średnich („${nazwaKlasy(poprawna).toLowerCase()}”): z mniejszej części danych wychodzi inny wniosek.`}
              </p>
            )}
            <p className="cwiczenie__wynik">
              Cała seria: {procent(zmianaCalkowita(trend.mnoznik, s.lata.length))} od {s.lata[0]} roku według linii trendu.
            </p>
          </>
        )}

        <Accordion headingLevel={3}>
          <AccordionItem title="Liczenia w tabeli">
            <Table
              caption={`Liczenia z lat ${s.lata[0]}–${s.lata.at(-1)}`}
              hideCaption
              responsive="scroll"
              density="compact"
              rowKey={(r) => String(r.rok)}
              rows={s.lata.map((rok, t) => ({ rok, t }))}
              columns={[
                { key: 'rok', header: 'Rok', cell: (r) => String(r.rok) },
                { key: 'liczenia', header: 'Trzy liczenia', cell: (r) => s.liczenia[r.t].join(', ') },
                { key: 'wynik', header: pokazany === 'srednia' ? 'Średnia' : 'Największe', numeric: true, cell: (r) => liczba(wynikiRoku[r.t], pokazany === 'srednia' ? 1 : 0) },
                { key: 'indeks', header: 'Indeks', numeric: true, cell: (r) => liczba(indeks[r.t]) },
                ...(odpowiedziano ? [{ key: 'prawda', header: 'Ptaków naprawdę', numeric: true, cell: (r: { t: number }) => String(s.prawdziwe[r.t]) }] : []),
              ]}
            />
          </AccordionItem>
        </Accordion>
      </div>
    </Card>
  );
}
