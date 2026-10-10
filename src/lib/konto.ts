'use client';

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

/*
 * Accounts are an extra: the course works signed out, everything stays in
 * the browser as before. Signing in adds syncing between devices. Google's own
 * sign-in button (PrzyciskGoogle) talks to Google from the course's page and
 * hands Supabase the ID token it gets back, so Google's consent screen names
 * the course's address rather than the Supabase project's. The session lives
 * in the browser too (localStorage), so every page stays static: no cookies,
 * no proxy.
 */

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KLUCZ = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

/** Sign-in is shown only when the flag is on and both services are configured. */
export const KONTA_WLACZONE =
  process.env.NEXT_PUBLIC_ACCOUNTS_ENABLED === 'true' && Boolean(URL_SUPABASE && KLUCZ && GOOGLE_CLIENT_ID);

let klient: SupabaseClient | null = null;

/** The one Supabase client in the browser, or null when accounts are off. */
export function supabase(): SupabaseClient | null {
  if (!KONTA_WLACZONE || typeof window === 'undefined') return null;
  klient ??= createClient(URL_SUPABASE!, KLUCZ!, {
    auth: {
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'wor:konto',
    },
  });
  return klient;
}

export type StanKonta =
  | { stan: 'wylaczone' }
  | { stan: 'wczytywanie' }
  | { stan: 'gosc' }
  | { stan: 'zalogowana'; uzytkownik: User };

/**
 * Whether someone is signed in. `wczytywanie` until the browser's copy of the
 * session has been read (always on the server), so nothing flips from
 * "signed out" to "signed in" on load.
 */
export function useKonto(): StanKonta {
  const [stan, setStan] = useState<StanKonta>(KONTA_WLACZONE ? { stan: 'wczytywanie' } : { stan: 'wylaczone' });

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    const { data } = sb.auth.onAuthStateChange((_zdarzenie, sesja) => {
      setStan(sesja ? { stan: 'zalogowana', uzytkownik: sesja.user } : { stan: 'gosc' });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return stan;
}

/**
 * A one-time value for one sign-in: Google puts its hash into the ID token,
 * Supabase checks the token against the raw value, so a token caught on its
 * way cannot be used again.
 */
export async function nowyNonce() {
  const surowy = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');
  const skrot = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(surowy));
  const hash = Array.from(new Uint8Array(skrot), (b) => b.toString(16).padStart(2, '0')).join('');
  return { surowy, hash };
}

/** Signs in to Supabase with the ID token Google's button returned. */
export async function zalogujTokenemGoogle(token: string, nonce: string) {
  const sb = supabase();
  if (!sb) return { blad: 'Logowanie jest wyłączone.' };
  const { error } = await sb.auth.signInWithIdToken({ provider: 'google', token, nonce });
  return { blad: error?.message };
}

/** Signs out on this device. The course data stays in this browser. */
export async function wyloguj() {
  const sb = supabase();
  if (!sb) return { blad: undefined };
  const { error } = await sb.auth.signOut({ scope: 'local' });
  return { blad: error?.message };
}
