'use client';

import { useEffect } from 'react';
import { supabase, useKonto } from '@/lib/konto';
import { odmiana } from '@/lib/odmiana';
import type { WynikSynchronizacji } from '@/lib/synchronizacja';
import { uruchomSynchronizacje, zatrzymajSynchronizacje } from '@/lib/synchronizacjaPrzegladarki';
import { useToast } from './ds';

const NAZWY: Record<string, [string, string, string]> = {
  lesson_progress: ['lekcja', 'lekcje', 'lekcji'],
  observations: ['obserwacja', 'obserwacje', 'obserwacji'],
  flashcards: ['fiszka', 'fiszki', 'fiszek'],
  user_badges: ['odznaka', 'odznaki', 'odznak'],
};

/** "5 lekcji, 12 obserwacji": what a first pass added to the account, or '' when nothing. */
export function coDodano(wyslane: WynikSynchronizacji['wyslane']) {
  return Object.entries(NAZWY)
    .filter(([tabela]) => (wyslane[tabela] ?? 0) > 0)
    .map(([tabela, formy]) => `${wyslane[tabela]} ${odmiana(wyslane[tabela], formy)}`)
    .join(', ');
}

/**
 * Keeps the stores in sync while someone is signed in. Renders nothing; on a
 * device's first pass with an account it says what this browser added.
 */
export function Synchronizacja() {
  const konto = useKonto();
  const { notify } = useToast();
  const uzytkownik = konto.stan === 'zalogowana' ? konto.uzytkownik.id : null;

  useEffect(() => {
    const sb = supabase();
    if (!uzytkownik || !sb) return;
    uruchomSynchronizacje(sb, uzytkownik, (wynik) => {
      const opis = wynik.pierwsza ? coDodano(wynik.wyslane) : '';
      if (opis) {
        notify({ tone: 'success', title: 'Postęp połączony z kontem', description: `Z tej przeglądarki doszło do konta: ${opis}.` });
      }
    });
    return () => zatrzymajSynchronizacje();
  }, [uzytkownik, notify]);

  return null;
}
