import nazwyJson from '../../../content/nazwy-gatunkow.json';
import { gatunki, ptakiMokradel } from '@/lib/content';

/**
 * Every species' name in the languages a browser may translate the course
 * into, as one static JSON file: English and Spanish from the atlas, the rest
 * from Wikidata (scripts/nazwy.py). Fetched only when a page is translated
 * (src/lib/jezykStrony.ts), so it costs nothing otherwise.
 */
export const dynamic = 'force-static';

export function GET() {
  const nazwy = nazwyJson as Record<string, Record<string, string>>;
  const wszystkie = Object.fromEntries(
    [...gatunki, ...ptakiMokradel].map((g) => [g.id, { ...nazwy[g.id], en: g.en, es: g.es }]),
  );
  return Response.json(wszystkie);
}
