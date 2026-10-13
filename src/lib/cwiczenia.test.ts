import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ocenKolejnosc, opcjeGatunku, przesun, srodek, wymieszaj } from './cwiczenia';

test('shuffling never leaves the list as it was, and keeps every item', () => {
  for (let n = 0; n < 50; n++) {
    const lista = ['a', 'b', 'c'];
    const wynik = wymieszaj(lista);
    assert.notDeepEqual(wynik, lista);
    assert.deepEqual([...wynik].sort(), lista);
  }
  assert.deepEqual(wymieszaj(['a']), ['a']);
  assert.deepEqual(wymieszaj([]), []);
});

test('moving swaps with the neighbour and stops at either end', () => {
  assert.deepEqual(przesun(['a', 'b', 'c'], 1, -1), ['b', 'a', 'c']);
  assert.deepEqual(przesun(['a', 'b', 'c'], 1, 1), ['a', 'c', 'b']);
  assert.deepEqual(przesun(['a', 'b', 'c'], 0, -1), ['a', 'b', 'c']);
  assert.deepEqual(przesun(['a', 'b', 'c'], 2, 1), ['a', 'b', 'c']);
});

test('a bird is in place when its size matches the size that belongs there', () => {
  const wielkosc = { wrobel: srodek([21, 25]), pustulka: srodek([65, 80]), myszolow: srodek([110, 130]) };
  assert.deepEqual(ocenKolejnosc(['wrobel', 'pustulka', 'myszolow'], wielkosc), [true, true, true]);
  assert.deepEqual(ocenKolejnosc(['pustulka', 'wrobel', 'myszolow'], wielkosc), [false, false, true]);
});

test('birds of the same size may swap places', () => {
  const wielkosc = { a: 10, b: 20, c: 20 };
  assert.deepEqual(ocenKolejnosc(['a', 'c', 'b'], wielkosc), [true, true, true]);
});

test('the options hold the right species, look-alikes first, in alphabetical order', () => {
  const wszystkie = [
    { id: 'myszolow', pl: 'Myszołów', grupa: 'myszołowy', mylona_z: ['trzmielojad'] },
    { id: 'trzmielojad', pl: 'Trzmielojad', grupa: 'myszołowy', mylona_z: ['myszolow'] },
    { id: 'kurhannik', pl: 'Kurhannik', grupa: 'myszołowy', mylona_z: [] },
    { id: 'pustulka', pl: 'Pustułka', grupa: 'sokoły', mylona_z: [] },
    { id: 'kobuz', pl: 'Kobuz', grupa: 'sokoły', mylona_z: [] },
  ];
  assert.deepEqual(opcjeGatunku('myszolow', wszystkie, 3), ['kurhannik', 'myszolow', 'trzmielojad']);
  assert.equal(opcjeGatunku('pustulka', wszystkie, 4).length, 4);
  assert.ok(opcjeGatunku('pustulka', wszystkie, 4).includes('pustulka'));
  assert.deepEqual(opcjeGatunku('nieznany', wszystkie), []);
});
