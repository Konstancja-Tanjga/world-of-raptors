'use client';

import { useEffect, useId, useRef } from 'react';
import type { Naszywka as DefinicjaNaszywki, Emblemat } from '@/lib/odznaki';
import { mniejRuchu } from '@/lib/useMedia';
import { zagrajGdyWidoczny } from './moment';
import type { Rysunek } from './rysunek';

const OBWOD_MASKI = 2 * Math.PI * 50;

/** One three-toed track (a wader has no hind toe to speak of), heel at x, y, toes pointing `kat` degrees. */
function slad(x: number, y: number, kat: number) {
  const palec = (dl: number, odchylenie: number) => {
    const a = ((kat + odchylenie) * Math.PI) / 180;
    return `M${x} ${y}L${(x + dl * Math.cos(a)).toFixed(1)} ${(y + dl * Math.sin(a)).toFixed(1)}`;
  };
  return palec(20, 0) + palec(15, -42) + palec(15, 42);
}

/** A wader's trail across the mud, left and right feet in turn, walking up the field. */
const SLADY = [
  [70, 158],
  [88, 128],
  [104, 98],
  [122, 68],
]
  .map(([x, y], i) => slad(x + (i % 2 ? 9 : -9), y, -60))
  .join('');

/** A wave across the field at height y. */
const fala = (y: number) => `M30 ${y}q12.5 -7 25 0t25 0t25 0t25 0t25 0t25 0`;

/**
 * A patch's emblem, in the 200 × 200 patch, inside its field (r 70): a
 * wader's tracks in the mud; a bird's leg with colour rings, as the
 * reintroduced bald ibises wear them; a tidal channel with the tide rising
 * (one wave for the first patch, four for the last). `pusta`: the outline of
 * an unearned patch.
 */
function RysunekEmblematu({ e, kolor, nic, pusta, klip }: { e: Emblemat; kolor: string; nic: string; pusta: boolean; klip: string }) {
  const kreska = pusta
    ? { stroke: 'currentColor', strokeOpacity: 0.35, strokeWidth: 2, fill: 'none' }
    : { stroke: kolor, strokeWidth: 4.5, fill: 'none' };
  if (e.rodzaj === 'slady') {
    return <path d={SLADY} {...kreska} strokeLinecap="round" />;
  }
  if (e.rodzaj === 'obraczki') {
    const obraczka = pusta ? { fill: 'none', stroke: 'currentColor', strokeOpacity: 0.35, strokeWidth: 1.5 } : { fill: nic };
    return (
      <g>
        <path d="M112 40L100 66L100 136M100 136L76 146M100 136L86 154M100 136L106 156M100 136L112 132" {...kreska} strokeWidth={pusta ? 2 : 6} strokeLinecap="round" strokeLinejoin="round" />
        <rect x={91} y={82} width={18} height={12} rx={3} {...obraczka} />
        <rect x={91} y={100} width={18} height={12} rx={3} {...obraczka} />
      </g>
    );
  }
  return (
    <g clipPath={`url(#${klip})`}>
      <path d="M100 172C70 150 132 132 104 110S70 74 98 56S118 36 100 24" {...kreska} strokeWidth={pusta ? 2 : 9} strokeLinecap="round" />
      {Array.from({ length: e.fale }, (_, i) => (
        <path key={i} d={fala(150 - i * 18)} {...kreska} strokeWidth={pusta ? 1.5 : 3} stroke={pusta ? 'currentColor' : nic} />
      ))}
    </g>
  );
}

/**
 * A patch, like the embroidered ones from birding festivals: a rim with the
 * patch's name and the course's, a satin-stitched field and its bird.
 * Unearned, it is an empty place on the wall: a dashed circle and the bird
 * in outline. `przyszyj` plays the moment it is earned: the patch is sewn on
 * in one clockwise sweep, like a needle going round, once the patch is in
 * view and after `opoznienie` ms (several are sewn on one after another);
 * `przyszyta` is called when it starts. `ptaki`: the drawings of its birds
 * (`n.ptaki`), made on the server; a patch with an emblem has none.
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
      .catch((err: unknown) => {
        // Cancelled (the page closed first): nothing left to play.
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('[Naszywka] the sewing moment failed', err);
      });
    return zagrajGdyWidoczny(svg.current, [animacja], () => przyszyta?.(), 0.6);
    // Plays once, with what the page decided was new when it opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [przyszyj, zdobyta]);

  const klipPola = (
    <clipPath id={`${u}p`}>
      <circle cx={100} cy={100} r={68} />
    </clipPath>
  );

  if (!zdobyta) {
    const p = ptaki[0];
    return (
      <svg ref={svg} className="naszywka__rysunek naszywka__rysunek--pusta" viewBox="0 0 200 200" aria-hidden="true">
        <defs>{klipPola}</defs>
        <circle cx={100} cy={100} r={92} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeDasharray="4 6" strokeWidth={1.5} />
        {n.emblemat ? (
          <RysunekEmblematu e={n.emblemat} kolor="currentColor" nic="currentColor" pusta klip={`${u}p`} />
        ) : (
          <svg x={50} y={100 - 50 * p.proporcja} width={100} height={100 * p.proporcja} viewBox={p.viewBox}>
            <path d={p.d} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
          </svg>
        )}
      </svg>
    );
  }

  const { tlo, brzeg, nic, ptak } = n.kolory;
  // Two birds (a pair) sit side by side and smaller; one bird fills the field.
  const uklad = n.emblemat
    ? []
    : ptaki.length > 1
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
        {klipPola}
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
        {n.emblemat && <RysunekEmblematu e={n.emblemat} kolor={ptak} nic={nic} pusta={false} klip={`${u}p`} />}
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
            {n.napis ?? n.nazwa}
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
