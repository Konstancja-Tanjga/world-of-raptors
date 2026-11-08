import assert from 'node:assert/strict';
import { test } from 'node:test';
import { KIEDY_I_GDZIE, prowadziDoUkrytej } from './publikacja';

test('links to "Kiedy i gdzie" and its old addresses count as hidden while it is off the site, nothing else does', () => {
  const ukryte = ['/kiedy-i-gdzie', '/kiedy-i-gdzie#kiedy', '/kiedy-i-gdzie?x=1', '/kiedy-jechac', '/punkty-obserwacji'];
  for (const h of ukryte) assert.equal(prowadziDoUkrytej(h), !KIEDY_I_GDZIE, h);
  for (const h of ['/kiedy-i-gdzieś', '/gatunki', '/moduly/gibraltar/04-gdzie-i-kiedy', 'https://example.org/kiedy-i-gdzie']) {
    assert.equal(prowadziDoUkrytej(h), false, h);
  }
});
