/**
 * The rules of B11's territory sheet (`<karta-rewirow>`), kept pure so they
 * can be tested. Raptor monitoring counts occupied territories, not birds:
 * each note from a watch point is given a breeding category (table 5.7 of the
 * GIOŚ guide, Chylarecki et al. 2015, pp. 97–100) and tied to a territory on
 * the map; a territory keeps the highest category any of its notes earned,
 * and the count is a range, from the territories with certain breeding to
 * all of them.
 */

/** Whether a category makes breeding probable or certain (the guide's two columns). */
export type Poziom = 'prawdopodobne' | 'pewne';

/**
 * The categories, lowest first, as table 5.7 lists them. ONl (a nest with a
 * pressed lining) is left out: it is found only by climbing to the nest, which
 * the method does not do, as the guide says.
 */
export const KATEGORIE = [
  { kod: 'T', nazwa: 'ślady ptaków w rewirze', poziom: 'prawdopodobne' },
  { kod: 'B', nazwa: 'pojedynczy dorosły ptak zachowujący się terytorialnie', poziom: 'prawdopodobne' },
  { kod: 'tB', nazwa: 'dwa ptaki, które nie muszą być parą', poziom: 'prawdopodobne' },
  { kod: 'P', nazwa: 'para dorosłych ptaków', poziom: 'pewne' },
  { kod: 'F', nazwa: 'rodzina: młode tuż po wylocie', poziom: 'pewne' },
  { kod: 'ON', nazwa: 'odnowione gniazdo, bez ptaków', poziom: 'pewne' },
  { kod: 'ONB', nazwa: 'pojedynczy ptak przy odnowionym gnieździe', poziom: 'pewne' },
  { kod: 'ONtB', nazwa: 'dwa ptaki przy odnowionym gnieździe', poziom: 'pewne' },
  { kod: 'ONP', nazwa: 'para przy odnowionym gnieździe', poziom: 'pewne' },
  { kod: 'ONi', nazwa: 'gniazdo wysiadywane', poziom: 'pewne' },
  { kod: 'ONe', nazwa: 'gniazdo z jajami (skorupy pod gniazdem)', poziom: 'pewne' },
  { kod: 'ONy', nazwa: 'gniazdo z pisklętami', poziom: 'pewne' },
] as const satisfies readonly { kod: string; nazwa: string; poziom: Poziom }[];

export type KodKategorii = (typeof KATEGORIE)[number]['kod'];

/** A note that shows no territory (a bird passing over, an immature bird): written down, but not counted. */
export const NIE_LICZE = 'X';
export type Kategoria = KodKategorii | typeof NIE_LICZE;

const KODY = new Set<string>(KATEGORIE.map((k) => k.kod));
export const jestKategoria = (kod: string): kod is Kategoria => kod === NIE_LICZE || KODY.has(kod);

/** Where a category stands, lowest 0; X stands below all of them. */
const ranga = (kod: Kategoria) => (kod === NIE_LICZE ? -1 : KATEGORIE.findIndex((k) => k.kod === kod));

export function poziom(kod: KodKategorii): Poziom {
  return KATEGORIE.find((k) => k.kod === kod)!.poziom;
}

/** The highest of a territory's categories, the one it is counted by (null for none). */
export function najwyzszaKategoria(kody: readonly KodKategorii[]): KodKategorii | null {
  return kody.reduce<KodKategorii | null>((naj, k) => (naj === null || ranga(k) > ranga(naj) ? k : naj), null);
}

/** One note from a watch point, with what the key says about it. */
export type Notatka = {
  id: string;
  gatunek: string;
  /** The watch point it was written at, 1-based. */
  punkt: number;
  data: string;
  godzina: string;
  opis: string;
  /** Where the behaviour pointed to, in km from the top left of the plot. */
  x: number;
  y: number;
  klucz: {
    kategoria: Kategoria;
    /** The key's territory, null for a note that shows none (X). */
    rewir: string | null;
    wyjasnienie: string;
  };
};

/** What the reader wrote for a note: a category, and the territory it belongs to (null for X). */
export type Odpowiedz = { kategoria: Kategoria; rewir: string | null };

export type Rewir = { id: string; gatunek: string; kategoria: KodKategorii; notatki: string[] };

/**
 * The territories a sheet adds up to: the notes grouped by territory, each
 * territory with its species and highest category. Notes without a territory
 * (X) are left out. `odpowiedzi` follows `notatki`, one to one; a reader who
 * has not reached the end has fewer answers, and the rest are left out.
 */
export function rewiry(notatki: readonly Notatka[], odpowiedzi: readonly (Odpowiedz | undefined)[]): Rewir[] {
  const grupy = new Map<string, { gatunek: string; kody: KodKategorii[]; notatki: string[] }>();
  notatki.forEach((n, i) => {
    const o = odpowiedzi[i];
    if (!o || o.rewir === null || o.kategoria === NIE_LICZE) return;
    const g = grupy.get(o.rewir) ?? { gatunek: n.gatunek, kody: [], notatki: [] };
    g.kody.push(o.kategoria);
    g.notatki.push(n.id);
    grupy.set(o.rewir, g);
  });
  return [...grupy].map(([id, g]) => ({ id, gatunek: g.gatunek, kategoria: najwyzszaKategoria(g.kody)!, notatki: g.notatki }));
}

/** The key's own answers, in the same shape as the reader's. */
export const odpowiedziKlucza = (notatki: readonly Notatka[]): Odpowiedz[] =>
  notatki.map((n) => ({ kategoria: n.klucz.kategoria, rewir: n.klucz.rewir }));

export type Przedzial = { min: number; max: number };

/** The count as the guide gives it: from the territories with certain breeding to all territories. */
export function liczebnosc(lista: readonly Rewir[], gatunek?: string): Przedzial {
  const tu = gatunek ? lista.filter((r) => r.gatunek === gatunek) : lista;
  return { min: tu.filter((r) => poziom(r.kategoria) === 'pewne').length, max: tu.length };
}

/**
 * Whether the territory chosen for note `i` agrees with the key, judged
 * against the reader's own earlier notes: `polaczony` when it was put with
 * notes the key places elsewhere (two territories counted as one),
 * `rozdzielony` when it was made a new territory though an earlier note
 * already stood for it (one territory counted twice). Null when the key or
 * the reader gives the note no territory.
 */
export function zgodnoscRewiru(
  notatki: readonly Notatka[],
  odpowiedzi: readonly (Odpowiedz | undefined)[],
  i: number,
): 'dobrze' | 'polaczony' | 'rozdzielony' | null {
  const o = odpowiedzi[i];
  const wzor = notatki[i].klucz.rewir;
  if (!o || o.rewir === null || o.kategoria === NIE_LICZE || wzor === null) return null;
  const wczesniej = notatki.slice(0, i).map((n, j) => ({ n, o: odpowiedzi[j] }));
  const wTym = wczesniej.filter((w) => w.o?.rewir === o.rewir && w.o.kategoria !== NIE_LICZE);
  if (wTym.length) return wTym.some((w) => w.n.klucz.rewir === wzor) ? 'dobrze' : 'polaczony';
  const juzByl = wczesniej.some((w) => w.n.klucz.rewir === wzor && w.o && w.o.rewir !== null && w.o.kategoria !== NIE_LICZE);
  return juzByl ? 'rozdzielony' : 'dobrze';
}

export type OcenaKarty = {
  kategorie: { dobrze: number; wszystkie: number };
  /** Pairs of notes put in one territory that the key keeps apart. */
  polaczone: number;
  /** Pairs of notes the key puts in one territory that the reader kept apart. */
  rozdzielone: number;
  gatunki: { gatunek: string; twoja: Przedzial; klucz: Przedzial }[];
};

/** The whole sheet against the key: categories, the territories drawn, and each species' count. */
export function ocena(notatki: readonly Notatka[], odpowiedzi: readonly Odpowiedz[]): OcenaKarty {
  let dobrze = 0;
  let polaczone = 0;
  let rozdzielone = 0;
  notatki.forEach((n, i) => {
    if (odpowiedzi[i]?.kategoria === n.klucz.kategoria) dobrze++;
  });
  const liczony = (o: Odpowiedz | undefined) => Boolean(o && o.rewir !== null && o.kategoria !== NIE_LICZE);
  for (let i = 0; i < notatki.length; i++) {
    for (let j = i + 1; j < notatki.length; j++) {
      const [a, b] = [notatki[i], notatki[j]];
      if (a.gatunek !== b.gatunek || a.klucz.rewir === null || b.klucz.rewir === null) continue;
      if (!liczony(odpowiedzi[i]) || !liczony(odpowiedzi[j])) continue;
      const wKluczu = a.klucz.rewir === b.klucz.rewir;
      const uCiebie = odpowiedzi[i].rewir === odpowiedzi[j].rewir;
      if (uCiebie && !wKluczu) polaczone++;
      if (wKluczu && !uCiebie) rozdzielone++;
    }
  }
  const twoje = rewiry(notatki, odpowiedzi);
  const wzorcowe = rewiry(notatki, odpowiedziKlucza(notatki));
  const gatunki = [...new Set(notatki.map((n) => n.gatunek))].map((gatunek) => ({
    gatunek,
    twoja: liczebnosc(twoje, gatunek),
    klucz: liczebnosc(wzorcowe, gatunek),
  }));
  return { kategorie: { dobrze, wszystkie: notatki.length }, polaczone, rozdzielone, gatunki };
}

/** A session of the sheet, as content/karta-rewirow.json holds it. */
export type TerenKarty = { rodzaj: 'las' | 'ols' | 'mlodnik' | 'woda'; x: number; y: number; rx: number; ry: number };
export type SesjaKarty = {
  id: string;
  tytul: string;
  miejsce: string;
  opis: string;
  /** The watch points, in km from the top left of the 10 × 10 km plot. */
  punkty: { x: number; y: number }[];
  teren: TerenKarty[];
  notatki: Notatka[];
};

export const BOK_POWIERZCHNI_KM = 10;
/** What a watch point covers in practice, 0.5–2 km by the guide (p. 97): every note lies within it. */
export const ZASIEG_PUNKTU_KM = 2;

/**
 * What is wrong with a session, apart from its species (content.ts checks
 * those against the atlas): ids, categories, watch points, places off the
 * plot, an X with a territory or a territory without a category, a territory
 * shared by two species.
 */
export function problemySesji(s: SesjaKarty): string[] {
  const bledy: string[] = [];
  const gdzie = `karta-rewirow.json: ${s.id}`;
  const naPowierzchni = (x: number, y: number) => x >= 0 && x <= BOK_POWIERZCHNI_KM && y >= 0 && y <= BOK_POWIERZCHNI_KM;
  if (!s.tytul || !s.miejsce || !s.opis) bledy.push(`${gdzie}: tytuł, miejsce i opis`);
  if (!s.punkty.length || s.punkty.some((p) => !naPowierzchni(p.x, p.y))) bledy.push(`${gdzie}: punkty widokowe na powierzchni 10 × 10 km`);
  if (!s.notatki.length) bledy.push(`${gdzie}: bez notatek`);
  const ids = new Set<string>();
  const gatunekRewiru = new Map<string, string>();
  for (const n of s.notatki) {
    const tu = `${gdzie}, notatka ${n.id}`;
    if (ids.has(n.id)) bledy.push(`${tu}: id się powtarza`);
    ids.add(n.id);
    if (!Number.isInteger(n.punkt) || n.punkt < 1 || n.punkt > s.punkty.length) bledy.push(`${tu}: punkt ${n.punkt} nie istnieje`);
    if (!naPowierzchni(n.x, n.y)) bledy.push(`${tu}: miejsce poza powierzchnią`);
    if (!n.data || !n.godzina || !n.opis || !n.klucz.wyjasnienie) bledy.push(`${tu}: data, godzina, opis i wyjaśnienie`);
    if (!jestKategoria(n.klucz.kategoria)) bledy.push(`${tu}: nieznana kategoria ${n.klucz.kategoria}`);
    if ((n.klucz.kategoria === NIE_LICZE) !== (n.klucz.rewir === null)) bledy.push(`${tu}: X nie ma rewiru, a każda inna kategoria ma`);
    if (n.klucz.rewir !== null) {
      const g = gatunekRewiru.get(n.klucz.rewir);
      if (g && g !== n.gatunek) bledy.push(`${tu}: rewir ${n.klucz.rewir} ma już gatunek ${g}`);
      gatunekRewiru.set(n.klucz.rewir, n.gatunek);
    }
  }
  return bledy;
}
