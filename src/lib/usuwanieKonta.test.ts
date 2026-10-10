import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { usunKonto, type AdminKont } from './usuwanieKonta';

const admin = (sesje: Record<string, string>, blad?: string) => {
  const usuniete: string[] = [];
  const a: AdminKont = {
    uzytkownik: async (token) => (sesje[token] ? { id: sesje[token] } : null),
    usun: async (id) => {
      if (blad) return { blad };
      usuniete.push(id);
      return {};
    },
  };
  return { a, usuniete };
};

test('deletes the account the session belongs to, and only that one', async () => {
  const { a, usuniete } = admin({ 'token-ani': 'ania', 'token-basi': 'basia' });
  const w = await usunKonto('Bearer token-ani', a, true);
  assert.equal(w.status, 200);
  assert.deepEqual(usuniete, ['ania']);
});

test('refuses without a session, or with one that is not valid', async () => {
  const { a, usuniete } = admin({ 'token-ani': 'ania' });
  assert.equal((await usunKonto(null, a, true)).status, 401);
  assert.equal((await usunKonto('token-ani', a, true)).status, 401, 'the header must say Bearer');
  assert.equal((await usunKonto('Bearer cudzy', a, true)).status, 401);
  assert.deepEqual(usuniete, []);
});

test('says so when the server is not set up, or accounts are off', async () => {
  assert.equal((await usunKonto('Bearer x', null, true)).status, 503);
  assert.equal((await usunKonto('Bearer x', admin({ x: 'ania' }).a, false)).status, 404);
});

test("reports Supabase's refusal instead of claiming success", async () => {
  mock.method(console, 'error', () => {});
  const { a } = admin({ t: 'ania' }, 'database unavailable');
  const w = await usunKonto('Bearer t', a, true);
  assert.equal(w.status, 502);
  mock.restoreAll();
});
