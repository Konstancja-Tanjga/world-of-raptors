import type { Metadata } from 'next';
import { FiszkiView } from '@/components/FiszkiView';
import { gatunkiFiszek, taliaFiszek } from '@/lib/content';

export const metadata: Metadata = { title: 'Fiszki' };

export default function FiszkiPage() {
  const talia = taliaFiszek();
  const ile = (rodzaje: string[]) => talia.filter((f) => rodzaje.includes(f.rodzaj)).length;
  return (
    <div className="page page--fiszki">
      <header className="naglowek-strony">
        <p className="eyebrow">Powtórki</p>
        <h1 className="naglowek-strony__tytul">Fiszki</h1>
        <p className="naglowek-strony__lead">
          Rozpoznaję ptaka ze zdjęcia ({ile(['lot', 'siedzacy'])}), z sylwetki w locie ({ile(['sylwetka'])}) i po nazwie:
          polskiej, angielskiej albo hiszpańskiej ({ile(['pl-en', 'pl-es', 'en-pl', 'es-pl'])}). Odsłaniam odpowiedź i oceniam,
          jak mi poszło, a algorytm FSRS (ten sam, który można włączyć w Anki) układa powtórki: trudne fiszki wracają
          szybciej, łatwe coraz rzadziej. Każdego dnia dochodzi do 10 nowych.
        </p>
      </header>
      <FiszkiView talia={talia} gatunki={gatunkiFiszek()} />
    </div>
  );
}
