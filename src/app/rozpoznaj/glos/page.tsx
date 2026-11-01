import type { Metadata } from 'next';
import Link from 'next/link';
import { RozpoznajGlos } from '@/components/RozpoznajGlos';
import { gatunki, ptakiMokradel } from '@/lib/content';
import './glos.css';

export const metadata: Metadata = {
  title: 'Rozpoznaj po głosie',
  description: 'BirdNET słucha przez mikrofon telefonu i nazywa ptaki, które słyszy. Wszystko dzieje się w telefonie.',
};

export default function RozpoznajGlosPage() {
  const poLacinie = Object.fromEntries([...gatunki, ...ptakiMokradel].map((p) => [p.lat, p.id]));
  return (
    <div className="page">
      <header className="naglowek-strony">
        <p className="eyebrow">W teren</p>
        <h1 className="naglowek-strony__tytul">Rozpoznaj po głosie</h1>
        <p className="naglowek-strony__lead">
          Słyszę ptaka, ale go nie widzę? BirdNET słucha przez mikrofon telefonu i podpowiada, kto to. Ptaki z kursu
          prowadzą do swojej karty. To podpowiedź, nie wyrok: sprawdzam ją wzrokiem albo w{' '}
          <Link href="/rozpoznaj" className="text-link">
            rozpoznawaniu krok po kroku
          </Link>
          .
        </p>
      </header>
      <RozpoznajGlos poLacinie={poLacinie} />
      <p className="glos__zrodlo muted">
        Rozpoznawanie:{' '}
        <a href="https://birdnet.cornell.edu" className="text-link">
          BirdNET
        </a>{' '}
        (K. Lisa Yang Center for Conservation Bioacoustics, Cornell Lab of Ornithology, i Uniwersytet Techniczny w
        Chemnitz), model z{' '}
        <a href="https://github.com/BirdNET-Team/real-time-pwa" className="text-link">
          BirdNET Live
        </a>{' '}
        na licencji{' '}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.pl" className="text-link">
          CC BY-SA 4.0
        </a>
        . Kilku drapieżników z atlasu w nim nie ma: ścierwnika, sępa plamistego, orłosępa, kurhannika, orła
        południowego i sokoła skalnego.
      </p>
    </div>
  );
}
