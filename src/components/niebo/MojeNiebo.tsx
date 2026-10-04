'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StateBlock } from '../ds';
import { useOstrzezenieZapisu } from '../useOstrzezenieZapisu';
import type { Gwiazdozbior } from '@/lib/gwiazdozbiory';
import { kluczGwiazdozbioru, kluczMistrza, kluczNaszywki, NASZYWKI, zdobyteWStanie, type StrukturaNieba } from '@/lib/odznaki';
import { odmiana } from '@/lib/odmiana';
import { useStanNieba, useZdobyte, type Zdobyte } from '@/lib/zdobyte';
import { MapaGwiazdozbiorow, type StanGwiazdozbioru } from './MapaGwiazdozbiorow';
import { Naszywka } from './Naszywka';
import { OBRACZKI } from './Obraczka';
import type { Rysunek } from './rysunek';

const DATA = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
const zDaty = (d: string) => DATA.format(new Date(`${d}T12:00:00`));

/**
 * "Moje niebo": the constellations, my life list with each species' rings,
 * and the wall of patches. Constellations and patches stay earned once
 * earned (with their date, from zdobyte.ts); the rings show what I know now.
 * Whatever was earned since my last visit plays its moment once, when it
 * comes into view; on the first visit that is everything earned so far.
 *
 * The drawings come from the server, so the silhouette generator stays out of
 * this bundle: `gwiazdozbiory`, each module's constellation; `sylwetki`, each
 * species' silhouette for the life list; and `rysunki`, the birds of the
 * patches.
 */
export function MojeNiebo({
  struktura,
  gwiazdozbiory,
  sylwetki,
  rysunki,
}: {
  struktura: StrukturaNieba;
  gwiazdozbiory: Record<string, Gwiazdozbior>;
  sylwetki: Record<string, ReactNode>;
  rysunki: Record<string, Rysunek>;
}) {
  const stan = useStanNieba(struktura);
  const { zdobyte, oznaczPokazane } = useZdobyte();
  const ostrzez = useOstrzezenieZapisu();
  // What is new on this visit, decided once when the stores have been read,
  // so the moments keep playing while the store records them as shown.
  const [nowe, setNowe] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!stan || !zdobyte || nowe) return;
    const teraz = zdobyteWStanie(stan);
    const zapisane = Object.keys(zdobyte).filter((k) => k !== 'start');
    // The stores can only be read in the browser, after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowe(new Set([...teraz, ...zapisane].filter((k) => !zdobyte[k]?.pokazana)));
  }, [stan, zdobyte, nowe]);

  const pokazane = useCallback((klucze: string[]) => ostrzez(oznaczPokazane(klucze)), [oznaczPokazane, ostrzez]);

  const stanyMapy = useMemo(() => {
    const zdobyteTeraz: Zdobyte = zdobyte ?? {};
    const wynik: Record<string, StanGwiazdozbioru> = {};
    for (const m of struktura.moduly) {
      const zapalony = Boolean(stan?.moduly[m.slug]?.zaliczony || zdobyteTeraz[kluczGwiazdozbioru(m.slug)]);
      const opanowany = Boolean(stan?.moduly[m.slug]?.opanowany || zdobyteTeraz[kluczMistrza(m.slug)]);
      wynik[m.slug] = {
        zapalony,
        opanowany,
        nowyZapalony: zapalony && Boolean(nowe?.has(kluczGwiazdozbioru(m.slug))),
        nowyMistrz: opanowany && Boolean(nowe?.has(kluczMistrza(m.slug))),
      };
    }
    return wynik;
  }, [struktura, stan, zdobyte, nowe]);

  if (!stan || !zdobyte || !nowe) {
    return <StateBlock state="loading" title="Wczytywanie mojego nieba" scope="section" />;
  }

  const lifery = stan.lifery;
  const komplety = struktura.gatunki.filter((g) => {
    const o = stan.gatunki[g.id];
    return o.znam && o.rozpoznaje && o.widzialam;
  }).length;
  const naszywkiZdobyte = NASZYWKI.filter((n) => stan.naszywki[n.id].zdobyta || zdobyte[kluczNaszywki(n.id)]).length;
  // New patches are sewn on one after another, in the wall's order.
  const doPrzyszycia = NASZYWKI.filter((n) => nowe.has(kluczNaszywki(n.id))).map((n) => n.id);

  return (
    <>
      <section className="moje-niebo__sekcja" aria-labelledby="gwiazdozbiory">
        <header className="sekcja">
          <p className="eyebrow">Moduły</p>
          <h2 id="gwiazdozbiory" className="sekcja__tytul">
            Gwiazdozbiory
          </h2>
          <p className="sekcja__lead">
            Zaliczony moduł zapala swój gwiazdozbiór: ptaka z modułu, narysowanego gwiazdami w punktach jego sylwetki. Złota
            gwiazda przychodzi, kiedy rozpoznaję ptaki, których moduł uczy. Te gwiazdozbiory świecą też na starcie, na nocnym
            niebie.
          </p>
        </header>
        <MapaGwiazdozbiorow moduly={struktura.moduly} gwiazdozbiory={gwiazdozbiory} stany={stanyMapy} pokazane={pokazane} />
      </section>

      <section className="moje-niebo__sekcja" aria-labelledby="lista-zyciowa">
        <header className="sekcja sekcja--wiersz">
          <div>
            <p className="eyebrow">Gatunki</p>
            <h2 id="lista-zyciowa" className="sekcja__tytul">
              Lista życiowa
            </h2>
            <p className="sekcja__lead">
              Każdy gatunek zbiera trzy obrączki: <strong>Znam</strong> (ukończona lekcja, która go uczy),{' '}
              <strong>Rozpoznaję</strong> (wszystkie jego fiszki zapamiętane) i <strong>Widziałam</strong> (jest na mojej
              checkliście). Gatunki, które widziałam, są złote.
            </p>
          </div>
          <dl className="moje-niebo__liczby">
            <div>
              <dt>{odmiana(lifery, ['gatunek widziany', 'gatunki widziane', 'gatunków widzianych'])}</dt>
              <dd>{lifery}</dd>
            </div>
            <div>
              <dt>{odmiana(komplety, ['komplet obrączek', 'komplety obrączek', 'kompletów obrączek'])}</dt>
              <dd>{komplety}</dd>
            </div>
          </dl>
        </header>
        <ul className="lista-zyciowa">
          {struktura.gatunki.map((g) => {
            const o = stan.gatunki[g.id];
            const obraczek = [o.znam, o.rozpoznaje, o.widzialam].filter(Boolean).length;
            const wyglad = o.widzialam ? 'zloto' : obraczek === 2 ? 'atrament' : obraczek === 1 ? 'szkic' : 'kontur';
            return (
              <li key={g.id} data-wyglad={wyglad}>
                <Link href={`/gatunki/${g.id}`} className="lista-zyciowa__gatunek">
                  {sylwetki[g.id]}
                  <span className="lista-zyciowa__nazwa">{g.pl}</span>
                  <span className="lista-zyciowa__obraczki" aria-label={`Obrączki: ${OBRACZKI.filter((r) => o[r.rodzaj]).map((r) => r.nazwa).join(', ') || 'jeszcze żadnej'}`}>
                    {OBRACZKI.map((r) => (
                      <span key={r.rodzaj} className="lista-zyciowa__obraczka" data-rodzaj={r.rodzaj} data-zdobyta={o[r.rodzaj] ? '' : undefined} />
                    ))}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="moje-niebo__sekcja" aria-labelledby="naszywki">
        <header className="sekcja sekcja--wiersz">
          <div>
            <p className="eyebrow">Umiejętności</p>
            <h2 id="naszywki" className="sekcja__tytul">
              Naszywki
            </h2>
            <p className="sekcja__lead">
              Za to, co naprawdę umiem. Brakujące mają swoje miejsca na ścianie, z opisem, co trzeba zrobić, i z tym, ile już
              mam.
            </p>
          </div>
          <p className="moje-niebo__licznik">
            <span className="moje-niebo__liczba">{naszywkiZdobyte}</span> z {NASZYWKI.length}
          </p>
        </header>
        <ul className="sciana-naszywek">
          {NASZYWKI.map((n) => {
            const zapis = zdobyte[kluczNaszywki(n.id)];
            const zdobyta = stan.naszywki[n.id].zdobyta || Boolean(zapis);
            const [ile, z] = stan.naszywki[n.id].postep;
            return (
              <li key={n.id} className="sciana-naszywek__miejsce">
                <Naszywka
                  n={n}
                  ptaki={n.ptaki.map((id) => rysunki[id])}
                  zdobyta={zdobyta}
                  przyszyj={doPrzyszycia.includes(n.id)}
                  opoznienie={Math.max(0, doPrzyszycia.indexOf(n.id)) * 220}
                  przyszyta={() => pokazane([kluczNaszywki(n.id)])}
                />
                <span className="sciana-naszywek__nazwa">{n.nazwa}</span>
                {zdobyta ? (
                  <span className="sciana-naszywek__data">{zapis ? `zdobyta ${zDaty(zapis.data)}` : 'zdobyta dziś'}</span>
                ) : (
                  <span className="sciana-naszywek__postep">
                    {ile} z {z}
                  </span>
                )}
                <span className="sciana-naszywek__jak">{n.jak}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
