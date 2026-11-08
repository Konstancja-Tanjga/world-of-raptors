import type { Metadata } from 'next';
import './moje-niebo.css';
import { MojeNiebo } from '@/components/niebo/MojeNiebo';
import { rysunek } from '@/components/niebo/rysunek';
import { Sylwetka } from '@/components/Sylwetka';
import { gwiazdozbioryKursu, strukturaNieba } from '@/lib/content';
import { NASZYWKI } from '@/lib/odznaki';

// Personal: what I saw, learned and earned, kept in this browser; nothing for a search engine.
export const metadata: Metadata = { title: 'Moje niebo', robots: { index: false } };

export default function MojeNieboPage() {
  const struktura = strukturaNieba();
  return (
    <div className="page moje-niebo">
      <header className="naglowek-strony">
        <p className="eyebrow">Moja kolekcja</p>
        <h1 className="naglowek-strony__tytul">Moje niebo</h1>
        <p className="naglowek-strony__lead">
          Zaliczone moduły zapalają gwiazdozbiory, gatunki zbierają obrączki, a za umiejętności dostaję naszywki. Nic się nie blokuje i nic z tego nie przepada.
        </p>
      </header>
      <MojeNiebo
        struktura={struktura}
        gwiazdozbiory={gwiazdozbioryKursu()}
        sylwetki={Object.fromEntries(
          struktura.gatunki.map((g) => [g.id, <Sylwetka key={g.id} id={g.id} klasa="lista-zyciowa__sylwetka" dokladnosc={0.3} />]),
        )}
        rysunki={Object.fromEntries([...new Set(NASZYWKI.flatMap((n) => n.ptaki ?? []))].map((id) => [id, rysunek(id)]))}
      />
    </div>
  );
}
