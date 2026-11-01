'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { blokDziesieciu, liczebnosc, losZZiarna, ocenSzacunek, RUNDY_STADA, rysujStado, type PtakStada } from '@/lib/stado';
import { Badge, Button, Card, Checkbox, Input, StateBlock } from './ds';

/** How long a flock stays in view: long enough to count a block and size it up, not to count every bird. */
const SEKUNDY = [8, 12, 15];
const SZER = 1000;
const WYS = 560;

type Etap = 'start' | 'patrz' | 'szacuj' | 'wynik' | 'koniec';

/** The flock on a shore: water above, mud below, each bird a body and a head; the block of ten in gold. */
function Brzeg({ ptaki, blok, opis }: { ptaki: PtakStada[]; blok?: ReadonlySet<number>; opis: string }) {
  return (
    <svg className="stado__brzeg" viewBox={`0 0 ${SZER} ${WYS}`} role="img" aria-label={opis}>
      <rect width={SZER} height={WYS * 0.34} className="stado__woda" />
      <rect y={WYS * 0.34} width={SZER} height={WYS * 0.66} className="stado__mul" />
      {ptaki.map((p, i) => {
        const x = p.x * SZER;
        const y = p.y * WYS;
        const r = p.r * SZER;
        // Half face left, half right, as a resting flock does.
        const zwrot = i % 2 ? 1 : -1;
        return (
          <g key={i} className={blok?.has(i) ? 'stado__ptak stado__ptak--blok' : 'stado__ptak'}>
            <ellipse cx={x} cy={y} rx={r * 1.5} ry={r * 0.85} />
            <circle cx={x + zwrot * r * 1.3} cy={y - r * 0.7} r={r * 0.55} />
          </g>
        );
      })}
    </svg>
  );
}

/**
 * B9's flock count: three flocks of waders, each in view for a few seconds,
 * then an estimate. The answer shows one block of ten in gold, so the reader
 * sees how many such blocks the flock held, and says whether the miss was
 * under or over (counters usually undercount big flocks). The clock can be
 * switched off. Nothing is stored.
 */
export function LiczenieStada() {
  // Drawn after mount from a random seed, so the server and the browser agree.
  const [ziarno, setZiarno] = useState<number | null>(null);
  const [runda, setRunda] = useState(0);
  const [etap, setEtap] = useState<Etap>('start');
  const [zostalo, setZostalo] = useState(0);
  const [bezCzasu, setBezCzasu] = useState(false);
  const [szacunek, setSzacunek] = useState('');
  const [blad, setBlad] = useState<string>();
  const [wyniki, setWyniki] = useState<{ szacunek: number; prawda: number }[]>([]);
  const fokus = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setZiarno(Math.floor(Math.random() * 2147483646) + 1);
  }, []);

  const ptaki = useMemo(() => {
    if (ziarno === null) return [];
    const los = losZZiarna(ziarno + runda * 7919);
    return rysujStado(liczebnosc(runda, los), los);
  }, [ziarno, runda]);
  const blok = useMemo(() => new Set(blokDziesieciu(ptaki)), [ptaki]);

  useEffect(() => {
    if (etap !== 'patrz' || bezCzasu) return;
    if (zostalo <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEtap('szacuj');
      return;
    }
    const t = setTimeout(() => setZostalo((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [etap, zostalo, bezCzasu]);

  useEffect(() => {
    if (etap === 'szacuj') fokus.current?.querySelector<HTMLInputElement>('input[inputmode]')?.focus();
    if (etap === 'wynik' || etap === 'koniec') fokus.current?.querySelector<HTMLElement>('[tabindex="-1"]')?.focus();
  }, [etap]);

  if (ziarno === null) return <StateBlock state="loading" title="Przygotowuję stado" scope="inline" />;

  const prawda = ptaki.length;
  const ostatnia = runda === RUNDY_STADA.length - 1;
  const pokaz = () => {
    setZostalo(SEKUNDY[runda]);
    setEtap('patrz');
  };
  const sprawdz = () => {
    const n = Number(szacunek.trim());
    if (!Number.isInteger(n) || n <= 0) {
      setBlad('Wpisz liczbę ptaków, np. 120.');
      return;
    }
    setBlad(undefined);
    setWyniki([...wyniki, { szacunek: n, prawda }]);
    setEtap('wynik');
  };
  const dalej = () => {
    if (ostatnia) {
      setEtap('koniec');
      return;
    }
    setRunda(runda + 1);
    setSzacunek('');
    setEtap('start');
  };
  const odNowa = () => {
    setZiarno(Math.floor(Math.random() * 2147483646) + 1);
    setRunda(0);
    setWyniki([]);
    setSzacunek('');
    setEtap('start');
  };

  if (etap === 'koniec') {
    const trafione = wyniki.filter((w) => ocenSzacunek(w.szacunek, w.prawda).trafiony).length;
    return (
      <Card actions={<Button onClick={odNowa}>Nowe stada</Button>}>
        <div className="cwiczenie" ref={fokus}>
          <p className="cwiczenie__tytul" tabIndex={-1}>
            Trafione w granicach 20%: {trafione} z {wyniki.length}
          </p>
          <p className="cwiczenie__polecenie">
            W terenie liczy się tak samo: dziesiątka, potem ile dziesiątek mieści stado, przy setkach blok po sto. Duże stada łatwo zaniżyć. Zamiast poprawiać liczbę na oko, popraw metodę: mniejszy blok, osobno tył stada, a jeśli zdążysz, policz drugi raz.
          </p>
        </div>
      </Card>
    );
  }

  const ocena = etap === 'wynik' ? ocenSzacunek(wyniki[runda].szacunek, prawda) : null;
  const akcja =
    etap === 'start' ? (
      <Button onClick={pokaz}>Pokaż stado</Button>
    ) : etap === 'patrz' ? (
      <Button onClick={() => setEtap('szacuj')}>Już wiem, ile ich jest</Button>
    ) : etap === 'szacuj' ? (
      <Button onClick={sprawdz}>Sprawdź</Button>
    ) : (
      <Button onClick={dalej}>{ostatnia ? 'Zobacz wynik' : 'Następne stado'}</Button>
    );

  return (
    <Card actions={akcja}>
      <div className="cwiczenie stado" ref={fokus}>
        <p className="cwiczenie__polecenie">
          Stado {runda + 1} z {RUNDY_STADA.length}.{' '}
          {etap === 'start' &&
            (bezCzasu
              ? 'Policz blok dziesięciu ptaków, sprawdź, ile takich bloków mieści stado, i podaj szacunek.'
              : `Stado będzie widać przez ${SEKUNDY[runda]} sekund. Nie licz po jednym: policz dziesięć i sprawdź, ile takich dziesiątek mieści stado.`)}
          {etap === 'patrz' && !bezCzasu && <span aria-live="off"> Zostało {zostalo} s.</span>}
          {etap === 'szacuj' && ' Stado się zerwało. Ile było ptaków?'}
        </p>
        {etap === 'start' && <Checkbox label="Bez limitu czasu" checked={bezCzasu} onChange={(e) => setBezCzasu(e.target.checked)} />}
        {(etap === 'patrz' || etap === 'wynik') && (
          <Brzeg
            ptaki={ptaki}
            blok={etap === 'wynik' ? blok : undefined}
            opis={etap === 'wynik' ? `Stado ${prawda} ptaków; dziesięć z nich wyróżnionych na złoto` : 'Stado siewkowców odpoczywających na mule'}
          />
        )}
        {etap === 'szacuj' && (
          <Input label="Twój szacunek" inputMode="numeric" value={szacunek} onChange={(e) => setSzacunek(e.target.value)} error={blad} autoComplete="off" />
        )}
        {ocena && (
          <div className="quiz__feedback" aria-live="polite" tabIndex={-1}>
            <Badge tone={ocena.trafiony ? 'success' : 'critical'}>{ocena.trafiony ? 'Dobry szacunek' : 'Ponad 20% różnicy'}</Badge>
            <span>
              Było {prawda} ptaków, czyli ok. {Math.round(prawda / 10)} takich dziesiątek jak ta złota. Twój szacunek: {wyniki[runda].szacunek}
              {ocena.kierunek === 'dokladnie'
                ? ', co do ptaka.'
                : `, o ${Math.abs(Math.round(ocena.blad * 100))}% ${ocena.kierunek === 'za-malo' ? 'za mało' : 'za dużo'}.`}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
