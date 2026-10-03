import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import './modul.css';
import { Ciekawostka } from '@/components/Ciekawostka';
import { Markdown, MarkdownInline } from '@/components/Markdown';
import { StartModulu } from '@/components/modul/StartModulu';
import { SylabusModulu } from '@/components/modul/SylabusModulu';
import {
  ciekawostkiDla,
  czytajMarkdown,
  gotoweModuly,
  otwarcieModulu,
  przygotujOpisModulu,
  sciezki,
  sylabusModulu,
  znajdzModul,
} from '@/lib/content';
import { odmiana } from '@/lib/odmiana';
import { polozenie, srcSetCommons } from '@/lib/zdjecia';

export const dynamicParams = false;

export function generateStaticParams() {
  return gotoweModuly.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: PageProps<'/moduly/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  return { title: znajdzModul(slug)?.tytul };
}

export default async function ModulPage({ params }: PageProps<'/moduly/[slug]'>) {
  const { slug } = await params;
  const modul = znajdzModul(slug);
  if (!modul) notFound();

  const baseDir = `moduly/${slug}`;
  const { zajawka, md } = przygotujOpisModulu(await czytajMarkdown(`${baseDir}/README.md`));
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
            {otwarcie.gatunek.pl}, {otwarcie.wLocie ? 'w locie' : 'ptak siedzący'}. Fot. {z.autor},{' '}
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
            lekcje={lekcje.map(({ slug: lekcja, tytul, minuty, progQuizu, lead }) => ({
              slug: lekcja,
              tytul,
              minuty,
              progQuizu,
              lead: lead ? <MarkdownInline source={lead} baseDir={baseDir} bezLinkow /> : null,
            }))}
          />
        </section>
        <div className="modul-strona__opis">
          <Markdown source={md} baseDir={baseDir} />
        </div>
        <div className="modul-strona__ciekawostka">
          <Ciekawostka {...ciekawostkiDla({ modul: slug })} />
        </div>
      </div>
    </div>
  );
}
