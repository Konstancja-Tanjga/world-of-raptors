'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  dopasuj,
  KOLORY,
  najlepsze,
  NAJWIECEJ_KOLOROW,
  RODZAJE_ZACHOWAN,
  wielkosci,
  ZACHOWANIA,
  zachowaniaRodzaju,
  type CechyRozpoznania,
  type Dopasowanie,
  type Kolor,
  type Odniesienie,
  type Odpowiedzi,
  type RodzajZachowania,
  type Zachowanie,
} from '@/lib/rozpoznawanie';
import { REGIONY, type Region, type Zdjecie } from '@/lib/types';
import { odmiana } from '@/lib/odmiana';
import { polozenie } from '@/lib/zdjecia';
import { Button, Checkbox, Progress, RadioGroup, StateBlock } from './ds';
import { NazwaGatunku } from './NazwaPtaka';

/** A species as the wizard shows it: what the steps compare, its names and a thumbnail. */
export type GatunekRozpoznania = CechyRozpoznania & {
  pl: string;
  lat: string;
  /** In flight and perched; the results show the one that fits what the bird was doing. */
  zdjecia: { lot: Zdjecie | null; siedzacy: Zdjecie | null };
};

const KROKI = ['gdzie', 'wielkosc', 'kolory', 'zachowanie'] as const;
type Krok = (typeof KROKI)[number] | 'wyniki';

const PYTANIA: Record<(typeof KROKI)[number], string> = {
  gdzie: 'Gdzie był ptak?',
  wielkosc: 'Jak duży był?',
  kolory: 'Jakie miał kolory?',
  zachowanie: 'Co robił?',
};

const cm = new Intl.NumberFormat('pl', { maximumFractionDigits: 0 });

/** Was the step answered (a skipped step has nothing)? */
function odpowiedziano(krok: (typeof KROKI)[number], o: Odpowiedzi) {
  if (krok === 'gdzie') return Boolean(o.region);
  if (krok === 'wielkosc') return Boolean(o.wielkosc);
  if (krok === 'kolory') return Boolean(o.kolory?.length);
  return Boolean(o.rodzaj);
}

function Powody({ d }: { d: Dopasowanie<GatunekRozpoznania> }) {
  const powody: string[] = [];
  if (d.wielkosc) powody.push(d.wielkosc === 'pasuje' ? 'wielkość pasuje' : d.wielkosc === 'blisko' ? 'wielkość zbliżona' : 'inna wielkość');
  if (d.kolory) powody.push(`kolory: ${d.kolory.trafione} z ${d.kolory.z}`);
  if (d.zachowanie) powody.push(d.zachowanie === 'pasuje' ? 'zachowanie pasuje' : 'zwykle robi co innego');
  if (!powody.length) return null;
  return <span className="rozpoznaj__powody">{powody.join(', ')}</span>;
}

function Karta({ d, wLocie }: { d: Dopasowanie<GatunekRozpoznania>; wLocie: boolean }) {
  const g = d.gatunek;
  const zdjecie = wLocie ? (g.zdjecia.lot ?? g.zdjecia.siedzacy) : (g.zdjecia.siedzacy ?? g.zdjecia.lot);
  return (
    <li>
      <Link href={`/gatunki/${g.id}`} className="karta-gatunku">
        <span className="karta-gatunku__foto">
          {zdjecie ? (
            // eslint-disable-next-line @next/next/no-img-element -- a Commons thumbnail, already sized
            <img src={zdjecie.src} alt="" loading="lazy" decoding="async" style={{ objectPosition: polozenie(zdjecie) }} />
          ) : (
            <span className="karta-gatunku__brak">Bez zdjęcia</span>
          )}
        </span>
        <span className="karta-gatunku__opis">
          <NazwaGatunku id={g.id} klasa="karta-gatunku__nazwa">
            {g.pl}
          </NazwaGatunku>
          <span className="karta-gatunku__lacina" translate="no" lang="la">
            {g.lat}
          </span>
          <Powody d={d} />
        </span>
      </Link>
    </li>
  );
}

/**
 * "Rozpoznaj krok po kroku": four questions, one at a time, each skippable
 * (where, how big, which colours, what it was doing), then the atlas species
 * that fit, best first, with what fits and what does not. The rules are in
 * lib/rozpoznawanie.ts; nothing is stored.
 */
export function Rozpoznaj({ gatunki, odniesienia }: { gatunki: GatunekRozpoznania[]; odniesienia: Odniesienie[] }) {
  const skala = useMemo(() => wielkosci(odniesienia), [odniesienia]);
  const [krok, setKrok] = useState<Krok>('gdzie');
  const [odp, setOdp] = useState<Odpowiedzi>({});
  const [wszystkie, setWszystkie] = useState(false);
  const naglowek = useRef<HTMLHeadingElement>(null);
  const pierwszy = useRef(true);

  // Focus follows the step, as in the lesson quiz; not on the first render, which would jump the page.
  useEffect(() => {
    if (pierwszy.current) {
      pierwszy.current = false;
      return;
    }
    naglowek.current?.focus();
  }, [krok]);

  const wyniki = useMemo(() => dopasuj(gatunki, odp, skala), [gatunki, odp, skala]);
  const numer = krok === 'wyniki' ? KROKI.length : KROKI.indexOf(krok);
  const dalej = () => setKrok(numer + 1 < KROKI.length ? KROKI[numer + 1] : 'wyniki');
  const wstecz = () => setKrok(KROKI[Math.max(0, numer - 1)]);
  const odNowa = () => {
    setOdp({});
    setWszystkie(false);
    setKrok('gdzie');
  };

  if (krok === 'wyniki') {
    const { najlepsze: n, reszta } = najlepsze(wyniki);
    const wLocie = odp.rodzaj === 'lot';
    return (
      <div className="rozpoznaj stack">
        <h2 className="rozpoznaj__pytanie" tabIndex={-1} ref={naglowek}>
          {n.length === 1 ? 'Najbardziej pasuje' : 'Najbardziej pasują'}
        </h2>
        {wyniki.length === 0 ? (
          <StateBlock
            state="empty"
            title="Żaden gatunek z atlasu nie pasuje"
            description="Może to nie drapieżnik ani sowa, albo coś łatwo było ocenić inaczej, na przykład wielkość pod niebem. Zmień albo pomiń któreś odpowiedzi."
            action={
              <Button size="sm" variant="secondary" onClick={wstecz}>
                Wróć do pytań
              </Button>
            }
            scope="section"
          />
        ) : (
          <>
            <p className="muted">
              Sprawdź na karcie gatunku sylwetkę i podobne gatunki. Wielkość i kolory pod niebem łatwo ocenić inaczej, więc
              gatunki z sąsiednią wielkością albo częścią kolorów zostają na liście.
            </p>
            <ul className="atlas__karty">
              {n.map((d) => (
                <Karta key={d.gatunek.id} d={d} wLocie={wLocie} />
              ))}
            </ul>
            {reszta.length > 0 &&
              (wszystkie ? (
                <section className="stack" aria-labelledby="rozpoznaj-reszta">
                  <h3 id="rozpoznaj-reszta" className="checklist__naglowek">
                    Pasują mniej
                  </h3>
                  <ul className="atlas__karty">
                    {reszta.map((d) => (
                      <Karta key={d.gatunek.id} d={d} wLocie={wLocie} />
                    ))}
                  </ul>
                </section>
              ) : (
                <div>
                  <Button variant="secondary" onClick={() => setWszystkie(true)}>
                    Pokaż mniej pasujące ({reszta.length})
                  </Button>
                </div>
              ))}
          </>
        )}
        <div className="rozpoznaj__przyciski">
          <Button variant="secondary" onClick={wstecz}>
            Zmień odpowiedzi
          </Button>
          <Button variant="ghost" onClick={odNowa}>
            Zacznij od nowa
          </Button>
        </div>
      </div>
    );
  }

  const kolory = odp.kolory ?? [];
  const lot = odp.rodzaj && odp.rodzaj !== 'noc' ? odp.rodzaj : null;
  const ostatni = numer === KROKI.length - 1;
  const najlepiej = najlepsze(wyniki).najlepsze.length;

  return (
    <div className="rozpoznaj stack">
      <div className="rozpoznaj__postep">
        <Progress label={`Krok ${numer + 1} z ${KROKI.length}`} value={numer + 1} max={KROKI.length} size="sm" />
      </div>
      <h2 className="rozpoznaj__pytanie" tabIndex={-1} ref={naglowek}>
        {PYTANIA[krok]}
      </h2>

      <div className="rozpoznaj__odpowiedz">
        {krok === 'gdzie' && (
          <RadioGroup
            legend="Region"
            value={odp.region ?? ''}
            onChange={(v) => setOdp({ ...odp, region: v as Region })}
            options={REGIONY.map((r) => ({ value: r.value, label: r.label }))}
          />
        )}

        {krok === 'wielkosc' && (
          <RadioGroup
            legend="Wielkość w porównaniu ze znanym ptakiem"
            description="Długość od dzioba do końca ogona. Pod niebem ptak zwykle wydaje się mniejszy, niż jest."
            value={odp.wielkosc ?? ''}
            onChange={(v) => setOdp({ ...odp, wielkosc: v })}
            options={skala.map((w, i) => ({
              value: w.id,
              label: i === skala.length - 1 ? `Jak ${w.pl.toLowerCase()} albo większy` : `Jak ${w.pl.toLowerCase()}`,
              description:
                i === 0
                  ? `do ok. ${cm.format(w.do)} cm`
                  : w.do === Infinity
                    ? `ponad ok. ${cm.format(w.od)} cm`
                    : `ok. ${cm.format(w.od)}–${cm.format(w.do)} cm`,
            }))}
          />
        )}

        {krok === 'kolory' && (
          <fieldset className="rozpoznaj__kolory">
            <legend className="rozpoznaj__legenda">Wybierz najwyżej {NAJWIECEJ_KOLOROW} kolory, które rzucały się w oczy</legend>
            {KOLORY.map((k) => {
              const zaznaczony = kolory.includes(k.value);
              return (
                <Checkbox
                  key={k.value}
                  checked={zaznaczony}
                  disabled={!zaznaczony && kolory.length >= NAJWIECEJ_KOLOROW}
                  onChange={() =>
                    setOdp({
                      ...odp,
                      kolory: zaznaczony ? kolory.filter((x) => x !== k.value) : [...kolory, k.value as Kolor],
                    })
                  }
                  label={
                    <span className="rozpoznaj__kolor">
                      <span className={`rozpoznaj__probka rozpoznaj__probka--${k.value}`} aria-hidden="true" />
                      {k.label}
                    </span>
                  }
                />
              );
            })}
          </fieldset>
        )}

        {krok === 'zachowanie' && (
          <>
            <RadioGroup
              legend="Co robił ptak"
              value={odp.rodzaj ?? ''}
              onChange={(v) => setOdp({ ...odp, rodzaj: v as RodzajZachowania, zachowanie: undefined })}
              options={RODZAJE_ZACHOWAN.map((r) => ({ value: r.value, label: r.label }))}
            />
            {lot && (
              <RadioGroup
                key={lot}
                legend={lot === 'lot' ? 'Jak leciał' : 'Gdzie siedział'}
                description="Jeśli nie wiesz, przejdź dalej."
                value={odp.zachowanie ?? ''}
                onChange={(v) => setOdp({ ...odp, zachowanie: v as Zachowanie })}
                options={ZACHOWANIA.filter((z) => zachowaniaRodzaju(lot).includes(z.value)).map((z) => ({
                  value: z.value,
                  label: z.label,
                }))}
              />
            )}
          </>
        )}
      </div>

      <p className="rozpoznaj__licznik" aria-live="polite">
        {najlepiej === 0
          ? 'Na razie nie pasuje żaden gatunek z atlasu.'
          : `Na razie najlepiej ${odmiana(najlepiej, ['pasuje', 'pasują', 'pasuje'])} ${najlepiej} ${odmiana(najlepiej, ['gatunek', 'gatunki', 'gatunków'])}.`}
      </p>

      <div className="rozpoznaj__przyciski">
        <Button onClick={dalej}>
          {ostatni ? (odpowiedziano(krok, odp) ? 'Pokaż wyniki' : 'Pomiń i pokaż wyniki') : odpowiedziano(krok, odp) ? 'Dalej' : 'Pomiń'}
        </Button>
        {numer > 0 && (
          <Button variant="secondary" onClick={wstecz}>
            Wstecz
          </Button>
        )}
      </div>
    </div>
  );
}
