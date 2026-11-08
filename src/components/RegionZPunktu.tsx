'use client';

import { useRef, useState } from 'react';
import { opisBleduLokalizacji, pobierzPozycje } from '@/lib/lokalizacja';
import type { Wspolrzedne } from '@/lib/punkty';
import { regionPunktu } from '@/lib/regionPunktu';
import { REGIONY, type Region } from '@/lib/types';
import { MapaWGranicy } from './dziennik/MapaWGranicy';
import { Button } from './ds';

type Stan = { stan: 'spokoj' } | { stan: 'lokalizuje' } | { stan: 'jest'; punkt: Wspolrzedne; region: Region | null } | { stan: 'blad'; opis: string };

/**
 * "Rozpoznaj"'s region from a point: the phone's position or a tap on the
 * map. The region is worked out here (regionPunktu), so the point stays in
 * the browser; one outside the atlas's regions is said so, and the list
 * stays to choose from.
 */
export function RegionZPunktu({ onRegion }: { onRegion: (r: Region) => void }) {
  const [stan, setStan] = useState<Stan>({ stan: 'spokoj' });
  const [mapa, setMapa] = useState(false);
  const zadanie = useRef(0);

  const ustaw = (punkt: Wspolrzedne) => {
    const region = regionPunktu(punkt);
    setStan({ stan: 'jest', punkt, region });
    if (region) onRegion(region);
  };

  const zlokalizuj = () => {
    const numer = ++zadanie.current;
    setStan({ stan: 'lokalizuje' });
    pobierzPozycje().then(
      (pos) => numer === zadanie.current && ustaw(pos),
      (err: unknown) => numer === zadanie.current && setStan({ stan: 'blad', opis: `${opisBleduLokalizacji(err)} Wybierz region z listy albo na mapie.` }),
    );
  };

  const nazwa = (r: Region) => REGIONY.find((x) => x.value === r)?.label ?? r;

  return (
    <div className="rozpoznaj__region-z-punktu stack">
      <div className="row">
        <Button variant="secondary" size="sm" onClick={zlokalizuj} loading={stan.stan === 'lokalizuje'} loadingLabel="Ustalam lokalizację">
          Na podstawie mojej lokalizacji
        </Button>
        <Button variant="secondary" size="sm" aria-expanded={mapa} onClick={() => setMapa(!mapa)}>
          {mapa ? 'Ukryj mapę' : 'Wybierz na mapie'}
        </Button>
      </div>
      <p role="status" className="muted">
        {stan.stan === 'jest'
          ? stan.region
            ? `Ten punkt leży w regionie: ${nazwa(stan.region)}.`
            : 'Ten punkt leży poza regionami atlasu (Polska, południe Hiszpanii, Cieśnina Gibraltarska). Wybierz najbliższy z listy.'
          : stan.stan === 'blad'
            ? stan.opis
            : ''}
      </p>
      {mapa && (
        <MapaWGranicy
          etykieta="Mapa: wybór miejsca obserwacji"
          opisBledu="Pewnie nie ma zasięgu. Wybierz region z listy powyżej."
          wybrany={stan.stan === 'jest' ? stan.punkt : null}
          onWybierz={ustaw}
        />
      )}
    </div>
  );
}
