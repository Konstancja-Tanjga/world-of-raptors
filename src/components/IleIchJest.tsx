'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  kontrola,
  kontroliDoPewnosci,
  kumulatywna,
  liczbaSamcow,
  losZZiarna,
  oszacowanie,
  rozkladWynikow,
  rozmiescSamce,
  uslyszaneChocRaz,
  WARUNKI,
  zakresWynikow,
  type WariantIleIchJest,
  type Warunki,
} from '@/lib/wykrywalnosc';
import { Badge, Button, Input, SegmentedControl, Slider, StateBlock } from './ds';

/** The most visits one plot takes: enough to see the counts spread and the "heard at least once" number climb. */
const NAJWIECEJ_KONTROLI = 8;
const WIRTUALNYCH = 1000;
const liczba = (n: number, cyfry = 0) => n.toLocaleString('pl-PL', { maximumFractionDigits: cyfry });
const procent = (x: number) => `${liczba(Math.round(x * 100))}%`;
/** "samiec", "samce", "samców" after a number, as Polish declines it. */
const samcow = (n: number) => (n === 1 ? 'samiec' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'samce' : 'samców');
const kontroli = (n: number) => (n === 1 ? 'kontrola' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'kontrole' : 'kontroli');

/**
 * A14's detectability exercise. "kontrole": a plot with a hidden number of
 * territorial tawny owls; each night's visit hears only those that call
 * (each with the chance the chosen conditions give), the reader visits as
 * often as she likes, guesses how many there are, and then sees them all and
 * the spread of a thousand virtual visits, as in the GIOŚ guide's figures
 * 2.1–2.2. "powroty": how many empty visits rule a species out, for a chosen
 * detectability and certainty. Nothing moves, so there is nothing to reduce;
 * nothing is stored.
 */
export function IleIchJest({ wariant }: { wariant: WariantIleIchJest }) {
  return wariant === 'powroty' ? <IleRazyWrocic /> : <KontrolePowierzchni />;
}

function KontrolePowierzchni() {
  // Drawn after mount from a random seed, so the server and the browser agree.
  const [ziarno, setZiarno] = useState<number | null>(null);
  const [warunki, setWarunki] = useState<Warunki>('przecietna');
  const [kontrole, setKontrole] = useState<boolean[][]>([]);
  const [szacunek, setSzacunek] = useState('');
  const [blad, setBlad] = useState<string>();
  const [odkryte, setOdkryte] = useState<number | null>(null);
  const wynikRef = useRef<HTMLDivElement>(null);
  const szacunekRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  // Set by "Nowa powierzchnia", whose button unmounts: focus then goes to the new plot's first control.
  const poNowej = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setZiarno(Math.floor(Math.random() * 2147483646) + 1);
  }, []);

  const p = WARUNKI.find((w) => w.id === warunki)!.p;
  const plansza = useMemo(() => {
    if (ziarno === null) return null;
    const los = losZZiarna(ziarno);
    return { samce: rozmiescSamce(liczbaSamcow(los), los), los: losZZiarna(ziarno * 31 + 7) };
  }, [ziarno]);

  useEffect(() => {
    if (odkryte !== null) wynikRef.current?.focus();
  }, [odkryte]);
  // After the last night the night button is disabled: focus moves on to the estimate.
  useEffect(() => {
    if (kontrole.length >= NAJWIECEJ_KONTROLI) szacunekRef.current?.focus();
  }, [kontrole.length]);
  useEffect(() => {
    if (poNowej.current && ziarno !== null) {
      poNowej.current = false;
      startRef.current?.focus();
    }
  }, [ziarno]);

  if (!plansza || ziarno === null) return <StateBlock state="loading" title="Przygotowuję powierzchnię" scope="inline" />;

  const n = plansza.samce.length;
  const wyniki = kontrole.map((k) => k.filter(Boolean).length);
  const ostatnia = kontrole.at(-1);
  const zrobKontrole = () => setKontrole([...kontrole, kontrola(n, p, plansza.los)]);
  const sprawdz = () => {
    const x = Number(szacunek.trim());
    if (!Number.isInteger(x) || x < 0) {
      setBlad('Wpisz liczbę samców, np. 9.');
      return;
    }
    setBlad(undefined);
    setOdkryte(x);
  };
  const nowa = () => {
    poNowej.current = true;
    setZiarno(Math.floor(Math.random() * 2147483646) + 1);
    setKontrole([]);
    setSzacunek('');
    setOdkryte(null);
  };

  const opis =
    odkryte !== null
      ? `Powierzchnia z ${n} rewirami puszczyków; w ostatniej kontroli odezwało się ${wyniki.at(-1) ?? 0}`
      : ostatnia
        ? `Powierzchnia nocą; w ostatniej kontroli usłyszano ${wyniki.at(-1)} ${samcow(wyniki.at(-1)!)}`
        : 'Powierzchnia nocą, jeszcze bez kontroli';

  return (
    <div className="ile">
      <div className="ile__uklad">
        <svg className="ile__plansza scena" viewBox="0 0 100 100" role="img" aria-label={opis}>
          {/* A 2 × 2 km plot as four 1 km squares, the grid the guide draws plots on. */}
          <path d="M50 1V99M1 50H99" className="ile__siatka" />
          {plansza.samce.map((s, i) => {
            const glos = ostatnia?.[i];
            const cx = 1 + s.x * 98;
            const cy = 1 + s.y * 98;
            if (glos) {
              return (
                // Keyed by night, so the fade-in plays again for a male heard on consecutive nights.
                <g key={`${kontrole.length}-${i}`} className="ile__samiec ile__samiec--glos">
                  <circle cx={cx} cy={cy} r="6" className="ile__fala" />
                  <circle cx={cx} cy={cy} r="2.6" />
                </g>
              );
            }
            return odkryte !== null ? <circle key={i} cx={cx} cy={cy} r="2.4" className="ile__samiec ile__samiec--cichy" /> : null;
          })}
        </svg>
        <div className="ile__panel">
          {kontrole.length === 0 ? (
            <>
              <p className="ile__tekst">
                Na tej powierzchni (2 × 2 km lasu i polan) mają rewiry puszczyki. Ile? Tego nie wiesz. Każdej nocy samiec odzywa się albo milczy, a Ty słyszysz tylko tych, którzy akurat się odezwali.
              </p>
              <SegmentedControl
                legend="Warunki nasłuchu"
                showLegend
                value={warunki}
                onChange={(v) => setWarunki(v as Warunki)}
                options={WARUNKI.map((w) => ({ value: w.id, label: w.etykieta }))}
              />
              <p className="ile__tekst">W tych warunkach odzywa się mniej więcej {procent(p)} samców. Za każdą kontrolę losuję od nowa, kto zahuka.</p>
            </>
          ) : (
            <p className="ile__tekst">
              {WARUNKI.find((w) => w.id === warunki)!.etykieta}: odzywa się ok. {procent(p)} samców. Kontrole: {wyniki.join(', ')}. Usłyszane choć raz: {uslyszaneChocRaz(kontrole)}.
            </p>
          )}
          {odkryte === null && (
            <div className="ile__przyciski">
              <Button ref={startRef} onClick={zrobKontrole} disabled={kontrole.length >= NAJWIECEJ_KONTROLI} variant={kontrole.length ? 'secondary' : 'primary'}>
                {kontrole.length ? 'Następna noc' : 'Zrób pierwszą kontrolę'}
              </Button>
            </div>
          )}
          {/* Mounted from the start, so screen readers announce the first night too. */}
          <p className="ile__tekst" aria-live="polite">
            {ostatnia && odkryte === null
              ? `Noc ${kontrole.length}: usłyszano ${wyniki.at(-1)} ${samcow(wyniki.at(-1)!)}.${kontrole.length >= NAJWIECEJ_KONTROLI ? ' To ostatnia noc na tej powierzchni.' : ''}`
              : ''}
          </p>
          {ostatnia && odkryte === null && (
            <>
              <Input ref={szacunekRef} label="Ile samców ma tu rewiry?" inputMode="numeric" value={szacunek} onChange={(e) => setSzacunek(e.target.value)} error={blad} autoComplete="off" />
              <div className="ile__przyciski">
                <Button onClick={sprawdz}>Sprawdź</Button>
              </div>
            </>
          )}
        </div>
      </div>
      {odkryte !== null && <Wynik n={n} p={p} wyniki={wyniki} kontrole={kontrole} szacunek={odkryte} ziarno={ziarno} wynikRef={wynikRef} nowa={nowa} />}
    </div>
  );
}

function Wynik({
  n,
  p,
  wyniki,
  kontrole,
  szacunek,
  ziarno,
  wynikRef,
  nowa,
}: {
  n: number;
  p: number;
  wyniki: number[];
  kontrole: boolean[][];
  szacunek: number;
  ziarno: number;
  wynikRef: React.RefObject<HTMLDivElement | null>;
  nowa: () => void;
}) {
  const rozklad = useMemo(() => rozkladWynikow(n, p, WIRTUALNYCH, ziarno * 17 + 3), [n, p, ziarno]);
  const [od, doK] = zakresWynikow(rozklad, 0.95);
  const ocena = oszacowanie(wyniki, p)!;
  const trafiony = Math.abs(szacunek - n) <= Math.max(2, Math.round(n * 0.2));
  const maks = Math.max(...rozklad);
  const szer = 100 / (n + 1);
  const twoje = new Set(wyniki);
  return (
    <div className="ile__wynik" ref={wynikRef} tabIndex={-1}>
      <div className="quiz__feedback">
        <Badge tone={trafiony ? 'success' : 'warning'}>{trafiony ? 'Blisko prawdy' : 'Daleko od prawdy'}</Badge>
        <span>
          Rewirów było {n}. Twoja ocena: {szacunek}. Najwięcej, co usłyszałaś w jedną noc: {Math.max(...wyniki)}, a choć raz: {uslyszaneChocRaz(kontrole)} z {n}. Średnia z{' '}
          {wyniki.length} kontroli podzielona przez {liczba(p, 2)} daje ok. {liczba(ocena, 1)}.
        </span>
      </div>
      <figure className="ile__rozklad">
        <svg viewBox="0 0 100 46" role="img" aria-label={`Wyniki ${WIRTUALNYCH} wirtualnych kontroli tej powierzchni: w 95% z nich usłyszano od ${od} do ${doK} samców z ${n}`}>
          {rozklad.map((x, k) => {
            const h = maks ? (x / maks) * 36 : 0;
            return (
              <rect
                key={k}
                x={k * szer + szer * 0.12}
                y={38 - h}
                width={szer * 0.76}
                height={h}
                className={twoje.has(k) ? 'ile__slupek ile__slupek--twoj' : 'ile__slupek'}
              />
            );
          })}
          <line x1="0" x2="100" y1="38" y2="38" className="ile__os" />
          {rozklad.map((_, k) =>
            k % (n > 10 ? 2 : 1) === 0 || k === n ? (
              <text key={k} x={k * szer + szer / 2} y="44" className="ile__etykieta">
                {k}
              </text>
            ) : null,
          )}
        </svg>
        <figcaption>
          Gdybyś wróciła tu {liczba(WIRTUALNYCH)} razy w tych samych warunkach, tak rozłożyłyby się wyniki (liczba usłyszanych samców pod słupkiem). W 95 nocach na 100 usłyszałabyś od {od} do {doK}; wyraźniejsze słupki to wyniki Twoich kontroli. Żaden z nich nie był błędem: tak działa przypadek.
        </figcaption>
      </figure>
      <div className="ile__przyciski">
        <Button onClick={nowa}>Nowa powierzchnia</Button>
      </div>
    </div>
  );
}

function IleRazyWrocic() {
  const [d, setD] = useState(30);
  const [pewnosc, setPewnosc] = useState(95);
  const n = kontroliDoPewnosci(d / 100, pewnosc / 100);
  const NAJWIECEJ_SLUPKOW = 40;
  const pokaz = Math.max(10, Math.min(n + 2, NAJWIECEJ_SLUPKOW));
  const k3 = kumulatywna(d / 100, 3);
  const szer = 100 / pokaz;
  const prog = 40 - (pewnosc / 100) * 36;
  return (
    <div className="ile">
      <div className="ile__panel">
        <Slider
          label="Szansa, że wykryjesz gatunek podczas jednej kontroli (D)"
          min={5}
          max={90}
          step={5}
          value={d}
          onChange={setD}
          formatValue={(v) => `${v}%`}
        />
        <Slider label="Pewność, której potrzebujesz" min={80} max={99} step={1} value={pewnosc} onChange={setPewnosc} formatValue={(v) => `${v}%`} />
        <p className="ile__tekst ile__liczba" aria-live="polite">
          {n} {kontroli(n)} bez wyniku
        </p>
        <p className="ile__tekst">
          Gatunek, który wykrywasz w {d} kontrolach na 100, wykryłabyś, gdyby tu był, z szansą co najmniej {pewnosc}% dopiero po{' '}
          {n === 1 ? '1 pustej kontroli' : `${n} pustych kontrolach z rzędu`}. Po trzech pustych nocach ta szansa wynosi {procent(k3)}. To jeszcze nie pewność, że gatunku nie ma: ta zależy też od tego, jak bardzo spodziewałaś się go przed liczeniem.
        </p>
      </div>
      <figure className="ile__rozklad">
        <svg viewBox="0 0 100 42" role="img" aria-label={`Szansa wykrycia gatunku po kolejnych kontrolach; próg ${pewnosc}% osiągnięty po ${n}`}>
          {Array.from({ length: pokaz }, (_, i) => {
            const k = kumulatywna(d / 100, i + 1);
            const h = k * 36;
            return <rect key={i} x={i * szer + szer * 0.12} y={40 - h} width={szer * 0.76} height={h} className={i + 1 >= n ? 'ile__slupek ile__slupek--twoj' : 'ile__slupek'} />;
          })}
          <line x1="0" x2="100" y1={prog} y2={prog} className="ile__prog" />
          <line x1="0" x2="100" y1="40" y2="40" className="ile__os" />
        </svg>
        <figcaption>
          Słupek to szansa, że po tylu kontrolach gatunek obecny na powierzchni choć raz się pokazał (pierwszy słupek: jedna kontrola). Linia to Twoja pewność; wyraźniejsze słupki już ją przekraczają.
          {n > NAJWIECEJ_SLUPKOW && ` Wykres kończy się na ${NAJWIECEJ_SLUPKOW}. kontroli, a próg przekroczysz dopiero po ${n}.`}
        </figcaption>
      </figure>
    </div>
  );
}
