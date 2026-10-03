import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Article } from '@/components/ds';
import { Ciekawostka } from '@/components/Ciekawostka';
import { LessonComplete } from '@/components/LessonComplete';
import { LessonMedia } from '@/components/LessonMedia';
import { Markdown, MarkdownInline } from '@/components/Markdown';
import { QuizKrokowy } from '@/components/QuizKrokowy';
import {
  ciekawostkiDla,
  czytajMarkdown,
  gotoweModuly,
  przygotujStroneLekcji,
  znajdzModul,
} from '@/lib/content';

export const dynamicParams = false;

export function generateStaticParams() {
  return gotoweModuly.flatMap((m) => m.lekcje.map((l) => ({ slug: m.slug, lekcja: l.slug })));
}

export async function generateMetadata({
  params,
}: PageProps<'/moduly/[slug]/[lekcja]'>): Promise<Metadata> {
  const { slug, lekcja } = await params;
  return { title: znajdzModul(slug)?.lekcje.find((l) => l.slug === lekcja)?.tytul };
}

/** "około 12 minut": after "około" Polish takes the genitive, "minuty" only for one. */
const czasCzytania = (minuty: number) => (minuty === 1 ? 'około minuty' : `około ${minuty} minut`);

export default async function LekcjaPage({ params }: PageProps<'/moduly/[slug]/[lekcja]'>) {
  const { slug, lekcja } = await params;
  const modul = znajdzModul(slug);
  const index = modul?.lekcje.findIndex((l) => l.slug === lekcja) ?? -1;
  if (!modul || index < 0) notFound();

  const biezaca = modul.lekcje[index];
  const nastepna = modul.lekcje[index + 1];
  const nastepnyModul = gotoweModuly[gotoweModuly.indexOf(modul) + 1];
  const plik = `moduly/${slug}/${lekcja}.md`;
  const strona = przygotujStroneLekcji(await czytajMarkdown(plik), plik);
  const baseDir = `moduly/${slug}`;
  const media = strona.wszystkie.length > 0;

  const dalej = nastepna
    ? {
        etykieta: 'Następna lekcja',
        tytul: nastepna.tytul,
        href: `/moduly/${slug}/${nastepna.slug}`,
        akcja: `Zacznij lekcję ${index + 2}`,
      }
    : nastepnyModul
      ? {
          etykieta: 'Następny moduł',
          tytul: `${nastepnyModul.id} ${nastepnyModul.tytul}`,
          href: `/moduly/${nastepnyModul.slug}`,
          akcja: `Zacznij moduł ${nastepnyModul.id}`,
        }
      : { etykieta: 'Koniec kursu', tytul: 'Moja checklista', href: '/checklista', akcja: 'Otwórz checklistę' };

  return (
    <div className="page page--article lekcja">
      <Article
        eyebrow={
          <span className="lekcja__eyebrow">
            <Link href={`/moduly/${slug}`} className="lekcja__modul">
              {modul.id}&nbsp;{modul.tytul}
            </Link>
            <span>
              Lekcja {index + 1} z {modul.lekcje.length}
            </span>
          </span>
        }
        title={<span className="lekcja__tytul">{biezaca.tytul}</span>}
        meta={
          <span className="lekcja__meta">
            Czytanie: {czasCzytania(strona.minuty)}
            {strona.quiz && <>. Quiz na końcu, próg {strona.quiz.prog}%</>}
          </span>
        }
        lead={strona.lead ? <span className="lekcja__lead"><MarkdownInline source={strona.lead} baseDir={baseDir} /></span> : undefined}
        toc={[...strona.toc, ...(media ? [{ id: 'media', label: 'Zobacz, posłuchaj, poczytaj' }] : [])]}
        tocLabel="W tej lekcji"
        footer={
          <>
            <LessonComplete modul={slug} lekcja={lekcja} quiz={strona.quiz !== null} />
            <Link href={dalej.href} className="dalej">
              <span className="dalej__etykieta">{dalej.etykieta}</span>
              <span className="dalej__tytul">{dalej.tytul}</span>
              <span className="dalej__akcja">{dalej.akcja}</span>
            </Link>
          </>
        }
      >
        <Markdown
          source={strona.md}
          baseDir={baseDir}
          quiz={strona.quiz && <QuizKrokowy quiz={strona.quiz} modul={slug} lekcja={lekcja} />}
        />
        <LessonMedia ids={strona.wszystkie} juzPokazane={strona.wNaglowkach} />
        <Ciekawostka {...ciekawostkiDla({ modul: slug, lekcja })} />
      </Article>
    </div>
  );
}
