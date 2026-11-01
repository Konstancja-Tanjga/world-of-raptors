'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { czasPrzelotu, ocena, rozklad, type PtakPunktu, type Przelot, type Sesja } from '@/lib/punkt';
import { useMniejRuchu } from '@/lib/useMedia';
import { Button, Progress, SegmentedControl, Table } from '../ds';
import { dopasujPlotno, pozaPtaka, rysujPtaka } from './rysowanie';

type Tryb = 'przelot' | 'kolejno';
type Etap = 'start' | 'liczenie' | 'koniec';

/** Where a flock's birds are at time t, in CSS pixels, and which way they head. */
function polozenia(p: Przelot, t: number, kierunek: 1 | -1, szer: number, wys: number) {
  const rozp = p.skala * szer;
  const wejscie = kierunek === 1 ? -rozp : szer + rozp;
  const droga = (t - p.start) * p.predkosc * szer;
  const kat = (kierunek === 1 ? 0 : Math.PI) + p.kat;
  const lx = wejscie + Math.cos(kat) * droga;
  const ly = p.y * wys + Math.sin(kat) * droga;
  return {
    kat,
    rozp,
    ptaki: p.ptaki.map((b) => ({
      // Behind the leader along its heading, and to one side across it.
      x: lx - Math.cos(kat) * b.dx * rozp - Math.sin(kat) * b.dy * rozp,
      y: ly - Math.sin(kat) * b.dx * rozp + Math.cos(kat) * b.dy * rozp,
      faza: b.faza,
    })),
  };
}

const nazwaStada = (pl: string, ile: number) => (ile === 1 ? pl.toLowerCase() : `${ile} × ${pl.toLowerCase()}`);

/**
 * Module B8's virtual watch point: a session of migrants crosses the sky in
 * flocks at their own speed and height, and the reader picks a flock (a
 * click on a bird, or "Wybierz następnego ptaka") and names it, as a counter
 * does on a real watch point. A flock counts all its birds. The answer is
 * told at once, and the end shows the count against what really flew. "Ptak
 * po ptaku" shows each flock still, one after another: the way to count
 * without a pointer or with less motion (the only way, when the system asks
 * for less). Nothing is stored.
 */
export function PunktObserwacyjny({ sesja, ptaki }: { sesja: Sesja; ptaki: Record<string, PtakPunktu> }) {
  const mniejRuchu = useMniejRuchu();
  const [wybranyTryb, setTryb] = useState<Tryb>('przelot');
  const tryb: Tryb = mniejRuchu ? 'kolejno' : wybranyTryb;
  const [etap, setEtap] = useState<Etap>('start');
  const [przeloty, setPrzeloty] = useState<Przelot[]>([]);
  const [odpowiedzi, setOdpowiedzi] = useState<Record<number, string>>({});
  const [wybrany, setWybrany] = useState<number | null>(null);
  const [ostatnia, setOstatnia] = useState<{ n: number; dobrze: boolean } | null>(null);
  const [czas, setCzas] = useState(0);
  const [pauza, setPauza] = useState(false);
  const [kolejny, setKolejny] = useState(0);
  const plotno = useRef<HTMLCanvasElement>(null);
  const stan = useRef({ t: 0, pauza: false, wybrany: null as number | null, odpowiedzi: {} as Record<number, string> });
  // The drawing loop reads these each frame.
  useEffect(() => {
    stan.current.pauza = pauza;
    stan.current.wybrany = wybrany;
    stan.current.odpowiedzi = odpowiedzi;
  }, [pauza, wybrany, odpowiedzi]);

  const opcje = useMemo(() => sesja.opcje.map((id) => ptaki[id]), [sesja, ptaki]);

  const zacznij = () => {
    const nowe = rozklad(sesja, ptaki, Math.floor(Math.random() * 2 ** 31));
    setPrzeloty(nowe);
    setOdpowiedzi({});
    setWybrany(tryb === 'kolejno' ? 0 : null);
    setKolejny(0);
    setOstatnia(null);
    setCzas(0);
    setPauza(false);
    stan.current.t = 0;
    setEtap('liczenie');
  };

  // The flight: the clock runs (unless paused) and the sky is drawn each frame until the session ends.
  useEffect(() => {
    const canvas = plotno.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || etap !== 'liczenie' || tryb !== 'przelot') return;
    const kolor = getComputedStyle(canvas).getPropertyValue('--wor-sylwetka').trim() || '#0d131b';
    const akcent = getComputedStyle(canvas).getPropertyValue('--wor-akcent').trim() || '#e8913a';
    let klatka = 0;
    let poprzednio = performance.now();
    let ostatnioCzas = -1;
    const krok = (teraz: number) => {
      const dt = Math.min(0.1, (teraz - poprzednio) / 1000);
      poprzednio = teraz;
      if (!stan.current.pauza) stan.current.t += dt;
      const t = stan.current.t;
      const { szer, wys, dpr } = dopasujPlotno(canvas);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of przeloty) {
        if (t < p.start || t > p.start + czasPrzelotu(p)) continue;
        const { kat, rozp, ptaki: punkty } = polozenia(p, t, sesja.kierunek, szer, wys);
        const ptak = ptaki[p.gatunek];
        ctx.fillStyle = kolor;
        for (const b of punkty) {
          const { poza, przechyl } = pozaPtaka(p.gatunek, ptak.styl, t + b.faza);
          rysujPtaka(ctx, dpr, p.gatunek, poza, b.x, b.y, kat + przechyl * 0.2, rozp, przechyl);
        }
        // The flock being named gets a ring; a named one a small mark over its leader.
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (stan.current.wybrany === p.n) {
          ctx.strokeStyle = akcent;
          ctx.lineWidth = 2;
          for (const b of punkty) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, Math.max(rozp * 0.75, 12), 0, Math.PI * 2);
            ctx.stroke();
          }
        } else if (stan.current.odpowiedzi[p.n]) {
          ctx.fillStyle = akcent;
          ctx.beginPath();
          ctx.arc(punkty[0].x, punkty[0].y - Math.max(rozp * 0.7, 10), 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const sekunda = Math.floor(t);
      if (sekunda !== ostatnioCzas) {
        ostatnioCzas = sekunda;
        setCzas(Math.min(sesja.czas, sekunda));
      }
      if (t >= sesja.czas) {
        setEtap('koniec');
        return;
      }
      klatka = requestAnimationFrame(krok);
    };
    klatka = requestAnimationFrame(krok);
    return () => cancelAnimationFrame(klatka);
  }, [etap, tryb, przeloty, ptaki, sesja]);

  // One flock at a time, standing still in the middle of the sky.
  useEffect(() => {
    const canvas = plotno.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || etap !== 'liczenie' || tryb !== 'kolejno') return;
    const p = przeloty[kolejny];
    const rysuj = () => {
      const { szer, wys, dpr } = dopasujPlotno(canvas);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!p) return;
      ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--wor-sylwetka').trim() || '#0d131b';
      // Closer than in flight (there is time to look), the leader at the middle: the moment it would be there.
      // A long flock shrinks to fit, and its middle (not its leader) stands at the centre.
      const dlugosc = Math.max(0, ...p.ptaki.map((b) => b.dx));
      const blizej = { ...p, y: 0.5, skala: Math.min(p.skala * 2.2, 0.2, 0.85 / (dlugosc + 1.5)) };
      const doSrodka = (szer / 2 + blizej.skala * szer * (1 + dlugosc / 2)) / (p.predkosc * szer);
      const { kat, rozp, ptaki: punkty } = polozenia(blizej, p.start + doSrodka, sesja.kierunek, szer, wys);
      for (const b of punkty) {
        const { poza, przechyl } = pozaPtaka(p.gatunek, ptaki[p.gatunek].styl, b.faza);
        rysujPtaka(ctx, dpr, p.gatunek, poza, b.x, b.y, kat, rozp, przechyl);
      }
    };
    rysuj();
    const obserwator = new ResizeObserver(rysuj);
    obserwator.observe(canvas);
    return () => obserwator.disconnect();
  }, [etap, tryb, kolejny, przeloty, ptaki, sesja]);

  /** The flock under the pointer: the nearest bird within reach of its size. */
  const naKlikniecie = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = plotno.current;
    if (!canvas || tryb !== 'przelot' || etap !== 'liczenie') return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const t = stan.current.t;
    let najblizszy: { n: number; d: number } | null = null;
    for (const p of przeloty) {
      if (t < p.start || t > p.start + czasPrzelotu(p)) continue;
      const { rozp, ptaki: punkty } = polozenia(p, t, sesja.kierunek, r.width, r.height);
      for (const b of punkty) {
        const d = Math.hypot(b.x - x, b.y - y);
        if (d < Math.max(rozp * 0.8, 18) && (!najblizszy || d < najblizszy.d)) najblizszy = { n: p.n, d };
      }
    }
    if (najblizszy && odpowiedzi[najblizszy.n] === undefined) setWybrany(najblizszy.n);
  };

  /** The flock that came in first among those still in the sky and not yet named. */
  const nastepnyWidoczny = useCallback(() => {
    const t = stan.current.t;
    const p = przeloty.find((x) => odpowiedzi[x.n] === undefined && t >= x.start && t <= x.start + czasPrzelotu(x));
    setWybrany(p ? p.n : null);
  }, [przeloty, odpowiedzi]);

  const odpowiedz = (gatunek: string) => {
    if (wybrany === null) return;
    const p = przeloty[wybrany];
    setOdpowiedzi((o) => ({ ...o, [wybrany]: gatunek }));
    setOstatnia({ n: wybrany, dobrze: gatunek === p.gatunek });
    if (tryb === 'przelot') setWybrany(null);
  };

  const dalej = () => {
    const n = kolejny + 1;
    setOstatnia(null);
    if (n >= przeloty.length) {
      setEtap('koniec');
      return;
    }
    setKolejny(n);
    setWybrany(n);
  };

  const policzone = useMemo(() => {
    const suma = new Map<string, number>();
    for (const [n, g] of Object.entries(odpowiedzi)) suma.set(g, (suma.get(g) ?? 0) + przeloty[Number(n)].ptaki.length);
    return [...suma.entries()].sort((a, b) => b[1] - a[1]);
  }, [odpowiedzi, przeloty]);
  const wynik = etap === 'koniec' ? ocena(przeloty, odpowiedzi) : null;
  const opisOstatniej = (() => {
    if (!ostatnia) return '';
    const p = przeloty[ostatnia.n];
    const prawda = nazwaStada(ptaki[p.gatunek].pl, p.ptaki.length);
    return ostatnia.dobrze ? `Dobrze: ${prawda}.` : `To był${p.ptaki.length === 1 ? '' : 'o stado'}: ${prawda}, a nie ${ptaki[odpowiedzi[ostatnia.n]].pl.toLowerCase()}.`;
  })();

  return (
    <div className="punkt">
      <div className="punkt__niebo scena">
        <canvas
          ref={plotno}
          className="punkt__plotno"
          role="img"
          aria-label={
            etap === 'liczenie'
              ? tryb === 'kolejno'
                ? `Ptak ${kolejny + 1} z ${przeloty.length} na niebie`
                : 'Niebo nad punktem obserwacyjnym, przelatują ptaki'
              : 'Puste niebo nad punktem obserwacyjnym'
          }
          onPointerUp={naKlikniecie}
        />
        {etap === 'start' && (
          <div className="punkt__zaslona">
            <p className="punkt__miejsce">{sesja.miejsce}</p>
            <p>{sesja.opis}</p>
          </div>
        )}
      </div>

      {etap === 'start' && (
        <div className="punkt__start">
          {!mniejRuchu && (
            <SegmentedControl
              legend="Sposób liczenia"
              showLegend
              size="sm"
              value={wybranyTryb}
              onChange={(v) => setTryb(v as Tryb)}
              options={[
                { value: 'przelot', label: 'Przelot na żywo' },
                { value: 'kolejno', label: 'Ptak po ptaku' },
              ]}
            />
          )}
          <p className="punkt__wskazowka">
            {tryb === 'przelot'
              ? `Przez ${sesja.czas / 60 >= 1 ? `${Math.round((sesja.czas / 60) * 10) / 10} min` : `${sesja.czas} s`} ptaki przelatują nad punktem. Kliknij ptaka albo stado (lub użyj przycisku „Wybierz następnego ptaka”) i wybierz gatunek. Stado liczy się w całości.`
              : 'Stada pojawiają się po kolei i stoją w miejscu, aż wybierzesz gatunek.'}
          </p>
          <div className="punkt__przyciski">
            <Button onClick={zacznij}>Zacznij liczenie</Button>
          </div>
        </div>
      )}

      {etap === 'liczenie' && (
        <div className="punkt__panel">
          {tryb === 'przelot' ? (
            <>
              <Progress label="Czas liczenia" value={czas} max={sesja.czas} valueText={`${czas} z ${sesja.czas} s`} />
              <div className="punkt__przyciski">
                <Button size="sm" variant="secondary" onClick={nastepnyWidoczny}>
                  Wybierz następnego ptaka
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setPauza((x) => !x)}>
                  {pauza ? 'Wznów przelot' : 'Zatrzymaj przelot'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEtap('koniec')}>
                  Zakończ liczenie
                </Button>
              </div>
            </>
          ) : (
            <Progress label="Stado" value={kolejny + 1} max={przeloty.length} valueText={`${kolejny + 1} z ${przeloty.length}`} />
          )}

          <div className="punkt__pytanie" aria-live="polite">
            {wybrany !== null && odpowiedzi[wybrany] === undefined ? (
              <>
                <p className="punkt__polecenie">
                  {przeloty[wybrany].ptaki.length === 1 ? 'Co to za ptak?' : `Co to za stado? Ptaków: ${przeloty[wybrany].ptaki.length}.`}
                </p>
                <div className="punkt__odpowiedzi">
                  {opcje.map((o) => (
                    <Button key={o.id} size="sm" variant="secondary" onClick={() => odpowiedz(o.id)}>
                      {o.pl}
                    </Button>
                  ))}
                </div>
              </>
            ) : tryb === 'przelot' ? (
              <p className="punkt__wskazowka">{opisOstatniej || 'Kliknij ptaka na niebie albo wybierz następnego przyciskiem.'}</p>
            ) : null}
            {tryb === 'kolejno' && ostatnia && (
              <>
                <p className="punkt__wskazowka">{opisOstatniej}</p>
                <div className="punkt__przyciski">
                  <Button size="sm" onClick={dalej}>
                    {kolejny + 1 < przeloty.length ? 'Następne stado' : 'Pokaż wynik'}
                  </Button>
                </div>
              </>
            )}
          </div>

          {policzone.length > 0 && (
            <p className="punkt__licznik">
              Policzone: {policzone.map(([g, n]) => `${ptaki[g].pl.toLowerCase()} ${n}`).join(', ')}
            </p>
          )}
        </div>
      )}

      {etap === 'koniec' && wynik && (
        <div className="punkt__panel">
          <p className="punkt__wynik" tabIndex={-1}>
            Policzone dobrze: {wynik.dobrze} z {wynik.wszystkie} ptaków ({Math.round((wynik.dobrze / wynik.wszystkie) * 100)}%).
            {wynik.przeoczone > 0 && ` Przeoczone: ${wynik.przeoczone}.`}
          </p>
          <Table
            caption="Wynik liczenia według gatunków"
            columns={[
              { key: 'gatunek', header: 'Gatunek', cell: (w) => ptaki[w.gatunek].pl },
              { key: 'przelecialo', header: 'Przeleciało', cell: (w) => w.przelecialo, numeric: true, align: 'end' },
              { key: 'dobrze', header: 'Policzone dobrze', cell: (w) => w.dobrze, numeric: true, align: 'end' },
              { key: 'mylnie', header: 'Zapisane omyłkowo', cell: (w) => w.mylnie, numeric: true, align: 'end' },
            ]}
            rows={wynik.wiersze}
            rowKey={(w) => w.gatunek}
            responsive="scroll"
            density="compact"
          />
          <div className="punkt__przyciski">
            <Button onClick={zacznij}>Jeszcze raz</Button>
            <Button variant="ghost" onClick={() => setEtap('start')}>
              Zmień sposób liczenia
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
