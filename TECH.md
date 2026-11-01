# World of Raptors — plan techniczny

Prywatna aplikacja webowa do własnej nauki, publikowana na **Vercel** (plan Hobby wystarcza, bo projekt jest niekomercyjny). Kod: [github.com/Konstancja-Tanjga/world-of-raptors](https://github.com/Konstancja-Tanjga/world-of-raptors).

## Stos
| Warstwa | Wybór | Uwagi |
|---|---|---|
| Framework | **Next.js 16** (App Router, TypeScript) | strony generowane statycznie przy buildzie; tylko start renderuje się przy każdym wejściu (gatunek na dziś, niebo o tej porze) |
| UI | **Big Hat design system** (`@bighat/ui`) | instalowany z GitHuba (`git+https://…bighat-design-system.git#<commit>`), bo nie ma go w npm |
| Treść lekcji | Markdown w `content/`, renderowany przez `react-markdown` + `remark-gfm` + `rehype-raw` | lekcje czytelne także na GitHubie; `rehype-raw` pozwala na własne znaczniki (`<zdjecie>`, `<margines>`, `<galeria>`) |
| Dane | `content/gatunki.json`, `content/ptaki-mokradel.json`, `content/moduly.json` | jedno źródło dla atlasu, checklisty i nawigacji |
| Style | `src/app/motyw.css` (motyw: role `--bh-*` i warstwa `--wor-*`), `globals.css` i arkusze stron | bez Tailwinda: wartości z tokenów, nie wpisane na sztywno (wyjątki w CLAUDE.md) |
| Checklista | `localStorage` + eksport i import do pliku JSON | bez logowania i bez bazy danych |
| Postęp nauki | `localStorage` (`src/lib/postep.ts`) | ukończone lekcje; moduł jest „zaliczony”, gdy wszystkie lekcje są ukończone, co widać na kartach modułów (pierścień, „Zaliczony”) i w pasku modułu (ukończona lekcja ma ✓ w wypełnionym kółku zamiast numeru) |
| Modele 3D | **three.js** (moduł A9, `src/lib/budowa/`) | ptak, pióro i kości budowane w kodzie z prostych brył; wczytywane tylko w lekcjach z `<model-3d>` |
| Zdjęcia | Wikimedia Commons (`content/zdjecia.json`, znacznik `<zdjecie>` w lekcjach) | autor i licencja przy każdym zdjęciu; `scripts/commons.py` szuka i tworzy znaczniki |

## Zasady design systemu w tym projekcie
- Komponenty importuj z `@/components/ds`, **nigdy** bezpośrednio z `@bighat/ui`. Pakiet nie ma dyrektyw `"use client"`, więc `ds.ts` owija go w moduł kliencki.
- Komponenty nie przyjmują `className` ani `style`. Własny układ strony (np. `.page`, `.stack`, `.grid`) jest w `globals.css`.
- Kolory, odstępy, rozmiary, grubości i interlinia tekstu, promienie zaokrągleń i czasy ruchu tylko z tokenów (Big Hat albo `--wor-*` z `motyw.css`). Wyjątki: `1px` dla obramowań, obrysy fokusu, szerokość kolumny tekstu, progi szerokości ekranu, tła sceny pod treścią (`z-index` −1 i −2 w odizolowanej scenie) i choreografia pojedynczej sceny (klatki kluczowe, jednorazowe czasy, rozmiary ilustracji).
- Stany pusty, ładowanie i błąd zawsze przez `StateBlock`.
- **Nawigacja wyglądająca jak przycisk:** `ButtonLink` (`src/components/ButtonLink.tsx`) to **komponent lokalny**, nie z Big Hat. Kontrakt `Button` wyklucza nawigację („that is an anchor”), więc to link `<a>` z klasami `bh-button`. Zapisane jako luka w [DS-GAPS.md](DS-GAPS.md). Jeśli taki wzorzec powtórzy się w innym projekcie, to kandydat na zgłoszenie do design systemu (patrz `agent/REQUESTS.md`).
- Pełne zasady: `node_modules/@bighat/ui/agent/SKILL.md` i `react.md`.

## Struktura
```
content/
  PLAN-KURSU.md            plan kursu
  moduly.json              ścieżki, moduły, lekcje (kolejność i tytuły)
  gatunki.json             atlas: 45 drapieżników (regiony, aktywność, cechy, pary do pomylenia, miejsca, rozpiętość i długość ciała)
  miarka.json              ptaki odniesienia modułu B7 (od wróbla do bociana): nie są drapieżnikami, nie trafiają do atlasu ani fiszek
  punkty-obserwacji.json   punkty obserwacji: współrzędne, dojazd, miesiące, pora dnia, wiatr, ptaki, lekcja, źródła
  ptaki-mokradel.json      ptaki mokradeł, czyli gatunki z list terenowych, które nie są drapieżnikami (filtr „Ptaki mokradeł”): nazwy, grupa, cechy, miejsca
  moduly/<slug>/README.md  opis modułu
  moduly/<slug>/NN-*.md    lekcje
  zdjecia.json             zdjęcia gatunków, prawie wszystkie z Commons (autor, licencja, rozmiar oryginału, punkt ostrości)
  ciekawostki.json         ciekawostki
  budowa-ptaka.json        moduł A9: nazwy, łacina i opisy części ptaka, pióra i kości w modelach 3D, podpisy scen i kroki oddechu
src/
  app/                     strony (routing), motyw.css, globals.css i arkusze stron
  components/ds.ts         kliencki most do @bighat/ui
  components/*.tsx         rama (AppFrame, Nawigacja, PasekModulu, Stopka), Markdown, atlas, fiszki, checklista, plansza Anatomia i ćwiczenia B7 (PtasiaMiarka, ZgadnijSylwetke, ładowane przez CwiczeniaLekcji)
  components/start/        sceny strony startowej (niebo, okładka, morf grup, chór sów, kolekcja)
  components/gatunek/      plansza sylwetki i porównania na karcie gatunku
  components/modul/        otwarcie i sylabus modułu
  components/niebo/        „Moje niebo”: mapa gwiazdozbiorów, lista życiowa, naszywki, obrączki, strażnik nowych odznak
  lib/content.ts           odczyt treści i jej sprawdzenie przy buildzie (tylko serwer)
  lib/sylwetka.ts          rysowanie sylwetki z liczb
  lib/sylwetki.ts          liczby, pozy i sposób lotu każdego gatunku
  lib/cwiczenia.ts         zasady ćwiczeń B7: mieszanie, przesuwanie, ocena kolejności, gatunki do wyboru
  lib/zdjecia.ts           rozmiary miniatur z Commons i kadrowanie po punkcie ostrości
  lib/niebo.ts             wysokość słońca nad Warszawą i pora dnia
  lib/magazyn.ts           warstwa zapisu: adapter (dziś localStorage), wersjonowane klucze, migracja ze starszej wersji
  lib/obserwacje.ts        schemat checklisty v2 (widziany, data, miejsce, notatka, zmieniono) i migracja z v1
  lib/checklist.ts         zapis checklisty (klucz wor:checklista:v2)
  lib/odznaki.ts           zasady „Mojego nieba”: obrączki, gwiazdozbiory, złote gwiazdy, naszywki
  lib/gwiazdozbiory.ts     ptak każdego modułu i rozkład gwiazdozbiorów na niebie
  lib/zdobyte.ts           daty zdobycia gwiazdozbiorów, złotych gwiazd i naszywek (i czy ich moment już się odegrał) w localStorage
  lib/punkty.ts            punkty obserwacji: odległość i kierunek, najbliższe punkty, współrzędne z tekstu, wyszukiwanie miejsca (Open-Meteo)
  lib/links.ts             zamiana względnych linków Markdown na trasy aplikacji
  lib/budowa/              modele 3D modułu A9: sceny (sceny.ts, bez three.js), bryły (geometria.ts), ptak (ptak.ts), pióro i kości (mikro.ts), przeglądarka 3D (scena.ts)
```

## Trasy
| Adres | Strona |
|---|---|
| `/` | start: niebo o tej porze dnia albo o porze, którą wybrałam („Pora nieba” na starcie lub link `?pora=swit`, `dzien`, `zmierzch`, `noc`; wybór zostaje w ciasteczku `wor-pora`, dopóki „Teraz” nie przywróci zegara), gatunek na dziś, moduły, osiem sylwetek, sowy, moja lista |
| `/plan` | kurs: moduły z moim postępem, pod nimi plan kursu |
| `/moduly/[slug]` | moduł: otwarcie ze zdjęciem, lekcje, opis |
| `/moduly/[slug]/[lekcja]` | lekcja |
| `/gatunki` | atlas z filtrami: zdjęcia, sylwetki w grupach albo wszystkie w jednej skali |
| `/gatunki/[id]` | karta gatunku: plansza sylwetki, sposób lotu, rozpiętość, podobne gatunki z suwakiem, moja obserwacja |
| `/fiszki` | fiszki: zdjęcia, sylwetki i nazwy (polskie, angielskie, hiszpańskie), powtórki FSRS |
| `/checklista` | moja checklista: odhaczanie, data, miejsce, notatka, zdjęcia, eksport i import |
| `/rozpoznaj` | rozpoznawanie krok po kroku (jak Step by Step w Merlinie): gdzie był ptak, jak duży (w porównaniu z ptakami z „ptasiej miarki” B7), jakie miał kolory (do trzech) i co robił; potem pasujące drapieżniki i sowy z atlasu, najlepsze najpierw, z tym, co się zgadza, a co nie. Każde pytanie można pominąć; nic się nie zapisuje |
| `/kiedy-i-gdzie` | kiedy i gdzie: planer (najlepsze godziny na Marismas del Barbate i La Jandę w najbliższych 10 dniach, z prognozy pływów i pogody Open-Meteo pobieranej w przeglądarce), a pod nim punkty obserwacji według okolic albo od najbliższego miejsca, które wpiszę lub które poda przeglądarka: kiedy jechać, pora dnia, wiatr, ptaki, dojazd. Stare adresy `/kiedy-jechac` i `/punkty-obserwacji` przekierowują tutaj |
| `/moje-niebo` | moje niebo: gwiazdozbiory modułów, lista życiowa z obrączkami gatunków, ściana naszywek |
| `/o-projekcie` | o projekcie: autorstwo, jak powstały sylwetki, kroje, kolory, ruch, podziękowania dla fotografów |
| `/opengraph-image` | karta, którą pokazuje udostępniony link (LinkedIn, komunikatory): niebo o zmierzchu, sylwetki, tytuł i autorka; rysowana raz, przy buildzie |

## Dodawanie treści
1. Nowa lekcja: plik `content/moduly/<slug>/NN-nazwa.md` i wpis w `lekcje` w `content/moduly.json`.
2. Nowy moduł: folder z `README.md` i lekcjami oraz ustawienie `slug`, `gotowy: true` i `lekcje` w `moduly.json`. README musi mieć pod tytułem zajawkę w jednym cytacie (`> …`): pokazują ją start, plan i otwarcie modułu. Do tego wpis w `OTWARCIA_MODULOW` w `src/lib/content.ts`: gatunek i zdjęcie, którym moduł się otwiera, i wpis w `GWIAZDOZBIORY` w `src/lib/gwiazdozbiory.ts`: ptak z sylwetką i nazwa gwiazdozbioru, który moduł zapala (najlepiej ptak, którego nie ma jeszcze żaden inny gwiazdozbiór). Bez tych trzech rzeczy build się zatrzyma. Mapa „Mojego nieba” ma cztery kolumny i tyle rzędów, ile trzeba (najwyżej sześć, czyli 24 moduły; build to sprawdza).
3. Nowy gatunek: wpis w `content/gatunki.json` (`id` małymi literami z łącznikami, `grupa` jednym słowem). Build sprawdza, czy każde `mylona_z` wskazuje istniejące `id`. Potem:
   - sylwetka: wpis w `SYLWETKI` w `src/lib/sylwetki.ts` (liczby zacznij od grupy, do której należy, i porównaj rysunek ze zdjęciem z lotu), a dla ptaka dziennego także `STYL_LOTU`, czyli sposób lotu na fiszce i na karcie gatunku. Bez nich build się zatrzyma;
   - lekcja, która go uczy: nagłówek `### Nazwa — *Rodzaj gatunek*` (plansza) albo przynajmniej wzmianka z łacińską nazwą kursywą. Od niej zależy obrączka „Znam” w „Moim niebie”, więc build zatrzyma się na gatunku, którego żadna lekcja nie uczy ani nie wymienia. Łacińska nazwa kursywą decyduje też o złotej gwieździe: w module bez plansz każdy gatunek tak nazwany trafia na listę, którą trzeba rozpoznać;
   - do rozpoznawania (`/rozpoznaj`): `kolory` (barwy upierzenia widoczne w terenie, obu płci, ptaka młodego i dorosłego, wszystkich odmian: `bialy`, `szary`, `czarny`, `brazowy`, `rudy`, `plowy`) i `zachowania` (co zwykle robi: `krazy`, `zawisa`, `nisko`, `goni`, `woda`, `slup`, `ziemia`, `noc`; listy z opisami są w `src/lib/rozpoznawanie.ts`). Bez nich build się zatrzyma;
   - zdjęcia: wpis w `content/zdjecia.json` z polem `fokus` (`[x, y]` w procentach: głowa ptaka siedzącego, środek ptaka w locie), a potem `python3 scripts/commons.py rozmiary`, które dopisze rozmiar oryginału (`oryginal`). Opcjonalne trzecie zdjęcie `cecha` (cecha do rozpoznania: druga płeć, młody ptak, odmiana) ma dodatkowo pola `podpis` i `alt`.

   Ptak mokradeł (gatunek z listy terenowej, który nie jest drapieżnikiem): wpis w `content/ptaki-mokradel.json` (`grupa` z `GRUPY_MOKRADEL` w `types.ts`, `cechy` to jedno lub dwa krótkie zdania, `miejsca`). Nie potrzebuje sylwetki ani lekcji z planszą; zdjęcie dodaj do `zdjecia.json` tak jak drapieżnikowi. Gdy czegoś nie jesteś pewna, wpisz to w pole `todo` (`next dev` wypisze listę). Drapieżnik, który już jest w atlasie, nie dostaje drugiego wpisu, tylko miejsce w `miejsca`.

   Siewkowiec jako pełny gatunek (moduł B9): ptak mokradeł z grupy `siewkowe` z blokiem `rozpoznawanie`: `klucz` (cechy: `wielkosc`, `dziob`, `nogi`, `zachowanie`, `upierzenie`, `lot`, `glos`), `mylona_z` (inne siewkowce z `rozpoznawanie`), `rozpietosc_cm`, `dlugosc_cm` i `regiony`. Dostaje wtedy planszę z tabelą cech i sobowtórami, fiszki ze zdjęć i nazw (a z głosem, gdy ma zatwierdzone nagranie z `"fiszka": true`), miejsce w miarce i obrączki w „Moim niebie”, na osobnej półce. Potrzebuje obu zdjęć, `siedzacy` i `lot`, i lekcji z jego planszą. Siewkowiec spoza listy terenowej ma `miejsca: []`.
4. Nowy punkt obserwacji: wpis w `content/punkty-obserwacji.json`. `okolica` z `OKOLICE` w `src/lib/punkty.ts` (nowa okolica to nowy wpis tam), `rodzaj` (`przelot` albo `lokalne`), `szer` i `dl` w stopniach dziesiętnych (`przyblizone: true`, gdy pokazują tylko okolicę), `wiatr` (`lewant`, `poniente` albo pusta lista, gdy wiatr nie wybiera punktu), `miesiace` i `szczyt` (numery 1–12, szczyt zawiera się w miesiącach), `pora_dnia`, `gatunki` (`id` z atlasu albo z ptaków mokradeł), `lekcja` (slug modułu i lekcji z gotowego modułu, np. `gibraltar/04-gdzie-i-kiedy`), opcjonalnie `planer` (miejsce planera) i `zrodla`. Opis i dojazd pisz własnymi słowami, a źródło podaj w `zrodla`. Rzeczy do sprawdzenia wpisz w `todo` (`next dev` wypisze listę). Build sprawdza pola, miesiące, ptaki, lekcję i planer.
5. Linki między lekcjami pisz jako względne ścieżki do plików `.md`. Aplikacja zamieni je na swoje adresy.
6. Rysunki i ćwiczenia w lekcji (moduł B7) to znaczniki, tak jak `<zdjecie>`: otwierający w osobnej linii, zamykający w następnej, z pustymi liniami dookoła. Zły identyfikator zatrzymuje build.
   - `<miarka data-id="myszolow">`: rozpiętość gatunku w skali, z rozłożonymi rękami człowieka;
   - `<anatomia>`: plansza kani rudej z opisanymi częściami sylwetki;
   - `<morf-grup>`: osiem grup B1 na kawałku nieba;
   - `<suwak-morfu data-od="myszolow" data-do="trzmielojad">`: suwak między dwoma ptakami dziennymi;
   - `<ptasia-miarka data-ptaki="wrobel pustulka wrona" data-miara="rozpietosc">`: ćwiczenie „ułóż od najmniejszego”; ptaki z atlasu albo z `content/miarka.json` (ptaki odniesienia), `data-miara` (obowiązkowe) to `rozpietosc` albo `dlugosc` (długość ciała, `dlugosc_cm`); identyfikatory rozdzielone spacjami albo przecinkami; co najmniej trzy ptaki, każdy z innym środkiem zakresu, bo według niego ćwiczenie ocenia kolejność;
   - `<zgadnij-sylwetke data-gatunki="myszolow kania-ruda pustulka">`: ćwiczenie „grupa, a potem gatunek” na sylwetkach ptaków dziennych, każdy gatunek raz. Ćwiczenia niczego nie zapisują i nie kończą lekcji.
7. Nowa ciekawostka: wpis w `content/ciekawostki.json` (`id`, `tekst` z `**pogrubieniem**` i `*kursywą*`, bez linków, bo ciekawostka ma być zrozumiała sama, a jedyną drogą dalej jest „Czytaj dalej” do lekcji; `modul`, `lekcja` albo `null` dla całego modułu, `gatunki` z `id` z atlasu). Tekst musi być zrozumiały bez kontekstu lekcji. Karta pokazuje najpierw ciekawostki pasujące do gatunku lub modułu, a nieoglądane przed powtórkami.
8. Margines lekcji: zdjęcie albo ramkę `> ` umieść w `<margines>` **przed** akapitem, do którego należy. W środku zostaw puste linie, żeby treść była dalej Markdownem:
   ```
   <margines>

   > Krótka uwaga obok akapitu.

   </margines>

   Akapit, do którego należy uwaga.
   ```
   Na szerokim ekranie notatka stoi obok akapitu, na wąskim nad nim. Nagłówki `##` tworzą spis treści lekcji, więc pisz je zwykłym tekstem, bez pogrubień i linków.

   Zdjęcia, które trzeba zobaczyć duże albo obok siebie (pióro sowy przy piórze myszołowa, czaszka, kolejne etapy), wstaw w `<galeria>`: od jednego do sześciu znaczników `<zdjecie>` i nic poza nimi. Galeria sięga przez tekst i margines i zaczyna się pod notatkami z marginesu, więc wstaw ją po akapicie, do którego należy notatka, albo na początku sekcji:
   ```
   <galeria>

   <zdjecie …>
   </zdjecie>

   <zdjecie …>
   </zdjecie>

   </galeria>
   ```
   Każde zdjęcie otwiera się po kliknięciu na całym ekranie, z podpisem i licencją; zdjęcia z jednej galerii, jednego marginesu albo jednej planszy przegląda się strzałkami. Znacznik `<zdjecie>` z Commons ma atrybut `oryginal="SZERxWYS"` (rozmiar oryginału), dzięki któremu przeglądarka pobiera ostrzejszą miniaturę; `python3 scripts/commons.py tag` wpisuje go sam, a `python3 scripts/commons.py rozmiary-lekcji` uzupełnia go we wszystkich lekcjach. Cały znacznik `<zdjecie>` pisz w jednej linii, małymi literami. Build (w gotowych modułach) zatrzymuje się na zdjęciu spoza Commons i `/zdjecia/`; bez `alt`, autora, licencji albo wymiarów; z Commons bez strony pliku albo, przy miniaturze, bez `oryginal`; na znaczniku wpisanym w tekst, rozbitym na linie albo pisanym wielkimi literami; i na galerii z czymś innym niż od 1 do 6 zdjęć.
9. Nagranie w lekcji: `<glos data-id="puszczyk/samiec">` w osobnej linii i `</glos>` w następnej. Odtwarza wpis z `content/nagrania.json`: nad odtwarzaczem pokazuje, co słychać (`opis`), a pod nim autora i licencję. Nowy wpis z Commons wypisuje `python3 scripts/commons.py nagranie "File:…" --gatunek puszczyk --lat "Strix aluco" --opis "Samiec: głos terytorialny"`. Gdy Commons nie ma nagrania gatunku, można użyć nagrania z xeno-canto na licencji CC0, CC BY albo CC BY-SA (nie NC): plik MP3 w `public/nagrania/`, a `strona` to jego adres na xeno-canto. Każde nagranie ma `zatwierdzone: false`, dopóki go nie odsłucham (`next dev` wypisuje listę). Sonogram (pierwsze 12 s, do 4 kHz, a przy sowach o niskim głosie do 2 kHz) rysuje `python3 scripts/sonogramy.py` (potrzebny ffmpeg); zapisuje go w `public/sonogramy/` i dopisuje do wpisu `"sonogram": {"khz": …, "zrodlo": …}`. Po podmianie nagrania uruchom skrypt jeszcze raz: narysuje sonogram od nowa, a do tego czasu build się zatrzyma. Nagranie, którego sonogram pokazuje sam szum, wpisz w `BEZ_SONOGRAMU` w skrypcie. Build zatrzymuje się na gatunku spoza atlasu, nagraniu spoza Commons i `public/nagrania/`, licencji, która nie jest wolna, i na `<glos>` bez wpisu.
10. Model 3D (moduł A9): `<model-3d data-scena="szkielet">` w osobnej linii i `</model-3d>` w następnej. Sceny (`topografia`, `skrzydlo`, `szkielet`, `wnetrze`, `oddech`, `pioro`, `kosc`, `sprawdzian`) są w `src/lib/budowa/sceny.ts`: który model pokazują, które części można wybrać, które warstwy przełączać, gdzie startuje kamera i przekrój. Nazwy i opisy części, podpis sceny i teksty kroków oddechu są w `content/budowa-ptaka.json`. Nowa część: kształt w `ptak.ts` albo `mikro.ts` (siatka z identyfikatorem części i warstwą), identyfikator w scenie i wpis w JSON-ie. Każda część z modeli lekcji ma też dwie fiszki w talii „Budowa ptaka” (obrazek z podświetloną częścią i nazwa); obrazki w `public/budowa/` rysuje z działającej aplikacji `node --import ./scripts/testy/rozwiaz.mjs scripts/budowa-obrazy.mjs` (po zmianie modelu narysuj je od nowa; nowa część bez obrazka zatrzymuje build, a `BUDOWA_BEZ_OBRAZOW=1 npm run build` przepuszcza jeden build, żeby uruchomić aplikację dla skryptu). Build zatrzymuje się na scenie bez tekstów, części bez nazwy albo opisu, tekście, którego nie pokazuje żadna scena, i na `<model-3d>` z nieznaną sceną; `npm test` sprawdza, czy model rysuje każdą część, którą wymienia scena, i czy szkielet i narządy mieszczą się w ciele.
11. Punkt obserwacyjny (moduł B8): `<punkt-obserwacyjny data-sesja="ciesnina-sierpien">` (sesja z `content/punkt-obserwacyjny.json`: miejsce, opis, czas w sekundach, kierunek przelotu, gatunki z liczbą ptaków, wielkością stad i wysokością, oraz odpowiedzi do wyboru) i `<komin data-gatunek="sep-plowy" data-ile="120">` (komin do oszacowania, 5–400 ptaków). Gatunki muszą być ptakami dziennymi z sylwetką i stylem lotu, a odpowiedzi muszą zawierać wszystkie gatunki sesji; inaczej build się zatrzyma. Zasady (rozkład stad w czasie, prędkość według stylu lotu, ocena liczenia) są w `src/lib/punkt.ts` i mają testy.
12. Lot (moduł A11): `<style-lotu data-gatunki="pustulka kaniuk gadozer">` pokazuje gatunki dzienne w ich stylu lotu (opisy stylów w `src/lib/lot.ts`), a `<pikowanie>` to suwak z modelem prędkości granicznej pikującego sokoła.
13. Quiz krok po kroku: sekcja `## … Quiz (próg zaliczenia: 80%)` z ponumerowanymi pytaniami. Pod każdym pytaniem jedna wcięta linia odpowiedzi `a) … b) … c) …`, poprawna **pogrubiona**. Aplikacja pokazuje jedno pytanie na ekranie, od razu mówi, czy odpowiedź jest dobra, a zaliczony quiz oznacza lekcję jako ukończoną. Build zatrzymuje się, gdy sekcja quizu nie ma pytań, gdy między pytaniami stoi inna linia, gdy próg jest spoza 1–100% albo gdy pytanie nie ma co najmniej dwóch odpowiedzi i dokładnie jednej pogrubionej. Kursywa i pogrubienia w pytaniach i odpowiedziach znikają (zob. `DS-GAPS.md`).

## Moje niebo
Kolekcja liczona z tego, co przeglądarka już ma (ukończone lekcje, fiszki, checklista). Nic się w niej nie blokuje: każdy moduł jest zawsze otwarty.
- **Obrączki gatunku:** „Znam” (ukończona lekcja, która go uczy: z jego planszą, a gdy żadna jej nie ma, która go wymienia), „Rozpoznaję” (wszystkie jego fiszki zapamiętane, czyli w powtórkach FSRS z odstępem co najmniej tygodnia i powtórzone innego dnia niż pierwsza odpowiedź, więc jedno szczęśliwe „Od razu” nie wystarcza) i złota „Widziałam” (gatunek jest na checkliście). Gatunki, które widziałam, są złote także w atlasie, na checkliście i w kolekcji na starcie, a na karcie gatunku mają złotą obrączkę.
- **Gwiazdozbiory:** zaliczony moduł (wszystkie lekcje ukończone) zapala swój gwiazdozbiór, czyli ptaka z `GWIAZDOZBIORY` narysowanego gwiazdami w narożnikach jego sylwetki. Złota gwiazda przychodzi, kiedy moduł jest zaliczony i rozpoznaję jego gatunki: te z planszami w jego lekcjach, a gdy moduł nie ma plansz (A1–A7), te, które jego lekcje wymieniają łacińską nazwą kursywą; B1 uczy ośmiu grup sylwetek, więc prosi o ich ptaki. Nocą zapalone gwiazdozbiory świecą też na niebie startu, w części nieba wolnej od tekstu.
- **Naszywki:** dziewiętnaście, za umiejętności i za obserwacje z karty terenowej Marismas; zasady i postęp każdej są w `NASZYWKI` w `src/lib/odznaki.ts`.
- **Co zdobyte, zostaje:** data zdobycia gwiazdozbioru, złotej gwiazdy i naszywki jest zapisana (`wor:odznaki:v1`), więc nie znika, gdy później coś zapomnę. Nowe ogłasza komunikat na stronie, na której je zdobyłam (poza pierwszym uruchomieniem i wczytaniem kopii: wtedy zapisuje je bez komunikatów), a „Moje niebo” raz odgrywa ich moment, kiedy się na nim pojawią. Pierwsza wizyta pokazuje tak wszystko, co było zdobyte wcześniej. Kopia zapasowa zawiera te daty.

## Uruchamianie
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build produkcyjny, tak jak na Vercel
npm run lint
npm test         # testy migracji zapisu, kopii zapasowej i odznak (node --test, bez dodatkowych pakietów)
```

## Deploy
1. Na vercel.com: *Add New → Project → Import* repozytorium `world-of-raptors`. Vercel sam wykryje Next.js.
2. Każdy push na `main` publikuje wersję produkcyjną, a każda inna gałąź dostaje własny adres podglądu.
3. Aktualizacja design systemu: zmień hash commita przy `@bighat/ui` w `package.json` i uruchom `npm install`.

### Dostęp tylko dla mnie (opcjonalnie)
Strona ma `noindex`, więc wyszukiwarki jej nie pokażą, ale kto ma link, ten ją otworzy. Jeśli ma być zamknięta: prosta blokada hasłem (HTTP Basic Auth) w `src/proxy.ts` (w Next.js 16 plik `middleware` nazywa się `proxy`), z hasłem w zmiennej środowiskowej na Vercel.

## Etapy
1. Gotowe: **MVP:** moduły A1–A7 i B1–B6, atlas gatunków, checklista, deploy.
2. Zdjęcia i nagrania na licencjach CC (Wikimedia Commons, xeno-canto) z autorem i licencją przy każdym pliku.
3. Gotowe: quiz krok po kroku w lekcjach z ćwiczeniami na końcu każdego modułu i fiszki (zdjęcia, sylwetki w locie i nazwy w trzech językach) z powtórkami rozłożonymi w czasie (`ts-fsrs`, `/fiszki`).
4. Częściowo gotowe: punkty obserwacyjne z wyszukiwaniem najbliższych (`/kiedy-i-gdzie`, razem z planerem). Dalej: mapa punktów (Leaflet + OpenStreetMap), quiz „porównaj”, „wirtualny punkt obserwacyjny”.
5. Gotowe: „Moje niebo”: gwiazdozbiory modułów, obrączki gatunków i naszywki za umiejętności (`/moje-niebo`).
6. Opcjonalnie: checklista zapisywana w bazie (np. Supabase albo Neon przez Vercel Marketplace), żeby była wspólna na telefonie i komputerze.
7. Rozpoznawanie krok po kroku (`/rozpoznaj`): gotowe dla drapieżników i sów. Dalej: ptaki mokradeł (każdy potrzebuje długości ciała, najlepiej z Collinsa jak w B7, kolorów i zachowań, a kreator pytania „Ptak drapieżny czy wodny?” albo wyników w dwóch grupach) i miesiąc obserwacji (dziś `sezon` jest zwykłym tekstem).
