'use client';

import { createEmptyCard, fsrs, generatorParameters, type Card, type Grade } from 'ts-fsrs';
import { zapiszFiszke, type ZapisFiszki } from './fiszki';
import { dzisiaj } from './magazyn';

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
 * Records an answer: the card's next review by FSRS, saved in the flashcard
 * store. Returns whether it was actually saved (false also when the scheduler
 * rejects the stored card).
 */
export function ocenFiszke(id: string, ocena: Grade, teraz: Date) {
  return zapiszFiszke(id, (zapis) => {
    try {
      const { card } = planista.next(kartaFsrs(zapis, teraz), teraz, ocena);
      return doZapisu(card, zapis?.wprowadzona ?? dzisiaj());
    } catch (err) {
      console.error(`[fiszki] could not schedule ${id}`, err);
      return null;
    }
  });
}
