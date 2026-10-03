'use client';

import { useOstatniaLekcja, type OstatniaLekcja } from './ostatnia';
import { kluczLekcji, usePostep, type Postep } from './postep';

/** The course outline the "continue" logic walks: modules in course order, each with its lessons. */
export type KonspektKursu = { slug: string; id: string; lekcje: { slug: string; tytul: string }[] }[];

/**
 * Where "Kontynuuj" stands: still reading the browser copy, every lesson
 * done, or a lesson to go to.
 */
export type Kontynuacja =
  | { stan: 'wczytywanie' }
  | { stan: 'ukonczony' }
  | { stan: 'lekcja'; href: string; etykieta: 'Zacznij kurs' | 'Kontynuuj'; opis: string };

/**
 * The lesson "Kontynuuj" leads to: the one opened last, unless it is
 * finished; then the next unfinished one after it, wrapping round to the
 * start of the course. Without history (and no progress) it is the course's
 * first lesson, labelled "Zacznij kurs".
 */
export function cel(
  moduly: KonspektKursu,
  postep: Readonly<Postep> | null,
  ostatnia: Readonly<OstatniaLekcja> | null,
): Kontynuacja {
  if (!postep || !ostatnia) return { stan: 'wczytywanie' };
  const kolejnosc = moduly.flatMap((m) => m.lekcje.map((l) => ({ m, l })));
  const gotowa = (i: number) => Boolean(postep[kluczLekcji(kolejnosc[i].m.slug, kolejnosc[i].l.slug)]);
  const od = kolejnosc.findIndex((x) => x.m.slug === ostatnia.modul && x.l.slug === ostatnia.lekcja);
  let i = -1;
  for (let j = Math.max(0, od); j < kolejnosc.length && i < 0; j++) if (!gotowa(j)) i = j;
  if (i < 0) for (let j = 0; j < kolejnosc.length && i < 0; j++) if (!gotowa(j)) i = j;
  if (i < 0) return { stan: 'ukonczony' };
  const { m, l } = kolejnosc[i];
  const nowa = od < 0 && Object.keys(postep).length === 0;
  return {
    stan: 'lekcja',
    href: `/moduly/${m.slug}/${l.slug}`,
    etykieta: nowa ? 'Zacznij kurs' : 'Kontynuuj',
    opis: `${m.id}, lekcja ${m.lekcje.indexOf(l) + 1}: ${l.tytul}`,
  };
}

/** Where "Kontynuuj" stands right now (see `cel`). */
export function useKontynuuj(moduly: KonspektKursu) {
  const { postep } = usePostep();
  const { ostatnia } = useOstatniaLekcja();
  return cel(moduly, postep, ostatnia);
}
