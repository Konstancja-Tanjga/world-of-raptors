/**
 * "Rozpoznaj po głosie": the rules that turn BirdNET's scores into what the
 * page lists, kept free of React and browser APIs so they can be tested. The
 * model itself runs in BirdNET Live's worker (public/birdnet/, see
 * scripts/birdnet.sh); it scores every 3-second window of the microphone for
 * each of its ~6500 species.
 */

/** One species' score for one window, as the worker sends it ("pooled"). */
export type Wynik = {
  index: number;
  scientificName: string;
  commonNameI18n: string;
  confidence: number;
  /** How likely the species is here this week (1 until a location is given). */
  geoscore: number;
};

/** A species heard during the session. */
export type Uslyszany = {
  lat: string;
  pl: string;
  /** The highest smoothed confidence so far, 0–1. */
  pewnosc: number;
  /** When it was last above the threshold (ms since the epoch). */
  ostatnio: number;
};

/** How many recent windows a species' score is smoothed over (as in BirdNET Live). */
export const OKNA_WYGLADZANIA = 5;
/**
 * Below this smoothed confidence a species is not listed. BirdNET Live's
 * default is 0.15; a beginner is better served by fewer false alarms (on a
 * tawny owl's duet a scops owl rose to 0.28 while the tawny owl stayed above 0.5).
 */
export const PROG_PEWNOSCI = 0.35;
/** With a location, species this unlikely here and now are left out (BirdNET Live's value). */
export const PROG_MIEJSCA = 0.05;

const EPS = 1e-8;
const logit = (p: number) => {
  const c = Math.min(1 - EPS, Math.max(EPS, p));
  return Math.log(c / (1 - c));
};

/**
 * Smooths each species' confidence over the last windows by a log-mean-exp of
 * the logits, so one loud window counts but a single click does not: a call
 * heard in two windows of five stays up, noise in one sinks.
 */
export function wygladz(okna: Wynik[][]): Wynik[] {
  if (okna.length <= 1) return okna[0] ?? [];
  const wgIndeksu = new Map<number, { probki: number[]; wzor: Wynik }>();
  for (const okno of okna) {
    for (const w of okno) {
      const wpis = wgIndeksu.get(w.index) ?? { probki: [], wzor: w };
      wpis.probki.push(w.confidence);
      wpis.wzor = w;
      wgIndeksu.set(w.index, wpis);
    }
  }
  return [...wgIndeksu.values()].map(({ probki, wzor }) => {
    // A species missing from a window scored nothing there.
    const logity = [...probki, ...Array(okna.length - probki.length).fill(0)].map(logit);
    const max = Math.max(...logity);
    const lme = max + Math.log(logity.reduce((s, l) => s + Math.exp(l - max), 0) / logity.length);
    return { ...wzor, confidence: 1 / (1 + Math.exp(-lme)) };
  });
}

/** The species worth showing now, most confident first. */
export function wykryte(wyniki: Wynik[], { zMiejscem }: { zMiejscem: boolean }): Wynik[] {
  return wyniki
    .filter((w) => w.confidence >= PROG_PEWNOSCI && (!zMiejscem || w.geoscore >= PROG_MIEJSCA))
    .sort((a, b) => b.confidence - a.confidence);
}

/** Adds what is heard now to the session's list: new species join, known ones keep their best confidence and the latest time. */
export function dopisz(lista: Uslyszany[], teraz: Wynik[], czas: number): Uslyszany[] {
  const wgNazwy = new Map(lista.map((u) => [u.lat, u]));
  for (const w of teraz) {
    const byl = wgNazwy.get(w.scientificName);
    wgNazwy.set(w.scientificName, {
      lat: w.scientificName,
      pl: w.commonNameI18n,
      pewnosc: Math.max(byl?.pewnosc ?? 0, w.confidence),
      ostatnio: czas,
    });
  }
  return [...wgNazwy.values()].sort((a, b) => b.ostatnio - a.ostatnio || b.pewnosc - a.pewnosc);
}

/**
 * A heard species' page in the course, matched by its Latin name. BirdNET
 * follows another taxonomy for a few genera, so `INNE_NAZWY` maps its name to
 * the atlas's. (The model does not know every raptor: vultures, the
 * lammergeier and a few others hardly call.)
 */
export function wKursie(lat: string, poLacinie: ReadonlyMap<string, string>): string | undefined {
  return poLacinie.get(INNE_NAZWY[lat] ?? lat);
}

const INNE_NAZWY: Record<string, string> = {
  'Hieraaetus pennatus': 'Aquila pennata',
};
