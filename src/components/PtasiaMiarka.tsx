'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ocenKolejnosc, przesun, srodek, wymieszaj } from '@/lib/cwiczenia';
import { Badge, Button, Card, StateBlock } from './ds';

export type PtakDoMiarki = {
  id: string;
  pl: string;
  /** The measured range in cm: wingspan or body length, as the exercise asks. */
  zakres: [number, number];
  /** Its silhouette, drawn on the server (raptors only); the exercise sizes it to scale. */
  rysunek?: ReactNode;
};

const MIARY = {
  rozpietosc: { nazwa: 'rozpiętości skrzydeł', jednostka: 'rozpiętość' },
  dlugosc: { nazwa: 'długości ciała', jednostka: 'długość' },
} as const;

/**
 * B7's bird yardstick: a handful of birds in a random order, to be put in
 * order of size, smallest first, with "Wyżej" and "Niżej" (no dragging, so
 * the keyboard and the finger do the same thing). Checking marks each place
 * and reveals every bird's measure to scale, so the reader sees how far off
 * a guess was, not only that it was; the measures stay while they correct it.
 */
export function PtasiaMiarka({ ptaki, miara }: { ptaki: PtakDoMiarki[]; miara: keyof typeof MIARY }) {
  // Shuffled after mount: the server's order is the author's, which may be the answer.
  const [kolejnosc, setKolejnosc] = useState<string[] | null>(null);
  const [sprawdzone, setSprawdzone] = useState<boolean[] | null>(null);
  // Once checked, the measures stay in view while the reader corrects the order.
  const [odkryte, setOdkryte] = useState(false);
  const [fokus, setFokus] = useState<{ id: string; o: -1 | 1 } | null>(null);
  const przyciski = useRef(new Map<string, HTMLButtonElement>());
  const wielkosc = Object.fromEntries(ptaki.map((p) => [p.id, srodek(p.zakres)]));
  const maks = Math.max(...ptaki.map((p) => p.zakres[1]));
  const ptak = new Map(ptaki.map((p) => [p.id, p]));

  useEffect(() => {
    // Shuffling is random, so it can only happen after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKolejnosc(wymieszaj(ptaki.map((p) => p.id)));
  }, [ptaki]);

  // A moved bird keeps focus on the button that moved it, or on the other one at the end of the list.
  useEffect(() => {
    if (!fokus) return;
    const ten = przyciski.current.get(`${fokus.id}${fokus.o}`);
    (ten && !ten.disabled ? ten : przyciski.current.get(`${fokus.id}${-fokus.o}`))?.focus();
  }, [fokus, kolejnosc]);

  if (!kolejnosc) return <StateBlock state="loading" title="Układam ptaki" scope="inline" />;

  const wszystkieDobrze = sprawdzone?.every(Boolean) ?? false;
  const dobrych = sprawdzone?.filter(Boolean).length ?? 0;
  const przesunPtaka = (i: number, o: -1 | 1) => {
    setKolejnosc(przesun(kolejnosc, i, o));
    setFokus({ id: kolejnosc[i], o });
    if (sprawdzone) setSprawdzone(null);
  };
  const odNowa = () => {
    setKolejnosc(wymieszaj(ptaki.map((p) => p.id)));
    setSprawdzone(null);
    setOdkryte(false);
  };
  const sprawdz = () => {
    setSprawdzone(ocenKolejnosc(kolejnosc, wielkosc));
    setOdkryte(true);
  };

  return (
    <Card
      actions={
        wszystkieDobrze ? (
          <Button variant="secondary" onClick={odNowa}>
            Ułóż od nowa
          </Button>
        ) : (
          <Button onClick={sprawdz}>Sprawdź</Button>
        )
      }
    >
      <div className="cwiczenie">
        <p className="cwiczenie__polecenie">
          Ułóż ptaki według {MIARY[miara].nazwa}, od najmniejszego. Przesuwaj je przyciskami „Wyżej” i „Niżej”.
        </p>
        <ol className="ptasia-miarka">
          {kolejnosc.map((id, i) => {
            const p = ptak.get(id)!;
            const ocena = sprawdzone?.[i];
            return (
              <li key={id} className="ptasia-miarka__ptak">
                <span className="ptasia-miarka__nazwa">{p.pl}</span>
                <span className="ptasia-miarka__przyciski">
                  {([-1, 1] as const).map((o) => (
                    <Button
                      key={o}
                      ref={(el) => {
                        if (el) przyciski.current.set(`${id}${o}`, el);
                        else przyciski.current.delete(`${id}${o}`);
                      }}
                      size="sm"
                      variant="secondary"
                      disabled={o < 0 ? i === 0 : i === kolejnosc.length - 1}
                      aria-label={`${o < 0 ? 'Wyżej' : 'Niżej'}: ${p.pl}`}
                      onClick={() => przesunPtaka(i, o)}
                    >
                      {o < 0 ? 'Wyżej' : 'Niżej'}
                    </Button>
                  ))}
                </span>
                {ocena !== undefined && (
                  <span className="ptasia-miarka__ocena">
                    <Badge tone={ocena ? 'success' : 'critical'}>{ocena ? 'Na miejscu' : 'Nie tutaj'}</Badge>
                  </span>
                )}
                {odkryte && (
                  <span className="ptasia-miarka__skala">
                    {p.rysunek && (
                      // As wide as the bird's largest wingspan on the bar's axis below it.
                      <span className="ptasia-miarka__rysunek" style={{ width: `${(p.zakres[1] / maks) * 100}%` }}>
                        {p.rysunek}
                      </span>
                    )}
                    <span className="ptasia-miarka__os" aria-hidden="true">
                      <span
                        className="ptasia-miarka__pasek"
                        style={{ left: `${(p.zakres[0] / maks) * 100}%`, width: `${((p.zakres[1] - p.zakres[0]) / maks) * 100}%` }}
                      />
                      <span className="ptasia-miarka__zero" style={{ width: `${(p.zakres[0] / maks) * 100}%` }} />
                    </span>
                    <span className="ptasia-miarka__wartosc">
                      {MIARY[miara].jednostka}: ok. {p.zakres[0]}–{p.zakres[1]} cm
                    </span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <p className="cwiczenie__wynik" aria-live="polite">
          {sprawdzone &&
            (wszystkieDobrze
              ? 'Wszystkie ptaki są na swoich miejscach.'
              : `Na swoim miejscu: ${dobrych} z ${kolejnosc.length}. Popraw kolejność i sprawdź jeszcze raz.`)}
        </p>
      </div>
    </Card>
  );
}
