# World of Raptors — plan techniczny

Prywatna aplikacja webowa do własnej nauki, publikowana na **Vercel** (plan Hobby wystarcza, bo projekt jest niekomercyjny). Kod: [github.com/Konstancja-Tanjga/world-of-raptors](https://github.com/Konstancja-Tanjga/world-of-raptors).

## Stos
| Warstwa | Wybór | Uwagi |
|---|---|---|
| Framework | **Next.js 16** (App Router, TypeScript) | strony generowane statycznie przy buildzie; tylko start renderuje się przy każdym wejściu (gatunek na dziś, niebo o tej porze) |
| UI | **Big Hat design system** (`@bighat/ui`) | instalowany z GitHuba (`git+https://…bighat-design-system.git#<commit>`), bo nie ma go w npm |
| Treść lekcji | Markdown w `content/`, renderowany przez `react-markdown` + `remark-gfm` + `rehype-raw` | lekcje czytelne także na GitHubie; `rehype-raw` pozwala na własne znaczniki (`<zdjecie>`, `<margines>`) |
| Dane | `content/gatunki.json`, `content/moduly.json` | jedno źródło dla atlasu, checklisty i nawigacji |
| Style | `src/app/motyw.css` (motyw: role `--bh-*` i warstwa `--wor-*`), `globals.css` i arkusze stron | bez Tailwinda: wartości z tokenów, nie wpisane na sztywno (wyjątki w CLAUDE.md) |
| Checklista | `localStorage` + eksport i import do pliku JSON | bez logowania i bez bazy danych |
| Postęp nauki | `localStorage` (`src/lib/postep.ts`) | ukończone lekcje; moduł jest „zaliczony”, gdy wszystkie lekcje są ukończone, co widać na kartach modułów (pierścień, „Zaliczony”) i w pasku modułu (ukończona lekcja ma ✓ w wypełnionym kółku zamiast numeru) |
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
  gatunki.json             atlas: 42 gatunki (regiony, aktywność, cechy, pary do pomylenia)
  moduly/<slug>/README.md  opis modułu
  moduly/<slug>/NN-*.md    lekcje
  zdjecia.json             zdjęcia gatunków, prawie wszystkie z Commons (autor, licencja, rozmiar oryginału, punkt ostrości)
  ciekawostki.json         ciekawostki
src/
  app/                     strony (routing), motyw.css, globals.css i arkusze stron
  components/ds.ts         kliencki most do @bighat/ui
  components/*.tsx         rama (AppFrame, Nawigacja, PasekModulu, Stopka), Markdown, atlas, fiszki, checklista
  components/start/        sceny strony startowej (niebo, okładka, morf grup, chór sów, kolekcja)
  components/gatunek/      plansza sylwetki i porównania na karcie gatunku
  components/modul/        otwarcie i sylabus modułu
  components/oprojekcie/   ilustracje strony O projekcie
  lib/content.ts           odczyt treści i jej sprawdzenie przy buildzie (tylko serwer)
  lib/sylwetka.ts          rysowanie sylwetki z liczb
  lib/sylwetki.ts          liczby, pozy i sposób lotu każdego gatunku
  lib/zdjecia.ts           rozmiary miniatur z Commons i kadrowanie po punkcie ostrości
  lib/niebo.ts             wysokość słońca nad Warszawą i pora dnia
  lib/checklist.ts         zapis checklisty w localStorage
  lib/links.ts             zamiana względnych linków Markdown na trasy aplikacji
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
| `/o-projekcie` | o projekcie: autorstwo, jak powstały sylwetki, kroje, kolory, ruch, podziękowania dla fotografów |

## Dodawanie treści
1. Nowa lekcja: plik `content/moduly/<slug>/NN-nazwa.md` i wpis w `lekcje` w `content/moduly.json`.
2. Nowy moduł: folder z `README.md` i lekcjami oraz ustawienie `slug`, `gotowy: true` i `lekcje` w `moduly.json`. README musi mieć pod tytułem zajawkę w jednym cytacie (`> …`): pokazują ją start, plan i otwarcie modułu. Do tego wpis w `OTWARCIA_MODULOW` w `src/lib/content.ts`: gatunek i zdjęcie, którym moduł się otwiera. Bez tych dwóch rzeczy build się zatrzyma.
3. Nowy gatunek: wpis w `content/gatunki.json` (`id` małymi literami z łącznikami, `grupa` jednym słowem). Build sprawdza, czy każde `mylona_z` wskazuje istniejące `id`. Potem:
   - sylwetka: wpis w `SYLWETKI` w `src/lib/sylwetki.ts` (liczby zacznij od grupy, do której należy, i porównaj rysunek ze zdjęciem z lotu), a dla ptaka dziennego także `STYL_LOTU`, czyli sposób lotu na fiszce i na karcie gatunku. Bez nich build się zatrzyma;
   - zdjęcia: wpis w `content/zdjecia.json` z polem `fokus` (`[x, y]` w procentach: głowa ptaka siedzącego, środek ptaka w locie), a potem `python3 scripts/commons.py rozmiary`, które dopisze rozmiar oryginału (`oryginal`).
4. Linki między lekcjami pisz jako względne ścieżki do plików `.md`. Aplikacja zamieni je na swoje adresy.
5. Nowa ciekawostka: wpis w `content/ciekawostki.json` (`id`, `tekst` z `**pogrubieniem**` i `*kursywą*`, bez linków, bo ciekawostka ma być zrozumiała sama, a jedyną drogą dalej jest „Czytaj dalej” do lekcji; `modul`, `lekcja` albo `null` dla całego modułu, `gatunki` z `id` z atlasu). Tekst musi być zrozumiały bez kontekstu lekcji. Karta pokazuje najpierw ciekawostki pasujące do gatunku lub modułu, a nieoglądane przed powtórkami.
6. Margines lekcji: zdjęcie albo ramkę `> ` umieść w `<margines>` **przed** akapitem, do którego należy. W środku zostaw puste linie, żeby treść była dalej Markdownem:
   ```
   <margines>

   > Krótka uwaga obok akapitu.

   </margines>

   Akapit, do którego należy uwaga.
   ```
   Na szerokim ekranie notatka stoi obok akapitu, na wąskim nad nim. Nagłówki `##` tworzą spis treści lekcji, więc pisz je zwykłym tekstem, bez pogrubień i linków.
7. Quiz krok po kroku: sekcja `## … Quiz (próg zaliczenia: 80%)` z ponumerowanymi pytaniami. Pod każdym pytaniem jedna wcięta linia odpowiedzi `a) … b) … c) …`, poprawna **pogrubiona**. Aplikacja pokazuje jedno pytanie na ekranie, od razu mówi, czy odpowiedź jest dobra, a zaliczony quiz oznacza lekcję jako ukończoną. Build zatrzymuje się, gdy sekcja quizu nie ma pytań, gdy między pytaniami stoi inna linia, gdy próg jest spoza 1–100% albo gdy pytanie nie ma co najmniej dwóch odpowiedzi i dokładnie jednej pogrubionej. Kursywa i pogrubienia w pytaniach i odpowiedziach znikają (zob. `DS-GAPS.md`).

## Uruchamianie
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build produkcyjny, tak jak na Vercel
npm run lint
```

## Deploy
1. Na vercel.com: *Add New → Project → Import* repozytorium `world-of-raptors`. Vercel sam wykryje Next.js.
2. Każdy push na `main` publikuje wersję produkcyjną, a każda inna gałąź dostaje własny adres podglądu.
3. Aktualizacja design systemu: zmień hash commita przy `@bighat/ui` w `package.json` i uruchom `npm install`.

### Dostęp tylko dla mnie (opcjonalnie)
Strona ma `noindex`, więc wyszukiwarki jej nie pokażą, ale kto ma link, ten ją otworzy. Jeśli ma być zamknięta: prosta blokada hasłem (HTTP Basic Auth) w `src/proxy.ts` (w Next.js 16 plik `middleware` nazywa się `proxy`), z hasłem w zmiennej środowiskowej na Vercel.

## Etapy
1. Gotowe: **MVP:** moduły A1–A7 i B1–B5, atlas gatunków, checklista, deploy.
2. Zdjęcia i nagrania na licencjach CC (Wikimedia Commons, xeno-canto) z autorem i licencją przy każdym pliku.
3. Gotowe: quiz krok po kroku w lekcjach z ćwiczeniami na końcu każdego modułu i fiszki (zdjęcia, sylwetki w locie i nazwy w trzech językach) z powtórkami rozłożonymi w czasie (`ts-fsrs`, `/fiszki`).
4. Mapa punktów obserwacyjnych (Leaflet + OpenStreetMap), quiz „porównaj”, „wirtualny punkt obserwacyjny”.
5. Opcjonalnie: checklista zapisywana w bazie (np. Supabase albo Neon przez Vercel Marketplace), żeby była wspólna na telefonie i komputerze.
