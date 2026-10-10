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

- `utworzMagazyn` zapisuje obok każdego magazynu czas zmiany każdego wpisu i ślady usunięć. Formaty `v1` i kopie zapasowe się nie zmieniają.
- Wysyłka: wpisy zmienione od ostatniej synchronizacji. Bez sieci czekają i wysyłają się po odzyskaniu połączenia.
- Pobieranie: wiersze z `synced_at` późniejszym niż ostatnie pobranie; nowsza zmiana wygrywa, przy odznakach wcześniejsza data.
- Pierwsze logowanie na urządzeniu: scalenie danych lokalnych z kontem i jeden komunikat, np. „Dodałam do konta 5 lekcji i 12 obserwacji z tego urządzenia”.
- **Wylogowanie:** dane zostają na urządzeniu i przestają się synchronizować. Przy ponownym logowaniu na to samo konto scalają się normalnie. Gdy loguje się inne konto, aplikacja najpierw pyta, czy dołączyć do niego dane z urządzenia.

### Faza 4: „Moje niebo” na koncie

Nic osobnego: „Moje niebo”, checklista i fiszki czytają te same magazyny, a synchronizacja je wypełnia. Komunikat o odznace pokazuje się raz na konto, bo `shown` jest na serwerze.

### Faza 5: prywatność i konto

- **Kod:** strona konta z e-mailem, datą założenia, „Pobierz moje dane” (JSON) i „Usuń konto”. Usunięcie robi trasa serwerowa z kluczem secret: najpierw sprawdza token zalogowanej osoby, potem kasuje konto, a baza kasuje dane razem z nim.
- **Właścicielka:** polityka prywatności, wymagana przez Google przy logowaniu innych osób. Opisuje, jakie dane zbieramy, Supabase jako podmiot przetwarzający, logowanie przez Google i jak usunąć konto. Kod może przygotować projekt strony `/prywatnosc` do przeczytania i poprawienia.

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
