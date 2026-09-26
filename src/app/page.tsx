import Link from 'next/link';
import { Ciekawostka } from '@/components/Ciekawostka';
import { ChecklistSummary } from '@/components/ChecklistSummary';
import { Badge, Card } from '@/components/ds';
import { ciekawostkiDla, gatunki, moduly, sciezki } from '@/lib/content';

export default function Home() {
  return (
    <div className="page">
      <div className="stack">
        <h1 className="page-title">World of Raptors</h1>
        <p className="lead">
          Mój kurs o ptakach drapieżnych: biologia i rozpoznawanie w terenie, z naciskiem na
          Polskę, południe Hiszpanii i Cieśninę Gibraltarską.
        </p>
      </div>

      <Ciekawostka {...ciekawostkiDla()} />

      <ChecklistSummary ids={gatunki.map((g) => g.id)} />

      {sciezki.map((s) => (
        <section key={s.id} className="stack" aria-labelledby={`sciezka-${s.id}`}>
          <h2 id={`sciezka-${s.id}`} className="section-title">
            {s.tytul}
          </h2>
          <ul className="grid">
            {moduly
              .filter((m) => m.sciezka === s.id)
              .map((m) => (
                <li key={m.id}>
                  <Card accent={m.gotowy ? 'info' : 'none'}>
                    <div className="species-card">
                      <h3 className="species-card__title">
                        {m.gotowy && m.slug ? (
                          <Link href={`/moduly/${m.slug}`} className="text-link">
                            {m.id} · {m.tytul}
                          </Link>
                        ) : (
                          <>
                            {m.id} · {m.tytul}
                          </>
                        )}
                      </h3>
                      <div className="chips">
                        {m.gotowy ? (
                          <Badge tone="success">gotowy · {m.lekcje?.length ?? 0} lekcji</Badge>
                        ) : (
                          <Badge>w planach</Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
