'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BladLokalizacji, OPIS_BLEDU_LOKALIZACJI, pobierzPozycje } from '@/lib/lokalizacja';
import { utworzMagazyn } from '@/lib/magazyn';
import { aktywne, type MojeMiejsce } from '@/lib/mojeMiejsca';
import { useMojeMiejsca } from '@/lib/mojeMiejscaMagazyn';
import {
  adresGeokodowania,
  adresMapy,
  adresTrasy,
  miejscaZGeokodowania,
  MIESIACE,
  NAZWY_MIESIECY,
  najblizsze,
  naWiatr,
  OKOLICE,
  doSzukania,
  pasujeDoZapytania,
  poraPunktu,
  propozycje,
  wspolrzedneZTekstu,
  zakresMiesiecy,
  type PunktObserwacji,
  type PoraPunktu,
  type PunktOdMiejsca,
  type Wiatr,
  type ZnalezioneMiejsce,
} from '@/lib/punkty';
import { Accordion, AccordionItem, Badge, Button, Checkbox, DescriptionList, Input, Select, StateBlock } from './ds';
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

const BLAD_WYSZUKIWANIA = 'Nie udało się wyszukać miejsca';

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
        Najlepiej {zakresMiesiecy(p.szczyt)}
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

const PORA: Record<PoraPunktu, { etykieta: string; ton: 'success' | 'info' | 'neutral' }> = {
  szczyt: { etykieta: 'Teraz najlepszy czas', ton: 'success' },
  sezon: { etykieta: 'Teraz w sezonie', ton: 'info' },
  poza: { etykieta: 'Teraz poza sezonem', ton: 'neutral' },
};

/** "Kania czarna, trzmielojad, gadożer i 4 inne": the first birds, enough to tell points apart. */
function ptakiSkrotem(nazwy: string[]) {
  const pierwsze = nazwy.slice(0, 3).map((n, i) => (i === 0 ? n : n.toLocaleLowerCase('pl')));
  const reszta = nazwy.length - pierwsze.length;
  return reszta > 0 ? `${pierwsze.join(', ')} i ${reszta} ${reszta === 1 ? 'inny' : reszta < 5 ? 'inne' : 'innych'}` : pierwsze.join(', ');
}

/**
 * One point, short: what decides whether to go (how far, whether now is the
 * season, the months, the main birds) and the way there. The description,
 * time of day, directions, lesson and sources fold under "Szczegóły".
 */
function Punkt({ p, od, dane, miesiac }: { p: PunktObserwacji; od?: PunktOdMiejsca; dane: DanePunktow; miesiac: number | null }) {
  const lekcja = dane.lekcje[p.lekcja];
  const ptaki = p.gatunki.map((id) => ({ id, ...dane.ptaki[id] }));
  const pora = miesiac ? PORA[poraPunktu(p, miesiac)] : null;
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
          {pora && <Badge tone={pora.ton}>{pora.etykieta}</Badge>}
          {p.wiatr.map((w) => (
            <Badge key={w} tone="info">
              {w === 'lewant' ? 'Przy lewancie' : 'Przy poniente'}
            </Badge>
          ))}
        </div>
      </header>
      <Kalendarz p={p} />
      {ptaki.length > 0 && (
        <p className="punkt__ptaki">
          <span className="punkt__etykieta">Ptaki:</span> {ptakiSkrotem(ptaki.map((g) => g.pl))}
        </p>
      )}
      <p className="punkt__akcje">
        <a href={adresTrasy(p)} target="_blank" rel="noreferrer" className="text-link">
          Trasa dojazdu
          {NOWA_KARTA}
        </a>
        <a href={adresMapy(p)} target="_blank" rel="noreferrer" className="text-link">
          Mapa
          {NOWA_KARTA}
        </a>
      </p>
      <div className="punkt__szczegoly">
        <Accordion headingLevel={5}>
          <AccordionItem id={`szczegoly-${p.id}`} title={<>Szczegóły<span className="visually-hidden">: {p.nazwa}</span></>}>
            <div className="stack">
              <p className="punkt__opis">{p.opis}</p>
              <DescriptionList
                layout="rows"
                density="compact"
                items={[
                  { term: 'Rodzaj', value: p.rodzaj === 'przelot' ? 'Punkt przelotu' : 'Ptaki na miejscu' },
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
            </div>
          </AccordionItem>
        </Accordion>
      </div>
    </article>
  );
}

const DZIEN = new Intl.DateTimeFormat('pl', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const dzien = (data: string) => {
  const [r, m, d] = data.split('-').map(Number);
  return DZIEN.format(new Date(Date.UTC(r, m - 1, d)));
};

/** One of my places among the points: its name, first visit, note, and the way there. */
function MojPunkt({ id, m, od }: { id: string; m: MojeMiejsce; od?: { km: number; kierunek: string } }) {
  return (
    // data-prywatne: my place and note are mine, not the course's, so "Zgłoś poprawkę" cannot point at them.
    <article className="punkt" aria-labelledby={`moje-${id}`} data-prywatne>
      <header className="punkt__naglowek">
        <h4 id={`moje-${id}`} className="punkt__nazwa">
          {m.nazwa}
        </h4>
        {od && (
          <p className="punkt__odleglosc">
            {odlegloscSlownie(od.km)} {od.kierunek}
          </p>
        )}
        <div className="punkt__znaczniki">
          <Badge tone="success">Moje miejsce</Badge>
        </div>
      </header>
      <p className="punkt__kiedy">
        <span className="punkt__etykieta">Pierwsza wizyta:</span> {dzien(m.data)}
      </p>
      {m.notatka && <p className="punkt__opis">{m.notatka}</p>}
      <ul className="punkt__linki">
        <li>
          <a href={adresMapy(m)} target="_blank" rel="noreferrer" className="text-link">
            Mapa
            {NOWA_KARTA}
          </a>
        </li>
        <li>
          <a href={adresTrasy(m)} target="_blank" rel="noreferrer" className="text-link">
            Trasa dojazdu
            {NOWA_KARTA}
          </a>
        </li>
        <li>
          <Link href="/moje-miejsca" className="text-link">
            Ptaki, notatka i zmiany w Moich miejscach
          </Link>
        </li>
      </ul>
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
 * choose. My own places (mojeMiejsca) head the area view and join the
 * nearest-first list whatever the wind.
 */
export function PunktyObserwacji(dane: DanePunktow) {
  const zapis = zapamietane.useMagazyn();
  const { miejsca: mojeMiejsca } = useMojeMiejsca();
  const skad = zapis?.skad ?? null;
  const [tekst, setTekst] = useState('');
  const [szukanie, setSzukanie] = useState<Szukanie>({ stan: 'spokoj' });
  const [wiatr, setWiatr] = useState<Wiatr | null>(null);
  const [zapytanie, setZapytanie] = useState('');
  const [tylkoSezon, setTylkoSezon] = useState(false);
  const [innyStart, setInnyStart] = useState(false);
  // The month is the visitor's, read after mount: the page is prerendered once, at build time.
  const [miesiac, setMiesiac] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMiesiac(new Date().getMonth() + 1);
  }, []);

  const ustaw = (s: Skad | undefined) => zapamietane.zapisz({ skad: s });
  // Each search or location request gets a number; a newer request, or going back to areas, makes older answers stale.
  const zadanie = useRef(0);
  const przerwij = useRef<AbortController | null>(null);
  const nowe = () => {
    przerwij.current?.abort();
    przerwij.current = null;
    return ++zadanie.current;
  };
  useEffect(() => () => void nowe(), []);

  async function szukaj(e: FormEvent) {
    e.preventDefault();
    await szukajMiejsca(tekst);
  }

  /** Finds a place to count from: typed coordinates, or a name through Open-Meteo. True once a place is set. */
  async function szukajMiejsca(wpisane: string): Promise<boolean> {
    const zapytanie = wpisane.trim();
    if (!zapytanie) return false;
    const numer = nowe();
    const wsp = wspolrzedneZTekstu(zapytanie);
    if (wsp) {
      ustaw({ ...wsp, nazwa: zapytanie, opis: '', zrodlo: 'wpisane' });
      setSzukanie({ stan: 'spokoj' });
      return true;
    }
    setSzukanie({ stan: 'szukam' });
    const kontroler = new AbortController();
    przerwij.current = kontroler;
    let r: Response;
    try {
      r = await fetch(adresGeokodowania(zapytanie), { signal: kontroler.signal });
    } catch (err) {
      if (numer !== zadanie.current) return false;
      console.error('[punkty] geocoding request failed', err);
      setSzukanie({
        stan: 'blad',
        tytul: BLAD_WYSZUKIWANIA,
        opis: 'Wyszukiwanie po nazwie potrzebuje internetu. Sprawdź połączenie albo wpisz współrzędne, np. 36.01, -5.60.',
      });
      return false;
    }
    if (numer !== zadanie.current) return false;
    if (!r.ok) {
      setSzukanie({
        stan: 'blad',
        tytul: BLAD_WYSZUKIWANIA,
        opis: `Open-Meteo odpowiedziało błędem (HTTP ${r.status}). Zwykle to chwilowe: spróbuj za kilka minut albo wpisz współrzędne.`,
      });
      return false;
    }
    let miejsca: ZnalezioneMiejsce[];
    try {
      miejsca = miejscaZGeokodowania(await r.json());
    } catch (err) {
      if (numer !== zadanie.current) return false;
      console.error('[punkty] geocoding answer unreadable', err);
      setSzukanie({
        stan: 'blad',
        tytul: BLAD_WYSZUKIWANIA,
        opis: 'Wyszukiwarka odpowiedziała czymś, czego nie da się odczytać. Spróbuj później albo wpisz współrzędne.',
      });
      return false;
    }
    if (numer !== zadanie.current) return false;
    przerwij.current = null;
    if (!miejsca.length) {
      setSzukanie({ stan: 'brak', zapytanie });
      return false;
    }
    ustaw({ ...miejsca[0], zrodlo: 'wpisane' });
    setSzukanie(miejsca.length > 1 ? { stan: 'wybor', miejsca } : { stan: 'spokoj' });
    return true;
  }


  function lokalizuj() {
    const numer = nowe();
    setSzukanie({ stan: 'lokalizuje' });
    pobierzPozycje().then(
      (pos) => {
        if (numer !== zadanie.current) return;
        ustaw({ nazwa: 'Twoja lokalizacja', opis: '', szer: pos.szer, dl: pos.dl, zrodlo: 'lokalizacja' });
        setSzukanie({ stan: 'spokoj' });
      },
      (err: unknown) => {
        if (numer !== zadanie.current) return;
        const powod = err instanceof BladLokalizacji ? err.powod : 'czas';
        setSzukanie({
          stan: 'blad',
          tytul: powod === 'brak' ? 'Ta przeglądarka nie podaje lokalizacji' : 'Nie udało się ustalić lokalizacji',
          opis: `${OPIS_BLEDU_LOKALIZACJI[powod]} Możesz też wpisać miejscowość.`,
        });
      },
    );
  }

  const nazwyPtakow = (p: PunktObserwacji) => p.gatunki.map((id) => dane.ptaki[id]?.pl ?? id);
  // Wind and search first: the suggestions take their own season rule; the season box narrows the rest.
  const dopasowane = dane.punkty.filter((p) => naWiatr(p, wiatr) && pasujeDoZapytania(p, zapytanie, nazwyPtakow(p)));
  const widoczne = dopasowane.filter((p) => !tylkoSezon || !miesiac || poraPunktu(p, miesiac) !== 'poza');
  const szukane = doSzukania(zapytanie);
  const moje = mojeMiejsca
    ? aktywne(mojeMiejsca)
        .map(([id, m]) => ({ ...m, id }))
        .filter((m) => !szukane || doSzukania(`${m.nazwa} ${m.notatka ?? ''}`).includes(szukane))
    : [];
  const proponowane = skad && miesiac ? propozycje(dopasowane, skad, miesiac) : [];
  const proponowaneId = new Set(proponowane.map((o) => o.punkt.id));
  // My places and the course's points in one list, nearest first; my places whatever the wind.
  // The far-away note is about the course's points, not about my places.
  const najblizszyKursu = skad ? najblizsze(widoczne, skad)[0] : undefined;
  const wOdleglosci = skad
    ? [
        ...najblizsze(widoczne.filter((p) => !proponowaneId.has(p.id)), skad).map((o) => ({ ...o, moje: null })),
        ...najblizsze(moje, skad).map((o) => ({ ...o, moje: o.punkt })),
      ].sort((a, b) => a.km - b.km)
    : null;
  const zajety = szukanie.stan === 'szukam' || szukanie.stan === 'lokalizuje';

  return (
    <div className="stack">
      <div className="punkty__szukaj" role="search" aria-label="Punkty obserwacji">
        <Input
          label="Szukaj punktu"
          description="Nazwa, okolica albo ptak"
          type="search"
          value={zapytanie}
          onChange={(e) => setZapytanie(e.target.value)}
        />
        <div className="punkty__przyciski">
          <Button type="button" onClick={lokalizuj} loading={szukanie.stan === 'lokalizuje'} loadingLabel="Ustalam lokalizację" disabled={zajety}>
            Najbliżej mnie
          </Button>
          <Button type="button" variant="secondary" aria-expanded={innyStart} onClick={() => setInnyStart(!innyStart)}>
            Inne miejsce startu
          </Button>
        </div>
        {innyStart && (
          <form className="punkty__start" onSubmit={szukaj} aria-label="Miejsce startu">
            <Input
              label="Skąd jedziesz"
              description="Miejscowość albo współrzędne, np. Vejer de la Frontera albo 36.01, -5.60"
              type="search"
              value={tekst}
              onChange={(e) => setTekst(e.target.value)}
            />
            <Button type="submit" variant="secondary" loading={szukanie.stan === 'szukam'} loadingLabel="Szukam miejsca" disabled={zajety}>
              Pokaż najbliższe
            </Button>
          </form>
        )}
        <div className="punkty__opcje">
          <Select
            label="Wiatr w cieśninie"
            description="Lewant: bliżej Tarify. Poniente: bliżej Algeciras."
            value={wiatr ?? ''}
            onChange={(e) => setWiatr((e.target.value || null) as Wiatr | null)}
            options={OPCJE_WIATRU}
          />
          {miesiac && (
            <Checkbox
              label={`Tylko w sezonie teraz (${NAZWY_MIESIECY[miesiac - 1]})`}
              checked={tylkoSezon}
              onChange={(e) => setTylkoSezon(e.target.checked)}
            />
          )}
        </div>
      </div>

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
          onChange={(e) => {
            nowe();
            ustaw({ ...szukanie.miejsca[Number(e.target.value)], zrodlo: 'wpisane' });
          }}
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
              nowe();
              ustaw(undefined);
              setSzukanie({ stan: 'spokoj' });
            }}
          >
            Pokaż według okolic
          </Button>
        </div>
      )}

      {zapis === null || mojeMiejsca === null ? (
        <StateBlock state="loading" title="Wczytywanie punktów" scope="section" />
      ) : dopasowane.length === 0 && moje.length === 0 && zapytanie.trim() ? (
        <StateBlock
          state="empty"
          title={`Żaden punkt nie pasuje do „${zapytanie.trim()}”`}
          description="Szukam w nazwach, okolicach i ptakach punktów. Jeśli to miejscowość, mogę ułożyć punkty od niej."
          action={
            <div className="punkty__przyciski">
              <Button size="sm" onClick={() =>
                  // The town was the search's text: once it is the start, the text must stop filtering the points out.
                  void szukajMiejsca(zapytanie).then((ok) => ok && setZapytanie(''))
                }
                disabled={zajety}
              >
                Punkty najbliżej: {zapytanie.trim()}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setZapytanie('')}>
                Wyczyść wyszukiwanie
              </Button>
            </div>
          }
          scope="section"
        />
      ) : widoczne.length === 0 && proponowane.length === 0 ? (
        <StateBlock
          state="empty"
          title="Żaden punkt nie pasuje do tych filtrów"
          description={
            tylkoSezon && miesiac
              ? `W tym miesiącu sezon ma niewiele punktów${wiatr ? ', a wybrany wiatr zawęża je jeszcze bardziej' : ''}.`
              : 'Wybrany wiatr nie wskazuje żadnego z tych punktów.'
          }
          action={
            <div className="punkty__przyciski">
              {tylkoSezon && (
                <Button size="sm" variant="secondary" onClick={() => setTylkoSezon(false)}>
                  Pokaż też poza sezonem
                </Button>
              )}
              {wiatr && (
                <Button size="sm" variant="secondary" onClick={() => setWiatr(null)}>
                  Bez wyboru wiatru
                </Button>
              )}
            </div>
          }
          scope="section"
        />
      ) : wOdleglosci ? (
        <>
          {miesiac && (
            <section className="stack punkty__propozycje" aria-labelledby="punkty-propozycje">
              <h3 id="punkty-propozycje" className="checklist__naglowek">
                Propozycje na {NAZWY_MIESIECY[miesiac - 1]}
              </h3>
              {proponowane.length ? (
                <>
                  <ol className="punkty__lista">
                    {proponowane.map((o) => (
                      <li key={o.punkt.id}>
                        <Punkt p={o.punkt} od={o} dane={dane} miesiac={miesiac} />
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <p className="muted">W tym miesiącu żaden z tych punktów nie jest w sezonie. Poniżej wszystkie, od najbliższego.</p>
              )}
            </section>
          )}
        <section className="stack" aria-labelledby="punkty-najblizsze">
          <h3 id="punkty-najblizsze" className="checklist__naglowek">
            {proponowane.length ? 'Pozostałe od najbliższego' : 'Od najbliższego'}
          </h3>
          {najblizszyKursu && najblizszyKursu.km > DALEKO_KM && (
            <p className="muted">
              Najbliższy punkt z kursu jest {odlegloscSlownie(najblizszyKursu.km)} stąd. Na razie są tu punkty z okolic Cieśniny
              Gibraltarskiej, La Jandy i Barbate oraz kilka miejsc w Polsce.
            </p>
          )}
          <ol className="punkty__lista">
            {wOdleglosci.map((o) =>
              o.moje ? (
                <li key={`moje-${o.moje.id}`}>
                  <MojPunkt id={o.moje.id} m={o.moje} od={o} />
                </li>
              ) : (
                <li key={o.punkt.id}>
                  <Punkt p={o.punkt as PunktObserwacji} od={o as PunktOdMiejsca} dane={dane} miesiac={miesiac} />
                </li>
              ),
            )}
          </ol>
        </section>
        </>
      ) : (
        <>
          <section className="stack" aria-labelledby="okolica-moje">
            <h3 id="okolica-moje" className="checklist__naglowek">
              Moje miejsca
            </h3>
            {moje.length === 0 && szukane ? (
              <p className="muted">Żadne z moich miejsc nie pasuje do wyszukiwania.</p>
            ) : moje.length === 0 ? (
              <p className="muted">
                Tu pojawią się miejsca, które dodam w terenie:{' '}
                <Link href="/moje-miejsca" className="text-link">
                  Dodaj miejsce, w którym jestem
                </Link>
                .
              </p>
            ) : (
              <ul className="punkty__lista">
                {moje.map((m) => (
                  <li key={m.id}>
                    <MojPunkt id={m.id} m={m} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          {OKOLICE.map((o) => {
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
                      <Punkt p={p} dane={dane} miesiac={miesiac} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}

      <p className="muted planer__uwaga">
        Nazwę miejsca wyszukuje{' '}
        <a href="https://open-meteo.com/en/docs/geocoding-api" target="_blank" rel="noreferrer" className="text-link">
          Open-Meteo
          {NOWA_KARTA}
        </a>{' '}
        (GeoNames, CC BY 4.0), więc trafia ona do ich serwera; lokalizacja zostaje w przeglądarce. Punkty przelotu opisuję za{' '}
        <a
          href="https://www.andaluciabirdsociety.org/article-library/birding-sites/migration-watching-sites/"
          target="_blank"
          rel="noreferrer"
          className="text-link"
        >
          Andalucia Bird Society
          {NOWA_KARTA}
        </a>
        , źródła są przy każdym punkcie. Dojazd sprawdź na miejscu.
      </p>
    </div>
  );
}
