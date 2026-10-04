import type { Metadata } from 'next';
import Link from 'next/link';
import './o-projekcie.css';
import { MarkdownInline } from '@/components/Markdown';
import { Anatomia } from '@/components/oprojekcie/Anatomia';
import { SuwakMorfu } from '@/components/SuwakMorfu';
import { Sylwetka } from '@/components/Sylwetka';
import { autorzyZdjec, ideaKursu, statystykiKursu, stronaMorfu, taliaFiszek, znajdzGatunek } from '@/lib/content';
import type { PoraDnia } from '@/lib/niebo';
import { odmiana } from '@/lib/odmiana';

export const metadata: Metadata = {
  title: 'O projekcie',
  description: 'Jak powstał World of Raptors: pomysł i treść Konstancji Tanjgi, projekt, ruch i kod razem z Claude.',
};

/** A diurnal atlas species for the morph slider; the build would fail if the id stopped being one. */
function strona(id: string) {
  const g = znajdzGatunek(id);
  if (!g || g.aktywnosc !== 'dzienny') throw new Error(`o-projekcie: „${id}” nie jest gatunkiem dziennym z atlasu`);
  return stronaMorfu(g);
}

const PORY: readonly { pora: PoraDnia; nazwa: string; opis: string }[] = [
  { pora: 'swit', nazwa: 'Świt', opis: 'Kilka ptaków krąży w pierwszym kominie termicznym.' },
  { pora: 'dzien', nazwa: 'Dzień', opis: 'Kocioł ptaków krąży w kominie ciepłego powietrza.' },
  { pora: 'zmierzch', nazwa: 'Zmierzch', opis: 'Ostatnie ptaki dzienne krążą na tle zachodu.' },
  { pora: 'noc', nazwa: 'Noc', opis: 'Gwiazdy, księżyc i od czasu do czasu sowa.' },
];

const PALETY = [
  {
    nazwa: 'Papier terenowy',
    opis: 'Tryb jasny: ciepły papier atlasu terenowego.',
    kolory: [
      { nazwa: 'Papier', hex: '#f8f3e9' },
      { nazwa: 'Atrament', hex: '#261d17' },
      { nazwa: 'Rdza kani rudej', hex: '#a54a24' },
      { nazwa: 'Błękit fokusu', hex: '#2b5d86' },
    ],
  },
  {
    nazwa: 'Zmierzch',
    opis: 'Tryb ciemny: niebo po zachodzie słońca. Te same kolory mają sceny w obu trybach, niezależnie od nieba w tle.',
    kolory: [
      { nazwa: 'Noc', hex: '#0a1018' },
      { nazwa: 'Kość', hex: '#f2eee6' },
      { nazwa: 'Złoto oka', hex: '#f5b75b' },
      { nazwa: 'Róż zmierzchu', hex: '#a85556' },
    ],
  },
];

const ZASADY = [
  {
    tytul: 'Ruch tłumaczy',
    tekst:
      'Sylwetka zmienia się w inną, więc widać dokładnie to, co różni dwie grupy. Na fiszce ptak lata tak, jak lata jego gatunek: pustułka zawisa, krogulec macha i szybuje.',
  },
  {
    tytul: 'Dwa rejestry',
    tekst: 'Krótki ruch, do ćwierć sekundy, odpowiada na kliknięcie. Długi, do sekundy i dłużej, opowiada: niebo, lornetka, morf.',
  },
  {
    tytul: 'Treść nie czeka na ruch',
    tekst:
      'Nic nie czeka na przewinięcie ani kliknięcie. Wejście strony trwa około sekundy, a efekty związane z przewijaniem działają tylko tam, gdzie przeglądarka je obsługuje; gdzie indziej strona po prostu stoi.',
  },
  {
    tytul: 'Mniej ruchu to nie brak ruchu',
    tekst:
      'Przy ograniczonym ruchu w systemie drobne ruchy tylko się przenikają, a wejścia, przejścia między stronami i sceny stoją. Każdy ruch, który się powtarza (niebo, pokaz sylwetek, lot ptaka), ma przycisk pauzy.',
  },
];

export default async function OProjekcie() {
  const [liczby, fotografowie, idea] = await Promise.all([statystykiKursu(), autorzyZdjec(), ideaKursu()]);
  const fiszek = taliaFiszek().length;
  const tysiace = Math.round(liczby.slowa / 1000);

  const statystyki = [
    { n: liczby.gatunki, slowo: odmiana(liczby.gatunki, ['gatunek', 'gatunki', 'gatunków']) },
    { n: liczby.moduly, slowo: odmiana(liczby.moduly, ['moduł', 'moduły', 'modułów']) },
    { n: liczby.lekcje, slowo: odmiana(liczby.lekcje, ['lekcja', 'lekcje', 'lekcji']) },
    { n: `ok. ${tysiace} tys.`, slowo: 'słów w lekcjach' },
    { n: liczby.pytania, slowo: odmiana(liczby.pytania, ['pytanie w quizach', 'pytania w quizach', 'pytań w quizach']) },
    { n: liczby.zdjecia, slowo: odmiana(liczby.zdjecia, ['zdjęcie', 'zdjęcia', 'zdjęć']) },
    { n: fiszek, slowo: odmiana(fiszek, ['fiszka', 'fiszki', 'fiszek']) },
    { n: liczby.ciekawostki, slowo: odmiana(liczby.ciekawostki, ['ciekawostka', 'ciekawostki', 'ciekawostek']) },
  ];

  return (
    <div className="oprojekcie">
      <section className="czolowka scena" data-scena aria-labelledby="oprojekcie-tytul">
        <Sylwetka id="kania-ruda" klasa="czolowka__ptak" />
        <div className="czolowka__wnetrze">
          <p className="eyebrow">O projekcie</p>
          <h1 id="oprojekcie-tytul" className="czolowka__tytul">
            World of Raptors
          </h1>
          <p className="czolowka__lead">Kurs o drapieżnikach dziennych i nocnych, który uczy patrzeć w niebo i słuchać nocy.</p>
          <dl className="czolowka__autorzy">
            <div>
              <dt>Pomysł, plan kursu i treść</dt>
              <dd className="czolowka__autorka">Konstancja Tanjga</dd>
            </div>
            <div>
              <dt>Projekt, ruch i kod, razem z autorką</dt>
              <dd>
                Claude <span className="czolowka__dopisek">model AI firmy Anthropic</span>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="op-sekcja op-idea" aria-labelledby="idea">
        <div className="op-sekcja__bok">
          <p className="eyebrow">Skąd ten kurs</p>
          <h2 id="idea" className="sekcja__tytul">
            Biologia i teren w jednym miejscu
          </h2>
        </div>
        <div className="op-idea__tekst">
          {idea.split(/\n\s*\n/).map((akapit, i) => (
            <p key={i}>
              <MarkdownInline source={akapit} baseDir="" />
            </p>
          ))}
          <p>
            Strony, sceny i narzędzia powstały w rozmowie: autorka decydowała, co i po co ma być w kursie, a Claude projektował i
            pisał to razem z nią, w kolejnych wersjach, które można prześledzić w historii repozytorium.
          </p>
        </div>
      </section>

      <section className="op-liczby" aria-labelledby="liczby">
        <h2 id="liczby" className="visually-hidden">
          Kurs w liczbach
        </h2>
        <dl>
          {statystyki.map((s) => (
            <div key={s.slowo}>
              <dt>{s.slowo}</dt>
              <dd>{s.n}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="op-sekcja op-silnik" aria-labelledby="silnik">
        <div className="op-sekcja__bok">
          <p className="eyebrow">Sylwetki</p>
          <h2 id="silnik" className="sekcja__tytul">
            Ptak z dwudziestu kilku liczb
          </h2>
          <p className="sekcja__lead">
            Żadna sylwetka w kursie nie jest narysowana ręcznie ani wycięta ze zdjęcia. Każda to dwadzieścia kilka liczb: szerokość skrzydła przy
            tułowiu i w nadgarstku, liczba i głębokość „palców”, długość, wachlarz i wcięcie ogona, to, jak daleko wystaje
            głowa. Kod rysuje z nich ptaka widzianego od spodu, tak jak uczy lekcja B1. Dlatego sylwetka może machać skrzydłami,
            rozkładać ogon i zmienić się w inną.
          </p>
        </div>
        <Anatomia />
      </section>

      <section className="op-sekcja op-morf scena" data-scena aria-labelledby="morf">
        <div className="op-sekcja__bok">
          <p className="eyebrow">Trudna para</p>
          <h2 id="morf" className="sekcja__tytul">
            Myszołów czy trzmielojad?
          </h2>
          <p className="sekcja__lead">
            Przesuń suwak. Liczby jednej sylwetki przechodzą w liczby drugiej, a zmienia się tylko to, co je różni: głowa na
            dłuższej szyi, dłuższy ogon, skrzydła węższe przy tułowiu.
          </p>
        </div>
        <SuwakMorfu od={strona('myszolow')} do={strona('trzmielojad')} />
      </section>

      <section className="op-sekcja" aria-labelledby="niebo">
        <div className="op-sekcja__bok">
          <p className="eyebrow">Strona startowa</p>
          <h2 id="niebo" className="sekcja__tytul">
            Niebo o każdej porze
          </h2>
          <p className="sekcja__lead">
            Strona startowa liczy wysokość słońca nad Warszawą i maluje niebo takie, jakie jest teraz: za dnia z kotłem ptaków
            w kominie termicznym, nocą z księżycem i sową. Porę można też wybrać, tutaj albo na starcie, i zostaje, dopóki
            jej nie zmienię.
          </p>
        </div>
        <ul className="op-pory">
          {PORY.map((p) => (
            <li key={p.pora}>
              <Link href={`/?pora=${p.pora}`} className="op-pora" data-pora={p.pora}>
                <span className="op-pora__nazwa">{p.nazwa}</span>
                <span className="op-pora__opis">{p.opis}</span>
                <span className="op-pora__link">Ustaw tę porę na starcie</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="op-sekcja op-kroj" aria-labelledby="kroj">
        <div className="op-sekcja__bok">
          <p className="eyebrow">Typografia</p>
          <h2 id="kroj" className="sekcja__tytul">
            Krój dla polszczyzny
          </h2>
        </div>
        <div className="op-kroj__probki">
          <p className="op-kroj__znaki" aria-hidden="true">
            Ąą Ćć Ęę Łł Ńń Óó Śś Źź Żż
          </p>
          <dl className="op-kroj__opisy">
            <div>
              <dt>Tytuły</dt>
              <dd>
                <span className="op-kroj__nazwa op-kroj__nazwa--display">Półtawski Nowy</span> Współczesna wersja Antykwy
                Półtawskiego, kroju, który Adam Półtawski rysował z myślą o polskim tekście, z kreskami i ogonkami od początku.
                Nową wersję przygotowali Mateusz Machalski, Borys Kosmynka i Ania Wieluńska.
              </dd>
            </div>
            <div>
              <dt>Lekcje</dt>
              <dd>
                <span className="op-kroj__nazwa op-kroj__nazwa--tekst">Newsreader</span> Krój do długiego czytania na ekranie,
                od Production Type, z osobnymi wersjami dla małych i dużych rozmiarów. Kursywą pisane są nazwy łacińskie.
              </dd>
            </div>
            <div>
              <dt>Interfejs</dt>
              <dd>
                <span className="op-kroj__nazwa">Krój systemowy</span> Na Macu i iPhonie to SF Pro: przyciski, etykiety, liczby.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="op-sekcja" aria-labelledby="palety">
        <div className="op-sekcja__bok">
          <p className="eyebrow">Kolor</p>
          <h2 id="palety" className="sekcja__tytul">
            Dwie palety
          </h2>
          <p className="sekcja__lead">
            Interfejs jest wyciszony: ma jeden kolor akcentu na papierze i jeden w ciemnych scenach, a resztę koloru dają
            zdjęcia i niebo. Tekst ma
            kontrast zgodny z WCAG AA, także na niebie i na zdjęciach.
          </p>
        </div>
        <div className="op-palety">
          {PALETY.map((p) => (
            <div key={p.nazwa} className="op-paleta">
              <p className="op-paleta__nazwa">{p.nazwa}</p>
              <p className="op-paleta__opis">{p.opis}</p>
              <ul>
                {p.kolory.map((k) => (
                  <li key={k.hex}>
                    <span className="op-paleta__probka" style={{ background: k.hex }} />
                    <span>{k.nazwa}</span>
                    <code>{k.hex}</code>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="op-sekcja" aria-labelledby="ruch">
        <div className="op-sekcja__bok">
          <p className="eyebrow">Ruch</p>
          <h2 id="ruch" className="sekcja__tytul">
            Ruch, który coś znaczy
          </h2>
        </div>
        <ol className="op-zasady">
          {ZASADY.map((z) => (
            <li key={z.tytul}>
              <p className="op-zasady__tytul">{z.tytul}</p>
              <p>{z.tekst}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="op-sekcja" aria-labelledby="technika">
        <div className="op-sekcja__bok">
          <p className="eyebrow">Technika</p>
          <h2 id="technika" className="sekcja__tytul">
            Zbudowane na
          </h2>
        </div>
        <dl className="op-technika">
          <div>
            <dt>Big Hat</dt>
            <dd>Design system, który zaprojektowała Konstancja Tanjga. Kurs używa jego komponentów i ról kolorów.</dd>
          </div>
          <div>
            <dt>Next.js 16 i React 19</dt>
            <dd>Strony generowane przy budowaniu, przejścia między stronami z View Transitions.</dd>
          </div>
          <div>
            <dt>FSRS</dt>
            <dd>Algorytm powtórek, który można też włączyć w Anki; tu działa przez bibliotekę ts-fsrs.</dd>
          </div>
          <div>
            <dt>Canvas i SVG</dt>
            <dd>Niebo, kocioł ptaków, sylwetki, gwiazdozbiory i naszywki rysowane w przeglądarce, bez gotowych grafik.</dd>
          </div>
          <div>
            <dt>Markdown</dt>
            <dd>Lekcje są zwykłymi plikami tekstowymi, czytelnymi także poza aplikacją.</dd>
          </div>
          <div>
            <dt>Prywatność</dt>
            <dd>Postęp, checklista, fiszki, „Moje niebo” i własne zdjęcia zostają w przeglądarce. Nie ma kont ani serwera z danymi.</dd>
          </div>
        </dl>
      </section>

      <section className="op-sekcja op-zdjecia" aria-labelledby="zdjecia">
        <div className="op-sekcja__bok">
          <p className="eyebrow">Podziękowania</p>
          <h2 id="zdjecia" className="sekcja__tytul">
            Zdjęcia zrobili
          </h2>
          <p className="sekcja__lead">
            Zdjęcia pochodzą z Wikimedia Commons i są na wolnych licencjach, a przy każdym jest autor i licencja. Wyjątkiem jest
            pójdźka w atlasie: to zdjęcie autorki kursu. Dziękujemy {fotografowie.length}{' '}
            {odmiana(fotografowie.length, ['osobie', 'osobom', 'osobom'])} i instytucjom, bez których ten kurs byłby tylko tekstem.
          </p>
        </div>
        <ul className="op-zdjecia__lista">
          {fotografowie.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>

      <section className="podpis scena" data-scena aria-label="Podpis">
        <Sylwetka id="kania-czarna" klasa="podpis__ptak" />
        <p className="podpis__imie">Konstancja Tanjga</p>
        <p className="podpis__z">i Claude</p>
        <p className="podpis__rok">2026</p>
      </section>
    </div>
  );
}
