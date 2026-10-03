'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Rating, type Grade } from 'ts-fsrs';
import { kartaFsrs, planista, useFiszki, type Fiszki } from '@/lib/fiszki';
import { dzisiaj } from '@/lib/magazyn';
import { REGIONY, type Fiszka, type GatunekFiszki, type Region, type RodzajFiszki, type SylwetkaDzienna } from '@/lib/types';
import { polozenie, srcSetCommons } from '@/lib/zdjecia';
import { Button, Progress, SegmentedControl, StateBlock } from './ds';
import { ScenaSylwetki } from './ScenaSylwetki';
import { CECHY_DZIENNE } from './SpeciesCues';
import { Sylwetka } from './Sylwetka';
import { useOstrzezenieZapisu } from './useOstrzezenieZapisu';

/** New cards a day; the empty state's "Dodaj … nowych" button raises it by this much for the visit. */
const NOWYCH_DZIENNIE = 10;
/** After overdue reviews and today's new cards, a card due within this window is shown rather than ending the session; it already counts as due in the header. */
const WYPRZEDZENIE_MS = 20 * 60 * 1000;

const OCENY: { ocena: Grade; etykieta: string; klawisz: string }[] = [
  { ocena: Rating.Again, etykieta: 'Nie wiedziałam', klawisz: '1' },
  { ocena: Rating.Hard, etykieta: 'Z trudem', klawisz: '2' },
  { ocena: Rating.Good, etykieta: 'Wiedziałam', klawisz: '3' },
  { ocena: Rating.Easy, etykieta: 'Od razu', klawisz: '4' },
];

type Talia = 'wszystkie' | Region;
type Rodzaj = 'wszystkie' | 'zdjecia' | 'sylwetki' | 'nazwy';

const RODZAJE: Record<Exclude<Rodzaj, 'wszystkie'>, RodzajFiszki[]> = {
  zdjecia: ['lot', 'siedzacy'],
  sylwetki: ['sylwetka'],
  nazwy: ['pl-en', 'pl-es', 'en-pl', 'es-pl'],
};

/** The question each kind of card asks. */
const PYTANIE: Record<RodzajFiszki, string> = {
  lot: 'Jaki to gatunek?',
  siedzacy: 'Jaki to gatunek?',
  sylwetka: 'Najpierw grupa, potem gatunek. Co to za ptak?',
  'pl-en': 'Jak ten gatunek nazywa się po angielsku?',
  'pl-es': 'Jak ten gatunek nazywa się po hiszpańsku?',
  'en-pl': 'Jak ten gatunek nazywa się po polsku?',
  'es-pl': 'Jak ten gatunek nazywa się po polsku?',
};

/** "za 10 min", "za 3 dni": when a card comes back. */
function zaIle(ms: number) {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `za ${min} min`;
  const godz = Math.round(min / 60);
  if (godz < 24) return `za ${godz} godz.`;
  const dni = Math.round(godz / 24);
  if (dni < 30) return dni === 1 ? 'jutro' : `za ${dni} dni`;
  const mies = Math.round(dni / 30);
  if (mies < 12) return `za ${mies} mies.`;
  const lata = Math.round(dni / 365);
  return lata === 1 ? 'za rok' : `za ${lata} ${lata < 5 ? 'lata' : 'lat'}`;
}

/** A shuffled but stable daily order for new cards, so a reload does not reshuffle them and one species' cards are spread out. */
function kolejnosc(id: string, dzien: string) {
  let h = 2166136261;
  for (const c of `${dzien}:${id}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** The local date (YYYY-MM-DD) of a moment, to compare with `dzisiaj()`. */
function dataLokalna(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * What to show next: overdue reviews first, then new cards, then reviews due
 * within the next minutes. As in Anki, a new card waits until tomorrow when
 * another card of the same species was answered today (its "sibling"), so one
 * card does not give away the next (Kania ruda → Red Kite, then Red Kite → ?).
 */
function nastepna(talia: Fiszka[], fiszki: Fiszki, teraz: number, dodatkowe: number) {
  const dzien = dzisiaj();
  const doPowtorki = talia
    .filter((f) => fiszki[f.id] && Date.parse(fiszki[f.id].due) <= teraz + WYPRZEDZENIE_MS)
    .sort((a, b) => Date.parse(fiszki[a.id].due) - Date.parse(fiszki[b.id].due));
  const wprowadzoneDzis = Object.values(fiszki).filter((z) => z.wprowadzona === dzien).length;
  const wolne = Math.max(0, NOWYCH_DZIENNIE + dodatkowe - wprowadzoneDzis);
  const odpowiedzianeDzis = new Set(
    Object.entries(fiszki)
      .filter(([, z]) => z.last_review && dataLokalna(z.last_review) === dzien)
      .map(([id]) => id.split('/')[0]),
  );
  const nowe = talia
    .filter((f) => !fiszki[f.id])
    .sort((a, b) => kolejnosc(a.id, dzien) - kolejnosc(b.id, dzien));
  const dostepne = nowe.filter((f) => !odpowiedzianeDzis.has(f.gatunek));
  const dzisNowe = dostepne.slice(0, wolne);

  const zaleglaPowtorka = doPowtorki.find((f) => Date.parse(fiszki[f.id].due) <= teraz);
  const karta = zaleglaPowtorka ?? dzisNowe[0] ?? doPowtorki[0];
  const kolejnaPowtorka = talia
    .filter((f) => fiszki[f.id])
    .map((f) => Date.parse(fiszki[f.id].due))
    .sort((a, b) => a - b)[0];
  return {
    karta,
    powtorek: doPowtorki.length,
    nowych: dzisNowe.length,
    zostaloNowych: nowe.length,
    odlozonych: nowe.length - dostepne.length,
    kolejnaPowtorka,
  };
}

/** The question side. Nothing on it names the species. */
function Awers({ karta, g }: { karta: Fiszka; g: GatunekFiszki }) {
  if (karta.rodzaj === 'lot' || karta.rodzaj === 'siedzacy') {
    const z = karta.zdjecie!;
    return (
      <div className="fiszka__scena fiszka__scena--zdjecie">
        {/* eslint-disable-next-line @next/next/no-img-element -- the backdrop is a blurred copy of the same file */}
        <img className="fiszka__tlo" src={z.src} alt="" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element -- Commons sizes via srcset; shown whole, never cropped */}
        <img
          className="fiszka__zdjecie"
          src={z.src}
          srcSet={srcSetCommons(z)}
          sizes="(max-width: 900px) 100vw, 60vw"
          width={z.width}
          height={z.height}
          alt={karta.rodzaj === 'lot' ? 'Ptak do rozpoznania, w locie' : 'Ptak do rozpoznania, siedzący'}
          style={{ objectPosition: polozenie(z) }}
        />
      </div>
    );
  }
  if (karta.rodzaj === 'sylwetka') {
    return (
      <div className="fiszka__scena fiszka__scena--niebo">
        <ScenaSylwetki id={g.id} wariant={karta.id} opis="Sylwetka ptaka do rozpoznania, w locie, od spodu" />
      </div>
    );
  }
  const [jezyk, nazwa, etykieta] =
    karta.rodzaj === 'en-pl'
      ? (['en', g.en, 'Nazwa angielska'] as const)
      : karta.rodzaj === 'es-pl'
        ? (['es', g.es, 'Nazwa hiszpańska'] as const)
        : (['pl', g.pl, 'Nazwa polska'] as const);
  return (
    <div className="fiszka__scena fiszka__scena--nazwa">
      <p className="fiszka__jezyk">{etykieta}</p>
      <p className="fiszka__slowo" lang={jezyk}>
        {nazwa}
      </p>
    </div>
  );
}

/** The answer side: what the card asked, then what helps remember it. */
function Rewers({ karta, g }: { karta: Fiszka; g: GatunekFiszki }) {
  const pytaOObcy = karta.rodzaj === 'pl-en' || karta.rodzaj === 'pl-es';
  const obcy = karta.rodzaj === 'pl-es' ? { jezyk: 'es', nazwa: g.es } : { jezyk: 'en', nazwa: g.en };
  const cechy = g.sylwetka as Partial<SylwetkaDzienna>;
  return (
    <>
      {karta.rodzaj === 'sylwetka' && <p className="fiszka__grupa">Grupa: {cechy.grupa ?? g.grupa}</p>}
      {pytaOObcy ? (
        <p className="fiszka__nazwa" lang={obcy.jezyk}>
          {obcy.nazwa}
        </p>
      ) : (
        <p className="fiszka__nazwa">{g.pl}</p>
      )}
      <p className="fiszka__nazwy">
        <em>{g.lat}</em>
        {pytaOObcy && <>, {g.pl}</>}
        {karta.rodzaj !== 'pl-en' && (
          <>
            , ang. <span lang="en">{g.en}</span>
          </>
        )}
        {karta.rodzaj !== 'pl-es' && (
          <>
            , hiszp. <span lang="es">{g.es}</span>
          </>
        )}
      </p>

      {karta.rodzaj === 'sylwetka' ? (
        <dl className="fiszka__cechy-sylwetki">
          {CECHY_DZIENNE.filter(([k]) => k !== 'grupa' && cechy[k]).map(([k, etykieta]) => (
            <div key={k}>
              <dt>{etykieta}</dt>
              <dd>{cechy[k]}</dd>
            </div>
          ))}
        </dl>
      ) : karta.rodzaj === 'lot' || karta.rodzaj === 'siedzacy' ? (
        <ul className="fiszka__cechy">
          {g.cechy.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ) : (
        karta.zdjecie && (
          <div className="fiszka__ilustracja">
            {/* eslint-disable-next-line @next/next/no-img-element -- a small Commons thumbnail */}
            <img src={karta.zdjecie.src} alt={`${g.pl}`} style={{ objectPosition: polozenie(karta.zdjecie) }} />
            {g.aktywnosc === 'dzienny' && <Sylwetka id={g.id} klasa="fiszka__mala-sylwetka" />}
          </div>
        )
      )}

      {g.podobne.length > 0 && (karta.rodzaj === 'sylwetka' || karta.rodzaj === 'lot' || karta.rodzaj === 'siedzacy') && (
        <div className="fiszka__podobne">
          <p>Łatwo pomylić z:</p>
          <ul>
            {g.podobne.map((p) => (
              <li key={p.id}>
                {karta.rodzaj === 'sylwetka' && <Sylwetka id={p.id} klasa="fiszka__mala-sylwetka" />}
                <Link href={`/gatunki/${p.id}`}>{p.pl}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link href={`/gatunki/${g.id}`} className="fiszka__karta">
        Karta gatunku: {g.pl}
      </Link>
    </>
  );
}

/**
 * Flashcards from the atlas: photos to name, silhouettes in flight, and names
 * between Polish, English and Spanish. Name the bird, reveal the answer, say
 * how it went; FSRS decides when each card comes back. Keys: space reveals
 * the answer, 1–4 rate it.
 */
export function FiszkiView({ talia: cala, gatunki }: { talia: Fiszka[]; gatunki: Record<string, GatunekFiszki> }) {
  const { fiszki, ocen } = useFiszki();
  const sprawdzZapis = useOstrzezenieZapisu();
  const [region, setRegion] = useState<Talia>('wszystkie');
  const [rodzaj, setRodzaj] = useState<Rodzaj>('wszystkie');
  const [odkryta, setOdkryta] = useState(false);
  const [teraz, setTeraz] = useState(() => Date.now());
  const [dodatkowe, setDodatkowe] = useState(0);
  const pokazRef = useRef<HTMLButtonElement>(null);
  const odpowiedzRef = useRef<HTMLDivElement>(null);
  const przesunFokus = useRef(false);

  const talia = cala.filter(
    (f) =>
      (region === 'wszystkie' || gatunki[f.gatunek]?.regiony.includes(region)) &&
      (rodzaj === 'wszystkie' || RODZAJE[rodzaj].includes(f.rodzaj)),
  );
  const stan = fiszki ? nastepna(talia, fiszki, teraz, dodatkowe) : null;
  const poznane = fiszki ? talia.filter((f) => fiszki[f.id]).length : 0;
  const karta = stan?.karta;
  const g = karta ? gatunki[karta.gatunek] : undefined;

  // The intervals under the rating buttons and the saved schedule use this same
  // moment: FSRS seeds its fuzz from the review time.
  const odkryj = () => {
    setTeraz(Date.now());
    setOdkryta(true);
    requestAnimationFrame(() => odpowiedzRef.current?.focus());
  };

  const ocenKarte = (ocena: Grade) => {
    if (!karta) return;
    sprawdzZapis(ocen(karta.id, ocena, new Date(teraz)));
    setOdkryta(false);
    setTeraz(Date.now());
    przesunFokus.current = true;
  };

  // After a rating, keyboard focus goes to the next card's reveal button.
  useEffect(() => {
    if (przesunFokus.current && !odkryta) {
      przesunFokus.current = false;
      pokazRef.current?.focus();
    }
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cel = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || cel?.closest('input, textarea, select, [contenteditable]')) return;
      if (!karta) return;
      if (!odkryta && e.key === ' ' && cel?.tagName !== 'BUTTON') {
        e.preventDefault();
        odkryj();
      } else if (odkryta) {
        const o = OCENY.find((x) => x.klawisz === e.key);
        if (o) {
          e.preventDefault();
          ocenKarte(o.ocena);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!fiszki || !stan) return <StateBlock state="loading" title="Wczytywanie fiszek" scope="section" />;

  const wybierzRodzaj = (v: string) => {
    setRodzaj(v as Rodzaj);
    setOdkryta(false);
    setTeraz(Date.now());
  };
  const wybierzRegion = (v: string) => {
    setRegion(v as Talia);
    setOdkryta(false);
    setTeraz(Date.now());
  };

  return (
    <div className="fiszki">
      <div className="fiszki__filtry">
        <div className="scroll-x">
          <SegmentedControl
            legend="Rodzaj"
            showLegend
            value={rodzaj}
            onChange={wybierzRodzaj}
            options={[
              { value: 'wszystkie', label: 'Wszystkie' },
              { value: 'zdjecia', label: 'Zdjęcia' },
              { value: 'sylwetki', label: 'Sylwetki' },
              { value: 'nazwy', label: 'Nazwy' },
            ]}
          />
        </div>
        <div className="scroll-x">
          <SegmentedControl
            legend="Region"
            showLegend
            value={region}
            onChange={wybierzRegion}
            options={[{ value: 'wszystkie', label: 'Wszystkie' }, ...REGIONY]}
          />
        </div>
      </div>
      <Progress label="Poznane fiszki" value={poznane} max={talia.length} valueText={`${poznane} z ${talia.length}`} />

      {!karta || !g ? (
        <StateBlock
          state="empty"
          title="Na dziś to wszystko"
          description={[
            stan.kolejnaPowtorka !== undefined ? `Następna powtórka ${zaIle(stan.kolejnaPowtorka - teraz)}.` : 'W tej talii nie ma fiszek do powtórki.',
            stan.zostaloNowych > 0 ? `Nowych fiszek w tej talii: ${stan.zostaloNowych}.` : '',
            stan.odlozonych > 0
              ? `${stan.odlozonych} z nich czeka do jutra, bo ćwiczyłam już dziś inne fiszki tych gatunków.`
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
          action={
            stan.zostaloNowych - stan.odlozonych > 0 ? (
              <Button size="sm" onClick={() => setDodatkowe((d) => d + NOWYCH_DZIENNIE)}>
                Dodaj {Math.min(NOWYCH_DZIENNIE, stan.zostaloNowych - stan.odlozonych)} nowych
              </Button>
            ) : undefined
          }
        />
      ) : (
        <section className="fiszka" aria-label="Fiszka" data-rodzaj={karta.rodzaj} data-odkryta={odkryta ? '' : undefined}>
          <div className="fiszka__przod">
            <Awers karta={karta} g={g} />
            {karta.zdjecie && (karta.rodzaj === 'lot' || karta.rodzaj === 'siedzacy') && (
              <p className="fiszka__podpis">
                Fot. {karta.zdjecie.autor},{' '}
                {karta.zdjecie.licencjaUrl ? (
                  <a href={karta.zdjecie.licencjaUrl} target="_blank" rel="noreferrer">
                    {karta.zdjecie.licencja}
                  </a>
                ) : (
                  karta.zdjecie.licencja
                )}
                {karta.zdjecie.strona && (
                  <>
                    ,{' '}
                    <a href={karta.zdjecie.strona} target="_blank" rel="noreferrer">
                      Wikimedia Commons
                    </a>
                  </>
                )}
              </p>
            )}
          </div>
          <div className="fiszka__panel">
            <p className="fiszka__licznik">
              Na dziś: {stan.powtorek} do powtórki, {stan.nowych} {stan.nowych === 1 ? 'nowa' : 'nowych'}
            </p>
            <p className="fiszka__pytanie">{PYTANIE[karta.rodzaj]}</p>
            {!odkryta ? (
              <div className="fiszka__akcje">
                <Button ref={pokazRef} onClick={odkryj}>
                  Pokaż odpowiedź
                </Button>
                <span className="muted fiszka__klawisz">Spacja</span>
              </div>
            ) : (
              <div className="fiszka__odpowiedz" tabIndex={-1} ref={odpowiedzRef}>
                <Rewers karta={karta} g={g} />
                <div className="fiszka__oceny" role="group" aria-label="Jak mi poszło?">
                  {OCENY.map(({ ocena, etykieta, klawisz }) => {
                    const due = planista.next(kartaFsrs(fiszki[karta.id], new Date(teraz)), new Date(teraz), ocena).card.due;
                    const opisId = `ocena-${ocena}`;
                    return (
                      <div key={ocena} className="fiszka__ocena">
                        <Button
                          variant={ocena === Rating.Good ? 'primary' : 'secondary'}
                          aria-describedby={opisId}
                          onClick={() => ocenKarte(ocena)}
                        >
                          {etykieta}
                        </Button>
                        <span id={opisId} className="muted">
                          {zaIle(due.getTime() - teraz)}
                          <span className="fiszka__klawisz">, klawisz {klawisz}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
