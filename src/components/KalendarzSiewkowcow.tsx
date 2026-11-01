'use client';

import { useState } from 'react';
import { krokTygodnia, opisTygodnia, stanGatunku, TYGODNIE, type GatunekKalendarza } from '@/lib/kalendarz';
import { Badge, Card, Slider } from './ds';

export type GatunekKalendarzaZNazwa = GatunekKalendarza & { pl: string };

/** Mid-August, when adults and the first juveniles pass together: the week that shows the most. */
const START = 6;

/**
 * B9's age and moult calendar: a slider through the autumn weeks on the
 * Polish Baltic coast and, for each wader, who passes then (adults or
 * juveniles), in which plumage, and whether numbers peak. Periods whose age
 * split the sources do not give are marked as approximate. Nothing is stored.
 */
export function KalendarzSiewkowcow({ gatunki, kroki, obszar }: { gatunki: GatunekKalendarzaZNazwa[]; kroki: string[]; obszar: string }) {
  const [tydzien, setTydzien] = useState(START);
  const krok = krokTygodnia(tydzien);

  return (
    <Card>
      <div className="cwiczenie kalendarz">
        <Slider label="Tydzień jesiennego przelotu" min={0} max={TYGODNIE - 1} value={tydzien} onChange={setTydzien} formatValue={opisTygodnia} description={obszar} />
        <p className="cwiczenie__tytul" aria-live="polite">
          Dane z okresu {kroki[krok]}
        </p>
        <ul className="kalendarz__lista">
          {gatunki.map((g) => {
            const { okresy, szczyt } = stanGatunku(g, krok);
            return (
              <li key={g.id} className="kalendarz__gatunek">
                <p className="kalendarz__nazwa">
                  <b>{g.pl[0].toLocaleUpperCase('pl') + g.pl.slice(1)}</b>
                  {szczyt && <Badge tone="success">Szczyt przelotu</Badge>}
                </p>
                {okresy.length ? (
                  <ul className="kalendarz__okresy">
                    {okresy.map((o, i) => (
                      <li key={i}>
                        <Badge tone={o.kto === 'dorosle' ? 'neutral' : 'info'}>{o.kto === 'dorosle' ? 'Dorosłe' : 'Młode'}</Badge>{' '}
                        {o.liczebnosc === 'nielicznie' && 'Nieliczne. '}
                        {o.szata}.{o.przyblizone && <span className="kalendarz__uwaga"> Podział na wiek w przybliżeniu.</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="kalendarz__brak">W tych dniach źródła nie notują przelotu.</p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}
