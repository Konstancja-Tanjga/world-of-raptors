import 'server-only';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import gatunkiJson from '../../content/gatunki.json';
import modulyJson from '../../content/moduly.json';
import ciekawostkiJson from '../../content/ciekawostki.json';
import zdjeciaJson from '../../content/zdjecia.json';
import { GATUNKI_RYSUNKOW } from './rysunki';
import { POZY, STYL_LOTU, SYLWETKI } from './sylwetki';
import { GRUPY_SYLWETEK, idFiszki, KIERUNKI_NAZW, KLUCZE_DZIENNE, KLUCZE_NOCNE, REGIONY, STATUS_LABEL } from './types';
import type {
  Ciekawostka,
  CiekawostkaDoPokazania,
  Fiszka,
  GatunekDzienny,
  GatunekFiszki,
  GrupaSylwetki,
  SylwetkaGatunku,
  Gatunek,
  Modul,
  PytanieQuizu,
  Quiz,
  Region,
  Sciezka,
  ZdjeciaGatunku,
} from './types';
import { idNaglowkow } from './naglowki';

const CONTENT_DIR = path.join(process.cwd(), 'content');

export const gatunki = gatunkiJson.gatunki as Gatunek[];
export const sciezki = modulyJson.sciezki as Sciezka[];
export const moduly = modulyJson.moduly as Modul[];
// JSON arrays are not tuples to TypeScript; sprawdzSpojnosc() checks that `fokus` and `oryginal` are pairs.
export const zdjecia = zdjeciaJson as unknown as Partial<Record<string, ZdjeciaGatunku>>;

// JSON can't be checked against the key sets at compile time, so check once
// at build: a typo in a cue key would otherwise just hide that row.
const KLUCZE_CECH = { dzienny: KLUCZE_DZIENNE, nocny: KLUCZE_NOCNE } as const;
for (const g of gatunki) {
  // The type promises one of the two; the JSON may not keep that promise.
  const { aktywnosc }: { aktywnosc: unknown } = g;
  if (aktywnosc !== 'dzienny' && aktywnosc !== 'nocny') {
    throw new Error(`gatunki.json: ${g.id}: aktywnosc „${String(aktywnosc)}” ma być „dzienny” albo „nocny”`);
  }
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
/** The owls' module: every owl's page links to it, and so does the home page's night chorus. */
export const MODUL_SOW = 'sowy';
/** The regional module a diurnal species' page links to for each of its regions. */
const MODUL_REGIONU: Record<Region, string> = { gibraltar: 'gibraltar', 'poludnie-hiszpanii': 'poludnie-hiszpanii', polska: 'polska' };
/** B1 lesson 1: the home page shows its "Osiem grup" table and links to it. */
export const LEKCJA_GRUP = { modul: 'metoda', lekcja: '01-sylwetka' } as const;

export function modulyGatunku(g: Gatunek) {
  const slugi = new Set<string>(g.aktywnosc === 'nocny' ? [MODUL_SOW] : g.regiony.map((r) => MODUL_REGIONU[r]));
  return gotoweModuly.filter((m) => slugi.has(m.slug));
}

/**
 * The flashcard deck: for every atlas species its reference photos (in flight
 * and perched), its silhouette (every diurnal species; the build checks each
 * has a shape) and its names both ways between Polish and English or Spanish.
 * Photo card ids are the ones stored before the other kinds existed, so
 * schedules carry over.
 */
export function taliaFiszek(): Fiszka[] {
  return gatunki.flatMap((g): Fiszka[] => {
    const z = zdjecia[g.id];
    const zdjeciaKart = (['lot', 'siedzacy'] as const).flatMap((rodzaj): Fiszka[] => {
      const zdjecie = z?.[rodzaj];
      return zdjecie ? [{ id: idFiszki(g.id, rodzaj), rodzaj, gatunek: g.id, zdjecie }] : [];
    });
    // A name card shows the bird with its answer, as it is usually seen: a raptor flying, an owl perched.
    const ilustracja = (g.aktywnosc === 'nocny' ? (z?.siedzacy ?? z?.lot) : (z?.lot ?? z?.siedzacy)) ?? null;
    const sylwetka: Fiszka[] =
      g.aktywnosc === 'dzienny' ? [{ id: idFiszki(g.id, 'sylwetka'), rodzaj: 'sylwetka', gatunek: g.id, zdjecie: null }] : [];
    const nazwy = KIERUNKI_NAZW.map((rodzaj): Fiszka => ({ id: idFiszki(g.id, rodzaj), rodzaj, gatunek: g.id, zdjecie: ilustracja }));
    return [...zdjeciaKart, ...sylwetka, ...nazwy];
  });
}

/** Activity and cues rebuilt as one union member, so spreading it keeps `aktywnosc` and `sylwetka` matched. */
const sylwetkaGatunku = (g: SylwetkaGatunku): SylwetkaGatunku =>
  g.aktywnosc === 'dzienny' ? { aktywnosc: 'dzienny', sylwetka: g.sylwetka } : { aktywnosc: 'nocny', sylwetka: g.sylwetka };

/** The species data a flashcard's answer needs, keyed by species id. */
export function gatunkiFiszek(): Record<string, GatunekFiszki> {
  return Object.fromEntries(
    gatunki.map((g) => {
      const { id, pl, lat, en, es, grupa, cechy, regiony } = g;
      const podobne = g.mylona_z.flatMap((m) => {
        const x = znajdzGatunek(m);
        return x ? [{ id: x.id, pl: x.pl }] : [];
      });
      return [id, { id, pl, lat, en, es, grupa, cechy, regiony, ...sylwetkaGatunku(g), podobne }];
    }),
  );
}

/** A diurnal species for the look-alike slider: its cues in the order of B1. */
export function stronaMorfu(g: GatunekDzienny) {
  return {
    id: g.id,
    pl: g.pl,
    cechy: [
      { etykieta: 'Skrzydła', tekst: g.sylwetka.skrzydla },
      { etykieta: 'Ogon', tekst: g.sylwetka.ogon },
      { etykieta: 'Głowa', tekst: g.sylwetka.glowa },
    ],
  };
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

/** A species that draws each of the eight silhouette groups (typed by GRUPY_SYLWETEK, so none can be missing). */
const RYSUNEK_GRUPY: Record<Capitalize<(typeof GRUPY_SYLWETEK)[number]>, string> = {
  Sępy: 'sep-plowy',
  Orły: 'orzel-przedni',
  Myszołowy: 'myszolow',
  Kanie: 'kania-ruda',
  Błotniaki: 'blotniak-stawowy',
  Krogulce: 'krogulec',
  Sokoły: 'sokol-wedrowny',
  Rybołów: 'rybolow',
};

const czytajSync = (relPath: string) => readFileSync(path.join(CONTENT_DIR, relPath), 'utf8');

/**
 * The eight silhouette groups, read once from the table in B1 lesson 1
 * ("Osiem grup"), so the home page and the lesson cannot disagree. Parsed at
 * import, so a table that stops having eight distinct known groups in five
 * columns (or a lesson without a lead) fails the build, not the home page.
 */
const GRUPY_SYLWETEK_LEKCJI = (() => {
  const plik = `moduly/${LEKCJA_GRUP.modul}/${LEKCJA_GRUP.lekcja}.md`;
  const md = czytajSync(plik);
  const sekcja = md.split(/^## /m).find((s) => s.startsWith('Osiem grup')) ?? '';
  const wiersze = sekcja
    .split('\n')
    .filter((l) => l.startsWith('|'))
    .slice(2)
    .map((l) => l.split('|').slice(1, -1).map((k) => k.trim()));
  const rysunki: Partial<Record<string, string>> = RYSUNEK_GRUPY;
  const grupy: GrupaSylwetki[] = wiersze.map((k) => {
    const nazwa = k[0]?.replace(/\*/g, '');
    const gatunek = rysunki[nazwa];
    if (k.length !== 5 || !gatunek || k.some((komorka) => !komorka)) {
      throw new Error(`${plik}: tabela „Osiem grup” ma nieznany albo niepełny wiersz: ${k.join(' | ')}`);
    }
    return { nazwa, skrzydla: k[1], ogon: k[2], glowa: k[3], przyklady: k[4], gatunek };
  });
  const ile = GRUPY_SYLWETEK.length;
  if (new Set(grupy.map((g) => g.nazwa)).size !== ile || grupy.length !== ile) {
    throw new Error(`${plik}: tabela „Osiem grup” powinna mieć ${ile} różnych grup, ma ${grupy.length} wierszy`);
  }
  const { lead } = przygotujStroneLekcji(md, plik);
  if (!lead) throw new Error(`${plik}: lekcja nie ma akapitu wstępu, z którego korzysta strona startowa`);
  return { grupy, lead };
})();

/** The eight silhouette groups and the lead of the lesson they come from. */
export function grupySylwetek() {
  return GRUPY_SYLWETEK_LEKCJI;
}

/**
 * A module README's hook: the first block after the title that is a quote
 * (`> …`), written as the module's teaser. Returned as inline Markdown with
 * its index among the blocks, so the overview page can drop exactly that one.
 */
function hakModulu(md: string, plik: string) {
  const bloki = md.replace(/^#\s.*\n+/, '').split(/\n\s*\n/);
  const indeks = bloki.findIndex((b) => b.startsWith('> '));
  if (indeks < 0) throw new Error(`${plik}: brak zajawki („> …” pod tytułem), z której korzystają start i plan kursu`);
  const linie = bloki[indeks].split('\n');
  if (!linie.every((l) => l.startsWith('> '))) throw new Error(`${plik}: zajawka musi być jednym cytatem bez przerw`);
  return { bloki, indeks, zajawka: linie.map((l) => l.slice(2).trim()).join(' ') };
}

/** Every ready module's hook, read once, when this module is first imported. */
const ZAJAWKI = new Map(
  gotoweModuly.map((m) => {
    const plik = `moduly/${m.slug}/README.md`;
    return [m.slug, hakModulu(czytajSync(plik), plik).zajawka];
  }),
);

/** A module's teaser, as inline Markdown (every ready module has one; the build checks). */
export function zajawkaModulu(slug: string) {
  return ZAJAWKI.get(slug) ?? null;
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
  const zdjecWAtlasie = Object.values(zdjecia).reduce((n, z) => n + (z?.lot ? 1 : 0) + (z?.siedzacy ? 1 : 0), 0);
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

/** HTML entities in a tag attribute (`&amp;`, `&#x27;`, `&quot;`…) as the characters they stand for. */
function odkoduj(tekst: string) {
  const nazwane: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: '\u00a0' };
  return tekst.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (calosc, kod: string) => {
    if (kod[0] === '#') return String.fromCodePoint(kod[1].toLowerCase() === 'x' ? parseInt(kod.slice(2), 16) : Number(kod.slice(1)));
    return nazwane[kod.toLowerCase()] ?? calosc;
  });
}

/**
 * Everyone whose photos the course shows, from the atlas and from lesson
 * tags: once each, in Polish alphabetical order, without the Flickr-style
 * "from <place>" tails. (Each photo keeps its full credit where it appears.)
 */
export async function autorzyZdjec() {
  const surowe: string[] = [];
  // The author's own photos (served from public/, no Commons page) are credited separately.
  for (const z of Object.values(zdjecia)) for (const p of [z?.lot, z?.siedzacy]) if (p?.strona) surowe.push(p.autor);
  for (const m of gotoweModuly) {
    for (const l of m.lekcje) {
      const md = await czytajMarkdown(`moduly/${m.slug}/${l.slug}.md`);
      for (const [, autor] of md.matchAll(/<zdjecie\b[^>]*\bautor="([^"]*)"/g)) surowe.push(odkoduj(autor));
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
 * Each module's opening scene: a bird that stands for the module, in a photo
 * large enough to fill most of the screen sharply. A1 opens with the falcon
 * (closer to parrots than to hawks), A4 with a pair of white-tailed eagles,
 * A7 with a barn owl landing on a falconer's glove, B4 with an Iberian
 * imperial eagle over the dehesa, B5 with an eagle owl.
 */
const OTWARCIA_MODULOW: Record<string, { gatunek: string; zdjecie: 'lot' | 'siedzacy' }> = {
  'kim-sa-drapiezniki': { gatunek: 'sokol-wedrowny', zdjecie: 'siedzacy' },
  anatomia: { gatunek: 'orzel-przedni', zdjecie: 'siedzacy' },
  'polowanie-i-ekologia': { gatunek: 'pustulka', zdjecie: 'lot' },
  rozrod: { gatunek: 'bielik', zdjecie: 'siedzacy' },
  wedrowki: { gatunek: 'sep-plowy', zdjecie: 'lot' },
  ochrona: { gatunek: 'orlosep', zdjecie: 'lot' },
  'ludzie-i-drapiezniki': { gatunek: 'plomykowka', zdjecie: 'lot' },
  metoda: { gatunek: 'myszolow', zdjecie: 'lot' },
  polska: { gatunek: 'bielik', zdjecie: 'lot' },
  gibraltar: { gatunek: 'kania-czarna', zdjecie: 'lot' },
  'poludnie-hiszpanii': { gatunek: 'orzel-iberyjski', zdjecie: 'lot' },
  sowy: { gatunek: 'puchacz', zdjecie: 'lot' },
};

/** The photo and species that open a module (every ready module has one; the build checks). */
export function otwarcieModulu(slug: string) {
  const o = OTWARCIA_MODULOW[slug];
  const g = o && znajdzGatunek(o.gatunek);
  const zdjecie = o && zdjecia[o.gatunek]?.[o.zdjecie];
  return g && zdjecie ? { gatunek: g, zdjecie, wLocie: o.zdjecie === 'lot' } : null;
}

/**
 * A module's README for its overview page: the title, the path line and the
 * hook are shown by the opening scene, so they are taken out of the text; the
 * rest (scope, goals, plan, any other quotes) is returned as Markdown.
 */
export function przygotujOpisModulu(md: string, plik: string) {
  const { bloki, indeks, zajawka } = hakModulu(md, plik);
  const reszta = bloki.filter((b, i) => i !== indeks && !/^Ścieżka [AB]:/.test(b.trim()));
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

/**
 * The cross-references between the content, the catalogues and the code,
 * checked once at import, so a typo fails the build instead of quietly
 * removing a drawing, a card, a crop, a link or a module's opening: species
 * fields and look-alikes, silhouettes and flight styles, photo focus and
 * sizes, module openings, the modules and lesson the code links to by name,
 * the curiosities' lessons and species, and the species drawn by name
 * (rysunki.ts). All problems are reported together. (The cue keys, the
 * eight-groups table and the module hooks are checked where they are read,
 * above, and stop at the first problem. Lesson binomials are not checked: an
 * unknown one just gets no plate.)
 */
function sprawdzSpojnosc() {
  const bledy: string[] = [];
  const ID = /^[a-z]+(-[a-z]+)*$/;
  const idGatunkow = new Set(gatunki.map((g) => g.id));
  const regiony = new Set<string>(REGIONY.map((r) => r.value));
  const para = (v: unknown, ok: (n: number) => boolean) =>
    Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number' && ok(n));
  for (const g of gatunki) {
    if (!ID.test(g.id)) bledy.push(`gatunki.json: id „${g.id}” musi być małymi literami z łącznikami`);
    for (const pole of ['pl', 'lat', 'en', 'es', 'grupa'] as const) {
      if (!g[pole]?.trim()) bledy.push(`gatunki.json: ${g.id}: puste pole ${pole}`);
    }
    if (/\s/.test(g.grupa)) bledy.push(`gatunki.json: ${g.id}: grupa „${g.grupa}” ma być jednym słowem (z niej powstaje id nagłówka)`);
    if (!g.regiony?.length || !g.regiony.every((r) => regiony.has(r))) {
      bledy.push(`gatunki.json: ${g.id}: regiony ${JSON.stringify(g.regiony)} mają być niepustą listą z ${[...regiony].join(', ')}`);
    }
    if (!g.status?.every((s) => s in STATUS_LABEL)) bledy.push(`gatunki.json: ${g.id}: nieznany status w ${JSON.stringify(g.status)}`);
    if (!para(g.rozpietosc_cm, (n) => n > 0) || g.rozpietosc_cm[0] > g.rozpietosc_cm[1]) {
      bledy.push(`gatunki.json: ${g.id}: rozpietosc_cm ma być [od, do] w centymetrach`);
    }
    for (const m of g.mylona_z) {
      if (!idGatunkow.has(m) || m === g.id) bledy.push(`gatunki.json: ${g.id}: mylona_z wskazuje „${m}”, którego nie ma w atlasie`);
    }
    if (!SYLWETKI[g.id]) bledy.push(`sylwetki.ts: brak sylwetki gatunku ${g.id}`);
    if ((g.aktywnosc === 'dzienny') !== Boolean(STYL_LOTU[g.id])) {
      bledy.push(`sylwetki.ts: STYL_LOTU ma mieć wpis dla ${g.id} wtedy i tylko wtedy, gdy to ptak dzienny`);
    }
    if (g.aktywnosc === 'dzienny' && !(GRUPY_SYLWETEK as readonly string[]).includes(g.sylwetka.grupa.split(' ')[0])) {
      bledy.push(`gatunki.json: ${g.id}: sylwetka.grupa „${g.sylwetka.grupa}” nie zaczyna się od żadnej z ośmiu grup`);
    }
  }
  const katalogi: [string, object][] = [
    ['SYLWETKI', SYLWETKI],
    ['STYL_LOTU', STYL_LOTU],
    ['POZY', POZY],
    ['zdjecia.json', zdjecia],
  ];
  for (const [skad, mapa] of katalogi) {
    for (const id of Object.keys(mapa)) if (!idGatunkow.has(id)) bledy.push(`${skad}: „${id}” nie jest gatunkiem z atlasu`);
  }
  for (const [id, z] of Object.entries(zdjecia)) {
    for (const rodzaj of ['lot', 'siedzacy'] as const) {
      const p = z?.[rodzaj];
      if (!p) continue;
      if (!para(p.fokus, (n) => n >= 0 && n <= 100)) bledy.push(`zdjecia.json: ${id}/${rodzaj}: fokus musi być [x, y] w procentach`);
      if (p.oryginal !== undefined && !para(p.oryginal, (n) => n > 0)) {
        bledy.push(`zdjecia.json: ${id}/${rodzaj}: oryginal musi być [szerokość, wysokość]`);
      }
    }
  }
  for (const m of moduly) {
    if (m.gotowy && (!m.slug || !m.lekcje?.length)) bledy.push(`moduly.json: ${m.id} jest gotowy, ale nie ma slugu albo lekcji`);
  }
  for (const m of gotoweModuly) {
    if (!otwarcieModulu(m.slug)) bledy.push(`content.ts: moduł ${m.slug} nie ma otwarcia (OTWARCIA_MODULOW) albo jego zdjęcia`);
  }
  for (const [grupa, id] of Object.entries(RYSUNEK_GRUPY)) {
    if (!SYLWETKI[id]) bledy.push(`content.ts: grupę „${grupa}” rysuje ${id}, który nie ma sylwetki`);
  }
  for (const id of GATUNKI_RYSUNKOW) {
    if (!idGatunkow.has(id) || !SYLWETKI[id]) bledy.push(`rysunki.ts: ${id} nie jest gatunkiem z atlasu z sylwetką`);
  }
  const gotowe = new Map(gotoweModuly.map((m) => [m.slug, m]));
  for (const slug of [MODUL_SOW, ...Object.values(MODUL_REGIONU), LEKCJA_GRUP.modul]) {
    if (!gotowe.has(slug)) bledy.push(`content.ts: kod linkuje do modułu „${slug}”, którego nie ma wśród gotowych`);
  }
  if (!gotowe.get(LEKCJA_GRUP.modul)?.lekcje.some((l) => l.slug === LEKCJA_GRUP.lekcja)) {
    bledy.push(`content.ts: lekcji ${LEKCJA_GRUP.modul}/${LEKCJA_GRUP.lekcja} nie ma w moduly.json`);
  }
  for (const c of ciekawostki) {
    const m = gotowe.get(c.modul);
    if (!m) bledy.push(`ciekawostki.json: ${c.id}: moduł „${c.modul}” nie jest gotowym modułem`);
    else if (c.lekcja !== null && !m.lekcje.some((l) => l.slug === c.lekcja)) {
      bledy.push(`ciekawostki.json: ${c.id}: lekcji „${c.lekcja}” nie ma w module ${c.modul}`);
    }
    for (const id of c.gatunki) if (!idGatunkow.has(id)) bledy.push(`ciekawostki.json: ${c.id}: gatunku „${id}” nie ma w atlasie`);
  }
  if (bledy.length) throw new Error(`Niespójna treść kursu:\n- ${bledy.join('\n- ')}`);
}

sprawdzSpojnosc();
