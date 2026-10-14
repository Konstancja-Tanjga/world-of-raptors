'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

/*
 * The course is written in Polish; a browser can translate it on the fly
 * (Chrome, Edge and others offer it, since <html lang="pl">). Species names
 * are marked translate="no", so the translator leaves them alone, and swapped
 * here for the names in the language the page was translated into: browsers
 * that translate set <html lang> to that language.
 */

/** "en-GB" → "en"; Chrome writes Norwegian Bokmål as "no". */
function kodJezyka(lang: string) {
  const kod = lang.toLowerCase().split(/[-_]/)[0];
  return kod === 'no' ? 'nb' : kod || 'pl';
}

function subskrybuj(zmiana: () => void) {
  const obserwator = new MutationObserver(zmiana);
  obserwator.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  return () => obserwator.disconnect();
}

/** The language the page is shown in: "pl" unless a browser has translated it. Always "pl" on the server and during hydration. */
export function useJezykStrony() {
  return useSyncExternalStore(
    subskrybuj,
    () => kodJezyka(document.documentElement.lang),
    () => 'pl',
  );
}

type Nazwy = Record<string, Record<string, string>>;
let wczytywanie: Promise<Nazwy> | null = null;

function wczytajNazwy() {
  wczytywanie ??= fetch('/nazwy-gatunkow')
    .then((odp) => {
      if (!odp.ok) throw new Error(`HTTP ${odp.status}`);
      return odp.json() as Promise<Nazwy>;
    })
    .catch((err: unknown) => {
      // The names stay Polish; a later translation tries again.
      console.error('[jezykStrony] species names did not load', err);
      wczytywanie = null;
      return {};
    });
  return wczytywanie;
}

/**
 * Species names for the language the page has been translated into, or null
 * while the page is in Polish (nothing is fetched then) and while they load.
 */
export function useNazwyGatunkow(jezyk: string) {
  const [nazwy, setNazwy] = useState<Nazwy | null>(null);
  useEffect(() => {
    if (jezyk === 'pl') return;
    let aktywny = true;
    void wczytajNazwy().then((n) => {
      if (aktywny) setNazwy(n);
    });
    return () => {
      aktywny = false;
    };
  }, [jezyk]);
  return jezyk === 'pl' ? null : nazwy;
}
