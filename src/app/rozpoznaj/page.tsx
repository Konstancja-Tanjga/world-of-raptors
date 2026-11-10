import type { Metadata } from 'next';
import { Rozpoznaj, type GatunekRozpoznania } from '@/components/Rozpoznaj';
import { gatunki, ptakiMiarki, siewkowce, zdjecia } from '@/lib/content';
import '../gatunki/atlas.css';
import './rozpoznaj.css';
import { NaglowekStrony } from '@/components/NaglowekStrony';
import { ButtonLink } from '@/components/ButtonLink';

export const metadata: Metadata = {
  title: 'Rozpoznaj',
  description: 'Rozpoznawanie krok po kroku: gdzie był ptak, jak duży, jakie miał kolory i co robił, a potem pasujące drapieżniki, sowy i siewkowce z atlasu.',
};

export default function RozpoznajPage() {
  const dane: GatunekRozpoznania[] = gatunki.map((g) => ({
    id: g.id,
    pl: g.pl,
    lat: g.lat,
    regiony: g.regiony,
    dlugosc_cm: g.dlugosc_cm,
    kolory: g.kolory,
    zachowania: g.zachowania,
    zdjecia: { lot: zdjecia[g.id]?.lot ?? null, siedzacy: zdjecia[g.id]?.siedzacy ?? null },
  }));
  // B9's waders, taught as full species, after the raptors and owls.
  for (const p of siewkowce) {
    dane.push({
      id: p.id,
      // Birds of marshes keep their names in lower case, as the checklist reads them in a sentence.
      pl: p.pl[0].toLocaleUpperCase('pl') + p.pl.slice(1),
      lat: p.lat,
      regiony: p.rozpoznawanie.regiony,
      dlugosc_cm: p.rozpoznawanie.dlugosc_cm,
      kolory: p.rozpoznawanie.kolory,
      zachowania: p.rozpoznawanie.zachowania,
      zdjecia: { lot: zdjecia[p.id]?.lot ?? null, siedzacy: zdjecia[p.id]?.siedzacy ?? null },
    });
  }
  const odniesienia = ptakiMiarki.map(({ id, pl, dlugosc_cm }) => ({ id, pl, dlugosc_cm }));
  return (
    <div className="page">
      <NaglowekStrony
        tytul="Rozpoznaj"
        lead="Cztery pytania i pasujące gatunki."
        akcje={
          <ButtonLink href="/rozpoznaj/glos" variant="secondary" size="sm">
            Po głosie
          </ButtonLink>
        }
      />
      <Rozpoznaj gatunki={dane} odniesienia={odniesienia} />
    </div>
  );
}
