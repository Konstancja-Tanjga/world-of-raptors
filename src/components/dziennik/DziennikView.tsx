'use client';

import { KIEDY_I_GDZIE } from '@/lib/publikacja';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { odmiana, punktSlownie, wizyty } from '@/lib/dziennik';
import { useDziennik, wpisy, type WpisDziennika } from '@/lib/dziennikMagazyn';
import { adresMapy } from '@/lib/punkty';
import { ButtonLink } from '../ButtonLink';
import { Button, StateBlock } from '../ds';
import { NazwaPtaka } from '../NazwaPtaka';
import { OwnPhotos } from '../OwnPhotos';
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
  const nowa = gatunek ? `/dziennik/obserwacja?gatunek=${gatunek}` : '/dziennik/obserwacja';
  const nazwaGatunku = gatunek ? (poId.get(gatunek)?.pl ?? gatunek) : null;

  return (
    <div className="stack">
      <div className="row">
        {/* The field tabs above offer a new sighting; filtered to a species, a new one of that species. */}
        {gatunek && lista.length > 0 && <ButtonLink href={nowa}>Dodaj obserwację tego gatunku</ButtonLink>}
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
          description="Pierwsza obserwacja gatunku odhacza go też na checkliście."
          // The field tabs above carry "Dodaj obserwację"; filtered to a species, the empty log offers that species.
          action={gatunek ? <ButtonLink href={nowa} size="sm">Dodaj pierwszą obserwację</ButtonLink> : undefined}
          scope="section"
        />
      ) : (
        dni.map(([data, wpisyDnia]) => (
          <section key={data} className="dziennik__dzien" aria-labelledby={`dzien-${data}`}>
            <h2 id={`dzien-${data}`} className="checklist__naglowek">
              {dzienSlownie(data)}
            </h2>
            <ul className="dziennik__wpisy">
              {wizyty(wpisyDnia).map((wizyta) => {
                const [, pierwszy] = wizyta[0];
                const gdzie = (pierwszy.miejsce || pierwszy.punkt) && (
                  <p className="muted">
                    {pierwszy.miejsce}
                    {pierwszy.miejsce && pierwszy.punkt && ', '}
                    {pierwszy.punkt && (
                      <a href={adresMapy(pierwszy.punkt)} className="text-link" target="_blank" rel="noreferrer">
                        {punktSlownie(pierwszy.punkt)}
                        <span className="visually-hidden"> (mapa OpenStreetMap, otwiera się w nowej karcie)</span>
                      </a>
                    )}
                  </p>
                );
                const gatunek = ([id, w]: [string, WpisDziennika], wWizycie: boolean) => {
                  const ptak = poId.get(w.gatunek);
                  return (
                    <>
                      <p className="dziennik__gatunek">
                        {!wWizycie && w.godzina && <span className="dziennik__godzina">{w.godzina}</span>}{' '}
                        <strong>{ptak ? <NazwaPtaka id={ptak.id} pl={ptak.pl} /> : w.gatunek}</strong>
                        {w.liczba && <span>, {w.liczba} {odmiana(w.liczba, ['ptak', 'ptaki', 'ptaków'])}</span>}
                        {ptak && (
                          <>
                            {' '}
                            <span className="muted" translate="no" lang="la">
                              {ptak.lat}
                            </span>
                          </>
                        )}{' '}
                        <Link href={`/dziennik/obserwacja?id=${id}`} className="text-link dziennik__edytuj">
                          Edytuj<span className="visually-hidden">: {ptak?.pl ?? w.gatunek}, {w.data}</span>
                        </Link>
                      </p>
                      <OwnPhotos gatunek={w.gatunek} nazwa={ptak?.pl ?? w.gatunek} wpis={id} tytul="Zdjęcia z obserwacji" />
                    </>
                  );
                };
                if (wizyta.length === 1) {
                  return (
                    <li key={wizyta[0][0]} id={`wpis-${wizyta[0][0]}`} className="dziennik__wpis">
                      {gatunek(wizyta[0], false)}
                      {gdzie}
                      {pierwszy.notatka && <p className="dziennik__notatka">{pierwszy.notatka}</p>}
                    </li>
                  );
                }
                return (
                  <li key={wizyta[0][0]} className="dziennik__wpis dziennik__wizyta">
                    <p className="dziennik__naglowek-wizyty">
                      {pierwszy.godzina && <span className="dziennik__godzina">{pierwszy.godzina}</span>}{' '}
                      <strong>
                        {pierwszy.miejsce || 'Wyjście'}: {wizyta.length} {odmiana(wizyta.length, ['gatunek', 'gatunki', 'gatunków'])}
                      </strong>
                    </p>
                    {pierwszy.punkt && !pierwszy.miejsce ? gdzie : pierwszy.punkt ? (
                      <p className="muted">
                        <a href={adresMapy(pierwszy.punkt)} className="text-link" target="_blank" rel="noreferrer">
                          {punktSlownie(pierwszy.punkt)}
                          <span className="visually-hidden"> (mapa OpenStreetMap, otwiera się w nowej karcie)</span>
                        </a>
                      </p>
                    ) : null}
                    {pierwszy.notatka && <p className="dziennik__notatka">{pierwszy.notatka}</p>}
                    <ul className="dziennik__gatunki-wizyty">
                      {wizyta.map((wpis) => (
                        <li key={wpis[0]} id={`wpis-${wpis[0]}`}>
                          {gatunek(wpis, true)}
                        </li>
                      ))}
                    </ul>
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
