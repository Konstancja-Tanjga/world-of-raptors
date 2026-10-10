'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useWynikiTestu } from '@/lib/testStartowy';
import type { PytanieTestu } from '@/lib/types';
import { podsumuj, polecenia, type Podsumowanie } from '@/lib/wynikTestu';
import { srcSetCommons } from '@/lib/zdjecia';
import { ButtonLink } from './ButtonLink';
import { Badge, Button, Card, Progress, RadioGroup } from './ds';
import { useOstrzezenieZapisu } from './useOstrzezenieZapisu';

const LITERY = 'abcdefgh';
const litera = (i: number) => `${LITERY[i]})`;
const naDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

type Etap =
  | { nazwa: 'start' }
  | { nazwa: 'pytanie'; numer: number; wybrana?: number; sprawdzona: boolean; brakWyboru: boolean }
  | { nazwa: 'wynik' };

/** What the question is about: a silhouette, a photo, a recording; nothing that names the answer before it is given. */
function Scena({ pytanie, sylwetka, odkryta }: { pytanie: PytanieTestu; sylwetka?: ReactNode; odkryta: boolean }) {
  if (pytanie.rodzaj === 'sylwetka') return <div className="test__scena test__scena--niebo">{sylwetka}</div>;
  if (pytanie.rodzaj === 'zdjecie' && pytanie.zdjecie) {
    const z = pytanie.zdjecie;
    return (
      <figure className="test__zdjecie">
        {/* eslint-disable-next-line @next/next/no-img-element -- Commons thumbnails are served directly (images.unoptimized) */}
        <img
          src={z.src}
          srcSet={srcSetCommons(z)}
          sizes="(max-width: 900px) 100vw, 40rem"
          width={z.width}
          height={z.height}
          alt="Ptak do rozpoznania"
        />
        <figcaption className="test__podpis">
          Fot. {z.autor},{' '}
          {z.licencjaUrl ? (
            <a href={z.licencjaUrl} target="_blank" rel="noreferrer">
              {z.licencja}
            </a>
          ) : (
            z.licencja
          )}
          {/* The Commons file name usually names the species: shown once the question is answered. */}
          {odkryta && z.strona && (
            <>
              ,{' '}
              <a href={z.strona} target="_blank" rel="noreferrer">
                Wikimedia Commons
              </a>
            </>
          )}
        </figcaption>
      </figure>
    );
  }
  if (pytanie.rodzaj === 'glos' && pytanie.nagranie) {
    const n = pytanie.nagranie;
    return (
      <figure className="test__nagranie">
        <audio controls preload="none" src={n.src}>
          Ta przeglądarka nie odtwarza nagrań.
        </audio>
        <figcaption className="test__podpis">
          Nagranie: {n.autor},{' '}
          <a href={n.licencjaUrl} target="_blank" rel="noreferrer">
            {n.licencja}
          </a>
          {odkryta && (
            <>
              ,{' '}
              <a href={`https://xeno-canto.org/${n.xc}`} target="_blank" rel="noreferrer">
                xeno-canto XC{n.xc}
              </a>
              ,{' '}
              <a href={n.strona} target="_blank" rel="noreferrer">
                Wikimedia Commons
              </a>
            </>
          )}
        </figcaption>
      </figure>
    );
  }
  return null;
}

/** The right answer in words, after checking. */
function Wyjasnienie({ pytanie }: { pytanie: PytanieTestu }) {
  const poprawna = `${litera(pytanie.poprawna)} ${pytanie.odpowiedzi[pytanie.poprawna]}`;
  if (pytanie.rodzaj === 'wiedza' && pytanie.zrodlo) {
    return (
      <>
        Poprawna odpowiedź: {poprawna}. Więcej w lekcji <Link href={pytanie.zrodlo.href}>{pytanie.zrodlo.tytul}</Link>.
      </>
    );
  }
  if (pytanie.gatunek) {
    const g = (
      <>
        {/* Mid-sentence: the atlas writes names capitalised, as headings. */}
        <Link href={`/gatunki/${pytanie.gatunek.id}`}>{pytanie.gatunek.pl[0].toLocaleLowerCase('pl') + pytanie.gatunek.pl.slice(1)}</Link> (
        <em>{pytanie.gatunek.lat}</em>)
      </>
    );
    return pytanie.rodzaj === 'sylwetka' ? (
      <>
        To {g}, grupa: {pytanie.odpowiedzi[pytanie.poprawna].toLocaleLowerCase('pl')}.
      </>
    ) : (
      <>To {g}.</>
    );
  }
  return <>Poprawna odpowiedź: {poprawna}.</>;
}

const CZESCI: [keyof Podsumowanie['czesci'], string][] = [
  ['sylwetka', 'sylwetki'],
  ['zdjecie', 'zdjęcia'],
  ['glos', 'głosy'],
];

/**
 * Moduł 0, the starting test: fifteen questions, one at a time, with the
 * answer shown after each. The result is given per path, with where to start;
 * the first attempt is kept, so the same test at the end shows the progress.
 */
export function TestStartowyView({
  pytania,
  sylwetki,
  moduly,
}: {
  pytania: PytanieTestu[];
  /** Silhouettes drawn on the server, by species id, so this page does not ship the generator. */
  sylwetki: Record<string, ReactNode>;
  /** "B1 Metoda rozpoznawania w locie" by module slug, for the suggestions. */
  moduly: Record<string, string>;
}) {
  const [etap, setEtap] = useState<Etap>({ nazwa: 'start' });
  const [odpowiedzi, setOdpowiedzi] = useState<Record<string, number>>({});
  const [zapisano, setZapisano] = useState(true);
  const { wyniki, zapisz } = useWynikiTestu();
  const sprawdzZapis = useOstrzezenieZapisu();
  const obszar = useRef<HTMLDivElement>(null);
  const wynikRef = useRef<HTMLHeadingElement>(null);

  const numer = etap.nazwa === 'pytanie' ? etap.numer : -1;
  useEffect(() => {
    if (numer >= 0) obszar.current?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus();
  }, [numer]);
  useEffect(() => {
    if (etap.nazwa === 'wynik') wynikRef.current?.focus();
  }, [etap.nazwa]);

  const zacznij = () => {
    setOdpowiedzi({});
    setEtap({ nazwa: 'pytanie', numer: 0, sprawdzona: false, brakWyboru: false });
  };

  if (etap.nazwa === 'start') {
    const ostatni = wyniki?.ostatni ? podsumuj(pytania, wyniki.ostatni.odpowiedzi) : null;
    return (
      <Card actions={<Button onClick={zacznij}>{ostatni ? 'Rozwiąż test jeszcze raz' : 'Zacznij test'}</Button>}>
        <div className="quiz">
          <p className="quiz__tytul">{pytania.length} pytań, jedno na ekranie, około 5 minut</p>
          <p className="quiz__tekst">
            5 sylwetek, 3 zdjęcia, 3 głosy i 4 pytania z biologii. Do głosów przyda się głośnik albo
            słuchawki. Po każdej odpowiedzi od razu widać, czy jest dobra. Na końcu test pokazuje, od
            czego zacząć w każdej ścieżce, a zrobiony jeszcze raz pod koniec kursu: ile się nauczyłam.
          </p>
          {ostatni && wyniki?.ostatni && (
            <p className="quiz__tekst muted">
              Ostatnio ({naDate(wyniki.ostatni.data)}): {ostatni.razem.dobrze} z {ostatni.razem.z}.
            </p>
          )}
        </div>
      </Card>
    );
  }

  if (etap.nazwa === 'wynik') {
    const teraz = podsumuj(pytania, odpowiedzi);
    const pierwszy = wyniki?.pierwszy;
    const porownanie =
      pierwszy && JSON.stringify(pierwszy.odpowiedzi) !== JSON.stringify(odpowiedzi) ? podsumuj(pytania, pierwszy.odpowiedzi) : null;
    const { a, b } = polecenia(teraz);
    // Not a Card: the result offers three ways on (two modules and another attempt), and a card holds one.
    return (
      <section className="test__wynik" aria-labelledby="wynik-testu">
        <div className="quiz">
          <h2 id="wynik-testu" className="quiz__tytul" tabIndex={-1} ref={wynikRef}>
            Mój wynik: {teraz.razem.dobrze} z {teraz.razem.z}
          </h2>
          {porownanie && pierwszy && (
            <p className="quiz__tekst">
              Pierwszy raz ({naDate(pierwszy.data)}): {porownanie.razem.dobrze} z {porownanie.razem.z}. Teraz:{' '}
              {teraz.razem.dobrze} z {teraz.razem.z}.
            </p>
          )}
          {!zapisano && (
            <p className="quiz__tekst">Przeglądarka nie zapisała wyniku, więc nie zobaczę go przy następnym podejściu.</p>
          )}
          <section className="test__sciezka" aria-labelledby="wynik-b">
            <h3 id="wynik-b" className="quiz__podtytul">
              Ścieżka B: Rozpoznawanie w terenie
            </h3>
            <Progress label="Rozpoznawanie" value={teraz.b.dobrze} max={teraz.b.z} valueText={`${teraz.b.dobrze} z ${teraz.b.z}`} />
            <p className="quiz__tekst muted">
              {CZESCI.map(([k, nazwa]) => `${nazwa}: ${teraz.czesci[k].dobrze} z ${teraz.czesci[k].z}`).join(', ')}
            </p>
            <p className="quiz__tekst">{b.tekst}</p>
            <div className="row">
              <ButtonLink href={`/moduly/${b.modul}`} size="sm">
                Otwórz {moduly[b.modul] ?? b.modul}
              </ButtonLink>
            </div>
          </section>
          <section className="test__sciezka" aria-labelledby="wynik-a">
            <h3 id="wynik-a" className="quiz__podtytul">
              Ścieżka A: Biologia
            </h3>
            <Progress label="Biologia" value={teraz.a.dobrze} max={teraz.a.z} valueText={`${teraz.a.dobrze} z ${teraz.a.z}`} />
            <p className="quiz__tekst">{a.tekst}</p>
            <div className="row">
              <ButtonLink href={`/moduly/${a.modul}`} size="sm" variant="secondary">
                Otwórz {moduly[a.modul] ?? a.modul}
              </ButtonLink>
            </div>
          </section>
          <div className="row">
            <Button variant="ghost" onClick={zacznij}>
              Rozwiąż test jeszcze raz
            </Button>
          </div>
        </div>
      </section>
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
    setOdpowiedzi((o) => ({ ...o, [pytanie.id]: etap.wybrana! }));
    setEtap({ ...etap, sprawdzona: true });
  };

  const dalej = () => {
    if (!ostatnie) {
      setEtap({ nazwa: 'pytanie', numer: etap.numer + 1, sprawdzona: false, brakWyboru: false });
      return;
    }
    const ok = zapisz(odpowiedzi);
    setZapisano(ok);
    sprawdzZapis(ok);
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
          label="Postęp testu"
          value={etap.numer + (etap.sprawdzona ? 1 : 0)}
          max={pytania.length}
          valueText={`Pytanie ${etap.numer + 1} z ${pytania.length}`}
        />
        <Scena pytanie={pytanie} sylwetka={pytanie.gatunek ? sylwetki[pytanie.gatunek.id] : undefined} odkryta={etap.sprawdzona} />
        <RadioGroup
          key={pytanie.id}
          legend={pytanie.pytanie}
          name={`test-${pytanie.id}`}
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
                  ? 'Moja odpowiedź'
                  : undefined,
          }))}
        />
        <div className="quiz__feedback" aria-live="polite">
          {etap.sprawdzona && (
            <>
              <Badge tone={dobrze ? 'success' : 'critical'}>{dobrze ? 'Dobrze' : 'Źle'}</Badge>
              <span>
                <Wyjasnienie pytanie={pytanie} />
              </span>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
