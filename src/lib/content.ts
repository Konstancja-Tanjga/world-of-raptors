import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import gatunkiJson from '../../content/gatunki.json';
import modulyJson from '../../content/moduly.json';
import type { Gatunek, Modul, Sciezka } from './types';

const CONTENT_DIR = path.join(process.cwd(), 'content');

export const gatunki = gatunkiJson.gatunki as Gatunek[];
export const sciezki = modulyJson.sciezki as Sciezka[];
export const moduly = modulyJson.moduly as Modul[];

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
  }
  return gotoweModuly.filter((m) => slugi.has(m.slug));
}

export async function czytajMarkdown(relPath: string) {
  return readFile(path.join(CONTENT_DIR, relPath), 'utf8');
}
