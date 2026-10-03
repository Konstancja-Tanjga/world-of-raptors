'use client';

import { useCallback } from 'react';
import { utworzMagazyn } from './magazyn';

/**
 * The lesson opened most recently, for "Kontynuuj": both fields, or neither
 * before any lesson was opened. A convenience like the curiosity history: not
 * part of the backup, and an empty store just means "Kontynuuj" leads to the
 * first unfinished lesson of the course.
 */
export type OstatniaLekcja = { modul: string; lekcja: string } | { modul?: never; lekcja?: never };

function isOstatnia(v: unknown): v is OstatniaLekcja {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return o.modul === undefined && o.lekcja === undefined ? true : typeof o.modul === 'string' && typeof o.lekcja === 'string';
}

const magazyn = utworzMagazyn<OstatniaLekcja>('wor:ostatnia:v1', isOstatnia);

export function useOstatniaLekcja() {
  const ostatnia = magazyn.useMagazyn();
  const zapamietaj = useCallback((modul: string, lekcja: string) => {
    const teraz = magazyn.odczytaj();
    if (teraz.modul !== modul || teraz.lekcja !== lekcja) magazyn.zapisz({ modul, lekcja });
  }, []);
  return { ostatnia, zapamietaj };
}
