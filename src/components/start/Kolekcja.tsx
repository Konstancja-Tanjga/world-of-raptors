'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { jestWidziany, useChecklista } from '@/lib/checklist';
import { odmiana } from '@/lib/odmiana';

export type PozycjaKolekcji = { id: string; pl: string; sylwetka: ReactNode };

/**
 * My sightings as a collection: every atlas species has its place, drawn as
 * an outline, and fills in once I tick it on the checklist. The count and
 * the fills appear when the browser copy of the checklist has been read.
 */
export function Kolekcja({ gatunki }: { gatunki: PozycjaKolekcji[] }) {
  const { lista } = useChecklista();
  const widziane = lista ? gatunki.filter((g) => jestWidziany(lista, g.id)).length : null;

  return (
    <section className="kolekcja" aria-labelledby="kolekcja-tytul">
      <header className="sekcja sekcja--wiersz">
        <div>
          <p className="eyebrow">Moja lista</p>
          <h2 id="kolekcja-tytul" className="sekcja__tytul">
            Każdy gatunek ma tu swoje miejsce
          </h2>
          <p className="sekcja__lead">
            Sylwetki zaobserwowanych gatunków wypełniają się, gdy zaznaczę je na checkliście.
          </p>
        </div>
        <div className="kolekcja__licznik">
          {widziane !== null && (
            <p>
              <span className="kolekcja__liczba">{widziane}</span>
              <span className="kolekcja__z">
                z {gatunki.length} {odmiana(gatunki.length, ['gatunku', 'gatunków', 'gatunków'])}
              </span>
            </p>
          )}
          <Link href="/checklista" className="cta cta--obrys">
            <span className="cta__etykieta">Otwórz checklistę</span>
          </Link>
        </div>
      </header>
      <ul className="kolekcja__siatka">
        {gatunki.map((g) => {
          const widziany = lista ? jestWidziany(lista, g.id) : false;
          return (
            <li key={g.id} data-widziany={widziany ? '' : undefined}>
              <Link href={`/gatunki/${g.id}`} className="kolekcja__gatunek">
                {g.sylwetka}
                <span className="kolekcja__nazwa">
                  {g.pl}
                  {widziany && <span className="visually-hidden">, zaobserwowany</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
