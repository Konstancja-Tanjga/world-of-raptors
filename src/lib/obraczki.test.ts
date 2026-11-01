import assert from 'node:assert/strict';
import { test } from 'node:test';
import { czytajPole, losujKombinacje, nogaPoLewej, ocenKombinacje, POLA_NOG, zapisKombinacji, zLustra, type Kombinacja } from './obraczki';

const wzor: Kombinacja = { lewaGolen: ['W'], lewaSkok: ['R', 'G'], prawaGolen: [], prawaSkok: ['m', 'Y'] };

test('a combination is written left leg first, above then below the knee', () => {
  assert.equal(zapisKombinacji(wzor), 'W/RG –/mY');
});

test('typed rings are read case-insensitively, with M as the metal ring', () => {
  assert.deepEqual(czytajPole('r g'), ['R', 'G']);
  assert.deepEqual(czytajPole('M,y'), ['m', 'Y']);
  assert.deepEqual(czytajPole(''), []);
  assert.equal(czytajPole('RX'), null);
});

test('the right answer is right, and a wrong section is named', () => {
  assert.deepEqual(ocenKombinacje(wzor, wzor), { dobrze: true, lustro: false, bledne: [] });
  const zle = { ...wzor, lewaSkok: ['G', 'R'] } as Kombinacja;
  assert.deepEqual(ocenKombinacje(zle, wzor), { dobrze: false, lustro: false, bledne: ['lewaSkok'] });
});

test('the legs swapped is recognised as the left-right mix-up', () => {
  const ocena = ocenKombinacje(zLustra(wzor), wzor);
  assert.equal(ocena.dobrze, false);
  assert.equal(ocena.lustro, true);
});

test('a combination that reads the same both ways is never called a mix-up, and one leg copied to both is just wrong', () => {
  const symetryczna: Kombinacja = { lewaGolen: ['W'], lewaSkok: ['m'], prawaGolen: ['W'], prawaSkok: ['m'] };
  assert.deepEqual(ocenKombinacje(symetryczna, symetryczna), { dobrze: true, lustro: false, bledne: [] });
  const jednaNoga: Kombinacja = { ...wzor, prawaGolen: wzor.lewaGolen, prawaSkok: wzor.lewaSkok };
  assert.deepEqual(ocenKombinacje(jednaNoga, wzor), { dobrze: false, lustro: false, bledne: ['prawaGolen', 'prawaSkok'] });
});

test('separators typed into a section are ignored', () => {
  assert.deepEqual(czytajPole('W/R-G;'), ['W', 'R', 'G']);
});

test('a drawn combination has one metal ring, two rings at most to a section, and differs from its mirror', () => {
  let ziarno = 1;
  const los = () => ((ziarno = (ziarno * 16807) % 2147483647) - 1) / 2147483646;
  for (let n = 0; n < 200; n++) {
    const k = losujKombinacje(los);
    const wszystkie = POLA_NOG.flatMap((p) => k[p]);
    assert.equal(wszystkie.filter((x) => x === 'm').length, 1);
    assert.ok(wszystkie.length >= 4 && wszystkie.length <= 5);
    for (const p of POLA_NOG) {
      assert.ok(k[p].length <= 2);
      assert.ok(k[p].every((x, i) => i === 0 || x !== k[p][i - 1]));
    }
    assert.notEqual(zapisKombinacji(k), zapisKombinacji(zLustra(k)));
  }
});

test('a bird facing you shows its right leg on your left', () => {
  assert.equal(nogaPoLewej('przodem'), 'prawa');
  assert.equal(nogaPoLewej('tylem'), 'lewa');
});
