# Big Hat: luki znalezione w tym projekcie

Rzeczy, których design system nie pokrywa, a których ten projekt potrzebował. Każdy wpis mówi, po co sięgnęłam, co zbudowałam lokalnie i co ta lokalna wersja robi gorzej. To notatki, nie zgłoszenie. Zgłoszenie do Big Hat to decyzja człowieka (zob. `CLAUDE.md` w repozytorium design systemu).

## Link wyglądający jak przycisk

- **Po co sięgnęłam:** `Button` dla linków w stanach pustych i błędu: „Wróć na start” i „Otwórz atlas” na stronie, której nie ma, i „Wróć na start” na stronach błędu. (Przed przeprojektowaniem także „Zacznij: lekcja 1”, poprzednia i następna lekcja oraz „Odhacz obserwacje”.)
- **Dlaczego nie `Button`:** kontrakt `spec/components/button.json` wyklucza nawigację: „Navigation to another page — that is an anchor, and a button breaks middle-click, cmd-click, copy-link-address and the browser's history model”.
- **Co zbudowałam lokalnie:** `src/components/ButtonLink.tsx`, czyli `next/link` z klasami `bh-button bh-button--{variant} bh-button--{size} bh-focusable`, oraz `.button-link` w `globals.css`. Ta klasa wyłącza podkreślenie i pozwala dłuższej etykiecie zawinąć się na telefonie.
- **Co robi gorzej:**
  - Opiera się na wewnętrznych nazwach klas (`bh-button*`), które nie są wersjonowanym API. Zmiana w CSS design systemu może zepsuć wygląd bez żadnego błędu typów.
  - Nadpisuje `white-space: nowrap` i stałą wysokość przycisku.
  - Nie dziedziczy przyszłych zmian z komponentu `Button` (np. `iconStart`).
- **Dowód na drugie wystąpienie:** jest, w tym samym projekcie. Przy przeprojektowaniu doszły kolejne linki wyglądające jak przyciski: duże „pigułki” w scenach (`.cta` w `globals.css`: „Zacznij kurs”, „Otwórz atlas”), „Kontynuuj” w nawigacji (`.nav__dalej`) i karta następnej lekcji (`.dalej`). Wszystkie to `next/link` ze stylami produktu, bo `ButtonLink` ma tylko rozmiary i warianty `Button`. To argument za komponentem linku-przycisku w Big Hat (z rozmiarem „hero” i wariantem na ciemne tło).

## Etykiety wersalikami wbudowane w komponenty

- **Co zauważyłam:** przy przeglądzie „nie wyglądać jak wygenerowane” okazało się, że Big Hat sam zamienia na wersaliki etykiety w `DescriptionList` (`.bh-dl__term`), `Divider`, `NavGroup` (`.bh-navgroup__label`) i nagłówkach `Table` (`.bh-table thead th`). Wersaliki z rozstrzelonymi literami nad treścią to jeden z najczęstszych sygnałów szablonowego wyglądu.
- **Czego nie zrobiłam:** nie nadpisałam tego w `globals.css`. Klasy `bh-*` należą do design systemu, a nadpisanie ich w produkcie tworzy drugą, niczyją warstwę stylów.
- **Co widać w kursie:** nagłówki kolumn w porównaniu cech („CECHA”, nazwy gatunków) i etykiety `DescriptionList` na planszach gatunków w lekcjach.
- **Pytanie do design systemu:** czy wersaliki mają być domyślne, czy powinna o nich decydować aplikacja (np. przez prop albo token `text-transform`)?

## Table: szerokość kolumn i nagłówki wierszy

- **`width` w `Column`:** typ opisuje go jako „Any CSS grid track value — `1fr`, `160px`, `minmax(120px, 1fr)`”, ale `Table` renderuje prawdziwy `<table>` i przekazuje tę wartość jako `style.width` na `<th>`. Wartości `fr` i `minmax()` są tam niepoprawne i przeglądarka je pomija. W porównaniu cech (`src/components/CuesTable.tsx`) zrezygnowałam z `width`. Kontrakt i implementacja się nie zgadzają: to błąd do zgłoszenia, a nie do obchodzenia.
- **Nagłówki wierszy:** `Table` renderuje każdą komórkę treści jako `<td>` i nie da się oznaczyć pierwszej kolumny jako `<th scope="row">`. W tabeli porównawczej czytnik ekranu czyta wtedy wartość z nazwą gatunku (nagłówkiem kolumny), ale bez nazwy cechy (nagłówka wiersza), co osłabia relację wymaganą przez WCAG 1.3.1. Nie da się tego obejść bez furtki `className`, więc zostawiam to jako lukę.

## Brak rozmiaru tekstu dla nagłówka „hero”

- **Po co sięgnęłam:** tytuły, które otwierają stronę („Naucz się czytać niebo”, otwarcie modułu, nazwa na karcie gatunku), muszą być najmocniejszym tekstem na stronie, mocniejszym niż nagłówki sekcji.
- **Co jest w skali:** w Big Hat największy rozmiar to `--bh-text-size-display` (20 px), tylko 4 px więcej niż `heading` (16 px); ten produkt podnosi go w `motyw.css` do 22 px. Przy zdjęciu na całą szerokość ekranu i to za mało.
- **Co zbudowałam lokalnie (przy przeprojektowaniu):** skalę tytułów w warstwie `--wor-*` (zob. niżej): `--wor-size-hero`, `-display`, `-title`, `-subtitle`, płynną między telefonem a desktopem (`clamp()`). Wartości są w jednym miejscu, `motyw.css`, a strony używają ich po nazwie.
- **Co robi gorzej:** to druga skala obok skali Big Hat. Komponent Big Hat nie zna tych rozmiarów, więc tytuł w karcie Big Hat nadal ma najwyżej 22 px.
- **Pytanie do design systemu:** czy skala powinna mieć stopnie dla pojedynczego nagłówka strony (np. `text-size-hero`), skoro jest już `padding-hero`?

## RadioGroup: pytanie tylko jako tekst

- **Po co sięgnęłam:** quiz krok po kroku (`src/components/QuizKrokowy.tsx`) wstawia pytanie jako `legend` w `RadioGroup`. Część pytań ma łacińską nazwę gatunku, np. „Łacińska nazwa pójdźki *Athene noctua*…”, a kurs zawsze pisze ją kursywą.
- **Co jest w API:** `legend: string`, a `label` opcji przyjmuje `ReactNode`. Pytania nie da się więc sformatować.
- **Co zrobiłam:** usuwam znaczniki kursywy i pogrubienia z tekstu quizu, więc nazwa łacińska jest bez kursywy. Nie zbudowałam własnego `<fieldset>`, bo straciłabym to, co daje komponent: wspólny `name`, strzałki i powiązanie błędu z grupą.
- **Pytanie do design systemu:** czy `legend` może przyjmować `ReactNode` z samym formatowaniem tekstu (kursywa, pogrubienie), skoro `label` opcji już to umie?

## Motyw produktu: kolory i rozmiar tekstu

- **Po co sięgnęłam:** kurs ma własny charakter: w trybie jasnym ciepły „papier terenowy” z rdzawym akcentem (kania ruda), w ciemnym „zmierzch” ze złotym (oko drapieżnika). Big Hat ma jeden jasny i jeden ciemny motyw, oba chłodne, z miętowym przyciskiem.
- **Co zbudowałam lokalnie:** `src/app/motyw.css` nadaje semantycznym tokenom `--bh-*` wartości tego produktu, tymi samymi selektorami, którymi Big Hat ustawia swój motyw (`:root`, `:root[data-theme='dark']`, `prefers-color-scheme`). Żadna klasa `bh-*` nie jest nadpisana, więc każdy komponent idzie za rolą. Kontrast każdej pary tekstu i tła zmierzyłam w przeglądarce (WCAG AA: tekst co najmniej 4,5:1, obramowania 3:1): pary tokenów policzyłam wprost, a tekst w scenach jednorazowym skryptem: robi zrzut strony z ukrytym tekstem w trybie jasnym i ciemnym, przy 1440 i 390 px, i porównuje kolor tekstu z najmniej korzystnym fragmentem tła pod nim (w blokach 12 px), także na zdjęciach i niebie. Rozmiary tekstu są o stopień większe (tekst 15 px zamiast 13 px), bo to kurs do czytania, a nie gęsta aplikacja.
- **Co robi gorzej:**
  - Kontrastu pilnuje jednorazowy skrypt, którego nie ma w repozytorium, a nie CI design systemu. Zmiana koloru albo cienia w `motyw.css` wymaga ponownego pomiaru.
  - Komponenty projektowane przy 13 px mają przy 15 px tę samą wysokość, więc są ciaśniejsze.
  - Ciemny motyw jest wpisany dwa razy (dla `data-theme` i dla `prefers-color-scheme`), jak w Big Hat.
- **Pytanie do design systemu:** czy Big Hat powinien mieć motyw marki (np. `data-brand`) z testem kontrastu dla wartości produktu, zamiast zostawiać to każdej aplikacji?

## Warstwa ekspresyjna `--wor-*`

- **Po co sięgnęłam:** po tytuły większe niż 22 px, kroje redakcyjne, ruch dłuższy niż 320 ms (opowiadanie, nie informacja zwrotna), niebo o różnych porach dnia i ciemne „sceny”, które niosą historię w obu motywach.
- **Co zbudowałam lokalnie:** tokeny `--wor-*` w `motyw.css`: kroje (`--wor-font-display`: Półtawski Nowy, `--wor-font-text`: Newsreader), skalę tytułów i interlinii, rytm sekcji, krzywe i czasy ruchu (krótki „produktywny” i długi „ekspresyjny”), mnożnik ruchu `--wor-ruch`, kolory scen i gradienty nieba. Mnożnik jest 0 przy `prefers-reduced-motion`: drobne ruchy (uniesienie po najechaniu, menu, odsłonięcie odpowiedzi) tracą wtedy przesunięcie i tylko się przenikają, a wejścia, efekty przewijania i przejścia stron są wyłączone. Strony używają tych nazw zamiast wartości; wyjątki (obramowania 1px, obrysy fokusu, choreografia pojedynczej sceny) wymienia `TECH.md`.
- **Co robi gorzej:** to warstwa poza Big Hat: bez kontraktów, bez testu dryfu. Jej zasady opisuje komentarz na górze `motyw.css`.
- **Pytanie do design systemu:** czy skala ruchu powinna mieć rejestr „ekspresyjny” (400–1200 ms) obok obecnego, krótkiego?

## AppShell zastąpiony ramą strony

- **Po co sięgnęłam:** przy przeprojektowaniu kurs stał się publikacją: start z pełnoekranową sceną, czytanie lekcji bez bocznego panelu. Kontrakt `spec/components/app-shell.json` mówi w `notFor`: „Documentation and marketing pages — use height="flow" or no shell at all”. Nawet z `height="flow"` nagłówek powłoki jest systemowy i nie przyjmuje klas, a ten musi ciemnieć nad sceną, wpuszczać ją pod siebie i odjeżdżać na stronach modułów.
- **Co zbudowałam lokalnie:** `src/components/AppFrame.tsx`: `SkipLink` z Big Hat, `<header>` z nawigacją (półprzezroczysty pasek; nad ciemną sceną ciemne szkło i jasny tekst), pasek modułu na stronach modułów i lekcji (lekcje z ich stanem, które wcześniej pokazywał boczny panel), `<main id="main-content">` jako cel skip linka i `<footer>`.
- **Co robi gorzej:**
  - Punkty orientacyjne (landmarks) są pisane ręcznie, a nie wymuszone komponentem.
  - Strony reagują na szerokość okna (`@media`), a nie na szerokość powłoki (container queries, które daje `AppShell`).
  - Menu na telefonie jest lokalne: przycisk z `aria-expanded`, Escape zamyka, fokus wraca na przycisk. Pasek ma rozmycie tła (`backdrop-filter`), a ono robi z niego blok zawierający dla elementów `position: fixed`, więc przy otwartym menu pasek traci rozmycie, inaczej arkusz menu skurczyłby się do wysokości paska.
- **Dowód na drugie wystąpienie:** jeszcze go nie ma.

## Przejścia między stronami

- **Po co sięgnęłam:** przejście między stronami, które mówi, co się dzieje: strona odchodzi, następna przychodzi, a nazwa gatunku przelatuje z karty w atlasie do tytułu jego strony.
- **Co zbudowałam lokalnie:** React `ViewTransition` w `AppFrame` (kluczem jest adres strony) i nazwy `nazwa-<id>` na kartach i tytułach, a animacje w `globals.css`. Big Hat nie ma ani komponentu, ani tokenów dla przejść między stronami.
- **Co robi gorzej:** półprzezroczyste paski (materiał `chrome` z Big Hat) nie mają w zrzucie przejścia czego rozmywać, więc zrzut paska, który się pojawia, dostaje pełne tło (zrzut paska, który znika, nie jest rysowany, żeby nie zostawiał pustego pasa). Ten wyjątek trzeba pamiętać przy każdym nowym pasku.
- **Pytanie do design systemu:** czy materiały (`--bh-material-*`) powinny mieć wariant dla przejść, skoro rozmycie tła nie przenosi się na zrzut?
