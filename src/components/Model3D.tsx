'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Przegladarka } from '@/lib/budowa/scena';
import { NAZWY_WARSTW, PYTAN_W_SPRAWDZIANIE, WARSTWY, type DaneSceny, type OpisCzesci, type Warstwa } from '@/lib/budowa/sceny';
import { Button, Checkbox, SegmentedControl, Select, Slider, StateBlock } from './ds';

/** **bold** in a step's text, the only markup it has. */
const zPogrubieniem = (tekst: string) =>
  tekst.split(/\*\*(.+?)\*\*/g).map((czesc, i) => (i % 2 ? <strong key={i}>{czesc}</strong> : <Fragment key={i}>{czesc}</Fragment>));

const losuj = <T,>(lista: T[]) => {
  const wynik = [...lista];
  for (let i = wynik.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wynik[i], wynik[j]] = [wynik[j], wynik[i]];
  }
  return wynik;
};

type Pytanie = { czesc: OpisCzesci; odpowiedzi: OpisCzesci[] };
const ulozSprawdzian = (czesci: OpisCzesci[]): Pytanie[] =>
  losuj(czesci)
    .slice(0, PYTAN_W_SPRAWDZIANIE)
    .map((czesc) => ({ czesc, odpowiedzi: losuj([czesc, ...losuj(czesci.filter((c) => c.id !== czesc.id)).slice(0, 3)]) }));

const CYKL_MS = 3400;

/** Where `v` lies between `od` and `doo`, in percent. */
const procent = (v: number, od: number, doo: number) => Math.round(((v - od) / (doo - od)) * 100);

/**
 * A 3D model from module A9 with everything needed to read it: a list of
 * its parts (pick one there or on the model, and the camera flies to it), a
 * description of the chosen part, sliders to turn, cut and fade it, the
 * layers to switch, and a scene's own sliders and steps. In a self-test
 * scene it asks instead: it shows a part and offers four names. Everything
 * it shows on the model can also be reached from the list and the buttons,
 * without a pointer.
 *
 * The 3D engine (three.js, src/lib/budowa/scena.ts) loads only when the
 * model comes near the screen; before that, and where WebGL is missing,
 * a StateBlock stands in and the list of parts still works.
 */
export function Model3D({ scena }: { scena: DaneSceny }) {
  const kontener = useRef<HTMLDivElement>(null);
  const etykieta = useRef<HTMLSpanElement>(null);
  const podpowiedz = useRef<HTMLSpanElement>(null);
  const przegladarka = useRef<Przegladarka | null>(null);
  const [stan, setStan] = useState<'czeka' | 'gotowy' | 'blad'>('czeka');
  const [indeksWidoku, setIndeksWidoku] = useState(0);
  const widok = scena.widoki[indeksWidoku];

  const [wybrana, setWybrana] = useState<string | null>(null);
  const [najechana, setNajechana] = useState<string | null>(null);
  const [obrot, setObrot] = useState(0);
  const [przekroj, setPrzekroj] = useState(0);
  const [upierzenie, setUpierzenie] = useState(100);
  const [warstwy, setWarstwy] = useState<Partial<Record<Warstwa, boolean>>>({});
  const [suwaki, setSuwaki] = useState<Record<string, number>>({});
  const [krok, setKrok] = useState<string | null>(scena.kroki[0]?.id ?? null);
  const [odtwarza, setOdtwarza] = useState(false);
  const [ruch, setRuch] = useState(true);

  const [pytania, setPytania] = useState<Pytanie[]>([]);
  const [numer, setNumer] = useState(0);
  const [odpowiedz, setOdpowiedz] = useState<string | null>(null);
  const [wynik, setWynik] = useState(0);

  const czesci = useMemo(() => new Map(widok.czesci.map((c) => [c.id, c])), [widok]);

  /** A view's starting state, in the controls and in the model. */
  const ustawWidok = useCallback((w: DaneSceny['widoki'][number]) => {
    setWybrana(null);
    setPrzekroj(w.przekroj ? procent(w.przekroj.domyslnie, w.przekroj.od, w.przekroj.do) : 0);
    setUpierzenie(Math.round((w.przezroczystosc ?? 1) * 100));
    setWarstwy(Object.fromEntries(WARSTWY.map((x) => [x, w.warstwy.includes(x)])));
    setSuwaki(Object.fromEntries((w.suwaki ?? []).map((x) => [x.id, x.domyslnie])));
    przegladarka.current?.pokazWidok(w);
  }, []);

  /** The controls follow what showing a part changed in the model: the plumage, the layers, the cut. */
  const zsynchronizuj = useCallback(
    (s: ReturnType<Przegladarka['wybierz']>) => {
      setUpierzenie(Math.round(s.przezroczystosc * 100));
      setWarstwy(s.warstwy);
      if (s.przekroj !== null && widok.przekroj) setPrzekroj(procent(s.przekroj, widok.przekroj.od, widok.przekroj.do));
    },
    [widok],
  );

  // The self-test: each question resets the model, then lights the part and flies to it.
  const pokazPytanie = useCallback(
    (q: Pytanie | undefined) => {
      const p = przegladarka.current;
      if (!q || !p) return;
      p.pokazWidok(widok);
      setPrzekroj(widok.przekroj ? procent(widok.przekroj.domyslnie, widok.przekroj.od, widok.przekroj.do) : 0);
      zsynchronizuj(p.wybierz(q.czesc.id, { pokaz: true }));
    },
    [widok, zsynchronizuj],
  );
  const zacznijSprawdzian = useCallback(() => {
    const nowe = ulozSprawdzian(widok.czesci);
    setPytania(nowe);
    setNumer(0);
    setOdpowiedz(null);
    setWynik(0);
    pokazPytanie(nowe[0]);
  }, [widok, pokazPytanie]);

  // The engine, once the model comes near the screen; then the first view, step or question.
  const naStart = useRef<() => void>(() => {});
  useEffect(() => {
    naStart.current = () => {
      ustawWidok(widok);
      if (scena.kroki.length) przegladarka.current?.krok(scena.kroki[0].id, true);
      if (scena.sprawdzian) zacznijSprawdzian();
    };
  });
  useEffect(() => {
    const el = kontener.current;
    if (!el) return;
    const bezRuchu = window.matchMedia('(prefers-reduced-motion: reduce)');
    let anulowane = false;
    const obserwator = new IntersectionObserver(
      async ([wpis]) => {
        if (!wpis.isIntersecting) return;
        obserwator.disconnect();
        setRuch(!bezRuchu.matches);
        try {
          const { utworzPrzegladarke } = await import('@/lib/budowa/scena');
          if (anulowane) return;
          const akcent = getComputedStyle(el).getPropertyValue('--wor-akcent').trim();
          przegladarka.current = utworzPrzegladarke(
            el,
            {
              naWybor: (id) => setWybrana(id),
              naNajechanie: (id, x, y) => {
                setNajechana(id);
                if (podpowiedz.current) podpowiedz.current.style.translate = `${x}px ${y}px`;
              },
              naObrot: setObrot,
              naEtykiete: (pozycja) => {
                const e = etykieta.current;
                if (!e) return;
                e.hidden = !pozycja;
                if (pozycja) e.style.translate = `${pozycja.x}px ${pozycja.y}px`;
              },
              naBlad: () => setStan('blad'),
            },
            { ruch: !bezRuchu.matches, akcent },
          );
          setStan('gotowy');
          naStart.current();
        } catch {
          if (!anulowane) setStan('blad');
        }
      },
      { rootMargin: '300px' },
    );
    obserwator.observe(el);
    return () => {
      anulowane = true;
      obserwator.disconnect();
      przegladarka.current?.zniszcz();
      przegladarka.current = null;
    };
  }, []);

  // A chosen part lights up; from the list, the camera also flies to it and its layer shows.
  const wybierz = useCallback((id: string | null, pokaz: boolean) => {
    setWybrana(id);
    const s = przegladarka.current?.wybierz(id, { pokaz });
    if (s && pokaz) zsynchronizuj(s);
  }, [zsynchronizuj]);
  useEffect(() => {
    if (!scena.sprawdzian) przegladarka.current?.wybierz(wybrana);
  }, [wybrana, scena.sprawdzian]);

  // "Odtwarzaj cykl" steps through the breathing cycle on its own until paused.
  useEffect(() => {
    if (!odtwarza) return;
    const id = window.setInterval(() => {
      setKrok((k) => {
        const i = scena.kroki.findIndex((x) => x.id === k);
        const nastepny = scena.kroki[(i + 1) % scena.kroki.length].id;
        przegladarka.current?.krok(nastepny, false);
        return nastepny;
      });
    }, CYKL_MS);
    return () => window.clearInterval(id);
  }, [odtwarza, scena.kroki]);

  const pytanie = pytania[numer];
  const opisana = wybrana ? czesci.get(wybrana) : undefined;
  // Read when a control is used, not while rendering.
  const p = () => przegladarka.current;
  const przekrojNaWartosc = (v: number) => (widok.przekroj ? widok.przekroj.od + ((widok.przekroj.do - widok.przekroj.od) * v) / 100 : 0);
  const opisPrzekroju = (v: number) => {
    if (v === 0) return 'bez przekroju';
    if (widok.przekroj?.os === 'x') {
      const cm = Math.round(przekrojNaWartosc(v) * 10);
      return cm === 0 ? 'przez środek ciała' : `${Math.abs(cm)} cm ${cm > 0 ? 'na prawo' : 'na lewo'} od środka ciała`;
    }
    return `przecięta w ${v}%`;
  };
  const koniec = scena.sprawdzian && pytania.length > 0 && numer >= pytania.length;

  return (
    <figure className="model3d scena" aria-labelledby={`model3d-${scena.id}`}>
      <div className="model3d__glowka">
        <p className="model3d__tytul" id={`model3d-${scena.id}`}>
          {scena.tytul}
        </p>
        {scena.widoki.length > 1 && (
          <SegmentedControl
            legend="Powiększenie"
            size="sm"
            options={scena.widoki.map((w, i) => ({ value: String(i), label: w.nazwa }))}
            value={String(indeksWidoku)}
            onChange={(v) => {
              setIndeksWidoku(Number(v));
              ustawWidok(scena.widoki[Number(v)]);
            }}
          />
        )}
      </div>

      <div className="model3d__plotno" ref={kontener}>
        {stan === 'czeka' && <StateBlock state="loading" title="Wczytuję model" scope="inline" />}
        {stan === 'blad' && (
          <StateBlock
            state="error"
            title="Nie da się pokazać modelu"
            description="Ta przeglądarka nie udostępnia grafiki 3D (WebGL) albo ją wyłączyła. Części i ich opisy są nadal na liście obok."
            scope="inline"
          />
        )}
        {!scena.sprawdzian && (
          <span className="model3d__etykieta" ref={etykieta} hidden aria-hidden="true">
            {opisana?.nazwa}
          </span>
        )}
        {!scena.sprawdzian && (
          <span className="model3d__podpowiedz" ref={podpowiedz} hidden={!najechana || najechana === wybrana} aria-hidden="true">
            {najechana ? czesci.get(najechana)?.nazwa : ''}
          </span>
        )}
      </div>

      <div className="model3d__panel">
        {scena.kroki.length > 0 && (
          <div className="model3d__kroki">
            <SegmentedControl
              legend="Krok oddechu"
              showLegend
              size="sm"
              options={scena.kroki.map((k) => ({ value: k.id, label: k.nazwa }))}
              value={krok ?? scena.kroki[0].id}
              onChange={(id) => {
                setOdtwarza(false);
                setKrok(id);
                p()?.krok(id, false);
              }}
            />
            {ruch && (
              <div className="model3d__przyciski">
                <Button size="sm" variant="secondary" onClick={() => setOdtwarza((x) => !x)} disabled={stan !== 'gotowy'}>
                  {odtwarza ? 'Zatrzymaj cykl' : 'Odtwarzaj cykl'}
                </Button>
              </div>
            )}
            <p className="model3d__krok" aria-live="polite">
              {zPogrubieniem(scena.kroki.find((k) => k.id === krok)?.opis ?? scena.kroki[0].opis)}
            </p>
          </div>
        )}
        {scena.sprawdzian ? (
          <div className="model3d__sprawdzian" aria-live="polite">
            {koniec ? (
              <>
                <p className="model3d__nazwa">
                  Wynik: {wynik} z {pytania.length}
                </p>
                <p>{wynik >= pytania.length * 0.8 ? 'Znasz budowę ptaka.' : 'Wróć do lekcji, w których te części były opisane, i spróbuj jeszcze raz.'}</p>
                <Button size="sm" onClick={zacznijSprawdzian}>
                  Jeszcze raz
                </Button>
              </>
            ) : pytanie ? (
              <>
                <p className="model3d__licznik">
                  Pytanie {numer + 1} z {pytania.length}
                </p>
                <p className="model3d__nazwa">Co pokazuje podświetlona część?</p>
                <div className="model3d__odpowiedzi">
                  {pytanie.odpowiedzi.map((o) => (
                    <Button
                      key={o.id}
                      size="sm"
                      variant={odpowiedz === null ? 'secondary' : o.id === pytanie.czesc.id ? 'primary' : 'ghost'}
                      aria-disabled={odpowiedz !== null}
                      onClick={() => {
                        if (odpowiedz !== null) return;
                        setOdpowiedz(o.id);
                        if (o.id === pytanie.czesc.id) setWynik((w) => w + 1);
                      }}
                    >
                      {o.nazwa}
                    </Button>
                  ))}
                </div>
                {odpowiedz !== null && (
                  <>
                    <p>
                      <strong>{odpowiedz === pytanie.czesc.id ? 'Dobrze.' : `To ${pytanie.czesc.nazwa.toLowerCase()}.`}</strong> {pytanie.czesc.opis}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        setOdpowiedz(null);
                        setNumer(numer + 1);
                        pokazPytanie(pytania[numer + 1]);
                      }}
                    >
                      {numer + 1 < pytania.length ? 'Następne pytanie' : 'Pokaż wynik'}
                    </Button>
                  </>
                )}
              </>
            ) : (
              <StateBlock state="loading" title="Układam pytania" scope="inline" />
            )}
          </div>
        ) : (
          <div className="model3d__czesci">
            <div className="model3d__opis" aria-live="polite">
              {opisana ? (
                <>
                  <p className="model3d__nazwa">
                    {opisana.nazwa}
                    {opisana.lac && (
                      <>
                        {' '}
                        <i lang="la" translate="no">
                          {opisana.lac}
                        </i>
                      </>
                    )}
                  </p>
                  <p>{opisana.opis}</p>
                </>
              ) : (
                <p className="model3d__wskazowka">
                  <span className="tylko-mysz">Kliknij</span>
                  <span className="tylko-dotyk">Stuknij</span> część na modelu albo wybierz ją z listy.
                </p>
              )}
            </div>
            <Select
              label="Część"
              placeholder="Wybierz część"
              options={widok.czesci.map((c) => ({ value: c.id, label: c.nazwa }))}
              value={wybrana ?? ''}
              onChange={(e) => wybierz(e.currentTarget.value || null, true)}
            />
          </div>
        )}
        <div className="model3d__sterowanie">
          <Slider
            label="Obrót wokół modelu"
            min={0}
            max={359}
            step={1}
            value={obrot}
            onChange={(v) => {
              setObrot(v);
              p()?.obroc(v);
            }}
            formatValue={(v) => `${v}°`}
            disabled={stan !== 'gotowy'}
          />
          <div className="model3d__przyciski">
            <Button size="sm" variant="secondary" onClick={() => p()?.przybliz(1.4)} disabled={stan !== 'gotowy'}>
              Przybliż
            </Button>
            <Button size="sm" variant="secondary" onClick={() => p()?.przybliz(1 / 1.4)} disabled={stan !== 'gotowy'}>
              Oddal
            </Button>
            <Button size="sm" variant="ghost" onClick={() => p()?.resetujKamere()} disabled={stan !== 'gotowy'}>
              Widok wyjściowy
            </Button>
          </div>
          {widok.przekroj && (
            <Slider
              label="Przekrój"
              min={0}
              max={100}
              step={1}
              value={przekroj}
              onChange={(v) => {
                setPrzekroj(v);
                p()?.ustawPrzekroj(v === 0 ? Number.POSITIVE_INFINITY : przekrojNaWartosc(v));
              }}
              formatValue={opisPrzekroju}
              disabled={stan !== 'gotowy'}
            />
          )}
          {widok.przezroczystosc !== undefined && (
            <Slider
              label="Upierzenie"
              min={0}
              max={100}
              step={5}
              value={upierzenie}
              onChange={(v) => {
                setUpierzenie(v);
                p()?.ustawPrzezroczystosc(v / 100);
              }}
              formatValue={(v) => (v === 0 ? 'niewidoczne' : v === 100 ? 'pełne' : `widoczne w ${v}%`)}
              disabled={stan !== 'gotowy'}
            />
          )}
          {(widok.suwaki ?? []).map((s) => (
            <Slider
              key={`${widok.id}-${s.id}`}
              label={s.etykieta}
              min={0}
              max={100}
              step={1}
              value={suwaki[s.id] ?? s.domyslnie}
              onChange={(v) => {
                setSuwaki((x) => ({ ...x, [s.id]: v }));
                p()?.ustawParametr(s.id, v / 100);
              }}
              formatValue={(v) => (v === 0 ? s.min : v === 100 ? s.max : `${v}%`)}
              disabled={stan !== 'gotowy'}
            />
          ))}
          {widok.przelaczane && (
            <fieldset className="model3d__warstwy">
              <legend>Warstwy</legend>
              {widok.przelaczane.map((w) => (
                <Checkbox
                  key={w}
                  label={NAZWY_WARSTW[w]}
                  checked={warstwy[w] ?? false}
                  onChange={(e) => {
                    const tak = e.currentTarget.checked;
                    setWarstwy((x) => ({ ...x, [w]: tak }));
                    p()?.ustawWarstwe(w, tak);
                  }}
                  disabled={stan !== 'gotowy'}
                />
              ))}
            </fieldset>
          )}
        </div>
      </div>

      <figcaption className="model3d__podpis">{scena.podpis}</figcaption>
    </figure>
  );
}
