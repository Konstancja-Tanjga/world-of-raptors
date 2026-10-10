import type { Metadata } from 'next';
import Link from 'next/link';
import { PlanerWyjazdu } from '@/components/PlanerWyjazdu';

export const metadata: Metadata = {
  title: 'Kiedy jechać',
  description: 'Najlepsze godziny na Marismas del Barbate i La Jandę w najbliższych dniach, według pływów i pogody.',
};

export default function KiedyJechacPage() {
  return (
    <div className="page">
      <header className="naglowek-strony">
        <p className="eyebrow">W teren</p>
        <h1 className="naglowek-strony__tytul">Kiedy jechać</h1>
        <p className="naglowek-strony__lead">
          Wybieram miejsce, a planer sprawdza prognozę pływów i pogody na dziesięć dni i podpowiada, kiedy będzie tam
          najwięcej do oglądania. Zasady pochodzą z lekcji{' '}
          <Link href="/moduly/barbate/02-przed-wyjsciem" className="text-link">
            Przed wyjściem: pływy, wiatr, luneta
          </Link>
          .
        </p>
      </header>
      <PlanerWyjazdu />
    </div>
  );
}
