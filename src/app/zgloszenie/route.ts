import { createClient } from '@supabase/supabase-js';
import { wyslijZgloszenie, type UslugiZgloszen } from '@/lib/zgloszenie';

/**
 * POST with `Authorization: Bearer <access token>` and the note as JSON mails
 * it to the owner through Resend (src/lib/zgloszenie.ts has the rules). The
 * daily count is written as the signed-in person, with the public key and
 * their token, so row level security applies. The Resend key is read here
 * only, on the server; it never has a NEXT_PUBLIC_ name.
 */

const NADAWCA_DOMYSLNY = 'World of Raptors <onboarding@resend.dev>';

function uslugi(): UslugiZgloszen | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const klucz = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const resend = process.env.RESEND_API_KEY;
  const odbiorca = process.env.FEEDBACK_EMAIL_TO;
  if (!url || !klucz || !resend || !odbiorca) return null;
  const sesja = { persistSession: false, autoRefreshToken: false };
  return {
    async uzytkownik(token) {
      const { data, error } = await createClient(url, klucz, { auth: sesja }).auth.getUser(token);
      return error || !data.user ? null : { id: data.user.id, email: data.user.email };
    },
    async policz(token, id) {
      const sb = createClient(url, klucz, { auth: sesja, global: { headers: { Authorization: `Bearer ${token}` } } });
      const { error } = await sb.from('feedback_log').insert({ user_id: id });
      if (!error) return 'ok';
      return error.code === '54000' ? 'limit' : { blad: error.message };
    },
    async wyslij({ temat, tekst, odpowiedzDo }) {
      try {
        const odpowiedz = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resend}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: process.env.FEEDBACK_EMAIL_FROM || NADAWCA_DOMYSLNY,
            to: [odbiorca],
            subject: temat,
            text: tekst,
            ...(odpowiedzDo && { reply_to: odpowiedzDo }),
          }),
        });
        return odpowiedz.ok ? {} : { blad: `Resend ${odpowiedz.status}: ${await odpowiedz.text()}` };
      } catch (err) {
        return { blad: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}

export async function POST(request: Request) {
  const dane: unknown = await request.json().catch(() => null);
  const { status, cialo } = await wyslijZgloszenie(request.headers.get('authorization'), dane, uslugi(), {
    wlaczone: process.env.NEXT_PUBLIC_ACCOUNTS_ENABLED === 'true',
    origin: new URL(request.url).origin,
  });
  return Response.json(cialo, { status });
}
