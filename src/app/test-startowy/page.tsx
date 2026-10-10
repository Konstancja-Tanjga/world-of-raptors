import type { Metadata } from 'next';
import { Sylwetka } from '@/components/Sylwetka';
import { TestStartowyView } from '@/components/TestStartowyView';
import { gotoweModuly, testStartowy } from '@/lib/content';

export const metadata: Metadata = { title: 'Test startowy' };

export default function TestStartowyPage() {
  const pytania = testStartowy();
  const sylwetki = Object.fromEntries(
    pytania
      .filter((p) => p.rodzaj === 'sylwetka' && p.gatunek)
      .map((p) => [p.gatunek!.id, <Sylwetka key={p.id} id={p.gatunek!.id} opis="Sylwetka ptaka do rozpoznania, w locie, od spodu" klasa="test__sylwetka" />]),
  );
  const moduly = Object.fromEntries(gotoweModuly.map((m) => [m.slug, `${m.id} ${m.tytul}`]));
  return (
    <div className="page page--reading">
      <header className="naglowek-strony">
        <p className="eyebrow">Moduł 0</p>
        <h1 className="naglowek-strony__tytul">Test startowy</h1>
        <p className="naglowek-strony__lead">
          Ile już wiem i rozpoznaję? Wynik pokazuje poziom w obu ścieżkach i podpowiada, od czego
          zacząć. Ten sam test na końcu kursu pokaże, ile się nauczyłam.
        </p>
      </header>
      <TestStartowyView pytania={pytania} sylwetki={sylwetki} moduly={moduly} />
    </div>
  );
}
