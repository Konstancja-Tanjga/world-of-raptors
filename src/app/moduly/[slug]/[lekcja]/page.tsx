import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/ds';
import { Markdown } from '@/components/Markdown';
import { czytajMarkdown, gotoweModuly, znajdzModul } from '@/lib/content';

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
  const source = await czytajMarkdown(`moduly/${slug}/${lekcja}.md`);

  return (
    <div className="page page--reading">
      <Breadcrumbs
        items={[
          { label: 'Start', href: '/' },
          { label: `${modul.id} · ${modul.tytul}`, href: `/moduly/${slug}` },
          { label: `Lekcja ${index + 1}: ${biezaca.tytul}` },
        ]}
      />
      <Markdown source={source} baseDir={`moduly/${slug}`} />
      <nav className="lesson-nav" aria-label="Nawigacja lekcji">
        {poprzednia ? (
          <Link href={`/moduly/${slug}/${poprzednia.slug}`} className="text-link">
            ← Lekcja {index}: {poprzednia.tytul}
          </Link>
        ) : (
          <Link href={`/moduly/${slug}`} className="text-link">
            ← O module
          </Link>
        )}
        {nastepna ? (
          <Link href={`/moduly/${slug}/${nastepna.slug}`} className="text-link">
            Lekcja {index + 2}: {nastepna.tytul} →
          </Link>
        ) : (
          <Link href="/checklista" className="text-link">
            Odhacz obserwacje w checkliście →
          </Link>
        )}
      </nav>
    </div>
  );
}
