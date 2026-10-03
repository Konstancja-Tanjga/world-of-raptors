'use client';

import { useEffect, useRef, useState } from 'react';
import type { PoraDnia } from '@/lib/niebo';
import { useMedia, useMniejRuchu } from '@/lib/useMedia';
import { obrys, type Poza } from '@/lib/sylwetka';
import { SYLWETKI } from '@/lib/sylwetki';

/**
 * The opening scene: the sky over Warsaw at this hour, and in it what you
 * would see there. By day a kettle of migrating raptors circles in a thermal
 * (as over the Strait in autumn), climbs, and the birds at the top peel off
 * south-west in a glide; new ones join from below. At night there are stars,
 * the moon, and now and then an owl crossing it.
 *
 * The birds are the atlas silhouettes, seen from below as the B1 lessons
 * teach. A pause button stops the motion (WCAG 2.2.2); with reduced motion
 * the scene is a still frame.
 */

type Rodzaj = { id: string; rozpietosc: number; macha: number };

// A Strait-of-Gibraltar mix of soaring migrants, wingspans in metres.
const KOCIOL: Rodzaj[] = [
  { id: 'trzmielojad', rozpietosc: 1.42, macha: 0.35 },
  { id: 'trzmielojad', rozpietosc: 1.42, macha: 0.35 },
  { id: 'kania-czarna', rozpietosc: 1.45, macha: 0.3 },
  { id: 'orzelek-wlochaty', rozpietosc: 1.22, macha: 0.3 },
  { id: 'gadozer', rozpietosc: 1.8, macha: 0.2 },
  { id: 'sep-plowy', rozpietosc: 2.6, macha: 0.04 },
  { id: 'myszolow', rozpietosc: 1.2, macha: 0.35 },
  { id: 'scierwnik', rozpietosc: 1.62, macha: 0.15 },
];
const SOWY: Rodzaj[] = [
  { id: 'plomykowka', rozpietosc: 0.9, macha: 1 },
  { id: 'puszczyk', rozpietosc: 0.9, macha: 1 },
  { id: 'uszatka', rozpietosc: 0.95, macha: 1 },
];

const KLATKI = 16;
const POZA_LOTU: Poza = { wznios: 0.08, zgiecie: 0, ogon: 0.75 };

/** One wingbeat in KLATKI frames: wings up, the downstroke, then the hand folds on the way up. */
function pozaMachniecia(faza: number): Poza {
  const t = faza * Math.PI * 2;
  // cos(t) falls from wings-up through the downstroke; -sin(t) > 0 is the way back up.
  return { wznios: 0.85 * Math.cos(t), zgiecie: Math.max(0, -Math.sin(t)) * 0.38, ogon: 0.55 };
}

/** Outlines as Path2D, scaled to a unit wingspan, per species: soaring, then each wingbeat frame. */
function przygotujSciezki(rodzaje: Rodzaj[]) {
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

/** A small deterministic generator, so the first frame is always the same composition. */
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
  rodzaj: Rodzaj;
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

export function Niebo({ pora, opis }: { pora: PoraDnia; opis: string }) {
  const plotno = useRef<HTMLCanvasElement>(null);
  const [pauza, setPauza] = useState(false);
  const ruch = !useMniejRuchu();
  const precyzyjny = useMedia('(hover: hover) and (pointer: fine)');
  // The loop reads the latest pause without restarting the scene.
  const pauzaRef = useRef(pauza);
  useEffect(() => {
    pauzaRef.current = pauza;
  }, [pauza]);

  useEffect(() => {
    const canvas = plotno.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const noc = pora === 'noc';
    const sciezki = przygotujSciezki(noc ? SOWY : KOCIOL);
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
    const gwiazdy = noc
      ? Array.from({ length: Math.round((szer * wys) / 5200) }, () => ({ x: los(), y: los() * 0.85, r: 0.4 + los() * 1.1, faza: los() * 6.28 }))
      : [];
    let sowa: null | { x: number; y: number; rodzaj: Rodzaj; faza: number } = null;
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
          // Top of the thermal: glide out south-west, the way autumn migrants leave the Strait.
          const x = Math.cos(p.kat) * p.promien;
          const y = Math.sin(p.kat) * p.promien;
          p.odlot = { x, y, vx: -9 - Math.random() * 3, vy: 6 + Math.random() * 3 };
        }
      }
      if (noc) {
        doSowy -= dt;
        if (!sowa && doSowy <= 0) {
          sowa = { x: szer + 120, y: wys * (0.18 + Math.random() * 0.25), rodzaj: SOWY[Math.floor(Math.random() * SOWY.length)], faza: 0 };
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

    const rysuj = (czas: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (noc) {
        ctx.fillStyle = '#f2eee6';
        for (const g of gwiazdy) {
          ctx.globalAlpha = ruch ? 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(czas * 0.0011 + g.faza)) : 0.6;
          ctx.beginPath();
          ctx.arc(g.x * szer * dpr, g.y * wys * dpr, g.r * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
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

    const petla = (teraz: number) => {
      const dt = Math.min(0.05, (teraz - ostatni) / 1000);
      ostatni = teraz;
      if (!pauzaRef.current) krok(dt, teraz);
      rysuj(teraz);
      klatkaAnimacji = widoczny && ruch ? requestAnimationFrame(petla) : 0;
    };

    // A still frame first (also the whole scene with reduced motion), then the loop.
    if (!noc) for (let i = 0; i < 40; i++) krok(0.05, i * 50);
    rysuj(0);
    canvas.dataset.gotowe = '';
    if (ruch) klatkaAnimacji = requestAnimationFrame(petla);

    const widocznosc = new IntersectionObserver(([w]) => {
      widoczny = w.isIntersecting;
      if (widoczny && ruch && !klatkaAnimacji) {
        ostatni = performance.now();
        klatkaAnimacji = requestAnimationFrame(petla);
      }
    });
    widocznosc.observe(canvas);
    const rozmiar = new ResizeObserver(() => {
      dopasuj();
      rysuj(performance.now());
    });
    rozmiar.observe(canvas);

    return () => {
      cancelAnimationFrame(klatkaAnimacji);
      widocznosc.disconnect();
      rozmiar.disconnect();
      window.removeEventListener('pointermove', naRuch);
    };
  }, [pora, ruch, precyzyjny]);

  return (
    <>
      <canvas ref={plotno} className="niebo__plotno" role="img" aria-label={opis} />
      {ruch && (
        <button type="button" className="niebo__pauza" aria-pressed={pauza} onClick={() => setPauza((p) => !p)}>
          {pauza ? 'Wznów ruch' : 'Zatrzymaj ruch'}
        </button>
      )}
    </>
  );
}
