# Konta: logowanie Google i postęp w chmurze

Plan wdrożenia Supabase w World of Raptors. Kurs działa dalej bez logowania. Konto to dodatek: synchronizacja między urządzeniami i kopia w chmurze. Zalogować może się każdy, kto ma konto Google.

## Zasady

- **Najpierw lokalnie.** Każda zmiana trafia najpierw do przeglądarki (`localStorage`, jak dziś), potem do Supabase. W terenie bez zasięgu zmiany czekają w kolejce.
- **Nowsza zmiana wygrywa.** Liczy się czas zmiany na urządzeniu, nie czas wysłania. Odznaczenie lekcji albo gatunku też jest zmianą i synchronizuje się jak każda inna.
- **Zdobyte zostaje zdobyte.** Przy odznakach wygrywa wcześniejsza data, a raz pokazany komunikat nie pokaże się drugi raz na żadnym urządzeniu.
- **Reguły scalania pilnuje baza** (wyzwalacze w migracji), więc stara albo powtórzona wysyłka nigdy nie cofnie nowszej zmiany.
- **Bezpieczeństwo:** RLS na wszystkich tabelach, każdy widzi tylko swoje wiersze. Klucz secret tylko w kodzie serwerowym usuwania konta.
- **Bez commitów i pushy bez zgody właścicielki.**

## Co jest na koncie

| Dane w przeglądarce | Tabela | Klucz |
|---|---|---|
| Ukończone lekcje (`wor:postep:v1`) | `lesson_progress` | `modul/lekcja`, np. `anatomia/01-wzrok` |
| Checklista (`wor:checklista:v2`) | `observations` | gatunek, np. `kania-ruda` albo ptak mokradeł (jedna obserwacja na gatunek, jak w aplikacji). `zmieniono` to `updated_at`, a odznaczony gatunek (`widziany: false`) to `deleted_at`, z zachowaną datą, miejscem i notatką |
| Fiszki (`wor:fiszki:v1`) | `flashcards` | karta, np. `kania-ruda/lot` |
| Zdobyte odznaki „Moje niebo” (`wor:odznaki:v1`) | `user_badges` | `gwiazdozbior:…`, `mistrz:…`, `naszywka:…`, `start` |

Fiszki są potrzebne, bo pierścień „rozpoznaję” i złote gwiazdy liczą się z harmonogramów fiszek. Bez nich „Moje niebo” nie zapaliłoby się na nowym urządzeniu.

**Poza kontem:**
- moje zdjęcia (IndexedDB) zostają tylko na urządzeniu, na którym je dodałam; kopia w pliku dalej je zawiera,
- ostatnio otwarta lekcja („Kontynuuj”),
- pokazane ciekawostki.

## Fazy

### Faza 0: przygotowanie

**Właścicielka:**
1. Projekt w Supabase, region UE (Frankfurt).
2. Google Cloud Console:
   - ekran zgody OAuth: typ External, zakresy `openid`, `email`, `profile`, nazwa „World of Raptors”, link do polityki prywatności,
   - klient OAuth typu Web:
     - Authorized JavaScript origins: `http://localhost`, `http://localhost:3000`, `https://world-of-raptors.vercel.app` (i adres podglądu z Vercela, jeśli logowanie ma tam działać),
     - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`,
   - po testach ekran zgody na „In production”, bo logować się mogą też inne osoby.
3. Supabase → Authentication:
   - Sign In / Providers → Google: Client ID i Client Secret,
   - URL Configuration: Site URL `https://world-of-raptors.vercel.app`; Redirect URLs: produkcja, `http://localhost:3000/**` i wzorzec adresów podglądu z Vercela,
   - Sign In / Providers → Email: wyłączyć, żeby konta powstawały tylko przez Google.
4. Supabase → SQL Editor: uruchomić po kolei migracje z `supabase/migrations/` (albo `npx supabase db push` po `npx supabase link`).
5. Vercel → zmienne środowiskowe dla Production i Preview: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_ACCOUNTS_ENABLED` (na produkcji `false`). `SUPABASE_SECRET_KEY` dopiero w fazie 5.

Zrobione: projekt `tvfiymrlvmjpgrkxoums` (Frankfurt), projekt Google Cloud `world-of-raptors-511212`, Google włączony w Supabase, migracja uruchomiona. Do zrobienia: zmienne w Vercelu.

**Kod (gotowe):** `supabase/` z konfiguracją i migracją, `.env.example`.

### Faza 1: logowanie

**Gotowe:**
- `@supabase/supabase-js` w przeglądarce. Strony kursu zostają statyczne: sesja żyje w przeglądarce, tak jak reszta danych, więc nie potrzeba `@supabase/ssr`, ciasteczek ani `proxy.ts` (w Next.js 16 tak nazywa się dawny `middleware`).
- Przycisk logowania rysuje Google (Google Identity Services) i przekazuje Supabase token z jednorazowym kodem (nonce). Dzięki temu ekran zgody Google pokazuje adres kursu, a nie adres projektu Supabase. Nazwę „World of Raptors” pokaże dopiero po weryfikacji marki w Google, do której potrzebna jest własna domena.
- Strona `/konto`: przycisk logowania, adres e-mail i data założenia konta, wylogowanie. Za flagą `NEXT_PUBLIC_ACCOUNTS_ENABLED`: z wyłączoną flagą strona nie istnieje.

**Do zrobienia:** mały wskaźnik konta w nawigacji.

### Faza 2: model danych

Gotowe: `supabase/migrations/20261009120000_konta.sql` i `20261010120000_limity.sql`. Druga migracja ustawia limit wierszy na konto w każdej tabeli (200 lekcji, 200 obserwacji, 1000 fiszek, 300 odznak), z zapasem względem tego, co kurs ma. Bez limitu jedno konto mogłoby zapełnić bazę i zepsuć synchronizację wszystkim. Każdy wiersz ma `updated_at` (czas zmiany na urządzeniu, rozstrzyga konflikty) i `synced_at` (czas zapisu na serwerze, według niego urządzenia pobierają zmiany). Usunięcia są miękkie (`deleted_at`). Sprawdzone testem w PGlite: scalanie, ograniczenia danych, RLS (osoba B nie czyta, nie zmienia i nie dopisuje danych osoby A; niezalogowani nie widzą nic) i kasowanie danych razem z kontem.

### Faza 3: synchronizacja

**Gotowe** (sprawdzone na prawdziwym koncie, dwie przeglądarki):
- Silnik (`src/lib/synchronizacja.ts`) bez Reacta, testowany na prawdziwych migracjach w PGlite (`src/lib/synchronizacja.test.ts`): pierwsze logowanie z danymi, nowe urządzenie, odznaczenia, starsza i nowsza zmiana offline, odznaki, karta odpowiedziana później, uszkodzony wiersz z serwera, obce konto.
- Jedna przepustka: pobranie zmian z serwera od ostatniego razu, scalenie według tych samych reguł co w bazie, wysłanie każdego wpisu, którego serwer nie ma w obecnej wersji. Urządzenie pamięta wersję każdego wpisu uzgodnioną z serwerem (`wor:synchro:v1`), więc zmiana zrobiona offline albo po wylogowaniu wysyła się przy następnej przepustce, a to, co przyszło z serwera, nie wraca.
- Checklista, fiszki i odznaki miały już wszystko, czego potrzeba (czas zmiany, ślady odznaczeń). Lekcje dostały zapis boczny `wor:postep:slady:v1`: kiedy zmienił się stan lekcji i czy ją odznaczono.
- Kiedy: zaraz po zalogowaniu, kilka sekund po każdej zmianie, po powrocie internetu albo karty i co 5 minut. Bez internetu zmiany czekają.
- Pierwsze logowanie na urządzeniu: komunikat, co z tej przeglądarki doszło do konta.
- **Wylogowanie:** dane zostają na urządzeniu i przestają się synchronizować. Przy ponownym logowaniu na to samo konto scalają się normalnie. Gdy loguje się inne konto, strona `/konto` pyta: dołączyć dane z przeglądarki do tego konta albo usunąć je i pobrać dane konta.
- Strona `/konto` pokazuje stan: kiedy ostatnio zsynchronizowano, brak internetu albo błąd z „Spróbuj ponownie”.

### Faza 4: „Moje niebo” na koncie

Nic osobnego: „Moje niebo”, checklista i fiszki czytają te same magazyny, a synchronizacja je wypełnia. Komunikat o odznace pokazuje się raz na konto, bo `shown` jest na serwerze.

### Faza 5: prywatność i konto

**Kod gotowy** (gałąź `feature/konto-dane`, jeszcze nie na `main`):
- strona konta: „Pobierz moje dane” (plik JSON ze wszystkim, co konto ma na serwerze) i „Usuń konto” (okno potwierdzenia),
- trasa serwerowa `POST /konto/usun`: sprawdza sesję osoby, która pyta, i kasuje tylko jej konto; baza kasuje z nim wszystkie dane. Klucz secret czyta tylko serwer (`SUPABASE_SECRET_KEY`),
- po usunięciu przeglądarka zachowuje postęp i zapomina o koncie.

**Do zrobienia (odłożone 2026-10-10):**
1. **Właścicielka:**
   - skopiować klucz secret z Supabase (API Keys → Secret keys) i dodać go w Vercelu jako `SUPABASE_SECRET_KEY` (Secret, Production),
   - dopisać go do `.env.local` (`code ~/Developer/wor-konta/.env.local`, linia `SUPABASE_SECRET_KEY=…`); nie wklejać go w czacie,
   - dodać drugie konto Google jako testera (Google Auth Platform → Audience → Test users).
2. Test na `localhost` drugim kontem: logowanie, „Pobierz moje dane”, „Usuń konto”. Nie na prawdziwym koncie.
3. Przegląd kodu, potem `main`.
4. Polityka prywatności (strona `/prywatnosc`, projekt do poprawienia przez właścicielkę), link w ekranie zgody Google, przełączenie ekranu zgody na „In production”.

### Faza 6: testy i wdrożenie

- **Testy RLS i scalania na bazie (gotowe):** `npm test` uruchamia migrację na PGlite (`supabase/tests/konta.test.ts`). Docker do lokalnego Supabase nie jest potrzebny.
- **Testy jednostkowe scalania i kolejki:** w Vitest, razem z fazą 3.
- Test logowania na podglądzie z Vercela.
- **Kolejność wdrożenia:**
  1. podgląd z flagą włączoną,
  2. produkcja z flagą wyłączoną,
  3. włączenie flagi i ogłoszenie.

## Poza zakresem

- Moduł Marismas: osobna praca.
- Synchronizacja moich zdjęć (wymagałaby Supabase Storage).
- Inni dostawcy logowania (Apple, Facebook), rankingi i dane widoczne dla innych.
