'use client';

import { useOstatniaLekcja, type OstatniaLekcja } from './ostatnia';
import { kluczLekcji, usePostep, type Postep } from './postep';

/** The course outline the "continue" logic walks: modules in course order, each with its lessons. */
export type KonspektKursu = { slug: string; id: string; lekcje: { slug: string; tytul: string }[] }[];

/**
 * Where "Kontynuuj" leads: the lesson opened last, or the first unfinished
 * one after it; without history, the first unfinished lesson of the course.
 * `null` while progress loads and when every lesson is done.
 */
export function cel(moduly: KonspektKursu, postep: Readonly<Postep> | null, ostatnia: Readonly<OstatniaLekcja> | null) {
  if (!postep || !ostatnia) return null;
  const kolejnosc = moduly.flatMap((m) => m.lekcje.map((l) => ({ m, l })));
  const gotowa = (i: number) => Boolean(postep[kluczLekcji(kolejnosc[i].m.slug, kolejnosc[i].l.slug)]);
  const od = kolejnosc.findIndex((x) => x.m.slug === ostatnia.modul && x.l.slug === ostatnia.lekcja);
  let i = -1;
  for (let j = Math.max(0, od); j < kolejnosc.length && i < 0; j++) if (!gotowa(j)) i = j;
  if (i < 0) for (let j = 0; j < kolejnosc.length && i < 0; j++) if (!gotowa(j)) i = j;
  if (i < 0) return null;
  const { m, l } = kolejnosc[i];
  const nowa = od < 0 && Object.keys(postep).length === 0;
  return {
    href: `/moduly/${m.slug}/${l.slug}`,
    etykieta: nowa ? 'Zacznij kurs' : 'Kontynuuj',
    opis: `${m.id}, lekcja ${m.lekcje.indexOf(l) + 1}: ${l.tytul}`,
  };
}

/** Where "Kontynuuj" leads right now; `null` while the browser copy loads or when everything is done. */
export function useKontynuuj(moduly: KonspektKursu) {
  const { postep } = usePostep();
  const { ostatnia } = useOstatniaLekcja();
  return cel(moduly, postep, ostatnia);
}
