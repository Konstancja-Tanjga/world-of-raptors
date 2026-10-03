import Link from 'next/link';

/** The footer: where things are, where the photos and shapes come from, and the colophon. */
export function Stopka() {
  return (
    <footer className="stopka">
      <div className="stopka__wnetrze">
        <div className="stopka__marka">
          <p className="stopka__nazwa">World of Raptors</p>
          <p className="stopka__opis">
            Prywatny kurs o ptakach drapieżnych: biologia i rozpoznawanie w terenie. Polska, południe Hiszpanii i
            Cieśnina Gibraltarska.
          </p>
        </div>
        <nav aria-label="Stopka" className="stopka__kolumna">
          <p className="stopka__naglowek">Kurs</p>
          <ul>
            <li>
              <Link href="/plan">Plan kursu</Link>
            </li>
            <li>
              <Link href="/gatunki">Atlas gatunków</Link>
            </li>
            <li>
              <Link href="/fiszki">Fiszki</Link>
            </li>
            <li>
              <Link href="/checklista">Moja checklista</Link>
            </li>
            <li>
              <Link href="/checklista#kopia">Kopia zapasowa</Link>
            </li>
          </ul>
        </nav>
        <div className="stopka__kolumna">
          <p className="stopka__naglowek">Kolofon</p>
          <p>
            Zdjęcia: Wikimedia Commons, z autorem i licencją przy każdym zdjęciu. Sylwetki rysuje kod kursu na
            podstawie cech z lekcji B1.
          </p>
          <p>
            Tytuły: Półtawski Nowy, współczesna wersja Antykwy Półtawskiego, kroju zaprojektowanego dla polszczyzny.
            Tekst: Newsreader. Interfejs: Big Hat.
          </p>
        </div>
      </div>
    </footer>
  );
}
