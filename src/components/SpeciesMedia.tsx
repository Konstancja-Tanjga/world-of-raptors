import Link from 'next/link';
import { zdjecia, znajdzGatunek, znajdzPtakaMokradel } from '@/lib/content';
import { linkiGatunku } from '@/lib/media';
import { CuesTable } from './CuesTable';
import { Photo } from './Photo';
import { CECHY_DZIENNE, CECHY_NOCNE, SpeciesCues } from './SpeciesCues';

/**
 * A field-guide plate for one species: the reference photos (in flight first
 * for diurnal raptors, perched first for owls, because that is how each is
 * usually seen, then an identification view such as the other sex), the ID
 * cues side by side with its look-alikes, and where to see and hear more. A
 * bird of marshes gets a plate of its own (PlanszaMokradel).
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
  if (!g) return <PlanszaMokradel id={id} />;
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
  // Always last: it only makes sense next to the two views it adds to.
  if (z?.cecha) zdjeciaPlanszy.push({ foto: z.cecha, alt: z.cecha.alt, podpis: z.cecha.podpis });

  const kolumna = (x: NonNullable<typeof g>) => ({
    id: x.id,
    pl: x.pl,
    cechy: x.sylwetka,
  });

  return (
    <div className="plate">
      {zdjeciaPlanszy.length > 0 && (
        <div
          className={
            zdjeciaPlanszy.length === 1
              ? 'plate__photos plate__photos--single'
              : zdjeciaPlanszy.length === 3
                ? 'plate__photos plate__photos--three'
                : 'plate__photos'
          }
        >
          {zdjeciaPlanszy.map((p, i) => (
            <Photo key={p.foto.plik} zdjecie={p.foto} alt={p.alt} podpis={p.podpis} wazne={glowne && i === 0} />
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

/**
 * A bird of marshes in a lesson: standing first (that is how it is seen on the
 * mud), then in flight where a cue shows only on the wing, and the way to its
 * card, where I tick it. Its field marks are the lesson's own text.
 */
function PlanszaMokradel({ id }: { id: string }) {
  const p = znajdzPtakaMokradel(id);
  if (!p) return null;
  const z = zdjecia[id];
  const zdjeciaPlanszy = [
    z?.siedzacy && { foto: z.siedzacy, alt: p.pl, podpis: 'Na ziemi' },
    z?.lot && { foto: z.lot, alt: `${p.pl} w locie`, podpis: 'W locie' },
  ].filter((x) => !!x);
  return (
    <div className="plate">
      {zdjeciaPlanszy.length > 0 && (
        <div className={zdjeciaPlanszy.length === 1 ? 'plate__photos plate__photos--single plate__photos--mokradla' : 'plate__photos plate__photos--mokradla'}>
          {zdjeciaPlanszy.map((x) => (
            <Photo key={x.foto.plik} zdjecie={x.foto} alt={x.alt} podpis={x.podpis} />
          ))}
        </div>
      )}
      <p className="plate__karta">
        <Link href={`/gatunki/${p.id}`} className="text-link">
          Karta gatunku<span className="visually-hidden">: {p.pl}</span>
        </Link>
      </p>
    </div>
  );
}
