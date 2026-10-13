'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { wymieszaj } from '@/lib/cwiczenia';
import { Badge, Button, Card, Progress, RadioGroup, StateBlock } from './ds';

export type PytanieSylwetki = {
  id: string;
  pl: string;
  lat: string;
  /** Its group, as one of `grupy`. */
  grupa: string;
  /** Its silhouette, drawn on the server and named without giving the species away. */
  rysunek: ReactNode;
  /** The species offered, the right one among them. */
  opcje: { id: string; pl: string }[];
};

type Krok = 'grupa' | 'gatunek';
type Etap = { nazwa: 'pytanie'; numer: number; krok: Krok; wybrana?: string; sprawdzona: boolean; brakWyboru: boolean } | { nazwa: 'wynik' };
const pytanie = (numer: number, krok: Krok): Etap => ({ nazwa: 'pytanie', numer, krok, sprawdzona: false, brakWyboru: false });

const PYTANIE: Record<Krok, string> = { grupa: 'Do której grupy należy ten ptak?', gatunek: 'A który to gatunek?' };

/**
 * B7's silhouette guess: one bird from below at a time, as it shows against
 * a bright sky. First its group (the eight of B1), then the species among
 * its look-alikes, so the reader practises the order the course teaches:
 * group from shape first, species second. Nothing is stored; the lesson's
 * quiz is what finishes the lesson.
 */
export function ZgadnijSylwetke({ pytania, grupy }: { pytania: PytanieSylwetki[]; grupy: string[] }) {
  // Shuffled after mount, so every visit asks in a new order.
  const [kolejnosc, setKolejnosc] = useState<PytanieSylwetki[] | null>(null);
  const [etap, setEtap] = useState<Etap>(pytanie(0, 'grupa'));
  const [wyniki, setWyniki] = useState<Record<Krok, boolean>[]>([]);
  const obszar = useRef<HTMLDivElement>(null);
  const wynikRef = useRef<HTMLParagraphElement>(null);
  const start = useRef(true);

  useEffect(() => {
    // Shuffling is random, so it can only happen after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKolejnosc(wymieszaj(pytania));
  }, [pytania]);

  // Focus follows the step (not on first render, which would pull the page to the exercise).
  const klucz = etap.nazwa === 'wynik' ? 'wynik' : `${etap.numer}-${etap.krok}`;
  useEffect(() => {
    if (start.current) {
      start.current = false;
      return;
    }
    if (klucz === 'wynik') wynikRef.current?.focus();
    else obszar.current?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus();
  }, [klucz]);

  if (!kolejnosc) return <StateBlock state="loading" title="Przygotowuję sylwetki" scope="inline" />;

  const odNowa = () => {
    setKolejnosc(wymieszaj(pytania));
    setWyniki([]);
    setEtap(pytanie(0, 'grupa'));
  };

  if (etap.nazwa === 'wynik') {
    const grup = wyniki.filter((w) => w.grupa).length;
    const gatunkow = wyniki.filter((w) => w.gatunek).length;
    return (
      <Card actions={<Button onClick={odNowa}>Jeszcze raz</Button>}>
        <div className="cwiczenie">
          <p className="cwiczenie__tytul" tabIndex={-1} ref={wynikRef}>
            Grupa: {grup} z {wyniki.length}, gatunek: {gatunkow} z {wyniki.length}
          </p>
          <p className="cwiczenie__polecenie">
            {grup === wyniki.length
              ? 'Wszystkie grupy rozpoznane po samym kształcie. Gatunek to już kwestia szczegółów: proporcji, palców i ogona.'
              : 'Pomylona grupa to sygnał, żeby wrócić do tabeli ośmiu grup i porównać skrzydła, ogon i głowę.'}
          </p>
        </div>
      </Card>
    );
  }

  const p = kolejnosc[etap.numer];
  const ostatnie = etap.numer === kolejnosc.length - 1;
  const poprawna = etap.krok === 'grupa' ? p.grupa : p.id;
  const opcje = etap.krok === 'grupa' ? grupy.map((g) => ({ value: g, label: g })) : p.opcje.map((o) => ({ value: o.id, label: o.pl }));
  const dobrze = etap.wybrana === poprawna;

  const sprawdz = () => {
    if (etap.wybrana === undefined) {
      setEtap({ ...etap, brakWyboru: true });
      return;
    }
    const nowe = [...wyniki];
    nowe[etap.numer] = { ...(nowe[etap.numer] ?? { grupa: false, gatunek: false }), [etap.krok]: dobrze };
    setWyniki(nowe);
    setEtap({ ...etap, sprawdzona: true });
  };
  const dalej = () => {
    if (etap.krok === 'grupa') setEtap(pytanie(etap.numer, 'gatunek'));
    else if (!ostatnie) setEtap(pytanie(etap.numer + 1, 'grupa'));
    else setEtap({ nazwa: 'wynik' });
  };
  const nazwaDalej = etap.krok === 'grupa' ? 'Teraz gatunek' : ostatnie ? 'Zobacz wynik' : 'Następna sylwetka';

  return (
    <Card actions={etap.sprawdzona ? <Button onClick={dalej}>{nazwaDalej}</Button> : <Button onClick={sprawdz}>Sprawdź</Button>}>
      <div className="cwiczenie" ref={obszar}>
        <Progress
          label="Postęp ćwiczenia"
          value={etap.numer + (etap.krok === 'gatunek' && etap.sprawdzona ? 1 : 0)}
          max={kolejnosc.length}
          valueText={`Sylwetka ${etap.numer + 1} z ${kolejnosc.length}`}
        />
        <div className="zgadnij-sylwetke__niebo">{p.rysunek}</div>
        <RadioGroup
          key={klucz}
          legend={PYTANIE[etap.krok]}
          name={`sylwetka-${klucz}`}
          value={etap.wybrana ?? ''}
          onChange={(v) => {
            if (!etap.sprawdzona) setEtap({ ...etap, wybrana: v, brakWyboru: false });
          }}
          error={etap.brakWyboru ? 'Wybierz odpowiedź, a potem sprawdź.' : undefined}
          options={opcje.map((o) => ({
            ...o,
            disabled: etap.sprawdzona,
            description: !etap.sprawdzona ? undefined : o.value === poprawna ? 'Poprawna odpowiedź' : o.value === etap.wybrana ? 'Twoja odpowiedź' : undefined,
          }))}
        />
        <div className="quiz__feedback" aria-live="polite">
          {etap.sprawdzona && (
            <>
              <Badge tone={dobrze ? 'success' : 'critical'}>{dobrze ? 'Dobrze' : 'Źle'}</Badge>
              <span>
                {etap.krok === 'grupa' ? (
                  dobrze ? (
                    'Tak, to ta grupa.'
                  ) : (
                    `Ten ptak należy do grupy „${p.grupa}”.`
                  )
                ) : (
                  <>
                    To {p.pl.toLocaleLowerCase('pl')}, <i>{p.lat}</i>.
                  </>
                )}
              </span>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
