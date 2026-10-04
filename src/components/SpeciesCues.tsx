import { KLUCZE_DZIENNE, KLUCZE_NOCNE, type Gatunek, type SylwetkaDzienna, type SylwetkaNocna } from '@/lib/types';
import { DescriptionList } from './ds';

const ETYKIETY_DZIENNE: Record<keyof SylwetkaDzienna, string> = {
  grupa: 'Grupa sylwetki',
  skrzydla: 'Skrzydła',
  palce: 'Koniec skrzydła („palce”)',
  ogon: 'Ogon',
  glowa: 'Głowa',
  lot: 'Ułożenie skrzydeł i lot',
};
// Season and habitat (B5 lesson 2, steps 2–3) are per-lesson context, not per-species.
const ETYKIETY_NOCNE: Record<keyof SylwetkaNocna, string> = {
  glos: 'Głos',
  uszy: '„Uszy”',
  sylwetka: 'Sylwetka',
  glowa: 'Głowa i szlara',
  oczy: 'Oczy',
};

/** The cues with their labels, in the order the lessons teach them (B1 for raptors, B5 for owls). */
export const CECHY_DZIENNE = KLUCZE_DZIENNE.map((k) => [k, ETYKIETY_DZIENNE[k]] as const);
export const CECHY_NOCNE = KLUCZE_NOCNE.map((k) => [k, ETYKIETY_NOCNE[k]] as const);

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
      {/* No ariaLabel: Big Hat then puts role="group" on the <dl>, which cuts its terms off
          from the list (DS-GAPS.md); the visible label above names it. */}
      <DescriptionList
        layout="columns"
        items={pola.map(([k, term]) => ({ term, value: cechy[k] }))}
      />
    </div>
  );
}
