'use client';

import { useSyncExternalStore } from 'react';

/**
 * A media query as state. On the server, and during hydration, it reports
 * `naSerwerze`; afterwards the browser's answer, updated when it changes.
 */
export function useMedia(zapytanie: string, naSerwerze = false) {
  return useSyncExternalStore(
    (zmiana) => {
      const m = window.matchMedia(zapytanie);
      m.addEventListener('change', zmiana);
      return () => m.removeEventListener('change', zmiana);
    },
    () => window.matchMedia(zapytanie).matches,
    () => naSerwerze,
  );
}

/** Whether the reader asked the system for less motion. */
export const useMniejRuchu = () => useMedia('(prefers-reduced-motion: reduce)');
