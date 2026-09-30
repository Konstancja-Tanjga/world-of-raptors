# Big Hat: luki znalezione w tym projekcie

Rzeczy, których design system nie pokrywa, a których ten projekt potrzebował. Każdy wpis mówi, po co sięgnęłam, co zbudowałam lokalnie i co ta lokalna wersja robi gorzej. To notatki, nie zgłoszenie. Zgłoszenie do Big Hat to decyzja człowieka (zob. `CLAUDE.md` w repozytorium design systemu).

## Link wyglądający jak przycisk

- **Po co sięgnęłam:** `Button` dla „Zacznij: lekcja 1”, poprzedniej i następnej lekcji oraz „Odhacz obserwacje”.
- **Dlaczego nie `Button`:** kontrakt `spec/components/button.json` wyklucza nawigację: „Navigation to another page — that is an anchor, and a button breaks middle-click, cmd-click, copy-link-address and the browser's history model”.
- **Co zbudowałam lokalnie:** `src/components/ButtonLink.tsx`, czyli `next/link` z klasami `bh-button bh-button--{variant} bh-button--{size} bh-focusable`, oraz `.button-link` w `globals.css`. Ta klasa wyłącza podkreślenie i pozwala długim tytułom lekcji zawijać się na telefonie.
- **Co robi gorzej:**
  - Opiera się na wewnętrznych nazwach klas (`bh-button*`), które nie są wersjonowanym API. Zmiana w CSS design systemu może zepsuć wygląd bez żadnego błędu typów.
  - Nadpisuje `white-space: nowrap` i stałą wysokość przycisku.
  - Nie dziedziczy przyszłych zmian z komponentu `Button` (np. `iconStart`).
- **Dowód na drugie wystąpienie:** jeszcze go nie ma. To pierwszy ekran z takim wzorcem.

## Etykiety wersalikami wbudowane w komponenty

- **Co zauważyłam:** przy przeglądzie „nie wyglądać jak wygenerowane” okazało się, że Big Hat sam zamienia na wersaliki etykiety w `DescriptionList` (`.bh-dl__term`), `Divider`, `NavGroup` (`.bh-navgroup__label`) i nagłówkach `Table` (`.bh-table thead th`). Wersaliki z rozstrzelonymi literami nad treścią to jeden z najczęstszych sygnałów szablonowego wyglądu.
- **Czego nie zrobiłam:** nie nadpisałam tego w `globals.css`. Klasy `bh-*` należą do design systemu, a nadpisanie ich w produkcie tworzy drugą, niczyją warstwę stylów.
- **Co widać w kursie:** grupy w menu („ŚCIEŻKA A: BIOLOGIA”) i nagłówki kolumn w porównaniu cech („CECHA”, nazwy gatunków).
- **Pytanie do design systemu:** czy wersaliki mają być domyślne, czy powinna o nich decydować aplikacja (np. przez prop albo token `text-transform`)?

## Table: szerokość kolumn i nagłówki wierszy

- **`width` w `Column`:** typ opisuje go jako „Any CSS grid track value — `1fr`, `160px`, `minmax(120px, 1fr)`”, ale `Table` renderuje prawdziwy `<table>` i przekazuje tę wartość jako `style.width` na `<th>`. Wartości `fr` i `minmax()` są tam niepoprawne i przeglądarka je pomija. W porównaniu cech (`src/components/CuesTable.tsx`) zrezygnowałam z `width`. Kontrakt i implementacja się nie zgadzają: to błąd do zgłoszenia, a nie do obchodzenia.
- **Nagłówki wierszy:** `Table` renderuje każdą komórkę treści jako `<td>` i nie da się oznaczyć pierwszej kolumny jako `<th scope="row">`. W tabeli porównawczej czytnik ekranu czyta wtedy wartość z nazwą gatunku (nagłówkiem kolumny), ale bez nazwy cechy (nagłówka wiersza), co osłabia relację wymaganą przez WCAG 1.3.1. Nie da się tego obejść bez furtki `className`, więc zostawiam to jako lukę.

## Brak rozmiaru tekstu dla nagłówka „hero”

- **Po co sięgnęłam:** nazwa gatunku na dziś otwiera stronę startową i powinna być najmocniejszym tekstem na stronie, mocniejszym niż nagłówki sekcji.
- **Co jest w skali:** największy rozmiar to `--bh-text-size-display` (20 px), tylko 4 px więcej niż `heading` (16 px). Na stronie ze zdjęciem 800 px szerokości nazwa gatunku przegrywa ze zdjęciem i z jego podpisem.
- **Czego nie zrobiłam:** nie użyłam `calc(var(--bh-text-size-display) * 2)` ani wartości wpisanej na sztywno. Reguła 2 wyklucza rozmiary spoza skali, a mnożnik byłby rozmiarem „na oko”.
- **Pytanie do design systemu:** czy skala powinna mieć stopień dla pojedynczego nagłówka strony (np. `text-size-hero`), skoro jest już `padding-hero`?

## RadioGroup: pytanie tylko jako tekst

- **Po co sięgnęłam:** quiz krok po kroku (`src/components/QuizKrokowy.tsx`) wstawia pytanie jako `legend` w `RadioGroup`. Część pytań ma łacińską nazwę gatunku, np. „Łacińska nazwa pójdźki *Athene noctua*…”, a kurs zawsze pisze ją kursywą.
- **Co jest w API:** `legend: string`, a `label` opcji przyjmuje `ReactNode`. Pytania nie da się więc sformatować.
- **Co zrobiłam:** usuwam znaczniki kursywy i pogrubienia z tekstu quizu, więc nazwa łacińska jest bez kursywy. Nie zbudowałam własnego `<fieldset>`, bo straciłabym to, co daje komponent: wspólny `name`, strzałki i powiązanie błędu z grupą.
- **Pytanie do design systemu:** czy `legend` może przyjmować `ReactNode` z samym formatowaniem tekstu (kursywa, pogrubienie), skoro `label` opcji już to umie?
