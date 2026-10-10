import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { KontoView } from '@/components/KontoView';

export const metadata: Metadata = { title: 'Konto' };

export default function KontoPage() {
  // Accounts ship behind a flag; with it off, or with Supabase or Google not
  // configured (the same test as KONTA_WLACZONE in src/lib/konto.ts, which a
  // server component cannot import as a value), the page does not exist.
  const wlaczone =
    process.env.NEXT_PUBLIC_ACCOUNTS_ENABLED === 'true' &&
    Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    );
  if (!wlaczone) notFound();
  return (
    <div className="page">
      <header className="naglowek-strony">
        <p className="eyebrow">Konto</p>
        <h1 className="naglowek-strony__tytul">Mój postęp na każdym urządzeniu</h1>
        <p className="naglowek-strony__lead">
          Kurs działa bez logowania: lekcje, checklista i fiszki zapisują się w tej przeglądarce. Po
          zalogowaniu kontem Google ten sam postęp jest też na telefonie i na komputerze, a kopia
          zostaje w chmurze.
        </p>
      </header>
      <KontoView />
    </div>
  );
}
