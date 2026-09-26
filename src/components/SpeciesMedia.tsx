import Link from 'next/link';
import { zdjecia, znajdzGatunek } from '@/lib/content';
import { linkiGatunku } from '@/lib/media';
import { Photo } from './Photo';
import { SpeciesCues } from './SpeciesCues';

/**
 * The two reference photos of a species (perched and in flight), the species
 * it is most often confused with, and where to see and hear more.
 */
export function SpeciesMedia({
  id,
  linki = true,
  ileMylonych = 2,
}: {
  id: string;
  linki?: boolean;
  /** How many look-alikes to show; lessons show two, the species page all. */
  ileMylonych?: number;
}) {
  const g = znajdzGatunek(id);
  if (!g) return null;
  const z = zdjecia[id];
  const mylone = g.mylona_z
    .map(znajdzGatunek)
    .filter((m) => m !== undefined)
    .slice(0, ileMylonych);

  return (
    <div className="species-media">
      {z && (z.siedzacy || z.lot) && (
        <div className="photo-pair">
          {z.siedzacy && (
            <Photo zdjecie={z.siedzacy} alt={`${g.pl}, ptak siedzący`} podpis="Siedzący" />
          )}
          {z.lot && <Photo zdjecie={z.lot} alt={`${g.pl} w locie`} podpis="W locie" />}
        </div>
      )}

      <SpeciesCues g={g} />

      {mylone.length > 0 && (
        <div className="confusion">
          <p className="confusion__title">⚠️ Łatwo pomylić z…</p>
          <ul className="confusion__list">
            {mylone.map((m) => {
              const mz = zdjecia[m.id];
              const foto = mz?.lot ?? mz?.siedzacy;
              return (
                <li key={m.id} className="confusion__item">
                  {foto && <Photo zdjecie={foto} alt={m.pl} maly />}
                  <span>
                    <Link href={`/gatunki/${m.id}`} className="text-link">
                      {m.pl}
                    </Link>
                    <span className="latin">
                      {' '}
                      {m.lat} <span className="en">(ang. {m.en})</span>
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {linki && (
        <ul className="media-links" aria-label={`Więcej o gatunku ${g.pl}`}>
          {linkiGatunku(g).map((l) => (
            <li key={l.href}>
              <a href={l.href} target="_blank" rel="noreferrer" className="text-link">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
