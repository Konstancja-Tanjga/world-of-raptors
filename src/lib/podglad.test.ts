import assert from 'node:assert/strict';
import { test } from 'node:test';
import { danePodgladu, kierunekKlawisza, krok, odczytajPodglad, rozmiaryZdjecia } from './podglad';

const zdjecie = {
  src: 'https://thumb.wikimedia.org/a/960px-a.jpg',
  width: 960,
  height: 640,
  alt: 'Puszczyk na gałęzi',
  podpis: 'Puszczyk',
  autor: 'Ktoś',
  licencja: 'CC BY 4.0',
};

test('a photo written by Photo reaches the viewer whole', () => {
  assert.deepEqual(odczytajPodglad(JSON.stringify(zdjecie)), {
    ...zdjecie,
    srcSet: undefined,
    licencjaUrl: undefined,
    strona: undefined,
  });
});

test('anything else does not open the viewer', () => {
  assert.equal(odczytajPodglad(undefined), null);
  assert.equal(odczytajPodglad('{nie json'), null);
  assert.equal(odczytajPodglad('null'), null);
  assert.equal(odczytajPodglad('"tekst"'), null);
  assert.equal(odczytajPodglad(JSON.stringify({ ...zdjecie, src: '' })), null);
  assert.equal(odczytajPodglad(JSON.stringify({ ...zdjecie, width: 0 })), null);
  // A CC BY photo is never shown without its author.
  assert.equal(odczytajPodglad(JSON.stringify({ ...zdjecie, autor: ' ' })), null);
});

test('stepping wraps round at the first and the last photo', () => {
  assert.equal(krok(0, 3, -1), 2);
  assert.equal(krok(0, 3, 1), 1);
  assert.equal(krok(2, 3, 1), 0);
  assert.equal(krok(0, 1, 1), 0);
  assert.equal(krok(0, 0, 1), 0);
});

test('only the arrow keys step', () => {
  assert.equal(kierunekKlawisza('ArrowLeft'), -1);
  assert.equal(kierunekKlawisza('ArrowRight'), 1);
  assert.equal(kierunekKlawisza('Enter'), 0);
});

test('a gallery photo asks for its share of the gallery', () => {
  assert.match(rozmiaryZdjecia('margines'), /20rem/);
  assert.match(rozmiaryZdjecia({ galeria: 1 }), /^\(min-width: 76rem\) 57rem/);
  assert.match(rozmiaryZdjecia({ galeria: 2 }), /^\(min-width: 76rem\) 29rem/);
  assert.match(rozmiaryZdjecia({ galeria: 3 }), /^\(min-width: 76rem\) 38rem/);
  assert.match(rozmiaryZdjecia({ galeria: 6 }), /^\(min-width: 76rem\) 19rem/);
});

test('what Photo writes, the viewer reads back', () => {
  const commons = { src: zdjecie.src, width: 960, height: 640, autor: 'Ktoś', licencja: 'CC BY 4.0', licencjaUrl: 'https://creativecommons.org/licenses/by/4.0', strona: 'https://commons.wikimedia.org/wiki/File:A.jpg' };
  const wlasne = { src: '/zdjecia/barbate.jpg', width: 960, height: 1200, autor: 'Konstancja Tanjga-Nawrot', licencja: 'CC BY 4.0', licencjaUrl: '', strona: '' };
  for (const [z, alt, srcSet] of [[commons, 'Puszczyk', 'a 960w, b 1280w'], [wlasne, 'Kanały', undefined], [commons, '', undefined]] as const) {
    const dane = danePodgladu(z, alt, 'Podpis', srcSet);
    assert.deepEqual(odczytajPodglad(JSON.stringify(dane)), dane);
  }
  assert.equal(odczytajPodglad(JSON.stringify(danePodgladu({ ...commons, licencja: '' }, 'P', undefined, undefined))), null);
  assert.equal(odczytajPodglad(JSON.stringify(danePodgladu({ ...commons, height: 0 }, 'P', undefined, undefined))), null);
});
