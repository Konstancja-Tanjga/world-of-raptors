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
const bezPogrubien = (s: string) => s.replace(/\*\*/g, '').trim();

/**
 * Takes the quiz out of a lesson: the `## … Quiz (próg zaliczenia: N%)`
 * section's numbered questions, each followed by an indented line of options
 * `a) … b) … c) …` with the correct one in bold. The questions are replaced
 * with a `<quiz-krokowy>` tag, so the answers never reach the page as text.
 * A question without exactly one bold option fails the build.
 */
export function wyodrebnijQuiz(md: string, plik: string): { md: string; quiz: Quiz | null } {
  const linie = md.split('\n');
  const start = linie.findIndex((l) => QUIZ_NAGLOWEK.test(l));
  if (start < 0) return { md, quiz: null };
  const prog = Number(QUIZ_NAGLOWEK.exec(linie[start])![1]);

  const pytania: { pytanie: string; opcje: string[] }[] = [];
  let pierwsza = -1;
  let ostatnia = -1;
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
    }
  }
  if (pytania.length === 0) return { md, quiz: null };

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
export function progQuizu(md: string) {
  const m = md.split('\n').map((l) => QUIZ_NAGLOWEK.exec(l)).find(Boolean);
  return m ? Number(m[1]) : null;
}

/** Reading time: words without tags and their attributes, at about 200 a minute. */
function minutyCzytania(md: string) {
  const slowa = md.replace(/<[^>]*>/g, ' ').split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
  return Math.max(1, Math.round(slowa / 200));
}

/**
 * Everything a lesson page shows, from its Markdown:
 * - the `#` title is dropped (the page shows the lesson title from moduly.json),
 * - a single paragraph right under it becomes the lead,
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
  const naglowki = lekcja.md
    .split('\n')
    .filter((l) => /^##\s/.test(l))
    .map((l) => l.replace(/^##\s+/, '').replace(/\s+#*\s*$/, ''));
  const ids = idNaglowkow(naglowki);
  return {
    ...lekcja,
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
