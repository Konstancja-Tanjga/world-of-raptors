'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { dzisiaj } from '@/lib/checklist';
import { jestDniem, LIMITY, nazwaWPoblizu, punktSlownie, type Punkt } from '@/lib/dziennik';
import { noweIdWpisu, useDziennik } from '@/lib/dziennikMagazyn';
import { aktywne, bladMiejsca, kluczNazwy, najblizszeMoje } from '@/lib/mojeMiejsca';
import { noweIdMiejsca, useMojeMiejsca } from '@/lib/mojeMiejscaMagazyn';
import { wspolrzedneZTekstu, type Wspolrzedne } from '@/lib/punkty';
import type { PtakDoWyboru } from '@/lib/types';
import { ButtonLink } from '../ButtonLink';
import { Button, Combobox, DatePicker, Dialog, FilterChip, Input, StateBlock, Textarea, useToast } from '../ds';
import { doSzukania } from '../SpeciesFilters';
import { MapaWGranicy } from './MapaWGranicy';
import { WierszGatunku, type WierszListy } from './WierszGatunku';
import { OwnPhotos } from '../OwnPhotos';
import { usunZdjecia, useZdjeciaWlasne, zdjeciaWpisow, type ZdjecieWlasne } from '@/lib/zdjeciaWlasne';
import { odmiana } from '@/lib/odmiana';

/** How long to wait for the browser to answer at all (a permission prompt left open calls back never). */
const CZEKANIE_NA_LOKALIZACJE_MS = 30_000;

type Lokalizowanie = { stan: 'spokoj' } | { stan: 'lokalizuje' } | { stan: 'blad'; opis: string };

const godzinaTeraz = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * Adding sightings to the field log, or editing one (`/dziennik/obserwacja`,
 * `?gatunek=` to start from a species, `?id=` to edit). Made for a phone in
 * the field. A new sighting is a list: every species seen on one outing (16
 * at La Janda), each with its count and photos, sharing the day, time, place,
 * point and note; saving it writes one entry per species, which the log shows
 * together. Editing changes one entry. The point comes from the phone in one
 * tap, a map, typed coordinates or a favourite place ("Moje miejsca"); a name
 * used before within 500 m, or a place of mine within 1 km, is offered.
 */
export function FormularzObserwacji({ ptaki }: { ptaki: PtakDoWyboru[] }) {
  const router = useRouter();
  const { notify } = useToast();
  const { dziennik, zapisz, usun } = useDziennik();
  const { miejsca, zapisz: zapiszMiejsce, usun: usunMiejsce } = useMojeMiejsca();

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
  // A new sighting: every species of the outing, one row each.
  const [lista, setLista] = useState<WierszListy[]>([]);
  const [bladUlubionego, setBladUlubionego] = useState<string | null>(null);
  const [usunUlubione, setUsunUlubione] = useState<string | null>(null);
  // Leaving a new, unsaved sighting whose rows already have photos: they would stay on their species.
  const [porzucone, setPorzucone] = useState<ZdjecieWlasne[] | null>(null);
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
    if (adres.gatunek && ptaki.some((p) => p.id === adres.gatunek)) setLista([{ id: noweIdWpisu(), gatunek: adres.gatunek, liczba: '' }]);
    setData(dzisiaj());
    setGodzina(godzinaTeraz());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [adres, dziennik, ptaki]);

  useEffect(() => () => {
    if (czuwanie.current) clearTimeout(czuwanie.current);
  }, []);

  // A sighting's photos are filed under its species: while it has some, the species stays as it is.
  const { zdjecia: zdjeciaWpisu } = useZdjeciaWlasne(gatunek ?? '', id ?? undefined);
  const zdjeciaBlokuja = Boolean(gatunek && id && zdjeciaWpisu?.length);

  const opcje = useMemo(() => ptaki.map((p) => ({ value: p.id, label: p.pl, hint: p.lat })), [ptaki]);
  const poId = useMemo(() => new Map(ptaki.map((p) => [p.id, p])), [ptaki]);
  const filtrGatunku = (o: { value: string; label: string }, q: string) => {
    const p = poId.get(o.value);
    const t = doSzukania(q);
    return !t || (p ? [p.pl, p.lat, p.en, p.es] : [o.label]).some((x) => doSzukania(x).includes(t));
  };

  /** A new point: the place's name is offered from an earlier sighting nearby, if none is typed yet. */
  const ustawPunkt = (p: Punkt | null) => {
    setPunkt(p);
    // An earlier sighting's name within 500 m, else my saved place within 1 km ("Moje miejsca").
    const nazwa = p ? ((dziennik && nazwaWPoblizu(dziennik, p)) || (miejsca && najblizszeMoje(miejsca, p, 1)?.miejsce.nazwa)) : undefined;
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

  const ulubione = miejsca ? aktywne(miejsca) : [];
  const wybraneUlubione = miejsce.trim() ? ulubione.find(([, m]) => kluczNazwy(m.nazwa) === kluczNazwy(miejsce)) : undefined;
  const wybierzUlubione = (m: { nazwa: string; szer: number; dl: number }) => {
    setMiejsce(m.nazwa);
    setPunkt({ szer: m.szer, dl: m.dl, zrodlo: 'mapa' });
    setBladUlubionego(null);
  };
  const dodajDoUlubionych = () => {
    if (!miejsca || !punkt) return;
    const idMiejsca = noweIdMiejsca();
    const dane = { nazwa: miejsce, szer: punkt.szer, dl: punkt.dl, dokladnosc: punkt.dokladnosc, data: data || dzisiaj() };
    const blad = bladMiejsca(miejsca, dane, idMiejsca);
    if (blad) return setBladUlubionego(blad);
    setBladUlubionego(zapiszMiejsce(idMiejsca, dane) ? null : 'Przeglądarka nie zapisała miejsca (tryb prywatny albo brak miejsca).');
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

  const bladLiczbyZ = (tekst: string) => {
    const x = Number(tekst);
    return tekst.trim() && !(Number.isInteger(x) && x >= 1 && x <= LIMITY.liczba)
      ? `Liczba całkowita od 1 do ${LIMITY.liczba.toLocaleString('pl-PL')} albo puste pole.`
      : undefined;
  };
  const wspolne = { data, godzina: godzina || undefined, miejsce, notatka, punkt: punkt ?? undefined };
  const nazwaGatunku = (g: string) => poId.get(g)?.pl ?? g;
  const zDuzej = (t: string) => t[0].toLocaleUpperCase('pl') + t.slice(1);
  const bladZapisuWpisu = (w: 'niepoprawny' | 'odmowa') =>
    w === 'odmowa'
      ? 'Przeglądarka nie zapisała obserwacji (tryb prywatny albo brak miejsca). Formularz zostaje wypełniony: spróbuj jeszcze raz.'
      : 'Tej obserwacji nie da się zapisać: któreś pole ma niepoprawną wartość. Sprawdź punkt i godzinę.';

  /** Editing one entry. */
  const zapiszJedna = () => {
    if (!gatunek) setBladGatunku('Wybierz gatunek z listy: wpisz kilka liter nazwy.');
    if (!gatunek || bladDaty || bladLiczby) {
      const pierwsze = !gatunek ? '[role=combobox]' : bladDaty ? 'input[type=date]' : 'input[inputmode=numeric]';
      document.querySelector<HTMLInputElement>(`.formularz-obserwacji ${pierwsze}`)?.focus();
      return;
    }
    const wynik = zapisz(id, { ...wspolne, gatunek, liczba: liczba.trim() ? n : undefined });
    if (wynik.wpis !== 'zapisany') return setBladZapisu(bladZapisuWpisu(wynik.wpis));
    const Nazwa = zDuzej(nazwaGatunku(gatunek));
    notify(
      wynik.checklista
        ? { tone: 'success', title: 'Obserwacja zmieniona', description: `${Nazwa}.` }
        : {
            tone: 'warning',
            title: 'Obserwacja zapisana, checklista bez zmian',
            description: `${Nazwa} jest w dzienniku, ale przeglądarka nie zapisała jej na checkliście. Odhacz ją tam ręcznie.`,
            duration: null,
          },
    );
    router.push(`/dziennik#wpis-${id}`);
  };

  /** A new sighting: one entry per species on the list, sharing everything else. */
  const zapiszListe = () => {
    if (!lista.length) setBladGatunku('Dodaj co najmniej jeden gatunek: wpisz kilka liter nazwy.');
    const zlaLiczba = lista.find((w) => bladLiczbyZ(w.liczba));
    if (!lista.length || bladDaty || zlaLiczba) {
      const pierwsze = !lista.length ? '[role=combobox]' : bladDaty ? 'input[type=date]' : 'input[inputmode=numeric]';
      document.querySelector<HTMLInputElement>(`.formularz-obserwacji ${pierwsze}`)?.focus();
      return;
    }
    const widziane = new Set(Object.values(dziennik).filter((w) => !w.usuniety).map((w) => w.gatunek));
    const nieZapisane: string[] = [];
    const bezChecklisty: string[] = [];
    let blad: 'niepoprawny' | 'odmowa' = 'odmowa';
    for (const w of lista) {
      // A retry writes the same ids again: entries saved the first time are overwritten, not doubled.
      const wynik = zapisz(w.id, { ...wspolne, gatunek: w.gatunek, liczba: w.liczba.trim() ? Number(w.liczba) : undefined });
      if (wynik.wpis !== 'zapisany') {
        nieZapisane.push(nazwaGatunku(w.gatunek));
        blad = wynik.wpis;
      } else if (!wynik.checklista) bezChecklisty.push(nazwaGatunku(w.gatunek));
    }
    if (nieZapisane.length) {
      return setBladZapisu(`Nie zapisano: ${nieZapisane.join(', ')}. ${bladZapisuWpisu(blad)}`);
    }
    const nowe = lista.filter((w) => !widziane.has(w.gatunek)).length;
    notify(
      bezChecklisty.length
        ? {
            tone: 'warning',
            title: 'Obserwacje zapisane, checklista nie cała',
            description: `Przeglądarka nie odhaczyła na checkliście: ${bezChecklisty.join(', ')}. Odhacz je tam ręcznie.`,
            duration: null,
          }
        : {
            tone: 'success',
            title: lista.length === 1 ? 'Obserwacja zapisana' : `Zapisano ${lista.length} ${odmiana(lista.length, ['gatunek', 'gatunki', 'gatunków'])}`,
            description:
              lista.length === 1
                ? `${zDuzej(nazwaGatunku(lista[0].gatunek))}${nowe ? ': jest też na mojej checkliście.' : '.'}`
                : nowe
                  ? `Nowe na mojej checkliście: ${nowe}.`
                  : 'Wszystkie były już na mojej checkliście.',
          },
    );
    router.push(`/dziennik#wpis-${lista[0].id}`);
  };

  const zapiszObserwacje = () => {
    setPokazBledy(true);
    if (edycja) zapiszJedna();
    else zapiszListe();
  };

  /** "Anuluj": a new sighting whose rows have photos asks first what to do with them. */
  const anuluj = async () => {
    if (edycja || !lista.length) return router.push('/dziennik');
    try {
      const zdjecia = await zdjeciaWpisow(lista.map((w) => w.id));
      if (!zdjecia.length) return router.push('/dziennik');
      setPorzucone(zdjecia);
    } catch (err) {
      console.error('[dziennik] could not read the new sighting’s photos', err);
      router.push('/dziennik');
    }
  };
  const usunPorzuconeIWyjdz = async () => {
    try {
      if (porzucone) await usunZdjecia(porzucone);
      router.push('/dziennik');
    } catch (err) {
      console.error('[dziennik] could not delete the new sighting’s photos', err);
      setPorzucone(null);
      setBladZapisu('Nie udało się usunąć zdjęć. Zostają przy gatunkach; mogę je usunąć na checkliście.');
    }
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
      {edycja ? (
        <Combobox
          label="Gatunek"
          description={
            zdjeciaBlokuja
              ? 'Obserwacja ma zdjęcia tego gatunku. Żeby go zmienić, usuń je najpierw.'
              : 'Wpisz kilka liter nazwy polskiej, łacińskiej, angielskiej albo hiszpańskiej.'
          }
          disabled={zdjeciaBlokuja}
          options={opcje}
          value={gatunek}
          onChange={(v) => {
            setGatunek(v);
            setBladGatunku(undefined);
            setBladZapisu(null);
          }}
          filter={filtrGatunku}
          emptyMessage="Nie znam takiego ptaka. Sprawdź pisownię albo wpisz nazwę łacińską."
          error={bladGatunku}
        />
      ) : (
        <div className="stack lista-gatunkow">
          <Combobox
            label="Dodaj gatunek"
            options={opcje.filter((o) => !lista.some((w) => w.gatunek === o.value))}
            value={null}
            onChange={(v) => {
              if (!v) return;
              setLista((l) => (l.some((w) => w.gatunek === v) ? l : [...l, { id: noweIdWpisu(), gatunek: v, liczba: '' }]));
              setBladGatunku(undefined);
              setBladZapisu(null);
            }}
            filter={filtrGatunku}
            emptyMessage="Nie znam takiego ptaka albo jest już na liście."
            error={bladGatunku}
          />
          {lista.length > 0 && (
            <>
              <p className="filters__legend" id="lista-gatunkow">
                Na liście: {lista.length} {odmiana(lista.length, ['gatunek', 'gatunki', 'gatunków'])}
              </p>
              <ol className="lista-gatunkow__lista" aria-labelledby="lista-gatunkow">
                {lista.map((w) => (
                  <WierszGatunku
                    key={w.id}
                    wiersz={w}
                    nazwa={nazwaGatunku(w.gatunek)}
                    lacina={poId.get(w.gatunek)?.lat ?? ''}
                    bladLiczby={bladLiczbyZ(w.liczba)}
                    onLiczba={(liczba) => setLista((l) => l.map((x) => (x.id === w.id ? { ...x, liczba } : x)))}
                    onUsun={() => setLista((l) => l.filter((x) => x.id !== w.id))}
                  />
                ))}
              </ol>
            </>
          )}
        </div>
      )}
      <div className="formularz-obserwacji__pola">
        <DatePicker
          label="Data"
          max={dzisiaj()}
          value={data}
          onChange={(e) => setData(e.target.value)}
          error={pokazBledy ? bladDaty : undefined}
        />
        <Input label="Godzina" type="time" value={godzina} onChange={(e) => setGodzina(e.target.value)} />
        {edycja && (
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
        )}
      </div>

      <fieldset className="formularz-obserwacji__miejsce stack">
        <legend className="filters__legend">Gdzie</legend>
        {ulubione.length > 0 && (
          <div className="formularz-obserwacji__ulubione">
            <p className="filters__legend" id="ulubione-miejsca">
              Ulubione miejsca
            </p>
            <div className="chips" role="group" aria-labelledby="ulubione-miejsca">
              {ulubione.map(([idM, m]) => (
                <FilterChip key={idM} label={m.nazwa} pressed={wybraneUlubione?.[0] === idM} onClick={() => wybierzUlubione(m)} />
              ))}
            </div>
          </div>
        )}
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
              Dotknij mapy w miejscu obserwacji.
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
                description="np. 52.2297, 21.0122"
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
          description="np. Łąki pod Kampinosem"
          list="dziennik-moje-miejsca"
          value={miejsce}
          maxLength={200}
          onChange={(e) => setMiejsce(e.target.value)}
        />
        <div className="row">
          {wybraneUlubione ? (
            <Button type="button" variant="ghost" tone="critical" size="sm" onClick={() => setUsunUlubione(wybraneUlubione[0])}>
              Usuń „{wybraneUlubione[1].nazwa}” z ulubionych
            </Button>
          ) : (
            miejsce.trim() &&
            punkt &&
            miejsca && (
              <Button type="button" variant="secondary" size="sm" onClick={dodajDoUlubionych}>
                Dodaj „{miejsce.trim()}” do ulubionych
              </Button>
            )
          )}
          {!wybraneUlubione && miejsce.trim() && !punkt && (
            <p className="muted">Żeby dodać miejsce do ulubionych, ustaw jego punkt.</p>
          )}
        </div>
        {bladUlubionego && <StateBlock state="error" title="Nie dodano do ulubionych" description={bladUlubionego} scope="section" />}
      </fieldset>

      <datalist id="dziennik-moje-miejsca">
        {miejsca && aktywne(miejsca).map(([id, m]) => <option key={id} value={m.nazwa} />)}
      </datalist>

      <Textarea label="Notatka" rows={3} maxLength={2000} value={notatka} onChange={(e) => setNotatka(e.target.value)} />

      {edycja && gatunek && (
        <OwnPhotos gatunek={gatunek} nazwa={poId.get(gatunek)?.pl ?? gatunek} wpis={id} edycja tytul="Zdjęcia z tej obserwacji" />
      )}

      {bladZapisu && <StateBlock state="error" title="Nie zapisano" description={bladZapisu} scope="section" />}
      <div className="row">
        <Button type="submit">
          {edycja ? 'Zapisz zmiany' : lista.length > 1 ? `Zapisz ${lista.length} ${odmiana(lista.length, ['gatunek', 'gatunki', 'gatunków'])}` : 'Zapisz obserwację'}
        </Button>
        {edycja ? (
          <ButtonLink href="/dziennik" variant="secondary">
            Anuluj
          </ButtonLink>
        ) : (
          <Button type="button" variant="secondary" onClick={() => void anuluj()}>
            Anuluj
          </Button>
        )}
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
      <Dialog
        open={usunUlubione !== null}
        onClose={() => setUsunUlubione(null)}
        title="Usunąć to miejsce z ulubionych?"
        size="sm"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setUsunUlubione(null)}>
              Anuluj
            </Button>
            <Button
              type="button"
              tone="critical"
              onClick={() => {
                if (usunUlubione && !usunMiejsce(usunUlubione)) setBladUlubionego('Przeglądarka nie zapisała zmiany. Miejsce zostaje w ulubionych.');
                setUsunUlubione(null);
              }}
            >
              Usuń z ulubionych
            </Button>
          </>
        }
      >
        Zniknie też ze strony „Moje miejsca”. Obserwacje z tą nazwą miejsca zostaną bez zmian.
      </Dialog>
      <Dialog
        open={porzucone !== null}
        onClose={() => setPorzucone(null)}
        title="Wyjść bez zapisu?"
        size="sm"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setPorzucone(null)}>
              Anuluj
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push('/dziennik')}>
              Zostaw zdjęcia
            </Button>
            <Button type="button" tone="critical" onClick={() => void usunPorzuconeIWyjdz()}>
              Usuń zdjęcia
            </Button>
          </>
        }
      >
        {porzucone &&
          `Do tej niezapisanej obserwacji dodałam ${porzucone.length} ${odmiana(porzucone.length, ['zdjęcie', 'zdjęcia', 'zdjęć'])}. Jeśli je zostawię, będą przy gatunkach na checkliście, ale nie w dzienniku.`}
      </Dialog>
    </form>
  );
}
