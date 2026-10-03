'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { SegmentedControl } from '../ds';
import { useOstrzezenieZapisu } from '../useOstrzezenieZapisu';
import { jakoPora, PORY_DNIA, type PoraDnia } from '@/lib/niebo';
import { usePoraNieba, zapiszPore } from '@/lib/poraNieba';
import { useMniejRuchu } from '@/lib/useMedia';
import { Niebo } from './Niebo';

const NAZWY_PORY: Record<PoraDnia, string> = { swit: 'Świt', dzien: 'Dzień', zmierzch: 'Zmierzch', noc: 'Noc' };
const TERAZ = 'teraz';
/** "Teraz" (the clock), then the four times of day. */
const WYBOR = [{ value: TERAZ, label: 'Teraz' }, ...PORY_DNIA.map((p) => ({ value: p, label: NAZWY_PORY[p] }))];

/**
 * The opening scene: the sky at this hour, or at the hour I chose, which
 * stays (in this browser) until I change it; "Teraz" goes back to the clock.
 * The title, the actions and the figures are rendered on the server and
 * passed in; the sky, the line about the hour and the scene's controls live
 * here, so a new choice shows at once.
 */
export function NieboStartu({
  wybranaNaSerwerze,
  zegar,
  pory,
  liczby,
  children,
}: {
  /** The choice the server rendered with (from the address or the cookie); null: by the clock. */
  wybranaNaSerwerze: PoraDnia | null;
  /** The time of day by the clock when the page was rendered. */
  zegar: PoraDnia;
  /** For each time of day: the line over the title and the sky's description for screen readers. */
  pory: Record<PoraDnia, { linia: string; opis: string }>;
  /** The course in figures, along the bottom of the scene. */
  liczby: ReactNode;
  /** The title, the lead and the actions. */
  children: ReactNode;
}) {
  const wybrana = usePoraNieba(wybranaNaSerwerze);
  const pora = wybrana ?? zegar;
  const [pauza, setPauza] = useState(false);
  const ruch = !useMniejRuchu();
  const ostrzez = useOstrzezenieZapisu();

  // A `?pora=` link (the About page has four) is a choice too: remember it.
  // The address stays as it is (the server reads it first anyway).
  useEffect(() => {
    const zAdresu = jakoPora(new URLSearchParams(window.location.search).get('pora'));
    if (zAdresu) zapiszPore(zAdresu, { zAdresu: true }).then(ostrzez);
  }, [ostrzez]);

  return (
    <section className="niebo scena" data-scena data-pora={pora} aria-labelledby="tytul-startu">
      <Niebo pora={pora} opis={pory[pora].opis} pauza={pauza} />
      <div className="niebo__tresc">
        <p className="niebo__pora">{pory[pora].linia}</p>
        {children}
      </div>
      <div className="niebo__dol">
        {liczby}
        <div className="niebo__sterowanie">
          <div className="scroll-x">
            <SegmentedControl
              legend="Pora nieba"
              showLegend
              size="sm"
              options={WYBOR}
              value={wybrana ?? TERAZ}
              onChange={(v) => zapiszPore(v === TERAZ ? null : jakoPora(v)).then(ostrzez)}
            />
          </div>
          {ruch && (
            <button type="button" className="niebo__pauza" onClick={() => setPauza((p) => !p)}>
              {pauza ? 'Wznów ruch' : 'Zatrzymaj ruch'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
