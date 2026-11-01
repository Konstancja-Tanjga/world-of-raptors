import type { Metadata } from 'next';
import Link from 'next/link';
import { PlanerWyjazdu } from '@/components/PlanerWyjazdu';
import { PunktyObserwacji, type DanePunktow } from '@/components/PunktyObserwacji';
import { TrzymajKotwice } from '@/components/TrzymajKotwice';
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

/** "Kiedy i gdzie": the trip planner (when) above the observation points (where). */
export default function KiedyIGdziePage() {
  return (
    <div className="page">
      <header className="naglowek-strony">
        <p className="eyebrow">W teren</p>
        <h1 className="naglowek-strony__tytul">Kiedy i gdzie</h1>
        <p className="naglowek-strony__lead">
          Kiedy jechać, gdzie stanąć i co tam zobaczysz. Planer liczy najlepsze godziny na La Jandę i Marismas del Barbate,
          a punkty obserwacji układają się od miejsca, z którego ruszasz.
        </p>
        <ul className="kiedy-i-gdzie__spis" aria-label="Na tej stronie">
          <li>
            <a href="#kiedy" className="text-link">
              Kiedy jechać
            </a>
          </li>
          <li>
            <a href="#gdzie" className="text-link">
              Gdzie stanąć
            </a>
          </li>
        </ul>
      </header>

      <section className="kiedy-i-gdzie__sekcja" aria-labelledby="kiedy">
        <header className="sekcja">
          <h2 id="kiedy" className="sekcja__tytul">
            Kiedy jechać
          </h2>
          <p className="sekcja__lead">
            Wybierz miejsce, a planer sprawdzi prognozę pływów i pogody na dziesięć dni i podpowie, kiedy będzie tam
            najwięcej do oglądania. Zasady pochodzą z lekcji{' '}
            <Link href="/moduly/barbate/02-przed-wyjsciem" className="text-link">
              Przed wyjściem: pływy, wiatr, luneta
            </Link>
            .
          </p>
        </header>
        <PlanerWyjazdu />
      </section>

      <section className="kiedy-i-gdzie__sekcja" aria-labelledby="gdzie">
        <header className="sekcja">
          <h2 id="gdzie" className="sekcja__tytul">
            Gdzie stanąć
          </h2>
          <p className="sekcja__lead">
            Punkty obserwacji z porą roku i dnia, wiatrem, ptakami i dojazdem. Wpisz, skąd ruszasz, a ułożą się od
            najbliższego. Jak wiatr przesuwa przelot nad cieśniną, wyjaśnia lekcja{' '}
            <Link href="/moduly/gibraltar/01-ciesnina" className="text-link">
              Cieśnina, wiatry i kalendarz przelotu
            </Link>
            .
          </p>
        </header>
        <PunktyObserwacji {...danePunktow()} />
      </section>
      <TrzymajKotwice />
    </div>
  );
}
