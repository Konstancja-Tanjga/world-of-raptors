'use client';

import { useEffect, useId, useRef } from 'react';
import { gwiazdyNaNiebie, polozenieNaMapie, wierszeMapy, type Gwiazdozbior } from '@/lib/gwiazdozbiory';
import { kluczGwiazdozbioru, kluczMistrza, type ModulNieba } from '@/lib/odznaki';
import { mniejRuchu } from '@/lib/useMedia';
import { zagrajGdyWidoczny } from './moment';

export type StanGwiazdozbioru = { zapalony: boolean; opanowany: boolean; nowyZapalony: boolean; nowyMistrz: boolean };

/** The map's width and the height of one row of constellations, in its own units. */
const WYMIARY = { szeroka: [1000, 640 / 3], waska: [400, 1080 / 6] } as const;

/** A quiet field of background stars, seeded so it is the same on every visit. */
function tloGwiazd(szer: number, wys: number, ile: number) {
  let ziarno = 7;
  const los = () => (ziarno = (ziarno * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: ile }, () => ({ x: los() * szer, y: los() * wys, r: 0.4 + los() * 1.1, a: 0.15 + los() * 0.45 }));
}

type WlasciwosciMapy = {
  moduly: ModulNieba[];
  /** Each module's constellation, by its slug. */
  gwiazdozbiory: Record<string, Gwiazdozbior>;
  stany: Record<string, StanGwiazdozbioru>;
  /** Called with the keys of the moments when they start to play (at once with reduced motion). */
  pokazane: (klucze: string[]) => void;
};

function Mapa({ moduly, gwiazdozbiory, stany, pokazane, waska }: WlasciwosciMapy & { waska: boolean }) {
  const u = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [szer, wiersz] = WYMIARY[waska ? 'waska' : 'szeroka'];
  const wys = Math.round(wiersz * wierszeMapy(moduly.length, waska));
  const korzen = useRef<SVGSVGElement>(null);

  // A constellation whose moment has not played yet lights up: its stars ignite
  // one by one along the outline, then the lines draw between them; a new
  // gold star turns in on the head. Several light up one after another, once
  // the map is in view.
  useEffect(() => {
    const svg = korzen.current;
    const klucze = moduly.flatMap((m) => [
      ...(stany[m.slug]?.nowyZapalony ? [kluczGwiazdozbioru(m.slug)] : []),
      ...(stany[m.slug]?.nowyMistrz ? [kluczMistrza(m.slug)] : []),
    ]);
    if (!svg || !klucze.length) return;
    if (mniejRuchu()) {
      pokazane(klucze);
      return;
    }
    const animacje: Animation[] = [];
    let zapalone = 0;
    let mistrzowie = 0;
    for (const m of moduly) {
      const s = stany[m.slug];
      const g = svg.querySelector(`[data-gwiazdozbior="${m.slug}"]`);
      if (!s || !g) continue;
      const start = 300 + zapalone * 450;
      if (s.nowyZapalony) {
        zapalone++;
        const gwiazdy = [...g.querySelectorAll<SVGGElement>('.mapa__gwiazda')];
        gwiazdy.forEach((e, i) =>
          animacje.push(
            e.animate([{ opacity: 0, transform: 'scale(0.2)' }, { opacity: 1, transform: 'scale(1.7)', offset: 0.6 }, { opacity: 1, transform: 'scale(1)' }], {
              duration: 520,
              delay: start + i * 90,
              easing: 'cubic-bezier(.2,.8,.2,1)',
              fill: 'backwards',
            }),
          ),
        );
        const linia = g.querySelector<SVGPolygonElement>('.mapa__linia');
        if (linia) {
          const dl = linia.getTotalLength();
          animacje.push(
            linia.animate([{ strokeDasharray: `${dl}`, strokeDashoffset: dl }, { strokeDasharray: `${dl}`, strokeDashoffset: 0 }], {
              duration: 1100,
              delay: start + gwiazdy.length * 90,
              easing: 'ease-in-out',
              fill: 'backwards',
            }),
          );
        }
        for (const t of g.querySelectorAll('text')) {
          animacje.push(t.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: start + 700 + gwiazdy.length * 90, fill: 'backwards' }));
        }
      }
      if (s.nowyMistrz) {
        const mistrz = g.querySelector('.mapa__mistrz');
        if (mistrz) {
          animacje.push(
            mistrz.animate(
              [{ opacity: 0, transform: 'scale(0) rotate(-90deg)' }, { opacity: 1, transform: 'scale(1.5) rotate(10deg)', offset: 0.6 }, { opacity: 1, transform: 'none' }],
              { duration: 900, delay: s.nowyZapalony ? start + 2100 : 300 + mistrzowie * 300, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' },
            ),
          );
          if (!s.nowyZapalony) mistrzowie++;
        }
      }
    }
    return zagrajGdyWidoczny(svg, animacje, () => pokazane(klucze));
    // Plays once per visit, with the states the page decided were new when it opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tlo = tloGwiazd(szer, wys, waska ? 110 : 150);
  return (
    <svg ref={korzen} className={`mapa mapa--${waska ? 'waska' : 'szeroka'}`} viewBox={`0 0 ${szer} ${wys}`} aria-hidden="true">
      <defs>
        <radialGradient id={`${u}b`}>
          <stop offset="0%" stopColor="#fff8ea" />
          <stop offset="35%" stopColor="#f2eee6" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#f2eee6" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${u}z`}>
          <stop offset="0%" stopColor="#fff3d6" />
          <stop offset="40%" stopColor="#f5b75b" stopOpacity={0.8} />
          <stop offset="100%" stopColor="#f5b75b" stopOpacity={0} />
        </radialGradient>
      </defs>
      <g>
        {tlo.map((g, i) => (
          <circle key={i} cx={g.x.toFixed(1)} cy={g.y.toFixed(1)} r={g.r.toFixed(2)} fill="#f2eee6" opacity={g.a.toFixed(2)} />
        ))}
      </g>
      {moduly.map((m, i) => {
        const gw = gwiazdozbiory[m.slug];
        const s = stany[m.slug];
        const p = polozenieNaMapie(i, waska, moduly.length);
        const punkty = gwiazdyNaNiebie(gw, p, szer, wys);
        const dol = Math.max(...punkty.map((q) => q[1]));
        const zapalony = Boolean(s?.zapalony);
        return (
          <g key={m.slug} data-gwiazdozbior={m.slug} className={zapalony ? 'mapa__gwiazdozbior' : 'mapa__gwiazdozbior mapa__gwiazdozbior--blady'}>
            <polygon className="mapa__linia" points={punkty.map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' ')} />
            {punkty.map(([x, y], j) => (
              <g key={j} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
                <g className="mapa__gwiazda">
                  {zapalony && <circle r={j === 0 ? 9 : 7} fill={`url(#${u}b)`} />}
                  <circle r={zapalony ? (j === 0 ? 2.4 : 1.8) : 1.4} className="mapa__rdzen" />
                </g>
              </g>
            ))}
            {s?.opanowany && (
              <g transform={`translate(${punkty[0][0].toFixed(1)} ${punkty[0][1].toFixed(1)})`}>
                <g className="mapa__mistrz">
                  <circle r={16} fill={`url(#${u}z)`} />
                  <path d="M0,-11 L2.2,-2.2 L11,0 L2.2,2.2 L0,11 L-2.2,2.2 L-11,0 L-2.2,-2.2 Z" fill="#f5b75b" />
                </g>
              </g>
            )}
            <text x={(p.x * szer).toFixed(1)} y={Math.min(dol + 30, wys - 22).toFixed(1)} textAnchor="middle" className="mapa__nazwa">
              {gw.nazwa}
            </text>
            <text x={(p.x * szer).toFixed(1)} y={Math.min(dol + 48, wys - 6).toFixed(1)} textAnchor="middle" className="mapa__modul">
              {m.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * The night sky of "Moje niebo": a constellation for each module, lit once
 * the module is finished and given a gold star once its birds are
 * recognised; the rest wait as pale sketches. Four columns on wide screens and
 * two on narrow ones (CSS shows one), as many rows as the modules need. For screen readers, a
 * list of the modules and their state.
 */
export function MapaGwiazdozbiorow(wlasciwosci: WlasciwosciMapy) {
  const { moduly, stany } = wlasciwosci;
  const zapalone = moduly.filter((m) => stany[m.slug]?.zapalony).length;
  return (
    <figure className="mapa-nieba scena" data-scena>
      <Mapa {...wlasciwosci} waska={false} />
      <Mapa {...wlasciwosci} waska />
      <ul className="visually-hidden">
        {moduly.map((m) => {
          const s = stany[m.slug];
          return (
            <li key={m.slug}>
              {m.id} {m.tytul}, gwiazdozbiór {m.nazwaGwiazdozbioru}:{' '}
              {s?.opanowany ? 'zapalony, ze złotą gwiazdą' : s?.zapalony ? 'zapalony' : 'jeszcze nie'}
            </li>
          );
        })}
      </ul>
      <figcaption className="mapa-nieba__pasek">
        <p className="mapa-nieba__licznik">
          <span className="mapa-nieba__liczba">{zapalone}</span> z {moduly.length} gwiazdozbiorów
        </p>
        <ul className="mapa-nieba__legenda">
          <li>
            <span className="mapa-nieba__kropka" aria-hidden="true" />
            moduł zaliczony
          </li>
          <li>
            <span className="mapa-nieba__kropka mapa-nieba__kropka--zlota" aria-hidden="true" />
            jego ptaki rozpoznane
          </li>
          <li>
            <span className="mapa-nieba__kropka mapa-nieba__kropka--blada" aria-hidden="true" />
            jeszcze nie
          </li>
        </ul>
      </figcaption>
    </figure>
  );
}
