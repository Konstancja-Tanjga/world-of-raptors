'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BOK_POWIERZCHNI_KM,
  jestKategoria,
  KATEGORIE,
  liczebnosc,
  NIE_LICZE,
  ocena,
  odpowiedziKlucza,
  rewiry,
  zgodnoscRewiru,
  type Kategoria,
  type Odpowiedz,
  type Przedzial,
  type SesjaKarty,
  ZASIEG_PUNKTU_KM,
} from '@/lib/rewiry';
import { Badge, Button, Card, RadioGroup, Select, Table } from './ds';
import { NazwaPtaka } from './NazwaPtaka';

export type PtakKarty = { id: string; pl: string; rysunek: ReactNode };

/** Drawing units per km: the plot is 100 × 100. */
const J = 100 / BOK_POWIERZCHNI_KM;
const NOWY = 'nowy';

const OPCJE_KATEGORII = [
  ...KATEGORIE.map((k) => ({ value: k.kod, label: `${k.kod}: ${k.nazwa} (${k.poziom})` })),
  { value: NIE_LICZE, label: 'X: nie wskazuje rewiru, nie liczę' },
];

const NAZWA_KATEGORII: Record<string, string> = Object.fromEntries(OPCJE_KATEGORII.map((o) => [o.value, o.label]));
const przedzial = (p: Przedzial) => (p.min === p.max ? String(p.min) : `${p.min}–${p.max}`);

const LEGENDA: { klasa: string; nazwa: string }[] = [
  { klasa: 'karta__teren karta__teren--las', nazwa: 'las' },
  { klasa: 'karta__teren karta__teren--ols', nazwa: 'ols' },
  { klasa: 'karta__teren karta__teren--mlodnik', nazwa: 'młodnik' },
  { klasa: 'karta__teren karta__teren--woda', nazwa: 'woda' },
];

/** What the map's colours and marks stand for, in words too, so nothing rests on colour alone. */
function Legenda() {
  return (
    <ul className="karta__legenda" aria-label="Legenda mapy">
      {LEGENDA.map((l) => (
        <li key={l.nazwa}>
          <svg viewBox="0 0 16 12" aria-hidden="true">
            <ellipse cx={8} cy={6} rx={7.5} ry={5.5} className={l.klasa} />
          </svg>
          {l.nazwa}
        </li>
      ))}
      <li>trójkąt: punkt widokowy (P1–P3), przerywane koło: ok. 2 km wokół niego</li>
      <li>kółko z numerem: miejsce notatki</li>
    </ul>
  );
}

/** The plot: terrain, the watch points with their reach, the notes answered so far, and at the end the key's territories. */
function Mapa({
  sesja,
  do: ile,
  biezaca,
  klucz,
  opis,
}: {
  sesja: SesjaKarty;
  do: number;
  biezaca: number | null;
  klucz: { id: string; x: number; y: number; etykieta: string }[] | null;
  opis: string;
}) {
  return (
    <svg className="karta__mapa" viewBox="0 0 100 100" role="img" aria-label={opis}>
      <rect width={100} height={100} className="karta__pole" />
      {Array.from({ length: BOK_POWIERZCHNI_KM - 1 }, (_, i) => (
        <g key={i} className="karta__siatka">
          <line x1={(i + 1) * J} y1={0} x2={(i + 1) * J} y2={100} />
          <line x1={0} y1={(i + 1) * J} x2={100} y2={(i + 1) * J} />
        </g>
      ))}
      {sesja.teren.map((t, i) => (
        <ellipse key={i} cx={t.x * J} cy={t.y * J} rx={t.rx * J} ry={t.ry * J} className={`karta__teren karta__teren--${t.rodzaj}`} />
      ))}
      {sesja.punkty.map((p, i) => (
        <g key={i}>
          <circle cx={p.x * J} cy={p.y * J} r={ZASIEG_PUNKTU_KM * J} className="karta__zasieg" />
          <path d={`M${p.x * J} ${p.y * J - 2.6} l2.4 4.2 h-4.8 z`} className="karta__punkt" />
          <text x={p.x * J + 3} y={p.y * J + 1.2} className="karta__etykieta">
            P{i + 1}
          </text>
        </g>
      ))}
      {klucz?.map((r) => (
        <circle key={r.id} cx={r.x * J} cy={r.y * J} r={5} className="karta__rewir" />
      ))}
      {sesja.notatki.slice(0, ile).map((n, i) => (
        <g key={n.id} className={i === biezaca ? 'karta__notatka karta__notatka--biezaca' : 'karta__notatka'}>
          <circle cx={n.x * J} cy={n.y * J} r={2.4} />
          <text x={n.x * J} y={n.y * J + 1} textAnchor="middle">
            {n.id}
          </text>
        </g>
      ))}
      {/* Drawn last, with a paper halo, so a territory's name stays readable over the notes; below its ring (above it at the bottom edge), and near the right edge it ends at its ring. */}
      {klucz?.map((r) => {
        const x = r.x * J;
        const zPrawej = x > 75;
        return (
          <text key={r.id} x={zPrawej ? x + 5 : x} y={r.y * J > 92 ? r.y * J - 6.5 : r.y * J + 8.6} textAnchor={zPrawej ? 'end' : 'middle'} className="karta__etykieta karta__etykieta--rewir">
            {r.etykieta}
          </text>
        );
      })}
    </svg>
  );
}

/**
 * B11's territory sheet: a season of notes from three watch points on a
 * 10 × 10 km plot. For each note the reader picks its category (table 5.7
 * of the GIOŚ guide) and whether it is a new territory or one already on the
 * sheet, and hears at once what the key says and why. At the end the sheet
 * gives each species' count as a range, from certain territories to all,
 * next to the key's, and the map shows the key's territories. Nothing is stored.
 */
export function KartaRewirow({ sesja, ptaki }: { sesja: SesjaKarty; ptaki: Record<string, PtakKarty> }) {
  const notatki = sesja.notatki;
  const [indeks, setIndeks] = useState(0);
  const [odpowiedzi, setOdpowiedzi] = useState<Odpowiedz[]>([]);
  const [kategoria, setKategoria] = useState('');
  const [rewir, setRewir] = useState('');
  const [bledy, setBledy] = useState<{ kategoria?: string; rewir?: string }>({});
  const obszar = useRef<HTMLDivElement>(null);
  // Focus moves only after the reader's own action, never on load.
  const przeniesFokus = useRef(false);

  const koniec = indeks >= notatki.length;
  const n = notatki[Math.min(indeks, notatki.length - 1)];
  const sprawdzona = !koniec && odpowiedzi.length > indeks;

  useEffect(() => {
    if (!przeniesFokus.current) return;
    przeniesFokus.current = false;
    obszar.current?.querySelector<HTMLElement>('[tabindex="-1"]')?.focus();
  }, [indeks]);

  // The reader's territories so far, numbered per species in the order they were made.
  const twoje = rewiry(notatki, odpowiedzi);
  const nazwaRewiru = (id: string) => {
    const r = twoje.find((x) => x.id === id);
    if (!r) return id;
    const nr = twoje.filter((x) => x.gatunek === r.gatunek).indexOf(r) + 1;
    return `${ptaki[r.gatunek].pl}, rewir ${nr} (${r.notatki.length === 1 ? 'notatka' : 'notatki'} ${r.notatki.join(', ')})`;
  };

  const zapisz = () => {
    const nowe: typeof bledy = {};
    if (!jestKategoria(kategoria)) nowe.kategoria = 'Wybierz kategorię albo X.';
    if (kategoria !== NIE_LICZE && !rewir) nowe.rewir = 'Wybierz rewir: nowy albo któryś z zapisanych.';
    setBledy(nowe);
    if (Object.keys(nowe).length) return;
    const k = kategoria as Kategoria;
    const id = k === NIE_LICZE ? null : rewir === NOWY ? `${n.gatunek}-${twoje.filter((r) => r.gatunek === n.gatunek).length + 1}-${n.id}` : rewir;
    setOdpowiedzi([...odpowiedzi, { kategoria: k, rewir: id }]);
  };
  const dalej = () => {
    przeniesFokus.current = true;
    setIndeks(indeks + 1);
    setKategoria('');
    setRewir('');
    setBledy({});
  };
  const odNowa = () => {
    przeniesFokus.current = true;
    setIndeks(0);
    setOdpowiedzi([]);
    setKategoria('');
    setRewir('');
    setBledy({});
  };

  if (koniec) {
    const o = ocena(notatki, odpowiedzi);
    const wzorcowe = rewiry(notatki, odpowiedziKlucza(notatki));
    const razem = { twoja: liczebnosc(twoje), klucz: liczebnosc(wzorcowe) };
    const kluczNaMapie = wzorcowe.map((r) => {
      const pierwsza = notatki.find((x) => x.id === r.notatki[0])!;
      return { id: r.id, x: pierwsza.x, y: pierwsza.y, etykieta: `${ptaki[r.gatunek].pl} ${r.kategoria}` };
    });
    return (
      <Card actions={<Button onClick={odNowa}>Jeszcze raz</Button>}>
        <div className="cwiczenie karta" ref={obszar}>
          <p className="cwiczenie__tytul" tabIndex={-1}>
            Kategorie zgodne z kluczem: {o.kategorie.dobrze} z {o.kategorie.wszystkie}. Razem twoja liczebność: {przedzial(razem.twoja)} rewirów, w kluczu: {przedzial(razem.klucz)}.
          </p>
          <Table
            caption="Liczebność według gatunków: od rewirów pewnych do wszystkich"
            columns={[
              { key: 'gatunek', header: 'Gatunek', cell: (w) => <NazwaPtaka id={w.gatunek} pl={ptaki[w.gatunek].pl} /> },
              { key: 'twoja', header: 'Twoja karta', cell: (w) => przedzial(w.twoja), numeric: true },
              { key: 'klucz', header: 'Klucz', cell: (w) => przedzial(w.klucz), numeric: true },
            ]}
            rows={o.gatunki}
            rowKey={(w) => w.gatunek}
            responsive="scroll"
            density="compact"
          />
          <p className="cwiczenie__polecenie">
            {o.polaczone === 0 && o.rozdzielone === 0
              ? 'Rewiry rozdzieliłaś tak jak klucz.'
              : [
                  o.polaczone > 0 && `${o.polaczone === 1 ? 'Jedna para notatek trafiła' : `Pary notatek (${o.polaczone}) trafiły`} do jednego rewiru, choć klucz je rozdziela: tak zaniża się liczbę par.`,
                  o.rozdzielone > 0 && `${o.rozdzielone === 1 ? 'Jedną parę notatek' : `Pary notatek (${o.rozdzielone})`} z jednego rewiru zapisałaś osobno: tak jeden rewir liczy się dwa razy.`,
                ]
                  .filter(Boolean)
                  .join(' ')}{' '}
            Dolna granica to rewiry z gniazdowaniem pewnym, górna to wszystkie, w których ptaki zachowywały się terytorialnie.
          </p>
          <Mapa
            sesja={sesja}
            do={notatki.length}
            biezaca={null}
            klucz={kluczNaMapie}
            opis={`Mapa powierzchni z rewirami według klucza: ${kluczNaMapie.map((r) => r.etykieta).join(', ')}.`}
          />
          <Legenda />
        </div>
      </Card>
    );
  }

  const ptak = ptaki[n.gatunek];
  const odp = odpowiedzi[indeks];
  const zgodnosc = sprawdzona ? zgodnoscRewiru(notatki, odpowiedzi, indeks) : null;
  const kategoriaDobrze = sprawdzona && odp.kategoria === n.klucz.kategoria;
  const tegoGatunku = twoje.filter((r) => r.gatunek === n.gatunek);
  const opcjeRewiru = [{ value: NOWY, label: 'Nowy rewir' }, ...tegoGatunku.map((r) => ({ value: r.id, label: nazwaRewiru(r.id) }))];
  const kluczowy = n.klucz.kategoria;

  return (
    <Card actions={sprawdzona ? <Button onClick={dalej}>{indeks === notatki.length - 1 ? 'Podsumuj sezon' : 'Następna notatka'}</Button> : <Button onClick={zapisz}>Zapisz notatkę</Button>}>
      <div className="cwiczenie karta" ref={obszar}>
        {indeks === 0 && (
          <p className="cwiczenie__polecenie">
            <b>{sesja.tytul}.</b> {sesja.miejsce}. {sesja.opis}
          </p>
        )}
        <p className="cwiczenie__tytul" tabIndex={-1}>
          Notatka {indeks + 1} z {notatki.length}: {n.data}, {n.godzina}, punkt {n.punkt}
        </p>
        <div className="karta__uklad">
          <div className="karta__notatka-tekst">
            <Mapa
              sesja={sesja}
              do={indeks + 1}
              biezaca={indeks}
              klucz={null}
              opis={`Mapa powierzchni 10 na 10 km z punktami widokowymi P1–P${sesja.punkty.length}; zaznaczone miejsca notatek od 1 do ${indeks + 1}.`}
            />
            <Legenda />
          </div>
          <div className="karta__notatka-tekst">
            <div className="karta__ptak">
              {ptak.rysunek}
              <p className="cwiczenie__tytul">
                <NazwaPtaka id={ptak.id} pl={ptak.pl} />
              </p>
            </div>
            <p className="cwiczenie__polecenie">{n.opis}</p>
          </div>
        </div>
        <Select
          key={`k-${indeks}`}
          label="Kategoria (tabela 5.7)"
          options={OPCJE_KATEGORII}
          placeholder="Wybierz kategorię"
          value={kategoria}
          onChange={(e) => {
            setKategoria(e.target.value);
            if (e.target.value === NIE_LICZE) setRewir('');
          }}
          error={bledy.kategoria}
          disabled={sprawdzona}
        />
        {kategoria !== NIE_LICZE && (
          <RadioGroup
            key={`r-${indeks}`}
            legend="Który to rewir?"
            name={`rewir-${sesja.id}-${indeks}`}
            value={rewir}
            onChange={(v) => {
              if (!sprawdzona) setRewir(v);
            }}
            error={bledy.rewir}
            options={opcjeRewiru.map((o) => ({ ...o, disabled: sprawdzona }))}
          />
        )}
        <div className="quiz__feedback" aria-live="polite">
          {sprawdzona && (
            <>
              <Badge tone={kategoriaDobrze && zgodnosc !== 'polaczony' && zgodnosc !== 'rozdzielony' ? 'success' : 'critical'}>
                {kategoriaDobrze ? (zgodnosc === 'polaczony' || zgodnosc === 'rozdzielony' ? 'Kategoria dobrze, rewir nie' : 'Dobrze') : 'Inaczej niż w kluczu'}
              </Badge>
              <span>
                {!kategoriaDobrze && `Klucz: ${NAZWA_KATEGORII[kluczowy]}. `}
                {zgodnosc === 'polaczony' && 'Ta notatka należy do innego rewiru niż ten, który wybrałaś. '}
                {zgodnosc === 'rozdzielony' && 'Ten rewir był już na karcie: to nie nowy rewir. '}
                {n.klucz.wyjasnienie}
              </span>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
