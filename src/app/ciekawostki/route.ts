import { ciekawostkiDoPokazania } from '@/lib/content';

/**
 * Every curiosity as one static JSON file, fetched by the curiosity card
 * after mount (components/Ciekawostka.tsx), so the pages that show the card
 * do not each carry the whole set in their HTML.
 */
export const dynamic = 'force-static';

export function GET() {
  return Response.json(ciekawostkiDoPokazania());
}
