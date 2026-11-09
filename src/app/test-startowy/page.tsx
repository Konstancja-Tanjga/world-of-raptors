import type { Metadata } from 'next';
import { Sylwetka } from '@/components/Sylwetka';
import { TestStartowyView } from '@/components/TestStartowyView';
import { gotoweModuly, testStartowy } from '@/lib/content';
import { NaglowekStrony } from '@/components/NaglowekStrony';

export const metadata: Metadata = {
  title: 'Test startowy',
  description: 'Sprawdź, ile już wiesz o ptakach drapieżnych i sowach, i od którego modułu kursu zacząć.',
};

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
      <NaglowekStrony tytul="Test startowy" lead="Wynik podpowie, od czego zacząć." />
      <TestStartowyView pytania={pytania} sylwetki={sylwetki} moduly={moduly} />
    </div>
  );
}
