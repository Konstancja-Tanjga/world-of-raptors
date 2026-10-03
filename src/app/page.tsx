import Link from 'next/link';
import './start.css';
import { Ciekawostka } from '@/components/Ciekawostka';
import { Chor } from '@/components/start/Chor';
import { Sylwetka } from '@/components/Sylwetka';
import { Kolekcja } from '@/components/start/Kolekcja';
import { Kurs } from '@/components/start/Kurs';
import { MorfGrup } from '@/components/start/MorfGrup';
import { Niebo } from '@/components/start/Niebo';
import { Okladka } from '@/components/start/Okladka';
import { StartKursu } from '@/components/start/StartKursu';
import { MarkdownInline } from '@/components/Markdown';
import { ciekawostkiDla, gatunki, gotoweModuly, grupySylwetek, zdjecia } from '@/lib/content';
import { poraDnia, type PoraDnia } from '@/lib/niebo';
import { odmiana } from '@/lib/odmiana';

// Rendered per request: the species of the day must change at midnight and
// the sky follows the sun, and a revalidated static page would show a stale
// one. Cheap, because everything comes from local JSON.
export const dynamic = 'force-dynamic';

/** Same species all day (Polish time), a different one tomorrow. */
function gatunekDnia() {
  const dzien = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(new Date());
  const numer = Math.floor(Date.parse(dzien) / 86_400_000);
  const zeZdjeciem = gatunki.filter((g) => zdjecia[g.id]?.lot || zdjecia[g.id]?.siedzacy);
  return zeZdjeciem[numer % zeZdjeciem.length];
}

/** One true line about this hour of the day, over the opening title. */
const PORY: Record<PoraDnia, { linia: string; opis: string }> = {
  swit: {
    linia: 'O świcie sowy wracają na dzienne kryjówki, a myszołowy czekają na pierwsze kominy ciepłego powietrza.',
    opis: 'Świt. Kilka ptaków drapieżnych krąży wysoko w kominie termicznym.',
  },
  dzien: {
    linia: 'Za dnia ptaki szybujące krążą w kominach ciepłego powietrza i wznoszą się, żeby potem szybować dalej bez machania skrzydłami.',
    opis: 'Dzień. Ptaki drapieżne krążą w kominie termicznym, wznoszą się i odlatują.',
  },
  zmierzch: {
    linia: 'O zmierzchu termika słabnie, ptaki dzienne szukają noclegu, a sowy wylatują na łowy.',
    opis: 'Zmierzch. Ostatnie ptaki drapieżne krążą wysoko na tle zachodzącego nieba.',
  },
  noc: {
    linia: 'Nocą niebo należy do sów. Częściej je słychać, niż widać.',
    opis: 'Nocne niebo z gwiazdami i księżycem. Co jakiś czas przelatuje sowa.',
  },
};

const PORY_DNIA = Object.keys(PORY) as PoraDnia[];

/**
 * By day the line follows the season, because what the soaring birds are
 * doing does: leaving for Africa in autumn, coming back in spring, hunting
 * over their territories in summer, waiting out weak winter thermals.
 */
function liniaDnia(kiedy: Date) {
  const miesiac = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', month: 'numeric' }).format(kiedy));
  if (miesiac >= 8 && miesiac <= 10) {
    return 'Za dnia ptaki szybujące krążą w kominach ciepłego powietrza, wznoszą się i odlatują w stronę Afryki.';
  }
  if (miesiac >= 3 && miesiac <= 5) {
    return 'Za dnia ptaki szybujące krążą w kominach ciepłego powietrza, wznoszą się i lecą dalej na północ, na lęgowiska.';
  }
  if (miesiac === 6 || miesiac === 7) {
    return 'Latem ptaki szybujące krążą w kominach ciepłego powietrza nad swoimi rewirami i wypatrują zdobyczy.';
  }
  return 'Zimą kominy ciepłego powietrza są słabe, a wiele ptaków szybujących przeczekuje ten czas w Afryce.';
}

export default async function Home({ searchParams }: PageProps<'/'>) {
  // `?pora=dzien` (swit, zmierzch, noc) previews the sky at another time of day.
  const { pora: zadana } = await searchParams;
  const pora = PORY_DNIA.find((p) => p === zadana) ?? poraDnia(new Date());
  const g = gatunekDnia();
  const { grupy, lead } = await grupySylwetek();
  const lekcji = gotoweModuly.reduce((n, m) => n + m.lekcje.length, 0);
  const dzienne = gatunki.filter((x) => x.aktywnosc === 'dzienny').length;
  const konspekt = gotoweModuly.map(({ slug, id, lekcje }) => ({ slug, id, lekcje }));

  return (
    <div className="start">
      <section className="niebo scena" data-scena data-pora={pora} aria-labelledby="tytul-startu">
        <Niebo pora={pora} opis={PORY[pora].opis} />
        <div className="niebo__tresc">
          <p className="niebo__pora">{pora === 'dzien' ? liniaDnia(new Date()) : PORY[pora].linia}</p>
          <h1 id="tytul-startu" className="niebo__tytul">
            Naucz się czytać niebo
          </h1>
          <p className="niebo__lead">
            Kurs o drapieżnikach dziennych i nocnych, czyli ptakach drapieżnych i sowach: jak żyją, polują i wędrują, i jak
            rozpoznać je w terenie, od polskich pól po Cieśninę Gibraltarską.
          </p>
          <div className="niebo__akcje">
            <StartKursu konspekt={konspekt} />
            <Link href="/gatunki" className="cta cta--szklo">
              <span className="cta__etykieta">Otwórz atlas</span>
            </Link>
          </div>
        </div>
        <dl className="niebo__liczby">
          <div>
            <dt>{odmiana(dzienne, ['drapieżnik dzienny', 'drapieżniki dzienne', 'drapieżników dziennych'])}</dt>
            <dd>{dzienne}</dd>
          </div>
          <div>
            <dt>{odmiana(gatunki.length - dzienne, ['sowa', 'sowy', 'sów'])}</dt>
            <dd>{gatunki.length - dzienne}</dd>
          </div>
          <div>
            <dt>{odmiana(gotoweModuly.length, ['moduł', 'moduły', 'modułów'])}</dt>
            <dd>{gotoweModuly.length}</dd>
          </div>
          <div>
            <dt>{odmiana(lekcji, ['lekcja', 'lekcje', 'lekcji'])}</dt>
            <dd>{lekcji}</dd>
          </div>
        </dl>
      </section>

      <Okladka g={g} />

      <Kurs />

      <section className="grupy scena" data-scena aria-labelledby="grupy-tytul">
        <div className="grupy__wnetrze">
          <header className="sekcja">
            <p className="eyebrow">Za dnia: metoda, lekcja 1</p>
            <h2 id="grupy-tytul" className="sekcja__tytul">
              Osiem sylwetek na tle nieba
            </h2>
            <p className="sekcja__lead">
              <MarkdownInline source={lead} baseDir="moduly/metoda" />
            </p>
          </header>
          <MorfGrup grupy={grupy}>
            <Link href="/moduly/metoda/01-sylwetka" className="cta cta--szklo">
              <span className="cta__etykieta">Lekcja: Sylwetka, 8 grup</span>
            </Link>
          </MorfGrup>
        </div>
      </section>

      <Chor />

      <div className="start__ciekawostka">
        <Ciekawostka {...ciekawostkiDla()} />
      </div>

      <Kolekcja
        gatunki={gatunki.map((x) => ({
          id: x.id,
          pl: x.pl,
          sylwetka: <Sylwetka id={x.id} klasa="kolekcja__sylwetka" dokladnosc={0.45} />,
        }))}
      />
    </div>
  );
}
