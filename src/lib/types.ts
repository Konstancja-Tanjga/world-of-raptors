import type { State } from 'ts-fsrs';
import type { Kolor, Zachowanie } from './rozpoznawanie';

export type Region = 'gibraltar' | 'poludnie-hiszpanii' | 'polska';
/** A site with its own field list (a field module and its checklist). Not in browser storage, but lesson links name it (`?miejsce=`), so a rename must update them. */
export type Miejsce = 'marismas-barbate';
export type Aktywnosc = 'dzienny' | 'nocny';
export type Status = 'wedrowny' | 'osiadly' | 'zimuje' | 'rzadki';

/** The eight silhouette groups of B1 lesson 1, in the order it teaches them (lower case, as in `sylwetka.grupa`). */
export const GRUPY_SYLWETEK = ['sępy', 'orły', 'myszołowy', 'kanie', 'błotniaki', 'krogulce', 'sokoły', 'rybołów'] as const;
export type GrupaSylwetkiKlucz = (typeof GRUPY_SYLWETEK)[number];

/** What to look at in a diurnal raptor, in the order B1 teaches it (lessons 1–2). */
export const KLUCZE_DZIENNE = ['grupa', 'skrzydla', 'palce', 'ogon', 'glowa', 'lot'] as const;
export type SylwetkaDzienna = Record<(typeof KLUCZE_DZIENNE)[number], string>;
/** What to listen and look for in an owl, in the order B5 teaches it (lesson 2). */
export const KLUCZE_NOCNE = ['glos', 'uszy', 'sylwetka', 'glowa', 'oczy'] as const;
export type SylwetkaNocna = Record<(typeof KLUCZE_NOCNE)[number], string>;
/** What to look at in a wader, in the order B8 teaches it: shape before colour. */
export const KLUCZE_SIEWKOWE = ['wielkosc', 'dziob', 'nogi', 'zachowanie', 'upierzenie', 'lot', 'glos'] as const;
export type CechySiewkowca = Record<(typeof KLUCZE_SIEWKOWE)[number], string>;

/** Everything about a species except its activity and the cues that go with it. */
export type DaneGatunku = {
  id: string;
  pl: string;
  lat: string;
  en: string;
  es: string;
  grupa: string;
  status: Status[];
  rozpietosc_cm: [number, number];
  /** Body length, bill tip to tail tip: what a perched bird shows. */
  dlugosc_cm: [number, number];
  sezon: string;
  cechy: string[];
  /** Plumage colours seen in the field (both sexes, young and adult, every morph), for "Rozpoznaj". */
  kolory: Kolor[];
  /** What it is seen doing, for "Rozpoznaj". */
  zachowania: Zachowanie[];
  mylona_z: string[];
  gdzie: string;
  regiony: Region[];
  /** Sites whose field list includes it. */
  miejsca?: Miejsce[];
};

/**
 * Activity and the identification cues that go with it: diurnal keys for
 * `dzienny`, owl keys for `nocny`. content.ts checks the keys at build, so
 * checking `aktywnosc` narrows `sylwetka` without a cast.
 */
export type SylwetkaGatunku =
  | { aktywnosc: 'dzienny'; sylwetka: SylwetkaDzienna }
  | { aktywnosc: 'nocny'; sylwetka: SylwetkaNocna };

export type Gatunek = DaneGatunku & SylwetkaGatunku;
export type GatunekDzienny = Extract<Gatunek, { aktywnosc: 'dzienny' }>;

export type Lekcja = { slug: string; tytul: string };

export type Modul = {
  id: string;
  slug: string | null;
  sciezka: 'a' | 'b';
  tytul: string;
  gotowy: boolean;
  lekcje?: Lekcja[];
};

/**
 * A familiar bird to measure raptors against (content/miarka.json, B7): not a
 * raptor, so it has no silhouette and stays out of the atlas and the flashcards.
 */
export type PtakMiarki = { id: string; pl: string; lat: string; dlugosc_cm: [number, number]; rozpietosc_cm: [number, number] };

export type Sciezka = { id: 'a' | 'b'; tytul: string };

export const REGIONY: { value: Region; label: string }[] = [
  { value: 'gibraltar', label: 'Cieśnina Gibraltarska' },
  { value: 'poludnie-hiszpanii', label: 'Południe Hiszpanii' },
  { value: 'polska', label: 'Polska' },
];

export const MIEJSCA: { value: Miejsce; label: string }[] = [{ value: 'marismas-barbate', label: 'Marismas del Barbate' }];

/**
 * Birds of marshes, the species other than raptors ("Ptaki mokradeł", content/ptaki-mokradel.json): the other
 * species of a site's field list. They live outside gatunki.json because
 * everything built on raptors (silhouettes, flashcards, the scale view, Moje
 * niebo's rings) has nothing to say about them.
 */
export const GRUPY_MOKRADEL = ['ibisy', 'czaple', 'siewkowe', 'mewy-i-rybitwy', 'inne-niewroblowe', 'wroblowe'] as const;
export type GrupaMokradel = (typeof GRUPY_MOKRADEL)[number];
/** A group of a site's field list: its raptors, or one group of its birds of marshes. */
export type GrupaListyMiejsca = 'drapiezniki' | GrupaMokradel;
export const NAZWY_GRUP_MOKRADEL: Record<GrupaMokradel, string> = {
  ibisy: 'Gatunek specjalny',
  czaple: 'Czaple, flaming, warzęcha',
  siewkowe: 'Siewkowe',
  'mewy-i-rybitwy': 'Mewy i rybitwy',
  'inne-niewroblowe': 'Inne niewróblowe',
  wroblowe: 'Wróblowe',
};

export type PtakMokradel = {
  id: string;
  pl: string;
  lat: string;
  en: string;
  es: string;
  grupa: GrupaMokradel;
  /** What to look for in the field: one or two short sentences. */
  cechy: string[];
  /** Field lists it is on; empty only for a bird taught as a full species (`rozpoznawanie`) that is on none. */
  miejsca: Miejsce[];
  /** What is still to check by hand (listed by `next dev`, never on a page). */
  todo?: string;
  /** Taught as a full species (the waders of B8): its cues, look-alikes, sizes and flashcards. */
  rozpoznawanie?: RozpoznawanieMokradel;
};

/**
 * What makes a bird of marshes a full species, like a raptor: cues compared
 * with its look-alikes on its plate, sizes for the bird scale, flashcards and
 * Moje niebo's rings. Only waders have it so far.
 */
export type RozpoznawanieMokradel = {
  klucz: CechySiewkowca;
  /** Other birds of marshes with `rozpoznawanie`, of the same group. */
  mylona_z: string[];
  rozpietosc_cm: [number, number];
  /** Body length, bill tip to tail tip. */
  dlugosc_cm: [number, number];
  regiony: Region[];
};

/** The two kinds of bird in the atlas; raptors are the default, birds of marshes are shown on request. */
export type Kategoria = 'drapiezne' | 'ptaki-mokradel';

/** What the atlas and the checklist list, filter and link: a raptor or a bird of marshes. */
export type PtakNaLiscie = {
  id: string;
  pl: string;
  lat: string;
  en: string;
  es: string;
  kategoria: Kategoria;
  /** The group it is listed under (a raptor's family, or a group of birds of marshes). */
  grupa: string;
  miejsca: Miejsce[];
  /** Raptors only; birds of marshes match no region or activity filter. */
  regiony: Region[];
  aktywnosc: Aktywnosc | null;
  rzadki: boolean;
};

export const STATUS_LABEL: Record<Status, string> = {
  wedrowny: 'wędrowny',
  osiadly: 'osiadły',
  zimuje: 'zimuje',
  rzadki: 'rzadki',
};

/** A Wikimedia Commons photo with the attribution its licence requires. */
export type Zdjecie = {
  src: string;
  width: number;
  height: number;
  autor: string;
  licencja: string;
  licencjaUrl: string;
  /** Commons file page. */
  strona: string;
  plik: string;
  /** The original's [width, height] on Commons, so larger thumbnails are only asked for when they exist. */
  oryginal?: [number, number];
  /**
   * [x, y] in percent: the bird's head (perched) or the middle of the bird
   * (in flight). Used as `object-position`, which keeps that point inside any
   * crop, so a 4:3 tile or a wide hero never cuts the head off.
   */
  fokus?: [number, number];
};

/**
 * The plate's third photo: the view that most helps to tell the species apart
 * and that the other two do not show (the other sex, a juvenile, a colour
 * morph, a field mark). `podpis` names that view ("Samica", "Młody ptak");
 * `alt` describes the photo, since the label alone does not.
 */
export type ZdjecieCechy = Zdjecie & { podpis: string; alt: string };

export type ZdjeciaGatunku = {
  siedzacy: Zdjecie | null;
  lot: Zdjecie | null;
  cecha?: ZdjecieCechy | null;
};

/** A curiosity shown in rotating "Ciekawostka" cards; `tekst` is inline Markdown. */
export type Ciekawostka = {
  id: string;
  tekst: string;
  modul: string;
  lekcja: string | null;
  gatunki: string[];
};

/** A curiosity ready to render: where to read more about it. */
export type CiekawostkaDoPokazania = { id: string; tekst: string; href: string; zrodlo: string };

/** One quiz question; `poprawna` is the index into `odpowiedzi`. */
export type PytanieQuizu = { pytanie: string; odpowiedzi: string[]; poprawna: number };

/** A lesson's step-by-step quiz; `prog` is the pass mark in percent. */
export type Quiz = { prog: number; pytania: PytanieQuizu[] };

/**
 * ts-fsrs's card states as each stored card carries them (New is never
 * stored). Spelled out because the enum is a value of the scheduler's module,
 * which declares no `sideEffects`, so importing it would bring the whole
 * scheduler; the annotation fails the type check if ts-fsrs renumbers them.
 * Here, without a directive, because the "Moje niebo" rules also run at build.
 */
export const STAN_KARTY: { nauka: State.Learning; powtorki: State.Review; ponowna: State.Relearning } = {
  nauka: 1,
  powtorki: 2,
  ponowna: 3,
};

/** The directions of the name cards: from the Polish name and to it. */
export const KIERUNKI_NAZW = ['pl-en', 'pl-es', 'en-pl', 'es-pl'] as const;
/**
 * The two reference views a species has. Not `cecha`: that photo shows one
 * age, sex or morph and its label and alt text say which, so it would give
 * the answer away on a photo card.
 */
export type RodzajZdjecia = Exclude<keyof ZdjeciaGatunku, 'cecha'>;
/**
 * What a flashcard asks. Photo cards (`lot`, `siedzacy`): name the bird in a
 * reference photo. `sylwetka`: name it from its silhouette in flight (diurnal
 * species). Name cards: give the English or Spanish name for the Polish one,
 * or the Polish name for the English or Spanish one. `glos`: name it from its
 * voice (a species with an approved recording marked for its card).
 */
export type RodzajFiszki = RodzajZdjecia | 'sylwetka' | (typeof KIERUNKI_NAZW)[number] | 'glos';

/** `<species id>/<rodzaj>`: the key of the card's schedule in localStorage and in backups. Never change it for an existing kind. */
export type IdFiszki = `${string}/${RodzajFiszki}`;
export const idFiszki = (gatunek: string, rodzaj: RodzajFiszki): IdFiszki => `${gatunek}/${rodzaj}`;
/** The species a card belongs to (species ids contain no `/`; content.ts checks). */
export const gatunekFiszki = (id: string) => id.split('/')[0];

/** A flashcard: a photo card always has its photo; name cards may carry one to show with the answer. */
export type Fiszka =
  | { id: IdFiszki; rodzaj: RodzajZdjecia; gatunek: string; /** The photo the card asks about. */ zdjecie: Zdjecie }
  | {
      id: IdFiszki;
      rodzaj: 'glos';
      gatunek: string;
      /** The recording the card plays; its sources (which name the species) wait for the answer. */
      nagranie: NagranieLekcji;
      sonogram?: { src: string; khz: number };
      /** A photo shown with the answer, if any. */
      zdjecie: Zdjecie | null;
    }
  | {
      id: IdFiszki;
      rodzaj: Exclude<RodzajFiszki, RodzajZdjecia | 'glos'>;
      gatunek: string;
      /** A photo shown with the answer, if any. */
      zdjecie: Zdjecie | null;
    };

/**
 * A card of the "Budowa ptaka" deck (module A9): `czesc-obraz` shows the 3D
 * model with one part lit and asks its name; `czesc-nazwa` shows the name and
 * asks where the part lies and what it does. Ids are `budowa:<part>/<kind>`,
 * so a part's two cards are siblings like a species' cards (`gatunek` is
 * `budowa:<part>`). Never rename a part id: it is a stored key.
 */
export type RodzajFiszkiBudowy = 'czesc-obraz' | 'czesc-nazwa';
export type FiszkaBudowy = {
  id: `budowa:${string}/${RodzajFiszkiBudowy}`;
  rodzaj: RodzajFiszkiBudowy;
  gatunek: `budowa:${string}`;
  czesc: { id: string; nazwa: string; lac?: string; opis: string };
  /** The model with the part lit, drawn by scripts/budowa-obrazy.mjs. */
  obraz: { src: string; width: number; height: number };
  /** The lesson that teaches the part. */
  lekcja: { href: string; tytul: string };
};
/** Any card the flashcards page shows. */
export type KartaFiszki = Fiszka | FiszkaBudowy;
export const jestFiszkaBudowy = (k: KartaFiszki): k is FiszkaBudowy => k.rodzaj === 'czesc-obraz' || k.rodzaj === 'czesc-nazwa';

/** What the answer side shows about a species. */
export type GatunekFiszki = Pick<DaneGatunku, 'id' | 'pl' | 'lat' | 'en' | 'es' | 'grupa' | 'cechy' | 'regiony'> &
  (SylwetkaGatunku | { aktywnosc: null; /** A wader's cues (KLUCZE_SIEWKOWE). */ klucz: CechySiewkowca }) & {
    kategoria: Kategoria;
    /** Look-alikes from `mylona_z`, with their names. */
    podobne: { id: string; pl: string }[];
  };

/**
 * One of the eight silhouette groups, as the table in B1 lesson 1 gives it.
 * The cells are inline Markdown (bold only).
 */
export type GrupaSylwetki = {
  nazwa: string;
  skrzydla: string;
  ogon: string;
  glowa: string;
  przyklady: string;
  /** The atlas species whose silhouette stands for the group. */
  gatunek: string;
};

/**
 * A bird sound with the credit its licence requires: a Wikimedia Commons file
 * (most are xeno-canto mirrors), or a freely licensed xeno-canto recording
 * served from public/nagrania/ when Commons has none.
 */
export type Nagranie = {
  src: string;
  autor: string;
  licencja: string;
  licencjaUrl: string;
  /** The Commons file page, or the xeno-canto page; its title names the species, so the test shows it only after the answer. */
  strona: string;
  /** xeno-canto catalogue number, for a recording that came from there. */
  xc?: number;
  /** xeno-canto's quality rating, A best, where it is known. */
  ocena?: string;
  sekundy: number;
  /** The owner has listened to it and confirmed the species and that the bird is clearly audible. */
  zatwierdzone: boolean;
};

/** A recording a lesson plays (`<glos data-id="puszczyk/samiec">`), from content/nagrania.json. */
export type NagranieLekcji = Nagranie & {
  /** The atlas species heard. */
  gatunek: string;
  /** What is heard, shown above the player: "Samiec: głos terytorialny". */
  opis: string;
  /** A sonogram of its first seconds is in public/sonogramy/, up to `khz`, drawn from `zrodlo` (scripts/sonogramy.py draws it). */
  sonogram?: { khz: 2 | 4; zrodlo: string };
  /** The species' voice flashcard plays this one (at most one per species; only once `zatwierdzone`). */
  fiszka?: true;
};

export type RodzajPytaniaTestu = 'sylwetka' | 'zdjecie' | 'glos' | 'wiedza';

/** One question of the starting test (Moduł 0), ready to show: nothing on the question side names the answer. */
export type PytanieTestu = {
  id: string;
  rodzaj: RodzajPytaniaTestu;
  /** Path A (biology) or B (identification): the result is given per path. */
  sciezka: 'a' | 'b';
  pytanie: string;
  odpowiedzi: string[];
  poprawna: number;
  /** For photos and silhouettes: the species, named only after the answer. */
  gatunek?: { id: string; pl: string; lat: string };
  zdjecie?: Zdjecie;
  nagranie?: Nagranie;
  /** Knowledge questions: the lesson that teaches the topic, linked after the answer. */
  zrodlo?: { href: string; tytul: string };
};
