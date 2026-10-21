import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Zdjecie } from './types';
import { oryginalZAtrybutu, srcSetCommons } from './zdjecia';

const z = (src: string, oryginal?: [number, number]): Zdjecie => ({
  src,
  width: 960,
  height: 640,
  autor: 'Ktoś',
  licencja: 'CC BY 4.0',
  licencjaUrl: '',
  strona: '',
  plik: '',
  oryginal,
});

const KCIUK =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Strix_aluco.jpg/960px-Strix_aluco.jpg?utm_source=commons.wikimedia.org';

test('a thumbnail gets the widths its original is big enough for', () => {
  assert.equal(
    srcSetCommons(z(KCIUK, [2000, 1333])),
    [960, 1280, 1920].map((w) => `https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Strix_aluco.jpg/${w}px-Strix_aluco.jpg ${w}w`).join(', '),
  );
});

test('no srcset without a known original, for a small one or for a full-size file', () => {
  assert.equal(srcSetCommons(z(KCIUK)), undefined);
  assert.equal(srcSetCommons(z(KCIUK, [1000, 700])), undefined);
  assert.equal(srcSetCommons(z('https://upload.wikimedia.org/wikipedia/commons/c/c3/Strix_aluco.jpg', [4000, 3000])), undefined);
  assert.equal(srcSetCommons(z('/zdjecia/barbate.jpg', [1600, 1200])), undefined);
});

test('the original size is read from the tag', () => {
  assert.deepEqual(oryginalZAtrybutu('2091x1375'), [2091, 1375]);
  assert.equal(oryginalZAtrybutu(''), undefined);
  assert.equal(oryginalZAtrybutu('2091×1375'), undefined);
  assert.equal(oryginalZAtrybutu('0x10'), undefined);
});

test('an original exactly as wide as a step gets that step', () => {
  assert.match(srcSetCommons(z(KCIUK, [1280, 853]))!, /1280px-Strix_aluco\.jpg 1280w$/);
  assert.match(srcSetCommons(z(KCIUK, [3840, 2560]))!, /3840w$/);
});
