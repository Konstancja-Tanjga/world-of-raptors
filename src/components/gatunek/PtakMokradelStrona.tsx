import Link from 'next/link';
import { ViewTransition } from 'react';
import { Breadcrumbs } from '@/components/ds';
import { Photo } from '@/components/Photo';
import { SpeciesObservation } from '@/components/SpeciesObservation';
import { linkiGatunku } from '@/lib/media';
import { MIEJSCA, NAZWY_GRUP_MOKRADEL, type PtakMokradel, type Modul, type ZdjeciaGatunku } from '@/lib/types';
import { polozenie, srcSetCommons } from '@/lib/zdjecia';

/**
 * The page of a bird other than a raptor (a site's field list): its photo,
 * names, what to look for, my observation and where to read on. The raptor
 * page's plate, flight, scale and rings are built on silhouettes these birds
 * do not have.
 */
export function PtakMokradelStrona({
  p,
  z,
  moduly,
}: {
  p: PtakMokradel;
  z: ZdjeciaGatunku | undefined;
  moduly: (Modul & { slug: string })[];
}) {
  const glowne = z?.siedzacy ?? z?.lot ?? null;
  const miejsca = MIEJSCA.filter((m) => p.miejsca.includes(m.value));
  return (
    <div className="gatunek">
      <section className="gatunek-hero scena" data-scena aria-labelledby="gatunek-nazwa">
        {glowne && (
          // eslint-disable-next-line @next/next/no-img-element -- Commons serves its own sizes; srcset picks one
          <img
            className="gatunek-hero__zdjecie"
            src={glowne.src}
            srcSet={srcSetCommons(glowne)}
            sizes="100vw"
            width={glowne.width}
            height={glowne.height}
            alt={p.pl}
            fetchPriority="high"
            style={{ objectPosition: polozenie(glowne) }}
          />
        )}
        <div className="gatunek-hero__tresc">
          <Breadcrumbs items={[{ label: 'Atlas gatunków', href: '/gatunki' }, { label: p.pl }]} />
          <ViewTransition name={`nazwa-${p.id}`} share="morf-nazwy" default="none">
            <h1 id="gatunek-nazwa" className="gatunek-hero__nazwa">
              {p.pl}
            </h1>
          </ViewTransition>
          <p className="gatunek-hero__lacina">{p.lat}</p>
          <p className="gatunek-hero__jezyki">
            ang. <span lang="en">{p.en}</span>, hiszp. <span lang="es">{p.es}</span>
          </p>
          <ul className="gatunek-hero__znaczniki" aria-label="Grupa">
            <li>ptaki mokradeł</li>
            <li>{NAZWY_GRUP_MOKRADEL[p.grupa].toLocaleLowerCase('pl')}</li>
          </ul>
        </div>
        {glowne && (
          <p className="gatunek-hero__podpis">
            Fot. {glowne.autor},{' '}
            {glowne.licencjaUrl ? (
              <a href={glowne.licencjaUrl} target="_blank" rel="noreferrer">
                {glowne.licencja}
              </a>
            ) : (
              glowne.licencja
            )}
            {glowne.strona && (
              <>
                ,{' '}
                <a href={glowne.strona} target="_blank" rel="noreferrer">
                  Wikimedia Commons
                </a>
              </>
            )}
          </p>
        )}
      </section>

      <div className="gatunek__tresc">
        <section className="gatunek__rozdzial" aria-labelledby="klucz">
          <div className="gatunek__bok">
            <p className="eyebrow">W terenie</p>
            <h2 id="klucz" className="sekcja__tytul">
              Na co patrzeć
            </h2>
            {miejsca.length > 0 && (
              <p className="sekcja__lead">
                Gatunek możliwy, nie pewny: jest na liście terenowej {miejsca.map((m) => m.label).join(', ')}.
              </p>
            )}
          </div>
          <ol className="gatunek__klucz">
            {p.cechy.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        </section>

        {z?.siedzacy && (z.lot || z.cecha) && (
          <section className="gatunek__rozdzial" aria-labelledby="zdjecia">
            <div className="gatunek__bok">
              <p className="eyebrow">Zdjęcia</p>
              <h2 id="zdjecia" className="sekcja__tytul">
                Zdjęcia
              </h2>
            </div>
            <div className="gatunek__zdjecia">
              {z.lot && <Photo zdjecie={z.lot} alt={`${p.pl} w locie`} podpis="W locie" />}
              <Photo zdjecie={z.siedzacy} alt={`${p.pl}, ptak siedzący`} podpis="Siedzący" />
              {z.cecha && <Photo zdjecie={z.cecha} alt={z.cecha.alt} podpis={z.cecha.podpis} />}
            </div>
          </section>
        )}

        <section className="gatunek__rozdzial" aria-labelledby="obserwacja">
          <div className="gatunek__bok">
            <p className="eyebrow">Moja lista</p>
            <h2 id="obserwacja" className="sekcja__tytul">
              Moja obserwacja
            </h2>
          </div>
          <SpeciesObservation id={p.id} nazwa={p.pl} />
        </section>

        <section className="gatunek__rozdzial" aria-labelledby="wiecej">
          <div className="gatunek__bok">
            <p className="eyebrow">Dalej</p>
            <h2 id="wiecej" className="sekcja__tytul">
              Więcej o gatunku
            </h2>
          </div>
          <div className="gatunek__wiecej">
            {moduly.length > 0 && (
              <ul className="gatunek__moduly" aria-label="Moduły kursu o tym gatunku">
                {moduly.map((m) => (
                  <li key={m.slug}>
                    <Link href={`/moduly/${m.slug}`} className="gatunek__modul">
                      <span className="gatunek__modul-id">{m.id}</span>
                      <span>{m.tytul}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <ul className="media-links" aria-label={`Więcej o gatunku ${p.pl}`}>
              {linkiGatunku({ lat: p.lat, en: p.en, aktywnosc: null }).map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noreferrer" className="text-link">
                    {l.label}
                    <span className="visually-hidden">: {p.pl}, otwiera się w nowej karcie</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
