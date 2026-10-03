'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useChecklista } from '@/lib/checklist';
import type { Gatunek, Zdjecie } from '@/lib/types';
import { polozenie } from '@/lib/zdjecia';
import { Button, SegmentedControl, StateBlock } from './ds';
import { PUSTE_FILTRY, SpeciesFilters, useFiltry } from './SpeciesFilters';
import { Sylwetka } from './Sylwetka';

type Widok = 'zdjecia' | 'sylwetki' | 'skala';

/** The silhouette groups in the order B1 teaches them, then owls. */
const KOLEJNOSC_GRUP = ['sępy', 'orły', 'myszołowy', 'kanie', 'błotniaki', 'krogulce', 'sokoły', 'rybołów', 'sowy'];
const NAZWA_GRUPY: Record<string, string> = {
  sępy: 'Sępy',
  orły: 'Orły',
  myszołowy: 'Myszołowy',
  kanie: 'Kanie',
  błotniaki: 'Błotniaki',
  krogulce: 'Krogulce',
  sokoły: 'Sokoły',
  rybołów: 'Rybołów',
  sowy: 'Sowy',
};
const CZLOWIEK_CM = 170;

/** A species' silhouette group: its own cue for diurnal species ("orły (mały orzeł)" counts as orły), owls for owls. */
function grupaSylwetki(g: Gatunek) {
  if (g.aktywnosc === 'nocny') return 'sowy';
  const grupa = ((g.sylwetka as Record<string, string>).grupa ?? '').split(' ')[0];
  return KOLEJNOSC_GRUP.includes(grupa) ? grupa : 'myszołowy';
}

/**
 * The atlas: every species, filtered by region, activity and name, seen three
 * ways. Photos (as in a field guide's index), silhouettes grouped the way B1
 * teaches, and all silhouettes at true relative size, from the pygmy owl to
 * the cinereous vulture, next to a person's outstretched arms.
 */
export function AtlasView({ gatunki, miniatury }: { gatunki: Gatunek[]; miniatury: Record<string, Zdjecie | null> }) {
  const { filtry, setFiltry, wynik } = useFiltry(gatunki);
  const { lista } = useChecklista();
  const [widok, setWidok] = useState<Widok>('zdjecia');
  const maks = Math.max(...gatunki.map((g) => g.rozpietosc_cm[1]));

  const pusto = (
    <StateBlock
      state="empty"
      title="Brak gatunków w tym filtrze"
      description="Zmień region, aktywność albo wpisaną nazwę."
      action={
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setFiltry(PUSTE_FILTRY);
            // The button disappears with the empty state; keep keyboard focus on the page.
            requestAnimationFrame(() => document.querySelector<HTMLInputElement>('input[type=search]')?.focus());
          }}
        >
          Wyczyść filtry
        </Button>
      }
      scope="section"
    />
  );

  const widziany = (id: string) => Boolean(lista?.[id]);

  return (
    <div className="atlas">
      <div className="atlas__narzedzia">
        <SpeciesFilters filtry={filtry} onChange={setFiltry} />
        <div className="atlas__widok">
          <div className="scroll-x">
            <SegmentedControl
              legend="Widok"
              showLegend
              value={widok}
              onChange={(v) => setWidok(v as Widok)}
              options={[
                { value: 'zdjecia', label: 'Zdjęcia' },
                { value: 'sylwetki', label: 'Sylwetki' },
                { value: 'skala', label: 'W skali' },
              ]}
            />
          </div>
          <p className="atlas__licznik" aria-live="polite">
            Gatunki: {wynik.length} z {gatunki.length}
          </p>
        </div>
      </div>

      {wynik.length === 0 ? (
        pusto
      ) : widok === 'zdjecia' ? (
        <ul className="atlas__karty">
          {wynik.map((g) => {
            const z = miniatury[g.id];
            return (
              <li key={g.id}>
                <Link href={`/gatunki/${g.id}`} className="karta-gatunku" data-widziany={widziany(g.id) ? '' : undefined}>
                  <span className="karta-gatunku__foto">
                    {z ? (
                      // eslint-disable-next-line @next/next/no-img-element -- a Commons thumbnail, already sized
                      <img src={z.src} alt="" loading="lazy" decoding="async" style={{ objectPosition: polozenie(z) }} />
                    ) : (
                      <Sylwetka id={g.id} klasa="karta-gatunku__zastepcza" />
                    )}
                  </span>
                  <span className="karta-gatunku__opis">
                    <span className="karta-gatunku__nazwa">{g.pl}</span>
                    <span className="karta-gatunku__lacina">{g.lat}</span>
                    <span className="karta-gatunku__meta">
                      {g.grupa}
                      {g.status.includes('rzadki') && <span className="karta-gatunku__znacznik">rzadki</span>}
                      {widziany(g.id) && <span className="karta-gatunku__znacznik karta-gatunku__znacznik--widziany">zaobserwowany</span>}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : widok === 'sylwetki' ? (
        <div className="atlas__plansze">
          {KOLEJNOSC_GRUP.map((grupa) => {
            const wGrupie = wynik.filter((g) => grupaSylwetki(g) === grupa);
            if (wGrupie.length === 0) return null;
            return (
              <section key={grupa} className="plansza-grupy" aria-labelledby={`grupa-${grupa}`}>
                <h2 id={`grupa-${grupa}`} className="plansza-grupy__tytul">
                  {NAZWA_GRUPY[grupa]}
                </h2>
                <ul className="plansza-grupy__lista">
                  {wGrupie.map((g) => (
                    <li key={g.id}>
                      <Link href={`/gatunki/${g.id}`} className="plansza-grupy__gatunek" data-widziany={widziany(g.id) ? '' : undefined}>
                        <Sylwetka id={g.id} klasa="plansza-grupy__sylwetka" dokladnosc={0.2} />
                        <span className="plansza-grupy__nazwa">{g.pl}</span>
                        <span className="plansza-grupy__lacina">{g.lat}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="skala">
          <p className="skala__opis">
            Każda sylwetka w tej samej skali: szerokość pola to {maks} cm, rozpiętość skrzydeł największego ptaka w atlasie.
            Najmniejsze sowy mają niespełna jedną ósmą tego.
          </p>
          <ul className="skala__lista">
            <li className="skala__czlowiek">
              <span className="skala__rysunek" aria-hidden="true">
                <span className="skala__rece" style={{ width: `${(CZLOWIEK_CM / maks) * 100}%` }} />
              </span>
              <span className="skala__nazwa">Rozłożone ręce człowieka</span>
              <span className="skala__cm">ok. {CZLOWIEK_CM} cm</span>
            </li>
            {[...wynik]
              .sort((a, b) => b.rozpietosc_cm[1] - a.rozpietosc_cm[1])
              .map((g) => (
                <li key={g.id}>
                  <Link href={`/gatunki/${g.id}`} className="skala__gatunek" data-widziany={widziany(g.id) ? '' : undefined}>
                    <span className="skala__rysunek">
                      <Sylwetka id={g.id} klasa="skala__sylwetka" skala={{ cm: g.rozpietosc_cm[1], maks }} dokladnosc={0.25} />
                    </span>
                    <span className="skala__nazwa">{g.pl}</span>
                    <span className="skala__cm">
                      {g.rozpietosc_cm[0]}–{g.rozpietosc_cm[1]} cm
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
