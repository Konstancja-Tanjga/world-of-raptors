'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { gwiazdyNaNiebie, ukladNaNiebie, type Gwiazdozbior, type Pole, type Polozenie } from '@/lib/gwiazdozbiory';
import { kluczGwiazdozbioru, kluczMistrza, type ModulNieba } from '@/lib/odznaki';
import { usePostep } from '@/lib/postep';
import { useZdobyte } from '@/lib/zdobyte';
import type { PoraDnia } from '@/lib/niebo';
import { useMedia, useMniejRuchu } from '@/lib/useMedia';
import { obrys, type Poza } from '@/lib/sylwetka';
import { KOCIOL, SOWY_NOCY, type PtakNieba } from '@/lib/rysunki';
import { SYLWETKI } from '@/lib/sylwetki';

/**
 * The opening scene's sky for the time of day it is given (by the clock, or
 * chosen in NieboStartu). By day a kettle of the Strait module's soaring
 * migrants circles in a thermal, climbs, and the birds at the top glide away;
 * new ones join from below. At night there are stars, the moon, now and then
 * an owl crossing it, and the constellations I have lit on "Moje niebo", in
 * the part of the sky the text leaves free.
 *
 * The birds are the atlas silhouettes, seen from below as the B1 lessons
 * teach. `pauza` (the scene's pause button, WCAG 2.2.2) holds the frame and
 * stops the loop; with reduced motion the scene is a still frame.
 */

const KLATKI = 16;
const POZA_LOTU: Poza = { wznios: 0.08, zgiecie: 0, ogon: 0.75 };

/** One wingbeat in KLATKI frames: wings up, the downstroke, then the hand folds on the way up. */
function pozaMachniecia(faza: number): Poza {
  const t = faza * Math.PI * 2;
  // cos(t) falls from wings-up through the downstroke; -sin(t) > 0 is the way back up.
  return { wznios: 0.85 * Math.cos(t), zgiecie: Math.max(0, -Math.sin(t)) * 0.38, ogon: 0.55 };
}

/** Outlines as Path2D, scaled to a unit wingspan, per species: soaring, then each wingbeat frame. */
function przygotujSciezki(rodzaje: PtakNieba[]) {
  const mapa = new Map<string, { szybowanie: Path2D; klatki: Path2D[] }>();
  for (const { id } of rodzaje) {
    if (mapa.has(id) || !SYLWETKI[id]) continue;
    const sciezka = (poza: Poza) => {
      const p = new Path2D();
      obrys(SYLWETKI[id], poza).forEach(([x, y], i) => (i === 0 ? p.moveTo(x / 200, y / 200) : p.lineTo(x / 200, y / 200)));
      p.closePath();
      return p;
    };
    mapa.set(id, {
      szybowanie: sciezka(POZA_LOTU),
      klatki: Array.from({ length: KLATKI }, (_, i) => sciezka(pozaMachniecia(i / KLATKI))),
    });
  }
  return mapa;
}

/**
 * A small seeded generator for where the birds and stars start, so a window
 * of the same size opens on the same composition. What happens later (wing
 * beats, departures, the owl) uses Math.random.
 */
function losowanie(ziarno: number) {
  let a = ziarno >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Ptak = {
  rodzaj: PtakNieba;
  promien: number;
  kat: number;
  omega: number;
  wysokosc: number;
  wznoszenie: number;
  machanie: number;
  faza: number;
  odlot: null | { x: number; y: number; vx: number; vy: number };
};

const H_MIN = 170;
const H_MAX = 950;

function nowyPtak(los: () => number, pierwszy: boolean): Ptak {
  const rodzaj = KOCIOL[Math.floor(los() * KOCIOL.length)];
  // Tighter than a real thermal, so the kettle reads as one column on screen.
  const promien = 4.5 + los() * 5;
  // Most birds in a kettle turn the same way.
  const kierunek = los() < 0.85 ? 1 : -1;
  return {
    rodzaj,
    promien,
    kat: los() * Math.PI * 2,
    omega: (kierunek * 4.2) / promien,
    wysokosc: pierwszy ? H_MIN + los() * (H_MAX - H_MIN) : H_MIN - 40 - los() * 60,
    wznoszenie: 7 + los() * 9,
    machanie: 0,
    faza: los(),
    odlot: null,
  };
}

/** A module's constellation for the night sky: which module, the lessons that light it, and its stars. */
export type GwiazdozbiorStartu = Pick<ModulNieba, 'slug' | 'lekcje'> & { gwiazdozbior: Gwiazdozbior };

/** A length from the stylesheet (`78%` of `baza`, `2.4rem` or px) in pixels; NaN when it is not set. */
function dlugosc(wartosc: string, baza: number) {
  const n = parseFloat(wartosc);
  if (wartosc.trim().endsWith('%')) return (n / 100) * baza;
  if (wartosc.trim().endsWith('rem')) return n * parseFloat(getComputedStyle(document.documentElement).fontSize);
  return n;
}

export function Niebo({
  pora,
  opis,
  pauza,
  gwiazdozbiory,
  tekst,
  dol,
}: {
  pora: PoraDnia;
  opis: string;
  pauza: boolean;
  /** Every module's constellation; the night sky draws those I have lit ("Moje niebo"). */
  gwiazdozbiory: GwiazdozbiorStartu[];
  /** The text over the sky and the row along its bottom, which the constellations keep clear of. */
  tekst: RefObject<HTMLElement | null>;
  dol: RefObject<HTMLElement | null>;
}) {
  const plotno = useRef<HTMLCanvasElement>(null);
  const ruch = !useMniejRuchu();
  const precyzyjny = useMedia('(hover: hover) and (pointer: fine)');
  // The loop reads the latest pause without restarting the scene; pausing
  // draws one still frame and stops the loop, resuming starts it again.
  const pauzaRef = useRef(pauza);
  const sterowanie = useRef<{ zatrzymaj: () => void; wznow: () => void; przerysuj: () => void } | null>(null);
  useEffect(() => {
    pauzaRef.current = pauza;
    if (pauza) sterowanie.current?.zatrzymaj();
    else sterowanie.current?.wznow();
  }, [pauza]);

  // My lit constellations (a finished module, or one recorded as lit) and their gold stars.
  const { postep } = usePostep();
  const { zdobyte } = useZdobyte();
  const zapalone = useMemo(
    () =>
      gwiazdozbiory.flatMap((g, indeks) => {
        const zapalony = (postep && g.lekcje.every((k) => postep[k])) || Boolean(zdobyte?.[kluczGwiazdozbioru(g.slug)]);
        return zapalony ? [{ indeks, gwiazdozbior: g.gwiazdozbior, mistrz: Boolean(zdobyte?.[kluczMistrza(g.slug)]) }] : [];
      }),
    [gwiazdozbiory, postep, zdobyte],
  );
  const zapaloneRef = useRef(zapalone);
  useEffect(() => {
    zapaloneRef.current = zapalone;
    sterowanie.current?.przerysuj();
  }, [zapalone]);

  useEffect(() => {
    const canvas = plotno.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      // The section's own gradient is still the sky; only the birds and stars are missing.
      if (canvas) console.warn('[Niebo] no 2D canvas context; the sky stays without birds');
      return;
    }

    const noc = pora === 'noc';
    const sciezki = przygotujSciezki(noc ? SOWY_NOCY : KOCIOL);
    const los = losowanie(noc ? 17 : 4);
    const kolor = getComputedStyle(canvas).getPropertyValue('--wor-sylwetka').trim() || '#0d131b';

    let szer = 0;
    let wys = 0;
    let dpr = 1;
    const dopasuj = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      szer = canvas.clientWidth;
      wys = canvas.clientHeight;
      canvas.width = Math.round(szer * dpr);
      canvas.height = Math.round(wys * dpr);
    };
    dopasuj();

    const liczba = noc ? 0 : Math.round(Math.min(22, Math.max(9, szer / 70)) * (pora === 'dzien' ? 1 : 0.55));
    const ptaki: Ptak[] = Array.from({ length: liczba }, () => nowyPtak(los, true));
    // Stars sit at fractions of the canvas, about one per 5200 px²; a resize adds or removes some to keep that density.
    const ileGwiazd = () => (noc ? Math.round((szer * wys) / 5200) : 0);
    const nowaGwiazda = () => ({ x: los(), y: los() * 0.85, r: 0.4 + los() * 1.1, faza: los() * 6.28 });
    const gwiazdy = Array.from({ length: ileGwiazd() }, nowaGwiazda);
    let sowa: null | { x: number; y: number; rodzaj: PtakNieba; faza: number } = null;
    let doSowy = 2.5;

    // Pointer parallax: the near birds move more than the far ones.
    const kamera = { x: 0, y: 0, cx: 0, cy: 0 };
    const naRuch = (e: PointerEvent) => {
      kamera.cx = (e.clientX / window.innerWidth - 0.5) * 18;
      kamera.cy = (e.clientY / window.innerHeight - 0.5) * 12;
    };
    if (ruch && precyzyjny) window.addEventListener('pointermove', naRuch);

    // Projection: looking straight up; a buzzard 600 m up is about 2% of the width, the nearest ones several times that.
    const rzut = (x: number, y: number, h: number) => {
      const F = Math.max(szer, 700) * 11;
      const srodekX = szer * (szer > 900 ? 0.66 : 0.5);
      const srodekY = wys * (szer > 900 ? 0.42 : 0.3);
      return { sx: srodekX + ((x - kamera.x) * F) / h, sy: srodekY + ((y - kamera.y) * F) / h, k: F / h };
    };

    const rysujPtaka = (id: string, x: number, y: number, kierunek: number, rozpietoscPx: number, przechyl: number, klatka: number | null, alfa: number) => {
      const s = sciezki.get(id);
      if (!s) return;
      const sciezka = klatka === null ? s.szybowanie : s.klatki[klatka];
      const c = Math.cos(kierunek + Math.PI / 2);
      const sn = Math.sin(kierunek + Math.PI / 2);
      const sx = rozpietoscPx * Math.cos(przechyl);
      const sy = rozpietoscPx;
      ctx.setTransform(dpr * c * sx, dpr * sn * sx, -dpr * sn * sy, dpr * c * sy, dpr * x, dpr * y);
      ctx.globalAlpha = alfa;
      ctx.fill(sciezka);
    };

    let ostatni = performance.now();
    let klatkaAnimacji = 0;
    let widoczny = true;

    const krok = (dt: number, czas: number) => {
      kamera.x += (kamera.cx - kamera.x) * Math.min(1, dt * 2);
      kamera.y += (kamera.cy - kamera.y) * Math.min(1, dt * 2);
      for (let i = 0; i < ptaki.length; i++) {
        const p = ptaki[i];
        if (p.odlot) {
          p.odlot.x += p.odlot.vx * dt;
          p.odlot.y += p.odlot.vy * dt;
          p.wysokosc -= 3 * dt;
          const { sx, sy } = rzut(p.odlot.x, p.odlot.y, p.wysokosc);
          if (sx < -200 || sx > szer + 200 || sy < -200 || sy > wys + 200) ptaki[i] = nowyPtak(los, false);
          continue;
        }
        p.kat += p.omega * dt;
        p.wysokosc += p.wznoszenie * dt;
        if (p.machanie > 0) p.machanie -= dt;
        else if (Math.random() < p.rodzaj.macha * dt * 0.08) p.machanie = 0.8 + Math.random() * 1.2;
        if (p.machanie > 0) p.faza = (p.faza + dt * (3.2 / Math.sqrt(p.rodzaj.rozpietosc))) % 1;
        if (p.wysokosc > H_MAX) {
          // Top of the thermal: glide away, as migrants do once a thermal has lifted them high enough.
          const x = Math.cos(p.kat) * p.promien;
          const y = Math.sin(p.kat) * p.promien;
          p.odlot = { x, y, vx: -9 - Math.random() * 3, vy: 6 + Math.random() * 3 };
        }
      }
      if (noc) {
        doSowy -= dt;
        if (!sowa && doSowy <= 0) {
          sowa = { x: szer + 120, y: wys * (0.18 + Math.random() * 0.25), rodzaj: SOWY_NOCY[Math.floor(Math.random() * SOWY_NOCY.length)], faza: 0 };
        }
        if (sowa) {
          sowa.x -= dt * Math.max(90, szer * 0.09);
          sowa.y += Math.sin(czas * 0.0012) * dt * 6;
          sowa.faza = (sowa.faza + dt * 1.6) % 1;
          if (sowa.x < -160) {
            sowa = null;
            doSowy = 9 + Math.random() * 8;
          }
        }
      }
    };

    // Where my constellations go: a slot for every module in the sky the text
    // leaves free (beside it on a wide screen, above it on a narrow one),
    // clear of the moon. Worked out again when the sky or the text changes size.
    let uklad: Polozenie[] | null = null;
    let ulozone = false;
    const uloz = () => {
      ulozone = true;
      uklad = null;
      // The text itself rather than its boxes: the title's box is wider than its lines.
      const bloki = [...(tekst.current?.children ?? [])]
        .map((e) => {
          const zakres = document.createRange();
          zakres.selectNodeContents(e);
          return zakres.getBoundingClientRect();
        })
        .filter((r) => r.width && r.height);
      if (!bloki.length) return;
      const scena = canvas.getBoundingClientRect();
      const styl = getComputedStyle(canvas);
      const lewo = Math.min(...bloki.map((r) => r.left)) - scena.left;
      const prawo = Math.max(...bloki.map((r) => r.right)) - scena.left;
      const gora = Math.min(...bloki.map((r) => r.top)) - scena.top;
      const spod = (dol.current?.getBoundingClientRect().top ?? scena.bottom) - scena.top;
      // The scene starts under the navigation, which its top padding makes room for.
      const nawigacja = parseFloat(getComputedStyle(canvas.parentElement ?? canvas).paddingTop) || 0;
      const odstep = 16;
      // The sky runs past the text column, so on a very wide screen the constellations may too.
      const brzeg = szer - Math.min(lewo, 3 * odstep);
      const pola: Pole[] = [
        [prawo + 2 * odstep, nawigacja + odstep, brzeg, spod - odstep],
        [lewo, nawigacja + odstep, brzeg, gora - odstep],
      ];
      // The moon is a gradient in start.css; its custom properties say where.
      const ksiezyc = {
        x: dlugosc(styl.getPropertyValue('--ksiezyc-x'), szer),
        y: dlugosc(styl.getPropertyValue('--ksiezyc-y'), wys),
        r: dlugosc(styl.getPropertyValue('--ksiezyc-r'), 0) + odstep,
      };
      const proporcja = Math.max(...gwiazdozbiory.map((g) => g.gwiazdozbior.proporcja));
      uklad = ukladNaNiebie(
        gwiazdozbiory.length,
        proporcja,
        pola,
        Number.isFinite(ksiezyc.x + ksiezyc.y + ksiezyc.r) ? ksiezyc : { x: 0, y: 0, r: 0 },
        szer,
        wys,
        // About a tenth of the sky's width, as large as on the "Moje niebo" map at most.
        { maks: Math.min(140, Math.max(90, szer * 0.07)) },
      );
    };

    // My constellations: thin lines between stars brighter than the rest, a gold star on a mastered one's head.
    const rysujGwiazdozbiory = (czas: number) => {
      if (!zapaloneRef.current.length) return;
      if (!ulozone) uloz();
      if (!uklad) return;
      const migocze = ruch && !pauzaRef.current;
      for (const g of zapaloneRef.current) {
        const p = uklad[g.indeks];
        if (!p) continue;
        const punkty = gwiazdyNaNiebie(g.gwiazdozbior, p, szer, wys);
        // Star sizes follow the constellation's, so a small one on a narrow screen stays a figure, not a smudge.
        const w = p.szer * szer;
        const rdzen = Math.min(1.6, Math.max(1.1, w / 70)) * dpr;
        ctx.globalAlpha = 0.32;
        ctx.strokeStyle = '#f2eee6';
        ctx.lineWidth = dpr;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        punkty.forEach(([x, y], i) => (i ? ctx.lineTo(x * dpr, y * dpr) : ctx.moveTo(x * dpr, y * dpr)));
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = '#fff8ea';
        punkty.forEach(([x, y], i) => {
          const blask = migocze ? 0.85 + 0.15 * Math.sin(czas * 0.0013 + i * 1.7 + g.indeks) : 1;
          ctx.globalAlpha = 0.2 * blask;
          ctx.beginPath();
          ctx.arc(x * dpr, y * dpr, rdzen * 2.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.95 * blask;
          ctx.beginPath();
          ctx.arc(x * dpr, y * dpr, rdzen, 0, Math.PI * 2);
          ctx.fill();
        });
        if (g.mistrz) {
          const [x, y] = punkty[0];
          const r = Math.min(8, Math.max(5, w / 14)) * dpr;
          const q = r * 0.22;
          ctx.fillStyle = '#f5b75b';
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          ctx.arc(x * dpr, y * dpr, r * 1.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.moveTo(x * dpr, y * dpr - r);
          ctx.lineTo(x * dpr + q, y * dpr - q);
          ctx.lineTo(x * dpr + r, y * dpr);
          ctx.lineTo(x * dpr + q, y * dpr + q);
          ctx.lineTo(x * dpr, y * dpr + r);
          ctx.lineTo(x * dpr - q, y * dpr + q);
          ctx.lineTo(x * dpr - r, y * dpr);
          ctx.lineTo(x * dpr - q, y * dpr - q);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    const rysuj = (czas: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (noc) {
        ctx.fillStyle = '#f2eee6';
        for (const g of gwiazdy) {
          ctx.globalAlpha = ruch && !pauzaRef.current ? 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(czas * 0.0011 + g.faza)) : 0.6;
          ctx.beginPath();
          ctx.arc(g.x * szer * dpr, g.y * wys * dpr, g.r * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        rysujGwiazdozbiory(czas);
        if (sowa) {
          ctx.fillStyle = kolor;
          const rozp = Math.min(150, Math.max(70, szer * 0.085));
          rysujPtaka(sowa.rodzaj.id, sowa.x, sowa.y, Math.PI, rozp, 0, Math.floor(sowa.faza * KLATKI), 0.92);
        }
        ctx.globalAlpha = 1;
        return;
      }
      // Far birds first; distance thins them into the sky.
      const kolejnosc = [...ptaki].sort((a, b) => b.wysokosc - a.wysokosc);
      ctx.fillStyle = kolor;
      for (const p of kolejnosc) {
        const x = p.odlot ? p.odlot.x : Math.cos(p.kat) * p.promien;
        const y = p.odlot ? p.odlot.y : Math.sin(p.kat) * p.promien;
        // The thermal leans with the wind, so higher birds drift.
        const dryf = (p.wysokosc - H_MIN) * 0.012;
        const { sx, sy, k } = rzut(x + dryf, y - dryf * 0.6, Math.max(60, p.wysokosc));
        const kierunek = p.odlot ? Math.atan2(p.odlot.vy, p.odlot.vx) : p.kat + (p.omega > 0 ? Math.PI / 2 : -Math.PI / 2);
        const przechyl = p.odlot ? 0.1 : 0.55;
        const glebia = Math.min(1, Math.max(0, (p.wysokosc - H_MIN) / (H_MAX - H_MIN)));
        const alfa = 0.95 - glebia * 0.5;
        rysujPtaka(p.rodzaj.id, sx, sy, kierunek, p.rodzaj.rozpietosc * k, przechyl, p.machanie > 0 ? Math.floor(p.faza * KLATKI) : null, alfa);
      }
      ctx.globalAlpha = 1;
    };

    // The loop runs while the scene is on screen, motion is allowed and it is not paused.
    const uruchom = () => {
      if (klatkaAnimacji || !widoczny || !ruch || pauzaRef.current) return;
      ostatni = performance.now();
      klatkaAnimacji = requestAnimationFrame(petla);
    };
    const petla = (teraz: number) => {
      klatkaAnimacji = 0;
      const dt = Math.min(0.05, (teraz - ostatni) / 1000);
      ostatni = teraz;
      krok(dt, teraz);
      rysuj(teraz);
      uruchom();
    };
    sterowanie.current = {
      zatrzymaj: () => {
        cancelAnimationFrame(klatkaAnimacji);
        klatkaAnimacji = 0;
        rysuj(performance.now());
      },
      wznow: uruchom,
      // A still frame (paused, or reduced motion) is redrawn when my constellations change.
      przerysuj: () => {
        if (!klatkaAnimacji) rysuj(performance.now());
      },
    };

    // A still frame first (also the whole scene with reduced motion), then the loop.
    if (!noc) for (let i = 0; i < 40; i++) krok(0.05, i * 50);
    rysuj(0);
    canvas.dataset.gotowe = '';
    uruchom();

    const widocznosc = new IntersectionObserver(([w]) => {
      widoczny = w.isIntersecting;
      uruchom();
    });
    widocznosc.observe(canvas);
    const rozmiar = new ResizeObserver(() => {
      dopasuj();
      const n = ileGwiazd();
      while (gwiazdy.length < n) gwiazdy.push(nowaGwiazda());
      gwiazdy.length = n;
      ulozone = false;
      rysuj(performance.now());
    });
    rozmiar.observe(canvas);
    // The text can change size on its own (a web font arriving, a longer line for another hour).
    const zmianaTekstu = new ResizeObserver(() => {
      ulozone = false;
      sterowanie.current?.przerysuj();
    });
    if (noc) for (const e of [...(tekst.current?.children ?? []), dol.current]) if (e) zmianaTekstu.observe(e);

    return () => {
      sterowanie.current = null;
      cancelAnimationFrame(klatkaAnimacji);
      widocznosc.disconnect();
      rozmiar.disconnect();
      zmianaTekstu.disconnect();
      window.removeEventListener('pointermove', naRuch);
    };
  }, [pora, ruch, precyzyjny, gwiazdozbiory, tekst, dol]);

  return <canvas ref={plotno} className="niebo__plotno" role="img" aria-label={opis} />;
}
