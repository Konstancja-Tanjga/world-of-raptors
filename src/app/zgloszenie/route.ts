import { createClient } from '@supabase/supabase-js';
import { wynikLicznika, wyslijZgloszenie, type UslugiZgloszen } from '@/lib/zgloszenie';

/**
 * POST with `Authorization: Bearer <access token>` and the note as JSON mails
 * it to the owner through Resend (src/lib/zgloszenie.ts has the rules). The
 * daily count is written as the signed-in person, with the public key and
 * their token, so row level security applies. The Resend key is read here
 * only, on the server; it never has a NEXT_PUBLIC_ name.
 */

const NADAWCA_DOMYSLNY = 'World of Raptors <onboarding@resend.dev>';

function uslugi(): UslugiZgloszen | null {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    FEEDBACK_EMAIL_TO: process.env.FEEDBACK_EMAIL_TO,
  };
  const brakujace = Object.entries(env).filter(([, v]) => !v).map(([k]) => k);
  if (brakujace.length) {
    console.error('[zgloszenie] not configured, missing', brakujace.join(', '));
    return null;
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL!;
  const klucz = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const sesja = { persistSession: false, autoRefreshToken: false };
  return {
    async uzytkownik(token) {
      const { data, error } = await createClient(url, klucz, { auth: sesja }).auth.getUser(token);
      if (!error) return data.user ? { id: data.user.id, email: data.user.email } : null;
      // A 4xx (other than a rate limit) is about the token itself; anything else is the server.
      const status = 'status' in error ? error.status : undefined;
      return status && status >= 400 && status < 500 && status !== 429 ? null : { blad: `${status ?? 'network'}: ${error.message}` };
    },
    async policz(token, id) {
      const sb = createClient(url, klucz, { auth: sesja, global: { headers: { Authorization: `Bearer ${token}` } } });
      const { error } = await sb.from('feedback_log').insert({ user_id: id });
      return wynikLicznika(error);
    },
    async wyslij({ temat, tekst, odpowiedzDo }) {
      try {
        const odpowiedz = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: process.env.FEEDBACK_EMAIL_FROM || NADAWCA_DOMYSLNY,
            to: [env.FEEDBACK_EMAIL_TO],
            subject: temat,
            text: tekst,
            ...(odpowiedzDo && { reply_to: odpowiedzDo }),
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (odpowiedz.ok) return {};
        // A 4xx other than a rate limit is a key or an address Resend will not take: retrying cannot help.
        const trwaly = odpowiedz.status >= 400 && odpowiedz.status < 500 && odpowiedz.status !== 429;
        return { blad: `Resend ${odpowiedz.status}: ${await odpowiedz.text()}`, trwaly };
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
