import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ciekawostkiDla } from './ciekawostki';
import type { CiekawostkaDoPokazania } from './types';

const c = (id: string, modul: string, lekcja: string | null, gatunki: string[] = []): CiekawostkaDoPokazania => ({
  id,
  tekst: id,
  href: `/moduly/${modul}`,
  zrodlo: modul,
  modul,
  lekcja,
  gatunki,
});

const WSZYSTKIE = [
  c('wstep', 'sowy', null),
  c('uszy', 'sowy', '01-narzedzia', ['puszczyk']),
  c('lot', 'sowy', '02-lot'),
  c('kania', 'metoda', '01-sylwetka', ['kania-ruda']),
  c('puszczyk-gdzie-indziej', 'metoda', '02-lot', ['puszczyk']),
];
const idy = (xs: CiekawostkaDoPokazania[]) => xs.map((x) => x.id);

test('with no place every curiosity is equally welcome', () => {
  const { preferowane, pozostale } = ciekawostkiDla(WSZYSTKIE);
  assert.deepEqual(preferowane, []);
  assert.deepEqual(idy(pozostale), idy(WSZYSTKIE));
});

test("a species page prefers the species' curiosities, from any module", () => {
  const { preferowane, pozostale } = ciekawostkiDla(WSZYSTKIE, { gatunek: 'puszczyk' });
  assert.deepEqual(idy(preferowane), ['uszy', 'puszczyk-gdzie-indziej']);
  assert.equal(pozostale.length, 3);
});

test("a lesson prefers its module and skips its own callouts", () => {
  const { preferowane, pozostale } = ciekawostkiDla(WSZYSTKIE, { modul: 'sowy', lekcja: '01-narzedzia' });
  assert.deepEqual(idy(preferowane), ['wstep', 'lot']);
  assert.deepEqual(idy(pozostale), ['kania', 'puszczyk-gdzie-indziej']);
});

test("a module overview skips the module's intro", () => {
  const { preferowane } = ciekawostkiDla(WSZYSTKIE, { modul: 'sowy' });
  assert.deepEqual(idy(preferowane), ['uszy', 'lot']);
});
