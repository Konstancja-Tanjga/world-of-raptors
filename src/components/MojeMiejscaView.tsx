'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { dzisiaj, useChecklista } from '@/lib/checklist';
import { BladLokalizacji, OPIS_BLEDU_LOKALIZACJI, pobierzPozycje, type Pozycja } from '@/lib/lokalizacja';
import { aktywne, bladMiejsca, ptakiWMiejscu, type DaneMiejsca, type MojeMiejsce } from '@/lib/mojeMiejsca';
import { noweIdMiejsca, useMojeMiejsca } from '@/lib/mojeMiejscaMagazyn';
import { adresMapy, adresTrasy, najblizsze, type Wspolrzedne } from '@/lib/punkty';
import { Button, DatePicker, Dialog, Input, StateBlock, Textarea } from './ds';
import { NazwaPtaka } from './NazwaPtaka';
import { useOstrzezenieZapisu } from './useOstrzezenieZapisu';

/** A bird as a place's list links it. */
export type PtakMiejsca = { pl: string; href: string };
/** A course point, to suggest its name for a place added beside it. */
export type PunktKursu = Wspolrzedne & { nazwa: string };

/** A course point this close is what the owner is most likely standing at. */
const PODPOWIEDZ_KM = 3;

const DZIEN = new Intl.DateTimeFormat('pl', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const dzien = (data: string) => {
  const [r, m, d] = data.split('-').map(Number);
  return DZIEN.format(new Date(Date.UTC(r, m - 1, d)));
};

const NOWA_KARTA = <span className="visually-hidden">, otwiera się w nowej karcie</span>;

/** A place's fields while they are being filled in. */
type Szkic = { nazwa: string; data: string; notatka: string; pozycja: Wspolrzedne & { dokladnosc?: number } };

function Dokladnosc({ m }: { m: { dokladnosc?: number } }) {
  if (m.dokladnosc === undefined) return null;
  return <>Położenie z dokładnością ok. {Math.max(1, Math.round(m.dokladnosc))} m.</>;
}

/** The form for a new place or a change to one: name, date of the first visit, note, and its position. */
function Formularz({
  szkic,
  setSzkic,
  blad,
  onZapisz,
  onAnuluj,
  onNowaPozycja,
  pozycjaWToku,
  tytul,
}: {
  szkic: Szkic;
  setSzkic: (s: Szkic) => void;
  blad: string | null;
  onZapisz: () => void;
  onAnuluj: () => void;
  onNowaPozycja?: () => void;
  pozycjaWToku?: boolean;
  tytul: string;
}) {
  const wyslij = (e: FormEvent) => {
    e.preventDefault();
    onZapisz();
  };
  return (
    <form className="miejsca__formularz" onSubmit={wyslij} aria-label={tytul}>
      <Input
        label="Nazwa miejsca"
        value={szkic.nazwa}
        maxLength={80}
        required
        error={blad ?? undefined}
        onChange={(e) => setSzkic({ ...szkic, nazwa: e.target.value })}
      />
      <DatePicker
        label="Pierwsza wizyta"
        description="Dzień, w którym byłam tu pierwszy raz."
        max={dzisiaj()}
        value={szkic.data}
        onChange={(e) => setSzkic({ ...szkic, data: e.target.value })}
      />
      <Textarea
        label="Notatka"
        description="Np. skąd najlepiej patrzeć, gdzie zaparkować."
        rows={3}
        maxLength={2000}
        value={szkic.notatka}
        onChange={(e) => setSzkic({ ...szkic, notatka: e.target.value })}
      />
      <p className="muted miejsca__pozycja">
        <Dokladnosc m={szkic.pozycja} />{' '}
        <a href={adresMapy(szkic.pozycja)} target="_blank" rel="noreferrer" className="text-link">
          Zobacz na mapie
          {NOWA_KARTA}
        </a>
      </p>
      <div className="miejsca__przyciski">
        <Button type="submit">Zapisz miejsce</Button>
        {onNowaPozycja && (
          <Button type="button" variant="secondary" onClick={onNowaPozycja} loading={pozycjaWToku} loadingLabel="Ustalam lokalizację">
            Ustaw położenie tutaj
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onAnuluj}>
          Anuluj
        </Button>
      </div>
    </form>
  );
}

function Miejsce({
  id,
  m,
  ptaki,
  wszystkiePtaki,
  onEdytuj,
  onUsun,
}: {
  id: string;
  m: MojeMiejsce;
  ptaki: string[];
  wszystkiePtaki: Record<string, PtakMiejsca>;
  onEdytuj: () => void;
  onUsun: () => void;
}) {
  return (
    <article className="punkt" aria-labelledby={`miejsce-${id}`}>
      <header className="punkt__naglowek">
        <h3 id={`miejsce-${id}`} className="punkt__nazwa">
          {m.nazwa}
        </h3>
        <p className="punkt__odleglosc">Pierwsza wizyta: {dzien(m.data)}</p>
      </header>
      {m.notatka && <p className="punkt__opis">{m.notatka}</p>}
      <div className="miejsca__ptaki">
        <p className="punkt__etykieta">Ptaki widziane tutaj</p>
        {ptaki.length ? (
          <p>
            {ptaki.map((p, i) => (
              <span key={p}>
                {i > 0 && ', '}
                {wszystkiePtaki[p] ? (
                  <Link href={wszystkiePtaki[p].href} className="text-link">
                    <NazwaPtaka id={p} pl={wszystkiePtaki[p].pl} />
                  </Link>
                ) : (
                  p
                )}
              </span>
            ))}
          </p>
        ) : (
          <p className="muted">
            Na razie żadne. Przy obserwacji w{' '}
            <Link href="/checklista" className="text-link">
              checkliście
            </Link>{' '}
            wybierz to miejsce albo kliknij „Tu, gdzie jestem”, a ptak pojawi się tutaj.
          </p>
        )}
      </div>
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
      </ul>
      <div className="miejsca__przyciski">
        <Button size="sm" variant="secondary" onClick={onEdytuj}>
          Edytuj<span className="visually-hidden">: {m.nazwa}</span>
        </Button>
        <Button size="sm" variant="ghost" tone="critical" onClick={onUsun}>
          Usuń<span className="visually-hidden">: {m.nazwa}</span>
        </Button>
      </div>
    </article>
  );
}

type Dodawanie = { stan: 'nic' } | { stan: 'lokalizuje' } | { stan: 'blad'; opis: string } | { stan: 'formularz'; szkic: Szkic };

/**
 * "Moje miejsca": the places where I watch birds, added where I stand (the
 * phone's position, a name, the date of the first visit, a note), with the
 * birds my checklist records there. Rules in lib/mojeMiejsca.ts; with an
 * account they sync like the checklist.
 */
export function MojeMiejscaView({ ptaki, punkty }: { ptaki: Record<string, PtakMiejsca>; punkty: PunktKursu[] }) {
  const { miejsca, zapisz, usun } = useMojeMiejsca();
  const { lista } = useChecklista();
  const sprawdzZapis = useOstrzezenieZapisu();
  const [dodawanie, setDodawanie] = useState<Dodawanie>({ stan: 'nic' });
  const [blad, setBlad] = useState<string | null>(null);
  const [edycja, setEdycja] = useState<{ id: string; szkic: Szkic } | null>(null);
  const [nowaPozycja, setNowaPozycja] = useState(false);
  const [doUsuniecia, setDoUsuniecia] = useState<string | null>(null);

  /** A name to start from: the course point I am standing at, if one is near. */
  const podpowiedz = (p: Pozycja) => {
    const [najblizszy] = najblizsze(punkty, p);
    return najblizszy && najblizszy.km <= PODPOWIEDZ_KM ? najblizszy.punkt.nazwa : '';
  };

  const dodaj = async () => {
    setBlad(null);
    setDodawanie({ stan: 'lokalizuje' });
    try {
      const p = await pobierzPozycje({ dokladnie: true });
      setDodawanie({ stan: 'formularz', szkic: { nazwa: podpowiedz(p), data: dzisiaj(), notatka: '', pozycja: p } });
    } catch (err) {
      setDodawanie({ stan: 'blad', opis: OPIS_BLEDU_LOKALIZACJI[err instanceof BladLokalizacji ? err.powod : 'czas'] });
    }
  };

  const dane = (s: Szkic): DaneMiejsca => ({
    nazwa: s.nazwa,
    data: s.data,
    notatka: s.notatka,
    szer: s.pozycja.szer,
    dl: s.pozycja.dl,
    dokladnosc: s.pozycja.dokladnosc,
  });

  const zapiszNowe = (s: Szkic) => {
    if (!miejsca) return;
    const b = bladMiejsca(miejsca, dane(s));
    if (b) return setBlad(b);
    const ok = zapisz(noweIdMiejsca(), dane(s));
    sprawdzZapis(ok);
    if (ok) setDodawanie({ stan: 'nic' });
  };

  const zapiszZmiane = () => {
    if (!miejsca || !edycja) return;
    const b = bladMiejsca(miejsca, dane(edycja.szkic), edycja.id);
    if (b) return setBlad(b);
    const ok = zapisz(edycja.id, dane(edycja.szkic));
    sprawdzZapis(ok);
    if (ok) setEdycja(null);
  };

  const ustawPozycjeTutaj = async () => {
    if (!edycja) return;
    setNowaPozycja(true);
    try {
      const p = await pobierzPozycje({ dokladnie: true });
      setEdycja((e) => (e ? { ...e, szkic: { ...e.szkic, pozycja: p } } : e));
    } catch (err) {
      setBlad(OPIS_BLEDU_LOKALIZACJI[err instanceof BladLokalizacji ? err.powod : 'czas']);
    } finally {
      setNowaPozycja(false);
    }
  };

  if (miejsca === null) return <StateBlock state="loading" title="Wczytywanie moich miejsc" scope="section" />;
  const wszystkie = aktywne(miejsca);
  const usuwane = doUsuniecia ? miejsca[doUsuniecia] : null;

  return (
    <div className="stack">
      <section className="stack" aria-labelledby="miejsca-dodaj">
        <h2 id="miejsca-dodaj" className="checklist__naglowek">
          Dodaj miejsce
        </h2>
        {dodawanie.stan === 'formularz' ? (
          <Formularz
            tytul="Nowe miejsce"
            szkic={dodawanie.szkic}
            setSzkic={(szkic) => setDodawanie({ stan: 'formularz', szkic })}
            blad={blad}
            onZapisz={() => zapiszNowe(dodawanie.szkic)}
            onAnuluj={() => {
              setBlad(null);
              setDodawanie({ stan: 'nic' });
            }}
          />
        ) : (
          <>
            <p className="muted">Stań w miejscu obserwacji: zapiszę jego położenie z telefonu, a Ty dopiszesz nazwę i notatkę.</p>
            <div>
              <Button onClick={() => void dodaj()} loading={dodawanie.stan === 'lokalizuje'} loadingLabel="Ustalam lokalizację">
                Dodaj miejsce, w którym jestem
              </Button>
            </div>
            {dodawanie.stan === 'blad' && (
              <StateBlock
                state="error"
                title="Nie udało się ustalić lokalizacji"
                description={dodawanie.opis}
                action={
                  <Button size="sm" variant="secondary" onClick={() => void dodaj()}>
                    Spróbuj ponownie
                  </Button>
                }
                scope="section"
              />
            )}
          </>
        )}
      </section>

      <section className="stack" aria-labelledby="miejsca-lista">
        <h2 id="miejsca-lista" className="checklist__naglowek">
          Moje miejsca
        </h2>
        {wszystkie.length === 0 ? (
          <StateBlock
            state="empty"
            title="Nie masz jeszcze żadnego miejsca"
            description="Dodaj pierwsze, kiedy będziesz w terenie. Pojawi się też w „Gdzie stanąć” i w podpowiedziach przy obserwacjach."
            scope="section"
          />
        ) : (
          <ul className="punkty__lista">
            {wszystkie.map(([id, m]) => (
              <li key={id}>
                {edycja?.id === id ? (
                  <div className="punkt">
                    <Formularz
                      tytul={`Zmiana: ${m.nazwa}`}
                      szkic={edycja.szkic}
                      setSzkic={(szkic) => setEdycja({ id, szkic })}
                      blad={blad}
                      onZapisz={zapiszZmiane}
                      onAnuluj={() => {
                        setBlad(null);
                        setEdycja(null);
                      }}
                      onNowaPozycja={() => void ustawPozycjeTutaj()}
                      pozycjaWToku={nowaPozycja}
                    />
                  </div>
                ) : (
                  <Miejsce
                    id={id}
                    m={m}
                    ptaki={lista ? ptakiWMiejscu(lista, m.nazwa) : []}
                    wszystkiePtaki={ptaki}
                    onEdytuj={() => {
                      setBlad(null);
                      setEdycja({
                        id,
                        szkic: { nazwa: m.nazwa, data: m.data, notatka: m.notatka ?? '', pozycja: { szer: m.szer, dl: m.dl, dokladnosc: m.dokladnosc } },
                      });
                    }}
                    onUsun={() => setDoUsuniecia(id)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog
        open={Boolean(usuwane)}
        onClose={() => setDoUsuniecia(null)}
        title={usuwane ? `Usunąć „${usuwane.nazwa}”?` : 'Usunąć miejsce?'}
        description="Obserwacje w checkliście zachowają wpisaną nazwę miejsca. Z kontem miejsce zniknie też z innych urządzeń."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDoUsuniecia(null)}>
              Anuluj
            </Button>
            <Button
              tone="critical"
              onClick={() => {
                if (doUsuniecia) sprawdzZapis(usun(doUsuniecia));
                setDoUsuniecia(null);
              }}
            >
              Usuń miejsce
            </Button>
          </>
        }
      />
    </div>
  );
}
