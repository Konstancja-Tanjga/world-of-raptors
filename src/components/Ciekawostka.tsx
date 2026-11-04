'use client';

import Link from 'next/link';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { ciekawostkiDla, type MiejsceCiekawostki } from '@/lib/ciekawostki';
import type { CiekawostkaDoPokazania } from '@/lib/types';
import { Button, StateBlock } from './ds';

const KLUCZ = 'wor:ciekawostki:widziane';

function widziane(): string[] {
  try {
    const v: unknown = JSON.parse(window.localStorage.getItem(KLUCZ) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function zapamietaj(id: string) {
  try {
    const lista = widziane().filter((x) => x !== id);
    window.localStorage.setItem(KLUCZ, JSON.stringify([...lista, id].slice(-200)));
  } catch {
    // Remembering is a nicety; without storage the card just may repeat sooner.
  }
}

/**
 * Picks the next curiosity: an unseen relevant one, else an unseen one from
 * the rest, else the one seen longest ago. So each visit shows something new
 * until the whole set has been seen, then it starts over.
 */
function wybierz(preferowane: CiekawostkaDoPokazania[], pozostale: CiekawostkaDoPokazania[], pomin?: string) {
  const byly = widziane();
  const kandydaci = [...preferowane, ...pozostale].filter((c) => c.id !== pomin);
  if (kandydaci.length === 0) return preferowane[0] ?? pozostale[0] ?? null;
  const losowo = (xs: CiekawostkaDoPokazania[]) => xs[Math.floor(Math.random() * xs.length)];
  const nowe = (xs: CiekawostkaDoPokazania[]) => xs.filter((c) => c.id !== pomin && !byly.includes(c.id));
  const nowePreferowane = nowe(preferowane);
  if (nowePreferowane.length) return losowo(nowePreferowane);
  const nowePozostale = nowe(pozostale);
  if (nowePozostale.length) return losowo(nowePozostale);
  // Everything seen: the one seen longest ago comes back first.
  return [...kandydaci].sort((a, b) => byly.indexOf(a.id) - byly.indexOf(b.id))[0];
}

/**
 * **bold**, *italic*, `code`. No links: a curiosity stands alone and its one
 * way on is "Czytaj dalej", so a stray [link](…) in content/ciekawostki.json
 * shows up literally instead of being hidden.
 */
function inline(tekst: string): ReactNode[] {
  const czesci: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g;
  let ostatni = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tekst))) {
    if (m.index > ostatni) czesci.push(tekst.slice(ostatni, m.index));
    const k = czesci.length;
    if (m[1]) czesci.push(<strong key={k}>{m[1]}</strong>);
    else if (m[2]) czesci.push(<em key={k}>{m[2]}</em>);
    else czesci.push(<code key={k}>{m[3]}</code>);
    ostatni = re.lastIndex;
  }
  czesci.push(tekst.slice(ostatni));
  return czesci;
}

/** Every curiosity, fetched once per page load and shared by the cards on it. */
let wszystkie: Promise<CiekawostkaDoPokazania[]> | null = null;

function pobierz() {
  wszystkie ??= fetch('/ciekawostki').then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<CiekawostkaDoPokazania[]>;
  });
  // A failed fetch is not kept, so the next card (or page) tries again.
  wszystkie.catch(() => (wszystkie = null));
  return wszystkie;
}

/**
 * A rotating "did you know" card. Chosen in the browser after mount: the
 * pages are static, so a server-side pick would be frozen at build time.
 * The set comes from the static /ciekawostki, so it is not in every page's
 * HTML; the card ranks it for its place (a species, a module, a lesson).
 *
 * Not a Big Hat Card, so the one-action rule does not apply: a passage set
 * large between two hairlines, with the way to the lesson it comes from and a
 * button for another one.
 */
export function Ciekawostka({ modul, lekcja, gatunek }: MiejsceCiekawostki) {
  const [zestaw, setZestaw] = useState<ReturnType<typeof ciekawostkiDla> | null>(null);
  const [biezaca, setBiezaca] = useState<CiekawostkaDoPokazania | null>(null);
  const [blad, setBlad] = useState(false);
  const tytulId = useId();

  useEffect(() => {
    let aktualne = true;
    pobierz().then(
      (lista) => {
        if (!aktualne) return;
        const z = ciekawostkiDla(lista, { modul, lekcja, gatunek });
        // Picking needs localStorage and randomness, so it can only happen after mount.
        const c = wybierz(z.preferowane, z.pozostale);
        if (c) zapamietaj(c.id);
        setZestaw(z);
        setBiezaca(c);
      },
      () => aktualne && setBlad(true),
    );
    return () => {
      aktualne = false;
    };
  }, [modul, lekcja, gatunek]);

  const nastepna = () => {
    if (!biezaca || !zestaw) return;
    const c = wybierz(zestaw.preferowane, zestaw.pozostale, biezaca.id);
    if (c) {
      zapamietaj(c.id);
      setBiezaca(c);
    }
  };

  return (
    <aside className="ciekawostka" aria-labelledby={tytulId}>
      <p className="ciekawostka__tytul" id={tytulId}>
        Ciekawostka
      </p>
      {biezaca ? (
        <>
          {/* The live region stays mounted, so screen readers announce the next one; the passage inside
              is keyed by the curiosity, so a new one enters with its own fade instead of swapping in place. */}
          <div aria-live="polite">
            <p key={biezaca.id} className="ciekawostka__tekst">
              {inline(biezaca.tekst)}
            </p>
          </div>
          <div className="ciekawostka__stopka">
            <Link href={biezaca.href} className="ciekawostka__zrodlo">
              Czytaj dalej: {biezaca.zrodlo}
            </Link>
            <Button variant="secondary" size="sm" onClick={nastepna}>
              Pokaż inną ciekawostkę
            </Button>
          </div>
        </>
      ) : blad ? (
        <StateBlock state="error" title="Nie udało się wczytać ciekawostki" description="Spróbuj odświeżyć stronę." scope="inline" />
      ) : (
        // Chosen after mount (see above); the block keeps its place meanwhile.
        <StateBlock state="loading" title="Wczytywanie ciekawostki" scope="inline" />
      )}
    </aside>
  );
}
