'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { dzisiaj } from '@/lib/checklist';
import { jestDniem, LIMITY, nazwaWPoblizu, punktSlownie, type Punkt } from '@/lib/dziennik';
import { noweIdWpisu, useDziennik } from '@/lib/dziennikMagazyn';
import { wspolrzedneZTekstu, type Wspolrzedne } from '@/lib/punkty';
import type { PtakDoWyboru } from '@/lib/types';
import { ButtonLink } from '../ButtonLink';
import { Button, Combobox, DatePicker, Dialog, Input, StateBlock, Textarea, useToast } from '../ds';
import { doSzukania } from '../SpeciesFilters';
import { MapaWGranicy } from './MapaWGranicy';

/** How long to wait for the browser to answer at all (a permission prompt left open calls back never). */
const CZEKANIE_NA_LOKALIZACJE_MS = 30_000;

type Lokalizowanie = { stan: 'spokoj' } | { stan: 'lokalizuje' } | { stan: 'blad'; opis: string };

const godzinaTeraz = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * Adding or editing one sighting of the field log (`/dziennik/obserwacja`,
 * `?gatunek=` to start from a species, `?id=` to edit). Made for a phone in
 * the field: the species by typing a few letters, the date and time filled
 * in, the point from the phone's location in one tap, a map for a point
 * picked by hand, and the name of a place used before within 500 m offered.
 */
export function FormularzObserwacji({ ptaki }: { ptaki: PtakDoWyboru[] }) {
  const router = useRouter();
  const { notify } = useToast();
  const { dziennik, zapisz, usun } = useDziennik();

  // The address is read after mount: the page is prerendered without its query.
  const [adres, setAdres] = useState<{ id: string | null; gatunek: string | null } | null>(null);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAdres({ id: p.get('id'), gatunek: p.get('gatunek') });
  }, []);

  const [id, setId] = useState<string | null>(null);
  const [gatunek, setGatunek] = useState<string | null>(null);
  const [data, setData] = useState('');
  const [godzina, setGodzina] = useState('');
  const [liczba, setLiczba] = useState('');
  const [miejsce, setMiejsce] = useState('');
  const [notatka, setNotatka] = useState('');
  const [punkt, setPunkt] = useState<Punkt | null>(null);
  const [wspolrzedne, setWspolrzedne] = useState('');
  const [mapa, setMapa] = useState(false);
  const [lokalizowanie, setLokalizowanie] = useState<Lokalizowanie>({ stan: 'spokoj' });
  const [bladGatunku, setBladGatunku] = useState<string | undefined>();
  const [pokazBledy, setPokazBledy] = useState(false);
  // Shown on every refused save, not once a visit: the form must not look as if the button did nothing.
  const [bladZapisu, setBladZapisu] = useState<string | null>(null);
  const [potwierdzUsuniecie, setPotwierdzUsuniecie] = useState(false);
  const zadanie = useRef(0);
  const czuwanie = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fill the form once the address and the log are read: an entry to edit, or a new one for now.
  const wypelniony = useRef(false);
  useEffect(() => {
    if (!adres || !dziennik || wypelniony.current) return;
    wypelniony.current = true;
    const wpis = adres.id ? dziennik[adres.id] : undefined;
    /* eslint-disable react-hooks/set-state-in-effect -- filling the form once from stores read after mount */
    if (adres.id && wpis && !wpis.usuniety) {
      setId(adres.id);
      setGatunek(wpis.gatunek);
      setData(wpis.data);
      setGodzina(wpis.godzina ?? '');
      setLiczba(wpis.liczba ? String(wpis.liczba) : '');
      setMiejsce(wpis.miejsce ?? '');
      setNotatka(wpis.notatka ?? '');
      setPunkt(wpis.punkt ?? null);
      return;
    }
    setId(adres.id ? null : noweIdWpisu());
    setGatunek(adres.gatunek && ptaki.some((p) => p.id === adres.gatunek) ? adres.gatunek : null);
    setData(dzisiaj());
    setGodzina(godzinaTeraz());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [adres, dziennik, ptaki]);

  useEffect(() => () => {
    if (czuwanie.current) clearTimeout(czuwanie.current);
  }, []);

  const opcje = useMemo(() => ptaki.map((p) => ({ value: p.id, label: p.pl, hint: p.lat })), [ptaki]);
  const poId = useMemo(() => new Map(ptaki.map((p) => [p.id, p])), [ptaki]);

  /** A new point: the place's name is offered from an earlier sighting nearby, if none is typed yet. */
  const ustawPunkt = (p: Punkt | null) => {
    setPunkt(p);
    const nazwa = p && dziennik ? nazwaWPoblizu(dziennik, p) : undefined;
    // A functional update: a GPS fix can take 20 s, and a name typed meanwhile must stay.
    if (nazwa) setMiejsce((m) => (m.trim() ? m : nazwa));
  };

  const zlokalizuj = () => {
    const numer = ++zadanie.current;
    const koniec = () => {
      if (czuwanie.current) clearTimeout(czuwanie.current);
      czuwanie.current = null;
    };
    if (!('geolocation' in navigator)) {
      setLokalizowanie({ stan: 'blad', opis: 'Ta przeglądarka nie podaje lokalizacji. Wybierz punkt na mapie albo wpisz współrzędne.' });
      return;
    }
    setLokalizowanie({ stan: 'lokalizuje' });
    czuwanie.current = setTimeout(() => {
      if (numer !== zadanie.current) return;
      zadanie.current++;
      setLokalizowanie({ stan: 'blad', opis: 'Przeglądarka nie odpowiedziała na prośbę o lokalizację. Spróbuj jeszcze raz albo wybierz punkt na mapie.' });
    }, CZEKANIE_NA_LOKALIZACJE_MS);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (numer !== zadanie.current) return;
        koniec();
        ustawPunkt({ szer: pos.coords.latitude, dl: pos.coords.longitude, zrodlo: 'gps', dokladnosc: Math.round(pos.coords.accuracy) });
        setLokalizowanie({ stan: 'spokoj' });
      },
      (err) => {
        if (numer !== zadanie.current) return;
        koniec();
        console.error('[dziennik] geolocation failed', err.code, err.message);
        setLokalizowanie({
          stan: 'blad',
          opis:
            err.code === err.PERMISSION_DENIED
              ? 'Przeglądarka nie dała dostępu do lokalizacji. Możesz na to pozwolić w ustawieniach strony albo wybrać punkt na mapie.'
              : err.code === err.POSITION_UNAVAILABLE
                ? 'Telefon nie zna teraz swojej pozycji (sprawdź, czy lokalizacja jest włączona). Wybierz punkt na mapie.'
                : 'Telefon nie zdążył ustalić pozycji. Spróbuj jeszcze raz pod otwartym niebem albo wybierz punkt na mapie.',
        });
      },
      // A sighting's point: the GPS fix, fresh, not a cached network guess.
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 60_000 },
    );
  };

  const wpiszWspolrzedne = () => {
    const p = wspolrzedneZTekstu(wspolrzedne);
    if (p) ustawPunkt({ ...p, zrodlo: 'mapa' });
  };
  const bladWspolrzednych = wspolrzedne.trim() && !wspolrzedneZTekstu(wspolrzedne) ? 'Wpisz szerokość i długość w stopniach, np. 52.2297, 21.0122.' : undefined;

  if (!adres || !dziennik) return <StateBlock state="loading" title="Wczytywanie dziennika" scope="section" />;
  if (!id) {
    return (
      <StateBlock
        state="empty"
        title="Nie ma takiej obserwacji"
        description="Mogła zostać usunięta na tym albo innym urządzeniu."
        action={<ButtonLink href="/dziennik" variant="secondary" size="sm">Wróć do dziennika</ButtonLink>}
        scope="section"
      />
    );
  }
  const edycja = Boolean(dziennik[id] && !dziennik[id].usuniety);
  const n = Number(liczba);
  const bladLiczby =
    liczba.trim() && !(Number.isInteger(n) && n >= 1 && n <= LIMITY.liczba)
      ? `Wpisz liczbę całkowitą od 1 do ${LIMITY.liczba.toLocaleString('pl-PL')} albo zostaw puste.`
      : undefined;
  const bladDaty = !jestDniem(data) ? 'Wybierz dzień obserwacji.' : data > dzisiaj() ? 'Ten dzień jeszcze nie nadszedł.' : undefined;

  const zapiszObserwacje = () => {
    setPokazBledy(true);
    if (!gatunek) setBladGatunku('Wybierz gatunek z listy: wpisz kilka liter nazwy.');
    if (!gatunek || bladDaty || bladLiczby) {
      const pierwsze = !gatunek ? '[role=combobox]' : bladDaty ? 'input[type=date]' : 'input[inputmode=numeric]';
      document.querySelector<HTMLInputElement>(`.formularz-obserwacji ${pierwsze}`)?.focus();
      return;
    }
    const nowyGatunek = !Object.values(dziennik).some((w) => !w.usuniety && w.gatunek === gatunek);
    const wynik = zapisz(id, {
      gatunek,
      data,
      godzina: godzina || undefined,
      liczba: liczba.trim() ? n : undefined,
      miejsce,
      notatka,
      punkt: punkt ?? undefined,
    });
    if (wynik.wpis !== 'zapisany') {
      setBladZapisu(
        wynik.wpis === 'odmowa'
          ? 'Przeglądarka nie zapisała obserwacji (tryb prywatny albo brak miejsca). Formularz zostaje wypełniony: spróbuj jeszcze raz albo przepisz ją w notatkach.'
          : 'Tej obserwacji nie da się zapisać: któreś pole ma niepoprawną wartość. Sprawdź punkt i godzinę.',
      );
      return;
    }
    const nazwa = poId.get(gatunek)?.pl ?? gatunek;
    const Nazwa = nazwa[0].toLocaleUpperCase('pl') + nazwa.slice(1);
    if (!wynik.checklista) {
      notify({
        tone: 'warning',
        title: 'Obserwacja zapisana, checklista bez zmian',
        description: `${Nazwa} jest w dzienniku, ale przeglądarka nie zapisała jej na checkliście. Odhacz ją tam ręcznie.`,
        duration: null,
      });
    } else {
      notify({
        tone: 'success',
        title: edycja ? 'Obserwacja zmieniona' : 'Obserwacja zapisana',
        description: edycja || !nowyGatunek ? `${Nazwa}.` : `${Nazwa}: jest też na mojej checkliście.`,
      });
    }
    router.push(`/dziennik#wpis-${id}`);
  };

  const usunObserwacje = () => {
    setPotwierdzUsuniecie(false);
    if (usun(id)) {
      router.push('/dziennik');
      return;
    }
    setBladZapisu('Przeglądarka nie zapisała usunięcia (tryb prywatny albo brak miejsca). Obserwacja zostaje w dzienniku.');
  };

  return (
    <form
      className="formularz-obserwacji stack"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        zapiszObserwacje();
      }}
    >
      <Combobox
        label="Gatunek"
        description="Wpisz kilka liter nazwy polskiej, łacińskiej, angielskiej albo hiszpańskiej."
        options={opcje}
        value={gatunek}
        onChange={(v) => {
          setGatunek(v);
          setBladGatunku(undefined);
          setBladZapisu(null);
        }}
        filter={(o, q) => {
          const p = poId.get(o.value);
          const t = doSzukania(q);
          return !t || (p ? [p.pl, p.lat, p.en, p.es] : [o.label]).some((n) => doSzukania(n).includes(t));
        }}
        emptyMessage="Nie znam takiego ptaka. Sprawdź pisownię albo wpisz nazwę łacińską."
        error={bladGatunku}
      />
      <div className="formularz-obserwacji__pola">
        <DatePicker
          label="Data"
          description="Dzisiaj albo wcześniej."
          max={dzisiaj()}
          value={data}
          onChange={(e) => setData(e.target.value)}
          error={pokazBledy ? bladDaty : undefined}
        />
        <Input label="Godzina" type="time" value={godzina} onChange={(e) => setGodzina(e.target.value)} />
        <Input
          label="Liczba ptaków"
          description="Jeśli liczyłam."
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={liczba}
          onChange={(e) => setLiczba(e.target.value)}
          error={bladLiczby}
        />
      </div>

      <fieldset className="formularz-obserwacji__miejsce stack">
        <legend className="filters__legend">Gdzie</legend>
        <div className="row">
          <Button type="button" variant="secondary" onClick={zlokalizuj} disabled={lokalizowanie.stan === 'lokalizuje'}>
            {lokalizowanie.stan === 'lokalizuje' ? 'Ustalam pozycję…' : 'Użyj mojej lokalizacji'}
          </Button>
          <Button type="button" variant="secondary" aria-expanded={mapa} onClick={() => setMapa(!mapa)}>
            {mapa ? 'Ukryj mapę' : 'Wybierz na mapie'}
          </Button>
          {punkt && (
            <Button type="button" variant="ghost" onClick={() => setPunkt(null)}>
              Usuń punkt
            </Button>
          )}
        </div>
        <p role="status" className={punkt ? undefined : 'muted'}>
          {punkt
            ? `${punkt.zrodlo === 'gps' ? 'Z lokalizacji telefonu' : 'Wybrany punkt'}: ${punktSlownie(punkt)}${punkt.dokladnosc !== undefined ? `, dokładność ok. ${punkt.dokladnosc} m` : ''}.`
            : 'Bez punktu: obserwacja zapisze się z samą nazwą miejsca.'}
        </p>
        {lokalizowanie.stan === 'blad' && (
          <StateBlock state="error" title="Nie udało się ustalić lokalizacji" description={lokalizowanie.opis} scope="section" />
        )}
        {mapa && (
          <>
            <p className="muted">
              Dotknij mapy w miejscu obserwacji. Mapa pobiera kafelki z OpenStreetMap; mój punkt zostaje w przeglądarce.
            </p>
            <MapaWGranicy
              opisBledu="Pewnie nie ma zasięgu. Wpisz współrzędne poniżej albo użyj lokalizacji telefonu."
              etykieta="Mapa: wybór miejsca obserwacji"
              wybrany={punkt}
              dokladnosc={punkt?.zrodlo === 'gps' ? punkt.dokladnosc : undefined}
              onWybierz={(p: Wspolrzedne) => ustawPunkt({ ...p, zrodlo: 'mapa' })}
            />
            <div className="row formularz-obserwacji__wspolrzedne">
              <Input
                label="Albo wpisz współrzędne"
                description="Szerokość i długość w stopniach, np. 52.2297, 21.0122."
                inputMode="decimal"
                value={wspolrzedne}
                onChange={(e) => setWspolrzedne(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    wpiszWspolrzedne();
                  }
                }}
                error={bladWspolrzednych}
              />
              <Button type="button" variant="secondary" onClick={wpiszWspolrzedne} disabled={!wspolrzedneZTekstu(wspolrzedne)}>
                Ustaw punkt
              </Button>
            </div>
          </>
        )}
        <Input
          label="Nazwa miejsca"
          description="Jak je nazywam, np. „Łąki pod Kampinosem”. Podpowiadam nazwę, której użyłam w promieniu 500 m."
          value={miejsce}
          maxLength={200}
          onChange={(e) => setMiejsce(e.target.value)}
        />
      </fieldset>

      <Textarea label="Notatka" rows={3} maxLength={2000} value={notatka} onChange={(e) => setNotatka(e.target.value)} />

      {bladZapisu && <StateBlock state="error" title="Nie zapisano" description={bladZapisu} scope="section" />}
      <div className="row">
        <Button type="submit">{edycja ? 'Zapisz zmiany' : 'Zapisz obserwację'}</Button>
        <ButtonLink href="/dziennik" variant="secondary">
          Anuluj
        </ButtonLink>
        {edycja && (
          <Button type="button" variant="ghost" tone="critical" onClick={() => setPotwierdzUsuniecie(true)}>
            Usuń obserwację
          </Button>
        )}
      </div>
      <Dialog
        open={potwierdzUsuniecie}
        onClose={() => setPotwierdzUsuniecie(false)}
        title="Usunąć tę obserwację?"
        size="sm"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setPotwierdzUsuniecie(false)}>
              Anuluj
            </Button>
            <Button type="button" tone="critical" onClick={usunObserwacje}>
              Usuń obserwację
            </Button>
          </>
        }
      >
        Zniknie z dziennika na wszystkich moich urządzeniach. Gatunek zostanie na checkliście.
      </Dialog>
    </form>
  );
}
