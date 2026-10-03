'use client';

import { useCallback } from 'react';
import { createEmptyCard, fsrs, generatorParameters, State, type Card, type Grade } from 'ts-fsrs';
import { dzisiaj, utworzMagazyn } from './magazyn';

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
      (r.state === State.Learning || r.state === State.Review || r.state === State.Relearning) &&
      (r.stability as number) > 0 &&
      (r.difficulty as number) >= 1 &&
      (r.difficulty as number) <= 10
    );
  });
}

const magazyn = utworzMagazyn<Fiszki>('wor:fiszki:v1', isFiszki);

/** FSRS with its default parameters; fuzz spreads reviews that would otherwise fall on the same day. */
export const planista = fsrs(generatorParameters({ enable_fuzz: true }));

export function kartaFsrs(zapis: ZapisFiszki | undefined, teraz: Date): Card {
  if (!zapis) return createEmptyCard(teraz);
  return {
    ...zapis,
    due: new Date(zapis.due),
    last_review: zapis.last_review ? new Date(zapis.last_review) : undefined,
  };
}

function doZapisu(karta: Card, wprowadzona: string): ZapisFiszki {
  return {
    due: karta.due.toISOString(),
    stability: karta.stability,
    difficulty: karta.difficulty,
    elapsed_days: karta.elapsed_days,
    scheduled_days: karta.scheduled_days,
    learning_steps: karta.learning_steps,
    reps: karta.reps,
    lapses: karta.lapses,
    state: karta.state,
    last_review: karta.last_review?.toISOString(),
    wprowadzona,
  };
}

/**
 * Flashcard schedules in localStorage. `fiszki` is `null` until the browser
 * copy has been read. `ocen` records an answer and returns whether it was
 * actually saved (false also when the scheduler rejects the stored card).
 */
export function useFiszki() {
  const fiszki = magazyn.useMagazyn();

  const ocen = useCallback((id: string, ocena: Grade, teraz: Date) => {
    const obecne = magazyn.odczytaj();
    const zapis = obecne[id];
    let nowy: ZapisFiszki;
    try {
      const { card } = planista.next(kartaFsrs(zapis, teraz), teraz, ocena);
      nowy = doZapisu(card, zapis?.wprowadzona ?? dzisiaj());
    } catch (err) {
      console.error(`[fiszki] could not schedule ${id}`, err);
      return false;
    }
    return magazyn.zapisz({ ...obecne, [id]: nowy });
  }, []);

  const zastapFiszki = useCallback((next: Fiszki) => magazyn.zapisz(next), []);

  return { fiszki, ocen, zastapFiszki };
}
