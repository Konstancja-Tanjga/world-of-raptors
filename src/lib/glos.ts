/**
 * "Rozpoznaj po głosie": the rules that turn BirdNET's scores into what the
 * page lists, kept free of React and browser APIs so they can be tested. The
 * model itself runs in BirdNET Live's worker (public/birdnet/, see
 * scripts/birdnet.sh); every 1.5 s it scores the last 3 seconds of the
 * microphone for each of its ~6500 species.
 */

/** One species' score for one 3-second window, as the worker sends it ("pooled"; a single window, so nothing is pooled yet). */
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

/** The sample rate the model expects, and its window: 3 seconds. */
export const CZESTOTLIWOSC = 48000;
export const OKNO = CZESTOTLIWOSC * 3;

/**
 * How many windows a species' score is smoothed over: 5, as in BirdNET Live,
 * but scored every 1.5 s here, so about the last 7.5 seconds.
 */
export const OKNA_WYGLADZANIA = 5;
/**
 * Below this smoothed confidence a species is not listed. BirdNET Live's
 * default is 0.15; a beginner is better served by fewer false alarms. (Measured
 * with this page's smoothing and pace on a tawny owl's duet: a scops owl rose
 * to 0.28 while the tawny owl stayed above 0.5.)
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
 * Smooths each species' confidence over the last `n` windows by a log-mean-exp
 * of the logits (the log of the mean odds). Windows not yet heard, right after
 * the start, count as silence, as does a species missing from a window. A brief
 * moderate score is pulled down by the quiet around it (0.6 in one window of
 * five ends near 0.24); a strong one still shows (0.9 ends near 0.64), and a
 * call that lasts stays up.
 */
export function wygladz(okna: Wynik[][], n = OKNA_WYGLADZANIA): Wynik[] {
  const ostatnie = okna.slice(-n);
  const wgIndeksu = new Map<number, { probki: number[]; wzor: Wynik }>();
  for (const okno of ostatnie) {
    for (const w of okno) {
      const wpis = wgIndeksu.get(w.index) ?? { probki: [], wzor: w };
      wpis.probki.push(w.confidence);
      // Names and the chance here come from the latest window: a location may have arrived since.
      wpis.wzor = w;
      wgIndeksu.set(w.index, wpis);
    }
  }
  return [...wgIndeksu.values()].map(({ probki, wzor }) => {
    const logity = [...probki, ...Array(n - probki.length).fill(0)].map(logit);
    const max = Math.max(...logity);
    const lme = max + Math.log(logity.reduce((s, l) => s + Math.exp(l - max), 0) / logity.length);
    return { ...wzor, confidence: 1 / (1 + Math.exp(-lme)) };
  });
}

/** The species worth showing now, most confident first, at most `najwyzej`. */
export function wykryte(wyniki: Wynik[], { zMiejscem, najwyzej = 5 }: { zMiejscem: boolean; najwyzej?: number }): Wynik[] {
  return wyniki
    .filter((w) => w.confidence >= PROG_PEWNOSCI && (!zMiejscem || w.geoscore >= PROG_MIEJSCA))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, najwyzej);
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

/** The microphone's last 3 seconds as a ring: `zapis` is where the next sample goes. */
export type Bufor = { probki: Float32Array; zapis: number };

export const nowyBufor = (dlugosc = OKNO): Bufor => ({ probki: new Float32Array(dlugosc), zapis: 0 });

/** Writes a chunk from the microphone into the ring, overwriting the oldest samples. */
export function dopiszProbki(b: Bufor, dane: Float32Array) {
  for (let i = 0; i < dane.length; i++) {
    b.probki[b.zapis] = dane[i];
    b.zapis = (b.zapis + 1) % b.probki.length;
  }
}

/** The ring unrolled in time, oldest sample first, as a new array the model may take. */
export function rozwin({ probki, zapis }: Bufor): Float32Array {
  const okno = new Float32Array(probki.length);
  okno.set(probki.subarray(zapis));
  okno.set(probki.subarray(0, zapis), probki.length - zapis);
  return okno;
}

/** A heard species' page in the course, matched by its Latin name (`INNE_NAZWY` maps where BirdNET's differs). */
export function wKursie(lat: string, poLacinie: ReadonlyMap<string, string>): string | undefined {
  return poLacinie.get(INNE_NAZWY[lat] ?? lat);
}

/** BirdNET's name for an atlas species whose name it spells otherwise (today only the booted eagle). */
export const INNE_NAZWY: Record<string, string> = {
  'Hieraaetus pennatus': 'Aquila pennata',
};

/** Atlas species the model does not know under any name, so it can never name them (glos.test.ts checks the list against the labels). */
export const NIEZNANE_MODELOWI = [
  'Buteo rufinus',
  'Neophron percnopterus',
  'Gyps rueppelli',
  'Aquila fasciata',
  'Falco eleonorae',
  'Gypaetus barbatus',
];
