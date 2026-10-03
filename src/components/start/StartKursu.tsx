'use client';

import Link from 'next/link';
import { useKontynuuj, type KonspektKursu } from '@/lib/kontynuuj';

/**
 * The opening scene's main action: start the course, or pick up where I left
 * off. Before the browser copy of progress is read it offers the first
 * lesson, which is also the right answer for a first visit.
 */
export function StartKursu({ konspekt }: { konspekt: KonspektKursu }) {
  const dokad = useKontynuuj(konspekt);
  const pierwszy = konspekt[0];
  const href = dokad?.href ?? `/moduly/${pierwszy.slug}/${pierwszy.lekcje[0].slug}`;
  return (
    <Link href={href} className="cta cta--glowne">
      <span className="cta__etykieta">{dokad?.etykieta ?? 'Zacznij kurs'}</span>
      {dokad && dokad.etykieta === 'Kontynuuj' && <span className="cta__opis">{dokad.opis}</span>}
    </Link>
  );
}
