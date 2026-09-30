import type { Metadata } from 'next';
import { FiszkiView } from '@/components/FiszkiView';
import { taliaFiszek } from '@/lib/content';

export const metadata: Metadata = { title: 'Fiszki' };

export default function FiszkiPage() {
  return (
    <div className="page page--reading">
      <div className="stack">
        <h1 className="page-title">Fiszki</h1>
        <p className="lead">
          Rozpoznaję ptaka ze zdjęcia, odsłaniam odpowiedź i oceniam, jak mi poszło. Trudne fiszki
          wracają szybciej, łatwe coraz rzadziej. Każdego dnia dochodzi do 10 nowych.
        </p>
      </div>
      <FiszkiView talia={taliaFiszek()} />
    </div>
  );
}
