import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { KontoView } from '@/components/KontoView';
import { NaglowekStrony } from '@/components/NaglowekStrony';

// Personal: my account; nothing for a search engine.
export const metadata: Metadata = { title: 'Konto', robots: { index: false } };

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
      <NaglowekStrony tytul="Konto" lead="Postęp na telefonie i komputerze. Bez konta kurs też działa." />
      <KontoView />
    </div>
  );
}
