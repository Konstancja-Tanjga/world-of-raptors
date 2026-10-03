'use client';

import { useEffect, useMemo, useRef } from 'react';
import { obrys, POZA_SZYBOWANIE, ramka, sciezka, type Poza } from '@/lib/sylwetka';
import { POZY, pozaWLocie, STYL_LOTU, SYLWETKI } from '@/lib/sylwetki';
import { useMniejRuchu } from '@/lib/useMedia';

/** A number from 0 to 1 that depends only on the text: the same card shows the same variant until it is answered. */
function ziarno(tekst: string) {
  let h = 2166136261;
  for (const c of tekst) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
}

/**
 * A species' silhouette against the sky, flying the way it does: a kestrel
 * hovers, a sparrowhawk flaps and glides, a kite twists its tail. Each review
 * (`wariant`) shows it at a different heading and with a different spread of
 * wings and tail, so what is learnt is the shape, not one picture. With
 * reduced motion it holds still.
 */
export function ScenaSylwetki({ id, wariant, opis }: { id: string; wariant: string; opis: string }) {
  const sciezkaRef = useRef<SVGPathElement>(null);
  const grupaRef = useRef<SVGGElement>(null);
  const mniejRuchu = useMniejRuchu();
  const ksztalt = SYLWETKI[id];
  const styl = STYL_LOTU[id] ?? 'szybuje';

  const { baza, kat, skala } = useMemo(() => {
    const a = ziarno(`${wariant}:a`);
    const b = ziarno(`${wariant}:b`);
    const c = ziarno(`${wariant}:c`);
    const domyslna = POZY[id] ?? POZA_SZYBOWANIE;
    const baza: Poza = {
      wznios: domyslna.wznios,
      zgiecie: Math.min(0.45, domyslna.zgiecie + b * 0.22),
      ogon: 0.25 + c * 0.75,
    };
    return { baza, kat: (a - 0.5) * 70, skala: 0.82 + c * 0.16 };
  }, [id, wariant]);

  // The first frame, and the bird's middle, which it turns around.
  const { poczatek, srodek } = useMemo(() => {
    if (!ksztalt) return { poczatek: '', srodek: 0 };
    const punkty = obrys(ksztalt, baza);
    const [, y, , h] = ramka(punkty);
    return { poczatek: sciezka(punkty, 0.1), srodek: y + h / 2 };
  }, [ksztalt, baza]);

  useEffect(() => {
    const el = sciezkaRef.current;
    const g = grupaRef.current;
    if (!ksztalt || !el || !g) return;
    if (mniejRuchu) {
      el.setAttribute('d', poczatek);
      g.setAttribute('transform', `rotate(${kat}) scale(${skala})`);
      return;
    }
    let klatka = 0;
    const start = performance.now();
    const krok = (teraz: number) => {
      const t = (teraz - start) / 1000;
      const { poza, przechyl } = pozaWLocie(styl, t, baza);
      el.setAttribute('d', sciezka(obrys(ksztalt, poza)));
      g.setAttribute('transform', `rotate(${kat + przechyl}) scale(${skala})`);
      klatka = requestAnimationFrame(krok);
    };
    klatka = requestAnimationFrame(krok);
    return () => cancelAnimationFrame(klatka);
  }, [ksztalt, styl, baza, kat, skala, poczatek, mniejRuchu]);

  if (!ksztalt) return null;
  return (
    <svg className="scena-sylwetki" viewBox="-120 -110 240 220" role="img" aria-label={opis}>
      <g ref={grupaRef} transform={`rotate(${kat}) scale(${skala})`}>
        <path ref={sciezkaRef} d={poczatek} transform={`translate(0 ${-srodek})`} />
      </g>
    </svg>
  );
}
