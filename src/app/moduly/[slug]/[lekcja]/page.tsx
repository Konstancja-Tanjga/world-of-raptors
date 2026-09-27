import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ButtonLink';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/ds';
import { Ciekawostka } from '@/components/Ciekawostka';
import { LessonComplete } from '@/components/LessonComplete';
import { LessonMedia } from '@/components/LessonMedia';
import { Markdown } from '@/components/Markdown';
import { ciekawostkiDla, czytajMarkdown, gotoweModuly, przygotujLekcje, znajdzModul } from '@/lib/content';

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

export default async function LekcjaPage({ params }: PageProps<'/moduly/[slug]/[lekcja]'>) {
  const { slug, lekcja } = await params;
  const modul = znajdzModul(slug);
  const index = modul?.lekcje.findIndex((l) => l.slug === lekcja) ?? -1;
  if (!modul || index < 0) notFound();

  const biezaca = modul.lekcje[index];
  const poprzednia = modul.lekcje[index - 1];
  const nastepna = modul.lekcje[index + 1];
  const lekcjaMd = przygotujLekcje(await czytajMarkdown(`moduly/${slug}/${lekcja}.md`));

  return (
    <div className="page page--reading">
      <Breadcrumbs
        items={[
          { label: 'Start', href: '/' },
          { label: `${modul.id}\u00a0${modul.tytul}`, href: `/moduly/${slug}` },
          { label: `Lekcja ${index + 1}: ${biezaca.tytul}` },
        ]}
      />
      <Markdown source={lekcjaMd.md} baseDir={`moduly/${slug}`} />
      <LessonMedia ids={lekcjaMd.wszystkie} juzPokazane={lekcjaMd.wNaglowkach} />
      <Ciekawostka {...ciekawostkiDla({ modul: slug, lekcja })} />
      <LessonComplete modul={slug} lekcja={lekcja} ostatnia={!nastepna} />
      <nav className="lesson-nav" aria-label="Nawigacja lekcji">
        {poprzednia ? (
          <ButtonLink href={`/moduly/${slug}/${poprzednia.slug}`} variant="secondary">
            Poprzednia: {poprzednia.tytul}
          </ButtonLink>
        ) : (
          <ButtonLink href={`/moduly/${slug}`} variant="secondary">
            Wróć do opisu modułu
          </ButtonLink>
        )}
        {nastepna ? (
          <ButtonLink href={`/moduly/${slug}/${nastepna.slug}`}>
            Następna: {nastepna.tytul}
          </ButtonLink>
        ) : (
          <ButtonLink href="/checklista">Otwórz checklistę</ButtonLink>
        )}
      </nav>
    </div>
  );
}
