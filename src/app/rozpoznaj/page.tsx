import type { Metadata } from 'next';
import { Rozpoznaj, type GatunekRozpoznania } from '@/components/Rozpoznaj';
import { gatunki, ptakiMiarki, zdjecia } from '@/lib/content';
import '../gatunki/atlas.css';
import './rozpoznaj.css';
import { NaglowekStrony } from '@/components/NaglowekStrony';
import { ButtonLink } from '@/components/ButtonLink';

export const metadata: Metadata = {
  title: 'Rozpoznaj',
  description: 'Rozpoznawanie krok po kroku: gdzie był ptak, jak duży, jakie miał kolory i co robił, a potem pasujące drapieżniki i sowy z atlasu.',
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
