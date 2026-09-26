import Link from 'next/link';
import type { Gatunek } from '@/lib/types';
import { DescriptionList } from './ds';

const DZIENNE: [string, string][] = [
  ['grupa', 'Grupa sylwetki'],
  ['skrzydla', 'Skrzydła'],
  ['palce', 'Koniec skrzydła („palce”)'],
  ['ogon', 'Ogon'],
  ['glowa', 'Głowa'],
  ['lot', 'Ułożenie skrzydeł i lot'],
];
const NOCNE: [string, string][] = [
  ['glos', 'Głos'],
  ['uszy', '„Uszy”'],
  ['oczy', 'Oczy'],
  ['glowa', 'Głowa i szlara'],
  ['sylwetka', 'Sylwetka'],
];

/**
 * The identification checklist from the method lessons, filled in for one
 * species, so every photo comes with what to look for in it.
 */
export function SpeciesCues({ g }: { g: Gatunek }) {
  const nocny = g.aktywnosc === 'nocny';
  const pola = (nocny ? NOCNE : DZIENNE).filter(([k]) => g.sylwetka?.[k]);
  if (pola.length === 0) return null;
  return (
    <div className="cues">
      <p className="cues__title">🔎 Na co patrzeć</p>
      <DescriptionList
        layout="columns"
        density="compact"
        ariaLabel={`Na co patrzeć: ${g.pl}`}
        items={pola.map(([k, term]) => ({ term, value: g.sylwetka[k] }))}
      />
      <p className="muted cues__source">
        Kolejność jak w lekcji{' '}
        {nocny ? (
          <Link href="/moduly/sowy/02-jak-rozpoznawac" className="text-link">
            B5 · Jak rozpoznawać sowy
          </Link>
        ) : (
          <Link href="/moduly/metoda/01-sylwetka" className="text-link">
            B1 · Sylwetka: 8 grup
          </Link>
        )}
        .
      </p>
    </div>
  );
}
