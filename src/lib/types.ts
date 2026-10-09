import type { State } from 'ts-fsrs';

export type Region = 'gibraltar' | 'poludnie-hiszpanii' | 'polska';
/** A site with its own field list (a field module and its checklist). Stored nowhere: renaming one only moves links. */
export type Miejsce = 'marismas-barbate';
export type Aktywnosc = 'dzienny' | 'nocny';
export type Status = 'wedrowny' | 'osiadly' | 'zimuje' | 'rzadki';

/** The eight silhouette groups of B1 lesson 1, in the order it teaches them (lower case, as in `sylwetka.grupa`). */
export const GRUPY_SYLWETEK = ['sępy', 'orły', 'myszołowy', 'kanie', 'błotniaki', 'krogulce', 'sokoły', 'rybołów'] as const;

/** What to look at in a diurnal raptor, in the order B1 teaches it (lessons 1–2). */
export const KLUCZE_DZIENNE = ['grupa', 'skrzydla', 'palce', 'ogon', 'glowa', 'lot'] as const;
export type SylwetkaDzienna = Record<(typeof KLUCZE_DZIENNE)[number], string>;
/** What to listen and look for in an owl, in the order B5 teaches it (lesson 2). */
export const KLUCZE_NOCNE = ['glos', 'uszy', 'sylwetka', 'glowa', 'oczy'] as const;
export type SylwetkaNocna = Record<(typeof KLUCZE_NOCNE)[number], string>;

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
  sezon: string;
  cechy: string[];
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
  miejsca: Miejsce[];
  /** What is still to check by hand (shown by the build, never on a page). */
  todo?: string;
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
 * or the Polish name for the English or Spanish one.
 */
export type RodzajFiszki = RodzajZdjecia | 'sylwetka' | (typeof KIERUNKI_NAZW)[number];

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
      rodzaj: Exclude<RodzajFiszki, RodzajZdjecia>;
      gatunek: string;
      /** A photo shown with the answer, if any. */
      zdjecie: Zdjecie | null;
    };

/** What the answer side shows about a species. */
export type GatunekFiszki = Pick<DaneGatunku, 'id' | 'pl' | 'lat' | 'en' | 'es' | 'grupa' | 'cechy' | 'regiony'> &
  SylwetkaGatunku & {
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
