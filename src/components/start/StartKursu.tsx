'use client';

import Link from 'next/link';
import { useKontynuuj, type KonspektKursu } from '@/lib/kontynuuj';

/**
 * The opening scene's main action: start the course, pick up where I left
 * off, or go through it again once every lesson is done. The page is
 * rendered before the browser copy of progress can be read, so until then it
 * offers the first lesson, which is the right answer for a first visit.
 */
export function StartKursu({ konspekt }: { konspekt: KonspektKursu }) {
  const dokad = useKontynuuj(konspekt);
  const pierwszy = konspekt[0];
  const poczatek = `/moduly/${pierwszy.slug}/${pierwszy.lekcje[0].slug}`;

  if (dokad.stan === 'ukonczony') {
    return (
      <Link href={poczatek} className="cta cta--glowne">
        <span className="cta__etykieta">Przejdź kurs jeszcze raz</span>
        <span className="cta__opis">Wszystkie lekcje ukończone</span>
      </Link>
    );
  }
  return (
    <Link href={dokad.stan === 'lekcja' ? dokad.href : poczatek} className="cta cta--glowne">
      <span className="cta__etykieta">{dokad.stan === 'lekcja' ? dokad.etykieta : 'Zacznij kurs'}</span>
      {dokad.stan === 'lekcja' && dokad.etykieta === 'Kontynuuj' && <span className="cta__opis">{dokad.opis}</span>}
    </Link>
  );
}
