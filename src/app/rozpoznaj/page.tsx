import type { Metadata } from 'next';
import Link from 'next/link';
import { Rozpoznaj, type GatunekRozpoznania } from '@/components/Rozpoznaj';
import { gatunki, ptakiMiarki, zdjecia } from '@/lib/content';
import '../gatunki/atlas.css';
import './rozpoznaj.css';

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
      <header className="naglowek-strony">
        <p className="eyebrow">W teren</p>
        <h1 className="naglowek-strony__tytul">Rozpoznaj</h1>
        <p className="naglowek-strony__lead">
          Widzisz ptaka, ale nie wiesz, co to? Odpowiedz na cztery pytania, a pokażę drapieżniki i sowy z{' '}
          <Link href="/gatunki" className="text-link">
            atlasu
          </Link>
          , które pasują najbardziej. Każde pytanie możesz pominąć.
        </p>
      </header>
      <Rozpoznaj gatunki={dane} odniesienia={odniesienia} />
    </div>
  );
}
