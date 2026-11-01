import { MAKS_FRAGMENTU, przytnij, type Fragment, type Sekcja, type TypFragmentu } from '@/lib/zgloszenie';

/**
 * What can be pointed at, and what a pointed-at element tells the owner: its
 * kind, its text, its photo, and the `##` section it sits in. Only the
 * course's own content counts. The person's own things (the checklist, their
 * notes and photos, "Moje niebo", the account) cannot be pointed at, and a
 * selection that touches them is not taken.
 */

const KANDYDACI = 'h1, h2, h3, h4, p, li, blockquote, tr, dt, dd, .quiz__pytanie, img';
const PRYWATNE = '.checklist__row, .own-photos, [data-prywatne]';
const PRYWATNE_STRONY = ['/checklista', '/moje-niebo', '/konto'];

export type Miejsce = { sekcja?: Sekcja; fragment?: Fragment };

const tresc = () => document.getElementById('main-content');

/** Whether pointing works on this page at all. */
export const moznaWskazywac = (sciezka: string) => !PRYWATNE_STRONY.some((s) => sciezka === s || sciezka.startsWith(`${s}/`));

/** The element a pointer or focus on `el` stands for, or null when it is not content of the course. */
export function kandydat(el: EventTarget | null): HTMLElement | null {
  const main = tresc();
  if (!(el instanceof Element) || !main?.contains(el) || el.closest(PRYWATNE)) return null;
  // A photo is pointed at as a whole: the picture, its caption and its credit.
  const k = el.closest<HTMLElement>('figure') ?? el.closest<HTMLElement>(KANDYDACI);
  if (!k || !main.contains(k) || k === main) return null;
  return k.innerText.trim() || k.querySelector('img') || k instanceof HTMLImageElement ? k : null;
}

/** Every element that can be pointed at, for moving between them with Tab. */
export function wszyscyKandydaci(): HTMLElement[] {
  const main = tresc();
  if (!main) return [];
  const widziane = new Set<HTMLElement>();
  for (const el of main.querySelectorAll<HTMLElement>(`figure, ${KANDYDACI}`)) {
    const k = kandydat(el);
    if (k && k.getClientRects().length) widziane.add(k);
  }
  return [...widziane];
}

const tekst = (el: HTMLElement) => przytnij(el.innerText.replace(/\s+/g, ' ').trim(), MAKS_FRAGMENTU);

function typ(el: HTMLElement): TypFragmentu {
  if (el.matches('figure, img')) return 'zdjecie';
  if (el.matches('h1, h2, h3, h4')) return 'naglowek';
  if (el.matches('tr')) return 'tabela';
  if (el.matches('li')) return 'lista';
  if (el.matches('.quiz__pytanie')) return 'pytanie';
  if (el.closest('blockquote')) return 'notatka';
  return 'akapit';
}

/** The address of a photo as the server accepts it: Commons as is, the course's own by its path. */
function adresZdjecia(img: HTMLImageElement | null) {
  const src = img?.currentSrc || img?.src;
  if (!src) return undefined;
  const url = new URL(src, location.href);
  return url.origin === location.origin ? url.pathname : url.href;
}

/** The `##` section an element sits in: the last h2 with an id before it. */
function sekcja(el: Element): Sekcja | undefined {
  let ostatni: HTMLElement | undefined;
  for (const h of tresc()?.querySelectorAll<HTMLElement>('h2[id]') ?? []) {
    if (h === el || h.contains(el) || h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) ostatni = h;
    else break;
  }
  return ostatni ? { id: ostatni.id, tekst: ostatni.innerText.trim() } : undefined;
}

export function opisz(el: HTMLElement): Miejsce {
  const t = typ(el);
  let fragment: Fragment;
  if (t === 'zdjecie') {
    const img = el instanceof HTMLImageElement ? el : el.querySelector('img');
    const podpis = el.querySelector('figcaption');
    fragment = { typ: t, tekst: tekst(podpis ?? el) || (img?.alt ?? ''), zdjecie: adresZdjecia(img) };
  } else if (t === 'tabela') {
    const komorki = [...el.querySelectorAll<HTMLElement>('th, td')].map((c) => c.innerText.replace(/\s+/g, ' ').trim());
    fragment = { typ: t, tekst: przytnij(komorki.filter(Boolean).join(' | '), MAKS_FRAGMENTU) };
  } else {
    fragment = { typ: t, tekst: tekst(el) };
  }
  return { sekcja: sekcja(el), fragment };
}

/** Text selected in the course's content, as a fragment, or null when there is none. */
export function zaznaczenie(sciezka: string): Miejsce | null {
  const sel = window.getSelection();
  const t = sel?.toString().replace(/\s+/g, ' ').trim();
  if (!sel || !t || !moznaWskazywac(sciezka)) return null;
  const main = tresc();
  const element = (w: Node | null) => (w instanceof Element ? w : w?.parentElement);
  const el = element(sel.anchorNode);
  const koniec = element(sel.focusNode);
  if (!main || !el || !koniec || !main.contains(el) || !main.contains(koniec)) return null;
  const zakres = sel.getRangeAt(0);
  if ([...main.querySelectorAll(PRYWATNE)].some((p) => zakres.intersectsNode(p))) return null;
  return { sekcja: sekcja(el), fragment: { typ: 'zaznaczenie', tekst: przytnij(t, MAKS_FRAGMENTU) } };
}

/** The page's title without the site's name (the title template in layout.tsx); the home page's own title is long, so it is named instead. */
export const tytulStrony = (sciezka: string) => (sciezka === '/' ? 'Strona główna' : document.title.replace(/, World of Raptors$/, ''));
