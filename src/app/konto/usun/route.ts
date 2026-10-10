import { createClient } from '@supabase/supabase-js';
import { usunKonto, type AdminKont } from '@/lib/usuwanieKonta';

/**
 * POST with `Authorization: Bearer <access token>` deletes the signed-in
 * person's account and, through the foreign keys, every row of it. The secret
 * key is read here only, on the server; it never has a NEXT_PUBLIC_ name.
 */

function admin(): AdminKont | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sekret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !sekret) return null;
  const sb = createClient(url, sekret, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    async uzytkownik(token) {
      const { data, error } = await sb.auth.getUser(token);
      return error || !data.user ? null : { id: data.user.id };
    },
    async usun(id) {
      const { error } = await sb.auth.admin.deleteUser(id);
      return { blad: error?.message };
    },
  };
}

export async function POST(request: Request) {
  const { status, cialo } = await usunKonto(
    request.headers.get('authorization'),
    admin(),
    process.env.NEXT_PUBLIC_ACCOUNTS_ENABLED === 'true',
  );
  return Response.json(cialo, { status });
}
