'use client';

import Link from 'next/link';
import { useEffect, useId, useState, type ReactNode } from 'react';
import type { CiekawostkaDoPokazania } from '@/lib/types';
import { Button, Card, StateBlock } from './ds';

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
 * **bold**, *italic*, `code`; links in the text become emphasis, because the
 * card keeps one action (the "Więcej" link) as Big Hat's Card contract asks.
 */
function inline(tekst: string): ReactNode[] {
  const czesci: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\(([^)]+)\)/g;
  let ostatni = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tekst))) {
    if (m.index > ostatni) czesci.push(tekst.slice(ostatni, m.index));
    const k = czesci.length;
    if (m[1]) czesci.push(<strong key={k}>{m[1]}</strong>);
    else if (m[2]) czesci.push(<em key={k}>{m[2]}</em>);
    else if (m[3]) czesci.push(<code key={k}>{m[3]}</code>);
    else czesci.push(<em key={k}>{m[4]}</em>);
    ostatni = re.lastIndex;
  }
  czesci.push(tekst.slice(ostatni));
  return czesci;
}

/**
 * A rotating "did you know" card. Chosen in the browser after mount: the
 * pages are static, so a server-side pick would be frozen at build time.
 *
 * Built on Big Hat's Card, which is for "content the user might act on as a
 * unit" and not for "cards with two actions inside": the card holds the
 * curiosity and its one action (read more in the lesson); "Inna ciekawostka"
 * sits outside it.
 */
export function Ciekawostka({
  preferowane,
  pozostale,
}: {
  preferowane: CiekawostkaDoPokazania[];
  pozostale: CiekawostkaDoPokazania[];
}) {
  const [biezaca, setBiezaca] = useState<CiekawostkaDoPokazania | null>(null);
  const tytulId = useId();

  useEffect(() => {
    const c = wybierz(preferowane, pozostale);
    if (c) zapamietaj(c.id);
    // Picking needs localStorage and randomness, so it can only happen after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBiezaca(c);
  }, [preferowane, pozostale]);

  const nastepna = () => {
    if (!biezaca) return;
    const c = wybierz(preferowane, pozostale, biezaca.id);
    if (c) {
      zapamietaj(c.id);
      setBiezaca(c);
    }
  };

  return (
    <aside className="ciekawostka" aria-labelledby={tytulId}>
      <Card elevation="raised" accent="info">
        <div className="ciekawostka__tresc">
          <p className="ciekawostka__tytul" id={tytulId}>
            Ciekawostka
          </p>
          {biezaca ? (
            <>
              <p className="ciekawostka__tekst" aria-live="polite">
                {inline(biezaca.tekst)}
              </p>
              <Link href={biezaca.href} className="text-link ciekawostka__zrodlo">
                Więcej: {biezaca.zrodlo}
              </Link>
            </>
          ) : (
            // Chosen after mount (see above); the card keeps its place meanwhile.
            <StateBlock state="loading" title="Wczytywanie ciekawostki" scope="inline" />
          )}
        </div>
      </Card>
      {biezaca && (
        <div className="ciekawostka__akcje">
          <Button variant="secondary" size="sm" onClick={nastepna}>
            Inna ciekawostka
          </Button>
        </div>
      )}
    </aside>
  );
}
