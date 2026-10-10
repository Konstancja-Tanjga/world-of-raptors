'use client';

import { dataLokalna } from './daty';
import { supabase } from './konto';
import { zapomnijKonto } from './synchronizacjaPrzegladarki';

/*
 * "Pobierz moje dane" and "Usuń konto" (RODO): what the account holds on the
 * server, as a file, and deleting the account with all of it.
 */

const TABELE = { lekcje: 'lesson_progress', obserwacje: 'observations', fiszki: 'flashcards', odznaki: 'user_badges' } as const;
const STRONA = 1000;

/** Everything the account holds on the server, as a JSON file to save. */
export async function plikDanychKonta(): Promise<{ plik: Blob; nazwa: string }> {
  const sb = supabase();
  if (!sb) throw new Error('Konta są wyłączone.');
  const { data: sesja, error: bladSesji } = await sb.auth.getUser();
  if (bladSesji || !sesja.user) throw new Error('Brak sesji. Zaloguj się ponownie.');
  const dane: Record<string, unknown[]> = {};
  for (const [nazwa, tabela] of Object.entries(TABELE)) {
    const wiersze: unknown[] = [];
    for (let strona = 0; ; strona++) {
      const { data, error } = await sb.from(tabela).select('*').order('synced_at').range(strona * STRONA, (strona + 1) * STRONA - 1);
      if (error) throw new Error(error.message);
      // The account id is in `konto` once; each row repeating it adds nothing.
      wiersze.push(
        ...data.map((w: Record<string, unknown>) => {
          const kopia = { ...w };
          delete kopia.user_id;
          return kopia;
        }),
      );
      if (data.length < STRONA) break;
    }
    dane[nazwa] = wiersze;
  }
  const { id, email, created_at } = sesja.user;
  const plik = new Blob(
    [JSON.stringify({ konto: { id, email, utworzone: created_at }, pobrano: new Date().toISOString(), ...dane }, null, 2)],
    { type: 'application/json' },
  );
  return { plik, nazwa: `world-of-raptors-konto-${dataLokalna()}.json` };
}

/**
 * Deletes the signed-in account on the server, then forgets it in this
 * browser and signs out. The course data in this browser stays.
 */
export async function usunKontoNaSerwerze(): Promise<{ blad?: string }> {
  const sb = supabase();
  if (!sb) return { blad: 'Konta są wyłączone.' };
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { blad: 'Brak sesji. Zaloguj się ponownie.' };
  let odpowiedz: Response;
  try {
    odpowiedz = await fetch('/konto/usun', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  } catch {
    return { blad: 'Nie udało się połączyć z serwerem. Sprawdź internet i spróbuj jeszcze raz.' };
  }
  const cialo = (await odpowiedz.json().catch(() => null)) as { blad?: string } | null;
  if (!odpowiedz.ok) return { blad: cialo?.blad ?? `Serwer odpowiedział kodem ${odpowiedz.status}.` };
  if (!zapomnijKonto()) console.warn('[konto] could not reset the sync state after deleting the account');
  // The session's account is gone; this only clears it from the browser.
  await sb.auth.signOut({ scope: 'local' }).catch(() => undefined);
  return {};
}
