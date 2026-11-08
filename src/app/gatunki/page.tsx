import type { Metadata } from 'next';
import './atlas.css';
import { AtlasView } from '@/components/AtlasView';
import { Ciekawostka } from '@/components/Ciekawostka';
import { ciekawostkiDla, gatunki, ptakiNaLiscie, zdjecia } from '@/lib/content';
import { odmiana } from '@/lib/odmiana';

export const metadata: Metadata = {
  title: 'Atlas gatunków',
  description:
    'Drapieżniki dzienne i sowy Polski, południa Hiszpanii i Cieśniny Gibraltarskiej: zdjęcia, sylwetki w locie, porównanie w jednej skali i gatunki, z którymi łatwo je pomylić.',
  // The filters (`?ptaki=`, `?miejsce=`) show the same atlas.
  alternates: { canonical: '/gatunki' },
};

export default function GatunkiPage() {
  const dzienne = gatunki.filter((g) => g.aktywnosc === 'dzienny').length;
  const sowy = gatunki.length - dzienne;
  return (
    <div className="page page--atlas">
      <header className="naglowek-strony">
        <p className="eyebrow">Atlas</p>
        <h1 className="naglowek-strony__tytul">Atlas gatunków</h1>
        <p className="naglowek-strony__lead">
          {gatunki.length} {odmiana(gatunki.length, ['gatunek', 'gatunki', 'gatunków'])} z kursu: {dzienne}{' '}
          {odmiana(dzienne, ['drapieżnik dzienny', 'drapieżniki dzienne', 'drapieżników dziennych'])} i {sowy}{' '}
          {odmiana(sowy, ['sowa', 'sowy', 'sów'])}. Zobacz je na zdjęciach, jako sylwetki na tle nieba albo w jednej skali.
        </p>
      </header>
      <AtlasView
        ptaki={ptakiNaLiscie}
        gatunki={gatunki}
        miniatury={Object.fromEntries(
          ptakiNaLiscie.map((p) => [p.id, zdjecia[p.id]?.siedzacy ?? zdjecia[p.id]?.lot ?? null]),
        )}
      />
      <div className="atlas__ciekawostka">
        <Ciekawostka {...ciekawostkiDla()} />
      </div>
    </div>
  );
}
