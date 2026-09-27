'use client';

import { useEffect, useRef, useState } from 'react';
import { kluczLekcji, usePostep } from '@/lib/postep';
import type { Quiz } from '@/lib/types';
import { Badge, Button, Card, Progress, RadioGroup } from './ds';
import { useOstrzezenieZapisu } from './useOstrzezenieZapisu';

const LITERY = 'abcdefgh';
const litera = (i: number) => `${LITERY[i]})`;

type Etap =
  | { nazwa: 'start' }
  | { nazwa: 'pytanie'; numer: number; wybrana?: number; sprawdzona: boolean; brakWyboru: boolean }
  | { nazwa: 'wynik' };

/**
 * The lesson quiz, one question at a time: pick an answer, check it and see
 * at once whether it was right, then move on. At the end, the score against
 * the pass mark; passing marks the lesson finished.
 */
export function QuizKrokowy({ quiz, modul, lekcja }: { quiz: Quiz; modul: string; lekcja: string }) {
  const { pytania, prog } = quiz;
  const [etap, setEtap] = useState<Etap>({ nazwa: 'start' });
  const [odpowiedzi, setOdpowiedzi] = useState<number[]>([]);
  const [zapisano, setZapisano] = useState(true);
  const { ustaw } = usePostep();
  const sprawdzZapis = useOstrzezenieZapisu();
  const obszar = useRef<HTMLDivElement>(null);
  const wynikRef = useRef<HTMLHeadingElement>(null);

  const potrzebne = Math.ceil((pytania.length * prog) / 100);
  const poprawne = odpowiedzi.filter((o, i) => o === pytania[i].poprawna).length;
  const zaliczony = poprawne >= potrzebne;

  // Focus follows the step: the first option of a new question, the score at the end.
  const numer = etap.nazwa === 'pytanie' ? etap.numer : -1;
  useEffect(() => {
    if (numer >= 0) obszar.current?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus();
  }, [numer]);
  useEffect(() => {
    if (etap.nazwa === 'wynik') wynikRef.current?.focus();
  }, [etap.nazwa]);

  const zacznij = () => {
    setOdpowiedzi([]);
    setEtap({ nazwa: 'pytanie', numer: 0, sprawdzona: false, brakWyboru: false });
  };

  if (etap.nazwa === 'start') {
    return (
      <Card actions={<Button onClick={zacznij}>Zacznij quiz</Button>}>
        <div className="quiz">
          <p className="quiz__tytul">
            {pytania.length} pytań, jedno na ekranie
          </p>
          <p className="quiz__tekst">
            Po każdej odpowiedzi od razu zobaczysz, czy jest poprawna. Quiz zaliczasz, gdy odpowiesz
            dobrze na co najmniej {potrzebne} z {pytania.length} pytań ({prog}%). Zaliczony quiz
            oznacza lekcję jako ukończoną.
          </p>
        </div>
      </Card>
    );
  }

  if (etap.nazwa === 'wynik') {
    const bledne = pytania.flatMap((p, i) => (odpowiedzi[i] === p.poprawna ? [] : [{ p, i }]));
    return (
      <Card actions={<Button variant={zaliczony ? 'secondary' : 'primary'} onClick={zacznij}>Rozwiąż jeszcze raz</Button>}>
        <div className="quiz">
          <Progress
            label="Wynik quizu"
            value={poprawne}
            max={pytania.length}
            valueText={`${poprawne} z ${pytania.length}`}
            tone={zaliczony ? 'success' : 'critical'}
          />
          <h3 className="quiz__tytul" tabIndex={-1} ref={wynikRef}>
            {zaliczony ? 'Quiz zaliczony' : 'Quiz niezaliczony'}: {poprawne} z {pytania.length} (
            {Math.round((poprawne / pytania.length) * 100)}%)
          </h3>
          <p className="quiz__tekst">
            {zaliczony
              ? zapisano
                ? 'Lekcja jest oznaczona jako ukończona.'
                : 'Nie udało się zapisać ukończenia lekcji w tej przeglądarce.'
              : `Do zaliczenia potrzeba ${potrzebne} poprawnych odpowiedzi (${prog}%). Przejrzyj pytania poniżej i spróbuj jeszcze raz.`}
          </p>
          {bledne.length > 0 && (
            <>
              <h4 className="quiz__podtytul">Do powtórki</h4>
              <ol className="quiz__bledy">
                {bledne.map(({ p, i }) => (
                  <li key={i}>
                    <span className="quiz__pytanie">
                      Pytanie {i + 1}: {p.pytanie}
                    </span>
                    <span>
                      Twoja odpowiedź: {litera(odpowiedzi[i])} {p.odpowiedzi[odpowiedzi[i]]}
                    </span>
                    <span>
                      Poprawna: {litera(p.poprawna)} {p.odpowiedzi[p.poprawna]}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </Card>
    );
  }

  const pytanie = pytania[etap.numer];
  const ostatnie = etap.numer === pytania.length - 1;
  const dobrze = etap.wybrana === pytanie.poprawna;

  const sprawdz = () => {
    if (etap.wybrana === undefined) {
      setEtap({ ...etap, brakWyboru: true });
      return;
    }
    const nowe = [...odpowiedzi];
    nowe[etap.numer] = etap.wybrana;
    setOdpowiedzi(nowe);
    setEtap({ ...etap, sprawdzona: true });
  };

  const dalej = () => {
    if (!ostatnie) {
      setEtap({ nazwa: 'pytanie', numer: etap.numer + 1, sprawdzona: false, brakWyboru: false });
      return;
    }
    const wynik = odpowiedzi.filter((o, i) => o === pytania[i].poprawna).length;
    if (wynik >= potrzebne) {
      const ok = ustaw(kluczLekcji(modul, lekcja), true);
      setZapisano(ok);
      sprawdzZapis(ok);
    }
    setEtap({ nazwa: 'wynik' });
  };

  return (
    <Card
      actions={
        etap.sprawdzona ? (
          <Button onClick={dalej}>{ostatnie ? 'Zobacz wynik' : 'Następne pytanie'}</Button>
        ) : (
          <Button onClick={sprawdz}>Sprawdź</Button>
        )
      }
    >
      <div className="quiz" ref={obszar}>
        <Progress
          label="Postęp quizu"
          value={etap.numer + (etap.sprawdzona ? 1 : 0)}
          max={pytania.length}
          valueText={`Pytanie ${etap.numer + 1} z ${pytania.length}`}
        />
        <RadioGroup
          key={etap.numer}
          legend={pytanie.pytanie}
          name={`quiz-${etap.numer}`}
          value={etap.wybrana === undefined ? '' : String(etap.wybrana)}
          onChange={(v) => {
            if (!etap.sprawdzona) setEtap({ ...etap, wybrana: Number(v), brakWyboru: false });
          }}
          error={etap.brakWyboru ? 'Wybierz odpowiedź, a potem sprawdź.' : undefined}
          options={pytanie.odpowiedzi.map((tekst, i) => ({
            value: String(i),
            label: `${litera(i)} ${tekst}`,
            disabled: etap.sprawdzona,
            description: !etap.sprawdzona
              ? undefined
              : i === pytanie.poprawna
                ? 'Poprawna odpowiedź'
                : i === etap.wybrana
                  ? 'Twoja odpowiedź'
                  : undefined,
          }))}
        />
        <div className="quiz__feedback" aria-live="polite">
          {etap.sprawdzona && (
            <>
              <Badge tone={dobrze ? 'success' : 'critical'}>{dobrze ? 'Dobrze' : 'Źle'}</Badge>
              <span>
                {dobrze
                  ? 'To poprawna odpowiedź.'
                  : `Poprawna odpowiedź to ${litera(pytanie.poprawna)} ${pytanie.odpowiedzi[pytanie.poprawna]}.`}
              </span>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
