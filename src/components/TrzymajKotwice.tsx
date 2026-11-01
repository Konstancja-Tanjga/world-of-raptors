'use client';

import { useEffect } from 'react';

/** How long after arriving the page may still grow above the anchor (a forecast fetched in the browser). */
const CZAS_MS = 10_000;

/**
 * Keeps the element a link's #hash points to at the top while the page above
 * it grows: on "Kiedy i gdzie" the planner renders a loading state first and
 * its forecast later, which would push "Gdzie stanąć" down after the browser
 * has scrolled to it (Safari has no scroll anchoring). It lets go as soon as
 * the reader scrolls, clicks or types, and after a few seconds.
 */
export function TrzymajKotwice() {
  useEffect(() => {
    let koniec = performance.now() + CZAS_MS;
    let puszczona = false;
    const pusc = () => {
      puszczona = true;
    };
    const cel = () => (location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null);
    const obserwator = new ResizeObserver(() => {
      if (puszczona || performance.now() > koniec) return;
      cel()?.scrollIntoView({ block: 'start' });
    });
    // A new #hash (the page's own contents links) holds its target the same way.
    const nowyCel = () => {
      puszczona = false;
      koniec = performance.now() + CZAS_MS;
    };
    const zdarzenia = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
    for (const z of zdarzenia) window.addEventListener(z, pusc, { passive: true, capture: true });
    window.addEventListener('hashchange', nowyCel);
    obserwator.observe(document.body);
    return () => {
      obserwator.disconnect();
      for (const z of zdarzenia) window.removeEventListener(z, pusc, { capture: true });
      window.removeEventListener('hashchange', nowyCel);
    };
  }, []);
  return null;
}
