import type { Checklista } from './checklist';
import { STAN_KARTY, type Fiszki, type ZapisFiszki } from './fiszki';
import type { Postep } from './postep';
import { KOCIOL } from './rysunki';
import { idFiszki, KIERUNKI_NAZW } from './types';

/**
 * "Moje niebo": what the course has to collect, and the rules that decide
 * it, all computed from what the browser already keeps (finished lessons,
 * flashcard schedules, the checklist). Nothing here is stored; zdobyte.ts
 * keeps only the date each constellation and patch was first earned.
 */

/** What the rules need to know about a species. */
export type GatunekNieba = {
  id: string;
  pl: string;
  dzienny: boolean;
  /** The reference photos it has; each is a flashcard. */
  zdjecia: ('lot' | 'siedzacy')[];
  /** Lessons that teach it ("modul/lekcja"): those with its plate, or, with none, those naming it. */
  lekcje: string[];
};

/** What the rules need to know about a module. */
export type ModulNieba = {
  slug: string;
  id: string;
  tytul: string;
  /** Its lessons, as progress keys ("modul/lekcja"). */
  lekcje: string[];
  /** The species to recognise for its gold star: those it teaches with plates, else those it names; B1's eight groups. */
  gatunki: string[];
  /** The name of the constellation that lights up when it is finished (its stars: gwiazdozbioryKursu() in content.ts). */
  gwiazdozbior: string;
};

export type StrukturaNieba = {
  moduly: ModulNieba[];
  gatunki: GatunekNieba[];
  /** The bird that draws each of the eight silhouette groups (B1 lesson 1). */
  osiemGrup: string[];
};

/**
 * A flashcard counts as learned once FSRS has a correct answer scheduled a
 * week or more ahead: a few good reviews over a week or two, not one lucky
 * guess.
 */
export const zapamietana = (z: ZapisFiszki | undefined) =>
  z !== undefined && z.state === STAN_KARTY.powtorki && z.scheduled_days >= 7;

/** Every flashcard of a species, by the same rules as taliaFiszek. */
export const kartyGatunku = (g: GatunekNieba) => [
  ...g.zdjecia.map((r) => idFiszki(g.id, r)),
  ...(g.dzienny ? [idFiszki(g.id, 'sylwetka')] : []),
  ...KIERUNKI_NAZW.map((k) => idFiszki(g.id, k)),
];

/** The three rings a species can earn. */
export type Obraczki = { znam: boolean; rozpoznaje: boolean; widzialam: boolean };

/** A patch: what it is for, the bird it shows and its embroidery colours. */
export type Naszywka = {
  id: string;
  nazwa: string;
  /** How to earn it, shown under the patch. */
  jak: string;
  ptaki: string[];
  kolory: { tlo: string; brzeg: string; nic: string; ptak: string };
  postep: (s: Omit<StanNieba, 'naszywki'>, struktura: StrukturaNieba) => [number, number];
};

const PARY = ['myszolow', 'trzmielojad', 'krogulec', 'jastrzab', 'kania-ruda', 'kania-czarna', 'blotniak-lakowy', 'blotniak-zbozowy'];
const SZYBUJACE = [...new Set(KOCIOL.map((p) => p.id))];
const ile = (n: number, z: number): [number, number] => [Math.min(n, z), z];

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
    jak: '21 gatunków na liście życiowej, połowa atlasu.',
    ptaki: ['bielik'],
    kolory: { tlo: '#14243c', brzeg: '#0a1018', nic: '#f5b75b', ptak: '#f2eee6' },
    postep: (s) => ile(s.lifery, 21),
  },
  {
    id: 'pelny-atlas',
    nazwa: 'Pełny atlas',
    jak: 'Wszystkie gatunki z atlasu na liście życiowej.',
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
    postep: (s) => ile(Object.values(s.gatunki).filter((o) => o.znam && o.rozpoznaje && o.widzialam).length, 1),
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
];

export type StanNieba = {
  gatunki: Record<string, Obraczki>;
  moduly: Record<string, { zaliczony: boolean; opanowany: boolean }>;
  naszywki: Record<string, { zdobyta: boolean; postep: [number, number] }>;
  /** Species on the checklist that are in the atlas. */
  lifery: number;
  /** Ids of the learned flashcards. */
  zapamietane: Set<string>;
};

/** Everything earned so far, from the three browser stores. */
export function stanNieba(struktura: StrukturaNieba, postep: Postep, fiszki: Fiszki, lista: Checklista): StanNieba {
  const zapamietane = new Set(Object.keys(fiszki).filter((id) => zapamietana(fiszki[id])));
  const gatunki: Record<string, Obraczki> = {};
  for (const g of struktura.gatunki) {
    gatunki[g.id] = {
      znam: g.lekcje.some((k) => Boolean(postep[k])),
      rozpoznaje: kartyGatunku(g).every((id) => zapamietane.has(id)),
      widzialam: Boolean(lista[g.id]),
    };
  }
  const moduly: StanNieba['moduly'] = {};
  for (const m of struktura.moduly) {
    const zaliczony = m.lekcje.every((k) => Boolean(postep[k]));
    moduly[m.slug] = { zaliczony, opanowany: zaliczony && m.gatunki.every((id) => gatunki[id]?.rozpoznaje) };
  }
  const lifery = struktura.gatunki.filter((g) => gatunki[g.id].widzialam).length;
  const bezNaszywek = { gatunki, moduly, lifery, zapamietane };
  const naszywki: StanNieba['naszywki'] = {};
  for (const n of NASZYWKI) {
    const postepNaszywki = n.postep(bezNaszywek, struktura);
    naszywki[n.id] = { zdobyta: postepNaszywki[0] >= postepNaszywki[1], postep: postepNaszywki };
  }
  return { ...bezNaszywek, naszywki };
}

/** Keys of what stays earned once earned, as zdobyte.ts stores them. */
export const kluczGwiazdozbioru = (slug: string) => `gwiazdozbior:${slug}`;
export const kluczMistrza = (slug: string) => `mistrz:${slug}`;
export const kluczNaszywki = (id: string) => `naszywka:${id}`;

/** The keys earned in this state. */
export function zdobyteWStanie(s: StanNieba): string[] {
  return [
    ...Object.entries(s.moduly).flatMap(([slug, m]) => [
      ...(m.zaliczony ? [kluczGwiazdozbioru(slug)] : []),
      ...(m.opanowany ? [kluczMistrza(slug)] : []),
    ]),
    ...Object.entries(s.naszywki).filter(([, n]) => n.zdobyta).map(([id]) => kluczNaszywki(id)),
  ];
}
