import * as THREE from 'three';
import type { Budowa } from './geometria';
import { zbudujHaczyki, zbudujKoscPtaka, zbudujKoscSsaka, zbudujPioro, zbudujPromienie } from './mikro';
import { DROGI_POWIETRZA, zbudujPtaka } from './ptak';
import type { IdModelu, Punkt, Warstwa } from './sceny';

/** A built model as the viewer (scena.ts) uses it. */
export type Model = {
  korzen: THREE.Group;
  czesci: Map<string, THREE.Mesh[]>;
  warstwy: Map<Warstwa, THREE.Object3D[]>;
  /** Moves the model's own parts for one of its sliders. */
  parametr?: (id: string, wartosc: number) => void;
  /** Where one of its sliders puts the camera. */
  kamera?: (id: string, wartosc: number) => { pozycja: Punkt; cel: Punkt } | null;
  /** Plays one step of its cycle; `natychmiast` jumps to the step's end. */
  krok?: (id: string, natychmiast: boolean) => void;
  /** Advances what is moving by `dt` seconds; true while something still moves. */
  animuj?: (dt: number) => boolean;
};

const zBudowy = (b: Budowa): Model => ({ korzen: b.korzen, czesci: b.czesci, warstwy: b.warstwy });

/** Into the bone along its axis: from outside, three-quarters above, to the inside of one end, looking down the shaft. */
const doKosci = (id: string, w: number) => {
  if (id !== 'wejdz') return null;
  const t = w * w * (3 - 2 * w);
  const z = new THREE.Vector3(1.6, 3.2, 7.2);
  const s = new THREE.Vector3(-2.45, 0.05, 0.04);
  const p = z.lerp(s, t);
  const cel = new THREE.Vector3(0, 0, 0).lerp(new THREE.Vector3(1.5, 0, 0), t);
  return { pozycja: [p.x, p.y, p.z] as Punkt, cel: [cel.x, cel.y, cel.z] as Punkt };
};

export function zbudujModel(id: IdModelu): Model {
  switch (id) {
    case 'ptak': {
      const b = zbudujPtaka();
      return { ...zBudowy(b), ...oddech(b) };
    }
    case 'pioro':
      return zBudowy(zbudujPioro());
    case 'promienie':
      return zBudowy(zbudujPromienie());
    case 'haczyki': {
      const { b, parametr } = zbudujHaczyki();
      return { ...zBudowy(b), parametr };
    }
    case 'kosc-ptaka':
      return { ...zBudowy(zbudujKoscPtaka()), kamera: doKosci };
    case 'kosc-ssaka':
      return { ...zBudowy(zbudujKoscSsaka()), kamera: doKosci };
  }
}

// ---- The breathing cycle ----

const SWIEZE = new THREE.Color(0x8fe9ff);
const ZUZYTE = new THREE.Color(0xc18ce0);
const ILE = 28;
const CZAS = 2.6;

type Odcinek = keyof typeof DROGI_POWIETRZA;
/** One step: the path each parcel of air takes (none: not shown), whether the first goes stale on the way, and how the sacs move. */
const KROKI: Record<string, { a: Odcinek[] | null; b: Odcinek[] | null; zuzywa?: boolean; wdech: boolean }> = {
  'wdech-1': { a: ['zewnatrz', 'tchawica', 'doTylnych'], b: null, wdech: true },
  'wydech-1': { a: ['doPluc'], b: null, zuzywa: true, wdech: false },
  'wdech-2': { a: ['doPrzednich'], b: ['zewnatrz', 'tchawica', 'doTylnych'], wdech: true },
  'wydech-2': { a: ['naZewnatrz', 'tchawica', 'zewnatrz'], b: ['doPluc'], zuzywa: true, wdech: false },
};

/**
 * Air through the bird in two breaths: a parcel of fresh air (and, in the
 * second breath, the next one behind it) as a swarm of dots along the
 * airways, the sacs swelling on each breath in and emptying on each breath
 * out. The path back out runs the trachea the other way.
 */
function oddech(b: Budowa): Pick<Model, 'krok' | 'animuj'> {
  const kula = new THREE.SphereGeometry(0.032, 10, 8);
  // Drawn over everything, so the air shows through the sacs and the plumage.
  const czastki = new THREE.InstancedMesh(kula, new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true }), ILE * 2);
  czastki.renderOrder = 10;
  czastki.visible = false;
  czastki.frustumCulled = false;
  b.korzen.add(czastki);
  const worki = [...b.czesci.entries()].filter(([id]) => id.startsWith('wor')).flatMap(([, m]) => m);

  const krzywa = (odcinki: Odcinek[], strona: number) => {
    const punkty: THREE.Vector3[] = [];
    for (const o of odcinki) {
      // The way out runs the trachea and the outside backwards.
      const droga = o === 'tchawica' || o === 'zewnatrz' ? (odcinki[0] === 'naZewnatrz' ? [...DROGI_POWIETRZA[o]].reverse() : DROGI_POWIETRZA[o]) : DROGI_POWIETRZA[o];
      for (const [x, y, z] of droga) punkty.push(new THREE.Vector3(x * strona, y, z));
    }
    return new THREE.CatmullRomCurve3(punkty);
  };
  const rozrzut = Array.from({ length: ILE * 2 }, (_, i) => {
    const a = i * 2.39996;
    const r = 0.035 * Math.sqrt((i % ILE) / ILE);
    return { przesuniecie: new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, Math.sin(a * 1.7) * r), opoznienie: ((i * 7) % ILE) / ILE * 0.35 };
  });

  let stan: { krzyweA: THREE.Curve<THREE.Vector3>[] | null; krzyweB: THREE.Curve<THREE.Vector3>[] | null; zuzywa: boolean; zuzyteNaStart: boolean; skala: [number, number] } | null =
    null;
  let postep = 1;
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  const p = new THREE.Vector3();

  const ustaw = () => {
    if (!stan) return;
    const gladkie = (t: number) => t * t * (3 - 2 * t);
    for (let i = 0; i < ILE * 2; i++) {
      const doA = i < ILE;
      const krzywe = doA ? stan.krzyweA : stan.krzyweB;
      if (!krzywe) {
        m.makeScale(0, 0, 0);
        czastki.setMatrixAt(i, m);
        continue;
      }
      const r = rozrzut[i];
      const t = gladkie(Math.min(1, Math.max(0, (postep - r.opoznienie) / (1 - 0.35))));
      krzywe[i % 2].getPointAt(t, p).add(r.przesuniecie);
      m.makeTranslation(p.x, p.y, p.z);
      czastki.setMatrixAt(i, m);
      const zuzyte = doA && (stan.zuzyteNaStart || stan.zuzywa);
      c.copy(SWIEZE).lerp(ZUZYTE, zuzyte ? (stan.zuzyteNaStart ? 1 : t) : 0);
      czastki.setColorAt(i, c);
    }
    czastki.instanceMatrix.needsUpdate = true;
    if (czastki.instanceColor) czastki.instanceColor.needsUpdate = true;
    const s = stan.skala[0] + (stan.skala[1] - stan.skala[0]) * gladkie(Math.min(1, postep));
    for (const w of worki) w.scale.setScalar(s);
  };

  let poprzedniWdech = false;
  return {
    krok(id, natychmiast) {
      const k = KROKI[id];
      if (!k) return;
      const kolejny = Object.keys(KROKI).indexOf(id);
      const wymiar = (wdech: boolean) => (wdech ? 1.14 : 0.86);
      stan = {
        krzyweA: k.a && [krzywa(k.a, 1), krzywa(k.a, -1)],
        krzyweB: k.b && [krzywa(k.b, 1), krzywa(k.b, -1)],
        zuzywa: !!k.zuzywa && kolejny === 1,
        // After the first breath out, the first parcel is stale for the rest of the cycle.
        zuzyteNaStart: kolejny >= 2,
        skala: [kolejny === 0 && !poprzedniWdech ? 1 : wymiar(!k.wdech), wymiar(k.wdech)],
      };
      poprzedniWdech = k.wdech;
      czastki.visible = true;
      postep = natychmiast ? 1 : 0;
      ustaw();
    },
    animuj(dt) {
      if (!stan || postep >= 1) return false;
      postep = Math.min(1, postep + dt / CZAS);
      ustaw();
      return postep < 1;
    },
  };
}
