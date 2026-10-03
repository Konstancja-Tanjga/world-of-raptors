'use client';

import { useSyncExternalStore } from 'react';
import { CIASTKO_PORY, jakoPora, type PoraDnia } from './niebo';

const sluchacze = new Set<() => void>();
// The choice made during this visit. It wins over the cookie, so a new choice
// shows at once (the cookie arrives with the server's answer) and still holds
// where cookies are blocked, until the page is reloaded.
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
 * Keeps a choice of sky for a year (the server sets the cookie, see
 * app/pora-nieba/route.ts), or forgets it (null) so the sky follows the
 * clock again. Resolves to false when the choice could not be kept: it then
 * holds only until the page is reloaded.
 *
 * `zAdresu`: the choice came from a `?pora=` link and the address is left as
 * it is. A choice made on the page drops `?pora=` from the address once the
 * cookie holds it, so a reload does not bring the old one back.
 */
export async function zapiszPore(pora: PoraDnia | null, { zAdresu = false } = {}): Promise<boolean> {
  wybranaTeraz = pora;
  sluchacze.forEach((l) => l());
  try {
    const odpowiedz = await fetch('/pora-nieba', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pora }),
    });
    if (!odpowiedz.ok) return false;
  } catch {
    return false;
  }
  const zapisana = zCiastka() === pora;
  const adres = new URL(window.location.href);
  if (zapisana && !zAdresu && adres.searchParams.has('pora')) {
    adres.searchParams.delete('pora');
    // A fresh state (null): Next.js syncs its router with native history calls,
    // but skips that for a state that already carries its own markers.
    window.history.replaceState(null, '', adres.pathname + adres.search + adres.hash);
  }
  return zapisana;
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
