import type { Metadata } from 'next';
import './atlas.css';
import { AtlasView } from '@/components/AtlasView';
import { Ciekawostka } from '@/components/Ciekawostka';
import { ciekawostkiDla, gatunki, zdjecia } from '@/lib/content';
import { odmiana } from '@/lib/odmiana';

export const metadata: Metadata = { title: 'Atlas gatunków' };

export default function GatunkiPage() {
  const dzienne = gatunki.filter((g) => g.aktywnosc === 'dzienny').length;
  const sowy = gatunki.length - dzienne;
  return (
    <div className="page page--atlas">
      <header className="naglowek-strony">
        <p className="eyebrow">Atlas</p>
        <h1 className="naglowek-strony__tytul">Atlas gatunków</h1>
        <p className="naglowek-strony__lead">
          {gatunki.length} {odmiana(gatunki.length, ['gatunek', 'gatunki', 'gatunków'])} z modułów kursu: {dzienne}{' '}
          {odmiana(dzienne, ['drapieżnik dzienny', 'drapieżniki dzienne', 'drapieżników dziennych'])} i {sowy}{' '}
          {odmiana(sowy, ['sowa', 'sowy', 'sów'])} z Polski, południa Hiszpanii i Cieśniny Gibraltarskiej. Zobacz je na
          zdjęciach, jako sylwetki na tle nieba albo wszystkie w jednej skali.
        </p>
      </header>
      <AtlasView
        gatunki={gatunki}
        miniatury={Object.fromEntries(
          gatunki.map((g) => [g.id, zdjecia[g.id]?.siedzacy ?? zdjecia[g.id]?.lot ?? null]),
        )}
      />
      <div className="atlas__ciekawostka">
        <Ciekawostka {...ciekawostkiDla()} />
      </div>
    </div>
  );
}
