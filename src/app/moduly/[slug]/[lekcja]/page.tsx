import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ButtonLink';
import { notFound } from 'next/navigation';
import { Article, Breadcrumbs, Card } from '@/components/ds';
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
    <div className="page page--article">
      <Article
        eyebrow={
          <Breadcrumbs
            items={[
              { label: 'Start', href: '/' },
              { label: `${modul.id} ${modul.tytul}`, href: `/moduly/${slug}` },
              { label: `Lekcja ${index + 1}` },
            ]}
          />
        }
        title={biezaca.tytul}
        meta={`Lekcja ${index + 1} z ${modul.lekcje.length}, ${czasCzytania(strona.minuty)}`}
        lead={strona.lead ? <MarkdownInline source={strona.lead} baseDir={baseDir} /> : undefined}
        toc={[...strona.toc, ...(media ? [{ id: 'media', label: 'Zobacz, posłuchaj, poczytaj' }] : [])]}
        tocLabel="W tej lekcji"
        footer={
          <>
            <LessonComplete modul={slug} lekcja={lekcja} quiz={strona.quiz !== null} />
            <Card padding="snug" actions={<ButtonLink href={dalej.href} size="sm">{dalej.akcja}</ButtonLink>}>
              <p className="next__label">{dalej.etykieta}</p>
              <p className="next__title">{dalej.tytul}</p>
            </Card>
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
