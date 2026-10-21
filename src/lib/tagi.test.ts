import assert from 'node:assert/strict';
import { test } from 'node:test';
import { atrybuty, odkoduj, problemyTagow } from './tagi';

const zdjecie = (extra = '', src = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/A.jpg/960px-A.jpg?utm_source=x&amp;utm_campaign=y') =>
  `<zdjecie src="${src}" width="960" height="640" oryginal="2000x1333" alt="Puszczyk" podpis="P" autor="Ktoś" licencja="CC BY 4.0" licencja-url="https://creativecommons.org/licenses/by/4.0" strona="https://commons.wikimedia.org/wiki/File:A.jpg"${extra}>\n</zdjecie>`;

test('attributes are decoded', () => {
  assert.equal(odkoduj('Ko&#x27;s &amp; &quot;tak&quot;'), 'Ko\'s & "tak"');
  assert.deepEqual(atrybuty('<zdjecie autor="A &amp; B" width="960">'), { autor: 'A & B', width: '960' });
});

test('a complete photo and gallery pass', () => {
  assert.deepEqual(problemyTagow(`Tekst\n\n${zdjecie()}\n`, 'l.md'), []);
  assert.deepEqual(problemyTagow(`<galeria>\n\n${zdjecie()}\n\n${zdjecie()}\n\n</galeria>\n`, 'l.md'), []);
  const wlasne = '<zdjecie src="/zdjecia/barbate-kanaly.jpg" width="960" height="1200" alt="Kanały" autor="Konstancja Tanjga" licencja="CC BY 4.0" strona="">\n</zdjecie>';
  assert.deepEqual(problemyTagow(wlasne, 'l.md'), []);
});

test('a thumbnail without its original size, author or Commons page is caught', () => {
  const bez = zdjecie().replace(' oryginal="2000x1333"', '').replace('autor="Ktoś"', 'autor=""').replace(/ strona="[^"]*"/, '');
  const bledy = problemyTagow(bez, 'l.md');
  assert.equal(bledy.length, 3);
  assert.ok(bledy.every((b) => b.startsWith('l.md:1: ')));
  assert.ok(bledy.some((b) => b.includes('oryginal')));
});

test('a photo from elsewhere, or written inline, is caught', () => {
  assert.match(problemyTagow(zdjecie('', 'https://example.com/a.jpg'), 'l.md')[0], /spoza Wikimedia Commons/);
  assert.match(problemyTagow(`Tekst ${zdjecie()}`, 'l.md')[0], /sam w linii/);
});

test('a gallery holds one to six photos and nothing else', () => {
  assert.match(problemyTagow('<galeria>\n\n</galeria>', 'l.md')[0], /0 zdjęć/);
  const siedem = Array.from({ length: 7 }, () => zdjecie()).join('\n\n');
  assert.match(problemyTagow(`<galeria>\n\n${siedem}\n\n</galeria>`, 'l.md')[0], /7 zdjęć/);
  assert.match(problemyTagow(`<galeria>\n\nAkapit\n\n${zdjecie()}\n\n</galeria>`, 'l.md')[0], /tylko zdjęcia/);
  assert.match(problemyTagow(`<galeria>\n\n${zdjecie()}\n`, 'l.md')[0], /bez <\/galeria>/);
  assert.match(problemyTagow('<galeria> </galeria>', 'l.md')[0], /same w linii/);
});

test('a tag split over lines or written in capitals cannot slip past', () => {
  assert.match(problemyTagow('<zdjecie src="https://example.com/x.jpg"\n  width="960">\n</zdjecie>', 'l.md')[0], /rozbity/);
  assert.match(problemyTagow(zdjecie().replace('<zdjecie', '<Zdjecie'), 'l.md')[0], /małymi literami/);
});

test('a ">" inside an attribute is pointed out', () => {
  assert.ok(problemyTagow(zdjecie().replace('alt="Puszczyk"', 'alt="a > b"'), 'l.md').some((b) => b.includes('&gt;')));
});

test('an original size of zero is no original size', () => {
  assert.match(problemyTagow(zdjecie().replace('2000x1333', '0x0'), 'l.md')[0], /oryginal/);
});

test('nested, unopened and closing-tag lines in galleries', () => {
  assert.match(problemyTagow(`<galeria>\n\n<galeria>\n\n${zdjecie()}\n\n</galeria>`, 'l.md')[0], /galeria w galerii/);
  assert.match(problemyTagow('</galeria>', 'l.md')[0], /bez <galeria>/);
});

test('an entity that is no character is left as written', () => {
  assert.equal(odkoduj('&#x110000;'), '&#x110000;');
});

test('a recording tag names a recording in the catalogue, as a block', () => {
  const ids = new Set(['puszczyk/samiec']);
  assert.deepEqual(problemyTagow('<glos data-id="puszczyk/samiec">\n</glos>', 'l.md', ids), []);
  assert.match(problemyTagow('<glos data-id="puszczyk/samica">\n</glos>', 'l.md', ids)[0], /nie ma w content\/nagrania.json/);
  assert.match(problemyTagow('Słuchaj: <glos data-id="puszczyk/samiec"></glos>', 'l.md', ids)[0], /osobnej linii/);
});
