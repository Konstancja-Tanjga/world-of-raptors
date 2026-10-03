import { cookies } from 'next/headers';
import { CIASTKO_PORY, jakoPora } from '@/lib/niebo';

const ROK = 60 * 60 * 24 * 365;

/**
 * POST `{ "pora": "zmierzch" }` keeps the chosen sky for a year; `null` (or
 * anything that is not a time of day) forgets it, so the sky follows the
 * clock again. Set here rather than from script, because Safari caps cookies
 * written by `document.cookie` at seven days.
 */
export async function POST(request: Request) {
  const dane: unknown = await request.json().catch(() => null);
  const pora = jakoPora(typeof dane === 'object' && dane !== null ? (dane as { pora?: unknown }).pora : null);
  const ciastka = await cookies();
  if (pora) ciastka.set(CIASTKO_PORY, pora, { path: '/', maxAge: ROK, sameSite: 'lax' });
  else ciastka.delete(CIASTKO_PORY);
  return new Response(null, { status: 204 });
}
