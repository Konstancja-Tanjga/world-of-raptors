import type { Metadata } from 'next';
import { FiszkiView } from '@/components/FiszkiView';
import { gatunkiFiszek, taliaBudowy, taliaFiszek } from '@/lib/content';
import { NaglowekStrony } from '@/components/NaglowekStrony';

// Personal: what I saw, learned and earned, kept in this browser; nothing for a search engine.
export const metadata: Metadata = { title: 'Fiszki', robots: { index: false } };

export default function FiszkiPage() {
  const talia = [...taliaFiszek(), ...taliaBudowy()];
  return (
    <div className="page page--fiszki">
      <NaglowekStrony tytul="Fiszki" />
      <FiszkiView talia={talia} gatunki={gatunkiFiszek()} />
    </div>
  );
}
