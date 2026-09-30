'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Rating, type Grade } from 'ts-fsrs';
import { dzisiaj } from '@/lib/magazyn';
import { kartaFsrs, planista, useFiszki, type Fiszki } from '@/lib/fiszki';
import { REGIONY, type Fiszka, type Region } from '@/lib/types';
import { Button, Progress, SegmentedControl, StateBlock } from './ds';
import { Photo } from './Photo';
import { useOstrzezenieZapisu } from './useOstrzezenieZapisu';

/** New cards a day, before "Dodaj nowe" raises it for the visit. */
const NOWYCH_DZIENNIE = 10;
/** A card due within this window is shown now rather than making the session wait for it. */
const WYPRZEDZENIE_MS = 20 * 60 * 1000;

const OCENY: { ocena: Grade; etykieta: string; klawisz: string }[] = [
  { ocena: Rating.Again, etykieta: 'Nie wiedziałam', klawisz: '1' },
  { ocena: Rating.Hard, etykieta: 'Z trudem', klawisz: '2' },
  { ocena: Rating.Good, etykieta: 'Wiedziałam', klawisz: '3' },
  { ocena: Rating.Easy, etykieta: 'Od razu', klawisz: '4' },
];

type Talia = 'wszystkie' | Region;

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

/** A stable daily order for new cards, so a reload does not reshuffle them and two photos of one species rarely meet. */
function kolejnosc(id: string, dzien: string) {
  let h = 2166136261;
  for (const c of `${dzien}:${id}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** What to show next: overdue reviews first, then new cards, then reviews due within the next minutes. */
function nastepna(talia: Fiszka[], fiszki: Fiszki, teraz: number, dodatkowe: number) {
  const dzien = dzisiaj();
  const doPowtorki = talia
    .filter((f) => fiszki[f.id] && Date.parse(fiszki[f.id].due) <= teraz + WYPRZEDZENIE_MS)
    .sort((a, b) => Date.parse(fiszki[a.id].due) - Date.parse(fiszki[b.id].due));
  const wprowadzoneDzis = Object.values(fiszki).filter((z) => z.wprowadzona === dzien).length;
  const wolne = Math.max(0, NOWYCH_DZIENNIE + dodatkowe - wprowadzoneDzis);
  const nowe = talia
    .filter((f) => !fiszki[f.id])
    .sort((a, b) => kolejnosc(a.id, dzien) - kolejnosc(b.id, dzien));
  const dzisNowe = nowe.slice(0, wolne);

  const zaleglaPowtorka = doPowtorki.find((f) => Date.parse(fiszki[f.id].due) <= teraz);
  const karta = zaleglaPowtorka ?? dzisNowe[0] ?? doPowtorki[0];
  const kolejnaPowtorka = talia
    .filter((f) => fiszki[f.id])
    .map((f) => Date.parse(fiszki[f.id].due))
    .sort((a, b) => a - b)[0];
  return { karta, powtorek: doPowtorki.length, nowych: dzisNowe.length, zostaloNowych: nowe.length, kolejnaPowtorka };
}

/**
 * Flashcards from the atlas photos: name the bird, reveal the answer, say how
 * it went. FSRS decides when each card comes back. Keys: space reveals the
 * answer, 1–4 rate it.
 */
export function FiszkiView({ talia: cala }: { talia: Fiszka[] }) {
  const { fiszki, ocen } = useFiszki();
  const sprawdzZapis = useOstrzezenieZapisu();
  const [wybor, setWybor] = useState<Talia>('wszystkie');
  const [odkryta, setOdkryta] = useState(false);
  const [teraz, setTeraz] = useState(() => Date.now());
  const [dodatkowe, setDodatkowe] = useState(0);
  const pokazRef = useRef<HTMLButtonElement>(null);
  const odpowiedzRef = useRef<HTMLHeadingElement>(null);
  const przesunFokus = useRef(false);

  const talia = wybor === 'wszystkie' ? cala : cala.filter((f) => f.gatunek.regiony.includes(wybor));
  const stan = fiszki ? nastepna(talia, fiszki, teraz, dodatkowe) : null;
  const karta = stan?.karta;

  const odkryj = () => {
    setOdkryta(true);
    requestAnimationFrame(() => odpowiedzRef.current?.focus());
  };

  const ocenKarte = (ocena: Grade) => {
    if (!karta) return;
    const chwila = new Date();
    sprawdzZapis(ocen(karta.id, ocena, chwila));
    setOdkryta(false);
    setTeraz(chwila.getTime());
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

  const poznane = talia.filter((f) => fiszki[f.id]).length;
  const wybierzTalie = (v: string) => {
    setWybor(v as Talia);
    setOdkryta(false);
    setTeraz(Date.now());
  };

  return (
    <div className="stack">
      <div className="scroll-x">
        <SegmentedControl
          legend="Talia"
          showLegend
          value={wybor}
          onChange={wybierzTalie}
          options={[{ value: 'wszystkie', label: 'Wszystkie' }, ...REGIONY]}
        />
      </div>
      <Progress label="Poznane fiszki" value={poznane} max={talia.length} valueText={`${poznane} z ${talia.length}`} />

      {!karta ? (
        <StateBlock
          state="empty"
          title="Na dziś to wszystko"
          description={
            stan.kolejnaPowtorka !== undefined
              ? `Następna powtórka ${zaIle(stan.kolejnaPowtorka - teraz)}.${stan.zostaloNowych > 0 ? ` Nowych fiszek w tej talii: ${stan.zostaloNowych}.` : ''}`
              : `W tej talii nie ma fiszek do powtórki.`
          }
          action={
            stan.zostaloNowych > 0 ? (
              <Button size="sm" onClick={() => setDodatkowe((d) => d + NOWYCH_DZIENNIE)}>
                Dodaj {Math.min(NOWYCH_DZIENNIE, stan.zostaloNowych)} nowych
              </Button>
            ) : undefined
          }
        />
      ) : (
        <section className="fiszka" aria-label="Fiszka">
          <p className="muted">
            Na dziś zostało: {stan.powtorek} do powtórki, {stan.nowych} nowych.
          </p>
          <Photo
            key={karta.id}
            zdjecie={karta.zdjecie}
            alt={karta.rodzaj === 'lot' ? 'Ptak do rozpoznania, w locie' : 'Ptak do rozpoznania, siedzący'}
            podpis={karta.rodzaj === 'lot' ? 'W locie' : 'Siedzący'}
            wazne
          />
          {!odkryta ? (
            <div className="fiszka__akcje">
              <Button ref={pokazRef} onClick={odkryj}>
                Pokaż odpowiedź
              </Button>
              <span className="muted fiszka__klawisz">Spacja</span>
            </div>
          ) : (
            <div className="fiszka__odpowiedz">
              <h2 className="fiszka__nazwa" tabIndex={-1} ref={odpowiedzRef}>
                {karta.gatunek.pl}
              </h2>
              <p className="fiszka__lat">
                <em>{karta.gatunek.lat}</em> (ang. {karta.gatunek.en}), {karta.gatunek.grupa}
              </p>
              <ul className="fiszka__cechy">
                {karta.gatunek.cechy.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <Link href={`/gatunki/${karta.gatunek.id}`} className="text-link">
                Karta gatunku: {karta.gatunek.pl}
              </Link>
              <div className="fiszka__oceny" role="group" aria-label="Jak mi poszło?">
                {OCENY.map(({ ocena, etykieta, klawisz }) => {
                  const due = planista.next(kartaFsrs(fiszki[karta.id], new Date(teraz)), new Date(teraz), ocena).card.due;
                  const opisId = `ocena-${ocena}`;
                  return (
                    <div key={ocena} className="fiszka__ocena">
                      <Button variant={ocena === Rating.Good ? 'primary' : 'secondary'} aria-describedby={opisId} onClick={() => ocenKarte(ocena)}>
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
        </section>
      )}
    </div>
  );
}
