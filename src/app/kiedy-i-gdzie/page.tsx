import { CoTuZobacze } from '@/components/CoTuZobacze';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { KIEDY_I_GDZIE } from '@/lib/publikacja';
import { PlanerWyjazdu } from '@/components/PlanerWyjazdu';
import { PunktyObserwacji, type DanePunktow } from '@/components/PunktyObserwacji';
import { NaglowekStrony } from '@/components/NaglowekStrony';
import { ZakladkiKiedyIGdzie } from '@/components/ZakladkiKiedyIGdzie';
import { gotoweModuly, punktyObserwacji, znajdzGatunek, znajdzPtakaMokradel } from '@/lib/content';
import './kiedy-i-gdzie.css';

export const metadata: Metadata = {
  title: 'Kiedy i gdzie',
  description:
    'Najlepsze godziny na Marismas del Barbate i La Jandę według pływów i pogody, i punkty obserwacji od Cieśniny Gibraltarskiej po Polskę: kiedy jechać, o której porze i co zobaczysz.',
};

function danePunktow(): DanePunktow {
  const ptaki: DanePunktow['ptaki'] = {};
  const lekcje: DanePunktow['lekcje'] = {};
  for (const p of punktyObserwacji) {
    for (const id of p.gatunki) {
      // sprawdzSpojnosc() in content.ts has checked that every id is in one of the two files.
      const g = znajdzGatunek(id) ?? znajdzPtakaMokradel(id)!;
      ptaki[id] = { pl: g.pl, href: `/gatunki/${id}` };
    }
    const [slug, lekcja] = p.lekcja.split('/');
    const l = gotoweModuly.find((m) => m.slug === slug)?.lekcje.find((x) => x.slug === lekcja);
    if (l) lekcje[p.lekcja] = { href: `/moduly/${slug}/${lekcja}`, tytul: l.tytul };
  }
  return { punkty: punktyObserwacji, ptaki, lekcje };
}

/** "Kiedy i gdzie": the trip planner, the observation points and eBird's latest, one tab each. */
export default function KiedyIGdziePage() {
  // Taken off the site for now (src/lib/publikacja.ts).
  if (!KIEDY_I_GDZIE) notFound();
  return (
    <div className="page">
      <NaglowekStrony tytul="Kiedy i gdzie" />
      <ZakladkiKiedyIGdzie
        kiedy={<PlanerWyjazdu />}
        gdzie={<PunktyObserwacji {...danePunktow()} />}
        coTu={<CoTuZobacze />}
      />
    </div>
  );
}
