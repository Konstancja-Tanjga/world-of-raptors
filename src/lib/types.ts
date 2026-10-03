export type Region = 'gibraltar' | 'poludnie-hiszpanii' | 'polska';
export type Aktywnosc = 'dzienny' | 'nocny';
export type Status = 'wedrowny' | 'osiadly' | 'zimuje' | 'rzadki';

/** What to look at in a diurnal raptor, as taught in B1 (lessons 1–2). */
export type SylwetkaDzienna = Record<'grupa' | 'skrzydla' | 'palce' | 'ogon' | 'glowa' | 'lot', string>;
/** What to look and listen for in an owl, as taught in B5 (lesson 2). */
export type SylwetkaNocna = Record<'glos' | 'uszy' | 'oczy' | 'glowa' | 'sylwetka', string>;

export type Gatunek = {
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
  aktywnosc: Aktywnosc;
  regiony: Region[];
  /** Identification cues: diurnal keys for `dzienny`, owl keys for `nocny`. */
  sylwetka: SylwetkaDzienna | SylwetkaNocna;
};

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
  oryginal?: number[];
  /**
   * [x, y] in percent: the bird's head (perched) or the middle of the bird
   * (in flight). Used as `object-position`, which keeps that point inside any
   * crop, so a 4:3 tile or a wide hero never cuts the head off.
   */
  fokus?: number[];
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
 * What a flashcard asks. Photo cards (`lot`, `siedzacy`): name the bird in a
 * reference photo. `sylwetka`: name it from its silhouette in flight (diurnal
 * species; owls are told apart by voice, B5). Name cards: give the English or
 * Spanish name for the Polish one, or the Polish name for the English or
 * Spanish one.
 */
export type RodzajFiszki = 'lot' | 'siedzacy' | 'sylwetka' | 'pl-en' | 'pl-es' | 'en-pl' | 'es-pl';

/** A flashcard. `id` is `<species id>/<rodzaj>`, the key of its schedule in the browser. */
export type Fiszka = {
  id: string;
  rodzaj: RodzajFiszki;
  /** The species' id in `gatunki`. */
  gatunek: string;
  /** The photo a photo card asks about; on other cards a photo for the answer, if there is one. */
  zdjecie: Zdjecie | null;
};

/** What the answer side shows about a species. */
export type GatunekFiszki = Pick<
  Gatunek,
  'id' | 'pl' | 'lat' | 'en' | 'es' | 'grupa' | 'cechy' | 'regiony' | 'aktywnosc' | 'sylwetka'
> & {
  /** Look-alikes from `mylona_z`, with their names. */
  podobne: { id: string; pl: string }[];
};
