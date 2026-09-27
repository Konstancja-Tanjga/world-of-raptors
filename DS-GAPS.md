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
