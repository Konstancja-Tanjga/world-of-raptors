'use client';

import { useEffect, useRef, useState } from 'react';
import {
  czytajPole,
  KOLORY_OBRACZEK,
  losujKombinacje,
  nogaPoLewej,
  ocenKombinacje,
  POLA_NOG,
  zapisKombinacji,
  type KodObraczki,
  type Kombinacja,
  type OcenaObraczek,
  type PoleNogi,
  type Widok,
} from '@/lib/obraczki';
import { Badge, Button, Card, Input, StateBlock } from './ds';

/** The rings' colours in the drawing (plastic as it looks in the field), and the metal ring's. */
const BARWA: Record<KodObraczki, string> = {
  W: '#f4f3ee',
  N: '#1f1f1f',
  R: '#cf2f29',
  O: '#ee8a22',
  Y: '#f2cf3b',
  G: '#2e8a3e',
  L: '#a6d83b',
  B: '#2a5ed1',
  m: '#c4c8ce',
};

const ETYKIETA: Record<PoleNogi, string> = {
  lewaGolen: 'Lewa noga ptaka, nad stawem (goleń)',
  lewaSkok: 'Lewa noga ptaka, pod stawem (skok)',
  prawaGolen: 'Prawa noga ptaka, nad stawem (goleń)',
  prawaSkok: 'Prawa noga ptaka, pod stawem (skok)',
};

const PUSTE: Record<PoleNogi, string> = { lewaGolen: '', lewaSkok: '', prawaGolen: '', prawaSkok: '' };

type Ptak = { kombinacja: Kombinacja; widok: Widok };
/** The view as the text says it. */
const WIDOK: Record<Widok, string> = { przodem: 'przodem', tylem: 'tyłem' };

const nowyPtak = (): Ptak => ({ kombinacja: losujKombinacje(), widok: Math.random() < 0.5 ? 'przodem' : 'tylem' });

/** One leg: the bare lower tibia, the joint, the tarsus and the toes, with its rings top to bottom. */
function Noga({ x, golen, skok }: { x: number; golen: KodObraczki[]; skok: KodObraczki[] }) {
  const pierscienie = (kody: KodObraczki[], y0: number) =>
    kody.map((k, i) => (
      <rect key={i} x={x - 9} y={y0 + i * 19} width={18} height={16} rx={3} fill={BARWA[k]} stroke={k === 'm' ? '#6f747b' : '#3a3a3a'} strokeWidth={1} />
    ));
  return (
    <g>
      <line x1={x} y1={72} x2={x} y2={222} stroke="#55504a" strokeWidth={6} strokeLinecap="round" />
      <circle cx={x} cy={140} r={5} fill="#55504a" />
      <path d={`M${x} 222 l-22 10 M${x} 222 l22 10 M${x} 222 l0 14 M${x} 222 l-6 -8`} stroke="#55504a" strokeWidth={4} strokeLinecap="round" fill="none" />
      {pierscienie(golen, 92)}
      {pierscienie(skok, 156)}
    </g>
  );
}

/**
 * B9's colour-ring exercise: a wader's legs with a project's combination,
 * the bird facing you or turned away, and four fields to write what you
 * read, left leg of the bird first. The commonest mistake, reading the
 * observer's left, gets its own feedback. Nothing is stored.
 */
export function ObraczkiKolorowe() {
  // Drawn after mount: a random combination on the server would differ from the browser's.
  const [ptak, setPtak] = useState<Ptak | null>(null);
  const [pola, setPola] = useState(PUSTE);
  const [ocena, setOcena] = useState<OcenaObraczek | null>(null);
  const [bledy, setBledy] = useState<Partial<Record<PoleNogi, string>>>({});
  const [wynik, setWynik] = useState({ dobrze: 0, wszystkie: 0 });
  const obszar = useRef<HTMLDivElement>(null);
  // Focus moves to the first field only for a bird the reader asked for, never on load.
  const nastepny = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPtak(nowyPtak());
  }, []);

  useEffect(() => {
    if (!nastepny.current) return;
    nastepny.current = false;
    obszar.current?.querySelector<HTMLInputElement>('input')?.focus();
  }, [ptak]);

  if (!ptak) return <StateBlock state="loading" title="Przygotowuję ptaka z obrączkami" scope="inline" />;

  const poLewej = nogaPoLewej(ptak.widok);
  const k = ptak.kombinacja;
  const [lewaEkranu, prawaEkranu] = poLewej === 'lewa' ? ['lewa', 'prawa'] : ['prawa', 'lewa'];
  const noga = (strona: string) => (strona === 'lewa' ? { golen: k.lewaGolen, skok: k.lewaSkok } : { golen: k.prawaGolen, skok: k.prawaSkok });

  const sprawdz = () => {
    const odczyt: Partial<Kombinacja> = {};
    const nowe: Partial<Record<PoleNogi, string>> = {};
    for (const p of POLA_NOG) {
      const kody = czytajPole(pola[p]);
      if (kody) odczyt[p] = kody;
      else nowe[p] = 'Tylko litery z legendy, np. RG; m to obrączka metalowa.';
    }
    setBledy(nowe);
    if (Object.keys(nowe).length) return;
    const o = ocenKombinacje(odczyt as Kombinacja, k);
    setOcena(o);
    setWynik((w) => ({ dobrze: w.dobrze + (o.dobrze ? 1 : 0), wszystkie: w.wszystkie + 1 }));
  };
  const dalej = () => {
    nastepny.current = true;
    setPtak(nowyPtak());
    setPola(PUSTE);
    setOcena(null);
    setBledy({});
  };

  return (
    <Card actions={ocena ? <Button onClick={dalej}>Następny ptak</Button> : <Button onClick={sprawdz}>Sprawdź</Button>}>
      <div className="cwiczenie obraczki" ref={obszar}>
        <p className="cwiczenie__polecenie">
          {ptak.widok === 'przodem' ? 'Ptak stoi przodem do ciebie.' : 'Ptak stoi tyłem do ciebie.'} Zapisz jego obrączki: najpierw lewą nogę ptaka, potem prawą, na każdej od góry, nad stawem i pod nim.
        </p>
        <svg className="obraczki__rysunek" viewBox="0 0 300 250" role="img" aria-label={`Nogi brodzącego ptaka z obrączkami kolorowymi; ptak stoi ${WIDOK[ptak.widok]} do ciebie`}>
          <ellipse cx={150} cy={42} rx={92} ry={44} fill="#b9a68a" />
          {ptak.widok === 'przodem' ? (
            <>
              <ellipse cx={150} cy={50} rx={60} ry={30} fill="#efe9dd" />
              <path d="M150 4 l-7 14 h14 z" fill="#3b342c" />
            </>
          ) : (
            <path d="M150 74 l-16 18 h32 z" fill="#8c785e" />
          )}
          <Noga x={112} {...noga(lewaEkranu)} />
          <Noga x={188} {...noga(prawaEkranu)} />
        </svg>
        <ul className="obraczki__legenda" aria-label="Kody kolorów">
          {(Object.keys(KOLORY_OBRACZEK) as KodObraczki[]).map((kod) => (
            <li key={kod}>
              <svg viewBox="0 0 16 12" aria-hidden="true">
                <rect x={0.5} y={0.5} width={15} height={11} rx={2} fill={BARWA[kod]} stroke="#3a3a3a" />
              </svg>
              <b>{kod}</b> {KOLORY_OBRACZEK[kod]}
            </li>
          ))}
        </ul>
        <div className="obraczki__pola">
          {POLA_NOG.map((p) => (
            <Input
              key={`${zapisKombinacji(k)}-${p}`}
              label={ETYKIETA[p]}
              value={pola[p]}
              onChange={(e) => setPola({ ...pola, [p]: e.target.value })}
              error={bledy[p]}
              disabled={Boolean(ocena)}
              autoComplete="off"
              spellCheck={false}
              placeholder="np. RG albo zostaw puste"
            />
          ))}
        </div>
        <div className="quiz__feedback" aria-live="polite">
          {ocena && (
            <>
              <Badge tone={ocena.dobrze ? 'success' : 'critical'}>{ocena.dobrze ? 'Dobrze' : 'Źle'}</Badge>
              <span>
                {ocena.dobrze
                  ? `Tak: ${zapisKombinacji(k)}.`
                  : ocena.lustro
                    ? `Obrączki dobrze, ale nogi zamienione: lewa noga ptaka stojącego ${WIDOK[ptak.widok]} do ciebie jest po twojej ${ptak.widok === 'przodem' ? 'prawej' : 'lewej'} stronie. Poprawnie: ${zapisKombinacji(k)}.`
                    : `Poprawnie: ${zapisKombinacji(k)} (lewa noga ptaka, potem prawa; na każdej nad stawem / pod stawem).`}
              </span>
            </>
          )}
        </div>
        {wynik.wszystkie > 0 && (
          <p className="cwiczenie__wynik">
            Odczytane bezbłędnie: {wynik.dobrze} z {wynik.wszystkie}
          </p>
        )}
      </div>
    </Card>
  );
}
