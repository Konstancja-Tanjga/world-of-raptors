'use client';

import { KIEDY_I_GDZIE } from '@/lib/publikacja';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { odmiana, punktSlownie } from '@/lib/dziennik';
import { useDziennik, wpisy, type WpisDziennika } from '@/lib/dziennikMagazyn';
import { adresMapy } from '@/lib/punkty';
import { ButtonLink } from '../ButtonLink';
import { Button, StateBlock } from '../ds';
import { NazwaPtaka } from '../NazwaPtaka';
import type { PtakDoWyboru } from '@/lib/types';
import { MapaWGranicy } from './MapaWGranicy';


/** "2026-11-08" as "sobota, 8 listopada 2026". */
function dzienSlownie(data: string) {
  const d = new Date(`${data}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? data
    : d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * The field log (`/dziennik`, `?gatunek=` for one species): every sighting,
 * the latest first, by day, and on request all their points on one map.
 */
export function DziennikView({ ptaki }: { ptaki: PtakDoWyboru[] }) {
  const { dziennik } = useDziennik();
  const [gatunek, setGatunek] = useState<string | null>(null);
  const [mapa, setMapa] = useState(false);
  useEffect(() => {
    // The page is prerendered without the address's query, so it can only be read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGatunek(new URLSearchParams(window.location.search).get('gatunek'));
  }, []);
  const poId = useMemo(() => new Map(ptaki.map((p) => [p.id, p])), [ptaki]);

  const lista = useMemo(() => (dziennik ? wpisy(dziennik, gatunek ?? undefined) : []), [dziennik, gatunek]);
  const dni = useMemo(() => {
    const m = new Map<string, [string, WpisDziennika][]>();
    for (const w of lista) m.set(w[1].data, [...(m.get(w[1].data) ?? []), w]);
    return [...m.entries()];
  }, [lista]);
  const punkty = useMemo(
    () =>
      lista.flatMap(([, w]) =>
        w.punkt ? [{ szer: w.punkt.szer, dl: w.punkt.dl, etykieta: `${poId.get(w.gatunek)?.pl ?? w.gatunek}, ${w.data}` }] : [],
      ),
    [lista, poId],
  );

  if (!dziennik) return <StateBlock state="loading" title="Wczytywanie dziennika" scope="section" />;
  const nazwaGatunku = gatunek ? (poId.get(gatunek)?.pl ?? gatunek) : null;

  return (
    <div className="stack">
      <div className="row">
        <ButtonLink href={gatunek ? `/dziennik/obserwacja?gatunek=${gatunek}` : '/dziennik/obserwacja'}>Dodaj obserwację</ButtonLink>
        {KIEDY_I_GDZIE && (
          <ButtonLink href="/kiedy-i-gdzie#co-tu" variant="secondary">
            Co tu zobaczę?
          </ButtonLink>
        )}
        {punkty.length > 0 && (
          <Button variant="secondary" aria-expanded={mapa} onClick={() => setMapa(!mapa)}>
            {mapa ? 'Ukryj mapę' : 'Pokaż na mapie'}
          </Button>
        )}
      </div>
      {nazwaGatunku && (
        <p>
          Tylko: <strong>{nazwaGatunku}</strong>.{' '}
          <Link href="/dziennik" className="text-link" onClick={() => setGatunek(null)}>
            Pokaż wszystkie obserwacje
          </Link>
        </p>
      )}
      {mapa && punkty.length > 0 && <MapaWGranicy etykieta="Mapa moich obserwacji" punkty={punkty} opisBledu="Pewnie nie ma zasięgu. Lista obserwacji poniżej działa bez mapy." />}

      {lista.length === 0 ? (
        <StateBlock
          state="empty"
          title={nazwaGatunku ? 'Brak obserwacji tego gatunku' : 'Dziennik jest jeszcze pusty'}
          description="Każda obserwacja zapisuje dzień, godzinę, liczbę ptaków i miejsce, z punktem z telefonu albo z mapy."
          action={<ButtonLink href="/dziennik/obserwacja" size="sm">Dodaj pierwszą obserwację</ButtonLink>}
          scope="section"
        />
      ) : (
        dni.map(([data, wpisyDnia]) => (
          <section key={data} className="dziennik__dzien" aria-labelledby={`dzien-${data}`}>
            <h2 id={`dzien-${data}`} className="checklist__naglowek">
              {dzienSlownie(data)}
            </h2>
            <ul className="dziennik__wpisy">
              {wpisyDnia.map(([id, w]) => {
                const ptak = poId.get(w.gatunek);
                return (
                  <li key={id} id={`wpis-${id}`} className="dziennik__wpis">
                    <p className="dziennik__gatunek">
                      {w.godzina && <span className="dziennik__godzina">{w.godzina}</span>}{' '}
                      <strong>{ptak ? <NazwaPtaka id={ptak.id} pl={ptak.pl} /> : w.gatunek}</strong>
                      {w.liczba && <span>, {w.liczba} {odmiana(w.liczba, ['ptak', 'ptaki', 'ptaków'])}</span>}
                      {ptak && (
                        <>
                          {' '}
                          <span className="muted" translate="no" lang="la">
                            {ptak.lat}
                          </span>
                        </>
                      )}
                    </p>
                    {(w.miejsce || w.punkt) && (
                      <p className="muted">
                        {w.miejsce}
                        {w.miejsce && w.punkt && ', '}
                        {w.punkt && (
                          <a href={adresMapy(w.punkt)} className="text-link" target="_blank" rel="noreferrer">
                            {punktSlownie(w.punkt)}
                            <span className="visually-hidden"> (mapa OpenStreetMap, otwiera się w nowej karcie)</span>
                          </a>
                        )}
                      </p>
                    )}
                    {w.notatka && <p className="dziennik__notatka">{w.notatka}</p>}
                    <p>
                      <Link href={`/dziennik/obserwacja?id=${id}`} className="text-link">
                        Edytuj<span className="visually-hidden">: {ptak?.pl ?? w.gatunek}, {w.data}</span>
                      </Link>
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
