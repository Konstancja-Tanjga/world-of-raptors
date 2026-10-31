import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Punkt, Warstwa } from './sceny';

/*
 * The building blocks of the 3D models (modele.ts): tubes along curves,
 * ellipsoids, feathers, plates, and a model under construction that files
 * each mesh under its part and layer. No DOM: the tests build every model in
 * Node.
 */

export const v = (p: Punkt) => new THREE.Vector3(p[0], p[1], p[2]);

/** Linear interpolation in a table of rows [key, ...values], sorted by key. */
export function wTabeli(tabela: number[][], klucz: number): number[] {
  if (klucz <= tabela[0][0]) return tabela[0].slice(1);
  for (let i = 1; i < tabela.length; i++) {
    const [k1, ...b] = tabela[i];
    if (klucz <= k1) {
      const [k0, ...a] = tabela[i - 1];
      const t = (klucz - k0) / (k1 - k0);
      return a.map((x, j) => x + (b[j] - x) * t);
    }
  }
  return tabela[tabela.length - 1].slice(1);
}

export const gladko = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A deterministic random source (mulberry32), so a model looks the same on every visit. */
export function losowe(ziarno: number) {
  let a = ziarno >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Kolor = THREE.Color | number;
/** A colour per vertex, from its position (and, for feathers, its place along and across the feather). */
export type Barwa = (p: THREE.Vector3, u: number, w: number) => Kolor;

export function pokoloruj(g: THREE.BufferGeometry, barwa: Barwa | Kolor, uv?: number[]) {
  const poz = g.getAttribute('position');
  const kolory = new Float32Array(poz.count * 3);
  const p = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < poz.count; i++) {
    p.fromBufferAttribute(poz, i);
    const k = typeof barwa === 'function' ? barwa(p, uv?.[i * 2] ?? 0, uv?.[i * 2 + 1] ?? 0) : barwa;
    c.set(k);
    kolory.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(kolory, 3));
  return g;
}

/**
 * A tube along a curve, closed at both ends. `r(t)` gives its radius at
 * t ∈ [0, 1], or [side, up] radii for an elliptical section. With `boczny`
 * the section's first axis stays along that direction (the body's centreline
 * lies in the mid-plane, so its sides stay left and right); otherwise the
 * curve's own frames turn it.
 */
export function rurka(
  sciezka: Punkt[] | THREE.Curve<THREE.Vector3>,
  r: number | ((t: number) => number | [number, number]),
  { n = 24, k = 12, boczny, barwa = 0xffffff }: { n?: number; k?: number; boczny?: THREE.Vector3; barwa?: Barwa | Kolor } = {},
) {
  const krzywa = Array.isArray(sciezka) ? new THREE.CatmullRomCurve3(sciezka.map(v)) : sciezka;
  const ramki = krzywa.computeFrenetFrames(n, false);
  const poz: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const B = new THREE.Vector3();
  const N = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const c = krzywa.getPointAt(t);
    const T = ramki.tangents[i];
    if (boczny) {
      B.copy(boczny).addScaledVector(T, -boczny.dot(T)).normalize();
      N.crossVectors(T, B);
    } else {
      B.copy(ramki.binormals[i]);
      N.copy(ramki.normals[i]);
    }
    const rr = typeof r === 'number' ? r : r(t);
    const [rx, ry] = Array.isArray(rr) ? rr : [rr, rr];
    for (let j = 0; j < k; j++) {
      const a = (j / k) * Math.PI * 2;
      poz.push(
        c.x + B.x * Math.cos(a) * rx + N.x * Math.sin(a) * ry,
        c.y + B.y * Math.cos(a) * rx + N.y * Math.sin(a) * ry,
        c.z + B.z * Math.cos(a) * rx + N.z * Math.sin(a) * ry,
      );
      uv.push(t, j / k);
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      const a = i * k + j;
      const b = (i + 1) * k + j;
      const c = i * k + ((j + 1) % k);
      const d = (i + 1) * k + ((j + 1) % k);
      idx.push(a, c, b, c, d, b);
    }
  }
  // Both ends closed by a fan around their centre.
  const p0 = krzywa.getPointAt(0);
  const p1 = krzywa.getPointAt(1);
  const s0 = poz.length / 3;
  poz.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
  uv.push(0, 0, 1, 0);
  for (let j = 0; j < k; j++) {
    idx.push(s0, (j + 1) % k, j);
    idx.push(s0 + 1, n * k + j, n * k + ((j + 1) % k));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return pokoloruj(g, barwa, uv);
}

/** An ellipsoid with radii `r` around `srodek`, turned by `obrot` (Euler angles in radians). */
export function elipsoida(srodek: Punkt, r: Punkt, { obrot = [0, 0, 0] as Punkt, barwa = 0xffffff as Barwa | Kolor, w = 28, h = 18 } = {}) {
  const g = new THREE.SphereGeometry(1, w, h);
  g.scale(r[0], r[1], r[2]);
  g.rotateX(obrot[0]);
  g.rotateY(obrot[1]);
  g.rotateZ(obrot[2]);
  g.translate(srodek[0], srodek[1], srodek[2]);
  g.deleteAttribute('uv');
  return pokoloruj(g, barwa);
}

/**
 * A surface over a grid of (u, w) ∈ [0, 1]², from a function giving each
 * point; double-sided when drawn, so it needs no thickness.
 */
export function plat(f: (u: number, w: number) => THREE.Vector3, nu: number, nw: number, barwa: Barwa | Kolor = 0xffffff) {
  const poz: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= nu; i++) {
    for (let j = 0; j <= nw; j++) {
      const p = f(i / nu, j / nw);
      poz.push(p.x, p.y, p.z);
      uv.push(i / nu, j / nw);
    }
  }
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nw; j++) {
      const a = i * (nw + 1) + j;
      const b = a + nw + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return pokoloruj(g, barwa, uv);
}

/** A side profile (points [z, y]) pushed out to a width, narrowing towards +z by `zwezenie`; bevelled. */
export function profil(punkty: [number, number][], szerokosc: number, { zwezenie = 0, barwa = 0xffffff as Barwa | Kolor, faza = 0.02 } = {}) {
  const ksztalt = new THREE.Shape(punkty.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(ksztalt, {
    depth: szerokosc,
    bevelEnabled: faza > 0,
    bevelThickness: faza,
    bevelSize: faza,
    bevelSegments: 4,
    curveSegments: 8,
  });
  g.rotateY(-Math.PI / 2);
  g.translate(szerokosc / 2, 0, 0);
  const z0 = Math.min(...punkty.map((p) => p[0]));
  const z1 = Math.max(...punkty.map((p) => p[0]));
  const poz = g.getAttribute('position');
  for (let i = 0; i < poz.count; i++) {
    const t = (poz.getZ(i) - z0) / (z1 - z0 || 1);
    poz.setX(i, poz.getX(i) * (1 - zwezenie * Math.min(1, Math.max(0, t))));
  }
  g.deleteAttribute('uv');
  const wynik = g.index ? g.toNonIndexed() : g;
  wynik.computeVertexNormals();
  return pokoloruj(wynik, barwa);
}

export type Pioro = {
  /** Where the quill enters the skin, the feather's direction, and which side its inner (broad) vane lies. */
  podstawa: THREE.Vector3;
  kierunek: THREE.Vector3;
  /** Default: the trailing side of a right-wing feather lying flat (up × direction). */
  wewnatrz?: THREE.Vector3;
  dlugosc: number;
  szerokosc: number;
  /** The outer vane's share of the width (flight feathers are asymmetric). */
  zewnetrzna?: number;
  /** Where the vanes narrow (an emarginated primary, a "finger"), as a fraction of the length. */
  wciecie?: number;
  /** How far the feather's tip bends down (towards -up), in its lengths. */
  ugiecie?: number;
  barwa?: Barwa | Kolor;
};

/**
 * One feather as a slightly cambered surface: narrow at the base, rounded at
 * the tip, the outer vane narrower than the inner. `u` runs along the shaft,
 * `w` across, from the outer edge (0) to the inner (1).
 */
export function pioro(p: Pioro) {
  const d = p.kierunek.clone().normalize();
  const wew = p.wewnatrz ?? new THREE.Vector3(0, 1, 0).cross(d);
  const s = wew.clone().addScaledVector(d, -wew.dot(d)).normalize();
  const gora = new THREE.Vector3().crossVectors(s, d).normalize();
  const zew = p.zewnetrzna ?? 0.45;
  const szer = (u: number) => {
    let w = p.szerokosc * gladko(0, 0.16, u) * (u < 0.5 ? 1 : Math.sqrt(Math.max(0, 1 - ((u - 0.5) / 0.5) ** 2)));
    if (p.wciecie !== undefined) w *= 1 - 0.45 * gladko(p.wciecie - 0.04, p.wciecie + 0.03, u);
    return Math.max(w, 0.004);
  };
  return plat(
    (u, w) => {
      const x = (w - zew) / (w < zew ? zew : 1 - zew);
      const bok = w < zew ? x * szer(u) * zew * 2 : x * szer(u) * (1 - zew) * 2;
      const wybrzuszenie = 0.035 * p.szerokosc * (1 - x * x);
      const ugiecie = -(p.ugiecie ?? 0.04) * p.dlugosc * u * u;
      return p.podstawa
        .clone()
        .addScaledVector(d, u * p.dlugosc)
        .addScaledVector(s, bok)
        .addScaledVector(gora, wybrzuszenie + ugiecie);
    },
    14,
    6,
    p.barwa ?? 0xffffff,
  );
}

/** Many geometries as one (every one must carry the same attributes). */
export const zlacz = (g: THREE.BufferGeometry[]) => {
  const wynik = mergeGeometries(g.map((x) => (x.index ? x.toNonIndexed() : x)));
  if (!wynik) throw new Error('geometria: nie da się złączyć geometrii o różnych atrybutach');
  return wynik;
};

/** A copy reflected through the mid-plane (x → -x), with its triangles turned back outwards. */
export function lustro(g: THREE.BufferGeometry) {
  const m = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1));
  const poz = m.getAttribute('position');
  const atrybuty = Object.values(m.attributes);
  for (let i = 0; i < poz.count; i += 3) {
    for (const a of atrybuty) {
      for (let c = 0; c < a.itemSize; c++) {
        const x = a.getComponent(i + 1, c);
        a.setComponent(i + 1, c, a.getComponent(i + 2, c));
        a.setComponent(i + 2, c, x);
      }
    }
  }
  m.computeVertexNormals();
  return m;
}

/** The geometry and its mirror image, as one. */
export const para = (g: THREE.BufferGeometry) => zlacz([g, lustro(g)]);

/**
 * Splits a surface into regions by the centre of each triangle (and the
 * surface normal there): one geometry per region the classifier names.
 */
export function podziel(g: THREE.BufferGeometry, klasa: (srodek: THREE.Vector3) => string) {
  const nieindeks = g.index ? g.toNonIndexed() : g;
  const poz = nieindeks.getAttribute('position');
  const grupy = new Map<string, number[]>();
  const s = new THREE.Vector3();
  const a = new THREE.Vector3();
  for (let i = 0; i < poz.count; i += 3) {
    s.set(0, 0, 0);
    for (let j = 0; j < 3; j++) s.add(a.fromBufferAttribute(poz, i + j));
    s.multiplyScalar(1 / 3);
    const id = klasa(s);
    if (!grupy.has(id)) grupy.set(id, []);
    grupy.get(id)!.push(i, i + 1, i + 2);
  }
  const wynik = new Map<string, THREE.BufferGeometry>();
  for (const [id, indeksy] of grupy) {
    const czesc = new THREE.BufferGeometry();
    for (const [nazwa, atr] of Object.entries(nieindeks.attributes)) {
      const dane = new Float32Array(indeksy.length * atr.itemSize);
      indeksy.forEach((src, k) => {
        for (let c = 0; c < atr.itemSize; c++) dane[k * atr.itemSize + c] = atr.getComponent(src, c);
      });
      czesc.setAttribute(nazwa, new THREE.BufferAttribute(dane, atr.itemSize));
    }
    wynik.set(id, czesc);
  }
  return wynik;
}

export type Wyglad = {
  /** A base colour; geometry built here also carries per-vertex colours, which multiply it. */
  kolor?: number;
  szorstkosc?: number;
  /** Glass-like layers (air sacs, a ghost of the body). */
  przezroczystosc?: number;
};

/**
 * The material every model uses: matte, drawn from both sides, the inside
 * of a cut surface darker than its outside so a cut reads as a cut.
 */
export function material({ kolor = 0xffffff, szorstkosc = 0.78, przezroczystosc }: Wyglad = {}) {
  const m = new THREE.MeshStandardMaterial({
    color: kolor,
    roughness: szorstkosc,
    metalness: 0,
    side: THREE.DoubleSide,
    vertexColors: true,
    transparent: przezroczystosc !== undefined,
    opacity: przezroczystosc ?? 1,
    depthWrite: przezroczystosc === undefined,
  });
  m.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace(
      '#include <color_fragment>',
      '#include <color_fragment>\n\tif (!gl_FrontFacing) diffuseColor.rgb *= 0.45;',
    );
  };
  m.userData.przezroczystosc = przezroczystosc ?? 1;
  return m;
}

/** A model under construction: every mesh is filed under its part (if it has one) and its layer. */
export class Budowa {
  korzen = new THREE.Group();
  czesci = new Map<string, THREE.Mesh[]>();
  warstwy = new Map<Warstwa, THREE.Object3D[]>();

  dodaj<T extends THREE.Mesh>(siatka: T, czesc: string | null, warstwa: Warstwa): T {
    siatka.userData.czesc = czesc;
    siatka.userData.warstwa = warstwa;
    this.korzen.add(siatka);
    if (czesc) {
      if (!this.czesci.has(czesc)) this.czesci.set(czesc, []);
      this.czesci.get(czesc)!.push(siatka);
    }
    if (!this.warstwy.has(warstwa)) this.warstwy.set(warstwa, []);
    this.warstwy.get(warstwa)!.push(siatka);
    return siatka;
  }

  /** A mesh of one or more geometries (merged) with a fresh material of its own, so it can light up alone. */
  siatka(g: THREE.BufferGeometry | THREE.BufferGeometry[], czesc: string | null, warstwa: Warstwa, wyglad: Wyglad = {}) {
    const geometria = Array.isArray(g) ? zlacz(g) : g;
    return this.dodaj(new THREE.Mesh(geometria, material(wyglad)), czesc, warstwa);
  }

  /** Many copies of one small geometry (barbs, struts), each placed by a matrix and coloured on its own. */
  kopie(g: THREE.BufferGeometry, macierze: THREE.Matrix4[], czesc: string | null, warstwa: Warstwa, barwa: (i: number) => Kolor, wyglad: Wyglad = {}) {
    if (!g.getAttribute('color')) pokoloruj(g, 0xffffff);
    const m = new THREE.InstancedMesh(g, material(wyglad), macierze.length);
    const c = new THREE.Color();
    macierze.forEach((x, i) => {
      m.setMatrixAt(i, x);
      m.setColorAt(i, c.set(barwa(i)));
    });
    m.computeBoundingSphere();
    return this.dodaj(m, czesc, warstwa);
  }
}

/**
 * A matrix placing a unit cube as a beam from `a` to `b`: `wysokosc` along
 * `gora` (as far as it is square to the beam), `grubosc` across both.
 */
export function odcinek(a: THREE.Vector3, b: THREE.Vector3, grubosc: number, wysokosc = grubosc, gora = new THREE.Vector3(0, 1, 0)) {
  const x = b.clone().sub(a);
  const dl = x.length();
  x.normalize();
  let z = new THREE.Vector3().crossVectors(x, gora);
  if (z.lengthSq() < 1e-8) z = new THREE.Vector3().crossVectors(x, new THREE.Vector3(0, 0, 1));
  z.normalize();
  const y = new THREE.Vector3().crossVectors(z, x);
  const m = new THREE.Matrix4().makeBasis(x.multiplyScalar(dl), y.multiplyScalar(wysokosc), z.multiplyScalar(grubosc));
  return m.setPosition(a.clone().add(b).multiplyScalar(0.5));
}
