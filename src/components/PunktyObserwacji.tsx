'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { utworzMagazyn } from '@/lib/magazyn';
import {
  adresGeokodowania,
  adresMapy,
  adresTrasy,
  miejscaZGeokodowania,
  MIESIACE,
  NAZWY_MIESIECY,
  najblizsze,
  naWiatr,
  NiepelnaOdpowiedz,
  OKOLICE,
  wspolrzedneZTekstu,
  zakresMiesiecy,
  type PunktObserwacji,
  type PunktOdMiejsca,
  type Wiatr,
  type ZnalezioneMiejsce,
} from '@/lib/punkty';
import { Badge, Button, DescriptionList, Input, Select, StateBlock } from './ds';
import { wybierzMiejscePlanera } from './PlanerWyjazdu';

/** A bird a point lists, as the page links it. */
export type PtakPunktu = { pl: string; href: string };
/** What the page needs beyond the points: the birds' names and the lessons' titles. */
export type DanePunktow = {
  punkty: PunktObserwacji[];
  ptaki: Record<string, PtakPunktu>;
  lekcje: Record<string, { href: string; tytul: string }>;
};

/** The place distances are counted from: typed and found, or the browser's location. */
type Skad = ZnalezioneMiejsce & { zrodlo: 'wpisane' | 'lokalizacja' };
type Zapis = { skad?: Skad };
function isZapis(v: unknown): v is Zapis {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const s = (v as Zapis).skad;
  return (
    s === undefined ||
    (typeof s === 'object' &&
      s !== null &&
      typeof s.nazwa === 'string' &&
      typeof s.opis === 'string' &&
      typeof s.szer === 'number' &&
      typeof s.dl === 'number' &&
      (s.zrodlo === 'wpisane' || s.zrodlo === 'lokalizacja'))
  );
}
/** The place last chosen: a convenience, not in backups (a refused save keeps it for this visit only). */
const zapamietane = utworzMagazyn<Zapis>('wor:punkty:v1', isZapis);

/** Past this, the nearest point is far enough to say the list does not cover the area yet. */
const DALEKO_KM = 150;

type Szukanie =
  | { stan: 'spokoj' }
  | { stan: 'szukam' }
  | { stan: 'lokalizuje' }
  | { stan: 'wybor'; miejsca: ZnalezioneMiejsce[] }
  | { stan: 'brak'; zapytanie: string }
  | { stan: 'blad'; tytul: string; opis: string };

const KM = new Intl.NumberFormat('pl', { maximumFractionDigits: 0 });
const odlegloscSlownie = (km: number) => (km < 1 ? 'mniej niż 1 km' : `${KM.format(km)} km`);

const OPCJE_WIATRU = [
  { value: '', label: 'Nie wybieram' },
  { value: 'lewant', label: 'Lewant (ze wschodu)' },
  { value: 'poniente', label: 'Poniente (z zachodu)' },
];

const NOWA_KARTA = <span className="visually-hidden">, otwiera się w nowej karcie</span>;

function Kalendarz({ p }: { p: PunktObserwacji }) {
  const id = `kalendarz-${p.id}`;
  return (
    <div className="punkt__kalendarz">
      <p className="punkt__kiedy" id={id}>
        <span className="punkt__etykieta">Kiedy jechać:</span> najlepiej {zakresMiesiecy(p.szczyt)}
        {p.szczyt.length < p.miesiace.length ? `, warto ${zakresMiesiecy(p.miesiace)}` : ''}
      </p>
      {/* The sentence above says it in words; the strip shows the same months at a glance. */}
      <ol className="miesiace" aria-hidden="true">
        {MIESIACE.map((m, i) => {
          const stan = p.szczyt.includes(i + 1) ? 'szczyt' : p.miesiace.includes(i + 1) ? 'sezon' : 'poza';
          return (
            <li key={m} className={`miesiace__m miesiace__m--${stan}`} title={NAZWY_MIESIECY[i]}>
              {m}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Punkt({ p, od, dane }: { p: PunktObserwacji; od?: PunktOdMiejsca; dane: DanePunktow }) {
  const lekcja = dane.lekcje[p.lekcja];
  const ptaki = p.gatunki.map((id) => ({ id, ...dane.ptaki[id] }));
  return (
    <article className="punkt" aria-labelledby={`punkt-${p.id}`}>
      <header className="punkt__naglowek">
        <h4 id={`punkt-${p.id}`} className="punkt__nazwa">
          {p.nazwa}
        </h4>
        {od && (
          <p className="punkt__odleglosc">
            {odlegloscSlownie(od.km)} {od.kierunek}
          </p>
        )}
        <div className="punkt__znaczniki">
          <Badge tone="neutral">{p.rodzaj === 'przelot' ? 'Punkt przelotu' : 'Ptaki osiadłe i zimujące'}</Badge>
          {p.wiatr.map((w) => (
            <Badge key={w} tone="info">
              {w === 'lewant' ? 'Najlepiej przy lewancie' : 'Najlepiej przy poniente'}
            </Badge>
          ))}
        </div>
      </header>
      <p className="punkt__opis">{p.opis}</p>
      <Kalendarz p={p} />
      <DescriptionList
        layout="rows"
        density="compact"
        ariaLabel={`${p.nazwa}: szczegóły`}
        items={[
          { term: 'Pora dnia', value: p.pora_dnia },
          {
            term: 'Ptaki',
            value: (
              <>
                {ptaki.map((g, i) => (
                  <span key={g.id}>
                    {i > 0 && ', '}
                    <Link href={g.href} className="text-link">
                      {g.pl}
                    </Link>
                  </span>
                ))}
                {p.inne_ptaki && `; także ${p.inne_ptaki}`}
              </>
            ),
          },
          {
            term: 'Dojazd',
            value: (
              <>
                {p.dojazd}
                {p.wysokosc_m !== undefined && ` Wysokość ok. ${p.wysokosc_m} m n.p.m.`}
                {p.przyblizone && ' Współrzędne pokazują okolicę, nie dokładny punkt.'}
              </>
            ),
          },
          {
            term: 'Więcej',
            value: (
              <ul className="punkt__linki">
                <li>
                  <a href={adresMapy(p)} target="_blank" rel="noreferrer" className="text-link">
                    Mapa
                    {NOWA_KARTA}
                  </a>
                </li>
                <li>
                  <a href={adresTrasy(p)} target="_blank" rel="noreferrer" className="text-link">
                    Trasa dojazdu
                    {NOWA_KARTA}
                  </a>
                </li>
                {lekcja && (
                  <li>
                    Lekcja:{' '}
                    <Link href={lekcja.href} className="text-link">
                      {lekcja.tytul}
                    </Link>
                  </li>
                )}
                {p.planer && (
                  <li>
                    <a href="#kiedy" className="text-link" onClick={() => wybierzMiejscePlanera(p.planer!)}>
                      Najbliższe dobre godziny w planerze
                    </a>
                  </li>
                )}
                {p.zrodla.map((z) => (
                  <li key={z.url}>
                    Źródło:{' '}
                    <a href={z.url} target="_blank" rel="noreferrer" className="text-link">
                      {z.nazwa}
                      {NOWA_KARTA}
                    </a>
                  </li>
                ))}
              </ul>
            ),
          },
        ]}
      />
    </article>
  );
}

/**
 * "Gdzie stanąć" on "Kiedy i gdzie": every point from content/punkty-obserwacji.json, by
 * area, or, once a place is given, from the nearest to the farthest. A place
 * is found by name through Open-Meteo's geocoding, taken as typed
 * coordinates, or read from the browser's location (which stays in the
 * browser: distances are counted here). The wind filter keeps the points a
 * Levante or a Poniente makes the place to be, and those the wind does not
 * choose.
 */
export function PunktyObserwacji(dane: DanePunktow) {
  const zapis = zapamietane.useMagazyn();
  const skad = zapis?.skad ?? null;
  const [tekst, setTekst] = useState('');
  const [szukanie, setSzukanie] = useState<Szukanie>({ stan: 'spokoj' });
  const [wiatr, setWiatr] = useState<Wiatr | null>(null);

  const ustaw = (s: Skad | undefined) => zapamietane.zapisz({ skad: s });

  async function szukaj(e: FormEvent) {
    e.preventDefault();
    const zapytanie = tekst.trim();
    if (!zapytanie) return;
    const wsp = wspolrzedneZTekstu(zapytanie);
    if (wsp) {
      ustaw({ ...wsp, nazwa: zapytanie, opis: '', zrodlo: 'wpisane' });
      setSzukanie({ stan: 'spokoj' });
      return;
    }
    setSzukanie({ stan: 'szukam' });
    try {
      const r = await fetch(adresGeokodowania(zapytanie));
      if (!r.ok) {
        setSzukanie({
          stan: 'blad',
          tytul: 'Nie udało się wyszukać miejsca',
          opis: `Open-Meteo odpowiedziało błędem (HTTP ${r.status}). Zwykle to chwilowe: spróbuj za kilka minut albo wpisz współrzędne.`,
        });
        return;
      }
      const miejsca = miejscaZGeokodowania(await r.json());
      if (!miejsca.length) {
        setSzukanie({ stan: 'brak', zapytanie });
        return;
      }
      ustaw({ ...miejsca[0], zrodlo: 'wpisane' });
      setSzukanie(miejsca.length > 1 ? { stan: 'wybor', miejsca } : { stan: 'spokoj' });
    } catch (err) {
      console.error('[punkty] geocoding failed', err);
      setSzukanie(
        err instanceof NiepelnaOdpowiedz || err instanceof SyntaxError
          ? { stan: 'blad', tytul: 'Nie udało się wyszukać miejsca', opis: 'Wyszukiwarka odpowiedziała czymś, czego nie umiem odczytać. Spróbuj później albo wpisz współrzędne.' }
          : { stan: 'blad', tytul: 'Nie udało się wyszukać miejsca', opis: 'Wyszukiwanie po nazwie potrzebuje internetu. Sprawdź połączenie albo wpisz współrzędne, np. 36.01, -5.60.' },
      );
    }
  }

  function lokalizuj() {
    if (!('geolocation' in navigator)) {
      setSzukanie({ stan: 'blad', tytul: 'Ta przeglądarka nie podaje lokalizacji', opis: 'Wpisz miejscowość albo współrzędne.' });
      return;
    }
    setSzukanie({ stan: 'lokalizuje' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        ustaw({ nazwa: 'Twoja lokalizacja', opis: '', szer: pos.coords.latitude, dl: pos.coords.longitude, zrodlo: 'lokalizacja' });
        setSzukanie({ stan: 'spokoj' });
      },
      (err) => {
        setSzukanie({
          stan: 'blad',
          tytul: 'Nie udało się ustalić lokalizacji',
          opis:
            err.code === err.PERMISSION_DENIED
              ? 'Przeglądarka nie dała dostępu do lokalizacji. Możesz na to pozwolić w ustawieniach strony albo wpisać miejscowość.'
              : 'Przeglądarka nie zdążyła ustalić, gdzie jesteś. Spróbuj jeszcze raz albo wpisz miejscowość.',
        });
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
    );
  }

  const widoczne = dane.punkty.filter((p) => naWiatr(p, wiatr));
  const wOdleglosci = skad ? najblizsze(widoczne, skad) : null;
  const zajety = szukanie.stan === 'szukam' || szukanie.stan === 'lokalizuje';

  return (
    <div className="stack">
      <form className="punkty__szukaj" onSubmit={szukaj} role="search" aria-label="Najbliższe punkty">
        <Input
          label="Skąd jedziesz"
          description="Miejscowość albo współrzędne, np. Tarifa, Vejer de la Frontera albo 36.01, -5.60"
          type="search"
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
        />
        <div className="punkty__przyciski">
          <Button type="submit" loading={szukanie.stan === 'szukam'} loadingLabel="Szukam miejsca" disabled={zajety}>
            Pokaż najbliższe
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={lokalizuj}
            loading={szukanie.stan === 'lokalizuje'}
            loadingLabel="Ustalam lokalizację"
            disabled={zajety}
          >
            Użyj mojej lokalizacji
          </Button>
        </div>
      </form>

      {szukanie.stan === 'blad' ? (
        <StateBlock state="error" title={szukanie.tytul} description={szukanie.opis} scope="section" />
      ) : szukanie.stan === 'brak' ? (
        <StateBlock
          state="empty"
          title={`Brak miejsca „${szukanie.zapytanie}”`}
          description="Sprawdź pisownię, wpisz większą miejscowość w pobliżu albo współrzędne."
          scope="section"
        />
      ) : null}

      {szukanie.stan === 'wybor' && skad && (
        <Select
          label="Które miejsce?"
          description="Znalazło się kilka miejsc o tej nazwie"
          value={String(szukanie.miejsca.findIndex((m) => m.szer === skad.szer && m.dl === skad.dl))}
          onChange={(e) => ustaw({ ...szukanie.miejsca[Number(e.target.value)], zrodlo: 'wpisane' })}
          options={szukanie.miejsca.map((m, i) => ({ value: String(i), label: m.opis ? `${m.nazwa} (${m.opis})` : m.nazwa }))}
        />
      )}

      {skad && (
        <div className="punkty__skad">
          <p>
            Odległości w linii prostej od: <strong>{skad.nazwa}</strong>
            {skad.opis && ` (${skad.opis})`}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              ustaw(undefined);
              setSzukanie({ stan: 'spokoj' });
            }}
          >
            Pokaż według okolic
          </Button>
        </div>
      )}

      <div className="punkty__wiatr">
        <Select
          label="Jaki wiatr wieje w cieśninie?"
          description="Lewant przesuwa przelot na zachód, w stronę Tarify; poniente na wschód, w stronę Algeciras i Gibraltaru. Punkty, których wiatr nie wybiera, zostają na liście."
          value={wiatr ?? ''}
          onChange={(e) => setWiatr((e.target.value || null) as Wiatr | null)}
          options={OPCJE_WIATRU}
        />
      </div>

      {zapis === null ? (
        <StateBlock state="loading" title="Wczytywanie punktów" scope="section" />
      ) : wOdleglosci ? (
        <section className="stack" aria-labelledby="punkty-najblizsze">
          <h3 id="punkty-najblizsze" className="checklist__naglowek">
            Od najbliższego
          </h3>
          {wOdleglosci[0] && wOdleglosci[0].km > DALEKO_KM && (
            <p className="muted">
              Najbliższy punkt jest {odlegloscSlownie(wOdleglosci[0].km)} stąd. Na razie są tu punkty z okolic Cieśniny
              Gibraltarskiej, La Jandy i kilka miejsc w Polsce.
            </p>
          )}
          <ol className="punkty__lista">
            {wOdleglosci.map((o) => (
              <li key={o.punkt.id}>
                <Punkt p={o.punkt} od={o} dane={dane} />
              </li>
            ))}
          </ol>
        </section>
      ) : (
        OKOLICE.map((o) => {
          const wOkolicy = widoczne.filter((p) => p.okolica === o.value);
          if (!wOkolicy.length) return null;
          return (
            <section key={o.value} className="stack" aria-labelledby={`okolica-${o.value}`}>
              <h3 id={`okolica-${o.value}`} className="checklist__naglowek">
                {o.label}
              </h3>
              <ul className="punkty__lista">
                {wOkolicy.map((p) => (
                  <li key={p.id}>
                    <Punkt p={p} dane={dane} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}

      <p className="muted planer__uwaga">
        Wyszukiwanie miejsc po nazwie:{' '}
        <a href="https://open-meteo.com/en/docs/geocoding-api" target="_blank" rel="noreferrer" className="text-link">
          Open-Meteo
          {NOWA_KARTA}
        </a>{' '}
        (dane GeoNames, CC BY 4.0); wpisana nazwa trafia do ich serwera. Twoja lokalizacja zostaje w przeglądarce: odległości
        liczę tutaj. Punkty przelotu w cieśninie opisuję za{' '}
        <a
          href="https://www.andaluciabirdsociety.org/article-library/birding-sites/migration-watching-sites/"
          target="_blank"
          rel="noreferrer"
          className="text-link"
        >
          Andalucia Bird Society
          {NOWA_KARTA}
        </a>
        ; zanim pojedziesz, sprawdź dojazd na miejscu, bo drogi i tablice się zmieniają.
      </p>
    </div>
  );
}
