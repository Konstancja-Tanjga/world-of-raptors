# World of Raptors — plan techniczny

Prywatna aplikacja webowa do własnej nauki, publikowana na **Vercel** (plan Hobby wystarcza, bo projekt jest niekomercyjny). Kod: [github.com/Konstancja-Tanjga/world-of-raptors](https://github.com/Konstancja-Tanjga/world-of-raptors).

## Stos
| Warstwa | Wybór | Uwagi |
|---|---|---|
| Framework | **Next.js 16** (App Router, TypeScript) | wszystkie strony generowane statycznie przy buildzie |
| UI | **Big Hat design system** (`@bighat/ui`) | instalowany z GitHuba (`git+https://…bighat-design-system.git#<commit>`), bo nie ma go w npm |
| Treść lekcji | Markdown w `content/`, renderowany przez `react-markdown` + `remark-gfm` + `rehype-raw` | lekcje czytelne także na GitHubie; `rehype-raw` pozwala na `<details>` z odpowiedziami do quizów |
| Dane | `content/gatunki.json`, `content/moduly.json` | jedno źródło dla atlasu, checklisty i nawigacji |
| Style | `src/app/globals.css`, tylko tokeny `--bh-*` | bez Tailwinda: zasady design systemu zabraniają wartości wpisanych na sztywno |
| Checklista | `localStorage` + eksport i import do pliku JSON | bez logowania i bez bazy danych |
| Postęp nauki | `localStorage` (`src/lib/postep.ts`) | ukończone lekcje; moduł jest „zaliczony”, gdy wszystkie lekcje są ukończone, co widać w menu (✓) |
| Zdjęcia | Wikimedia Commons (`content/zdjecia.json`, znacznik `<zdjecie>` w lekcjach) | autor i licencja przy każdym zdjęciu; `scripts/commons.py` szuka i tworzy znaczniki |

## Zasady design systemu w tym projekcie
- Komponenty importuj z `@/components/ds`, **nigdy** bezpośrednio z `@bighat/ui`. Pakiet nie ma dyrektyw `"use client"`, więc `ds.ts` owija go w moduł kliencki.
- Komponenty nie przyjmują `className` ani `style`. Własny układ strony (np. `.page`, `.stack`, `.grid`) jest w `globals.css`.
- Kolory, odstępy, rozmiary tekstu i promienie zaokrągleń tylko z tokenów semantycznych. Wyjątki: `1px` dla obramowań i szerokość kolumny tekstu, dla której nie ma tokenu.
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
src/
  app/                     strony (routing)
  components/ds.ts         kliencki most do @bighat/ui
  components/*.tsx         AppFrame, Markdown, atlas, checklista
  lib/content.ts           odczyt treści (tylko serwer)
  lib/checklist.ts         zapis checklisty w localStorage
  lib/links.ts             zamiana względnych linków Markdown na trasy aplikacji
```

## Trasy
| Adres | Strona |
|---|---|
| `/` | start: ścieżki, moduły, postęp checklisty |
| `/plan` | plan kursu |
| `/moduly/[slug]` | opis modułu |
| `/moduly/[slug]/[lekcja]` | lekcja |
| `/gatunki` | atlas z filtrami (region, aktywność, wyszukiwarka) |
| `/gatunki/[id]` | karta gatunku z odhaczaniem obserwacji |
| `/checklista` | moja checklista: odhaczanie, data, miejsce, notatka, eksport i import |

## Dodawanie treści
1. Nowa lekcja: plik `content/moduly/<slug>/NN-nazwa.md` i wpis w `lekcje` w `content/moduly.json`.
2. Nowy moduł: folder z `README.md` i lekcjami oraz ustawienie `slug`, `gotowy: true` i `lekcje` w `moduly.json`.
3. Nowy gatunek: wpis w `content/gatunki.json`. Sprawdź, czy każde `mylona_z` wskazuje istniejące `id`.
4. Linki między lekcjami pisz jako względne ścieżki do plików `.md`. Aplikacja zamieni je na swoje adresy.
5. Nowa ciekawostka: wpis w `content/ciekawostki.json` (`id`, `tekst` z `**pogrubieniem**` i `*kursywą*`, bez linków, bo karta ma jedną akcję: link „Czytaj dalej” do lekcji; `modul`, `lekcja` albo `null` dla całego modułu, `gatunki` z `id` z atlasu). Tekst musi być zrozumiały bez kontekstu lekcji. Karta pokazuje najpierw ciekawostki pasujące do gatunku lub modułu, a nieoglądane przed powtórkami.

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
1. ✅ **MVP:** moduły A1–A7 i B1–B5, atlas gatunków, checklista, deploy.
2. Zdjęcia i nagrania na licencjach CC (Wikimedia Commons, xeno-canto) z autorem i licencją przy każdym pliku.
3. Interaktywne quizy i fiszki z powtórkami rozłożonymi w czasie (`ts-fsrs`).
4. Mapa punktów obserwacyjnych (Leaflet + OpenStreetMap), quiz „porównaj”, „wirtualny punkt obserwacyjny”.
5. Opcjonalnie: checklista zapisywana w bazie (np. Supabase albo Neon przez Vercel Marketplace), żeby była wspólna na telefonie i komputerze.
