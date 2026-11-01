/**
 * "Zgłoś poprawkę": a signed-in person points at a place in the course and
 * sends a note, which reaches the owner's Gmail as a plain-text mail. Nothing
 * here runs Next.js or Supabase, so tests can run it: the route
 * (src/app/zgloszenie/route.ts) passes the services in. Who is writing comes
 * only from their session token, checked by Supabase; everything else in the
 * request is the person's own text and is treated as such: checked (a bad
 * kind, note or page is refused), the extras cut to length, and mailed as
 * plain text, never as HTML.
 */

export const RODZAJE = { popraw: 'Popraw', dodaj: 'Dodaj', usun: 'Usuń', inne: 'Inne' } as const;
export type Rodzaj = keyof typeof RODZAJE;

export const TYPY_FRAGMENTU = {
  akapit: 'akapit',
  naglowek: 'nagłówek',
  lista: 'punkt listy',
  notatka: 'notatka na marginesie',
  zdjecie: 'zdjęcie',
  tabela: 'wiersz tabeli',
  pytanie: 'pytanie quizu',
  zaznaczenie: 'zaznaczony tekst',
} as const;
export type TypFragmentu = keyof typeof TYPY_FRAGMENTU;

export const MAKS_TRESCI = 2000;
export const MAKS_FRAGMENTU = 600;
/** The Gmail filter puts mails with this in the subject under the label of the same name. */
export const ETYKIETA = 'Feedback_WorldofRaptors';

export type Fragment = { typ: TypFragmentu; tekst: string; zdjecie?: string };
export type Sekcja = { id: string; tekst: string };
export type Zgloszenie = {
  rodzaj: Rodzaj;
  tresc: string;
  /** The page's path, e.g. /gatunki/kania-ruda. */
  strona: string;
  /** The page's title without the site name. */
  tytul: string;
  sekcja?: Sekcja;
  fragment?: Fragment;
};

const obiekt = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Own keys only: `in` would also accept "constructor" or "toString". */
const klucz = <T extends object>(slownik: T, v: unknown): v is keyof T => typeof v === 'string' && Object.hasOwn(slownik, v);

/** One line: control characters and runs of whitespace become single spaces. */
const linia = (s: string, maks: number) => przytnij(s.replace(/[\p{Cc}\s]+/gu, ' ').trim(), maks);

/** Keeps line breaks, drops other control characters. */
const akapity = (s: string) =>
  s
    .replace(/\r\n?/g, '\n')
    .replace(/[^\P{Cc}\n\t]/gu, '')
    .trim();

export function przytnij(s: string, maks: number) {
  return s.length <= maks ? s : `${s.slice(0, maks - 1).trimEnd()}…`;
}

const SCIEZKA = /^\/[a-z0-9\-/]{0,199}$/;
const ID_SEKCJI = /^[a-z0-9-]{1,80}$/;

/** A photo's address: a Commons file or one of the course's own photos. */
function adresZdjecia(v: unknown) {
  if (typeof v !== 'string' || v.length > 500) return undefined;
  if (v.startsWith('https://upload.wikimedia.org/')) return v;
  if (/^\/zdjecia\/[\w\-./]+$/.test(v) && !v.includes('..')) return v;
  return undefined;
}

function sekcja(v: unknown): Sekcja | undefined {
  if (!obiekt(v) || typeof v.id !== 'string' || !ID_SEKCJI.test(v.id) || typeof v.tekst !== 'string') return undefined;
  const tekst = linia(v.tekst, 200);
  return tekst ? { id: v.id, tekst } : undefined;
}

function fragment(v: unknown): Fragment | undefined {
  if (!obiekt(v) || !klucz(TYPY_FRAGMENTU, v.typ) || typeof v.tekst !== 'string') return undefined;
  const typ = v.typ;
  const tekst = linia(v.tekst, MAKS_FRAGMENTU);
  const zdjecie = typ === 'zdjecie' ? adresZdjecia(v.zdjecie) : undefined;
  if (!tekst && !zdjecie) return undefined;
  return zdjecie ? { typ, tekst, zdjecie } : { typ, tekst };
}

/**
 * Checks what the browser sent. The kind, the note and the page are required;
 * the section and the fragment are extras, so one that does not check out is
 * dropped rather than failing the whole note.
 */
export function sprawdzZgloszenie(dane: unknown): { zgloszenie: Zgloszenie } | { blad: string } {
  if (!obiekt(dane)) return { blad: 'Zgłoszenie jest puste.' };
  if (!klucz(RODZAJE, dane.rodzaj)) return { blad: 'Wybierz rodzaj zgłoszenia.' };
  const tresc = typeof dane.tresc === 'string' ? akapity(dane.tresc) : '';
  if (!tresc) return { blad: 'Napisz, co trzeba zmienić.' };
  if (tresc.length > MAKS_TRESCI) return { blad: `Zgłoszenie może mieć najwyżej ${MAKS_TRESCI} znaków.` };
  if (typeof dane.strona !== 'string' || !SCIEZKA.test(dane.strona) || dane.strona.includes('//')) {
    return { blad: 'Nie wiadomo, której strony dotyczy zgłoszenie.' };
  }
  const zgloszenie: Zgloszenie = {
    rodzaj: dane.rodzaj,
    tresc,
    strona: dane.strona,
    tytul: typeof dane.tytul === 'string' ? linia(dane.tytul, 200) : '',
  };
  const s = sekcja(dane.sekcja);
  if (s) zgloszenie.sekcja = s;
  const f = fragment(dane.fragment);
  if (f) zgloszenie.fragment = f;
  return { zgloszenie };
}

/** Text fragments also need the dash encoded, which encodeURIComponent leaves alone. */
const kodujTekst = (s: string) => encodeURIComponent(s).replace(/-/g, '%2D');

/**
 * A link that opens the page at the place: the section's anchor, and a text
 * fragment (`:~:text=`) on the fragment's first words, which scrolls to them
 * and highlights them where the browser supports it. A table row's cells and
 * a photo have no running text to find, so they get the section only.
 */
export function linkDoMiejsca(origin: string, z: Zgloszenie) {
  const slowa = z.fragment && !['tabela', 'zdjecie'].includes(z.fragment.typ) ? z.fragment.tekst.replace(/…$/, '').split(/\s+/).filter(Boolean).slice(0, 8) : [];
  const kotwica = z.sekcja?.id ?? '';
  const tekst = slowa.length ? `:~:text=${kodujTekst(slowa.join(' '))}` : '';
  return `${origin}${z.strona}${kotwica || tekst ? `#${kotwica}${tekst}` : ''}`;
}

const DATA = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Warsaw' });

/** The mail: a subject the Gmail filter recognises, and a plain-text body. */
export function mailZgloszenia(z: Zgloszenie, { email, origin, kiedy }: { email?: string; origin: string; kiedy: Date }) {
  const gdzie = z.tytul || z.strona;
  const temat = linia(`[${ETYKIETA}] ${RODZAJE[z.rodzaj]}: ${gdzie}${z.sekcja ? ` — ${z.sekcja.tekst}` : ''}`, 180);
  const wiersze = [`Rodzaj: ${RODZAJE[z.rodzaj]}`, `Strona: ${gdzie}`];
  if (z.sekcja) wiersze.push(`Sekcja: ${z.sekcja.tekst}`);
  if (z.fragment) {
    wiersze.push(`Wskazany fragment (${TYPY_FRAGMENTU[z.fragment.typ]}):`);
    if (z.fragment.tekst) wiersze.push(`  „${z.fragment.tekst}”`);
    if (z.fragment.zdjecie) wiersze.push(`  Plik: ${z.fragment.zdjecie.startsWith('/') ? origin + z.fragment.zdjecie : z.fragment.zdjecie}`);
  } else {
    wiersze.push('Wskazany fragment: brak (zgłoszenie dotyczy całej strony)');
  }
  wiersze.push('', 'Zgłoszenie:', z.tresc, '', `Prosto do miejsca: ${linkDoMiejsca(origin, z)}`);
  wiersze.push(`Od: ${email ?? 'adres nieznany'}`, `Wysłano: ${DATA.format(kiedy)}`);
  return { temat, tekst: wiersze.join('\n') };
}

export type WynikLicznika = 'ok' | 'limit' | { blad: string };

/** What adding to the daily count came to: the trigger raises 54000 at the limit (20261101130000_zgloszenia_blokada.sql). */
export function wynikLicznika(blad: { code?: string; message: string } | null): WynikLicznika {
  if (!blad) return 'ok';
  return blad.code === '54000' ? 'limit' : { blad: blad.message };
}

export type UslugiZgloszen = {
  /**
   * The account the access token belongs to, null when the token is not a
   * valid session, or an error when the accounts server could not tell.
   */
  uzytkownik(token: string): Promise<{ id: string; email?: string } | null | { blad: string }>;
  /** Adds the note to the account's daily count, as the account itself (row level security). */
  policz(token: string, id: string): Promise<WynikLicznika>;
  /** `trwaly`: the mail service refused the request itself (a key or an address), so trying again will not help. */
  wyslij(mail: { temat: string; tekst: string; odpowiedzDo?: string }): Promise<{ blad?: string; trwaly?: boolean }>;
};

export type OdpowiedzZgloszenia = {
  status: 200 | 400 | 401 | 404 | 429 | 502 | 503;
  cialo: { wyslano: true } | { blad: string };
};

/**
 * The route's work, in order: accounts on, the server set up, a valid
 * session, a well-formed note, room in the account's daily count, the mail.
 * A note whose mail fails still counts towards the 10: the account cannot
 * delete its rows, so it cannot reset the count; rows leave only once they
 * are a day old.
 */
export async function wyslijZgloszenie(
  naglowek: string | null,
  dane: unknown,
  uslugi: UslugiZgloszen | null,
  { wlaczone, origin, kiedy = new Date() }: { wlaczone: boolean; origin: string; kiedy?: Date },
): Promise<OdpowiedzZgloszenia> {
  if (!wlaczone) return { status: 404, cialo: { blad: 'Konta są wyłączone.' } };
  if (!uslugi) return { status: 503, cialo: { blad: 'Zgłoszenia nie są jeszcze skonfigurowane na serwerze.' } };
  const token = /^Bearer (\S+)$/.exec(naglowek ?? '')?.[1];
  if (!token) return { status: 401, cialo: { blad: 'Brak sesji. Zaloguj się ponownie.' } };
  const uzytkownik = await uslugi.uzytkownik(token);
  if (!uzytkownik) return { status: 401, cialo: { blad: 'Sesja wygasła. Zaloguj się ponownie.' } };
  if ('blad' in uzytkownik) {
    console.error('[zgloszenie] checking the session failed', uzytkownik.blad);
    return { status: 502, cialo: { blad: 'Serwer kont nie odpowiada. Spróbuj jeszcze raz za chwilę.' } };
  }
  const sprawdzone = sprawdzZgloszenie(dane);
  if ('blad' in sprawdzone) return { status: 400, cialo: { blad: sprawdzone.blad } };
  const licznik = await uslugi.policz(token, uzytkownik.id);
  if (licznik === 'limit') {
    return { status: 429, cialo: { blad: 'Z tego konta wysłano już 10 zgłoszeń w ciągu doby. Kolejne będzie można wysłać, gdy minie doba od najstarszego z nich.' } };
  }
  if (licznik !== 'ok') {
    console.error('[zgloszenie] counting the note failed', licznik.blad);
    return { status: 502, cialo: { blad: 'Serwer kont nie przyjął zgłoszenia. Spróbuj jeszcze raz za chwilę.' } };
  }
  const { temat, tekst } = mailZgloszenia(sprawdzone.zgloszenie, { email: uzytkownik.email, origin, kiedy });
  const { blad, trwaly } = await uslugi.wyslij({ temat, tekst, odpowiedzDo: uzytkownik.email });
  if (blad) {
    console.error('[zgloszenie] sending the mail failed', trwaly ? '(refused: check the Resend key and FEEDBACK_EMAIL_TO)' : '', blad);
    return trwaly
      ? { status: 503, cialo: { blad: 'Zgłoszenia są chwilowo niedostępne. Ponowna próba teraz nie pomoże, spróbuj za kilka godzin.' } }
      : { status: 502, cialo: { blad: 'Nie udało się wysłać maila. Spróbuj jeszcze raz za chwilę.' } };
  }
  return { status: 200, cialo: { wyslano: true } };
}
