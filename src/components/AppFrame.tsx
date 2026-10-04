'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect, ViewTransition, type ReactNode } from 'react';
import type { StrukturaNieba } from '@/lib/odznaki';
import { useOstatniaLekcja } from '@/lib/ostatnia';
import { SkipLink } from './ds';
import { Nawigacja } from './Nawigacja';
import { PasekModulu } from './PasekModulu';
import { Stopka } from './Stopka';

// It renders nothing and starts once the stores are read anyway, so it loads after the page is interactive.
const StraznikOdznak = dynamic(() => import('./niebo/StraznikOdznak').then((m) => m.StraznikOdznak), { ssr: false });

export type LekcjaNawigacji = { slug: string; tytul: string; progQuizu: number | null };
export type ModulNawigacji = { slug: string; id: string; tytul: string; lekcje: LekcjaNawigacji[] };

/**
 * The frame around every page: the global navigation, the module bar on
 * module and lesson pages (the module's lessons with their state), the
 * content and the footer.
 *
 * Not Big Hat's AppShell: its contract keeps it for application screens and
 * says documentation pages may use `height="flow"` or "no shell at all". Even
 * with `flow`, its header is the system's own and takes no class, and this
 * one has to turn dark over a scene, let the scene slide under it and scroll
 * away on module pages. The landmarks AppShell would provide are here by
 * hand: header, nav, main (the skip link's target) and footer. See DS-GAPS.md.
 */
export function AppFrame({
  moduly,
  znak,
  struktura,
  children,
}: {
  moduly: ModulNawigacji[];
  znak: ReactNode;
  /** What "Moje niebo" counts, for the watcher that records and announces what is newly earned. */
  struktura: StrukturaNieba;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { zapamietaj } = useOstatniaLekcja();

  const biezacy = moduly.find((m) => pathname === `/moduly/${m.slug}` || pathname.startsWith(`/moduly/${m.slug}/`));
  const lekcja = biezacy && pathname.split('/')[3];

  // "Kontynuuj" returns to the lesson opened last.
  useEffect(() => {
    if (biezacy && lekcja && biezacy.lekcje.some((l) => l.slug === lekcja)) zapamietaj(biezacy.slug, lekcja);
  }, [biezacy, lekcja, zapamietaj]);

  return (
    <>
      <SkipLink>Przejdź do treści</SkipLink>
      <Nawigacja moduly={moduly} przyklejona={!biezacy} znak={znak} />
      {biezacy && <PasekModulu modul={biezacy} lekcja={lekcja} />}
      <main id="main-content" tabIndex={-1} className="tresc">
        {/* Keyed by the route, so a navigation is an exit and an entrance: the
            page fades out, then the next one fades in from slightly below,
            while the bars above it hold still (globals.css). */}
        <ViewTransition key={pathname} enter="strona-wejscie" exit="strona-wyjscie" default="none">
          <div className="tresc__strona">{children}</div>
        </ViewTransition>
      </main>
      <Stopka />
      <StraznikOdznak struktura={struktura} />
    </>
  );
}
