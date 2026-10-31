import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { zbudujModel } from './modele';
import { SCENY, type IdModelu } from './sceny';

const MODELE: IdModelu[] = ['ptak', 'pioro', 'promienie', 'haczyki', 'kosc-ptaka', 'kosc-ssaka'];
const zbudowane = new Map(MODELE.map((id) => [id, zbudujModel(id)]));

test('every part a scene names is drawn by its model, in a layer the view can show', () => {
  for (const [nazwa, scena] of Object.entries(SCENY)) {
    for (const w of scena.widoki) {
      const model = zbudowane.get(w.model)!;
      for (const id of w.czesci) {
        const siatki = model.czesci.get(id);
        assert.ok(siatki?.length, `${nazwa}/${w.id}: model ${w.model} nie rysuje części ${id}`);
        const warstwy = new Set(siatki.map((s) => s.userData.warstwa));
        assert.ok(
          [...warstwy].some((x) => w.warstwy.includes(x) || w.przelaczane?.includes(x) || scena.sprawdzian),
          `${nazwa}/${w.id}: część ${id} leży w warstwie ${[...warstwy]}, której widok nie pokazuje`,
        );
      }
    }
  }
});

test('the bird lies inside its own box: no part runs off to infinity', () => {
  const ptak = zbudowane.get('ptak')!;
  const box = new THREE.Box3().setFromObject(ptak.korzen);
  const rozmiar = box.getSize(new THREE.Vector3());
  // About 95 cm across the wings, 55 cm long, 1 unit = 10 cm.
  assert.ok(rozmiar.x > 8.5 && rozmiar.x < 10.5, `rozpiętość ${rozmiar.x}`);
  assert.ok(rozmiar.z > 5 && rozmiar.z < 6.3, `długość ${rozmiar.z}`);
});

test('the skeleton sits inside the body: the keel, hips and spine are covered', () => {
  const ptak = zbudowane.get('ptak')!;
  const zewnatrz = new THREE.Box3();
  for (const id of ['piers', 'brzuch', 'boki', 'grzbiet', 'plaszcz', 'kuper']) {
    for (const s of ptak.czesci.get(id)!) zewnatrz.expandByObject(s);
  }
  for (const id of ['grzebien-mostka', 'mostek', 'synsakrum', 'kregoslup-piersiowy', 'serce', 'pluca', 'zoladek-miesniowy']) {
    const k = new THREE.Box3();
    for (const s of ptak.czesci.get(id)!) k.expandByObject(s);
    assert.ok(zewnatrz.containsBox(k), `${id} wystaje z tułowia`);
  }
});

test('the breathing steps and the feather and bone sliders run', () => {
  const ptak = zbudowane.get('ptak')!;
  for (const k of SCENY.oddech.kroki!) {
    ptak.krok!(k, false);
    let n = 0;
    while (ptak.animuj!(0.1) && n++ < 100);
    assert.ok(n < 100, `krok ${k} się nie kończy`);
  }
  zbudowane.get('haczyki')!.parametr!('rozsun', 1);
  assert.ok(zbudowane.get('kosc-ptaka')!.kamera!('wejdz', 1));
});
