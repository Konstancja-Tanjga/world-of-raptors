import * as THREE from 'three';
import { Budowa, elipsoida, gladko, losowe, odcinek, rurka, type Barwa } from './geometria';

/*
 * The small models of module A9: a flight feather at three magnifications
 * (the whole feather, its barbs, the barbules that hook the barbs together)
 * and a humerus cut open, a bird's beside a mammal's. Each is one layer
 * ('zewnatrz') and lies along +x.
 */

const BRAZ = new THREE.Color(0x5a4636);
const BRAZ_JASNY = new THREE.Color(0x8a7058);
const ROG = 0xd8c49c;

/** A primary from a bird of prey's wingtip: a long shaft, a narrow outer and a broad inner vane, a notch. */
export function zbudujPioro() {
  const b = new Budowa();
  const X0 = -2.2; // where the vanes begin
  const X1 = 3.05; // the tip
  const dl = X1 - X0;
  const WCIECIE = 0.58;
  const promien = (u: number) => 0.075 * (1 - u) + 0.012;

  // The quill (calamus): hollow, open at the base, so you can look in.
  b.siatka(
    rurka([[-3.05, 0, 0], [-2.6, 0, 0], [X0, 0, 0]], (t) => 0.088 - t * 0.008, { n: 10, k: 20, barwa: ROG }),
    'dudka',
    'zewnatrz',
    { kolor: 0xffffff, szorstkosc: 0.35, przezroczystosc: 0.82 },
  );
  b.siatka(
    rurka([[X0, 0, 0], [0.4, 0.04, 0], [X1, 0.1, 0]], (t) => [promien(t), promien(t) * 1.15], { n: 50, k: 10, barwa: 0xe6d8bc }),
    'stosina',
    'zewnatrz',
    { szorstkosc: 0.45 },
  );

  // Barbs: thin beams off the shaft, angled towards the tip.
  const szerokosc = (u: number, wew: boolean) => {
    const pelna = (wew ? 0.78 : 0.3) * gladko(0, 0.06, u) * (u < 0.55 ? 1 : Math.sqrt(Math.max(0, 1 - ((u - 0.55) / 0.45) ** 2)));
    return pelna * (1 - (wew ? 0.45 : 0.4) * gladko(WCIECIE - 0.02, WCIECIE + 0.03, u));
  };
  const wiazki: Record<string, { m: THREE.Matrix4[]; barwy: THREE.Color[] }> = {};
  const dodaj = (id: string, m: THREE.Matrix4, barwa: THREE.Color) => {
    wiazki[id] ??= { m: [], barwy: [] };
    wiazki[id].m.push(m);
    wiazki[id].barwy.push(barwa);
  };
  const los = losowe(7);
  const KROK = 0.032;
  for (let x = X0 + 0.02; x < X1 - 0.03; x += KROK) {
    const u = (x - X0) / dl;
    const y = 0.04 * u + 0.06 * u * u;
    for (const wew of [true, false]) {
      const s = wew ? 1 : -1;
      const w = szerokosc(u, wew);
      if (w < 0.01) continue;
      const kat = ((wew ? 38 : 26) * Math.PI) / 180;
      const pas = Math.sin(u * 34) > 0.55;
      if (u < 0.14) {
        // The downy base: loose, fluffy barbs that do not hook together.
        for (let k = 0; k < 2; k++) {
          const a = new THREE.Vector3(x, y, s * promien(u) * 0.8);
          const kier = new THREE.Vector3(Math.cos(kat) + (los() - 0.5) * 0.6, (los() - 0.4) * 0.5, s * Math.sin(kat));
          const c = a.clone().addScaledVector(kier.normalize(), (w / Math.sin(kat)) * (0.7 + los() * 0.5));
          dodaj('czesc-puchowa', odcinek(a, c, 0.006), new THREE.Color(0xd9cfc2));
        }
        continue;
      }
      const a = new THREE.Vector3(x, y, s * promien(u) * 0.8);
      const c = new THREE.Vector3(x + w / Math.tan(kat), y - 0.03 * w, s * (w + promien(u)));
      const id = wew ? (u > WCIECIE ? 'wciecie' : 'choragiewka-wewnetrzna') : 'choragiewka-zewnetrzna';
      dodaj(id, odcinek(a, c, KROK * 0.9, 0.012), (pas ? BRAZ_JASNY : BRAZ).clone().offsetHSL(0, 0, (los() - 0.5) * 0.04));
    }
  }
  const belka = new THREE.BoxGeometry(1, 1, 1);
  belka.deleteAttribute('uv');
  for (const [id, { m, barwy }] of Object.entries(wiazki)) {
    b.kopie(belka.clone(), m, id, 'zewnatrz', (i) => barwy[i], { szorstkosc: 0.9 });
  }
  return b;
}

/** A piece of the shaft with barbs on one side, and the barbules on every barb (a few millimetres of feather). */
export function zbudujPromienie() {
  const b = new Budowa();
  b.siatka(rurka([[-4.2, 0, 0], [4.2, 0, 0]], (): [number, number] => [0.32, 0.4], { n: 4, k: 24, barwa: 0xe6d8bc, boczny: new THREE.Vector3(0, 0, 1) }), 'stosina-z-bliska', 'zewnatrz', {
    szorstkosc: 0.45,
  });
  const promienie: THREE.BufferGeometry[] = [];
  const promyki: THREE.Matrix4[] = [];
  const kat = (40 * Math.PI) / 180;
  const kier = new THREE.Vector3(Math.cos(kat), 0, Math.sin(kat));
  const DL = 5;
  for (let x = -4; x <= 2.8; x += 0.6) {
    const a = new THREE.Vector3(x, 0, 0.3);
    const c = a.clone().addScaledVector(kier, DL);
    promienie.push(rurka([[a.x, a.y, a.z], [c.x, c.y, c.z]], (t) => [0.05 - t * 0.025, 0.14 - t * 0.08], { n: 4, k: 10, barwa: BRAZ_JASNY }));
    // Barbules: towards the tip (distal) and towards the base (proximal), on every barb.
    for (let s = 0.12; s < DL - 0.1; s += 0.13) {
      const p = a.clone().addScaledVector(kier, s);
      const dystalny = p.clone().add(new THREE.Vector3(0.42, 0.04, -0.12));
      const proksymalny = p.clone().add(new THREE.Vector3(-0.36, -0.03, 0.26));
      promyki.push(odcinek(p, dystalny, 0.012, 0.03), odcinek(p, proksymalny, 0.012, 0.03));
    }
  }
  b.siatka(promienie, 'promien', 'zewnatrz', { szorstkosc: 0.7 });
  const belka = new THREE.BoxGeometry(1, 1, 1);
  belka.deleteAttribute('uv');
  b.kopie(belka, promyki, 'promyki', 'zewnatrz', () => 0xb39a7e, { szorstkosc: 0.85 });
  return b;
}

/**
 * Two neighbouring barbs and the barbules between them: the distal barbules
 * of one lie over the proximal barbules of the next and hook onto their
 * curled edge. `rozsun` (0–1) pulls the second barb away, as a bird's beak
 * or a twig does, and the hooks come free.
 */
export function zbudujHaczyki() {
  const b = new Budowa();
  const ODSTEP = 1.25;
  const dalszy = new THREE.Group();

  const promien = () => rurka([[-3, 0, 0], [3, 0, 0]], (): [number, number] => [0.07, 0.24], { n: 4, k: 16, barwa: BRAZ_JASNY, boczny: new THREE.Vector3(0, 0, 1) });
  b.siatka(promien(), 'promien-z-bliska', 'zewnatrz', { szorstkosc: 0.6 });
  const drugi = b.siatka(promien(), 'promien-z-bliska', 'zewnatrz', { szorstkosc: 0.6 });

  const dystalne: THREE.BufferGeometry[] = [];
  const haczyki: THREE.BufferGeometry[] = [];
  const proksymalne: THREE.BufferGeometry[] = [];
  for (let x = -2.7; x <= 2.5; x += 0.24) {
    // From the first barb: distal barbules reaching over, a row of hooks at the far end hanging down.
    const a: [number, number, number] = [x, 0.12, 0.05];
    const c: [number, number, number] = [x + 0.55, 0.18, ODSTEP - 0.15];
    dystalne.push(rurka([a, [x + 0.25, 0.2, ODSTEP * 0.5], c], (t) => [0.022 - t * 0.01, 0.03 - t * 0.012], { n: 10, k: 6, barwa: 0xc2a888 }));
    for (let h = 0; h < 3; h++) {
      const t = 0.62 + h * 0.13;
      const p = new THREE.Vector3(...a).lerp(new THREE.Vector3(...c), t);
      p.y += 0.04;
      const luk = new THREE.CubicBezierCurve3(
        p,
        p.clone().add(new THREE.Vector3(0.0, -0.02, 0.1)),
        p.clone().add(new THREE.Vector3(0.0, -0.2, 0.12)),
        p.clone().add(new THREE.Vector3(0.0, -0.22, 0.02)),
      );
      haczyki.push(rurka(luk, (t2) => 0.012 - t2 * 0.006, { n: 8, k: 5, barwa: 0xf0d9a8 }));
    }
    // From the second barb: proximal barbules, each with an upturned flange the hooks catch on.
    const pa = new THREE.Vector3(x + 0.12, -0.04, ODSTEP - 0.05);
    const pc = new THREE.Vector3(x - 0.18, -0.1, 0.25);
    proksymalne.push(rurka([[pa.x, pa.y, pa.z], [pc.x, pc.y, pc.z]], (t) => [0.016, 0.022 - t * 0.008], { n: 6, k: 6, barwa: 0x9b8166 }));
    const brzeg = pa.clone().lerp(pc, 0.15).add(new THREE.Vector3(0, 0.06, 0));
    const brzegKoniec = pa.clone().lerp(pc, 0.85).add(new THREE.Vector3(0, 0.04, 0));
    proksymalne.push(rurka([[brzeg.x, brzeg.y, brzeg.z], [brzegKoniec.x, brzegKoniec.y, brzegKoniec.z]], (): [number, number] => [0.008, 0.05], { n: 4, k: 6, barwa: 0x9b8166 }));
  }
  b.siatka(dystalne, 'promyki-dystalne', 'zewnatrz', { szorstkosc: 0.7 });
  b.siatka(haczyki, 'haczyki', 'zewnatrz', { szorstkosc: 0.5 });
  const prox = b.siatka(proksymalne, 'promyki-proksymalne', 'zewnatrz', { szorstkosc: 0.7 });

  drugi.position.z = ODSTEP;
  b.korzen.add(dalszy);
  // The second barb and its barbules move together.
  for (const m of [drugi, prox]) dalszy.attach(m);
  const parametr = (id: string, wartosc: number) => {
    if (id !== 'rozsun') return;
    dalszy.position.set(0, -0.35 * wartosc, 1.1 * wartosc);
  };
  return { b, parametr };
}

/** A bird's humerus: a thin wall around air, struts across it near the ends, and the opening an air sac comes in by. */
export function zbudujKoscPtaka() {
  const b = new Budowa();
  const ksztalt = (x: number) => 0.52 + 0.42 * gladko(1.4, 2.9, Math.abs(x));
  const sciana = 0.05;
  wydrazona(b, ksztalt, sciana, 'sciana-kosci', 0xe9dfc8);

  const los = losowe(11);
  const beleczki: THREE.Matrix4[] = [];
  const naScianie = (x: number, kat: number) => {
    const r = ksztalt(x) - sciana * 1.2;
    return new THREE.Vector3(x, Math.cos(kat) * r, Math.sin(kat) * r);
  };
  for (let i = 0; i < 140; i++) {
    // Most struts at the ends, where the joints load the bone; a few diagonal braces along the shaft.
    const koniec = i < 115;
    const strona = los() < 0.5 ? -1 : 1;
    const x = koniec ? strona * (1.5 + los() * 1.35) : (los() - 0.5) * 2.6;
    const a = naScianie(x, los() * Math.PI * 2);
    const c = koniec ? naScianie(x + (los() - 0.5) * 0.6, los() * Math.PI * 2) : naScianie(x + (los() < 0.5 ? -0.7 : 0.7), los() * Math.PI * 2);
    beleczki.push(odcinek(a, c, 0.035));
  }
  const belka = new THREE.CylinderGeometry(0.5, 0.5, 1, 6).rotateZ(Math.PI / 2);
  belka.deleteAttribute('uv');
  b.kopie(belka, beleczki, 'beleczki', 'zewnatrz', () => 0xe2d4b6, { szorstkosc: 0.6 });

  // The pneumatic foramen near the head of the bone, and the air sac's extension through it, lining the cavity.
  const otwor = new THREE.Vector3(2.35, 0, -ksztalt(2.35) + 0.02);
  b.siatka(elipsoida([otwor.x, otwor.y, otwor.z], [0.16, 0.12, 0.05], { barwa: 0x2a1d14 }), 'otwor-pneumatyczny', 'zewnatrz', { szorstkosc: 0.9 });
  b.siatka(
    [
      elipsoida([2.4, 0.1, -ksztalt(2.4) - 0.45], [0.42, 0.3, 0.38]),
      rurka([[2.4, 0.05, -ksztalt(2.4) - 0.2], [otwor.x, otwor.y, otwor.z], [2.2, 0, -0.2]], 0.1, { n: 10, k: 10 }),
      rurka([[-2.7, 0, 0], [2.7, 0, 0]], (t) => ksztalt(-2.7 + t * 5.4) - sciana * 1.8, { n: 60, k: 28 }),
    ],
    'uchylek-worka',
    'zewnatrz',
    { kolor: 0x7cc4ef, szorstkosc: 0.2, przezroczystosc: 0.2 },
  );
  return b;
}

/** A mammal's humerus for comparison: a thick wall, marrow inside, spongy bone at the ends. */
export function zbudujKoscSsaka() {
  const b = new Budowa();
  const ksztalt = (x: number) => 0.5 + 0.42 * gladko(1.4, 2.9, Math.abs(x));
  const sciana = 0.2;
  wydrazona(b, ksztalt, sciana, 'sciana-kosci-ssaka', 0xebe1cc);
  b.siatka(rurka([[-1.75, 0, 0], [1.75, 0, 0]], (t) => ksztalt(-1.75 + t * 3.5) - sciana - 0.01, { n: 30, k: 24 }), 'szpik', 'zewnatrz', {
    kolor: 0xc9744a,
    szorstkosc: 0.8,
  });
  const los = losowe(5);
  const gabczasta: THREE.Matrix4[] = [];
  for (let i = 0; i < 520; i++) {
    const strona = los() < 0.5 ? -1 : 1;
    const x = strona * (1.75 + los() * 1.15);
    const r = (ksztalt(x) - sciana) * Math.sqrt(los());
    const kat = los() * Math.PI * 2;
    const a = new THREE.Vector3(x, Math.cos(kat) * r, Math.sin(kat) * r);
    const c = a.clone().add(new THREE.Vector3((los() - 0.5) * 0.35, (los() - 0.5) * 0.35, (los() - 0.5) * 0.35));
    gabczasta.push(odcinek(a, c, 0.04));
  }
  const belka = new THREE.CylinderGeometry(0.5, 0.5, 1, 5).rotateZ(Math.PI / 2);
  belka.deleteAttribute('uv');
  b.kopie(belka, gabczasta, 'kosc-gabczasta', 'zewnatrz', () => 0xdcc9a6, { szorstkosc: 0.7 });
  return b;
}

/** A bone's wall: an outer surface and an inner one, closed at the ends. */
function wydrazona(b: Budowa, ksztalt: (x: number) => number, sciana: number, id: string, kolor: number) {
  const barwa: Barwa = () => kolor;
  b.siatka(
    [
      rurka([[-3, 0, 0], [3, 0, 0]], (t) => ksztalt(-3 + t * 6) * (t < 0.03 || t > 0.97 ? 0.6 : 1), { n: 80, k: 36, barwa }),
      rurka([[-2.9, 0, 0], [2.9, 0, 0]], (t) => ksztalt(-2.9 + t * 5.8) - sciana, { n: 80, k: 36, barwa }),
    ],
    id,
    'zewnatrz',
    { szorstkosc: 0.55 },
  );
}
