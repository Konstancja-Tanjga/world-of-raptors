import Link from 'next/link';
import { ChecklistSummary } from '@/components/ChecklistSummary';
import { Ciekawostka } from '@/components/Ciekawostka';
import { SpeciesMedia } from '@/components/SpeciesMedia';
import { ciekawostkiDla, gatunki, moduly, sciezki, zdjecia } from '@/lib/content';

// The species of the day is picked on the server, so the page is rebuilt
// hourly instead of once at deploy time.
export const revalidate = 3600;

/** Same species all day (Polish time), a different one tomorrow. */
function gatunekDnia() {
  const dzien = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(new Date());
  const numer = Math.floor(Date.parse(dzien) / 86_400_000);
  const zeZdjeciem = gatunki.filter((g) => zdjecia[g.id]?.lot || zdjecia[g.id]?.siedzacy);
  return zeZdjeciem[numer % zeZdjeciem.length];
}

export default function Home() {
  const g = gatunekDnia();

  return (
    <div className="page">
      <section className="today" aria-labelledby="gatunek-dnia">
        <p className="today__intro">Gatunek na dziś. Jutro będzie inny.</p>
        <h1 id="gatunek-dnia" className="today__name">
          {g.pl}
        </h1>
        <p className="latin today__latin">
          {g.lat} <span className="en">(ang. {g.en})</span>
        </p>
        <SpeciesMedia id={g.id} linki={false} ileMylonych={1} />
        <p>
          <Link href={`/gatunki/${g.id}`} className="text-link">
            Karta gatunku: {g.pl}
          </Link>
        </p>
      </section>

      <div className="home-aside">
        <Ciekawostka {...ciekawostkiDla()} />
        <ChecklistSummary ids={gatunki.map((x) => x.id)} />
      </div>

      {sciezki.map((s) => (
        <section key={s.id} className="stack" aria-labelledby={`sciezka-${s.id}`}>
          <h2 id={`sciezka-${s.id}`} className="section-title">
            {s.tytul}
          </h2>
          <ol className="module-list">
            {moduly
              .filter((m) => m.sciezka === s.id)
              .map((m) => (
                <li key={m.id} className="module-list__item">
                  <span className="module-list__id">{m.id}</span>
                  {m.gotowy && m.slug ? (
                    <Link href={`/moduly/${m.slug}`} className="text-link module-list__title">
                      {m.tytul}
                    </Link>
                  ) : (
                    <span className="module-list__title">{m.tytul} (w planach)</span>
                  )}
                  {m.lekcje && <span className="muted">{m.lekcje.length} lekcji</span>}
                </li>
              ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
