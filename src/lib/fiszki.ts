'use client';

import { useCallback } from 'react';
import type { State } from 'ts-fsrs';
import { utworzMagazyn } from './magazyn';

/*
 * The flashcard schedules as stored. The scheduler that writes them is in
 * planFiszek.ts: this module imports nothing from ts-fsrs but its types, so
 * pages that only read the schedules ("Moje niebo" reads them on every page)
 * do not bring the scheduler with them.
 */

/**
 * One flashcard's schedule as stored: the FSRS card with its dates as ISO
 * strings (turned back into `Date`s by `kartaFsrs`), plus the local date of
 * the card's first answer, which caps how many new cards a day brings.
 */
export type ZapisFiszki = {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: State;
  last_review?: string;
  /** Local date (YYYY-MM-DD) of the first answer. */
  wprowadzona: string;
};

/** Flashcards that have been answered at least once, keyed by card id. A card with no entry is new. */
export type Fiszki = Record<string, ZapisFiszki>;

/**
 * ts-fsrs's card states as stored with each card (State.Learning, State.Review
 * and State.Relearning; New is never stored). Spelled out because the enum
 * itself is a value of the scheduler's module.
 */
export const STAN_KARTY = { nauka: 1 as State.Learning, powtorki: 2 as State.Review, ponowna: 3 as State.Relearning };

const LICZBY = ['stability', 'difficulty', 'elapsed_days', 'scheduled_days', 'learning_steps', 'reps', 'lapses'];
const DATA_LOKALNA = /^\d{4}-\d{2}-\d{2}$/;
const czyData = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

/**
 * Checks that every entry is one ts-fsrs can schedule: it throws on an unknown
 * state, a non-positive stability or an unparseable date, which would block
 * the flashcard page. Stored cards have been answered, so they are never New.
 */
export function isFiszki(value: unknown): value is Fiszki {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value).every((z) => {
    if (typeof z !== 'object' || z === null) return false;
    const r = z as Record<string, unknown>;
    return (
      czyData(r.due) &&
      (r.last_review === undefined || czyData(r.last_review)) &&
      typeof r.wprowadzona === 'string' &&
      DATA_LOKALNA.test(r.wprowadzona) &&
      LICZBY.every((k) => typeof r[k] === 'number' && Number.isFinite(r[k])) &&
      Object.values(STAN_KARTY).some((s) => r.state === s) &&
      (r.stability as number) > 0 &&
      (r.difficulty as number) >= 1 &&
      (r.difficulty as number) <= 10
    );
  });
}

const magazyn = utworzMagazyn<Fiszki>('wor:fiszki:v1', isFiszki);

/**
 * Saves one card's new schedule, made from the latest stored copy, and
 * returns whether it was actually saved. `nowy` returns null when the card
 * cannot be scheduled; nothing is saved then.
 */
export function zapiszFiszke(id: string, nowy: (zapis: ZapisFiszki | undefined) => ZapisFiszki | null) {
  const obecne = magazyn.odczytaj();
  const zapis = nowy(obecne[id]);
  return zapis ? magazyn.zapisz({ ...obecne, [id]: zapis }) : false;
}

/** Flashcard schedules in localStorage. `fiszki` is `null` until the browser copy has been read. */
export function useFiszki() {
  const fiszki = magazyn.useMagazyn();
  const zastapFiszki = useCallback((next: Fiszki) => magazyn.zapisz(next), []);
  return { fiszki, zastapFiszki };
}
