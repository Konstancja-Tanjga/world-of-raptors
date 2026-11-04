import { strukturaNieba } from '@/lib/content';

/**
 * What "Moje niebo" counts (which lessons teach which species, what each
 * module asks for), as one static JSON file for the achievements watcher
 * (components/niebo/StraznikOdznak.tsx), which runs on every page: fetched
 * after the page, so it is not in every page's HTML.
 */
export const dynamic = 'force-static';

export function GET() {
  return Response.json(strukturaNieba());
}
