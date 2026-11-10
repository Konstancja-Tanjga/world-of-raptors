'use client';

import Link from 'next/link';
import { useState } from 'react';
import { kluczLekcji, usePostep } from '@/lib/postep';
import type { ModulNawigacji } from './AppFrame';

/**
 * The module bar on module and lesson pages: the module, then its lessons as
 * numbered steps (filled when finished, the current one with its title), the
 * way a product site keeps a local bar under the global one. Each step's
 * accessible name carries its title and state; the numbers are only the look.
 */
export function PasekModulu({ modul, lekcja }: { modul: ModulNawigacji; lekcja?: string }) {
  const { postep } = usePostep();
  // The lessons finished since the bar first read the progress: their steps fill with a small pop.
  // Kept from the previous render (not an effect), so the step and its pop arrive in the same frame.
  const [poprzedni, setPoprzedni] = useState(postep);
  const [swieze, setSwieze] = useState<ReadonlySet<string>>(new Set());
  if (postep !== poprzedni) {
    setPoprzedni(postep);
    if (poprzedni && postep) setSwieze(new Set(Object.keys(postep).filter((k) => postep[k] && !poprzedni[k])));
  }
  const biezaca = modul.lekcje.findIndex((l) => l.slug === lekcja);
  const ukonczone = postep ? modul.lekcje.filter((l) => postep[kluczLekcji(modul.slug, l.slug)]).length : null;

  return (
    <nav className="pasek" aria-label={`Moduł ${modul.id}: lekcje`}>
      <div className="pasek__wnetrze">
        <Link href={`/moduly/${modul.slug}`} className="pasek__modul" aria-current={biezaca < 0 ? 'page' : undefined}>
          <span className="pasek__id">{modul.id}</span>
          <span className="pasek__tytul">{modul.tytul}</span>
        </Link>
        <ol className="pasek__lekcje">
          {modul.lekcje.map((l, i) => {
            const gotowa = Boolean(postep?.[kluczLekcji(modul.slug, l.slug)]);
            return (
              <li key={l.slug}>
                <Link
                  href={`/moduly/${modul.slug}/${l.slug}`}
                  className="pasek__lekcja"
                  aria-current={i === biezaca ? 'page' : undefined}
                  data-gotowa={gotowa ? '' : undefined}
                  data-swieza={gotowa && swieze.has(kluczLekcji(modul.slug, l.slug)) ? '' : undefined}
                >
                  <span className="pasek__nr" aria-hidden="true">
                    {gotowa ? '✓' : i + 1}
                  </span>
                  <span className="pasek__nazwa">
                    <span className="visually-hidden">Lekcja {i + 1}: </span>
                    {l.tytul}
                    <span className="visually-hidden">
                      {gotowa ? ', ukończona' : l.progQuizu !== null ? `, quiz, próg ${l.progQuizu}%` : ''}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
        {ukonczone !== null && (
          <p className="pasek__stan">
            {ukonczone === modul.lekcje.length ? 'Moduł zaliczony' : `Ukończone: ${ukonczone} z ${modul.lekcje.length}`}
          </p>
        )}
      </div>
      {biezaca >= 0 && <span className="pasek__czytanie" aria-hidden="true" />}
    </nav>
  );
}
