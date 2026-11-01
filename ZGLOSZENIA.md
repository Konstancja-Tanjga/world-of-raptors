# Zgłoś poprawkę: uwagi od zalogowanych osób

Zalogowana osoba wskazuje miejsce w kursie, które trzeba poprawić, dodać albo usunąć, i wysyła krótką uwagę. Uwaga przychodzi mailem do Gmaila, z etykietą `Feedback_WorldofRaptors`. Nic nie trafia do repozytorium: każdą zmianę w kursie robię sama, po przeczytaniu maila.

## Zasady

- **Tylko zalogowani.** Przycisk widzą osoby z kontem (Google). Za flagą `NEXT_PUBLIC_ACCOUNTS_ENABLED`, jak reszta kont.
- **Treść tylko w mailu.** W Supabase zostaje licznik: kto i kiedy wysłał, bez treści. Służy wyłącznie do limitu dziennego.
- **Limit:** 10 zgłoszeń na konto w ciągu doby i 2000 znaków na zgłoszenie.
- **Tylko tekst.** Bez załączników i zrzutów ekranu. Mail to czysty tekst, bez HTML, więc nic z treści nie wykona się ani nie wyświetli jako kod.
- **Nadawcę wiadomo z sesji.** Adres osoby bierze się z jej konta Google, nie z pola formularza.
- **Wskazać można tylko treść kursu.** Prywatne rzeczy osoby (notatki z checklisty, jej zdjęcia, „Moje niebo”) są wyłączone, żeby nie trafiły do maila przypadkiem.

## Jak to wygląda

1. „Zgłoś poprawkę” w stopce, na każdej stronie. Bez pływającego przycisku i bez przycisku pod lekcjami.
2. Kliknięcie włącza **tryb wskazywania**. U góry jest pasek „Wskaż miejsce, którego dotyczy zgłoszenie” z przyciskami „Bez wskazywania” (formularz dla całej strony) i „Anuluj”; działa też Escape. Na stronach z prywatnymi danymi (checklista, „Moje niebo”, konto) wskazywania nie ma: formularz otwiera się od razu. Pod kursorem podświetla się najbliższy fragment treści: akapit, nagłówek, zdjęcie z podpisem, wiersz tabeli, pytanie quizu albo cecha na planszy gatunku. Z klawiatury Tab przechodzi po fragmentach, a Enter wybiera. Na telefonie fragment wybiera się dotknięciem.
3. Po wyborze otwiera się formularz (`Dialog` Big Hat; okienka przypiętego do fragmentu system nie ma, zob. `DS-GAPS.md`):
   - rodzaj: Popraw / Dodaj / Usuń / Inne,
   - treść,
   - podgląd wskazanego fragmentu.
4. Skrót: zaznaczony tekst i kliknięcie przycisku od razu otwierają formularz z cytatem.
5. Po wysłaniu pojawia się komunikat „Dziękuję, zgłoszenie dotarło”. Przy błędzie albo po przekroczeniu limitu formularz pokazuje komunikat (`StateBlock`), a tekst zostaje w polu.

## Mail

```
Temat: [Feedback_WorldofRaptors] Popraw: Kania ruda — Sylwetka w locie

Rodzaj: Popraw
Strona: Kania ruda
Sekcja: Sylwetka w locie
Wskazany fragment (akapit):
  „Ogon głęboko wcięty, rdzawy…”

Zgłoszenie:
  …

Prosto do miejsca: https://world-of-raptors.vercel.app/…#:~:text=…
Od: osoba@gmail.com
Wysłano: 1 listopada 2026 22:30
```

- **Reply-To** to adres osoby, więc odpowiada się zwykłym „Odpowiedz”.
- **Link „prosto do miejsca”** (tzw. text fragment) przewija stronę do wskazanego zdania i je podświetla. Gdy przeglądarka go nie obsługuje, otwiera stronę na sekcji, jeśli fragment leży pod nagłówkiem `##` (link ma wtedy też jego kotwicę), a w przeciwnym razie na początku strony.
- **Przy zdjęciu** mail podaje adres pliku (miniatura z Commons albo własne zdjęcie kursu) i tekst podpisu, a w nim zwykle autora.

## Architektura

```
przeglądarka (token sesji Supabase)
  → POST /zgloszenie  (trasa serwerowa, wzorem /konto/usun)
      1. token → supabase.auth.getUser            401 bez sesji
      2. walidacja: rodzaj, długość, adres strony z kursu   400
      3. wiersz w feedback_log (RLS: tylko swój; wyzwalacz: 10 na dobę)   429 po limicie
      4. mail przez Resend (czysty tekst)         502 przy błędzie wysyłki (zgłoszenie i tak się liczy),
                                                  503, gdy Resend odmawia (zły klucz albo adres)
```

- **Resend** wysyła maila. Bez własnej domeny można wysyłać tylko na adres właściciela konta Resend, a tu odbiorca jest jeden (do sprawdzenia przy zakładaniu konta).
- **Zmienne tylko po stronie serwera,** bez `NEXT_PUBLIC_`:
  - `RESEND_API_KEY`,
  - `FEEDBACK_EMAIL_TO`,
  - opcjonalnie `FEEDBACK_EMAIL_FROM` (domyślnie testowy adres Resend).

  Bez nich trasa odpowiada „Zgłoszenia nie są jeszcze skonfigurowane na serwerze” (503).

  Właścicielka wpisuje je sama w Vercelu i w `.env.local`.
- **Tabela `feedback_log`:** `id`, `user_id` (kasowany razem z kontem), `created_at`. Wiersze starsze niż doba nie są do niczego potrzebne; usuwa je ten sam wyzwalacz przy następnym zgłoszeniu z tego konta. Blokada na koncie (druga migracja) sprawia, że zgłoszenia wysłane w tej samej chwili czekają na siebie, więc limitu nie da się obejść równoległymi wysyłkami. Konto może tylko dodać wiersz: nie czyta, nie zmienia i nie usuwa, więc nie zresetuje sobie limitu. Zgłoszenie, którego mail się nie wysłał, też się liczy.

## Pliki

| Plik | Co |
|---|---|
| `supabase/migrations/20261101120000_zgloszenia.sql` | `feedback_log`, RLS, wyzwalacz limitu i sprzątania |
| `supabase/migrations/20261101130000_zgloszenia_blokada.sql` | blokada na koncie w wyzwalaczu (po przeglądzie kodu) |
| `supabase/tests/konta.test.mts` | RLS i limit na PGlite |
| `src/lib/zgloszenie.ts` + `.test.ts` | walidacja, temat i treść maila, link do miejsca (czyste funkcje) |
| `src/app/zgloszenie/route.ts` | trasa POST |
| `src/components/zgloszenie/` | przycisk, tryb wskazywania (`wskazywanie.ts`: co można wskazać, opis fragmentu, sekcja z najbliższego `h2`), formularz w `Dialog` |
| `Stopka` | wpis „Zgłoś poprawkę” |
| `src/components/AppFrame.tsx` | ładuje przycisk leniwie i tylko przy włączonych kontach |
| `.env.example`, `CLAUDE.md`, `DS-GAPS.md` | zmienne, opis, luka w Big Hat |

## Kolejność

Kod jest gotowy (gałąź `feature/zglos-poprawke`), sprawdzony testami, buildem i w przeglądarce z testową sesją. Brakuje prawdziwej wysyłki, do której potrzebne są kroki właścicielki.

1. **Właścicielka:**
   - konto w Resend (logowanie Gmailem, na który mają przychodzić maile) i klucz API,
   - w Gmailu etykieta `Feedback_WorldofRaptors` i filtr: temat zawiera `[Feedback_WorldofRaptors]` → zastosuj etykietę (opcjonalnie: pomiń skrzynkę odbiorczą).
2. **Kod** na gałęzi `feature/zglos-poprawke`:
   - migracja i testy,
   - `zgloszenie.ts`,
   - trasa,
   - tryb wskazywania i formularz.
3. **Właścicielka:** obie migracje w Supabase (SQL Editor, po kolei) i zmienne w Vercelu.
4. **Test na localhost:**
   - zgłoszenie dociera z etykietą,
   - link prowadzi do miejsca,
   - jedenaste zgłoszenie w ciągu doby dostaje odmowę,
   - niezalogowana osoba nie widzi przycisku.
5. **Przegląd i PR.**

## Poza zakresem na teraz

- **Zgłoszenia od innych osób** wymagają przełączenia ekranu zgody Google na „In production” (Google Auth Platform → Audience → Publish app). Decyzja właścicielki z 1.11.2026: bez polityki prywatności i bez notki o danych na stronie konta.
- Zrzuty ekranu i załączniki.
