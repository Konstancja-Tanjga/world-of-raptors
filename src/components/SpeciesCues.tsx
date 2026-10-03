import type { Gatunek, SylwetkaDzienna, SylwetkaNocna } from '@/lib/types';
import { DescriptionList } from './ds';

// Order as taught: B1 lesson 1 (group, wings, tip, tail, head), then lesson 2 (flight).
export const CECHY_DZIENNE: [keyof SylwetkaDzienna, string][] = [
  ['grupa', 'Grupa sylwetki'],
  ['skrzydla', 'Skrzydła'],
  ['palce', 'Koniec skrzydła („palce”)'],
  ['ogon', 'Ogon'],
  ['glowa', 'Głowa'],
  ['lot', 'Ułożenie skrzydeł i lot'],
];
// Order as taught in B5 lesson 2: voice, then silhouette and "ears", then eyes.
// (Season and habitat, steps 2–3, are per-lesson context, not per-species.)
export const CECHY_NOCNE: [keyof SylwetkaNocna, string][] = [
  ['glos', 'Głos'],
  ['uszy', '„Uszy”'],
  ['sylwetka', 'Sylwetka'],
  ['glowa', 'Głowa i szlara'],
  ['oczy', 'Oczy'],
];

/**
 * The identification checklist for a species with no look-alikes to compare
 * against (with look-alikes, SpeciesMedia shows the comparison table instead).
 */
export function SpeciesCues({ g }: { g: Gatunek }) {
  const cechy: Partial<Record<string, string>> = g.sylwetka;
  const pola = (g.aktywnosc === 'nocny' ? CECHY_NOCNE : CECHY_DZIENNE).filter(([k]) => cechy[k]);
  if (pola.length === 0) return null;
  return (
    <div className="plate__cues">
      <p className="plate__label">Na co patrzeć</p>
      <DescriptionList
        layout="columns"
        ariaLabel={`Na co patrzeć: ${g.pl}`}
        items={pola.map(([k, term]) => ({ term, value: cechy[k] }))}
      />
    </div>
  );
}
