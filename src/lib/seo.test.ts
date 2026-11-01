import assert from 'node:assert/strict';
import { test } from 'node:test';
import { jsonLd, opis, zwyklyTekst } from './seo';

test('inline Markdown becomes plain text', () => {
  assert.equal(
    zwyklyTekst('**Myszołów** (*Buteo buteo*) i [kania](../kanie.md)&nbsp;ruda,\n`kod` <span>tu</span>'),
    'Myszołów (Buteo buteo) i kania ruda, kod tu',
  );
});

test('a short description is kept whole', () => {
  assert.equal(opis('Krótki *opis*.'), 'Krótki opis.');
});

test('a long description is cut at a word, within 160 characters', () => {
  const dlugi = 'Słowo '.repeat(40);
  const wynik = opis(dlugi);
  assert.ok(wynik.length <= 160);
  assert.ok(wynik.endsWith('Słowo…'));
});

test('structured data cannot close its script tag', () => {
  const tekst = jsonLd({ '@type': 'WebSite', name: '</script><b>' });
  assert.ok(!tekst.includes('<'));
  assert.equal(JSON.parse(tekst).name, '</script><b>');
  assert.equal(JSON.parse(tekst)['@context'], 'https://schema.org');
});
