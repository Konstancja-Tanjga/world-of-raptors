import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import './modul.css';
import { Ciekawostka } from '@/components/Ciekawostka';
import { Accordion, AccordionItem } from '@/components/ds';
import { Markdown, MarkdownInline } from '@/components/Markdown';
import { PodgladZdjec } from '@/components/PodgladZdjec';
import { StartModulu } from '@/components/modul/StartModulu';
import { SylabusModulu } from '@/components/modul/SylabusModulu';
import { Sylwetka } from '@/components/Sylwetka';
import {
  ciekawostkiDla,
  czytajMarkdown,
  gotoweModuly,
  otwarcieModulu,
  przygotujOpisModulu,
  sciezki,
  sylabusModulu,
  zajawkaModulu,
  znajdzModul,
} from '@/lib/content';
import { idNaglowkow } from '@/lib/naglowki';
import { odmiana } from '@/lib/odmiana';
import { opis } from '@/lib/seo';
import { polozenie, srcSetCommons } from '@/lib/zdjecia';
import { NazwaPtaka } from '@/components/NazwaPtaka';

export const dynamicParams = false;

export function generateStaticParams() {
  return gotoweModuly.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: PageProps<'/moduly/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const zajawka = zajawkaModulu(slug);
  return { title: znajdzModul(slug)?.tytul, description: zajawka ? opis(zajawka) : undefined };
}

export default async function ModulPage({ params }: PageProps<'/moduly/[slug]'>) {
  const { slug } = await params;
  const modul = znajdzModul(slug);
  if (!modul) notFound();

  const baseDir = `moduly/${slug}`;
  const { zajawka, md, zwijane, czas } = przygotujOpisModulu(await czytajMarkdown(`${baseDir}/README.md`), `${baseDir}/README.md`);
  // Accordion ids go into aria-controls/aria-labelledby, which split on spaces, so the titles become slugs.
  const idySekcji = idNaglowkow(zwijane.map((s) => s.tytul));
  // What to know first and what the module aims at are read before starting, so they start open.
  const otwarte = zwijane.flatMap((s, i) => (/^(Zanim zaczniesz|Cele modułu)/.test(s.tytul) ? [`opis-${idySekcji[i]}`] : []));
  const lekcje = await sylabusModulu(slug);
  const otwarcie = otwarcieModulu(slug);
  const sciezka = sciezki.find((s) => s.id === modul.sciezka);
  const gatunkow = new Set(lekcje.flatMap((l) => l.gatunki)).size;
  const quizy = lekcje.filter((l) => l.progQuizu !== null).length;
  const z = otwarcie?.zdjecie;

  return (
    <div className="modul-strona">
      <section className="otwarcie scena" data-scena aria-labelledby="modul-tytul">
        {z && (
          // eslint-disable-next-line @next/next/no-img-element -- Commons serves its own sizes; srcset picks one
          <img
            className="otwarcie__zdjecie"
            src={z.src}
            srcSet={srcSetCommons(z)}
            sizes="100vw"
            width={z.width}
            height={z.height}
            alt=""
            fetchPriority="high"
            style={{ objectPosition: polozenie(z) }}
          />
        )}
        <div className="otwarcie__tresc">
          {sciezka && <p className="eyebrow">{sciezka.tytul}</p>}
          <h1 id="modul-tytul" className="otwarcie__tytul">
            <span className="otwarcie__id">{modul.id}</span>
            <span className="visually-hidden">: </span>
            <span className="otwarcie__nazwa">{modul.tytul}</span>
          </h1>
          {zajawka && (
            <p className="otwarcie__zajawka">
              <MarkdownInline source={zajawka} baseDir={baseDir} />
            </p>
          )}
          <dl className="otwarcie__fakty">
            <div>
              <dt>{odmiana(lekcje.length, ['lekcja', 'lekcje', 'lekcji'])}</dt>
              <dd>{lekcje.length}</dd>
            </div>
            {gatunkow > 0 && (
              <div>
                <dt>{odmiana(gatunkow, ['gatunek z atlasu', 'gatunki z atlasu', 'gatunków z atlasu'])}</dt>
                <dd>{gatunkow}</dd>
              </div>
            )}
            {czas && (
              <div>
                <dt>{czas.czego}</dt>
                <dd>{czas.ile}</dd>
              </div>
            )}
            {quizy > 0 && (
              <div>
                <dt>{odmiana(quizy, ['quiz', 'quizy', 'quizów'])}</dt>
                <dd>{quizy}</dd>
              </div>
            )}
          </dl>
          <StartModulu modul={slug} lekcje={lekcje.map(({ slug, tytul }) => ({ slug, tytul }))} />
        </div>
        {otwarcie && z && (
          <p className="otwarcie__podpis">
            <NazwaPtaka id={otwarcie.gatunek.id} pl={otwarcie.gatunek.pl} />, {otwarcie.wLocie ? 'w locie' : 'ptak siedzący'}. Fot. {z.autor},{' '}
            {z.licencjaUrl ? (
              <a href={z.licencjaUrl} target="_blank" rel="noreferrer">
                {z.licencja}
              </a>
            ) : (
              z.licencja
            )}
            {z.strona && (
              <>
                ,{' '}
                <a href={z.strona} target="_blank" rel="noreferrer">
                  Wikimedia Commons
                </a>
              </>
            )}
          </p>
        )}
      </section>

      <div className="modul-strona__tresc">
        <section className="modul-strona__lekcje" aria-labelledby="lekcje-tytul">
          <h2 id="lekcje-tytul" className="sekcja__tytul">
            Lekcje
          </h2>
          <SylabusModulu
            modul={slug}
            lekcje={lekcje.map(({ slug: lekcja, tytul, minuty, progQuizu, lead, obraz, sylwetka }) => ({
              slug: lekcja,
              tytul,
              minuty,
              progQuizu,
              lead: lead ? <MarkdownInline source={lead} baseDir={baseDir} bezLinkow /> : null,
              obraz,
              sylwetka: sylwetka ? <Sylwetka id={sylwetka} klasa="sylabus__sylwetka" dokladnosc={0.4} /> : null,
            }))}
          />
        </section>
        <div className="modul-strona__opis">
          <Markdown source={md} baseDir={baseDir} />
          {zwijane.length > 0 && (
            <div className="modul-strona__wiecej">
              <Accordion multiple headingLevel={2} defaultOpen={otwarte}>
                {zwijane.map((s, i) => (
                  <AccordionItem key={s.tytul} id={`opis-${idySekcji[i]}`} title={s.tytul}>
                    <Markdown source={s.md} baseDir={baseDir} />
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </div>
        <div className="modul-strona__ciekawostka">
          <Ciekawostka {...ciekawostkiDla({ modul: slug })} />
        </div>
      </div>
      <PodgladZdjec />
    </div>
  );
}
