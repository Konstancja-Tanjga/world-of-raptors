import { gatunki, kodyEbird, ptakiEuropy, ptakiNaLiscie } from '@/lib/content';
import {
  adresyZrodel,
  obserwacjeZEbird,
  podpowiedzi,
  pogodaZOpenMeteo,
  warunki,
  jestZaokraglony,
  type PtakKursu,
  type Warunki,
} from '@/lib/podpowiedzi';

/**
 * GET /podpowiedzi?szer=…&dl=…: the birds likely to be seen near a point
 * (rules: src/lib/podpowiedzi.ts). eBird's key (EBIRD_API_KEY) is read here
 * only, on the server. The point is rounded to about a kilometre before it is
 * used, and the answer is cached by the CDN for half an hour per rounded
 * point: eBird's reports change by the hour, not the minute.
 *
 * Answers: 200 { punkt, dzis, warunki | null, ptaki, braki }; 400 for a point
 * that is not one, or finer than two decimals (each would be a cache entry of
 * its own, a way to spend the eBird key); 403 for a request from another
 * site; 503 { blad: 'konfiguracja' } without a key; 502 { blad: 'ebird' } when
 * eBird cannot be read. The weather and the notable reports are optional:
 * without them `braki` names what is missing, and the answer is cached for two
 * minutes only, so the next visitor gets it whole.
 */

/** eBird code → the course's bird, built once. */
const PTAKI: ReadonlyMap<string, PtakKursu> = (() => {
  const szybujace = new Set(gatunki.filter((g) => g.aktywnosc === 'dzienny').map((g) => g.id));
  const poId = new Map([...ptakiNaLiscie, ...ptakiEuropy].map((p) => [p.id, p]));
  const mapa = new Map<string, PtakKursu>();
  for (const [id, kod] of Object.entries(kodyEbird)) {
    const p = poId.get(id);
    if (p) mapa.set(kod, { id, pl: p.pl, wKursie: p.kategoria !== 'pozostale', szybujacy: szybujace.has(id) });
  }
  return mapa;
})();

const CACHE = {
  pelna: 'public, s-maxage=1800, stale-while-revalidate=3600',
  niepelna: 'public, s-maxage=120',
  brak: 'no-store',
} as const;

const json = (dane: unknown, status = 200, cache: keyof typeof CACHE = 'brak') =>
  Response.json(dane, { status, headers: { 'Cache-Control': CACHE[cache] } });

async function pobierz(url: string, naglowki: Record<string, string> = {}) {
  const r = await fetch(url, { headers: naglowki, signal: AbortSignal.timeout(10_000), cache: 'no-store' });
  if (!r.ok) throw new Error(`${new URL(url).host} ${r.status}`);
  return r.json();
}

export async function GET(request: Request) {
  // Browsers say where a request comes from; only the course's own pages may spend its eBird key.
  if (request.headers.get('sec-fetch-site') === 'cross-site') return json({ blad: 'zrodlo' }, 403);
  const q = new URL(request.url).searchParams;
  const szer = Number(q.get('szer'));
  const dl = Number(q.get('dl'));
  if (!q.get('szer') || !q.get('dl') || !(Math.abs(szer) <= 90) || !(Math.abs(dl) <= 180) || !jestZaokraglony({ szer, dl })) {
    return json({ blad: 'punkt' }, 400);
  }
  const klucz = process.env.EBIRD_API_KEY;
  if (!klucz) {
    console.error('[podpowiedzi] EBIRD_API_KEY is not set');
    return json({ blad: 'konfiguracja' }, 503);
  }
  const punkt = { szer, dl };
  const braki: ('pogoda' | 'rzadkie')[] = [];
  const adresy = adresyZrodel(punkt);
  const ebird = { 'X-eBirdApiToken': klucz };
  const [ostatnie, rzadkie, pogoda] = await Promise.allSettled([
    pobierz(adresy.ostatnie, ebird),
    pobierz(adresy.rzadkie, ebird),
    pobierz(adresy.pogoda),
  ]);

  let obserwacje;
  try {
    if (ostatnie.status === 'rejected') throw ostatnie.reason;
    obserwacje = obserwacjeZEbird(ostatnie.value);
  } catch (err) {
    console.error('[podpowiedzi] eBird recent observations failed', err);
    return json({ blad: 'ebird' }, 502);
  }
  // Notable reports only mark birds as rare: without them the list is still right, just unmarked.
  let kodyRzadkich = new Set<string>();
  if (rzadkie.status === 'fulfilled') {
    try {
      kodyRzadkich = new Set(obserwacjeZEbird(rzadkie.value).map((o) => o.speciesCode));
    } catch (err) {
      console.warn('[podpowiedzi] eBird notable observations unreadable', err);
      braki.push('rzadkie');
    }
  } else {
    console.warn('[podpowiedzi] eBird notable observations failed', rzadkie.reason);
    braki.push('rzadkie');
  }
  let teraz: Warunki | null = null;
  let dzis: string | null = null;
  if (pogoda.status === 'fulfilled') {
    try {
      teraz = warunki(pogodaZOpenMeteo(pogoda.value), punkt);
      // Open-Meteo's `current.time` is the point's own wall clock: its date is the local "today".
      dzis = String((pogoda.value as { current: { time: string } }).current.time).slice(0, 10);
    } catch (err) {
      console.warn('[podpowiedzi] weather unreadable', err);
      braki.push('pogoda');
    }
  } else {
    console.warn('[podpowiedzi] weather failed', pogoda.reason);
    braki.push('pogoda');
  }
  // Without the weather, today by the newest report or the server's UTC date, whichever is later.
  if (!dzis) {
    const najnowszy = obserwacje.reduce((m, o) => (o.obsDt > m ? o.obsDt : m), '').slice(0, 10);
    const utc = new Date().toISOString().slice(0, 10);
    dzis = najnowszy > utc ? najnowszy : utc;
  }
  const ptaki = podpowiedzi(obserwacje, kodyRzadkich, dzis, PTAKI, teraz?.mnoznik ?? 1);
  return json({ punkt, dzis, warunki: teraz, ptaki, braki }, 200, braki.length ? 'niepelna' : 'pelna');
}
