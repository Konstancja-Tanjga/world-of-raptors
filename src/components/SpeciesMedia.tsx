import Link from 'next/link';
import { zdjecia, znajdzGatunek, znajdzPtakaMokradel } from '@/lib/content';
import { linkiGatunku } from '@/lib/media';
import { CuesTable } from './CuesTable';
import { Photo } from './Photo';
import { CECHY_DZIENNE, CECHY_NOCNE, CECHY_SIEWKOWE, ListaCech, SpeciesCues } from './SpeciesCues';
import { NazwaPtaka } from './NazwaPtaka';

/** A plate is as wide as a lesson's gallery: the main photo takes two thirds of it, each other photo one third. */
const rozmiaryPlanszy = (i: number, ile: number) =>
  ile === 1 ? '(min-width: 76rem) 57rem, 100vw' : i === 0 ? '(min-width: 76rem) 38rem, (min-width: 38rem) 66vw, 100vw' : '(min-width: 76rem) 19rem, (min-width: 38rem) 33vw, 100vw';

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
  if (!g) return <PlanszaMokradel id={id} ileMylonych={ileMylonych} />;
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
          data-galeria
          className={
            zdjeciaPlanszy.length === 1
              ? 'plate__photos plate__photos--single'
              : zdjeciaPlanszy.length === 3
                ? 'plate__photos plate__photos--three'
                : 'plate__photos'
          }
        >
          {zdjeciaPlanszy.map((p, i) => (
            <Photo
              key={p.foto.plik}
              zdjecie={p.foto}
              alt={p.alt}
              podpis={p.podpis}
              wazne={glowne && i === 0}
              sizes={rozmiaryPlanszy(i, zdjeciaPlanszy.length)}
            />
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
                    <NazwaPtaka id={m.id} pl={m.pl} />
                  </Link>{' '}
                  <span className="latin" translate="no" lang="la">
                    {m.lat}
                  </span>
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
 * A bird of marshes in a lesson: perched or standing first (that is how it is
 * usually seen), then in flight where a cue shows only on the wing, then the
 * view that most helps identification (`cecha`), and the way to its card,
 * where I tick it. A wader taught as a full species (B8) also gets its cues
 * compared with its look-alikes, like a raptor; for the others the field
 * marks are the lesson's own text.
 */
function PlanszaMokradel({ id, ileMylonych }: { id: string; ileMylonych: number }) {
  const p = znajdzPtakaMokradel(id);
  if (!p) return null;
  const z = zdjecia[id];
  const zdjeciaPlanszy = [
    z?.siedzacy && { foto: z.siedzacy, alt: `${p.pl}, ptak siedzący`, podpis: 'Siedzący' },
    z?.lot && { foto: z.lot, alt: `${p.pl} w locie`, podpis: 'W locie' },
    z?.cecha && { foto: z.cecha, alt: z.cecha.alt, podpis: z.cecha.podpis },
  ].filter((x) => !!x);
  const r = p.rozpoznawanie;
  const mylone = (r?.mylona_z ?? []).map(znajdzPtakaMokradel).filter((m) => m !== undefined).slice(0, ileMylonych);
  const nazwa = (x: { pl: string }) => x.pl[0].toLocaleUpperCase('pl') + x.pl.slice(1);
  return (
    <div className="plate">
      {zdjeciaPlanszy.length > 0 && (
        <div
          data-galeria
          className={`plate__photos${r ? '' : ' plate__photos--mokradla'}${zdjeciaPlanszy.length === 1 ? ' plate__photos--single' : ''}${zdjeciaPlanszy.length === 3 ? ' plate__photos--three' : ''}`}
        >
          {zdjeciaPlanszy.map((x, i) => (
            <Photo key={x.foto.plik} zdjecie={x.foto} alt={x.alt} podpis={x.podpis} sizes={r ? rozmiaryPlanszy(i, zdjeciaPlanszy.length) : undefined} />
          ))}
        </div>
      )}
      {r && mylone.length > 0 ? (
        <>
          <CuesTable
            podpis={`Na co patrzeć: ${nazwa(p)} i podobne gatunki`}
            cechy={CECHY_SIEWKOWE}
            gatunki={[p, ...mylone].map((x) => ({ id: x.id, pl: nazwa(x), cechy: x.rozpoznawanie?.klucz ?? {} }))}
          />
          <ul className="plate__lookalikes" aria-label={`Gatunki podobne do: ${p.pl}`}>
            {mylone.map((m) => {
              const mz = zdjecia[m.id];
              const foto = mz?.siedzacy ?? mz?.lot;
              return (
                <li key={m.id}>
                  {foto && <Photo zdjecie={foto} alt={m.pl} maly />}
                  <Link href={`/gatunki/${m.id}`} className="text-link">
                    <NazwaPtaka id={m.id} pl={nazwa(m)} />
                  </Link>{' '}
                  <span className="latin" translate="no" lang="la">
                    {m.lat}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        r && <ListaCech cechy={r.klucz} pola={CECHY_SIEWKOWE} />
      )}
      <p className="plate__karta">
        <Link href={`/gatunki/${p.id}`} className="text-link">
          Karta gatunku<span className="visually-hidden">: {p.pl}</span>
        </Link>
      </p>
    </div>
  );
}
