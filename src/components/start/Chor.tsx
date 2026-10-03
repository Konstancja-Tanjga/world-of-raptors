import Link from 'next/link';
import { gatunki, zajawkaModulu } from '@/lib/content';
import type { SylwetkaNocna } from '@/lib/types';
import { MarkdownInline } from '../Markdown';
import { Sylwetka } from '../Sylwetka';

/**
 * The night half of the course next to the day half: the owls of B5, each
 * with its voice as the atlas writes it down, because owls are told apart by
 * ear first. Set against a night sky, the counterpart of the eight
 * silhouettes against the day sky above it.
 */
export async function Chor() {
  const sowy = gatunki.filter((g) => g.aktywnosc === 'nocny');
  const zajawka = await zajawkaModulu('sowy');

  return (
    <section className="chor scena" data-scena aria-labelledby="chor-tytul">
      <div className="chor__wnetrze">
        <header className="sekcja">
          <p className="eyebrow">Nocą: moduł B5</p>
          <h2 id="chor-tytul" className="sekcja__tytul">
            Nocny chór
          </h2>
          {zajawka && (
            <p className="sekcja__lead">
              <MarkdownInline source={zajawka} baseDir="moduly/sowy" />
            </p>
          )}
        </header>
        <ul className="chor__lista">
          {sowy.map((s) => (
            <li key={s.id}>
              <Link href={`/gatunki/${s.id}`} className="chor__sowa">
                <Sylwetka id={s.id} klasa="chor__sylwetka" dokladnosc={0.3} />
                <span className="chor__nazwa">{s.pl}</span>
                <span className="chor__glos">{(s.sylwetka as SylwetkaNocna).glos}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/moduly/sowy" className="cta cta--szklo">
          <span className="cta__etykieta">Moduł B5: Sowy, drapieżniki nocne</span>
        </Link>
      </div>
    </section>
  );
}
