import type { Metadata } from 'next';
import { FiszkiView } from '@/components/FiszkiView';
import { gatunkiFiszek, taliaBudowy, taliaFiszek } from '@/lib/content';

// Personal: what I saw, learned and earned, kept in this browser; nothing for a search engine.
export const metadata: Metadata = { title: 'Fiszki', robots: { index: false } };

export default function FiszkiPage() {
  const talia = [...taliaFiszek(), ...taliaBudowy()];
  return (
    <div className="page page--fiszki">
      <header className="naglowek-strony">
        <p className="eyebrow">Powtórki</p>
        <h1 className="naglowek-strony__tytul">Fiszki</h1>
      </header>
      <FiszkiView talia={talia} gatunki={gatunkiFiszek()} />
    </div>
  );
}
