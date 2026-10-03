'use client';

import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useOstatniaLekcja } from '@/lib/ostatnia';
import { SkipLink } from './ds';
import { Nawigacja } from './Nawigacja';
import { PasekModulu } from './PasekModulu';
import { Stopka } from './Stopka';

export type LekcjaNawigacji = { slug: string; tytul: string; progQuizu: number | null };
export type ModulNawigacji = { slug: string; id: string; tytul: string; sciezka: 'a' | 'b'; lekcje: LekcjaNawigacji[] };

/**
 * The frame around every page: the global navigation, the module bar on
 * module and lesson pages (the module's lessons with their state, which the
 * sidebar used to show), the content and the footer.
 *
 * Not Big Hat's AppShell: its contract keeps it for application screens and
 * says documentation pages may use "no shell at all". The landmarks it would
 * provide are here by hand: header, nav, main (the skip link's target) and
 * footer. See DS-GAPS.md.
 */
export function AppFrame({ moduly, znak, children }: { moduly: ModulNawigacji[]; znak: ReactNode; children: ReactNode }) {
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
        {children}
      </main>
      <Stopka />
    </>
  );
}
