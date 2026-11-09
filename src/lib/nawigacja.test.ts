import assert from 'node:assert/strict';
import { test } from 'node:test';
import { biezacy, DOLNY_PASEK, GRUPY_MENU, LINKI, TEREN, wTerenie } from './nawigacja';

const link = (etykieta: string) => {
  const l = [...LINKI, ...DOLNY_PASEK].find((x) => x.etykieta === etykieta);
  assert.ok(l, etykieta);
  return l;
};

test('Teren covers the log, the sighting form, the checklist and my places, and nothing else', () => {
  for (const p of ['/dziennik', '/dziennik/obserwacja', '/checklista', '/moje-miejsca']) assert.ok(wTerenie(p), p);
  for (const p of ['/', '/dziennikx', '/gatunki', '/plan', '/fiszki']) assert.ok(!wTerenie(p), p);
});

test('a link is the page on its own address and the section inside it', () => {
  assert.equal(biezacy(link('Teren'), '/dziennik'), 'page');
  assert.equal(biezacy(link('Teren'), '/checklista'), 'true');
  assert.equal(biezacy(link('Kurs'), '/moduly/metoda/01-sylwetka'), 'true');
  assert.equal(biezacy(link('Atlas'), '/gatunki/kania-ruda'), 'true');
  assert.equal(biezacy(link('Atlas'), '/rozpoznaj'), undefined);
  assert.equal(biezacy(link('Rozpoznaj'), '/rozpoznaj/glos'), 'true');
});

test('every page of the bars is in the menu, and no address is listed twice there', () => {
  const wMenu = GRUPY_MENU.flatMap((g) => g.linki.map((l) => l.href));
  assert.equal(new Set(wMenu).size, wMenu.length);
  for (const l of [...LINKI, ...DOLNY_PASEK, ...TEREN]) assert.ok(wMenu.includes(l.href), l.href);
});
