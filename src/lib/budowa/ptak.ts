import * as THREE from 'three';
import { Budowa, elipsoida, lustro, para, pioro, plat, podziel, pokoloruj, profil, rurka, v, wTabeli, zlacz, type Barwa } from './geometria';
import type { Punkt } from './sceny';

/*
 * A bird of prey built from numbers, coming in to land: wings spread, legs
 * thrust forward. Proportions and colours after an adult northern goshawk
 * (body about 55 cm, 1 unit = 10 cm), simplified to what the lessons name.
 * Every layer fits inside the one above it: the skeleton inside the muscles
 * and organs, all of it inside the body and its feathers, so the cut and the
 * transparent plumage show each part where it really lies.
 *
 * Axes: +z towards the head, +y up, +x the bird's right. The right side is
 * built and mirrored.
 */

// ---- Colours (the drawing of this one scene) ----
const LUPEK = new THREE.Color(0x5b5f66); // the goshawk's slate upperparts
const LUPEK_CIEMNY = new THREE.Color(0x34363b); // crown and cheek
const BIEL = new THREE.Color(0xeeebe4);
const PRAZEK = new THREE.Color(0x7d828a); // the fine grey bars below
const ROGOWY = 0x2b2d33; // the beak
const ZOLTY = 0xe2b336; // cere, legs and toes
const SZPON = 0x16171a;
const KOSC = 0xe8dcc3;
const MIESIEN = 0x93302b;
const MIESIEN_JASNY = 0xbf5a48;
const SCIEGNO = 0xf1e6d6;
const WORKI = 0x7cc4ef;

// ---- The skeleton's landmarks (right side) ----
export const KOSCI = {
  bark: [0.36, 0.5, 0.58] as Punkt,
  lokiec: [1.15, 0.58, 0.22] as Punkt,
  nadgarstek: [2.1, 0.64, 0.44] as Punkt,
  dlon: [2.62, 0.66, 0.36] as Punkt,
  koniecPalca: [3.0, 0.67, 0.3] as Punkt,
  biodro: [0.27, 0.28, -0.35] as Punkt,
  kolano: [0.3, -0.02, 0.05] as Punkt,
  staw: [0.3, -0.82, -0.2] as Punkt, // the intertarsal joint, the "backward knee"
  stopa: [0.28, -1.42, 0.32] as Punkt,
};

// ---- The body: a tube along the mid-line, from the tail's base to inside the head ----
// [z, y of the centre, half-width, half-height]
const TULOW = [
  [-1.3, 0.36, 0.17, 0.15],
  [-0.9, 0.27, 0.4, 0.36],
  [-0.4, 0.16, 0.53, 0.5],
  [0.1, 0.1, 0.57, 0.6],
  [0.5, 0.17, 0.52, 0.56],
  [0.85, 0.38, 0.37, 0.36],
  [1.1, 0.55, 0.25, 0.25],
  [1.32, 0.64, 0.21, 0.22],
];
const GLOWA = { srodek: [0, 0.68, 1.4] as Punkt, r: [0.235, 0.235, 0.27] as Punkt };

/** The body's surface height on top at (x, z): where feathers on the back lie. */
function grzbietW(x: number, z: number) {
  const [y, rx, ry] = wTabeli(TULOW, z);
  return y + ry * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));
}

const prazkowany =
  (gesto: number, ile = 0.45): Barwa =>
  (p) =>
    Math.sin(p.z * gesto + Math.abs(p.x) * 4) > 1 - ile ? PRAZEK : BIEL;

function upierzenieTulowia(b: Budowa) {
  const os = new THREE.CatmullRomCurve3(TULOW.map(([z, y]) => new THREE.Vector3(0, y, z)));
  const tulow = rurka(
    os,
    (t) => {
      const z = os.getPointAt(t).z;
      const [, rx, ry] = wTabeli(TULOW, z);
      return [rx, ry];
    },
    { n: 90, k: 40, boczny: new THREE.Vector3(1, 0, 0) },
  );
  // Each triangle named by where it lies around the body: back, side or belly, and how far along.
  const regiony = podziel(tulow, (s) => {
    const [y, rx, ry] = wTabeli(TULOW, s.z);
    const kat = Math.atan2((s.y - y) / ry, Math.abs(s.x) / rx);
    const gora = kat > 0.45;
    const dol = kat < -0.5;
    if (s.z > 0.95) return gora || Math.abs(s.x) > 0.12 ? 'kark' : 'gardlo';
    if (gora) return s.z > 0.35 ? 'plaszcz' : s.z > -0.55 ? 'grzbiet' : 'kuper';
    if (dol) return s.z > 0.3 ? 'piers' : s.z > -0.85 ? 'brzuch' : 'pokrywy-podogonowe';
    return s.z > 0.35 ? 'piers' : s.z > -0.8 ? 'boki' : 'kuper';
  });
  const barwy: Record<string, Barwa> = {
    kark: () => LUPEK,
    plaszcz: () => LUPEK,
    grzbiet: () => LUPEK,
    kuper: () => LUPEK,
    gardlo: (p) => (Math.sin(p.x * 70) > 0.7 ? PRAZEK : BIEL),
    piers: prazkowany(80, 0.35),
    brzuch: prazkowany(72, 0.35),
    boki: prazkowany(60, 0.45),
    'pokrywy-podogonowe': () => BIEL,
  };
  for (const [id, g] of regiony) {
    przebarw(g, barwy[id] ?? (() => LUPEK));
    b.siatka(g, id, 'zewnatrz', { szorstkosc: 0.95 });
  }
}

function przebarw(g: THREE.BufferGeometry, barwa: Barwa) {
  const poz = g.getAttribute('position');
  const kolor = g.getAttribute('color');
  const p = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < poz.count; i++) {
    c.set(barwa(p.fromBufferAttribute(poz, i), 0, 0));
    kolor.setXYZ(i, c.r, c.g, c.b);
  }
}

function glowa(b: Budowa) {
  const g = elipsoida(GLOWA.srodek, GLOWA.r, { w: 48, h: 32 });
  const [cx, cy, cz] = GLOWA.srodek;
  const [rx, ry, rz] = GLOWA.r;
  const regiony = podziel(g, (s) => {
    const x = Math.abs(s.x - cx) / rx;
    const y = (s.y - cy) / ry;
    const z = (s.z - cz) / rz;
    if (y < -0.35) return z > -0.25 ? 'gardlo' : 'kark';
    if (z > 0.62 && y > 0.05) return 'czolo';
    if (z > 0.42 && x > 0.28 && y > -0.3 && y <= 0.12) return 'kantarek';
    if (x > 0.42 && y > 0.32 && y < 0.6 && z > -0.4 && z < 0.62) return 'brew';
    if (y > 0.5 && z > -0.45) return 'ciemie';
    if (z < -0.45) return 'potylica';
    if (x > 0.35) return 'policzek';
    return y > 0.2 ? 'ciemie' : 'policzek';
  });
  const barwy: Record<string, Barwa> = {
    czolo: () => LUPEK_CIEMNY,
    ciemie: () => LUPEK_CIEMNY,
    potylica: () => LUPEK_CIEMNY,
    policzek: () => LUPEK_CIEMNY,
    kantarek: () => 0x8f949b,
    brew: () => BIEL,
    gardlo: (p) => (Math.sin(p.x * 80) > 0.75 ? PRAZEK : BIEL),
    kark: () => LUPEK,
  };
  for (const [id, geo] of regiony) {
    przebarw(geo, barwy[id]);
    b.siatka(geo, id, 'zewnatrz', { szorstkosc: 0.95 });
  }
  // The white brow over the eye stands out a little, like the bony shelf under it.
  b.siatka(para(elipsoida([0.17, 0.815, 1.53], [0.05, 0.022, 0.1], { barwa: BIEL })), 'brew', 'zewnatrz');

  // The eye: an orange iris and a black pupil, looking forward and out.
  const oko: Punkt = [0.165, 0.74, 1.53];
  const kierunek = new THREE.Vector3(0.75, 0.15, 0.65).normalize();
  b.siatka(para(elipsoida(oko, [0.062, 0.062, 0.062], { barwa: 0xd8571f })), 'oko', 'zewnatrz', { szorstkosc: 0.3 });
  const zrenica = v(oko).addScaledVector(kierunek, 0.04);
  b.siatka(para(elipsoida([zrenica.x, zrenica.y, zrenica.z], [0.03, 0.03, 0.03], { barwa: 0x050505 })), 'oko', 'zewnatrz', { szorstkosc: 0.2 });

  // The beak: a hooked upper mandible over a shorter lower one, both rising out of the cere.
  const P = 0.04;
  b.siatka(
    profil(
      [
        [1.62 + P, 0.79], [1.73 + P, 0.8], [1.73 + P, 0.62], [1.62 + P, 0.61],
      ],
      0.15,
      { barwa: ZOLTY, faza: 0.03 },
    ),
    'woskowka',
    'zewnatrz',
  );
  b.siatka(para(elipsoida([0.068, 0.74, 1.71 + P], [0.012, 0.018, 0.024], { barwa: 0x1a1308 })), 'nozdrze', 'zewnatrz');
  b.siatka(
    profil(
      [
        [1.72 + P, 0.78], [1.8 + P, 0.785], [1.88 + P, 0.76], [1.94 + P, 0.7], [1.965 + P, 0.62], [1.95 + P, 0.55],
        [1.93 + P, 0.565], [1.92 + P, 0.605], [1.84 + P, 0.62], [1.72 + P, 0.625],
      ],
      0.13,
      { zwezenie: 0.75, barwa: (p) => (p.z < 1.8 + P ? 0x5a6170 : ROGOWY) },
    ),
    'dziob-gorny',
    'zewnatrz',
    { szorstkosc: 0.4 },
  );
  b.siatka(
    profil(
      [
        [1.66 + P, 0.62], [1.84 + P, 0.605], [1.9 + P, 0.592], [1.885 + P, 0.572], [1.8 + P, 0.556], [1.66 + P, 0.55],
      ],
      0.11,
      { zwezenie: 0.6, barwa: 0x6b7180 },
    ),
    'dziob-dolny',
    'zewnatrz',
    { szorstkosc: 0.45 },
  );
}

/** A direction in the wing's plane: 0° straight out, 90° straight back. */
const wSkrzydle = (stopnie: number) => {
  const a = (stopnie * Math.PI) / 180;
  return new THREE.Vector3(Math.cos(a), 0.02, -Math.sin(a));
};
const lerp = (a: Punkt, b: Punkt, t: number) => v(a).lerp(v(b), t);

const pasyLotek: Barwa = (_, u) => {
  if (u > 0.93) return 0x3a3c41;
  return Math.sin(u * 26) > 0.72 ? 0x4a4c52 : LUPEK;
};

function skrzydlo(b: Budowa) {
  const { bark, lokiec, nadgarstek, koniecPalca } = KOSCI;
  const grupy: Record<string, THREE.BufferGeometry[]> = {};
  const dodaj = (id: string, g: THREE.BufferGeometry) => (grupy[id] ??= []).push(g);

  // Primaries: ten, from the wrist (P1) to the tip of the hand (P10); the outer six emarginated, the "fingers".
  const dlugosciP = [1.7, 1.82, 1.95, 2.08, 2.22, 2.33, 2.36, 2.24, 2.02, 1.66];
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    const podstawa = lerp(nadgarstek, koniecPalca, t).add(new THREE.Vector3(0, -0.02 + i * 0.006, -0.02));
    const kierunek = wSkrzydle(70 - t * 60);
    dodaj(
      'lotki-1',
      pioro({
        podstawa,
        kierunek,
        dlugosc: dlugosciP[i],
        szerokosc: i >= 4 ? 0.26 : 0.3,
        zewnetrzna: i >= 4 ? 0.3 : 0.42,
        wciecie: i >= 4 ? 0.52 - (i - 4) * 0.02 : undefined,
        barwa: pasyLotek,
      }),
    );
    // Primary coverts over the quills.
    dodaj(
      'pokrywy-lotek-1',
      pioro({
        podstawa: podstawa.clone().add(new THREE.Vector3(0, 0.05, 0.05)),
        kierunek,
        dlugosc: 0.72,
        szerokosc: 0.22,
        barwa: LUPEK,
      }),
    );
  }

  // Secondaries along the ulna, S1 at the wrist; tertials nearest the body.
  for (let i = 0; i < 13; i++) {
    const t = i / 12;
    const podstawa = lerp(nadgarstek, lokiec, t).add(new THREE.Vector3(0, -0.025 + i * 0.003, -0.03));
    const kierunek = wSkrzydle(78 + t * 14);
    dodaj(
      'lotki-2',
      pioro({ podstawa, kierunek, dlugosc: 1.52 - t * 0.12, szerokosc: 0.3, zewnetrzna: 0.42, barwa: pasyLotek }),
    );
    dodaj(
      'pokrywy-duze',
      pioro({
        podstawa: podstawa.clone().add(new THREE.Vector3(0, 0.055, 0.1)),
        kierunek,
        dlugosc: 0.62,
        szerokosc: 0.26,
        barwa: LUPEK,
      }),
    );
    dodaj(
      'pokrywy-srednie',
      pioro({
        podstawa: podstawa.clone().add(new THREE.Vector3(0, 0.085, 0.3)),
        kierunek,
        dlugosc: 0.4,
        szerokosc: 0.22,
        barwa: LUPEK,
      }),
    );
  }
  for (let i = 0; i < 3; i++) {
    const podstawa = lerp(lokiec, bark, 0.12 + i * 0.16).add(new THREE.Vector3(0, 0.0 + i * 0.01, -0.02));
    dodaj(
      'lotki-3',
      pioro({ podstawa, kierunek: wSkrzydle(97 + i * 3), dlugosc: 1.3 - i * 0.12, szerokosc: 0.3, barwa: pasyLotek }),
    );
  }

  // The alula: three small feathers on the thumb, along the leading edge at the wrist.
  for (let i = 0; i < 3; i++) {
    dodaj(
      'skrzydelko',
      pioro({
        podstawa: v(nadgarstek).add(new THREE.Vector3(-0.02 + i * 0.02, 0.07 + i * 0.008, 0.1 - i * 0.02)),
        kierunek: wSkrzydle(-4 + i * 7),
        dlugosc: 0.46 - i * 0.07,
        szerokosc: 0.11,
        zewnetrzna: 0.3,
        barwa: 0x4b4e55,
      }),
    );
  }

  // Scapulars: on the back, over the base of the wing.
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const x = 0.24 + t * 0.32;
    const z = 0.52 - t * 0.5;
    dodaj(
      'barkowki',
      pioro({
        podstawa: new THREE.Vector3(x, grzbietW(Math.min(x, 0.45), z) + 0.02 + t * 0.03, z),
        kierunek: wSkrzydle(96 - t * 8),
        dlugosc: 0.75 + t * 0.15,
        szerokosc: 0.26,
        ugiecie: 0.02,
        barwa: LUPEK,
      }),
    );
  }

  // The leading edge of the arm: a fold of skin (patagium) under the lesser coverts.
  const przod = (t: number) => lerp([0.34, 0.55, 0.78], [2.12, 0.71, 0.6], t);
  const kosci = (t: number) => (t < 0.45 ? lerp(bark, lokiec, t / 0.45) : lerp(lokiec, nadgarstek, (t - 0.45) / 0.55));
  dodaj(
    'pokrywy-male',
    plat(
      (u, w) => {
        const a = przod(u);
        const c = kosci(u).add(new THREE.Vector3(0, 0.1, 0.22));
        const p = a.lerp(c, w);
        p.y += 0.04 * Math.sin(Math.PI * w);
        return p;
      },
      24,
      6,
      (_, u, w) => (Math.sin(u * 60 + w * 9) > 0.8 ? 0x4c4f56 : LUPEK),
    ),
  );

  const kolejnosc = ['lotki-1', 'lotki-2', 'lotki-3', 'pokrywy-lotek-1', 'pokrywy-duze', 'pokrywy-srednie', 'pokrywy-male', 'skrzydelko', 'barkowki'];
  for (const id of kolejnosc) b.siatka(para(zlacz(grupy[id])), id, 'zewnatrz', { szorstkosc: 0.9 });
}

function ogon(b: Budowa) {
  const pasy: Barwa = (_, u) => (u > 0.95 ? BIEL : (u * 4.6) % 1 < 0.2 && u > 0.1 ? 0x2f3136 : 0x6a6e75);
  const sterowki: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const kat = 0.035 + i * 0.075;
    const kierunek = new THREE.Vector3(Math.sin(kat), 0.04, -Math.cos(kat));
    sterowki.push(
      pioro({
        podstawa: new THREE.Vector3(0.02 + i * 0.025, 0.42 - i * 0.006, -1.22),
        kierunek,
        wewnatrz: new THREE.Vector3(-1, 0, 0),
        dlugosc: 2.3 - i * 0.04,
        szerokosc: 0.36,
        zewnetrzna: 0.47,
        ugiecie: 0.01,
        barwa: pasy,
      }),
    );
  }
  b.siatka(para(zlacz(sterowki)), 'sterowki', 'zewnatrz', { szorstkosc: 0.9 });

  const nad: THREE.BufferGeometry[] = [];
  const pod: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const kat = 0.08 + i * 0.16;
    nad.push(
      pioro({
        podstawa: new THREE.Vector3(0.03 + i * 0.04, 0.5, -1.02),
        kierunek: new THREE.Vector3(Math.sin(kat), -0.05, -Math.cos(kat)),
        wewnatrz: new THREE.Vector3(-1, 0, 0),
        dlugosc: 0.55,
        szerokosc: 0.22,
        barwa: (_, u) => (u > 0.85 ? 0x9a9da3 : LUPEK),
      }),
    );
    pod.push(
      pioro({
        podstawa: new THREE.Vector3(0.03 + i * 0.05, 0.22, -0.95),
        kierunek: new THREE.Vector3(Math.sin(kat), 0.22, -Math.cos(kat)),
        wewnatrz: new THREE.Vector3(-1, 0, 0),
        dlugosc: 0.7,
        szerokosc: 0.26,
        ugiecie: -0.04,
        barwa: BIEL,
      }),
    );
  }
  b.siatka(para(zlacz(nad)), 'pokrywy-nadogonowe', 'zewnatrz', { szorstkosc: 0.9 });
  b.siatka(para(zlacz(pod)), 'pokrywy-podogonowe', 'zewnatrz', { szorstkosc: 1 });
}

/** The toes of the right foot: direction from the foot, length, and how big the talon is. */
const PALCE: { kierunek: Punkt; dl: number; szpon: number }[] = [
  { kierunek: [0, -0.12, -1], dl: 0.34, szpon: 0.2 }, // I, the hind toe
  { kierunek: [-0.45, -0.12, 0.9], dl: 0.4, szpon: 0.19 }, // II
  { kierunek: [0.02, -0.12, 1], dl: 0.52, szpon: 0.16 }, // III
  { kierunek: [0.55, -0.12, 0.84], dl: 0.42, szpon: 0.13 }, // IV
];

/** A toe's path: out from the foot, curling down a little at the tip. */
function sciezkaPalca(p: (typeof PALCE)[number], dl = p.dl): Punkt[] {
  const s = v(KOSCI.stopa);
  const d = v(p.kierunek).normalize();
  const pt = (t: number, opad: number) => s.clone().addScaledVector(d, dl * t).add(new THREE.Vector3(0, -opad, 0));
  return [pt(0, 0), pt(0.35, 0.03), pt(0.7, 0.04), pt(1, 0.07)].map((x) => [x.x, x.y, x.z] as Punkt);
}

function nogi(b: Budowa) {
  const { staw, stopa } = KOSCI;
  b.siatka(
    para(
      rurka([[0.3, 0.02, 0.05], [0.31, -0.35, -0.04], [0.3, -0.76, -0.17]], (t) => 0.22 - t * 0.1 + 0.03 * Math.sin(Math.PI * t), {
        barwa: (p) => (Math.sin(p.y * 75) > 0.55 ? PRAZEK : BIEL),
      }),
    ),
    'portki',
    'zewnatrz',
    { szorstkosc: 1 },
  );
  b.siatka(para(rurka([staw, stopa], (t) => 0.06 - t * 0.008, { barwa: ZOLTY, k: 14 })), 'skok', 'zewnatrz', { szorstkosc: 0.55 });
  const palce: THREE.BufferGeometry[] = [];
  const szpony: THREE.BufferGeometry[] = [];
  for (const p of PALCE) {
    const sc = sciezkaPalca(p);
    palce.push(rurka(sc, (t) => 0.05 - t * 0.017, { barwa: ZOLTY, n: 16, k: 10 }));
    // The talon: a curved spike off the toe's tip, hooking down.
    const koniec = v(sc[3]);
    const d = v(p.kierunek).normalize();
    const luk = new THREE.QuadraticBezierCurve3(
      koniec,
      koniec.clone().addScaledVector(d, p.szpon * 0.75).add(new THREE.Vector3(0, 0.01, 0)),
      koniec.clone().addScaledVector(d, p.szpon * 0.85).add(new THREE.Vector3(0, -p.szpon * 0.75, 0)),
    );
    szpony.push(rurka(luk, (t) => 0.034 * (1 - t) + 0.002, { barwa: SZPON, n: 14, k: 8 }));
  }
  b.siatka(para(zlacz(palce)), 'palce', 'zewnatrz', { szorstkosc: 0.6 });
  b.siatka(para(zlacz(szpony)), 'szpony', 'zewnatrz', { szorstkosc: 0.3 });
}

// ---- Skeleton ----

function szkielet(b: Budowa) {
  const kosc = (g: THREE.BufferGeometry, id: string) => b.siatka(g, id, 'szkielet', { kolor: KOSC, szorstkosc: 0.6 });
  /** A long bone: a shaft swelling to knobs at both ends. */
  const dluga = (a: Punkt, c: Punkt, r: number, wygiecie: Punkt = [0, 0, 0]) => {
    const srodek = v(a).lerp(v(c), 0.5).add(v(wygiecie));
    return rurka([a, [srodek.x, srodek.y, srodek.z], c], (t) => r * (1 + 0.7 * Math.max(0, 1 - Math.min(t, 1 - t) * 7)), { n: 18, k: 10 });
  };
  const { bark, lokiec, nadgarstek, dlon, koniecPalca, biodro, kolano, staw, stopa } = KOSCI;

  // Skull: braincase, the bony beak (with the nostril's long gap), jaw, and the ring of bony plates in the eye.
  kosc(
    zlacz([
      elipsoida([0, 0.71, 1.36], [0.13, 0.15, 0.17]),
      profil(
        [
          [1.5, 0.79], [1.7, 0.785], [1.86, 0.75], [1.95, 0.68], [1.975, 0.6], [1.955, 0.555], [1.93, 0.6], [1.8, 0.62], [1.5, 0.64],
        ],
        0.11,
        { zwezenie: 0.7 },
      ),
      para(rurka([[0.1, 0.6, 1.26], [0.09, 0.6, 1.5], [0.035, 0.585, 1.75], [0.005, 0.575, 1.92]], 0.013, { n: 14, k: 6 })),
      para(rurka([[0.1, 0.62, 1.28], [0.08, 0.64, 1.52]], 0.01, { n: 6, k: 6 })),
    ]),
    'czaszka',
  );
  const pierscien: THREE.BufferGeometry[] = [];
  const oko = v([0.15, 0.74, 1.5]);
  const n = new THREE.Vector3(0.75, 0.15, 0.65).normalize();
  const u1 = new THREE.Vector3().crossVectors(n, new THREE.Vector3(0, 1, 0)).normalize();
  const u2 = new THREE.Vector3().crossVectors(n, u1).normalize();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const p = oko
      .clone()
      .addScaledVector(u1, Math.cos(a) * 0.058)
      .addScaledVector(u2, Math.sin(a) * 0.058)
      .addScaledVector(n, 0.012);
    const m = new THREE.Matrix4().makeBasis(
      u1.clone().multiplyScalar(-Math.sin(a)).addScaledVector(u2, Math.cos(a)),
      n.clone().multiplyScalar(0.4).addScaledVector(u1, Math.cos(a)).addScaledVector(u2, Math.sin(a)).normalize(),
      n,
    );
    const g = new THREE.BoxGeometry(0.032, 0.03, 0.006).applyMatrix4(m);
    g.translate(p.x, p.y, p.z);
    g.deleteAttribute('uv');
    pierscien.push(pokoloruj(g, 0xffffff));
  }
  kosc(para(zlacz(pierscien)), 'pierscien-twardowkowy');

  // Neck: fourteen vertebrae in an S, from the thorax to the back of the skull.
  const szyja = new THREE.CatmullRomCurve3([v([0, 0.42, 0.52]), v([0, 0.5, 0.78]), v([0, 0.6, 1.0]), v([0, 0.66, 1.15]), v([0, 0.69, 1.24])]);
  const kregi: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 14; i++) {
    const a = szyja.getPointAt(i / 14 + 0.008);
    const c = szyja.getPointAt((i + 1) / 14 - 0.008);
    kregi.push(rurka([[a.x, a.y, a.z], [c.x, c.y, c.z]], (t) => 0.034 + 0.012 * Math.abs(t - 0.5) * 2, { n: 4, k: 10 }));
  }
  kosc(zlacz(kregi), 'kregi-szyjne');

  // Thoracic vertebrae, each with a spine on top.
  const piersiowe: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const z = 0.5 - i * 0.115;
    piersiowe.push(rurka([[0, 0.42, z], [0, 0.42, z - 0.1]], 0.045, { n: 3, k: 10 }));
    piersiowe.push(rurka([[0, 0.44, z - 0.05], [0, 0.55, z - 0.07]], (t) => 0.02 - t * 0.01, { n: 3, k: 6 }));
  }
  kosc(zlacz(piersiowe), 'kregoslup-piersiowy');

  // Ribs: six pairs, each a vertebral and a sternal piece; the uncinate processes brace each to the next.
  const zebra: THREE.BufferGeometry[] = [];
  const haczyki: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const z = 0.47 - i * 0.12;
    const kolanko: Punkt = [0.38, 0.06, z - 0.1];
    zebra.push(rurka([[0.04, 0.42, z], [0.24, 0.39, z - 0.04], [0.38, 0.2, z - 0.08], kolanko], 0.016, { n: 16, k: 6 }));
    zebra.push(rurka([kolanko, [0.32, -0.02, z - 0.06], [0.25, -0.05, z]], 0.014, { n: 10, k: 6 }));
    if (i < 5) haczyki.push(rurka([[0.37, 0.27, z - 0.08], [0.38, 0.24, z - 0.18]], (t) => 0.012 - t * 0.008, { n: 4, k: 5 }));
  }
  kosc(para(zlacz(zebra)), 'zebra');
  kosc(para(zlacz(haczyki)), 'wyrostki-haczykowate');

  // Sternum: a dished plate, and the keel below it, where the flight muscles anchor.
  const szerMostka = (u: number) => 0.27 - u * 0.04;
  kosc(
    plat(
      (u, w) => {
        const z = 0.52 - u * 0.94;
        const x = (w * 2 - 1) * szerMostka(u);
        return new THREE.Vector3(x, -0.02 - 0.09 * (1 - (x / szerMostka(u)) ** 2), z);
      },
      16,
      12,
    ),
    'mostek',
  );
  kosc(
    profil(
      [
        [0.5, -0.12], [0.52, -0.22], [0.45, -0.33], [0.3, -0.34], [0.0, -0.27], [-0.42, -0.14], [-0.42, -0.11],
      ],
      0.022,
      { faza: 0.006 },
    ),
    'grzebien-mostka',
  );

  // Shoulder girdle: coracoids as struts to the sternum, the wishbone, the blade-like scapulae.
  kosc(para(dluga([0.17, -0.02, 0.54], [0.31, 0.46, 0.62], 0.028)), 'kosc-krucza');
  kosc(
    rurka([[-0.3, 0.5, 0.66], [-0.2, 0.22, 0.72], [0, -0.03, 0.74], [0.2, 0.22, 0.72], [0.3, 0.5, 0.66]], 0.017, { n: 30, k: 8 }),
    'widelki',
  );
  kosc(para(rurka([[0.32, 0.5, 0.58], [0.26, 0.53, 0.2], [0.19, 0.5, -0.22]], (t) => [0.04 - t * 0.02, 0.013], { n: 16, k: 8 })), 'lopatka');

  // Wing: humerus, the ulna behind the thinner radius, the fused hand bones and the digits.
  kosc(para(dluga(bark, lokiec, 0.045, [0, 0.04, 0.02])), 'kosc-ramienna');
  kosc(para(dluga([lokiec[0], lokiec[1], lokiec[2] - 0.02], [nadgarstek[0], nadgarstek[1], nadgarstek[2] - 0.03], 0.034, [0, 0, -0.04])), 'kosc-lokciowa');
  kosc(para(dluga([lokiec[0] + 0.04, lokiec[1] + 0.02, lokiec[2] + 0.06], [nadgarstek[0] - 0.02, nadgarstek[1], nadgarstek[2] + 0.02], 0.02)), 'kosc-promieniowa');
  const brodawki: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 13; i++) {
    const p = v(nadgarstek).lerp(v(lokiec), (i + 0.5) / 13);
    brodawki.push(elipsoida([p.x, p.y + 0.018, p.z - 0.05], [0.03, 0.024, 0.03], { w: 10, h: 8 }));
  }
  kosc(para(zlacz(brodawki)), 'brodawki-lotkowe');
  kosc(
    para(zlacz([dluga(nadgarstek, dlon, 0.028), dluga([nadgarstek[0] + 0.05, nadgarstek[1], nadgarstek[2] - 0.05], [dlon[0], dlon[1], dlon[2] - 0.04], 0.012)])),
    'nadgarstkowo-srodreczna',
  );
  kosc(para(zlacz([dluga(dlon, [2.82, 0.665, 0.33], 0.02), dluga([2.84, 0.668, 0.325], koniecPalca, 0.012), dluga([2.6, 0.66, 0.3], [2.72, 0.66, 0.27], 0.01)])), 'palce-skrzydla');
  kosc(para(dluga([2.12, 0.66, 0.5], [2.3, 0.67, 0.53], 0.013)), 'palec-skrzydelka');

  // Pelvis: the synsacrum (fused vertebrae) along the mid-line, the hip bones spread over it.
  const synsakrum: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 9; i++) {
    const z = -0.02 - i * 0.11;
    synsakrum.push(rurka([[0, 0.4, z], [0, 0.4, z - 0.105]], 0.05, { n: 3, k: 10 }));
  }
  kosc(zlacz(synsakrum), 'synsakrum');
  const szerMiednicy = (u: number) => wTabeli([[0, 0.1], [0.35, 0.3], [0.7, 0.26], [1, 0.12]], u)[0];
  kosc(
    zlacz([
      plat(
        (u, w) => {
          const z = -0.02 - u * 0.98;
          const x = 0.04 + w * (szerMiednicy(u) - 0.04);
          return new THREE.Vector3(x, 0.44 - 0.16 * w * w, z);
        },
        18,
        6,
      ),
      lustro(
        plat(
          (u, w) => {
            const z = -0.02 - u * 0.98;
            const x = 0.04 + w * (szerMiednicy(u) - 0.04);
            return new THREE.Vector3(x, 0.44 - 0.16 * w * w, z);
          },
          18,
          6,
        ),
      ),
      para(rurka([[0.26, 0.22, -0.42], [0.24, 0.13, -0.8], [0.2, 0.06, -1.12]], (t) => 0.014 - t * 0.006, { n: 12, k: 6 })),
      para(
        plat(
          (u, w) => new THREE.Vector3(0.27 - 0.05 * u, 0.28 - 0.1 * w - 0.06 * u, -0.45 - u * 0.5),
          8,
          3,
        ),
      ),
    ]),
    'miednica',
  );

  // Tail: free vertebrae and the pygostyle, the fused end that carries the tail feathers.
  const ogonowe: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const z = -1.02 - i * 0.04;
    ogonowe.push(rurka([[0, 0.41, z], [0, 0.415, z - 0.03]], 0.032, { n: 2, k: 10 }));
  }
  kosc(zlacz(ogonowe), 'kregi-ogonowe');
  kosc(profil([[-1.22, 0.38], [-1.3, 0.37], [-1.38, 0.45], [-1.3, 0.56], [-1.22, 0.47]], 0.03, { faza: 0.008 }), 'pygostyl');

  // Leg: femur, the tibiotarsus with the thin fibula along it, the tarsometatarsus, and the toe bones.
  kosc(para(dluga(biodro, kolano, 0.04, [0, 0, -0.03])), 'kosc-udowa');
  kosc(para(dluga(kolano, staw, 0.036, [0, 0, 0.04])), 'piszczelowo-stepowa');
  kosc(para(rurka([[kolano[0] + 0.04, kolano[1] - 0.02, kolano[2] - 0.03], [0.33, -0.4, -0.08]], (t) => 0.013 * (1 - t) + 0.003, { n: 8, k: 6 })), 'strzalka');
  kosc(para(dluga(staw, stopa, 0.03)), 'stepowo-srodstopie');
  const paliczki: THREE.BufferGeometry[] = [];
  const ile = [2, 3, 4, 5];
  PALCE.forEach((p, i) => {
    const krzywa = new THREE.CatmullRomCurve3(sciezkaPalca(p).map(v));
    for (let k = 0; k < ile[i]; k++) {
      const a = krzywa.getPointAt(k / ile[i] + 0.02);
      const c = krzywa.getPointAt((k + 1) / ile[i] - 0.02);
      paliczki.push(dluga([a.x, a.y, a.z], [c.x, c.y, c.z], 0.016));
    }
  });
  kosc(para(zlacz(paliczki)), 'palce-stopy');
}

// ---- Flight muscles and organs ----

function miesnie(b: Budowa) {
  const { bark } = KOSCI;
  b.siatka(
    para(
      zlacz([
        elipsoida([0.17, -0.12, 0.13], [0.17, 0.23, 0.4], { obrot: [0.12, 0, -0.15] }),
        rurka([[0.16, 0.0, 0.42], [0.3, 0.3, 0.55], [bark[0] + 0.12, bark[1] + 0.02, bark[2] - 0.05]], (t) => 0.11 - t * 0.07, { n: 12, k: 10 }),
      ]),
    ),
    'miesien-piersiowy',
    'miesnie',
    { kolor: MIESIEN, szorstkosc: 0.65 },
  );
  b.siatka(para(elipsoida([0.065, -0.15, 0.18], [0.06, 0.15, 0.3])), 'miesien-nadkruczy', 'miesnie', { kolor: MIESIEN_JASNY, szorstkosc: 0.65 });
  // Its tendon runs up through the canal where coracoid, wishbone and scapula meet, and over the top of the humerus: a pulley.
  b.siatka(
    para(rurka([[0.08, -0.02, 0.42], [0.2, 0.3, 0.6], [0.3, 0.5, 0.62], [0.42, 0.58, 0.55]], 0.011, { n: 20, k: 6 })),
    'sciegno-nadkruczego',
    'miesnie',
    { kolor: SCIEGNO, szorstkosc: 0.4 },
  );
}

/** The paths air takes through the trachea, lungs and sacs (right side; the left mirrors it). */
export const DROGI_POWIETRZA = {
  zewnatrz: [[0, 0.6, 2.35], [0, 0.6, 2.0]] as Punkt[],
  tchawica: [[0, 0.6, 1.62], [0, 0.5, 1.3], [0, 0.4, 1.0], [0, 0.3, 0.75], [0, 0.22, 0.53]] as Punkt[],
  doTylnych: [[0.08, 0.26, 0.42], [0.15, 0.32, 0.2], [0.19, 0.26, -0.12], [0.22, 0.14, -0.5], [0.22, 0.1, -0.7]] as Punkt[],
  doPluc: [[0.22, 0.12, -0.6], [0.2, 0.26, -0.15], [0.16, 0.33, 0.05], [0.15, 0.34, 0.25]] as Punkt[],
  doPrzednich: [[0.15, 0.34, 0.3], [0.2, 0.2, 0.3], [0.28, 0.08, 0.26]] as Punkt[],
  naZewnatrz: [[0.26, 0.1, 0.3], [0.12, 0.2, 0.5], [0, 0.22, 0.56]] as Punkt[],
};

export const WORKI_POWIETRZNE: { id: string; srodek: Punkt; r: Punkt; parzyste: boolean; tylny: boolean }[] = [
  { id: 'worki-szyjne', srodek: [0.06, 0.5, 0.8], r: [0.055, 0.06, 0.13], parzyste: true, tylny: false },
  { id: 'worek-obojczykowy', srodek: [0, 0.18, 0.64], r: [0.2, 0.12, 0.11], parzyste: false, tylny: false },
  { id: 'worki-piersiowe-przednie', srodek: [0.3, 0.07, 0.25], r: [0.12, 0.16, 0.19], parzyste: true, tylny: false },
  { id: 'worki-piersiowe-tylne', srodek: [0.31, 0.07, -0.12], r: [0.11, 0.15, 0.17], parzyste: true, tylny: true },
  { id: 'worki-brzuszne', srodek: [0.2, 0.1, -0.62], r: [0.19, 0.2, 0.36], parzyste: true, tylny: true },
];

function narzady(b: Budowa) {
  const organ = (g: THREE.BufferGeometry, id: string, kolor: number, szorstkosc = 0.55) => b.siatka(g, id, 'narzady', { kolor, szorstkosc });
  organ(rurka(DROGI_POWIETRZA.tchawica, (t) => 0.028 + (Math.sin(t * 160) > 0 ? 0.004 : 0), { n: 120, k: 10 }), 'tchawica', 0xe6cfc3, 0.5);
  organ(
    zlacz([
      elipsoida([0, 0.22, 0.52], [0.048, 0.045, 0.05]),
      para(rurka([[0.02, 0.23, 0.5], [0.09, 0.27, 0.4], [0.14, 0.31, 0.3]], 0.018, { n: 10, k: 8 })),
    ]),
    'krtan-dolna',
    0xd9b3a6,
  );
  organ(
    rurka([[0.03, 0.62, 1.6], [0.05, 0.52, 1.25], [0.08, 0.43, 0.98], [0.05, 0.3, 0.6], [0.02, 0.2, 0.3], [0, 0.17, 0.2]], 0.022, { n: 40, k: 8 }),
    'przelyk',
    0xd99a8e,
  );
  organ(elipsoida([0.1, 0.36, 0.8], [0.11, 0.1, 0.13]), 'wole', 0xe0a596);
  organ(elipsoida([0, 0.15, 0.08], [0.06, 0.06, 0.13], { obrot: [0.25, 0, 0] }), 'zoladek-gruczolowy', 0xc87566);
  organ(elipsoida([0, 0.05, -0.2], [0.13, 0.13, 0.15]), 'zoladek-miesniowy', 0x9c4a4f);
  organ(para(elipsoida([0.16, 0.0, 0.17], [0.13, 0.15, 0.24], { obrot: [0.2, 0, 0.2] })), 'watroba', 0x6e2620, 0.45);
  organ(elipsoida([0, 0.01, 0.37], [0.1, 0.13, 0.14], { obrot: [-0.5, 0, 0] }), 'serce', 0xb3262a, 0.45);
  organ(para(elipsoida([0.15, 0.33, 0.2], [0.1, 0.065, 0.26], { obrot: [0.1, 0, -0.4] })), 'pluca', 0xe58f9a, 0.7);
  organ(para(elipsoida([0.09, 0.31, -0.62], [0.055, 0.04, 0.27])), 'nerki', 0x7a2f35, 0.5);
  // Intestines: a coiled loop in the abdomen.
  const jelito: Punkt[] = [];
  for (let i = 0; i <= 90; i++) {
    const t = i / 90;
    const a = t * Math.PI * 7;
    jelito.push([Math.cos(a) * 0.13 * (0.6 + 0.4 * Math.sin(t * 9)), -0.02 + Math.sin(a) * 0.08, -0.38 - t * 0.55]);
  }
  organ(rurka(jelito, 0.03, { n: 220, k: 8 }), 'jelita', 0xd8a08a);
  organ(elipsoida([0, 0.2, -1.04], [0.06, 0.06, 0.07]), 'stek', 0xb57263);

  // Each sac a mesh of its own around its centre, so breathing can swell it in place.
  for (const w of WORKI_POWIETRZNE) {
    for (const strona of w.parzyste ? [1, -1] : [1]) {
      const m = b.siatka(elipsoida([0, 0, 0], w.r), w.id, 'worki', { kolor: WORKI, szorstkosc: 0.2, przezroczystosc: 0.38 });
      m.position.set(w.srodek[0] * strona, w.srodek[1], w.srodek[2]);
      m.userData.tylny = w.tylny;
    }
  }
}

/** The bird, every layer. */
export function zbudujPtaka() {
  const b = new Budowa();
  upierzenieTulowia(b);
  glowa(b);
  skrzydlo(b);
  ogon(b);
  nogi(b);
  szkielet(b);
  miesnie(b);
  narzady(b);
  return b;
}
