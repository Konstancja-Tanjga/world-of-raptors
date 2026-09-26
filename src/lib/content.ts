import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import gatunkiJson from '../../content/gatunki.json';
import modulyJson from '../../content/moduly.json';
import zdjeciaJson from '../../content/zdjecia.json';
import type { Gatunek, Modul, Sciezka, ZdjeciaGatunku } from './types';

const CONTENT_DIR = path.join(process.cwd(), 'content');

export const gatunki = gatunkiJson.gatunki as unknown as Gatunek[];
export const sciezki = modulyJson.sciezki as Sciezka[];
export const moduly = modulyJson.moduly as Modul[];
export const zdjecia = zdjeciaJson as Record<string, ZdjeciaGatunku>;

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
