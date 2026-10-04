'use client';

import { useId } from 'react';
import type { Obraczki } from '@/lib/odznaki';

export type RodzajObraczki = keyof Obraczki;

const NAZWY: Record<RodzajObraczki, string> = { znam: 'Znam', rozpoznaje: 'Rozpoznaję', widzialam: 'Widziałam' };

/** The three rings in the order they are earned and shown. */
export const OBRACZKI = (Object.keys(NAZWY) as RodzajObraczki[]).map((rodzaj) => ({ rodzaj, nazwa: NAZWY[rodzaj] }));

/**
 * A ring like those ornithologists put on birds: a metal band with its word
 * stamped in. "Widziałam", the ring for a bird seen in the field, is gold.
 * Not earned yet, it is a dashed outline.
 */
export function Obraczka({ rodzaj, zdobyta, klasa }: { rodzaj: RodzajObraczki; zdobyta: boolean; klasa: string }) {
  const u = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const kolory = rodzaj === 'widzialam' ? ['#ffe2a8', '#d39a3e', '#f5c67a'] : ['#f4f1ec', '#a7a39c', '#dcd8d1'];
  return (
    <svg className={klasa} viewBox="0 0 88 34" aria-hidden="true">
      {zdobyta ? (
        <>
          <defs>
            <linearGradient id={`${u}m`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={kolory[0]} />
              <stop offset="0.55" stopColor={kolory[1]} />
              <stop offset="1" stopColor={kolory[2]} />
            </linearGradient>
          </defs>
          <rect x={2} y={4} width={84} height={26} rx={13} fill={`url(#${u}m)`} />
          <rect x={2.5} y={4.5} width={83} height={25} rx={12.5} fill="none" stroke="rgba(0,0,0,0.18)" />
          <line x1={14} y1={9} x2={74} y2={9} stroke="rgba(255,255,255,0.7)" strokeWidth={1.2} strokeLinecap="round" />
          {/* Stamped into the metal: dark enough for AA on the darkest band of the silver and the gold. */}
          <text x={44} y={21.5} textAnchor="middle" className="obraczka__napis" fill="rgba(40, 30, 20, 0.88)">
            {NAZWY[rodzaj]}
          </text>
        </>
      ) : (
        <rect x={2.5} y={4.5} width={83} height={25} rx={12.5} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeDasharray="3 4" />
      )}
    </svg>
  );
}
