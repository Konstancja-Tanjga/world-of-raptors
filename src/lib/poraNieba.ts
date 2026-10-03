'use client';

import { useSyncExternalStore } from 'react';
import { CIASTKO_PORY, jakoPora, type PoraDnia } from './niebo';

const ROK = 60 * 60 * 24 * 365;
const sluchacze = new Set<() => void>();
// The choice made during this visit. It wins over the cookie, so the sky
// holds even where cookies are blocked (until a reload) and when Back brings
// the home page from the router's cache with the choice it was rendered with.
let wybranaTeraz: PoraDnia | null | undefined;

function zCiastka() {
  const m = document.cookie.match(new RegExp(`(?:^|; )${CIASTKO_PORY}=([^;]*)`));
  return jakoPora(m?.[1]);
}

/** The chosen sky (null: it follows the clock). An address with `?pora=` is a choice too. */
function odczytaj(): PoraDnia | null {
  if (wybranaTeraz !== undefined) return wybranaTeraz;
  return jakoPora(new URLSearchParams(window.location.search).get('pora')) ?? zCiastka();
}

/**
 * Keeps a choice of sky for a year, or forgets it (null) so the sky follows
 * the clock again. A `?pora=` in the address is dropped, since the choice is
 * now remembered. Returns false when the browser refused the cookie: the
 * choice then holds only until the page is reloaded.
 */
export function zapiszPore(pora: PoraDnia | null): boolean {
  wybranaTeraz = pora;
  document.cookie = `${CIASTKO_PORY}=${pora ?? ''}; path=/; max-age=${pora ? ROK : 0}; samesite=lax`;
  const adres = new URL(window.location.href);
  if (adres.searchParams.has('pora')) {
    adres.searchParams.delete('pora');
    // Next.js picks up native history calls; it wants `null` as the state.
    window.history.replaceState(null, '', adres.pathname + adres.search + adres.hash);
  }
  sluchacze.forEach((l) => l());
  return zCiastka() === pora;
}

/** The chosen sky; `zSerwera` is what the server rendered with, used until the page is hydrated. */
export function usePoraNieba(zSerwera: PoraDnia | null) {
  return useSyncExternalStore(
    (l) => {
      sluchacze.add(l);
      return () => sluchacze.delete(l);
    },
    odczytaj,
    () => zSerwera,
  );
}
