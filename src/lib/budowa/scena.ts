import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { zbudujModel, type Model } from './modele';
import { WARSTWY, type IdModelu, type Punkt, type Warstwa, type Widok } from './sceny';

/*
 * The 3D viewer behind Model3D.tsx: one WebGL canvas, the models of a scene
 * built on demand, layers, a cut, picking parts by pointer, and a camera that
 * flies to what is chosen. It draws only when something changes (a drag, a
 * slider, a step of the breathing cycle), never in an idle loop. Loaded by
 * the component with a dynamic import, so three.js reaches only the lessons
 * that show a model.
 */

export type Zdarzenia = {
  /** A part was clicked (null: empty space). */
  naWybor: (id: string | null) => void;
  /** The pointer is over a part (null: over nothing), at this point of the canvas. */
  naNajechanie: (id: string | null, x: number, y: number) => void;
  /** The camera turned: its angle round the model, in degrees 0–359. */
  naObrot: (stopnie: number) => void;
  /** Where the chosen part's label goes, in canvas pixels (null: off screen). */
  naEtykiete: (polozenie: { x: number; y: number } | null) => void;
  /** WebGL went away (the browser reclaimed it). */
  naBlad: () => void;
};

export type Przegladarka = ReturnType<typeof utworzPrzegladarke>;

/** A view as the viewer takes it: its parts by id, or already described (only the id is used). */
export type WidokDoPokazania = Omit<Widok, 'czesci'> & { czesci: (string | { id: string })[] };

const NIEPRZEZROCZYSTE = 0.5;

/** The camera's vertical angle (degrees) on the 16:9 canvas the scenes' cameras were placed for. */
const KAT_PIONOWY = 32;
const PROPORCJE_SCEN = 16 / 9;

/**
 * The vertical angle for a canvas of these proportions. On a narrower canvas
 * (a phone's) the angle opens so the horizontal one stays as at 16:9: the
 * spread wings still fit across, with more room above and below, instead of
 * the bird being cropped at the sides.
 */
export function katPionowy(proporcje: number) {
  if (proporcje >= PROPORCJE_SCEN) return KAT_PIONOWY;
  const polowa = THREE.MathUtils.degToRad(KAT_PIONOWY / 2);
  return THREE.MathUtils.radToDeg(2 * Math.atan((Math.tan(polowa) * PROPORCJE_SCEN) / proporcje));
}

export function utworzPrzegladarke(kontener: HTMLElement, zdarzenia: Zdarzenia, { ruch, akcent }: { ruch: boolean; akcent: string }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.localClippingEnabled = true;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  kontener.appendChild(canvas);

  const scena = new THREE.Scene();
  scena.add(new THREE.HemisphereLight(0xf4f1ea, 0x3a4250, 1.7));
  const glowne = new THREE.DirectionalLight(0xffffff, 2.3);
  glowne.position.set(5, 9, 6);
  scena.add(glowne);
  const wypelniajace = new THREE.DirectionalLight(0xbcd2ff, 0.8);
  wypelniajace.position.set(-6, 2, -5);
  scena.add(wypelniajace);

  const kamera = new THREE.PerspectiveCamera(KAT_PIONOWY, 1, 0.01, 200);
  const sterowanie = new OrbitControls(kamera, canvas);
  sterowanie.enableDamping = ruch;
  sterowanie.dampingFactor = 0.12;
  sterowanie.minDistance = 0.05;
  sterowanie.maxDistance = 40;
  sterowanie.zoomToCursor = true;

  const plaszczyzna = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 1e6);
  const kolorAkcentu = new THREE.Color(akcent || '#e8913a');

  const modele = new Map<IdModelu, Model>();
  let model: Model | null = null;
  let widok: WidokDoPokazania | null = null;
  let dozwolone = new Set<string>();
  let przezroczystosc = 1;
  const widoczne = new Map<Warstwa, boolean>();
  let wybrana: string | null = null;
  let najechana: string | null = null;

  // ---- Drawing on demand ----
  let klatka = 0;
  let ostatnio = 0;
  let lot: { od: [THREE.Vector3, THREE.Vector3]; do: [THREE.Vector3, THREE.Vector3]; t: number } | null = null;
  const zaplanuj = () => {
    if (!klatka) klatka = requestAnimationFrame(rysuj);
  };
  function rysuj(teraz: number) {
    klatka = 0;
    const dt = ostatnio ? Math.min(0.05, (teraz - ostatnio) / 1000) : 1 / 60;
    ostatnio = teraz;
    let dalej = false;
    if (lot) {
      lot.t = Math.min(1, lot.t + dt / 0.7);
      const e = lot.t < 0.5 ? 4 * lot.t ** 3 : 1 - (-2 * lot.t + 2) ** 3 / 2;
      kamera.position.lerpVectors(lot.od[0], lot.do[0], e);
      sterowanie.target.lerpVectors(lot.od[1], lot.do[1], e);
      if (lot.t >= 1) lot = null;
      dalej = true;
    }
    if (sterowanie.update(dt)) dalej = true;
    if (model?.animuj?.(dt)) dalej = true;
    renderer.render(scena, kamera);
    etykieta();
    if (dalej) zaplanuj();
    else ostatnio = 0;
  }
  sterowanie.addEventListener('change', () => {
    zaplanuj();
    zdarzenia.naObrot(Math.round(((THREE.MathUtils.radToDeg(sterowanie.getAzimuthalAngle()) % 360) + 360) % 360));
  });

  const rozmiar = () => {
    const { width, height } = kontener.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    kamera.aspect = width / height;
    kamera.fov = katPionowy(kamera.aspect);
    kamera.updateProjectionMatrix();
    zaplanuj();
  };
  const obserwator = new ResizeObserver(rozmiar);
  obserwator.observe(kontener);

  const utracony = (e: Event) => {
    e.preventDefault();
    zdarzenia.naBlad();
  };
  canvas.addEventListener('webglcontextlost', utracony);

  // ---- Parts and layers ----
  const siatki = function* () {
    if (!model) return;
    for (const lista of model.warstwy.values()) for (const o of lista) if (o instanceof THREE.Mesh) yield o;
  };
  const material = (m: THREE.Mesh) => m.material as THREE.MeshStandardMaterial;

  function odswiezWyglad() {
    for (const m of siatki()) {
      const mat = material(m);
      const warstwa = m.userData.warstwa as Warstwa;
      const czesc = m.userData.czesc as string | null;
      m.visible = (widoczne.get(warstwa) ?? false) && !(widok?.tylkoTeCzesci && warstwa !== 'zewnatrz' && !(czesc && dozwolone.has(czesc)));
      const baza = (mat.userData.przezroczystosc as number) ?? 1;
      const o = warstwa === 'zewnatrz' ? przezroczystosc : 1;
      // A chosen glass-like part (an air sac) turns nearly solid, or its light would be too faint to see.
      mat.opacity = czesc !== null && czesc === wybrana && baza < 1 ? Math.max(baza * o, 0.85) : baza * o;
      mat.transparent = mat.opacity < 0.999;
      mat.depthWrite = mat.opacity > 0.6;
      const swieci = czesc === null ? 0 : czesc === wybrana ? 0.55 : czesc === najechana && dozwolone.has(czesc) ? 0.22 : 0;
      // Lit up: tinted towards the accent (white plumage too, which glow alone would not change) and glowing.
      mat.userData.kolor ??= mat.color.clone();
      // While a part is chosen, everything else steps back, so even a yellow toe lit orange stands out.
      mat.color.copy(mat.userData.kolor as THREE.Color).lerp(kolorAkcentu, swieci > 0.5 ? 0.65 : swieci > 0 ? 0.3 : 0);
      if (wybrana && czesc !== wybrana) mat.color.multiplyScalar(0.42);
      mat.emissive.copy(kolorAkcentu).multiplyScalar(swieci * 0.6);
      if (!mat.clippingPlanes) mat.clippingPlanes = [plaszczyzna];
    }
    zaplanuj();
  }

  function pokazModel(id: IdModelu) {
    let m = modele.get(id);
    if (!m) {
      m = zbudujModel(id);
      modele.set(id, m);
    }
    if (model) scena.remove(model.korzen);
    model = m;
    scena.add(m.korzen);
  }

  function ustawKamere(pozycja: Punkt, cel: Punkt, plynnie: boolean) {
    const p = new THREE.Vector3(...pozycja);
    const c = new THREE.Vector3(...cel);
    if (plynnie && ruch) {
      lot = { od: [kamera.position.clone(), sterowanie.target.clone()], do: [p, c], t: 0 };
    } else {
      lot = null;
      kamera.position.copy(p);
      sterowanie.target.copy(c);
    }
    sterowanie.update();
    zaplanuj();
  }

  // ---- Picking ----
  const promien = new THREE.Raycaster();
  const wskaznik = new THREE.Vector2();
  function trafiona(x: number, y: number): string | null {
    if (!model) return null;
    const r = canvas.getBoundingClientRect();
    wskaznik.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    promien.setFromCamera(wskaznik, kamera);
    for (const t of promien.intersectObject(model.korzen, true)) {
      const m = t.object as THREE.Mesh;
      const czesc = m.userData.czesc as string | null;
      if (!m.visible || !m.userData.warstwa) continue;
      // What the cut has removed, and plumage faded to a ghost, let the pointer through.
      if (plaszczyzna.distanceToPoint(t.point) < 0) continue;
      if (m.userData.warstwa === 'zewnatrz' && przezroczystosc < NIEPRZEZROCZYSTE) continue;
      if (czesc && dozwolone.has(czesc)) return czesc;
      // Anything else solid hides what is behind it.
      if (material(m).opacity > 0.6) return null;
    }
    return null;
  }

  let wcisniecie: { x: number; y: number } | null = null;
  const dol = (e: PointerEvent) => (wcisniecie = { x: e.clientX, y: e.clientY });
  const gora = (e: PointerEvent) => {
    if (!wcisniecie || Math.hypot(e.clientX - wcisniecie.x, e.clientY - wcisniecie.y) > 5) return;
    wcisniecie = null;
    zdarzenia.naWybor(trafiona(e.clientX, e.clientY));
  };
  let ruchKlatka = 0;
  const ruchWskaznika = (e: PointerEvent) => {
    if (e.buttons || e.pointerType === 'touch' || ruchKlatka) return;
    ruchKlatka = requestAnimationFrame(() => {
      ruchKlatka = 0;
      const id = trafiona(e.clientX, e.clientY);
      const r = canvas.getBoundingClientRect();
      canvas.style.cursor = id ? 'pointer' : '';
      if (id !== najechana) {
        najechana = id;
        odswiezWyglad();
      }
      zdarzenia.naNajechanie(id, e.clientX - r.left, e.clientY - r.top);
    });
  };
  const wyjscie = () => {
    if (najechana) {
      najechana = null;
      odswiezWyglad();
    }
    zdarzenia.naNajechanie(null, 0, 0);
  };
  canvas.addEventListener('pointerdown', dol);
  canvas.addEventListener('pointerup', gora);
  canvas.addEventListener('pointermove', ruchWskaznika);
  canvas.addEventListener('pointerleave', wyjscie);

  /** The box of a part's visible meshes, in world space; with `prawa`, of its points on the bird's right only. */
  function ramkaCzesci(id: string, prawa = false) {
    const box = new THREE.Box3();
    const p = new THREE.Vector3();
    for (const m of model?.czesci.get(id) ?? []) {
      if (!m.visible) continue;
      if (!prawa || m instanceof THREE.InstancedMesh) {
        box.expandByObject(m);
        continue;
      }
      m.updateWorldMatrix(true, false);
      const poz = m.geometry.getAttribute('position');
      for (let i = 0; i < poz.count; i++) {
        p.fromBufferAttribute(poz, i).applyMatrix4(m.matrixWorld);
        if (p.x >= 0) box.expandByPoint(p);
      }
    }
    return box;
  }

  const srodek = new THREE.Vector3();
  function etykieta() {
    if (!wybrana || !model) return zdarzenia.naEtykiete(null);
    const box = ramkaCzesci(wybrana);
    if (box.isEmpty()) return zdarzenia.naEtykiete(null);
    box.getCenter(srodek);
    const p = srodek.project(kamera);
    if (p.z > 1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1) return zdarzenia.naEtykiete(null);
    const r = canvas.getBoundingClientRect();
    zdarzenia.naEtykiete({ x: ((p.x + 1) / 2) * r.width, y: ((1 - p.y) / 2) * r.height });
  }

  return {
    /** Shows a view: its model, layers, opacity, cut and camera. */
    pokazWidok(w: WidokDoPokazania) {
      widok = w;
      pokazModel(w.model);
      dozwolone = new Set(w.czesci.map((c) => (typeof c === 'string' ? c : c.id)));
      for (const warstwa of WARSTWY) widoczne.set(warstwa, w.warstwy.includes(warstwa));
      przezroczystosc = w.przezroczystosc ?? 1;
      wybrana = null;
      najechana = null;
      this.ustawPrzekroj(w.przekroj?.domyslnie ?? Number.POSITIVE_INFINITY);
      for (const s of w.suwaki ?? []) this.ustawParametr(s.id, s.domyslnie / 100);
      ustawKamere(w.kamera.pozycja, w.kamera.cel, false);
      odswiezWyglad();
    },
    ustawWarstwe(warstwa: Warstwa, tak: boolean) {
      widoczne.set(warstwa, tak);
      odswiezWyglad();
    },
    ustawPrzezroczystosc(o: number) {
      przezroczystosc = o;
      odswiezWyglad();
    },
    /** The cut: everything beyond `polozenie` along the view's axis is hidden. */
    ustawPrzekroj(polozenie: number) {
      const os = widok?.przekroj?.os ?? 'x';
      plaszczyzna.normal.set(os === 'x' ? -1 : 0, 0, os === 'z' ? -1 : 0);
      plaszczyzna.constant = Number.isFinite(polozenie) ? polozenie : 1e6;
      zaplanuj();
    },
    ustawParametr(id: string, wartosc: number) {
      model?.parametr?.(id, wartosc);
      const k = model?.kamera?.(id, wartosc);
      if (k) ustawKamere(k.pozycja, k.cel, false);
      zaplanuj();
    },
    /** Lights a part up; with `pokaz`, also shows its layer and flies the camera to it. */
    wybierz(id: string | null, { pokaz = false } = {}) {
      wybrana = id;
      let przekroj: number | null = null;
      if (id && pokaz && model) {
        const warstwy = new Set((model.czesci.get(id) ?? []).map((m) => m.userData.warstwa as Warstwa));
        for (const w of warstwy) widoczne.set(w, true);
        const kierunek = kamera.position.clone().sub(sterowanie.target).normalize();
        if (!warstwy.has('zewnatrz')) {
          // A part under the plumage: the plumage fades, and whatever lies over the part steps aside.
          if (przezroczystosc > 0.3) przezroczystosc = 0.15;
          const glebiej = (w: Warstwa) => WARSTWY.indexOf(w) > Math.min(...[...warstwy].map((x) => WARSTWY.indexOf(x)));
          const nad = (w: Warstwa) => w !== 'zewnatrz' && !warstwy.has(w) && !glebiej(w);
          for (const w of WARSTWY) if (nad(w) || (warstwy.has('szkielet') && w !== 'zewnatrz' && w !== 'szkielet')) widoczne.set(w, false);
        }
        odswiezWyglad();
        const ptak = model === modele.get('ptak');
        let box = ramkaCzesci(id);
        // A pair (both wings, both legs): frame the right one, the side the cut opens.
        if (ptak && box.min.x < -0.5 && box.max.x > 0.5) {
          box = ramkaCzesci(id, true);
          kierunek.set(0.3, 1, 0.35).normalize();
        }
        if (!box.isEmpty()) {
          const c = box.getCenter(new THREE.Vector3());
          // An organ or an air sac: cut through its middle and look in from the open side.
          if ((warstwy.has('narzady') || warstwy.has('worki')) && widok?.przekroj?.os === 'x') {
            przekroj = c.x + 0.005;
            this.ustawPrzekroj(przekroj);
            kierunek.set(1, 0.3, 0.25).normalize();
          }
          const r = Math.max(box.getSize(new THREE.Vector3()).length(), 0.25);
          const p = c.clone().addScaledVector(kierunek, Math.min(ptak ? Math.max(r * 3.2, 3.2) : Math.max(r * 1.4, 1.6), 14));
          ustawKamere([p.x, p.y, p.z], [c.x, c.y, c.z], true);
        }
      }
      odswiezWyglad();
      return { przezroczystosc, warstwy: Object.fromEntries(widoczne) as Record<Warstwa, boolean>, przekroj };
    },
    /** Turns the camera round the model to an angle (degrees), keeping its height and distance. */
    obroc(stopnie: number) {
      const delta = THREE.MathUtils.degToRad(stopnie) - sterowanie.getAzimuthalAngle();
      sterowanie.rotateLeft(-delta);
      zaplanuj();
    },
    przybliz(czynnik: number) {
      const odleglosc = kamera.position.distanceTo(sterowanie.target);
      const kierunek = kamera.position.clone().sub(sterowanie.target).normalize();
      const nowa = THREE.MathUtils.clamp(odleglosc / czynnik, sterowanie.minDistance, sterowanie.maxDistance);
      const p = sterowanie.target.clone().addScaledVector(kierunek, nowa);
      ustawKamere([p.x, p.y, p.z], [sterowanie.target.x, sterowanie.target.y, sterowanie.target.z], true);
    },
    resetujKamere() {
      if (widok) ustawKamere(widok.kamera.pozycja, widok.kamera.cel, true);
    },
    krok(id: string, natychmiast: boolean) {
      model?.krok?.(id, natychmiast || !ruch);
      zaplanuj();
    },
    zniszcz() {
      cancelAnimationFrame(klatka);
      cancelAnimationFrame(ruchKlatka);
      obserwator.disconnect();
      sterowanie.dispose();
      canvas.removeEventListener('webglcontextlost', utracony);
      canvas.removeEventListener('pointerdown', dol);
      canvas.removeEventListener('pointerup', gora);
      canvas.removeEventListener('pointermove', ruchWskaznika);
      canvas.removeEventListener('pointerleave', wyjscie);
      for (const m of modele.values()) {
        m.korzen.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            (o.material as THREE.Material).dispose();
          }
        });
      }
      renderer.dispose();
      canvas.remove();
    },
  };
}
