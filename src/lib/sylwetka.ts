/**
 * Parametric silhouettes of birds of prey seen from below in flight: the view
 * the B1 lessons teach ("Sylwetka: 8 grup"). A species is a couple of dozen
 * numbers (`Ksztalt`); the outline is computed from them, so the same bird can
 * be drawn at any size, flap its wings, fan its tail or turn into a look-alike
 * (the numbers interpolate and the outline follows).
 *
 * Units: the wingspan is 200 (x from −100 to 100). y grows towards the tail;
 * y = 0 is the leading edge of the wing where it meets the body.
 *
 * Pure geometry, no DOM: the server renders static SVG paths with it and the
 * browser animates the same outlines.
 */

export type P = [number, number];

export type Ksztalt = {
  /** How far the head and neck reach ahead of the wing root. */
  glowa: number;
  /** Head width. Owls: wider than the body. */
  glowaSzer: number;
  /** 0 a round or pointed head, 1 a flat, square front (owls). */
  glowaPlaska: number;
  /** Body width at the wing root. */
  tulow: number;
  /** From the leading edge at the wing root to the base of the tail. */
  tulowDl: number;
  ogonDl: number;
  /** Half-width of the tail at its base. */
  ogonNasada: number;
  /** Half-width of the tail at its tip: closed, then fully fanned. */
  ogonKoniec: [number, number];
  /** The tip's centre against its corners: + rounded or wedge-shaped, − forked; closed, then fanned. */
  ogonSrodek: [number, number];
  /** 0 the tip is an arc, 1 straight lines (a wedge or a V-shaped fork). */
  ogonOstry: number;
  /** Radius of the tail's corners. */
  ogonRogi: number;
  /** How much the tail's sides bow out. */
  ogonBoki: number;
  /** Chord (width) of the wing at the body. */
  ramie: number;
  /** Position of the wrist as a fraction of the half-span. */
  nadgarstek: number;
  /** The wrist ahead of the wing root (negative) or behind it. */
  nadgarstekY: number;
  /** Chord of the wing at the wrist. */
  dlon: number;
  /** The wingtip behind the wing root: how swept back the hand is. */
  koniecY: number;
  /** Width of the wingtip; 0 is a pointed falcon tip. */
  koniecSzer: number;
  /** 0 a straight wingtip edge, 1 a rounded one. */
  koniecOkragly: number;
  /** Number of slotted primaries, the "fingers". */
  palce: number;
  /** Depth of the slots between the fingers. */
  palceDl: number;
  /** The trailing edge of the arm bulging back: the S-curve of buzzards and eagles. */
  wybrzuszenie: number;
  /** The trailing edge pulled in at the body: a "pinched" wing base. */
  zwezenie: number;
};

/** What the bird is doing; every field interpolates, so poses animate. */
export type Poza = {
  /** Wings raised or lowered, in radians. From below the span looks shorter by cos(). */
  wznios: number;
  /** 0 wings fully spread, 1 the hand swept back and folded (a stoop, a flex-glide). */
  zgiecie: number;
  /** 0 tail closed, 1 fully fanned. */
  ogon: number;
};

export const POZA_SZYBOWANIE: Poza = { wznios: 0, zgiecie: 0, ogon: 0.55 };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const dodaj = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const odejmij = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
const razy = (a: P, k: number): P => [a[0] * k, a[1] * k];
const dlugosc = (a: P) => Math.hypot(a[0], a[1]);
const jednostkowy = (a: P): P => {
  const l = dlugosc(a) || 1;
  return [a[0] / l, a[1] / l];
};
const miedzy = (a: P, b: P, t: number): P => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

function bezier3(p0: P, p1: P, p2: P, p3: P, t: number): P {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

function bezier2(p0: P, p1: P, p2: P, t: number): P {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}

/** n + 1 points of f over [0, 1]; without the first one when it repeats the previous segment's last. */
function probki(f: (t: number) => P, n: number, bezPierwszego = true): P[] {
  const wynik: P[] = [];
  for (let i = bezPierwszego ? 1 : 0; i <= n; i++) wynik.push(f(i / n));
  return wynik;
}

function obroc(p: P, srodek: P, kat: number): P {
  const c = Math.cos(kat);
  const s = Math.sin(kat);
  const x = p[0] - srodek[0];
  const y = p[1] - srodek[1];
  return [srodek[0] + x * c - y * s, srodek[1] + x * s + y * c];
}

/**
 * Rounds the corner at `i` with a quadratic curve that starts and ends `r`
 * along the outline from it, so joints (tail corners, the wing root) read as
 * feathers rather than polygon vertices.
 */
function zaokraglij(punkty: P[], i: number, r: number): P[] {
  if (r <= 0.01 || i <= 0 || i >= punkty.length - 1) return punkty;
  const naroznik = punkty[i];
  const idz = (krok: -1 | 1): [P, number] => {
    let przebyta = 0;
    let j = i;
    while (j + krok >= 0 && j + krok < punkty.length) {
      const odcinek = dlugosc(odejmij(punkty[j + krok], punkty[j]));
      if (przebyta + odcinek >= r) {
        const t = (r - przebyta) / odcinek;
        return [miedzy(punkty[j], punkty[j + krok], t), j + krok];
      }
      przebyta += odcinek;
      j += krok;
    }
    return [punkty[j], j];
  };
  const [a, ia] = idz(-1);
  const [b, ib] = idz(1);
  const luk = probki((t) => bezier2(a, naroznik, b, t), 8, false);
  return [...punkty.slice(0, ia), ...luk, ...punkty.slice(ib + 1)];
}

/**
 * The wingtip from its leading corner T to its trailing corner H: the
 * "fingers" (slotted primaries), each a feather with a rounded tip, fanning
 * out from the wrist, with slots that open towards the outside. A fractional
 * count adds the innermost finger gradually (narrower, with a shallower slot),
 * so two species with different counts still morph smoothly.
 */
function palce(k: Ksztalt, W: P, T: P, H: P, luk: (t: number) => P): P[] {
  const N = k.palce;
  if (N < 1 || k.palceDl < 0.5 || k.koniecSzer < 1) return probki(luk, 24);

  const pelne = Math.floor(N);
  const ile = N - pelne > 0.02 ? pelne + 1 : pelne;
  const krok = 1 / N;
  const wynik: P[] = [];
  let poprzedniaPodstawa: P | null = null;

  for (let f = 0; f < ile; f++) {
    const t0 = f * krok;
    const t1 = Math.min(1, (f + 1) * krok);
    const waga = f < pelne ? 1 : N - pelne;
    const czubek = luk((t0 + t1) / 2);
    const kierunek = jednostkowy(odejmij(czubek, W));
    const wBok: P = [kierunek[1], -kierunek[0]];
    const rozstaw = dlugosc(odejmij(luk(t1), luk(t0)));
    const promien = rozstaw * 0.27;
    // Inner slots are a little shallower than the outer ones.
    const glebia = k.palceDl * waga * (1 - (0.3 * f) / Math.max(1, ile - 1));
    const srodekCzubka = odejmij(czubek, razy(kierunek, promien));
    const podstawa = odejmij(czubek, razy(kierunek, glebia + promien));
    const podstawaPrzod = dodaj(podstawa, razy(wBok, rozstaw * 0.5));
    const podstawaTyl = odejmij(podstawa, razy(wBok, rozstaw * 0.5));

    if (f === 0) wynik.push(miedzy(T, dodaj(srodekCzubka, razy(wBok, promien)), 0.5));
    else if (poprzedniaPodstawa) {
      // The bottom of the slot: a small U between the two feathers.
      const dno = odejmij(miedzy(poprzedniaPodstawa, podstawaPrzod, 0.5), razy(kierunek, glebia * 0.12));
      wynik.push(...probki((t) => bezier2(poprzedniaPodstawa!, dno, podstawaPrzod, t), 4));
    }
    // Leading side, the rounded tip, trailing side.
    wynik.push(dodaj(srodekCzubka, razy(wBok, promien)));
    for (let i = 1; i < 10; i++) {
      const a = (i / 10) * Math.PI;
      wynik.push(dodaj(srodekCzubka, dodaj(razy(wBok, Math.cos(a) * promien), razy(kierunek, Math.sin(a) * promien))));
    }
    wynik.push(odejmij(srodekCzubka, razy(wBok, promien)));
    if (f < ile - 1) {
      wynik.push(podstawaTyl);
      poprzedniaPodstawa = podstawaTyl;
    }
  }
  wynik.push(H);
  return wynik;
}

/**
 * The right half of the outline, from the front of the head to the centre of
 * the tail tip, in pose `p`. Wing points are generated with how much they
 * belong to the hand, so folding the hand and raising the wing move the right
 * ones.
 */
function polowa(k: Ksztalt, p: Poza): P[] {
  const S: P = [k.tulow / 2, 0];
  const W: P = [100 * k.nadgarstek, k.nadgarstekY];
  const T: P = [100, k.koniecY];

  // Head: the bill and crown as a superellipse quadrant (round for raptors, squarer for owls) out to
  // the cheek, then a neck that narrows a little before it flares into the shoulder.
  const r = k.glowaSzer / 2;
  const glebokosc = Math.min(r * 1.1, k.glowa * 0.7);
  const policzek: P = [r, -k.glowa + glebokosc];
  const wykladnik = 2 / (2 + 3 * k.glowaPlaska);
  const glowa = probki(
    (t) => {
      const a = (t * Math.PI) / 2;
      return [r * Math.pow(Math.sin(a), wykladnik), policzek[1] - glebokosc * Math.pow(Math.cos(a), wykladnik)];
    },
    14,
    false,
  );
  // A long head and neck (eagles, honey buzzard) shows a waist; a short one (falcons, owls) does not.
  const talia = Math.min(1, Math.max(0, (k.glowa - glebokosc - r) / (r * 3)));
  const szyjaX = r * (1 - 0.18 * talia);
  const szyja = probki(
    (t) =>
      bezier3(
        policzek,
        [lerp(r, szyjaX, 0.9), lerp(policzek[1], 0, 0.35)],
        [Math.min(szyjaX, S[0]) + (S[0] - Math.min(szyjaX, S[0])) * 0.2, -Math.min(5, k.glowa * 0.18)],
        S,
        t,
      ),
    10,
  );

  // Leading edge: arm to the wrist, hand to the tip, one smooth curve.
  const ramieKierunek = jednostkowy(odejmij(W, S));
  const dlonKierunek = jednostkowy(odejmij(T, W));
  const styczna = jednostkowy(dodaj(ramieKierunek, dlonKierunek));
  const dRamie = dlugosc(odejmij(W, S));
  const dDlon = dlugosc(odejmij(T, W));
  const naNasadzie = jednostkowy(dodaj(ramieKierunek, [0, -0.25]));
  const krawedzRamienia = probki(
    (t) => bezier3(S, dodaj(S, razy(naNasadzie, dRamie * 0.3)), odejmij(W, razy(styczna, dRamie * 0.3)), W, t),
    16,
  );
  const krawedzDloni = probki(
    (t) => bezier3(W, dodaj(W, razy(styczna, dDlon * 0.3)), odejmij(T, razy(dlonKierunek, dDlon * 0.25)), T, t),
    16,
  );

  // Wingtip: an arc from the leading corner to the trailing corner, cut by the slots between the fingers.
  const u = dlonKierunek;
  const doTylu: P = [-u[1], u[0]];
  const szer = k.koniecSzer;
  const H = dodaj(dodaj(T, razy(doTylu, szer)), razy(u, -szer * 0.35));
  const okragly = k.koniecOkragly;
  const luk = (t: number) =>
    bezier3(
      T,
      dodaj(dodaj(T, razy(u, szer * 0.45 * okragly)), razy(doTylu, szer * 0.15)),
      dodaj(dodaj(H, razy(u, szer * 0.55 * okragly)), razy(doTylu, -szer * 0.2)),
      H,
      t,
    );
  const koniec = palce(k, W, T, H, luk);

  // Trailing edge: the hand back to the wrist, then the arm to the body, with its bulge and pinch.
  const E: P = [W[0] - k.dlon * 0.15, W[1] + k.dlon];
  const B: P = [k.tulow / 2, k.ramie];
  const tylDloni = probki((t) => bezier3(H, miedzy(H, E, 0.35), dodaj(miedzy(H, E, 0.7), [0, 1]), E, t), 12);
  const tylRamienia = probki(
    (t) =>
      bezier3(
        E,
        dodaj(miedzy(E, B, 0.3), [0, k.wybrzuszenie]),
        dodaj(miedzy(E, B, 0.72), [0, k.wybrzuszenie * 0.7 - k.zwezenie]),
        B,
        t,
      ),
    16,
  );

  // Pose. How much each wing point belongs to the hand decides how far it folds.
  const skrzydlo = [...krawedzRamienia, ...krawedzDloni, ...koniec, ...tylDloni, ...tylRamienia];
  const iRamie = krawedzRamienia.length;
  const iTyl = skrzydlo.length - tylRamienia.length;
  const dlon = (i: number) => {
    if (i < iRamie) return Math.max(0, (i / iRamie - 0.8) / 0.2) * 0.4;
    if (i < iTyl) return 1;
    return Math.max(0, 1 - ((i - iTyl) / tylRamienia.length) / 0.35);
  };
  const katDloni = p.zgiecie * 0.85;
  const katSkrzydla = p.zgiecie * 0.4;
  const skrot = Math.cos(p.wznios);
  const ulozone = skrzydlo.map((pt, i) => {
    const w = dlon(i);
    let q = w > 0 ? obroc(pt, W, katDloni * w) : pt;
    if (w > 0 && p.zgiecie > 0) {
      // A folded hand also tucks under the arm: shorten it along its own axis.
      const wzdluz = odejmij(q, W);
      q = dodaj(W, razy(wzdluz, 1 - 0.22 * p.zgiecie * w));
    }
    // The arm swings back too, but the wing root stays on the body.
    const odBarku = Math.min(1, Math.max(0, (pt[0] - S[0]) / 25));
    q = obroc(q, S, katSkrzydla * odBarku);
    return [S[0] + (q[0] - S[0]) * skrot, q[1]] as P;
  });

  // Body and tail.
  const nasadaOgona: P = [k.ogonNasada, Math.max(k.tulowDl, k.ramie + 2)];
  const bokTulowia = probki(
    (t) =>
      bezier3(
        B,
        dodaj(B, [0.6, (nasadaOgona[1] - B[1]) * 0.4]),
        dodaj(nasadaOgona, [0.4, -(nasadaOgona[1] - B[1]) * 0.4]),
        nasadaOgona,
        t,
      ),
    8,
  );
  const C: P = [lerp(k.ogonKoniec[0], k.ogonKoniec[1], p.ogon), nasadaOgona[1] + k.ogonDl];
  const bokOgona = probki(
    (t) =>
      bezier3(
        nasadaOgona,
        dodaj(miedzy(nasadaOgona, C, 0.33), [k.ogonBoki, 0]),
        dodaj(miedzy(nasadaOgona, C, 0.66), [k.ogonBoki, 0]),
        C,
        t,
      ),
    14,
  );
  const M: P = [0, C[1] + lerp(k.ogonSrodek[0], k.ogonSrodek[1], p.ogon)];
  const kontrolka = miedzy([C[0] * 0.55, M[1]], miedzy(C, M, 0.5), k.ogonOstry);
  const koniecOgona = probki((t) => bezier2(C, kontrolka, M, t), 14);

  let polowa: P[] = [...glowa, ...szyja, ...ulozone, ...bokTulowia, ...bokOgona, ...koniecOgona];
  // Round the joints, from the tail forward so earlier indices stay valid.
  const indeks = (p: P) => polowa.indexOf(p);
  polowa = zaokraglij(polowa, indeks(bokOgona[bokOgona.length - 1]), k.ogonRogi);
  polowa = zaokraglij(polowa, indeks(ulozone[ulozone.length - 1]), 2.5);
  polowa = zaokraglij(polowa, indeks(ulozone[iTyl - 1]), Math.min(6, k.dlon * 0.2));
  polowa = zaokraglij(polowa, indeks(szyja[szyja.length - 1]), 2);
  return polowa;
}

/** The closed outline: the right half, then the left half mirrored. */
export function obrys(k: Ksztalt, poza: Poza = POZA_SZYBOWANIE): P[] {
  const prawa = polowa(k, poza);
  const lewa = prawa
    .slice(1, -1)
    .reverse()
    .map(([x, y]) => [-x, y] as P);
  return [...prawa, ...lewa];
}

/** Ramer–Douglas–Peucker: drops points that change the outline by less than `tolerancja`. */
export function uprosc(punkty: P[], tolerancja: number): P[] {
  if (punkty.length < 3) return punkty;
  const zostaw = new Uint8Array(punkty.length);
  zostaw[0] = zostaw[punkty.length - 1] = 1;
  const stos: [number, number][] = [[0, punkty.length - 1]];
  while (stos.length) {
    const [a, b] = stos.pop()!;
    const [ax, ay] = punkty[a];
    const [bx, by] = punkty[b];
    const dx = bx - ax;
    const dy = by - ay;
    const d = Math.hypot(dx, dy) || 1;
    let max = 0;
    let gdzie = -1;
    for (let i = a + 1; i < b; i++) {
      const odl = Math.abs(dy * punkty[i][0] - dx * punkty[i][1] + bx * ay - by * ax) / d;
      if (odl > max) {
        max = odl;
        gdzie = i;
      }
    }
    if (max > tolerancja && gdzie > 0) {
      zostaw[gdzie] = 1;
      stos.push([a, gdzie], [gdzie, b]);
    }
  }
  return punkty.filter((_, i) => zostaw[i]);
}

/** An SVG path for an outline; `tolerancja` > 0 simplifies it first (static drawings). */
export function sciezka(punkty: P[], tolerancja = 0): string {
  const pkt = tolerancja > 0 ? uprosc(punkty, tolerancja) : punkty;
  const f = (n: number) => (Math.round(n * 10) / 10).toString();
  return `M${pkt.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`;
}

/** The box around an outline: [x, y, width, height]. */
export function ramka(punkty: P[]): [number, number, number, number] {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of punkty) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1 - x0, y1 - y0];
}

/** A shape between two others: every number interpolates, so the outline morphs. */
export function posredni(a: Ksztalt, b: Ksztalt, t: number): Ksztalt {
  const wynik = {} as Record<string, number | [number, number]>;
  for (const klucz of Object.keys(a) as (keyof Ksztalt)[]) {
    const x = a[klucz];
    const y = b[klucz];
    wynik[klucz] = Array.isArray(x) && Array.isArray(y) ? [lerp(x[0], y[0], t), lerp(x[1], y[1], t)] : lerp(x as number, y as number, t);
  }
  return wynik as Ksztalt;
}

export function posredniaPoza(a: Poza, b: Poza, t: number): Poza {
  return { wznios: lerp(a.wznios, b.wznios, t), zgiecie: lerp(a.zgiecie, b.zgiecie, t), ogon: lerp(a.ogon, b.ogon, t) };
}
