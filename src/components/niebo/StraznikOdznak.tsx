'use client';

import { useEffect } from 'react';
import { useToast } from '../ds';
import { NASZYWKI, rozbierzKlucz, type StrukturaNieba } from '@/lib/odznaki';
import { useStanNieba, zapiszNowe } from '@/lib/zdobyte';

/** What a newly earned key is called in its announcement. */
function tytul(klucz: string, struktura: StrukturaNieba) {
  const k = rozbierzKlucz(klucz);
  if (!k) return null;
  const modul = struktura.moduly.find((m) => m.slug === k.id);
  if (k.rodzaj === 'gwiazdozbior' && modul) return `Nowy gwiazdozbiór: ${modul.nazwaGwiazdozbioru} (${modul.id})`;
  if (k.rodzaj === 'mistrz' && modul) return `Złota gwiazda: ${modul.nazwaGwiazdozbioru} (${modul.id})`;
  const n = k.rodzaj === 'naszywka' ? NASZYWKI.find((x) => x.id === k.id) : undefined;
  return n ? `Nowa naszywka: ${n.nazwa}` : null;
}

/**
 * Watches every page for a constellation, gold star or patch newly earned (a
 * module finished, flashcards learned, a bird ticked on the checklist; rings
 * are not recorded), records it with today's date and announces it in a
 * toast. The first evaluation, and the one after a backup is loaded, record
 * silently (zdobyte.ts). Renders nothing; the moment itself plays on "Moje
 * niebo".
 *
 * The record is bookkeeping, not a change I made: when the browser refuses
 * it, nothing is announced (never saved, it would be announced again after
 * every reload) or warned about (the stores I do change warn on their own).
 * The page keeps it in memory until a reload, which tries again.
 */
export function StraznikOdznak({ struktura }: { struktura: StrukturaNieba }) {
  const stan = useStanNieba(struktura);
  const { notify } = useToast();

  useEffect(() => {
    if (!stan) return;
    const { nowe, zapisano } = zapiszNowe(stan);
    // Another open tab hears of the same progress; only the one in front announces it.
    if (!zapisano || document.visibilityState !== 'visible') return;
    for (const klucz of nowe) {
      const t = tytul(klucz, struktura);
      if (t) notify({ tone: 'success', title: t, description: 'Jest już na moim niebie.' });
    }
  }, [stan, struktura, notify]);

  return null;
}
