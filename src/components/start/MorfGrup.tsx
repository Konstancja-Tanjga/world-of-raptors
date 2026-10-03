'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { obrys, posredni, posredniaPoza, POZA_SZYBOWANIE, sciezka, type Ksztalt, type Poza } from '@/lib/sylwetka';
import { POZY, SYLWETKI } from '@/lib/sylwetki';
import type { GrupaSylwetki } from '@/lib/types';
import { useMniejRuchu } from '@/lib/useMedia';


const CZAS_MORFU = 820;
const CZAS_POKAZU = 3200;
const wygladzenie = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** **Bold** from the lesson table; the table's footnote asterisk has no footnote here, so it goes. */
function tekst(md: string): ReactNode[] {
  return md
    .split(/(\*\*[^*]+\*\*)/)
    .map((czesc, i) => (czesc.startsWith('**') ? <strong key={i}>{czesc.slice(2, -2)}</strong> : czesc.replace(/\*/g, '')));
}

/**
 * The eight silhouette groups of B1, one at a time: choosing a group morphs
 * the silhouette into it, so what changes on screen (tail, wing width,
 * fingers, head) is exactly what tells the groups apart. It steps through the
 * groups by itself while in view, until the reader picks one or presses
 * pause; with reduced motion it neither plays nor morphs.
 */
export function MorfGrup({ grupy, children }: { grupy: GrupaSylwetki[]; children?: ReactNode }) {
  const [wybrana, setWybrana] = useState(0);
  const [pokaz, setPokaz] = useState(true);
  const [widoczna, setWidoczna] = useState(false);
  const mniejRuchu = useMniejRuchu();
  const sciezkaRef = useRef<SVGPathElement>(null);
  const sladRef = useRef<SVGPathElement>(null);
  const kontener = useRef<HTMLDivElement>(null);
  const biezacy = useRef<{ k: Ksztalt; p: Poza } | null>(null);
  const nazwa = useId();
  const grupa = grupy[wybrana];
  // The first group is drawn on the server, so the section has its silhouette before any script runs.
  const pierwsza = useMemo(() => {
    const g = grupy[0].gatunek;
    return SYLWETKI[g] ? sciezka(obrys(SYLWETKI[g], POZY[g] ?? POZA_SZYBOWANIE)) : undefined;
  }, [grupy]);

  // Morph from wherever the drawing is now (even mid-morph) to the chosen group.
  useEffect(() => {
    const cel = SYLWETKI[grupa.gatunek];
    const celPoza = POZY[grupa.gatunek] ?? POZA_SZYBOWANIE;
    const sciezkaEl = sciezkaRef.current;
    if (!cel || !sciezkaEl) return;
    const start = biezacy.current;
    const rysuj = (k: Ksztalt, p: Poza) => {
      biezacy.current = { k, p };
      sciezkaEl.setAttribute('d', sciezka(obrys(k, p)));
    };
    if (!start || mniejRuchu) {
      rysuj(cel, celPoza);
      return;
    }
    sladRef.current?.setAttribute('d', sciezka(obrys(start.k, start.p)));
    sladRef.current?.animate([{ opacity: 0.55 }, { opacity: 0 }], { duration: CZAS_MORFU * 1.4, easing: 'ease-out', fill: 'forwards' });
    let klatka = 0;
    const t0 = performance.now();
    const krok = (teraz: number) => {
      const t = Math.min(1, (teraz - t0) / CZAS_MORFU);
      const e = wygladzenie(t);
      rysuj(posredni(start.k, cel, e), posredniaPoza(start.p, celPoza, e));
      if (t < 1) klatka = requestAnimationFrame(krok);
    };
    klatka = requestAnimationFrame(krok);
    return () => cancelAnimationFrame(klatka);
  }, [grupa.gatunek, mniejRuchu]);

  // Play only while the section is on screen.
  useEffect(() => {
    const el = kontener.current;
    if (!el) return;
    const obserwator = new IntersectionObserver(([w]) => setWidoczna(w.isIntersecting), { threshold: 0.35 });
    obserwator.observe(el);
    return () => obserwator.disconnect();
  }, []);

  const gra = pokaz && widoczna && !mniejRuchu;
  useEffect(() => {
    if (!gra) return;
    const t = setTimeout(() => setWybrana((w) => (w + 1) % grupy.length), CZAS_POKAZU);
    return () => clearTimeout(t);
  }, [gra, wybrana, grupy.length]);

  return (
    <div className="morf" ref={kontener}>
      <div className="morf__scena">
        <svg className="morf__rysunek" viewBox="-108 -34 216 150" role="img" aria-labelledby={`${nazwa}-opis`}>
          <title id={`${nazwa}-opis`}>{`Sylwetka od spodu: ${grupa.nazwa.toLowerCase()}`}</title>
          <path ref={sladRef} className="morf__slad" />
          <path ref={sciezkaRef} className="morf__ksztalt" d={pierwsza} />
        </svg>
        <p className="morf__nazwa" aria-hidden="true">
          {grupa.nazwa}
        </p>
      </div>
      <div className="morf__panel">
        <fieldset className="morf__wybor">
          <legend className="visually-hidden">Grupa sylwetki</legend>
          {grupy.map((g, i) => (
            <label key={g.nazwa} className="morf__opcja">
              <input
                type="radio"
                name={nazwa}
                value={g.nazwa}
                checked={i === wybrana}
                onChange={() => {
                  setPokaz(false);
                  setWybrana(i);
                }}
              />
              <span>{g.nazwa}</span>
            </label>
          ))}
        </fieldset>
        <dl className="morf__cechy">
          <div>
            <dt>Skrzydła</dt>
            <dd>{tekst(grupa.skrzydla)}</dd>
          </div>
          <div>
            <dt>Ogon</dt>
            <dd>{tekst(grupa.ogon)}</dd>
          </div>
          <div>
            <dt>Głowa</dt>
            <dd>{tekst(grupa.glowa)}</dd>
          </div>
          <div>
            <dt>Przykłady</dt>
            <dd>{tekst(grupa.przyklady)}</dd>
          </div>
        </dl>
        <div className="morf__akcje">
          {children}
          {!mniejRuchu && (
            <button type="button" className="morf__pokaz" onClick={() => setPokaz((p) => !p)}>
              {pokaz ? 'Zatrzymaj pokaz' : 'Pokazuj po kolei'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
