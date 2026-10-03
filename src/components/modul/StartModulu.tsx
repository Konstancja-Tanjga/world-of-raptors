'use client';

import Link from 'next/link';
import { kluczLekcji, usePostep } from '@/lib/postep';

/**
 * The opening scene's action: the first lesson of the module I have not
 * finished. Before the browser copy of progress is read it offers lesson 1,
 * which is also the right answer for a module I have not started.
 */
export function StartModulu({ modul, lekcje }: { modul: string; lekcje: { slug: string; tytul: string }[] }) {
  const { postep } = usePostep();
  const nastepna = postep ? lekcje.findIndex((l) => !postep[kluczLekcji(modul, l.slug)]) : 0;
  const rozpoczety = postep ? lekcje.some((l) => postep[kluczLekcji(modul, l.slug)]) : false;

  if (nastepna < 0) {
    return (
      <div className="otwarcie__akcje">
        <p className="otwarcie__zaliczony">Moduł zaliczony</p>
        <Link href={`/moduly/${modul}/${lekcje[0].slug}`} className="cta cta--szklo">
          <span className="cta__etykieta">Wróć do lekcji 1</span>
        </Link>
      </div>
    );
  }
  const l = lekcje[nastepna];
  return (
    <div className="otwarcie__akcje">
      <Link href={`/moduly/${modul}/${l.slug}`} className="cta cta--glowne">
        <span className="cta__etykieta">{rozpoczety ? `Kontynuuj: lekcja ${nastepna + 1}` : 'Zacznij od lekcji 1'}</span>
        <span className="cta__opis">{l.tytul}</span>
      </Link>
    </div>
  );
}
