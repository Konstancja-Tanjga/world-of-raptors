'use client';

import { useEffect, useId, useRef } from 'react';
import type { Naszywka as DefinicjaNaszywki } from '@/lib/odznaki';
import { mniejRuchu } from '@/lib/useMedia';
import { zagrajGdyWidoczny } from './moment';
import type { Rysunek } from './rysunek';

const OBWOD_MASKI = 2 * Math.PI * 50;

/**
 * A patch, like the embroidered ones from birding festivals: a rim with the
 * patch's name and the course's, a satin-stitched field and its bird.
 * Unearned, it is an empty place on the wall: a dashed circle and the bird
 * in outline. `przyszyj` plays the moment it is earned: the patch is sewn on
 * in one clockwise sweep, like a needle going round, once the patch is in
 * view and after `opoznienie` ms (several are sewn on one after another);
 * `przyszyta` is called when it starts. `ptaki`: the drawings of its birds
 * (`n.ptaki`), made on the server.
 */
export function Naszywka({
  n,
  ptaki,
  zdobyta,
  przyszyj = false,
  opoznienie = 0,
  przyszyta,
}: {
  n: DefinicjaNaszywki;
  ptaki: Rysunek[];
  zdobyta: boolean;
  przyszyj?: boolean;
  opoznienie?: number;
  przyszyta?: () => void;
}) {
  const u = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const luk = useRef<SVGCircleElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!przyszyj || !zdobyta || !luk.current || !svg.current) return;
    if (mniejRuchu()) {
      przyszyta?.();
      return;
    }
    const animacja = luk.current.animate([{ strokeDashoffset: OBWOD_MASKI }, { strokeDashoffset: 0 }], {
      duration: 1300,
      delay: opoznienie,
      easing: 'cubic-bezier(.5,.1,.3,1)',
      fill: 'backwards',
    });
    animacja.finished
      .then(() =>
        svg.current?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06) rotate(-2deg)', offset: 0.5 }, { transform: 'scale(1)' }], {
          duration: 500,
          easing: 'ease-out',
        }),
      )
      // Cancelled (the page closed first): nothing left to play.
      .catch(() => {});
    return zagrajGdyWidoczny(svg.current, [animacja], () => przyszyta?.(), 0.6);
    // Plays once, with what the page decided was new when it opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [przyszyj, zdobyta]);

  if (!zdobyta) {
    const p = ptaki[0];
    return (
      <svg ref={svg} className="naszywka__rysunek naszywka__rysunek--pusta" viewBox="0 0 200 200" aria-hidden="true">
        <circle cx={100} cy={100} r={92} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeDasharray="4 6" strokeWidth={1.5} />
        <svg x={50} y={100 - 50 * p.proporcja} width={100} height={100 * p.proporcja} viewBox={p.viewBox}>
          <path d={p.d} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
        </svg>
      </svg>
    );
  }

  const { tlo, brzeg, nic, ptak } = n.kolory;
  // Two birds (a pair) sit side by side and smaller; one bird fills the field.
  const uklad =
    ptaki.length > 1
      ? [
          { p: ptaki[0], x: 34, y: 108, w: 62, obrot: -8 },
          { p: ptaki[1], x: 104, y: 92, w: 62, obrot: 8 },
        ]
      : [{ p: ptaki[0], x: 50, y: 100, w: 100, obrot: 0 }];
  return (
    <svg ref={svg} className="naszywka__rysunek" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <pattern id={`${u}w`} width={4} height={4} patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width={4} height={2} fill="rgba(255,255,255,0.07)" />
        </pattern>
        <path id={`${u}g`} d="M 26,100 A 74,74 0 0 1 174,100" />
        <path id={`${u}d`} d="M 22,100 A 78,78 0 0 0 178,100" />
        <mask id={`${u}m`}>
          <circle
            ref={luk}
            cx={100}
            cy={100}
            r={50}
            fill="none"
            stroke="#fff"
            strokeWidth={100}
            strokeDasharray={OBWOD_MASKI}
            strokeDashoffset={0}
            transform="rotate(-90 100 100)"
          />
        </mask>
      </defs>
      <g mask={`url(#${u}m)`}>
        <circle cx={100} cy={100} r={96} fill={brzeg} />
        <circle cx={100} cy={100} r={96} fill={`url(#${u}w)`} />
        <circle cx={100} cy={100} r={70} fill={tlo} />
        <circle cx={100} cy={100} r={70} fill={`url(#${u}w)`} />
        <circle cx={100} cy={100} r={90} fill="none" stroke={nic} strokeWidth={1.6} strokeDasharray="3.2 3.2" opacity={0.85} />
        <circle cx={100} cy={100} r={70} fill="none" stroke={nic} strokeWidth={2.2} opacity={0.9} />
        {uklad.map(({ p, x, y, w, obrot }, i) => {
          const h = w * p.proporcja;
          return (
            <g key={i} transform={`rotate(${obrot} ${x + w / 2} ${y})`}>
              <svg x={x} y={y - h / 2} width={w} height={h} viewBox={p.viewBox}>
                <path d={p.d} fill={ptak} />
              </svg>
            </g>
          );
        })}
        <text className="naszywka__napis" fill={nic}>
          <textPath href={`#${u}g`} startOffset="50%" textAnchor="middle">
            {n.nazwa}
          </textPath>
        </text>
        <text className="naszywka__marka" fill={nic}>
          <textPath href={`#${u}d`} startOffset="50%" textAnchor="middle">
            World of Raptors
          </textPath>
        </text>
      </g>
    </svg>
  );
}
