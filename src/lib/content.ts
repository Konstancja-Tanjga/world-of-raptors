import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import gatunkiJson from '../../content/gatunki.json';
import modulyJson from '../../content/moduly.json';
import ciekawostkiJson from '../../content/ciekawostki.json';
import zdjeciaJson from '../../content/zdjecia.json';
import type {
  Ciekawostka,
  CiekawostkaDoPokazania,
  Fiszka,
  GatunekFiszki,
  Gatunek,
  Modul,
  PytanieQuizu,
  Quiz,
  Sciezka,
  ZdjeciaGatunku,
} from './types';
import { idNaglowkow } from './naglowki';

const CONTENT_DIR = path.join(process.cwd(), 'content');

export const gatunki = gatunkiJson.gatunki as Gatunek[];
export const sciezki = modulyJson.sciezki as Sciezka[];
export const moduly = modulyJson.moduly as Modul[];
export const zdjecia = zdjeciaJson as Partial<Record<string, ZdjeciaGatunku>>;

// JSON can't be checked against the key sets at compile time, so check once
// at build: a typo in a cue key would otherwise just hide that row.
const KLUCZE_CECH = {
  dzienny: ['grupa', 'skrzydla', 'palce', 'ogon', 'glowa', 'lot'],
  nocny: ['glos', 'uszy', 'oczy', 'glowa', 'sylwetka'],
} as const;
for (const g of gatunki) {
  const dozwolone: readonly string[] = KLUCZE_CECH[g.aktywnosc];
  const klucze = Object.keys(g.sylwetka ?? {});
  const zle = klucze.filter((k) => !dozwolone.includes(k));
  const brak = dozwolone.filter((k) => !klucze.includes(k));
  if (zle.length || brak.length) {
    throw new Error(`gatunki.json: ${g.id} sylwetka — nieznane: ${zle.join(', ') || '—'}; brak: ${brak.join(', ') || '—'}`);
  }
}

const poLacinie = new Map(gatunki.map((g) => [g.lat, g]));
const LATIN = /(?<!\*)\*([A-Z][a-z]+ [a-z]+)\*(?!\*)/g;

/**
 * Prepares lesson Markdown: each `###` species heading gets that species'
 * plate at the end of its section (before the next heading or rule), so the
 * lesson reads heading → description → plate. Every atlas species named in
 * the text is also listed, in order of first mention, for the media section.
 */
export function przygotujLekcje(md: string) {
  const wNaglowkach = new Set<string>();
  const wszystkie: string[] = [];
  for (const m of md.matchAll(LATIN)) {
    const g = poLacinie.get(m[1]);
    if (g && !wszystkie.includes(g.id)) wszystkie.push(g.id);
  }
  const tag = (id: string) => ['', `<species-photos data-id="${id}">`, '</species-photos>', ''];
  const wynik: string[] = [];
  let oczekujacy: string | null = null;
  for (const line of md.split('\n')) {
    const koniecSekcji = /^#{1,3}\s/.test(line) || /^---\s*$/.test(line);
    if (koniecSekcji && oczekujacy) {
      wynik.push(...tag(oczekujacy));
      oczekujacy = null;
    }
    wynik.push(line);
    if (/^###\s/.test(line)) {
      const lat = [...line.matchAll(LATIN)][0]?.[1];
      const g = lat ? poLacinie.get(lat) : undefined;
      if (g && !wNaglowkach.has(g.id)) {
        wNaglowkach.add(g.id);
        oczekujacy = g.id;
      }
    }
  }
  if (oczekujacy) wynik.push(...tag(oczekujacy));
  return { md: wynik.join('\n'), wNaglowkach, wszystkie };
}

const QUIZ_NAGLOWEK = /^##\s.*Quiz.*próg zaliczenia:\s*(\d+)\s*%/;
const PYTANIE = /^(\d+)\.\s+(.+)$/;
const ODPOWIEDZ = /(?:^|\s)[a-h]\)\s+/;
const POGRUBIONA = /^\*\*[^*]+\*\*$/;
// Quiz text goes into plain-text props (a fieldset legend, radio labels), so
// emphasis markers are dropped rather than shown as asterisks.
const bezPogrubien = (s: string) => s.replace(/\*+/g, '').trim();

/**
 * Takes the quiz out of a lesson: the `## … Quiz (próg zaliczenia: N%)`
 * section's numbered questions (`1. …`), each followed by indented option
 * lines `a) … b) … c) …` with the correct one in bold. The questions are
 * replaced with a `<quiz-krokowy>` tag, so the answers are not rendered in the
 * lesson text (they do reach the client as the quiz component's props).
 * The build fails on a quiz heading without questions, a pass mark outside
 * 1–100, any other line between the questions, or a question without at least
 * two options and exactly one bold one.
 */
export function wyodrebnijQuiz(md: string, plik: string): { md: string; quiz: Quiz | null } {
  const linie = md.split('\n');
  const start = linie.findIndex((l) => QUIZ_NAGLOWEK.test(l));
  if (start < 0) return { md, quiz: null };
  const prog = Number(QUIZ_NAGLOWEK.exec(linie[start])![1]);
  if (prog < 1 || prog > 100) throw new Error(`${plik}: próg zaliczenia quizu musi być od 1 do 100%`);

  const pytania: { pytanie: string; opcje: string[] }[] = [];
  let pierwsza = -1;
  let ostatnia = -1;
  const obce: number[] = [];
  for (let i = start + 1; i < linie.length && !/^#{1,2}\s/.test(linie[i]); i++) {
    const m = PYTANIE.exec(linie[i]);
    if (m) {
      if (pierwsza < 0) pierwsza = i;
      pytania.push({ pytanie: bezPogrubien(m[2]), opcje: [] });
      ostatnia = i;
    } else if (/^\s+\S/.test(linie[i]) && pytania.length > 0) {
      const opcje = linie[i].trim().split(ODPOWIEDZ).map((o) => o.trim()).filter(Boolean);
      pytania[pytania.length - 1].opcje.push(...opcje);
      ostatnia = i;
    } else if (linie[i].trim() !== '') {
      obce.push(i);
    }
  }
  if (pytania.length === 0) {
    throw new Error(`${plik}: sekcja quizu nie ma pytań w formacie „1. …” z odpowiedziami „a) … b) …”`);
  }
  const wSrodku = obce.find((i) => i > pierwsza && i < ostatnia);
  if (wSrodku !== undefined) {
    throw new Error(`${plik}: linia ${wSrodku + 1} w quizie nie jest ani pytaniem, ani wciętą linią odpowiedzi`);
  }

  const gotowe = pytania.map(({ pytanie, opcje }, i): PytanieQuizu => {
    const poprawne = opcje.flatMap((o, j) => (POGRUBIONA.test(o) ? [j] : []));
    if (opcje.length < 2 || poprawne.length !== 1) {
      throw new Error(`${plik}: pytanie ${i + 1} quizu musi mieć odpowiedzi i dokładnie jedną pogrubioną`);
    }
    return { pytanie, odpowiedzi: opcje.map(bezPogrubien), poprawna: poprawne[0] };
  });

  const wynik = [...linie.slice(0, pierwsza), '<quiz-krokowy>', '</quiz-krokowy>', ...linie.slice(ostatnia + 1)];
  return { md: wynik.join('\n'), quiz: { prog, pytania: gotowe } };
}

/** The quiz pass mark of a lesson, in percent, or null for a lesson without a quiz. */
export function progQuizu(md: string, plik: string) {
  return wyodrebnijQuiz(md, plik).quiz?.prog ?? null;
}

/** Reading time: words without tags and their attributes, at about 200 a minute. */
function minutyCzytania(md: string) {
  const slowa = md.replace(/<[^>]*>/g, ' ').split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
  return Math.max(1, Math.round(slowa / 200));
}

/**
 * Everything a lesson page shows, from its Markdown:
 * - the `#` title is dropped (the page shows the lesson title from moduly.json),
 * - a paragraph right under it becomes the lead, if it is one line starting
 *   with text (not a list, table, tag or quote),
 * - the quiz is taken out (see `wyodrebnijQuiz`),
 * - species plates are attached (see `przygotujLekcje`),
 * - the `##` headings become the table of contents.
 */
export function przygotujStroneLekcji(zrodlo: string, plik: string) {
  const bloki = zrodlo.replace(/^#\s.*\n+/, '').split(/\n\s*\n/);
  const pierwszy = bloki[0]?.trim() ?? '';
  const lead = /^(?!\*\s)[\p{L}„(*]/u.test(pierwszy) && !pierwszy.includes('\n') ? pierwszy : null;

  const { md, quiz } = wyodrebnijQuiz((lead ? bloki.slice(1) : bloki).join('\n\n'), plik);
  const lekcja = przygotujLekcje(md);
  // Species named only in the lead or the quiz still belong in the media section.
  const { wszystkie } = przygotujLekcje(zrodlo);
  const naglowki = lekcja.md
    .split('\n')
    .filter((l) => /^##\s/.test(l))
    .map((l) => l.replace(/^##\s+/, '').replace(/\s+#*\s*$/, ''));
  const ids = idNaglowkow(naglowki);
  return {
    ...lekcja,
    wszystkie,
    lead,
    quiz,
    toc: naglowki.map((label, i) => ({ id: ids[i], label })),
    minuty: minutyCzytania(zrodlo),
  };
}

export const gotoweModuly = moduly.filter(
  (m): m is Modul & { slug: string; lekcje: NonNullable<Modul['lekcje']> } =>
    m.gotowy && m.slug !== null && Array.isArray(m.lekcje),
);

export function znajdzModul(slug: string) {
  return gotoweModuly.find((m) => m.slug === slug);
}

export function znajdzGatunek(id: string) {
  return gatunki.find((g) => g.id === id);
}

/** Modules whose content covers a species, derived from its regions and activity. */
export function modulyGatunku(g: Gatunek) {
  const slugi = new Set<string>();
  if (g.aktywnosc === 'nocny') slugi.add('sowy');
  else {
    if (g.regiony.includes('gibraltar')) slugi.add('gibraltar');
    if (g.regiony.includes('poludnie-hiszpanii')) slugi.add('poludnie-hiszpanii');
    if (g.regiony.includes('polska')) slugi.add('polska');
  }
  return gotoweModuly.filter((m) => slugi.has(m.slug));
}

const KIERUNKI_NAZW = ['pl-en', 'pl-es', 'en-pl', 'es-pl'] as const;

/**
 * The flashcard deck: for every atlas species its reference photos (in flight
 * and perched), its silhouette (diurnal species with a drawn shape) and its
 * names both ways between Polish and English or Spanish. Photo card ids are
 * the ones stored before the other kinds existed, so schedules carry over.
 */
export function taliaFiszek(maSylwetke: (id: string) => boolean): Fiszka[] {
  return gatunki.flatMap((g) => {
    const z = zdjecia[g.id];
    const zdjeciaKart = (['lot', 'siedzacy'] as const).flatMap((rodzaj) => {
      const zdjecie = z?.[rodzaj];
      return zdjecie ? [{ id: `${g.id}/${rodzaj}`, rodzaj, gatunek: g.id, zdjecie }] : [];
    });
    // The answer side of a non-photo card shows the bird as it is usually seen.
    const ilustracja = (g.aktywnosc === 'nocny' ? (z?.siedzacy ?? z?.lot) : (z?.lot ?? z?.siedzacy)) ?? null;
    const sylwetka: Fiszka[] =
      g.aktywnosc === 'dzienny' && maSylwetke(g.id)
        ? [{ id: `${g.id}/sylwetka`, rodzaj: 'sylwetka', gatunek: g.id, zdjecie: ilustracja }]
        : [];
    const nazwy: Fiszka[] = KIERUNKI_NAZW.map((rodzaj) => ({ id: `${g.id}/${rodzaj}`, rodzaj, gatunek: g.id, zdjecie: ilustracja }));
    return [...zdjeciaKart, ...sylwetka, ...nazwy];
  });
}

/** The species data a flashcard's answer needs, keyed by species id. */
export function gatunkiFiszek(): Record<string, GatunekFiszki> {
  return Object.fromEntries(
    gatunki.map((g) => {
      const { id, pl, lat, en, es, grupa, cechy, regiony, aktywnosc, sylwetka } = g;
      const podobne = g.mylona_z.flatMap((m) => {
        const x = znajdzGatunek(m);
        return x ? [{ id: x.id, pl: x.pl }] : [];
      });
      return [id, { id, pl, lat, en, es, grupa, cechy, regiony, aktywnosc, sylwetka, podobne }];
    }),
  );
}

export async function czytajMarkdown(relPath: string) {
  return readFile(path.join(CONTENT_DIR, relPath), 'utf8');
}

const ciekawostki = ciekawostkiJson.ciekawostki as Ciekawostka[];

function doPokazania(c: Ciekawostka): CiekawostkaDoPokazania {
  const modul = znajdzModul(c.modul);
  const lekcja = modul?.lekcje.find((l) => l.slug === c.lekcja);
  const numer = modul && lekcja ? modul.lekcje.indexOf(lekcja) + 1 : 0;
  return {
    id: c.id,
    tekst: c.tekst,
    href: lekcja ? `/moduly/${c.modul}/${lekcja.slug}` : `/moduly/${c.modul}`,
    zrodlo: modul
      ? lekcja
        ? `${lekcja.tytul} (${modul.id}, lekcja ${numer})`
        : `${modul.tytul} (${modul.id})`
      : 'kurs',
  };
}

/**
 * Curiosities for a place in the app, the most relevant first: those about
 * the given species, then from the given module (skipping the current
 * lesson, which already shows its own), then everything else.
 */
export function ciekawostkiDla({ modul, lekcja, gatunek }: { modul?: string; lekcja?: string; gatunek?: string } = {}) {
  const pasuje = (c: Ciekawostka) =>
    (gatunek !== undefined && c.gatunki.includes(gatunek)) || (modul !== undefined && c.modul === modul);
  // Skip the page's own text: a lesson's callouts, or a module's intro on its overview page.
  const pula = ciekawostki.filter((c) => !(modul && c.modul === modul && (c.lekcja ?? undefined) === lekcja));
  return {
    preferowane: pula.filter(pasuje).map(doPokazania),
    pozostale: pula.filter((c) => !pasuje(c)).map(doPokazania),
  };
}

/** A species that draws each of the eight silhouette groups. */
const RYSUNEK_GRUPY: Record<string, string> = {
  Sępy: 'sep-plowy',
  Orły: 'orzel-przedni',
  Myszołowy: 'myszolow',
  Kanie: 'kania-ruda',
  Błotniaki: 'blotniak-stawowy',
  Krogulce: 'krogulec',
  Sokoły: 'sokol-wedrowny',
  Rybołów: 'rybolow',
};

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
 * The eight silhouette groups, read from the table in B1 lesson 1 ("Osiem
 * grup"), so the home page and the lesson cannot disagree. The build fails if
 * the table stops having eight known groups in five columns.
 */
export async function grupySylwetek(): Promise<{ grupy: GrupaSylwetki[]; lead: string; href: string }> {
  const plik = 'moduly/metoda/01-sylwetka.md';
  const md = await czytajMarkdown(plik);
  const sekcja = md.split(/^## /m).find((s) => s.startsWith('Osiem grup')) ?? '';
  const wiersze = sekcja
    .split('\n')
    .filter((l) => l.startsWith('|'))
    .slice(2)
    .map((l) => l.split('|').slice(1, -1).map((k) => k.trim()));
  const grupy = wiersze.map((k) => {
    const nazwa = k[0]?.replace(/\*/g, '');
    if (k.length !== 5 || !RYSUNEK_GRUPY[nazwa]) {
      throw new Error(`${plik}: tabela „Osiem grup” ma nieznany wiersz: ${k.join(' | ')}`);
    }
    return { nazwa, skrzydla: k[1], ogon: k[2], glowa: k[3], przyklady: k[4], gatunek: RYSUNEK_GRUPY[nazwa] };
  });
  if (grupy.length !== 8) throw new Error(`${plik}: tabela „Osiem grup” powinna mieć 8 wierszy, ma ${grupy.length}`);
  const { lead } = przygotujStroneLekcji(md, plik);
  return { grupy, lead: lead ?? '', href: '/moduly/metoda/01-sylwetka' };
}


/**
 * A module's teaser: the quote under its README title (`> …`), written as the
 * module's hook. Inline Markdown; null if the README has none.
 */
export async function zajawkaModulu(slug: string) {
  const md = await czytajMarkdown(`moduly/${slug}/README.md`);
  const linia = md.split('\n').find((l) => l.startsWith('> '));
  return linia ? linia.slice(2).trim() : null;
}

/** The course in numbers, for the about page: everything counted from the content itself. */
export async function statystykiKursu() {
  const pliki = gotoweModuly.flatMap((m) => [`moduly/${m.slug}/README.md`, ...m.lekcje.map((l) => `moduly/${m.slug}/${l.slug}.md`)]);
  const teksty = await Promise.all(pliki.map(async (p) => [p, await czytajMarkdown(p)] as const));
  const slowa = teksty.reduce(
    (n, [, md]) => n + md.replace(/<[^>]*>/g, ' ').split(/\s+/).filter((w) => /\p{L}/u.test(w)).length,
    0,
  );
  const pytania = teksty.reduce((n, [p, md]) => n + (p.endsWith('README.md') ? 0 : (wyodrebnijQuiz(md, p).quiz?.pytania.length ?? 0)), 0);
  const zdjecWLekcjach = teksty.reduce((n, [, md]) => n + (md.match(/<zdjecie\b/g)?.length ?? 0), 0);
  const zdjecWAtlasie = Object.values(zdjecia).reduce(
    (n, z) => n + (z?.lot ? 1 : 0) + (z?.siedzacy ? 1 : 0) + (z?.cecha ? 1 : 0),
    0,
  );
  return {
    gatunki: gatunki.length,
    moduly: gotoweModuly.length,
    lekcje: gotoweModuly.reduce((n, m) => n + m.lekcje.length, 0),
    slowa,
    pytania,
    zdjecia: zdjecWLekcjach + zdjecWAtlasie,
    ciekawostki: ciekawostki.length,
  };
}

/**
 * Everyone whose photos the course shows, from the atlas and from lesson
 * tags: once each, in Polish alphabetical order, without the Flickr-style
 * "from <place>" tails. (Each photo keeps its full credit where it appears.)
 */
export async function autorzyZdjec() {
  const surowe: string[] = [];
  // The author's own photos (served from public/, no Commons page) are credited separately.
  for (const z of Object.values(zdjecia)) for (const p of [z?.lot, z?.siedzacy, z?.cecha]) if (p?.strona) surowe.push(p.autor);
  for (const m of gotoweModuly) {
    for (const l of m.lekcje) {
      const md = await czytajMarkdown(`moduly/${m.slug}/${l.slug}.md`);
      for (const [, autor] of md.matchAll(/<zdjecie\b[^>]*\bautor="([^"]*)"/g)) surowe.push(autor.replace(/&amp;/g, '&'));
    }
  }
  const nieznani = /^(autor nieznany|nieznany autor|own work)$/i;
  const wedlugKlucza = new Map<string, string>();
  for (const a of surowe) {
    const imie = a.replace(/\s+from\s+.+$/i, '').trim();
    if (!imie || nieznani.test(imie)) continue;
    const klucz = imie.toLocaleLowerCase('pl');
    if (!wedlugKlucza.has(klucz)) wedlugKlucza.set(klucz, imie);
  }
  return [...wedlugKlucza.values()].sort((a, b) => a.localeCompare(b, 'pl'));
}

/** The "Idea" section of the course plan (Markdown, without its heading), for the about page. */
export async function ideaKursu() {
  const md = await czytajMarkdown('PLAN-KURSU.md');
  const sekcja = md.split(/^## /m).find((s) => s.startsWith('Idea'));
  if (!sekcja) throw new Error('PLAN-KURSU.md: brak sekcji „## Idea”, z której korzysta strona „O projekcie”');
  return sekcja.replace(/^Idea\s*\n/, '').split(/^---\s*$/m)[0].trim();
}

/**
 * Each module's opening scene: a bird that stands for the module, in the
 * photo that suits it (A4 is about pairs: two white-tailed eagles; B5 is
 * owls: the eagle owl; A1 opens with the falcon, which is closer to parrots
 * than to hawks).
 */
const OTWARCIA_MODULOW: Record<string, { gatunek: string; zdjecie: 'lot' | 'siedzacy' }> = {
  'kim-sa-drapiezniki': { gatunek: 'sokol-wedrowny', zdjecie: 'siedzacy' },
  anatomia: { gatunek: 'kobuz', zdjecie: 'siedzacy' },
  'polowanie-i-ekologia': { gatunek: 'pustulka', zdjecie: 'lot' },
  rozrod: { gatunek: 'bielik', zdjecie: 'siedzacy' },
  wedrowki: { gatunek: 'sep-plowy', zdjecie: 'lot' },
  ochrona: { gatunek: 'orlosep', zdjecie: 'siedzacy' },
  'ludzie-i-drapiezniki': { gatunek: 'jastrzab', zdjecie: 'siedzacy' },
  metoda: { gatunek: 'myszolow', zdjecie: 'lot' },
  polska: { gatunek: 'bielik', zdjecie: 'lot' },
  gibraltar: { gatunek: 'kania-czarna', zdjecie: 'lot' },
  'poludnie-hiszpanii': { gatunek: 'orzel-iberyjski', zdjecie: 'siedzacy' },
  sowy: { gatunek: 'puchacz', zdjecie: 'siedzacy' },
};

/** The photo and species that open a module, or null when it has none. */
export function otwarcieModulu(slug: string) {
  const o = OTWARCIA_MODULOW[slug];
  const g = o && znajdzGatunek(o.gatunek);
  const zdjecie = o && zdjecia[o.gatunek]?.[o.zdjecie];
  return g && zdjecie ? { gatunek: g, zdjecie, wLocie: o.zdjecie === 'lot' } : null;
}

/**
 * A module's README for its overview page: the title, the path line and the
 * hook (`> …`) are shown by the opening scene, so they are taken out of the
 * text; the rest (scope, goals, plan) is returned as Markdown.
 */
export function przygotujOpisModulu(md: string) {
  const bloki = md.replace(/^#\s.*\n+/, '').split(/\n\s*\n/);
  const zajawka = bloki.find((b) => b.startsWith('> '))?.slice(2).trim() ?? null;
  const reszta = bloki.filter((b) => !b.startsWith('> ') && !/^Ścieżka [AB]:/.test(b.trim()));
  return { zajawka, md: reszta.join('\n\n') };
}

/** Lessons of a module with what the syllabus shows (reading time, quiz pass mark) and the atlas species each names. */
export async function sylabusModulu(slug: string) {
  const modul = znajdzModul(slug);
  if (!modul) return [];
  return Promise.all(
    modul.lekcje.map(async (l) => {
      const plik = `moduly/${slug}/${l.slug}.md`;
      const strona = przygotujStroneLekcji(await czytajMarkdown(plik), plik);
      return {
        slug: l.slug,
        tytul: l.tytul,
        minuty: strona.minuty,
        progQuizu: strona.quiz?.prog ?? null,
        lead: strona.lead,
        gatunki: strona.wszystkie,
      };
    }),
  );
}
