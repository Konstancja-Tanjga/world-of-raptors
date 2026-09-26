import Link from 'next/link';
import type { Gatunek, SylwetkaDzienna, SylwetkaNocna } from '@/lib/types';
import { DescriptionList } from './ds';

// Order as taught: B1 lesson 1 (group, wings, tip, tail, head), then lesson 2 (flight).
const DZIENNE: [keyof SylwetkaDzienna, string][] = [
  ['grupa', 'Grupa sylwetki'],
  ['skrzydla', 'Skrzydła'],
  ['palce', 'Koniec skrzydła („palce”)'],
  ['ogon', 'Ogon'],
  ['glowa', 'Głowa'],
  ['lot', 'Ułożenie skrzydeł i lot'],
];
// Order as taught in B5 lesson 2: voice, then silhouette and "ears", then eyes.
// (Season and habitat, steps 2–3, are per-lesson context, not per-species.)
const NOCNE: [keyof SylwetkaNocna, string][] = [
  ['glos', 'Głos'],
  ['uszy', '„Uszy”'],
  ['sylwetka', 'Sylwetka'],
  ['glowa', 'Głowa i szlara'],
  ['oczy', 'Oczy'],
];

/**
 * The identification checklist from the method lessons, filled in for one
 * species, so every photo comes with what to look for in it.
 */
export function SpeciesCues({ g }: { g: Gatunek }) {
  const nocny = g.aktywnosc === 'nocny';
  const cechy = g.sylwetka as Partial<Record<string, string>>;
  const pola = (nocny ? NOCNE : DZIENNE).filter(([k]) => cechy[k]);
  if (pola.length === 0) return null;
  return (
    <div className="cues">
      <p className="cues__title">🔎 Na co patrzeć</p>
      <DescriptionList
        layout="columns"
        density="compact"
        ariaLabel={`Na co patrzeć: ${g.pl}`}
        items={pola.map(([k, term]) => ({ term, value: cechy[k] }))}
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
