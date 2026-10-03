import { cookies } from 'next/headers';
import Link from 'next/link';
import './start.css';
import { Ciekawostka } from '@/components/Ciekawostka';
import { Chor } from '@/components/start/Chor';
import { Sylwetka } from '@/components/Sylwetka';
import { Kolekcja } from '@/components/start/Kolekcja';
import { Kurs } from '@/components/start/Kurs';
import { MorfGrup } from '@/components/start/MorfGrup';
import { NieboStartu } from '@/components/start/NieboStartu';
import { Okladka } from '@/components/start/Okladka';
import { StartKursu } from '@/components/start/StartKursu';
import { MarkdownInline } from '@/components/Markdown';
import { ciekawostkiDla, gatunki, gotoweModuly, grupySylwetek, LEKCJA_GRUP, zdjecia } from '@/lib/content';
import { CIASTKO_PORY, jakoPora, poraDnia, type PoraDnia } from '@/lib/niebo';
import { odmiana } from '@/lib/odmiana';

// Rendered per request: the species of the day must change at midnight, the
// sky follows the sun (or the time of day I chose, kept in a cookie), and a
// revalidated static page would show a stale one. Cheap, because the atlas
// and the Markdown it quotes (the eight groups, the module hooks) are read
// once, when content.ts is first imported.
export const dynamic = 'force-dynamic';

/** Same species all day (Polish time), a different one tomorrow. */
function gatunekDnia() {
  const dzien = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(new Date());
  const numer = Math.floor(Date.parse(dzien) / 86_400_000);
  const zeZdjeciem = gatunki.filter((g) => zdjecia[g.id]?.lot || zdjecia[g.id]?.siedzacy);
  return zeZdjeciem[numer % zeZdjeciem.length];
}

/** One true line about the hour, over the opening title. By day it is `liniaDnia()`, which follows the season. */
const LINIE: Record<Exclude<PoraDnia, 'dzien'>, string> = {
  swit: 'O świcie sowy wracają na dzienne kryjówki, a myszołowy czekają na pierwsze kominy ciepłego powietrza.',
  zmierzch: 'O zmierzchu termika słabnie, ptaki dzienne szukają noclegu, a sowy wylatują na łowy.',
  noc: 'Nocą niebo należy do sów. Częściej je słychać, niż widać.',
};

/** What the sky shows at each time of day, for screen readers. */
const OPISY: Record<PoraDnia, string> = {
  swit: 'Świt. Kilka ptaków drapieżnych krąży wysoko w kominie termicznym.',
  dzien: 'Dzień. Ptaki drapieżne krążą w kominie termicznym, wznoszą się i odlatują.',
  zmierzch: 'Zmierzch. Ostatnie ptaki drapieżne krążą wysoko na tle zachodzącego nieba.',
  noc: 'Nocne niebo z gwiazdami i księżycem. Co jakiś czas przelatuje sowa.',
};

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
  // A chosen sky: `?pora=swit|dzien|zmierzch|noc` from a link, or the one
  // kept in the cookie. Without either the sky follows the clock.
  const [{ pora: zAdresu }, ciastka] = await Promise.all([searchParams, cookies()]);
  const wybrana = jakoPora(zAdresu) ?? jakoPora(ciastka.get(CIASTKO_PORY)?.value);
  const teraz = new Date();
  const pory: Record<PoraDnia, { linia: string; opis: string }> = {
    swit: { linia: LINIE.swit, opis: OPISY.swit },
    dzien: { linia: liniaDnia(teraz), opis: OPISY.dzien },
    zmierzch: { linia: LINIE.zmierzch, opis: OPISY.zmierzch },
    noc: { linia: LINIE.noc, opis: OPISY.noc },
  };
  const g = gatunekDnia();
  const { grupy, lead } = grupySylwetek();
  const lekcji = gotoweModuly.reduce((n, m) => n + m.lekcje.length, 0);
  const dzienne = gatunki.filter((x) => x.aktywnosc === 'dzienny').length;
  const konspekt = gotoweModuly.map(({ slug, id, lekcje }) => ({ slug, id, lekcje }));

  return (
    <div className="start">
      <NieboStartu
        wybranaNaSerwerze={wybrana}
        zegar={poraDnia(teraz)}
        pory={pory}
        liczby={
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
        }
      >
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
      </NieboStartu>

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
            <Link href={`/moduly/${LEKCJA_GRUP.modul}/${LEKCJA_GRUP.lekcja}`} className="cta cta--szklo">
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
