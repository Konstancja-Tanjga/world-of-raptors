import Link from 'next/link';
import { gotoweModuly, moduly, sciezki, zajawkaModulu } from '@/lib/content';
import { odmiana } from '@/lib/odmiana';
import { MarkdownInline } from '../Markdown';
import { PostepModulu } from '../PostepModulu';

const OPISY: Record<'a' | 'b', string> = {
  a: 'Jak drapieżniki widzą, polują, wychowują młode i wędrują, i co im dziś zagraża.',
  b: 'Jak rozpoznać je w locie: metoda, Polska, południe Hiszpanii, cieśnina i sowy nocą.',
};

/**
 * The course as two paths of numbered modules, each with its own hook and my
 * progress. `naglowek={false}` leaves out the section heading, for a page
 * whose own title already says what this is.
 */
export async function Kurs({ naglowek = true }: { naglowek?: boolean }) {
  const zajawki = new Map(await Promise.all(gotoweModuly.map(async (m) => [m.slug, await zajawkaModulu(m.slug)] as const)));
  const ileModulow = gotoweModuly.length;

  return (
    <section
      className="kurs"
      aria-labelledby={naglowek ? 'kurs-tytul' : undefined}
      aria-label={naglowek ? undefined : 'Moduły kursu'}
    >
      {naglowek && (
        <header className="sekcja">
          <p className="eyebrow">Kurs</p>
          <h2 id="kurs-tytul" className="sekcja__tytul">
            Dwie ścieżki, {ileModulow} {odmiana(ileModulow, ['moduł', 'moduły', 'modułów'])}
          </h2>
          <p className="sekcja__lead">
            Biologia tłumaczy, dlaczego drapieżnik wygląda i lata tak, a nie inaczej. Rozpoznawanie uczy, jak wykorzystać to
            w terenie. Można iść po kolei albo zacząć od jednej ze ścieżek.
          </p>
        </header>
      )}
      {sciezki.map((s) => (
        <div key={s.id} className="sciezka">
          <div className="sciezka__naglowek">
            <h3 className="sciezka__tytul">{s.tytul}</h3>
            <p className="sciezka__opis">{OPISY[s.id]}</p>
          </div>
          <ol className="moduly" aria-label={s.tytul}>
            {moduly
              .filter((m) => m.sciezka === s.id)
              .map((m) => {
                const gotowy = gotoweModuly.find((g) => g.id === m.id);
                const zajawka = gotowy && zajawki.get(gotowy.slug);
                return (
                  <li key={m.id}>
                    {gotowy ? (
                      <Link href={`/moduly/${gotowy.slug}`} className="modul">
                        <span className="modul__id">{m.id}</span>
                        <span className="modul__tytul">{m.tytul}</span>
                        {zajawka && (
                          <span className="modul__zajawka">
                            <MarkdownInline source={zajawka} baseDir={`moduly/${gotowy.slug}`} bezLinkow />
                          </span>
                        )}
                        <span className="modul__stopka">
                          <span>
                            {gotowy.lekcje.length} {odmiana(gotowy.lekcje.length, ['lekcja', 'lekcje', 'lekcji'])}
                          </span>
                          <PostepModulu slug={gotowy.slug} lekcje={gotowy.lekcje.map((l) => l.slug)} />
                        </span>
                      </Link>
                    ) : (
                      <div className="modul modul--wkrotce">
                        <span className="modul__id">{m.id}</span>
                        <span className="modul__tytul">{m.tytul}</span>
                        <span className="modul__stopka">W planach</span>
                      </div>
                    )}
                  </li>
                );
              })}
          </ol>
        </div>
      ))}
    </section>
  );
}
