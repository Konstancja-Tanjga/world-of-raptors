'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useChecklista } from '@/lib/checklist';
import { useFiszki } from '@/lib/fiszki';
import { obraczki, zapamietaneKarty, type GatunekNieba } from '@/lib/odznaki';
import { usePostep } from '@/lib/postep';
import { Obraczka, OBRACZKI } from './Obraczka';

const OPIS = {
  znam: 'ukończona lekcja, która go uczy',
  rozpoznaje: 'wszystkie jego fiszki zapamiętane',
  widzialam: 'jest na mojej checkliście',
} as const;

/**
 * A species' three rings in its page's opening: Znam, Rozpoznaję and the gold
 * Widziałam. Until the three stores (progress, flashcards, checklist) have
 * been read they keep their place but stay hidden, so nothing shows a guessed
 * state.
 */
export function ObraczkiGatunku({ gatunek }: { gatunek: GatunekNieba }) {
  const { postep } = usePostep();
  const { fiszki } = useFiszki();
  const { lista } = useChecklista();
  const o = useMemo(
    () => (postep && fiszki && lista ? obraczki(gatunek, postep, zapamietaneKarty(fiszki), lista) : null),
    [gatunek, postep, fiszki, lista],
  );
  return (
    <div className="obraczki-gatunku" data-wczytywanie={o ? undefined : ''}>
      <ul className="obraczki-gatunku__lista" aria-label="Moje obrączki">
        {OBRACZKI.map((r) => {
          const ma = Boolean(o?.[r.rodzaj]);
          return (
            <li key={r.rodzaj} title={`${r.nazwa}: ${OPIS[r.rodzaj]}`}>
              <Obraczka rodzaj={r.rodzaj} zdobyta={ma} klasa="obraczki-gatunku__obraczka" />
              <span className="visually-hidden">
                {r.nazwa} ({OPIS[r.rodzaj]}): {ma ? 'zdobyta' : 'jeszcze nie'}
              </span>
            </li>
          );
        })}
      </ul>
      <Link href="/moje-niebo" className="obraczki-gatunku__link">
        Moje niebo
      </Link>
    </div>
  );
}
