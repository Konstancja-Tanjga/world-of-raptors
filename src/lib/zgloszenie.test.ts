import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { linkDoMiejsca, mailZgloszenia, sprawdzZgloszenie, wynikLicznika, wyslijZgloszenie, type UslugiZgloszen, type Zgloszenie } from './zgloszenie';

const ORIGIN = 'https://world-of-raptors.vercel.app';
const KIEDY = new Date('2026-11-01T10:00:00Z');

const poprawne = {
  rodzaj: 'popraw',
  tresc: 'Wcięcie ogona jest płytsze u młodych.',
  strona: '/gatunki/kania-ruda',
  tytul: 'Kania ruda',
  sekcja: { id: 'sylwetka-w-locie', tekst: 'Sylwetka w locie' },
  fragment: { typ: 'akapit', tekst: 'Ogon głęboko wcięty, rdzawy, w locie stale skręcany jak ster, bardzo charakterystyczny.' },
};

const sprawdzone = (dane: unknown) => {
  const w = sprawdzZgloszenie(dane);
  assert.ok('zgloszenie' in w, 'blad' in w ? w.blad : '');
  return w.zgloszenie;
};

test('accepts a note with its place', () => {
  assert.deepEqual(sprawdzone(poprawne), poprawne);
});

test('refuses a note without a kind, a text or a page of the course', () => {
  assert.ok('blad' in sprawdzZgloszenie(null));
  assert.ok('blad' in sprawdzZgloszenie({ ...poprawne, rodzaj: 'wirus' }));
  assert.ok('blad' in sprawdzZgloszenie({ ...poprawne, tresc: '   ' }));
  assert.ok('blad' in sprawdzZgloszenie({ ...poprawne, tresc: 'x'.repeat(2001) }));
  assert.ok('blad' in sprawdzZgloszenie({ ...poprawne, strona: 'https://zla-strona.example' }));
  assert.ok('blad' in sprawdzZgloszenie({ ...poprawne, strona: '//zla-strona.example/x' }));
  assert.ok('blad' in sprawdzZgloszenie({ ...poprawne, strona: '/gatunki/<script>' }));
});

test('refuses kinds and fragment types inherited from Object', () => {
  for (const r of ['toString', 'constructor', '__proto__', 'hasOwnProperty']) {
    assert.ok('blad' in sprawdzZgloszenie({ ...poprawne, rodzaj: r }), r);
  }
  assert.equal(sprawdzone({ ...poprawne, fragment: { typ: 'toString', tekst: 'x' } }).fragment, undefined);
});

test('accepts every page of the course as the page of a note', () => {
  const tresc = path.join(import.meta.dirname, '..', '..', 'content');
  const czytaj = (plik: string) => JSON.parse(readFileSync(path.join(tresc, plik), 'utf8'));
  const { moduly } = czytaj('moduly.json') as { moduly: { slug?: string; lekcje?: { slug: string }[] }[] };
  const strony = ['/', '/gatunki', '/checklista', '/fiszki', '/plan', '/moje-niebo', '/o-projekcie', '/konto'];
  for (const m of moduly) {
    if (!m.slug) continue;
    strony.push(`/moduly/${m.slug}`, ...(m.lekcje ?? []).map((l) => `/moduly/${m.slug}/${l.slug}`));
  }
  for (const { id } of [...czytaj('gatunki.json').gatunki, ...czytaj('ptaki-mokradel.json').ptaki] as { id: string }[]) {
    strony.push(`/gatunki/${id}`);
  }
  for (const strona of strony) assert.ok('zgloszenie' in sprawdzZgloszenie({ ...poprawne, strona }), strona);
});

test('drops a section or fragment that does not check out, and keeps the note', () => {
  const z = sprawdzone({ ...poprawne, sekcja: { id: 'Zła kotwica"', tekst: 'x' }, fragment: { typ: 'iframe', tekst: 'x' } });
  assert.equal(z.sekcja, undefined);
  assert.equal(z.fragment, undefined);
});

test('keeps line breaks in the note, flattens everything else to one line, and cuts long fragments', () => {
  const z = sprawdzone({
    ...poprawne,
    tresc: 'Pierwsza linia\r\nDruga\u0007 linia',
    tytul: 'Kania\nruda\u0000',
    fragment: { typ: 'akapit', tekst: 'a '.repeat(500) },
  });
  assert.equal(z.tresc, 'Pierwsza linia\nDruga linia');
  assert.equal(z.tytul, 'Kania ruda');
  assert.equal(z.fragment?.tekst.length, 600);
  assert.ok(z.fragment?.tekst.endsWith('…'));
});

test("keeps a photo's address only for Commons and the course's own photos", () => {
  const zdjecie = (adres: string) =>
    sprawdzone({ ...poprawne, fragment: { typ: 'zdjecie', tekst: 'Kania ruda w locie', zdjecie: adres } }).fragment?.zdjecie;
  assert.equal(zdjecie('https://upload.wikimedia.org/wikipedia/commons/a/ab/Milvus.jpg'), 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Milvus.jpg');
  assert.equal(zdjecie('/zdjecia/marismas/czapla.jpg'), '/zdjecia/marismas/czapla.jpg');
  assert.equal(zdjecie('https://zla-strona.example/x.jpg'), undefined);
  assert.equal(zdjecie('/zdjecia/../../etc/passwd'), undefined);
});

test('links to the section and the first words of the fragment', () => {
  const z = sprawdzone(poprawne);
  assert.equal(
    linkDoMiejsca(ORIGIN, z),
    `${ORIGIN}/gatunki/kania-ruda#sylwetka-w-locie:~:text=Ogon%20g%C5%82%C4%99boko%20wci%C4%99ty%2C%20rdzawy%2C%20w%20locie%20stale%20skr%C4%99cany`,
  );
  const bezMiejsca: Zgloszenie = { ...z, sekcja: undefined, fragment: undefined };
  assert.equal(linkDoMiejsca(ORIGIN, bezMiejsca), `${ORIGIN}/gatunki/kania-ruda`);
  const wiersz: Zgloszenie = { ...z, fragment: { typ: 'tabela', tekst: 'Ogon | wcięty' } };
  assert.equal(linkDoMiejsca(ORIGIN, wiersz), `${ORIGIN}/gatunki/kania-ruda#sylwetka-w-locie`);
  const zMyslnikiem: Zgloszenie = { ...z, sekcja: undefined, fragment: { typ: 'akapit', tekst: 'Biało-czarny' } };
  assert.equal(linkDoMiejsca(ORIGIN, zMyslnikiem), `${ORIGIN}/gatunki/kania-ruda#:~:text=Bia%C5%82o%2Dczarny`);
});

test("the subject carries the Gmail label's tag, the body is plain text", () => {
  const { temat, tekst } = mailZgloszenia(sprawdzone(poprawne), { email: 'ania@example.com', origin: ORIGIN, kiedy: KIEDY });
  assert.equal(temat, '[Feedback_WorldofRaptors] Popraw: Kania ruda — Sylwetka w locie');
  assert.match(tekst, /^Rodzaj: Popraw\nStrona: Kania ruda\nSekcja: Sylwetka w locie\nWskazany fragment \(akapit\):\n {2}„Ogon/);
  assert.match(tekst, /Zgłoszenie:\nWcięcie ogona/);
  assert.match(tekst, /Od: ania@example\.com/);
  assert.match(tekst, /Wysłano: 1 listopada 2026/);
});

test('tells the daily limit from other database errors', () => {
  assert.equal(wynikLicznika(null), 'ok');
  assert.equal(wynikLicznika({ code: '54000', message: 'feedback limit reached' }), 'limit');
  assert.deepEqual(wynikLicznika({ code: '42501', message: 'row-level security' }), { blad: 'row-level security' });
});

const uslugi = (opcje: { limit?: boolean; bladLicznika?: string; bladMaila?: string; trwaly?: boolean; bladSesji?: string } = {}) => {
  const wyslane: Parameters<UslugiZgloszen['wyslij']>[0][] = [];
  const policzone: string[] = [];
  const u: UslugiZgloszen = {
    uzytkownik: async (token) => {
      if (opcje.bladSesji) return { blad: opcje.bladSesji };
      return token === 'token-ani' ? { id: 'ania', email: 'ania@example.com' } : null;
    },
    policz: async (_token, id) => {
      if (opcje.bladLicznika) return { blad: opcje.bladLicznika };
      if (opcje.limit) return 'limit';
      policzone.push(id);
      return 'ok';
    },
    wyslij: async (mail) => {
      if (opcje.bladMaila) return { blad: opcje.bladMaila, trwaly: opcje.trwaly };
      wyslane.push(mail);
      return {};
    },
  };
  return { u, wyslane, policzone };
};

const ustawienia = { wlaczone: true, origin: ORIGIN, kiedy: KIEDY };

test("sends the mail, replying to the sender's own address", async () => {
  const { u, wyslane, policzone } = uslugi();
  const w = await wyslijZgloszenie('Bearer token-ani', poprawne, u, ustawienia);
  assert.equal(w.status, 200);
  assert.deepEqual(policzone, ['ania']);
  assert.equal(wyslane.length, 1);
  assert.equal(wyslane[0].odpowiedzDo, 'ania@example.com');
});

test('refuses without a session, or with one that is not valid, before counting anything', async () => {
  const { u, wyslane, policzone } = uslugi();
  assert.equal((await wyslijZgloszenie(null, poprawne, u, ustawienia)).status, 401);
  assert.equal((await wyslijZgloszenie('token-ani', poprawne, u, ustawienia)).status, 401);
  assert.equal((await wyslijZgloszenie('Bearer cudzy', poprawne, u, ustawienia)).status, 401);
  assert.equal((await wyslijZgloszenie('Bearer token-ani', { rodzaj: 'popraw' }, u, ustawienia)).status, 400);
  assert.deepEqual(policzone, []);
  assert.deepEqual(wyslane, []);
});

test('stops at the daily limit without sending', async () => {
  const { u, wyslane } = uslugi({ limit: true });
  assert.equal((await wyslijZgloszenie('Bearer token-ani', poprawne, u, ustawienia)).status, 429);
  assert.deepEqual(wyslane, []);
});

test('says so when the server is not set up, or accounts are off', async () => {
  assert.equal((await wyslijZgloszenie('Bearer token-ani', poprawne, null, ustawienia)).status, 503);
  assert.equal((await wyslijZgloszenie('Bearer token-ani', poprawne, uslugi().u, { ...ustawienia, wlaczone: false })).status, 404);
});

test('reports a failed count or mail instead of claiming success', async () => {
  mock.method(console, 'error', () => {});
  const sesja = await wyslijZgloszenie('Bearer token-ani', poprawne, uslugi({ bladSesji: '503: unavailable' }).u, ustawienia);
  assert.equal(sesja.status, 502, 'a server that cannot check the session is not an expired session');
  const trwaly = await wyslijZgloszenie('Bearer token-ani', poprawne, uslugi({ bladMaila: 'Resend 403', trwaly: true }).u, ustawienia);
  assert.equal(trwaly.status, 503, 'a refusal retrying cannot fix');
  assert.equal((await wyslijZgloszenie('Bearer token-ani', poprawne, uslugi({ bladLicznika: 'db down' }).u, ustawienia)).status, 502);
  assert.equal((await wyslijZgloszenie('Bearer token-ani', poprawne, uslugi({ bladMaila: 'resend down' }).u, ustawienia)).status, 502);
});
