'use client';

import { useMemo, useState } from 'react';
import { pikowanie } from '@/lib/lot';
import { obrys, ramka, sciezka } from '@/lib/sylwetka';
import { SYLWETKI } from '@/lib/sylwetki';
import { Slider } from '../ds';

const liczba = (n: number, cyfry = 0) => n.toLocaleString('pl-PL', { maximumFractionDigits: cyfry });

/**
 * A falcon's stoop as a slider: fold the wings and see the top speed of a
 * vertical dive, and how long and how far the bird must fall to reach most
 * of it. The silhouette folds with the slider (hand bent back, wings
 * raised towards the body). Tucker's simplified model; no lift, still air.
 */
export function Pikowanie() {
  const [zlozenie, setZlozenie] = useState(100);
  const t = zlozenie / 100;
  const wynik = pikowanie(t);
  const d = useMemo(() => {
    const k = SYLWETKI['sokol-wedrowny'];
    return k ? sciezka(obrys(k, { wznios: 0.15 + t * 0.85, zgiecie: t * 0.9, ogon: 0.15 })) : '';
  }, [t]);
  const pudelko = useMemo(() => {
    const k = SYLWETKI['sokol-wedrowny'];
    const [x, y, w, h] = ramka(obrys(k, { wznios: 0, zgiecie: 0, ogon: 1 }));
    return `${x - 6} ${y - 6} ${w + 12} ${h + 12}`;
  }, []);
  const opis = (v: number) => (v === 0 ? 'rozłożone płasko' : v === 100 ? 'złożone przy ciele' : `złożone w ${v}%`);

  return (
    <div className="pikowanie">
      <div className="pikowanie__niebo scena">
        <svg viewBox={pudelko} role="img" aria-label={`Sokół wędrowny od spodu, skrzydła ${opis(zlozenie)}`}>
          <path d={d} />
        </svg>
      </div>
      <div className="pikowanie__panel">
        <Slider label="Skrzydła sokoła" min={0} max={100} step={5} value={zlozenie} onChange={setZlozenie} formatValue={opis} />
        <dl className="pikowanie__wyniki" aria-live="polite">
          <div>
            <dt>Największa prędkość w pionowym spadku</dt>
            <dd>ok. {liczba(Math.round(wynik.kmh / 5) * 5)} km/h</dd>
          </div>
          <div>
            <dt>Czas, by osiągnąć 90% tej prędkości</dt>
            <dd>ok. {liczba(wynik.czas90, 1)} s</dd>
          </div>
          <div>
            <dt>Wysokość, którą sokół musi przy tym spaść</dt>
            <dd>ok. {liczba(Math.round(wynik.wysokosc90 / 10) * 10)} m</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
