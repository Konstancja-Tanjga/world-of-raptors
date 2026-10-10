/**
 * Deleting an account, without Next.js or a real Supabase, so tests can run
 * it: the route (src/app/konto/usun/route.ts) passes Supabase's admin API in.
 * Who is asking comes only from their own session token, checked by Supabase,
 * never from anything else in the request, so an account can delete only
 * itself. The database then deletes every row of it (on delete cascade).
 */

export type AdminKont = {
  /** The user the access token belongs to, or an error when it is not a valid session. */
  uzytkownik(token: string): Promise<{ id: string } | null>;
  usun(id: string): Promise<{ blad?: string }>;
};

export type OdpowiedzUsuniecia = { status: 200 | 401 | 404 | 502 | 503; cialo: { usunieto: true } | { blad: string } };

export async function usunKonto(naglowek: string | null, admin: AdminKont | null, wlaczone: boolean): Promise<OdpowiedzUsuniecia> {
  if (!wlaczone) return { status: 404, cialo: { blad: 'Konta są wyłączone.' } };
  if (!admin) return { status: 503, cialo: { blad: 'Usuwanie kont nie jest jeszcze skonfigurowane na serwerze.' } };
  const token = /^Bearer (\S+)$/.exec(naglowek ?? '')?.[1];
  if (!token) return { status: 401, cialo: { blad: 'Brak sesji. Zaloguj się ponownie.' } };
  const uzytkownik = await admin.uzytkownik(token);
  if (!uzytkownik) return { status: 401, cialo: { blad: 'Sesja wygasła. Zaloguj się ponownie.' } };
  const { blad } = await admin.usun(uzytkownik.id);
  if (blad) {
    console.error('[konto] deleting the account failed', blad);
    return { status: 502, cialo: { blad: 'Serwer kont nie usunął konta. Spróbuj jeszcze raz za chwilę.' } };
  }
  return { status: 200, cialo: { usunieto: true } };
}
