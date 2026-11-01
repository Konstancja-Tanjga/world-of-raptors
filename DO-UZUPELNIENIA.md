# Do uzupełnienia: zdjęcia i nagrania

Moduły powstałe w sesjach w chmurze, w których Wikimedia Commons i xeno-canto były niedostępne. Każde zdjęcie i nagranie trzeba znaleźć, obejrzeć albo odsłuchać i sprawdzić gatunek (zasady w `CLAUDE.md`, sekcja „Content conventions”), dlatego te kroki zostały na sesję na komputerze.

Jak dodawać:

```bash
python3 scripts/commons.py search "<zapytanie>" --out /tmp/podglad --limit 8      # podgląd kandydatów
python3 scripts/commons.py tag "File:<tytuł>" --podpis "…" --alt "…"              # gotowy znacznik <zdjecie>
python3 scripts/commons.py nagranie "File:<tytuł>" --gatunek … --lat … --opis …   # wpis do content/nagrania.json
python3 scripts/sonogramy.py                                                      # sonogramy nowych nagrań
```

Zdjęcie wstaw w `<margines>` przed akapitem, do którego należy, albo w `<galeria>`. Po dodaniu: `npm run build`, obejrzeć lekcję, odhaczyć tutaj.

## A10 Ewolucja ptaków drapieżnych (`content/moduly/ewolucja/`)

- [ ] `01-dinozaury-z-piorami.md`, sekcja „Archeopteryks”: okaz berliński archeopteryksa (szukaj: `Archaeopteryx Berlin specimen`)
- [ ] `01-dinozaury-z-piorami.md`, sekcja „Pióra przed lotem”: skamieniałość albo rekonstrukcja mikroraptora (`Microraptor fossil`) i *Sinosauropteryx* z widocznym upierzeniem
- [ ] `01-dinozaury-z-piorami.md`, margines o wysiadywaniu: owiraptor na gnieździe (`Citipati nest fossil`)
- [ ] `02-po-asteroidzie.md`, sekcja „Ptaki terroru”: szkielet albo rekonstrukcja fororaka (`Phorusrhacos skeleton`, `Titanis walleri`) i żywa kariama (`Cariama cristata`) dla porównania
- [ ] `03-olbrzymy.md`, sekcja „Argentawis”: odlew szkieletu albo rekonstrukcja (`Argentavis magnificens`)
- [ ] `03-olbrzymy.md`, sekcja „Orzeł Haasta”: rekonstrukcja albo szkielet z muzeum (`Haast's eagle`, `Hieraaetus moorei`), najlepiej z moa dla skali
- [ ] `03-olbrzymy.md`, sekcja „Sowy olbrzymy”: *Ornimegalonyx* (rekonstrukcja)
- [ ] `04-ewolucja-trwa.md`: trzy odmiany barwne myszołowa obok siebie (galeria) i sokół wędrowny na budynku
- [ ] `04-ewolucja-trwa.md`, sekcja „Wyspy”: pustułka mauritiuska (`Falco punctatus`)

## Moduły czekające na zdjęcia i nagrania

Te moduły nie powstały, bo bez zdjęć i nagrań nie da się z nich uczyć rozpoznawania:

- [ ] **B9 Głosy drapieżników dziennych:** nagrania (Commons, mirrory xeno-canto) z sonogramami: myszołów (miauczenie), kania ruda i czarna, pustułka, krogulec i jastrząb (alarm przy gnieździe), bielik, orlik krzykliwy, trzmielojad, błotniak stawowy, sokół wędrowny, kobuz. Każde nagranie trzeba odsłuchać (`zatwierdzone`).
- [ ] **B10 Wiek i upierzenie dużych orłów:** zdjęcia kolejnych szat orła przedniego, bielika i orła iberyjskiego (młody, 2.–4. rok, dorosły) i lotek w różnym wieku po pierzeniu falami.
- [ ] **B11 Moduł terenowy (Biebrza albo Monfragüe):** zdjęcia miejsca i gatunków spoza atlasu.
- [ ] **Krukowate:** zdjęcia i nagrania kruka, wrony siwej, gawrona, kawki, sroki, sójki, orzechówki; sceny z drapieżnikami (przeganianie, gniazda wron zajęte przez pustułki i uszatki).
- [ ] **Małe ptaki (las, łąka, miasto, ofiary drapieżników):** zdjęcia i nagrania pospolitych wróblowych; trzeba zdecydować, czy dostaną osobny plik danych jak `ptaki-mokradel.json`.
