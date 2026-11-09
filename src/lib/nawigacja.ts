import { KIEDY_I_GDZIE } from './publikacja';

/**
 * The app's sections and where each leads, shared by the top bar, the menu
 * sheet, the phone's bottom bar and the field tabs. Pure, so the rules of
 * which section is current are tested (nawigacja.test.ts).
 */
export type LinkNawigacji = { href: string; etykieta: string; aktywny: (p: string) => boolean };

const pod = (...sciezki: string[]) => (p: string) => sciezki.some((s) => p === s || p.startsWith(`${s}/`));

// Accounts ship behind a flag (KONTA.md). Read inline, not from konto.ts, which would bring Supabase into every page.
const KONTA = process.env.NEXT_PUBLIC_ACCOUNTS_ENABLED === 'true';

/** "Teren": the field log, the checklist and my places, one section of three tabs. */
export const TEREN: LinkNawigacji[] = [
  { href: '/dziennik', etykieta: 'Obserwacje', aktywny: pod('/dziennik') },
  { href: '/checklista', etykieta: 'Checklista', aktywny: pod('/checklista') },
  { href: '/moje-miejsca', etykieta: 'Miejsca', aktywny: pod('/moje-miejsca') },
];
export const wTerenie = (p: string) => TEREN.some((t) => t.aktywny(p));

const KURS: LinkNawigacji = { href: '/plan', etykieta: 'Kurs', aktywny: (p) => p === '/plan' || p.startsWith('/moduly') };
const ATLAS: LinkNawigacji = { href: '/gatunki', etykieta: 'Atlas', aktywny: pod('/gatunki') };
const ROZPOZNAJ: LinkNawigacji = { href: '/rozpoznaj', etykieta: 'Rozpoznaj', aktywny: pod('/rozpoznaj') };
const W_TERENIE: LinkNawigacji = { href: '/dziennik', etykieta: 'Teren', aktywny: wTerenie };
const FISZKI: LinkNawigacji = { href: '/fiszki', etykieta: 'Fiszki', aktywny: pod('/fiszki') };
const NIEBO: LinkNawigacji = { href: '/moje-niebo', etykieta: 'Moje niebo', aktywny: pod('/moje-niebo') };
const KIEDY: LinkNawigacji = { href: '/kiedy-i-gdzie', etykieta: 'Kiedy i gdzie', aktywny: pod('/kiedy-i-gdzie') };
const KONTO: LinkNawigacji = { href: '/konto', etykieta: 'Konto', aktywny: pod('/konto') };

/** The top bar on a wide screen. */
export const LINKI: LinkNawigacji[] = [
  KURS,
  ATLAS,
  ROZPOZNAJ,
  W_TERENIE,
  ...(KIEDY_I_GDZIE ? [KIEDY] : []),
  FISZKI,
  NIEBO,
  ...(KONTA ? [KONTO] : []),
];

/** The menu sheet on a phone: the same sections, each with the pages inside it. */
export const GRUPY_MENU: { tytul: string; linki: LinkNawigacji[] }[] = [
  {
    tytul: 'Kurs',
    linki: [
      { ...KURS, etykieta: 'Plan kursu' },
      { href: '/test-startowy', etykieta: 'Test startowy', aktywny: pod('/test-startowy') },
    ],
  },
  { tytul: 'Atlas', linki: [{ ...ATLAS, etykieta: 'Gatunki' }, ROZPOZNAJ] },
  { tytul: 'Teren', linki: [...TEREN, ...(KIEDY_I_GDZIE ? [KIEDY] : [])] },
  { tytul: 'Moje', linki: [FISZKI, NIEBO, ...(KONTA ? [KONTO] : [])] },
];

/** The phone's bottom bar: the sections used most, within a thumb's reach. */
export const DOLNY_PASEK: LinkNawigacji[] = [KURS, ATLAS, W_TERENIE, FISZKI, { ...NIEBO, etykieta: 'Niebo' }];

/** `aria-current` for a link: the page itself, or a page inside its section. */
export const biezacy = (l: LinkNawigacji, p: string) => (p === l.href ? 'page' : l.aktywny(p) ? 'true' : undefined);
