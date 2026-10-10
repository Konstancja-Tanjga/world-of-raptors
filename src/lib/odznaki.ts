import { jestWidziany, type Checklista } from './obserwacje';
import { dataLokalna } from './daty';
import type { Fiszki, ZapisFiszki } from './fiszki';
import type { Postep } from './postep';
import { KOCIOL } from './rysunki';
import { idFiszki, KIERUNKI_NAZW, STAN_KARTY, type GrupaListyMiejsca, type IdFiszki, type RodzajZdjecia } from './types';

/**
 * "Moje niebo": what the course has to collect, and the rules that decide
 * it, all computed from what the browser already keeps (finished lessons,
 * flashcard schedules, the checklist). Nothing here is stored; zdobyte.ts
 * keeps only when each constellation, gold star and patch was first earned,
 * and whether its moment has played. No directive and no browser APIs: the
 * build runs these rules too (sprawdzSpojnosc in content.ts).
 */

/** What the rules need to know about a species. */
export type GatunekNieba = {
  id: string;
  pl: string;
  dzienny: boolean;
  /** The reference photos it has; each is a flashcard. */
  zdjecia: RodzajZdjecia[];
  /** Lessons that teach it ("modul/lekcja"): those with its plate, or, with none, those naming it. */
  lekcje: string[];
};

/** What the rules need to know about a module. */
export type ModulNieba = {
  /** Also the key of its constellation and gold star in zdobyte.ts: a module's slug is never renamed. */
  slug: string;
  id: string;
  tytul: string;
  /** Its lessons, as progress keys ("modul/lekcja"). */
  lekcje: string[];
  /**
   * The species to recognise for its gold star: those it teaches with plates,
   * else those its lessons name in italics; B1 teaches the eight silhouette
   * groups, so it asks for their birds.
   */
  gatunki: string[];
  /** The name of the constellation it lights when finished (its stars: gwiazdozbioryKursu() in content.ts). */
  nazwaGwiazdozbioru: string;
};

export type StrukturaNieba = {
  moduly: ModulNieba[];
  gatunki: GatunekNieba[];
  /** The bird that draws each of the eight silhouette groups (B1 lesson 1). */
  osiemGrup: string[];
  /** The Marismas del Barbate field list, group by group (raptors and birds of marshes), for its patches. */
  marismas: { id: GrupaListyMiejsca; gatunki: string[] }[];
};

/**
 * A flashcard counts as learned once FSRS has it in review with the next one
 * a week or more away, and I have answered it on a later day than the first
 * time: good answers over days, not one lucky "Od razu", which on a new card
 * can schedule it that far at once.
 */
export const zapamietana = (z: ZapisFiszki | undefined) =>
  z !== undefined &&
  z.state === STAN_KARTY.powtorki &&
  z.scheduled_days >= 7 &&
  z.last_review !== undefined &&
  dataLokalna(new Date(z.last_review)) > z.wprowadzona;

/** The ids of the flashcards I have learned. */
export const zapamietaneKarty = (fiszki: Fiszki): ReadonlySet<string> =>
  new Set(Object.keys(fiszki).filter((id) => zapamietana(fiszki[id])));

/** Every flashcard of a species, by the same rules as taliaFiszek (the build checks they agree). */
export const kartyGatunku = (g: GatunekNieba): IdFiszki[] => [
  ...g.zdjecia.map((r) => idFiszki(g.id, r)),
  ...(g.dzienny ? [idFiszki(g.id, 'sylwetka')] : []),
  ...KIERUNKI_NAZW.map((k) => idFiszki(g.id, k)),
];

/** The three rings a species can earn. */
export type Obraczki = { znam: boolean; rozpoznaje: boolean; widzialam: boolean };

/** All three rings. */
export const komplet = (o: Obraczki) => o.znam && o.rozpoznaje && o.widzialam;

/** A species' rings: a finished lesson that teaches it, every flashcard of it learned, on my checklist. */
export function obraczki(g: GatunekNieba, postep: Postep, zapamietane: ReadonlySet<string>, lista: Checklista): Obraczki {
  return {
    znam: g.lekcje.some((k) => Boolean(postep[k])),
    rozpoznaje: kartyGatunku(g).every((id) => zapamietane.has(id)),
    widzialam: jestWidziany(lista, g.id),
  };
}

/** A module is finished when all its lessons are. */
export const zaliczony = (lekcje: string[], postep: Postep) => lekcje.every((k) => Boolean(postep[k]));

/**
 * A patch's picture when it is not a raptor (Naszywka.tsx draws them): a
 * wader's tracks in the mud, a colour-ringed leg, the tide rising in a
 * channel (`fale`: how high, one to four waves).
 */
export type Emblemat = { rodzaj: 'slady' } | { rodzaj: 'obraczki' } | { rodzaj: 'przyplyw'; fale: 1 | 2 | 3 | 4 };

/** A patch: what it is for, the bird it shows (or its emblem) and its embroidery colours. */
export type Naszywka = {
  /** Also its key in zdobyte.ts: a patch's id is never renamed. */
  id: string;
  nazwa: string;
  /** The name embroidered on the rim when `nazwa` is too long to fit there (about 24 characters). */
  napis?: string;
  /** How to earn it, shown under the patch. */
  jak: string;
  kolory: { tlo: string; brzeg: string; nic: string; ptak: string };
  /** How far along I am: what I have of what it takes. */
  postep: (s: Omit<StanNieba, 'naszywki'>, struktura: StrukturaNieba) => [ile: number, z: number];
} & (
  | {
      /** Its bird, or the two of a pair (atlas species with silhouettes; the build checks). */
      ptaki: [string] | [string, string];
      emblemat?: never;
    }
  | { emblemat: Emblemat; ptaki?: never }
);

const PARY = ['myszolow', 'trzmielojad', 'krogulec', 'jastrzab', 'kania-ruda', 'kania-czarna', 'blotniak-lakowy', 'blotniak-zbozowy'];
const SZYBUJACE = [...new Set(KOCIOL.map((p) => p.id))];
const ile = (n: number, z: number): [number, number] => [Math.min(n, z), z];

/** Species of the Marismas list seen: in all, or in one of its groups (content.ts, listaMiejsca). */
const naMarismas = (s: Omit<StanNieba, 'naszywki'>, grupa?: GrupaListyMiejsca) =>
  grupa ? (s.marismas[grupa] ?? 0) : Object.values(s.marismas).reduce((a, b) => a + b, 0);
const ileMarismas = (st: StrukturaNieba, grupa?: GrupaListyMiejsca) =>
  st.marismas.filter((g) => !grupa || g.id === grupa).reduce((n, g) => n + g.gatunki.length, 0);

export const NASZYWKI: Naszywka[] = [
  {
    id: 'pierwszy-lifer',
    nazwa: 'Pierwszy lifer',
    jak: 'Pierwszy gatunek na mojej liście życiowej.',
    ptaki: ['kania-ruda'],
    kolory: { tlo: '#a54a24', brzeg: '#7c3519', nic: '#f5b75b', ptak: '#f2eee6' },
    postep: (s) => ile(s.lifery, 1),
  },
  {
    id: 'dziesiatka',
    nazwa: 'Dziesiątka',
    jak: '10 gatunków na liście życiowej.',
    ptaki: ['jastrzab'],
    kolory: { tlo: '#2a62a0', brzeg: '#173e6b', nic: '#f2eee6', ptak: '#0d131b' },
    postep: (s) => ile(s.lifery, 10),
  },
  {
    id: 'pol-atlasu',
    nazwa: 'Pół atlasu',
    jak: 'Połowa drapieżników z atlasu na liście życiowej.',
    ptaki: ['bielik'],
    kolory: { tlo: '#14243c', brzeg: '#0a1018', nic: '#f5b75b', ptak: '#f2eee6' },
    postep: (s, st) => ile(s.lifery, Math.ceil(st.gatunki.length / 2)),
  },
  {
    id: 'pelny-atlas',
    nazwa: 'Pełny atlas',
    jak: 'Wszystkie drapieżniki z atlasu na liście życiowej.',
    ptaki: ['orzel-przedni'],
    kolory: { tlo: '#d39a3e', brzeg: '#9a6a22', nic: '#14243c', ptak: '#0d131b' },
    postep: (s, st) => ile(s.lifery, st.gatunki.length),
  },
  {
    id: 'pierwszy-gwiazdozbior',
    nazwa: 'Pierwszy gwiazdozbiór',
    jak: 'Pierwszy zaliczony moduł.',
    ptaki: ['sokol-wedrowny'],
    kolory: { tlo: '#14243c', brzeg: '#0a1018', nic: '#f2eee6', ptak: '#f5b75b' },
    postep: (s) => ile(Object.values(s.moduly).filter((m) => m.zaliczony).length, 1),
  },
  {
    id: 'cale-niebo',
    nazwa: 'Całe niebo',
    jak: 'Wszystkie moduły zaliczone, wszystkie gwiazdozbiory zapalone.',
    ptaki: ['orlosep'],
    kolory: { tlo: '#0a1018', brzeg: '#04070e', nic: '#f5b75b', ptak: '#f5b75b' },
    postep: (s, st) => ile(Object.values(s.moduly).filter((m) => m.zaliczony).length, st.moduly.length),
  },
  {
    id: 'pierwszy-komplet',
    nazwa: 'Pierwszy komplet',
    jak: 'Gatunek ze wszystkimi trzema obrączkami: znam go, rozpoznaję i widziałam.',
    ptaki: ['kania-czarna'],
    kolory: { tlo: '#a85556', brzeg: '#6e3236', nic: '#f5b75b', ptak: '#f2eee6' },
    postep: (s) => ile(Object.values(s.gatunki).filter(komplet).length, 1),
  },
  {
    id: 'osiem-grup',
    nazwa: 'Osiem grup',
    jak: 'Fiszki sylwetek ośmiu grup z B1 zapamiętane, po jednym ptaku z każdej.',
    ptaki: ['blotniak-stawowy'],
    kolory: { tlo: '#f2eee6', brzeg: '#c9c2b5', nic: '#a54a24', ptak: '#0d131b' },
    postep: (s, st) => [st.osiemGrup.filter((id) => s.zapamietane.has(idFiszki(id, 'sylwetka'))).length, st.osiemGrup.length],
  },
  {
    id: 'trudne-pary',
    nazwa: 'Trudne pary',
    jak: 'Fiszki ze zdjęć zapamiętane dla czterech par: myszołów i trzmielojad, krogulec i jastrząb, obie kanie, błotniak łąkowy i zbożowy.',
    ptaki: ['trzmielojad', 'myszolow'],
    kolory: { tlo: '#a85556', brzeg: '#6e3236', nic: '#f2eee6', ptak: '#0d131b' },
    postep: (s, st) => {
      const zdjeciaZapamietane = (id: string) =>
        st.gatunki.find((g) => g.id === id)?.zdjecia.every((r) => s.zapamietane.has(idFiszki(id, r))) ?? false;
      return [PARY.filter(zdjeciaZapamietane).length, PARY.length];
    },
  },
  {
    id: 'kociol',
    nazwa: 'Kocioł',
    jak: 'Fiszki sylwetek zapamiętane dla ptaków szybujących przez Cieśninę Gibraltarską.',
    ptaki: ['sep-plowy'],
    kolory: { tlo: '#79abda', brzeg: '#2a62a0', nic: '#0d131b', ptak: '#0d131b' },
    postep: (s) => [SZYBUJACE.filter((id) => s.zapamietane.has(idFiszki(id, 'sylwetka'))).length, SZYBUJACE.length],
  },
  {
    id: 'nocna-zmiana',
    nazwa: 'Nocna zmiana',
    jak: 'Wszystkie sowy rozpoznane: ich fiszki ze zdjęć i z nazwami zapamiętane.',
    ptaki: ['uszatka'],
    kolory: { tlo: '#0a1018', brzeg: '#04070e', nic: '#f5b75b', ptak: '#f2eee6' },
    postep: (s, st) => {
      const sowy = st.gatunki.filter((g) => !g.dzienny);
      return [sowy.filter((g) => s.gatunki[g.id]?.rozpoznaje).length, sowy.length];
    },
  },
  {
    id: 'trzy-jezyki',
    nazwa: 'Trzy języki',
    jak: '10 gatunków, których nazwy znam po polsku, angielsku i hiszpańsku: ich cztery fiszki nazw zapamiętane.',
    ptaki: ['orzel-iberyjski'],
    kolory: { tlo: '#d39a3e', brzeg: '#9a6a22', nic: '#f2eee6', ptak: '#14243c' },
    postep: (s, st) =>
      ile(st.gatunki.filter((g) => KIERUNKI_NAZW.every((k) => s.zapamietane.has(idFiszki(g.id, k)))).length, 10),
  },
  {
    id: 'marismas-pierwsza',
    nazwa: 'Pierwsza obserwacja w Marismas',
    napis: 'Pierwsza w Marismas',
    jak: 'Pierwszy gatunek z karty terenowej Marismas del Barbate.',
    emblemat: { rodzaj: 'przyplyw', fale: 1 },
    kolory: { tlo: '#79abda', brzeg: '#2a62a0', nic: '#0d131b', ptak: '#f2eee6' },
    postep: (s) => ile(naMarismas(s), 1),
  },
  {
    id: 'marismas-dziesiatka',
    nazwa: 'Dziesiątka z Marismas',
    jak: '10 gatunków z karty terenowej Marismas del Barbate.',
    emblemat: { rodzaj: 'przyplyw', fale: 2 },
    kolory: { tlo: '#2a62a0', brzeg: '#173e6b', nic: '#f2eee6', ptak: '#79abda' },
    postep: (s) => ile(naMarismas(s), 10),
  },
  {
    id: 'pol-marismas',
    nazwa: 'Pół Marismas',
    jak: 'Połowa gatunków z karty terenowej Marismas del Barbate.',
    emblemat: { rodzaj: 'przyplyw', fale: 3 },
    kolory: { tlo: '#14243c', brzeg: '#0a1018', nic: '#f5b75b', ptak: '#79abda' },
    postep: (s, st) => ile(naMarismas(s), Math.ceil(ileMarismas(st) / 2)),
  },
  {
    id: 'komplet-marismas',
    nazwa: 'Komplet Marismas',
    jak: 'Wszystkie gatunki z karty terenowej Marismas del Barbate.',
    emblemat: { rodzaj: 'przyplyw', fale: 4 },
    kolory: { tlo: '#d39a3e', brzeg: '#9a6a22', nic: '#14243c', ptak: '#14243c' },
    postep: (s, st) => ile(naMarismas(s), ileMarismas(st)),
  },
  {
    id: 'drapiezniki-marismas',
    nazwa: 'Drapieżniki Marismas',
    jak: 'Wszystkie drapieżniki z karty terenowej Marismas del Barbate.',
    ptaki: ['rybolow', 'kaniuk'],
    kolory: { tlo: '#a54a24', brzeg: '#7c3519', nic: '#f5b75b', ptak: '#f2eee6' },
    postep: (s, st) => ile(naMarismas(s, 'drapiezniki'), ileMarismas(st, 'drapiezniki')),
  },
  {
    id: 'lachy-przy-odplywie',
    nazwa: 'Łachy przy odpływie',
    jak: 'Wszystkie siewkowe z karty terenowej Marismas del Barbate.',
    emblemat: { rodzaj: 'slady' },
    kolory: { tlo: '#c9c2b5', brzeg: '#9a6a22', nic: '#14243c', ptak: '#14243c' },
    postep: (s, st) => ile(naMarismas(s, 'siewkowe'), ileMarismas(st, 'siewkowe')),
  },
  {
    id: 'ibis-grzywiasty',
    nazwa: 'Ibis grzywiasty',
    jak: 'Ibis grzywiasty na mojej karcie terenowej.',
    emblemat: { rodzaj: 'obraczki' },
    kolory: { tlo: '#a85556', brzeg: '#6e3236', nic: '#f5b75b', ptak: '#0d131b' },
    postep: (s, st) => ile(naMarismas(s, 'ibisy'), ileMarismas(st, 'ibisy')),
  },
];

export type StanNieba = {
  gatunki: Record<string, Obraczki>;
  moduly: Record<string, { zaliczony: boolean; opanowany: boolean }>;
  naszywki: Record<string, { zdobyta: boolean; postep: [ile: number, z: number] }>;
  /** Raptors on the checklist (birds of marshes count only for the Marismas patches). */
  lifery: number;
  /** Species of the Marismas field list seen, by its group's id. */
  marismas: Partial<Record<GrupaListyMiejsca, number>>;
  /** Ids of the learned flashcards. */
  zapamietane: ReadonlySet<string>;
};

/** What the three browser stores earn now; zdobyte.ts keeps what was earned before. */
export function stanNieba(struktura: StrukturaNieba, postep: Postep, fiszki: Fiszki, lista: Checklista): StanNieba {
  const zapamietane = zapamietaneKarty(fiszki);
  const gatunki: Record<string, Obraczki> = {};
  for (const g of struktura.gatunki) gatunki[g.id] = obraczki(g, postep, zapamietane, lista);
  const moduly: StanNieba['moduly'] = {};
  for (const m of struktura.moduly) {
    const z = zaliczony(m.lekcje, postep);
    moduly[m.slug] = { zaliczony: z, opanowany: z && m.gatunki.length > 0 && m.gatunki.every((id) => gatunki[id]?.rozpoznaje) };
  }
  const lifery = struktura.gatunki.filter((g) => gatunki[g.id].widzialam).length;
  const marismas = Object.fromEntries(struktura.marismas.map((g) => [g.id, g.gatunki.filter((id) => jestWidziany(lista, id)).length]));
  const bezNaszywek = { gatunki, moduly, lifery, marismas, zapamietane };
  const naszywki: StanNieba['naszywki'] = {};
  for (const n of NASZYWKI) {
    const [ma, z] = n.postep(bezNaszywek, struktura);
    // Nothing to collect (an empty list) earns nothing.
    naszywki[n.id] = { zdobyta: z > 0 && ma >= z, postep: [ma, z] };
  }
  return { ...bezNaszywek, naszywki };
}

/** A key of what stays earned once earned, as zdobyte.ts stores it. */
export type KluczOdznaki = `gwiazdozbior:${string}` | `mistrz:${string}` | `naszywka:${string}`;
export const kluczGwiazdozbioru = (slug: string): KluczOdznaki => `gwiazdozbior:${slug}`;
export const kluczMistrza = (slug: string): KluczOdznaki => `mistrz:${slug}`;
export const kluczNaszywki = (id: string): KluczOdznaki => `naszywka:${id}`;

const RODZAJE_KLUCZY = ['gwiazdozbior', 'mistrz', 'naszywka'] as const;

/** What a key stands for: a module's constellation or gold star (by its slug), or a patch (by its id). */
export function rozbierzKlucz(klucz: string): { rodzaj: (typeof RODZAJE_KLUCZY)[number]; id: string } | null {
  const i = klucz.indexOf(':');
  const rodzaj = RODZAJE_KLUCZY.find((r) => r === klucz.slice(0, i));
  return rodzaj && i > 0 ? { rodzaj, id: klucz.slice(i + 1) } : null;
}

/** The keys earned in this state. */
export function zdobyteWStanie(s: StanNieba): KluczOdznaki[] {
  return [
    ...Object.entries(s.moduly).flatMap(([slug, m]) => [
      ...(m.zaliczony ? [kluczGwiazdozbioru(slug)] : []),
      ...(m.opanowany ? [kluczMistrza(slug)] : []),
    ]),
    ...Object.entries(s.naszywki).filter(([, n]) => n.zdobyta).map(([id]) => kluczNaszywki(id)),
  ];
}
