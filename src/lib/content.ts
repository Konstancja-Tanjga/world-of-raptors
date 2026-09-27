import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import gatunkiJson from '../../content/gatunki.json';
import modulyJson from '../../content/moduly.json';
import ciekawostkiJson from '../../content/ciekawostki.json';
import zdjeciaJson from '../../content/zdjecia.json';
import { resolveContentHref } from './links';
import type {
  Ciekawostka,
  CiekawostkaDoPokazania,
  Gatunek,
  Modul,
  Sciezka,
  ZdjeciaGatunku,
} from './types';

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
 * Prepares lesson Markdown: every `###` species heading gets that species'
 * photos right below it, and every atlas species named in the text is listed
 * (in order of first mention) for the lesson's media section.
 */
export function przygotujLekcje(md: string) {
  const wNaglowkach = new Set<string>();
  const wszystkie: string[] = [];
  for (const m of md.matchAll(LATIN)) {
    const g = poLacinie.get(m[1]);
    if (g && !wszystkie.includes(g.id)) wszystkie.push(g.id);
  }
  const zTagami = md.replace(/^(###\s.*)$/gm, (line) => {
    const lat = [...line.matchAll(LATIN)][0]?.[1];
    const g = lat ? poLacinie.get(lat) : undefined;
    if (!g || wNaglowkach.has(g.id)) return line;
    wNaglowkach.add(g.id);
    return `${line}\n\n<species-photos data-id="${g.id}">\n</species-photos>\n`;
  });
  return { md: zTagami, wNaglowkach, wszystkie };
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
  // Lesson callouts link with repo-relative .md paths; turn them into app routes.
  const tekst = c.tekst.replace(/\]\(([^)]+)\)/g, (_, href: string) => `](${resolveContentHref(href, `moduly/${c.modul}`)})`);
  return {
    id: c.id,
    tekst,
    href: lekcja ? `/moduly/${c.modul}/${lekcja.slug}` : `/moduly/${c.modul}`,
    zrodlo: modul
      ? lekcja
        ? `${modul.id}, lekcja ${numer}: ${lekcja.tytul}`
        : `${modul.id}\u00a0${modul.tytul}`
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
