import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nagraniaFiszek, problemyNagrania } from './nagrania';
import type { NagranieLekcji } from './types';

const commons: NagranieLekcji = {
  gatunek: 'puszczyk',
  opis: 'Samiec: głos terytorialny',
  src: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Strix_aluco_-_Tawny_Owl_XC583836.mp3',
  autor: 'Alvaro Ortiz Troncoso',
  licencja: 'CC BY-SA 4.0',
  licencjaUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
  strona: 'https://commons.wikimedia.org/wiki/File:Strix_aluco_-_Tawny_Owl_XC583836.mp3',
  xc: 583836,
  sekundy: 166,
  zatwierdzone: false,
};

const zXenoCanto: NagranieLekcji = {
  gatunek: 'uszatka-blotna',
  opis: 'Samiec: głos godowy',
  src: '/nagrania/asio-flammeus-xc1105612.mp3',
  autor: 'Kevin Guille',
  licencja: 'CC0 1.0',
  licencjaUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  strona: 'https://xeno-canto.org/1105612',
  xc: 1105612,
  sekundy: 56,
  zatwierdzone: false,
};

test('a Commons mirror, a transcoded file and an xeno-canto file pass', () => {
  assert.deepEqual(problemyNagrania('puszczyk/samiec', commons, 'Strix aluco'), []);
  assert.deepEqual(problemyNagrania('uszatka-blotna/samiec', zXenoCanto, 'Asio flammeus'), []);
  const ogg = {
    ...commons,
    src: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/4/49/S%C3%B3weczka-samiec.ogg/S%C3%B3weczka-samiec.ogg.mp3',
    strona: 'https://commons.wikimedia.org/wiki/File:S%C3%B3weczka-samiec.ogg',
  };
  assert.deepEqual(problemyNagrania('puszczyk/samiec', ogg, 'Strix aluco'), []);
});

test('a mirror filed under another species is caught (the Broad-winged Hawk case)', () => {
  assert.match(problemyNagrania('puszczyk/samiec', commons, 'Strix uralensis')[0], /nie zaczyna się od Strix uralensis/);
});

test('a species missing from the atlas or an id of another species is caught', () => {
  assert.ok(problemyNagrania('puszczyk/samiec', commons, undefined).some((b) => b.includes('nie ma w atlasie')));
  assert.ok(problemyNagrania('puchacz/samiec', commons, 'Strix aluco').some((b) => b.includes('postać')));
  assert.ok(problemyNagrania('puszczyk', commons, 'Strix aluco').some((b) => b.includes('postać')));
});

test('an Ogg or WAV straight from Commons, without the MP3 transcode, is refused', () => {
  const ogg = { ...commons, src: 'https://upload.wikimedia.org/wikipedia/commons/4/49/S%C3%B3weczka-samiec.ogg' };
  assert.match(problemyNagrania('puszczyk/samiec', ogg, 'Strix aluco')[0], /spoza/);
  const bezMp3 = { ...commons, src: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/4/49/A.wav' };
  assert.match(problemyNagrania('puszczyk/samiec', bezMp3, 'Strix aluco')[0], /spoza/);
});

test('a CC BY recording needs its licence address; a file in public/nagrania/ must exist', () => {
  assert.match(problemyNagrania('puszczyk/samiec', { ...commons, licencjaUrl: '' }, 'Strix aluco')[0], /licencjaUrl/);
  assert.match(problemyNagrania('uszatka-blotna/samiec', zXenoCanto, 'Asio flammeus', () => false)[0], /nie ma pliku/);
});

test('a sonogram marked in the catalogue must have been drawn', () => {
  const ze: NagranieLekcji = { ...commons, sonogram: { khz: 4, zrodlo: commons.src } };
  const jest = (s: string) => s === '/sonogramy/puszczyk-samiec.png';
  assert.deepEqual(problemyNagrania('puszczyk/samiec', ze, 'Strix aluco', jest), []);
  assert.match(problemyNagrania('puszczyk/samiec', ze, 'Strix aluco', () => false)[0], /sonogramy/);
  // A recording swapped for another keeps a picture of the old one until it is redrawn.
  assert.match(problemyNagrania('puszczyk/samiec', { ...ze, src: zXenoCanto.src }, 'Strix aluco', jest).join(), /innego nagrania/);
  assert.match(problemyNagrania('puszczyk/samiec', { ...ze, sonogram: { khz: 3 as 4, zrodlo: commons.src } }, 'Strix aluco', jest)[0], /2, 4 albo 8/);
});

test('a file from elsewhere, a non-free licence or a missing credit is caught', () => {
  assert.match(problemyNagrania('puszczyk/samiec', { ...commons, src: 'https://xeno-canto.org/583836/download' }, 'Strix aluco')[0], /spoza/);
  assert.match(problemyNagrania('puszczyk/samiec', { ...commons, licencja: 'CC BY-NC-SA 4.0' }, 'Strix aluco')[0], /nie jest wolna/);
  assert.match(problemyNagrania('puszczyk/samiec', { ...commons, autor: ' ' }, 'Strix aluco')[0], /autora/);
  assert.match(problemyNagrania('uszatka-blotna/samiec', { ...zXenoCanto, strona: 'https://example.com' }, 'Asio flammeus')[0], /xeno-canto/);
});

test('a voice card plays the marked recording, and only once it is approved', () => {
  const nagrania = {
    'puszczyk/samiec': { ...commons, fiszka: true as const },
    'puszczyk/samica': { ...commons, zatwierdzone: true },
    'uszatka-blotna/samiec': { ...zXenoCanto, fiszka: true as const, zatwierdzone: true },
  };
  const wybrane = nagraniaFiszek(nagrania);
  assert.equal(wybrane.has('puszczyk'), false);
  assert.equal(wybrane.get('uszatka-blotna')?.id, 'uszatka-blotna/samiec');
  assert.equal(nagraniaFiszek({ 'puszczyk/samiec': { ...commons, fiszka: true, zatwierdzone: true } }).get('puszczyk')?.id, 'puszczyk/samiec');
});
