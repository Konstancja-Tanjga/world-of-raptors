export type Region = 'gibraltar' | 'poludnie-hiszpanii' | 'polska';
export type Aktywnosc = 'dzienny' | 'nocny';
export type Status = 'wedrowny' | 'osiadly' | 'zimuje' | 'rzadki';

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
};

export type ZdjeciaGatunku = { siedzacy: Zdjecie | null; lot: Zdjecie | null };
