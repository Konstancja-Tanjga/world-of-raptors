import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ViewTransition } from 'react';
import '../atlas.css';
import { Ciekawostka } from '@/components/Ciekawostka';
import { CuesTable } from '@/components/CuesTable';
import { Breadcrumbs } from '@/components/ds';
import { PlanszaGatunku } from '@/components/gatunek/PlanszaGatunku';
import { Porownanie } from '@/components/gatunek/Porownanie';
import { Miarka } from '@/components/Miarka';
import { Photo } from '@/components/Photo';
import { ScenaSylwetki } from '@/components/ScenaSylwetki';
import { CECHY_DZIENNE, CECHY_NOCNE } from '@/components/SpeciesCues';
import { SpeciesObservation } from '@/components/SpeciesObservation';
import { ciekawostkiDla, gatunki, modulyGatunku, stronaMorfu, zdjecia, znajdzGatunek } from '@/lib/content';
import { linkiGatunku } from '@/lib/media';
import { REGIONY, STATUS_LABEL, type Gatunek } from '@/lib/types';
import { polozenie, srcSetCommons } from '@/lib/zdjecia';

export const dynamicParams = false;

export function generateStaticParams() {
  return gatunki.map((g) => ({ id: g.id }));
}

export async function generateMetadata({ params }: PageProps<'/gatunki/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const g = znajdzGatunek(id);
  return { title: g?.pl, description: g ? `${g.pl} (${g.lat}): sylwetka, cechy, podobne gatunki i zdjęcia.` : undefined };
}

export default async function GatunekPage({ params }: PageProps<'/gatunki/[id]'>) {
  const { id } = await params;
  const g = znajdzGatunek(id);
  if (!g) notFound();

  const nocny = g.aktywnosc === 'nocny';
  const z = zdjecia[g.id];
  // The opening photo: how the species is usually seen, a raptor overhead, an owl perched.
  const glowne = nocny ? (z?.siedzacy ?? z?.lot) : (z?.lot ?? z?.siedzacy);
  const podobne = g.mylona_z.map(znajdzGatunek).filter((m): m is Gatunek => m !== undefined);
  const moduly = modulyGatunku(g);
  const kolumna = (x: Gatunek) => ({ id: x.id, pl: x.pl, cechy: x.sylwetka });

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
            alt={`${g.pl}, ${glowne === z?.lot ? 'w locie' : 'ptak siedzący'}`}
            fetchPriority="high"
            style={{ objectPosition: polozenie(glowne) }}
          />
        )}
        <div className="gatunek-hero__tresc">
          <Breadcrumbs items={[{ label: 'Atlas gatunków', href: '/gatunki' }, { label: g.pl }]} />
          {/* The name arrives from the card it was opened from (atlas, species of the day). */}
          <ViewTransition name={`nazwa-${g.id}`} share="morf-nazwy" default="none">
            <h1 id="gatunek-nazwa" className="gatunek-hero__nazwa">
              {g.pl}
            </h1>
          </ViewTransition>
          <p className="gatunek-hero__lacina">{g.lat}</p>
          <p className="gatunek-hero__jezyki">
            ang. <span lang="en">{g.en}</span>, hiszp. <span lang="es">{g.es}</span>
          </p>
          <ul className="gatunek-hero__znaczniki" aria-label="Grupa i status">
            <li>{g.grupa}</li>
            <li>{nocny ? 'nocny' : 'dzienny'}</li>
            {g.status.map((s) => (
              <li key={s} data-rzadki={s === 'rzadki' ? '' : undefined}>
                {STATUS_LABEL[s]}
              </li>
            ))}
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
        <section className="gatunek__rozdzial" aria-labelledby="na-co-patrzec">
          <div className="gatunek__bok">
            <p className="eyebrow">{nocny ? 'Najpierw uchem' : 'Sylwetka'}</p>
            <h2 id="na-co-patrzec" className="sekcja__tytul">
              {nocny ? 'Na co słuchać i patrzeć' : 'Na co patrzeć'}
            </h2>
          </div>
          <PlanszaGatunku g={g} />
        </section>

        {g.aktywnosc === 'dzienny' && (
          <section className="gatunek__rozdzial" aria-labelledby="jak-lata">
            <div className="gatunek__bok">
              <p className="eyebrow">Sposób lotu</p>
              <h2 id="jak-lata" className="sekcja__tytul">
                Jak lata
              </h2>
              <p className="sekcja__lead">{g.sylwetka.lot}</p>
            </div>
            <div className="gatunek__lot">
              <ScenaSylwetki id={g.id} wariant={`${g.id}/strona`} opis={`${g.pl} w locie, od spodu: ${g.sylwetka.lot}`} />
            </div>
          </section>
        )}

        <section className="gatunek__rozdzial" aria-labelledby="wielkosc">
          <div className="gatunek__bok">
            <p className="eyebrow">Wielkość i czas</p>
            <h2 id="wielkosc" className="sekcja__tytul">
              Kiedy i gdzie
            </h2>
          </div>
          <div className="gatunek__fakty">
            <Miarka g={g} />
            <dl className="fakty">
              <div>
                <dt>Sezon</dt>
                <dd>{g.sezon}</dd>
              </div>
              <div>
                <dt>Gdzie</dt>
                <dd>{g.gdzie}</dd>
              </div>
              <div>
                <dt>Regiony kursu</dt>
                <dd>
                  {REGIONY.filter((r) => g.regiony.includes(r.value))
                    .map((r) => r.label)
                    .join(', ')}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="gatunek__rozdzial" aria-labelledby="klucz">
          <div className="gatunek__bok">
            <p className="eyebrow">W skrócie</p>
            <h2 id="klucz" className="sekcja__tytul">
              Klucz do rozpoznania
            </h2>
          </div>
          <ol className="gatunek__klucz">
            {g.cechy.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        </section>

        {(z?.lot || z?.siedzacy) && (
          <section className="gatunek__rozdzial" aria-labelledby="zdjecia">
            <div className="gatunek__bok">
              <p className="eyebrow">Zdjęcia</p>
              <h2 id="zdjecia" className="sekcja__tytul">
                W locie i na siedząco
              </h2>
            </div>
            <div
              className={
                z?.cecha && z.lot && z.siedzacy ? 'gatunek__zdjecia gatunek__zdjecia--trzy' : 'gatunek__zdjecia'
              }
            >
              {z?.lot && <Photo zdjecie={z.lot} alt={`${g.pl} w locie`} podpis="W locie" />}
              {z?.siedzacy && <Photo zdjecie={z.siedzacy} alt={`${g.pl}, ptak siedzący`} podpis="Siedzący" />}
              {z?.cecha && <Photo zdjecie={z.cecha} alt={z.cecha.alt} podpis={z.cecha.podpis} />}
            </div>
          </section>
        )}

        {podobne.length > 0 && (
          <section className="gatunek__rozdzial" aria-labelledby="podobne">
            <div className="gatunek__bok">
              <p className="eyebrow">Trudne pary</p>
              <h2 id="podobne" className="sekcja__tytul">
                Podobne gatunki
              </h2>
              <p className="sekcja__lead">
                {podobne.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && (i === podobne.length - 1 ? ' i ' : ', ')}
                    <Link href={`/gatunki/${p.id}`} className="text-link">
                      {p.pl.toLowerCase()}
                    </Link>
                  </span>
                ))}
                .
              </p>
            </div>
            <div className="gatunek__porownanie">
              {g.aktywnosc === 'dzienny' && (
                <Porownanie gatunek={stronaMorfu(g)} podobne={podobne.filter((p) => p.aktywnosc === 'dzienny').map(stronaMorfu)} />
              )}
              <CuesTable
                podpis={`Na co patrzeć: ${g.pl} i podobne gatunki`}
                cechy={nocny ? CECHY_NOCNE : CECHY_DZIENNE}
                gatunki={[kolumna(g), ...podobne.map(kolumna)]}
              />
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
          <SpeciesObservation id={g.id} nazwa={g.pl} />
        </section>

        <div className="gatunek__ciekawostka">
          <Ciekawostka {...ciekawostkiDla({ gatunek: g.id })} />
        </div>

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
          </div>
        </section>
      </div>
    </div>
  );
}
