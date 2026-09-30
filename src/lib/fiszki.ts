'use client';

import { useCallback } from 'react';
import { createEmptyCard, fsrs, generatorParameters, type Card, type Grade } from 'ts-fsrs';
import { dzisiaj, utworzMagazyn } from './magazyn';

/**
 * One flashcard's schedule as stored: the FSRS card with its dates as ISO
 * strings (which ts-fsrs accepts back as input), plus the local date the card
 * was first seen, which caps how many new cards a day brings.
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
  state: number;
  last_review?: string;
  /** Local date (YYYY-MM-DD) of the first answer. */
  wprowadzona: string;
};

/** Flashcards that have been answered at least once, keyed by card id. A card with no entry is new. */
export type Fiszki = Record<string, ZapisFiszki>;

const LICZBY = ['stability', 'difficulty', 'elapsed_days', 'scheduled_days', 'learning_steps', 'reps', 'lapses', 'state'];

export function isFiszki(value: unknown): value is Fiszki {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value).every((z) => {
    if (typeof z !== 'object' || z === null) return false;
    const r = z as Record<string, unknown>;
    return (
      typeof r.due === 'string' &&
      !Number.isNaN(Date.parse(r.due)) &&
      typeof r.wprowadzona === 'string' &&
      (r.last_review === undefined || typeof r.last_review === 'string') &&
      LICZBY.every((k) => typeof r[k] === 'number' && Number.isFinite(r[k]))
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
 * actually saved.
 */
export function useFiszki() {
  const fiszki = magazyn.useMagazyn();

  const ocen = useCallback((id: string, ocena: Grade, teraz: Date) => {
    const obecne = magazyn.odczytaj();
    const zapis = obecne[id];
    const { card } = planista.next(kartaFsrs(zapis, teraz), teraz, ocena);
    return magazyn.zapisz({ ...obecne, [id]: doZapisu(card, zapis?.wprowadzona ?? dzisiaj()) });
  }, []);

  const zastapFiszki = useCallback((next: Fiszki) => magazyn.zapisz(next), []);

  return { fiszki, ocen, zastapFiszki };
}
