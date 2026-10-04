'use client';

import { useEffect } from 'react';
import { useToast } from '../ds';
import { useOstrzezenieZapisu } from '../useOstrzezenieZapisu';
import { NASZYWKI, type StrukturaNieba } from '@/lib/odznaki';
import { useStanNieba, zapiszNowe } from '@/lib/zdobyte';

/** What a newly earned key is called in its announcement. */
function tytul(klucz: string, struktura: StrukturaNieba) {
  const [rodzaj, id] = klucz.split(':');
  const modul = struktura.moduly.find((m) => m.slug === id);
  if (rodzaj === 'gwiazdozbior' && modul) return `Nowy gwiazdozbiór: ${modul.gwiazdozbior} (${modul.id})`;
  if (rodzaj === 'mistrz' && modul) return `Złota gwiazda: ${modul.gwiazdozbior} (${modul.id})`;
  const n = NASZYWKI.find((x) => x.id === id);
  return n ? `Nowa naszywka: ${n.nazwa}` : null;
}

/**
 * Watches every page for something newly earned (a module finished, a
 * flashcard learned, a bird ticked on the checklist), records the date and
 * announces it. Renders nothing; the moment itself plays on "Moje niebo".
 */
export function StraznikOdznak({ struktura }: { struktura: StrukturaNieba }) {
  const stan = useStanNieba(struktura);
  const { notify } = useToast();
  const ostrzez = useOstrzezenieZapisu();

  useEffect(() => {
    if (!stan) return;
    const { nowe, zapisano } = zapiszNowe(stan);
    ostrzez(zapisano);
    for (const klucz of nowe) {
      const t = tytul(klucz, struktura);
      if (t) notify({ tone: 'success', title: t, description: 'Jest już na moim niebie.' });
    }
  }, [stan, struktura, notify, ostrzez]);

  return null;
}
