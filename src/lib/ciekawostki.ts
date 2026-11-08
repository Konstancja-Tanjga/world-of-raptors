import type { CiekawostkaDoPokazania } from './types';

/** Where a curiosity card stands: a species page, a module overview or a lesson (or none, elsewhere). */
export type MiejsceCiekawostki = { modul?: string; lekcja?: string; gatunek?: string };

/**
 * Curiosities for a place in the app, the most relevant first: those about
 * the given species or from the given module, then everything else. A page's
 * own text is skipped: a lesson's callouts, or a module's intro on its
 * overview page.
 */
export function ciekawostkiDla(wszystkie: CiekawostkaDoPokazania[], { modul, lekcja, gatunek }: MiejsceCiekawostki = {}) {
  const pasuje = (c: CiekawostkaDoPokazania) =>
    (gatunek !== undefined && c.gatunki.includes(gatunek)) || (modul !== undefined && c.modul === modul);
  const pula = wszystkie.filter((c) => !(modul && c.modul === modul && (c.lekcja ?? undefined) === lekcja));
  return {
    preferowane: pula.filter(pasuje),
    pozostale: pula.filter((c) => !pasuje(c)),
  };
}
