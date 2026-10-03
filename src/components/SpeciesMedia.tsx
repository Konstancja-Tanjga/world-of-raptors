import Link from 'next/link';
import { zdjecia, znajdzGatunek } from '@/lib/content';
import { linkiGatunku } from '@/lib/media';
import { CuesTable } from './CuesTable';
import { Photo } from './Photo';
import { CECHY_DZIENNE, CECHY_NOCNE, SpeciesCues } from './SpeciesCues';

/**
 * A field-guide plate for one species: the reference photos (in flight first
 * for diurnal raptors, perched first for owls, because that is how each is
 * usually seen), the ID cues side by side with its look-alikes, and where to
 * see and hear more.
 */
export function SpeciesMedia({
  id,
  linki = true,
  ileMylonych = 2,
  glowne = false,
}: {
  id: string;
  linki?: boolean;
  /** How many look-alikes to compare; lessons use two, the species page all. */
  ileMylonych?: number;
  /** The plate is the page's hero: its first photo loads eagerly. */
  glowne?: boolean;
}) {
  const g = znajdzGatunek(id);
  if (!g) return null;
  const z = zdjecia[id];
  const nocny = g.aktywnosc === 'nocny';
  const mylone = g.mylona_z
    .map(znajdzGatunek)
    .filter((m) => m !== undefined)
    .slice(0, ileMylonych);

  const zdjeciaPlanszy = [
    z?.lot && { foto: z.lot, alt: `${g.pl} w locie`, podpis: 'W locie' },
    z?.siedzacy && { foto: z.siedzacy, alt: `${g.pl}, ptak siedzący`, podpis: 'Siedzący' },
  ].filter((x) => !!x);
  if (nocny) zdjeciaPlanszy.reverse();

  const kolumna = (x: NonNullable<typeof g>) => ({
    id: x.id,
    pl: x.pl,
    cechy: x.sylwetka,
  });

  return (
    <div className="plate">
      {zdjeciaPlanszy.length > 0 && (
        <div className={zdjeciaPlanszy.length > 1 ? 'plate__photos' : 'plate__photos plate__photos--single'}>
          {zdjeciaPlanszy.map((p, i) => (
            <Photo key={p.podpis} zdjecie={p.foto} alt={p.alt} podpis={p.podpis} wazne={glowne && i === 0} />
          ))}
        </div>
      )}

      {mylone.length > 0 ? (
        <>
          <CuesTable
            podpis={`Na co patrzeć: ${g.pl} i podobne gatunki`}
            cechy={nocny ? CECHY_NOCNE : CECHY_DZIENNE}
            gatunki={[kolumna(g), ...mylone.map(kolumna)]}
          />
          <ul className="plate__lookalikes" aria-label={`Gatunki podobne do: ${g.pl}`}>
            {mylone.map((m) => {
              const mz = zdjecia[m.id];
              const foto = nocny ? (mz?.siedzacy ?? mz?.lot) : (mz?.lot ?? mz?.siedzacy);
              return (
                <li key={m.id}>
                  {foto && <Photo zdjecie={foto} alt={m.pl} maly />}
                  <Link href={`/gatunki/${m.id}`} className="text-link">
                    {m.pl}
                  </Link>{' '}
                  <span className="latin">{m.lat}</span>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <SpeciesCues g={g} />
      )}

      {linki && (
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
      )}
    </div>
  );
}
