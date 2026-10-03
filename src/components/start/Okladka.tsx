import Link from 'next/link';
import { ViewTransition } from 'react';
import { zdjecia } from '@/lib/content';
import { REGIONY, type Gatunek } from '@/lib/types';
import { polozenie, srcSetCommons } from '@/lib/zdjecia';
import { Miarka } from '../Miarka';

/**
 * The species of the day as a magazine cover: the photo opens like a view
 * through binoculars as it scrolls in, the name is set at display size, and
 * the wingspan is drawn to scale against a person's arm span.
 */
export function Okladka({ g }: { g: Gatunek }) {
  const z = zdjecia[g.id];
  const nocny = g.aktywnosc === 'nocny';
  // Diurnal raptors are mostly seen flying, owls perched.
  const foto = nocny ? (z?.siedzacy ?? z?.lot) : (z?.lot ?? z?.siedzacy);
  const wLocie = foto === z?.lot;
  const regiony = REGIONY.filter((r) => g.regiony.includes(r.value)).map((r) => r.label);

  return (
    <section className="okladka" aria-labelledby="gatunek-dnia">
      {foto && (
        <figure className="okladka__foto">
          <div className="lornetka">
            {/* eslint-disable-next-line @next/next/no-img-element -- Commons serves its own sizes; srcset picks one */}
            <img
              src={foto.src}
              srcSet={srcSetCommons(foto)}
              sizes="(max-width: 900px) 100vw, 60vw"
              width={foto.width}
              height={foto.height}
              alt={`${g.pl}, ${wLocie ? 'w locie' : 'ptak siedzący'}`}
              loading="lazy"
              decoding="async"
              style={{ objectPosition: polozenie(foto) }}
            />
          </div>
          <figcaption className="okladka__podpis">
            Fot. {foto.autor},{' '}
            {foto.licencjaUrl ? (
              <a href={foto.licencjaUrl} target="_blank" rel="noreferrer">
                {foto.licencja}
              </a>
            ) : (
              foto.licencja
            )}
            {foto.strona && (
              <>
                ,{' '}
                <a href={foto.strona} target="_blank" rel="noreferrer">
                  Wikimedia Commons
                </a>
              </>
            )}
          </figcaption>
        </figure>
      )}
      <div className="okladka__tekst">
        <p className="eyebrow">Gatunek na dziś</p>
        <ViewTransition name={`nazwa-${g.id}`} share="morf-nazwy" default="none">
          <h2 id="gatunek-dnia" className="okladka__nazwa">
            {g.pl}
          </h2>
        </ViewTransition>
        <p className="okladka__lacina">{g.lat}</p>
        <p className="okladka__jezyki">
          ang. <span lang="en">{g.en}</span>, hiszp. <span lang="es">{g.es}</span>
        </p>
        <Miarka g={g} />
        <dl className="fakty">
          <div>
            <dt>Grupa sylwetki</dt>
            <dd>{g.grupa}</dd>
          </div>
          <div>
            <dt>Kiedy</dt>
            <dd>{g.sezon}</dd>
          </div>
          <div>
            <dt>Gdzie w kursie</dt>
            <dd>{regiony.join(', ')}</dd>
          </div>
        </dl>
        <Link href={`/gatunki/${g.id}`} className="cta cta--obrys">
          <span className="cta__etykieta">Karta gatunku</span>
        </Link>
      </div>
    </section>
  );
}
