import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/ds';
import { Markdown } from '@/components/Markdown';
import { czytajMarkdown, gotoweModuly, znajdzModul } from '@/lib/content';

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

  const source = await czytajMarkdown(`moduly/${slug}/README.md`);
  const pierwsza = modul.lekcje[0];

  return (
    <div className="page page--reading">
      <Breadcrumbs items={[{ label: 'Start', href: '/' }, { label: `${modul.id} · ${modul.tytul}` }]} />
      <Markdown source={source} baseDir={`moduly/${slug}`} />
      {pierwsza && (
        <nav className="lesson-nav" aria-label="Nawigacja modułu">
          <span />
          <Link href={`/moduly/${slug}/${pierwsza.slug}`} className="text-link">
            Zacznij: lekcja 1, {pierwsza.tytul} →
          </Link>
        </nav>
      )}
    </div>
  );
}
