import type { Metadata } from 'next';
import './atlas.css';
import { AtlasView } from '@/components/AtlasView';
import { Ciekawostka } from '@/components/Ciekawostka';
import { gatunki, ptakiNaLiscie, zdjecia } from '@/lib/content';
import { NaglowekStrony } from '@/components/NaglowekStrony';
import { ButtonLink } from '@/components/ButtonLink';

export const metadata: Metadata = {
  title: 'Atlas gatunków',
  description:
    'Drapieżniki dzienne i sowy Polski, południa Hiszpanii i Cieśniny Gibraltarskiej: zdjęcia, sylwetki w locie, porównanie w jednej skali i gatunki, z którymi łatwo je pomylić.',
  // The filters (`?ptaki=`, `?miejsce=`) show the same atlas.
  alternates: { canonical: '/gatunki' },
};

export default function GatunkiPage() {
  return (
    <div className="page page--atlas">
      <NaglowekStrony
        tytul="Atlas gatunków"
        akcje={
          <ButtonLink href="/rozpoznaj" variant="secondary" size="sm">
            Rozpoznaj ptaka
          </ButtonLink>
        }
      />
      <AtlasView
        ptaki={ptakiNaLiscie}
        gatunki={gatunki}
        miniatury={Object.fromEntries(
          ptakiNaLiscie.map((p) => [p.id, zdjecia[p.id]?.siedzacy ?? zdjecia[p.id]?.lot ?? null]),
        )}
      />
      <div className="atlas__ciekawostka">
        <Ciekawostka />
      </div>
    </div>
  );
}
