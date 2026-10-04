import type { Metadata } from 'next';
import './moje-niebo.css';
import { MojeNiebo } from '@/components/niebo/MojeNiebo';
import { rysunek } from '@/components/niebo/rysunek';
import { Sylwetka } from '@/components/Sylwetka';
import { gwiazdozbioryKursu, strukturaNieba } from '@/lib/content';
import { NASZYWKI } from '@/lib/odznaki';

export const metadata: Metadata = { title: 'Moje niebo' };

export default function MojeNieboPage() {
  const struktura = strukturaNieba();
  return (
    <div className="page moje-niebo">
      <header className="naglowek-strony">
        <p className="eyebrow">Moja kolekcja</p>
        <h1 className="naglowek-strony__tytul">Moje niebo</h1>
        <p className="naglowek-strony__lead">
          Niebo, które zapełnia się tym, czego się nauczyłam. Każdy zaliczony moduł zapala swój gwiazdozbiór, każdy gatunek
          zbiera trzy obrączki, a za prawdziwe umiejętności są naszywki. Nic tu się nie blokuje: kolejne moduły są zawsze
          otwarte, a to, co zdobyłam, zostaje.
        </p>
      </header>
      <MojeNiebo
        struktura={struktura}
        gwiazdozbiory={gwiazdozbioryKursu()}
        sylwetki={Object.fromEntries(
          struktura.gatunki.map((g) => [g.id, <Sylwetka key={g.id} id={g.id} klasa="lista-zyciowa__sylwetka" dokladnosc={0.3} />]),
        )}
        rysunki={Object.fromEntries([...new Set(NASZYWKI.flatMap((n) => n.ptaki))].map((id) => [id, rysunek(id)]))}
      />
    </div>
  );
}
