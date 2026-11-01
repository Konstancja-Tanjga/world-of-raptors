'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { bladSzacunku, losowe, type PtakPunktu } from '@/lib/punkt';
import { useMniejRuchu } from '@/lib/useMedia';
import { Button, Slider } from '../ds';
import { dopasujPlotno, pozaPtaka, rysujPtaka } from './rysowanie';

/**
 * A kettle: birds circling in a thermal, too many to count one by one. The
 * reader estimates how many, then sees the true number and ten of the birds
 * lit, which is what a block of ten looks like: counters count ten and
 * measure the rest in tens. A new kettle each time (a different seed, a
 * number near the one given). With less motion the kettle stands still.
 */
export function Komin({ ptak, ile: wzor }: { ptak: PtakPunktu; ile: number }) {
  const mniejRuchu = useMniejRuchu();
  const plotno = useRef<HTMLCanvasElement>(null);
  const [runda, setRunda] = useState(1);
  const [szacunek, setSzacunek] = useState(0);
  const [sprawdzony, setSprawdzony] = useState(false);
  const [pauza, setPauza] = useState(false);
  const pauzaRef = useRef(false);
  useEffect(() => {
    pauzaRef.current = pauza;
  }, [pauza]);

  // Each round a kettle near the given size (±30%), and where each bird circles in it.
  const komin = useMemo(() => {
    const los = losowe(runda * 7919 + wzor);
    const ile = runda === 1 ? wzor : Math.round(wzor * (0.7 + los() * 0.6));
    return {
      ile,
      ptaki: Array.from({ length: ile }, () => ({
        promien: 0.04 + Math.sqrt(los()) * 0.3,
        faza: los() * Math.PI * 2,
        omega: 0.35 + los() * 0.25,
        wysokosc: los(),
        skala: 0.65 + los() * 0.6,
        pora: los() * 10,
      })),
    };
  }, [runda, wzor]);
  const maks = Math.ceil((wzor * 2.2) / 10) * 10;

  useEffect(() => {
    const canvas = plotno.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const kolor = getComputedStyle(canvas).getPropertyValue('--wor-sylwetka').trim() || '#0d131b';
    const akcent = getComputedStyle(canvas).getPropertyValue('--wor-akcent').trim() || '#e8913a';
    let t = 3;
    let klatka = 0;
    let poprzednio = performance.now();
    const rysuj = () => {
      const { szer, wys, dpr } = dopasujPlotno(canvas);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const rozp = (ptak.rozpietosc / 100) * szer * Math.min(0.03, 0.2 / Math.sqrt(komin.ile));
      komin.ptaki.forEach((b, i) => {
        // Circling the same way round, the whole column leaning with the wind and slowly rising.
        const kat = b.faza + b.omega * t;
        const h = (b.wysokosc + t * 0.01) % 1;
        const x = szer * (0.5 + (h - 0.5) * 0.12) + Math.cos(kat) * b.promien * szer;
        const y = wys * (0.9 - h * 0.8) + Math.sin(kat) * b.promien * szer * 0.22;
        const { poza, przechyl } = pozaPtaka(ptak.id, 'szybuje', t + b.pora);
        ctx.fillStyle = sprawdzony && i < 10 ? akcent : kolor;
        rysujPtaka(ctx, dpr, ptak.id, poza, x, y, kat + Math.PI / 2, rozp * b.skala * (0.8 + h * 0.4), przechyl + 0.35);
      });
    };
    if (mniejRuchu) {
      rysuj();
      const obserwator = new ResizeObserver(rysuj);
      obserwator.observe(canvas);
      return () => obserwator.disconnect();
    }
    const krok = (teraz: number) => {
      const dt = Math.min(0.1, (teraz - poprzednio) / 1000);
      poprzednio = teraz;
      if (!pauzaRef.current) t += dt;
      rysuj();
      klatka = requestAnimationFrame(krok);
    };
    klatka = requestAnimationFrame(krok);
    return () => cancelAnimationFrame(klatka);
  }, [komin, ptak, mniejRuchu, sprawdzony]);

  const blad = bladSzacunku(komin.ile, szacunek);
  return (
    <div className="punkt">
      <div className="punkt__niebo punkt__niebo--komin scena">
        <canvas ref={plotno} className="punkt__plotno" role="img" aria-label={`Komin termiczny: wiele krążących ptaków (${ptak.pl.toLowerCase()})`} />
        {!mniejRuchu && (
          <button type="button" className="scena-sylwetki__pauza" onClick={() => setPauza((x) => !x)}>
            {pauza ? 'Wznów krążenie' : 'Zatrzymaj krążenie'}
          </button>
        )}
      </div>
      <div className="punkt__panel">
        <Slider
          label="Ile ptaków krąży w kominie?"
          min={0}
          max={maks}
          step={5}
          value={szacunek}
          onChange={(v) => {
            setSzacunek(v);
            setSprawdzony(false);
          }}
          formatValue={(v) => `${v} ptaków`}
        />
        <div className="punkt__przyciski">
          <Button onClick={() => setSprawdzony(true)} disabled={szacunek === 0}>
            Sprawdź
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setRunda((r) => r + 1);
              setSzacunek(0);
              setSprawdzony(false);
            }}
          >
            Nowy komin
          </Button>
        </div>
        <p className="punkt__wskazowka" aria-live="polite">
          {sprawdzony
            ? `Krążyło ${komin.ile}. Twój szacunek: ${szacunek}, ${blad === 0 ? 'dokładnie' : `pomyłka o ${blad}%`}. ${
                blad <= 15 ? 'Liczący na punktach uznaliby to za dobry szacunek.' : 'Spróbuj policzyć dziesięć ptaków i ocenić, ile takich dziesiątek mieści się w kominie.'
              } Podświetlone ptaki to jedna dziesiątka.`
            : 'Przesuń suwak na swój szacunek i sprawdź.'}
        </p>
      </div>
    </div>
  );
}
