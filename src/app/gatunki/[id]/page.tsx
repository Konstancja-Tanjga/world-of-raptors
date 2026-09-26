import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Breadcrumbs, DescriptionList } from '@/components/ds';
import { SpeciesObservation } from '@/components/SpeciesObservation';
import { gatunki, modulyGatunku, znajdzGatunek } from '@/lib/content';
import { REGIONY, STATUS_LABEL } from '@/lib/types';

export const dynamicParams = false;

export function generateStaticParams() {
  return gatunki.map((g) => ({ id: g.id }));
}

export async function generateMetadata({ params }: PageProps<'/gatunki/[id]'>): Promise<Metadata> {
  const { id } = await params;
  return { title: znajdzGatunek(id)?.pl };
}

export default async function GatunekPage({ params }: PageProps<'/gatunki/[id]'>) {
  const { id } = await params;
  const g = znajdzGatunek(id);
  if (!g) notFound();

  const mylone = g.mylona_z.map(znajdzGatunek).filter((x) => x !== undefined);
  const moduly = modulyGatunku(g);

  return (
    <div className="page page--reading">
      <Breadcrumbs items={[{ label: 'Atlas gatunków', href: '/gatunki' }, { label: g.pl }]} />
      <div className="stack">
        <h1 className="page-title">{g.pl}</h1>
        <p className="latin">{g.lat}</p>
        <div className="chips">
          <Badge>{g.grupa}</Badge>
          <Badge>{g.aktywnosc === 'nocny' ? 'nocny' : 'dzienny'}</Badge>
          {g.status.map((s) => (
            <Badge key={s} tone={s === 'rzadki' ? 'warning' : 'neutral'}>
              {STATUS_LABEL[s]}
            </Badge>
          ))}
        </div>
      </div>

      <SpeciesObservation id={g.id} nazwa={g.pl} />

      <section className="stack" aria-labelledby="klucz">
        <h2 id="klucz" className="section-title">
          Klucz do rozpoznania
        </h2>
        <ul className="prose">
          {g.cechy.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      <DescriptionList
        ariaLabel="Informacje o gatunku"
        items={[
          { term: 'Rozpiętość skrzydeł', value: `ok. ${g.rozpietosc_cm[0]}–${g.rozpietosc_cm[1]} cm` },
          { term: 'Sezon', value: g.sezon },
          { term: 'Gdzie', value: g.gdzie },
          {
            term: 'Regiony',
            value: REGIONY.filter((r) => g.regiony.includes(r.value))
              .map((r) => r.label)
              .join(', '),
          },
          { term: 'Nazwa angielska', value: g.en },
          { term: 'Nazwa hiszpańska', value: g.es },
        ]}
      />

      {mylone.length > 0 && (
        <section className="stack" aria-labelledby="mylony">
          <h2 id="mylony" className="section-title">
            Łatwo pomylić z
          </h2>
          <ul className="prose">
            {mylone.map((m) => (
              <li key={m.id}>
                <Link href={`/gatunki/${m.id}`} className="text-link">
                  {m.pl}
                </Link>{' '}
                <span className="latin">({m.lat})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {moduly.length > 0 && (
        <section className="stack" aria-labelledby="moduly">
          <h2 id="moduly" className="section-title">
            Więcej w modułach
          </h2>
          <ul className="prose">
            {moduly.map((m) => (
              <li key={m.slug}>
                <Link href={`/moduly/${m.slug}`} className="text-link">
                  {m.id} · {m.tytul}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
