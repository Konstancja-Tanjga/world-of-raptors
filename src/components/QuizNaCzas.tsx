'use client';

import { useEffect, useRef, useState } from 'react';
import { punktyZaOdpowiedz, rundaQuizu, SEKUNDY_NA_ODPOWIEDZ, type PytanieQuizu } from '@/lib/quizNaCzas';
import type { Zdjecie } from '@/lib/types';
import { srcSetCommons } from '@/lib/zdjecia';
import { Badge, Button, Card, Checkbox, Progress, StateBlock } from './ds';

export type GatunekQuizuNaCzas = { id: string; pl: string; lat: string; mylona_z: string[]; zdjecia: Zdjecie[] };

type Odpowiedz = { id: string; wybrana: string | null; punkty: number };
type Etap = { nazwa: 'start' } | { nazwa: 'pytanie'; numer: number; odpowiedz?: Odpowiedz } | { nazwa: 'wynik' };

/**
 * B9's timed photo quiz, after Cornell's SnapID: ten photos of waders in a
 * round, four names each, a point bonus for speed. The photo names nothing
 * (alt text included) and its Commons link, whose file name usually names
 * the species, waits for the answer, as on the flashcards. Species missed
 * come back more often in the next round. The clock can be switched off
 * (then every right answer earns the same). Nothing is stored.
 */
export function QuizNaCzas({ gatunki }: { gatunki: GatunekQuizuNaCzas[] }) {
  const [pytania, setPytania] = useState<PytanieQuizu[] | null>(null);
  const [etap, setEtap] = useState<Etap>({ nazwa: 'start' });
  const [odpowiedzi, setOdpowiedzi] = useState<Odpowiedz[]>([]);
  const [bledy, setBledy] = useState<Record<string, number>>({});
  const [bezCzasu, setBezCzasu] = useState(false);
  const [zostalo, setZostalo] = useState(SEKUNDY_NA_ODPOWIEDZ);
  // The clock waits for the photo: network time is not the reader's. A photo that fails is skipped, unscored.
  const [zdjecie, setZdjecie] = useState<'laduje' | 'jest' | 'blad'>('laduje');
  const obszar = useRef<HTMLDivElement>(null);
  const pula = gatunki.map((g) => ({ id: g.id, pl: g.pl, mylona_z: g.mylona_z, zdjecia: g.zdjecia.length }));
  const gatunek = (id: string) => gatunki.find((g) => g.id === id)!;

  useEffect(() => {
    // Drawn after mount: a random round on the server would differ from the browser's.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPytania(rundaQuizu(pula, Math.random));
    // The pool comes from the lesson and does not change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pytanie = etap.nazwa === 'pytanie' ? pytania?.[etap.numer] : undefined;
  const czeka = etap.nazwa === 'pytanie' && !etap.odpowiedz;

  const odpowiedz = (wybrana: string | null) => {
    if (etap.nazwa !== 'pytanie' || etap.odpowiedz || !pytanie) return;
    const dobrze = wybrana === pytanie.id;
    const o = { id: pytanie.id, wybrana, punkty: punktyZaOdpowiedz(dobrze, bezCzasu ? null : zostalo) };
    setOdpowiedzi([...odpowiedzi, o]);
    if (!dobrze) setBledy((b) => ({ ...b, [pytanie.id]: (b[pytanie.id] ?? 0) + 1 }));
    setEtap({ ...etap, odpowiedz: o });
  };

  useEffect(() => {
    if (!czeka || bezCzasu || zdjecie !== 'jest') return;
    if (zostalo <= 0) {
      // Time is up: no answer.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      odpowiedz(null);
      return;
    }
    const t = setTimeout(() => setZostalo((s) => s - 1), 1000);
    return () => clearTimeout(t);
  });

  // Focus follows the step: the first option of a new photo, then the way on.
  const krok = etap.nazwa === 'pytanie' ? `${etap.numer}-${etap.odpowiedz ? 'po' : 'przed'}` : etap.nazwa;
  useEffect(() => {
    if (krok === 'start') return;
    obszar.current?.querySelector<HTMLElement>(krok.endsWith('przed') ? '.snapid__opcje button' : '[data-dalej] button, [tabindex="-1"]')?.focus();
  }, [krok]);

  if (!pytania) return <StateBlock state="loading" title="Przygotowuję zdjęcia" scope="inline" />;

  const zacznij = (nowe: PytanieQuizu[]) => {
    setPytania(nowe);
    setOdpowiedzi([]);
    setZostalo(SEKUNDY_NA_ODPOWIEDZ);
    setZdjecie('laduje');
    setEtap({ nazwa: 'pytanie', numer: 0 });
  };

  if (etap.nazwa === 'start') {
    return (
      <Card actions={<Button onClick={() => zacznij(pytania)}>Zacznij rundę</Button>}>
        <div className="cwiczenie">
          <p className="cwiczenie__polecenie">
            {pytania.length} zdjęć siewkowców. Przy każdym wybierz nazwę: dobra odpowiedź to 100 punktów, a szybka do 50 więcej. Na odpowiedź masz {SEKUNDY_NA_ODPOWIEDZ} sekund.
          </p>
          <Checkbox label="Bez limitu czasu" checked={bezCzasu} onChange={(e) => setBezCzasu(e.target.checked)} />
        </div>
      </Card>
    );
  }

  if (etap.nazwa === 'wynik') {
    const dobrych = odpowiedzi.filter((o) => o.wybrana === o.id).length;
    const pomylone = [...new Set(odpowiedzi.filter((o) => o.wybrana !== o.id).map((o) => gatunek(o.id).pl))];
    return (
      <Card actions={<Button onClick={() => zacznij(rundaQuizu(pula, Math.random, bledy))}>Następna runda</Button>}>
        <div className="cwiczenie" ref={obszar}>
          <p className="cwiczenie__tytul" tabIndex={-1}>
            {odpowiedzi.reduce((s, o) => s + o.punkty, 0)} punktów, dobrze {dobrych} z {odpowiedzi.length}
          </p>
          <p className="cwiczenie__polecenie">
            {pomylone.length
              ? `Do powtórki: ${pomylone.join(', ')}. W następnej rundzie te gatunki wrócą częściej.`
              : 'Bez pomyłki. Spróbuj następnej rundy szybciej albo przejdź do trudnych par w lekcji 5.'}
          </p>
        </div>
      </Card>
    );
  }

  const g = gatunek(pytanie!.id);
  const z = g.zdjecia[pytanie!.zdjecie];
  const o = etap.odpowiedz;
  const ostatnie = etap.numer === pytania.length - 1;
  const dalej = () => {
    if (ostatnie) setEtap({ nazwa: 'wynik' });
    else {
      setZostalo(SEKUNDY_NA_ODPOWIEDZ);
      setZdjecie('laduje');
      setEtap({ nazwa: 'pytanie', numer: etap.numer + 1 });
    }
  };

  return (
    <div className="cwiczenie snapid" ref={obszar}>
      <Progress label="Postęp rundy" value={etap.numer + (o ? 1 : 0)} max={pytania.length} valueText={`Zdjęcie ${etap.numer + 1} z ${pytania.length}`} />
      <div className="snapid__scena">
        {/* eslint-disable-next-line @next/next/no-img-element -- Commons sizes via srcset; shown whole, never cropped */}
        <img
          key={z.src}
          className="snapid__zdjecie"
          src={z.src}
          srcSet={srcSetCommons(z)}
          sizes="(max-width: 900px) 100vw, 40rem"
          width={z.width}
          height={z.height}
          alt="Siewkowiec do rozpoznania"
          onLoad={() => setZdjecie('jest')}
          onError={() => setZdjecie('blad')}
        />
      </div>
      {zdjecie === 'blad' && !o && (
        <StateBlock
          state="error"
          scope="inline"
          title="Nie udało się wczytać zdjęcia"
          description="To pytanie nie liczy się do wyniku."
          action={<Button onClick={dalej}>{ostatnie ? 'Zobacz wynik' : 'Pomiń zdjęcie'}</Button>}
        />
      )}
      {!bezCzasu && !o && zdjecie === 'jest' && (
        <p className="snapid__zegar" aria-live="off">
          Zostało {zostalo} s
        </p>
      )}
      <div className="snapid__opcje" role="group" aria-label="Który to gatunek?">
        {pytanie!.opcje.map((id) => (
          <Button key={id} variant={o && id === o.id ? 'primary' : 'secondary'} disabled={Boolean(o)} onClick={() => odpowiedz(id)}>
            {gatunek(id).pl}
          </Button>
        ))}
      </div>
      {o && (
        <>
          <div className="quiz__feedback" aria-live="polite">
            <Badge tone={o.wybrana === o.id ? 'success' : 'critical'}>{o.wybrana === o.id ? `+${o.punkty}` : o.wybrana ? 'Źle' : 'Czas minął'}</Badge>
            <span>
              To {g.pl}, <i>{g.lat}</i>.
              {o.wybrana && o.wybrana !== o.id && ` Wybrany: ${gatunek(o.wybrana).pl}.`}
            </span>
          </div>
          <p className="fiszka__podpis">
            Fot. {z.autor}, {z.licencjaUrl ? <a href={z.licencjaUrl}>{z.licencja}</a> : z.licencja}
            {z.strona && (
              <>
                , <a href={z.strona}>Wikimedia Commons</a>
              </>
            )}
          </p>
          <div data-dalej>
            <Button onClick={dalej}>{ostatnie ? 'Zobacz wynik' : 'Następne zdjęcie'}</Button>
          </div>
        </>
      )}
    </div>
  );
}
