import Link from 'next/link';
import { znajdzGatunek } from '@/lib/content';
import { linkiGatunku } from '@/lib/media';
import { SpeciesMedia } from './SpeciesMedia';

/**
 * Closing section of every lesson: each atlas species the lesson names, with
 * photos (unless the lesson already shows them under a species heading),
 * look-alikes, and links to video, sound and further reading.
 */
export function LessonMedia({ ids, juzPokazane }: { ids: string[]; juzPokazane: Set<string> }) {
  const lista = ids.map(znajdzGatunek).filter((g) => g !== undefined);
  if (lista.length === 0) return null;

  return (
    <section className="lesson-media stack" aria-labelledby="media">
      <h2 id="media" className="section-title">
        Zobacz, posłuchaj, poczytaj
      </h2>
      <p className="muted">
        Gatunki z tej lekcji: zdjęcia, gatunki, z którymi łatwo je pomylić, filmy, głosy i źródła.
        Zdjęcia pochodzą z Wikimedia Commons, a linki do YouTube otwierają wyszukiwanie filmów o
        danym gatunku.
      </p>
      {lista.map((g) => (
        <article key={g.id} className="lesson-media__species" aria-labelledby={`media-${g.id}`}>
          <h3 id={`media-${g.id}`} className="species-card__title">
            <Link href={`/gatunki/${g.id}`} className="text-link">
              {g.pl}
            </Link>{' '}
            <span className="latin">
              {g.lat} <span className="en">(ang. {g.en})</span>
            </span>
          </h3>
          {juzPokazane.has(g.id) ? (
            <ul className="media-links" aria-label={`Więcej o gatunku ${g.pl}`}>
              {linkiGatunku(g).map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noreferrer" className="text-link">
                    {l.label}
                    <span className="visually-hidden">: {g.pl}, otwiera się w nowej karcie</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <SpeciesMedia id={g.id} />
          )}
        </article>
      ))}
    </section>
  );
}
