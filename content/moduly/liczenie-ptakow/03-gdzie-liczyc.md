# Lekcja 3: Gdzie liczyć: powierzchnie próbne i losowanie

Najbardziej kusi, żeby liczyć tam, gdzie ptaków jest dużo: przy znanym stawie, na skraju ulubionego lasu. Taki wynik mówi jednak tylko o tym stawie i o tym lesie. Ta lekcja pokazuje, jak ornitolodzy wybierają miejsca do liczenia, żeby z kilkudziesięciu kwadratów powiedzieć coś o całym kraju, i dlaczego w tym wyborze najważniejszy jest los.

## Najpierw: kogo właściwie liczę?

Zanim ktokolwiek wyjdzie w teren, trzeba ustalić **populację docelową**. Poradnik GIOŚ każe ją opisać trzema cechami:

- **co** jest liczone (pary lęgowe? wszystkie samce z terytorium? zajęte gniazda?),
- **kiedy** (cały sezon? tylko jego pierwsza połowa?),
- **gdzie** (dokładne granice obszaru).

To trudniejsze, niż się wydaje. Poradnik podaje przykład słowika rdzawego: w najlepszych siedliskach nawet blisko połowa samców z terytorium może nie mieć partnerki, a część z nich po kilkunastu dniach odlatuje szukać szczęścia gdzie indziej. Czy to część populacji? U wielu gatunków są też ptaki bez terytorium (po angielsku *floaters*), które krążą po okolicy. Jednej dobrej odpowiedzi nie ma: definicja zależy od celu, a potem decyduje o terminach kontroli i o tym, co się zapisuje. Jedną z możliwości jest liczenie wszystkich samców z terytorium w pierwszej połowie sezonu, zanim ptaki zaczną się przemieszczać.

## Siatka kwadratów

<margines>

> Siatki kwadratów 1, 2, 5 i 10 km w polskim układzie współrzędnych 1992 udostępnia do pobrania Monitoring Ptaków Polski. Losowanie kwadratów da się zrobić w arkuszu kalkulacyjnym albo w darmowym programie QGIS (poradnik opisuje to krok po kroku).

</margines>

Poradnik gorąco poleca prosty pomysł: nałożyć na obszar badań **siatkę równych kwadratów** (1 × 1 km, 2 × 2 km, 10 × 10 km) i traktować każde oczko jako możliwą **powierzchnię próbną**. Wszystkie mają tę samą wielkość i łatwo je odnaleźć na mapie i w GPS.

Wylosowany kwadrat nie musi być przeczesany w całości. Często służy tylko do wskazania, **gdzie** liczyć mniej pracochłonną metodą. Przykłady z poradnika:

- w Monitoringu Pospolitych Ptaków Lęgowych w kwadracie 1 × 1 km wyznacza się dwie trasy po 1 km ([lekcja 4](04-jak-liczyc.md)),
- w monitoringu dzięciołów w kwadracie 2 × 2 km wyznacza się 12 punktów nasłuchu,
- można też liczyć z czterech punktów w narożnikach kwadratu.

### Operat losowania

Zbiór wszystkich kwadratów, spośród których się losuje, to **operat losowania** (ang. *sampling frame*). Poradnik podkreśla dwie rzeczy. Po pierwsze, operat trzeba naprawdę narysować na mapie, zanim się losuje: które kwadraty do niego należą, a które nie. Po drugie, wyniki dotyczą **tylko** terenu z operatu. Jeśli wykluczę z losowania kwadraty niedostępne albo „nieciekawe”, nic nie wiem o tym, co się w nich dzieje.

## Trzy sposoby losowania

| Sposób | Jak | Kiedy dobry |
|---|---|---|
| **Proste** | każdy kwadrat ma tę samą szansę; losuje się bez zwracania | najprostszy punkt wyjścia |
| **Warstwowe** | dzielę kwadraty na kilka grup (np. leśne i nieleśne) i losuję osobno w każdej | gdy grupy wyraźnie się różnią; zwykle daje dokładniejsze wyniki; najlepiej 2–4 warstwy |
| **Systematyczne** | co piąty kwadrat w rzędzie, co trzeci w kolumnie, od losowo wybranego startu | gdy potrzebny jest równomierny rozkład po terenie |

Przy losowaniu warstwowym warstwy dobiera się tak, by kwadraty **wewnątrz** warstwy były do siebie podobne, a warstwy **między sobą** jak najbardziej różne. Przykład z poradnika: kwadraty z lesistością powyżej 30% i pozostałe. Ptaki leśne będą w nich miały zupełnie inne zagęszczenia, więc osobne losowanie poprawia i reprezentatywność, i precyzję.

## Sto samców i dziesięć kwadratów

Poradnik pokazuje losowanie proste na przykładzie, który warto prześledzić. Obszar 10 × 10 km podzielono na 100 kwadratów 1 × 1 km. Mieszka na nim 100 śpiewających samców pewnego gatunku, rozmieszczonych losowo, średnio jeden na kwadrat. Wylosowano 10 kwadratów.

- W wylosowanych kwadratach znaleziono 11 samców, czyli średnio 1,1 na km².
- Oszacowanie dla całego obszaru: 1,1 · 100 km² = **110 samców**, z błędem standardowym ok. **33**.
- Prawdziwa liczba, 100, mieści się spokojnie w granicach tego błędu.

Najciekawsze jest to, że w próbie nie było ani jednego z najgęściej zasiedlonych kwadratów (z 4–5 ptakami), a w 4 z 10 kwadratów nie było żadnego ptaka. Intuicja podpowiada, że taka próba jest „nietypowa”, a jednak dała dobre oszacowanie. Na tym polega siła losowania: nie trzeba trafiać w ptaki, trzeba nie wybierać na oko.

## Wiele małych czy kilka dużych?

Za te same pieniądze mogę liczyć na kilku dużych powierzchniach albo na wielu małych o podobnej łącznej wielkości. Poradnik zdecydowanie radzi to drugie, z dwóch powodów:

1. **Mniejsze ryzyko pecha.** Przy kilku powierzchniach jedna nietypowa może wypaczyć cały wynik. W dużej próbie takie skrajności giną wśród reszty.
2. **Większa precyzja.** Błąd standardowy oszacowania maleje z **liczbą** powierzchni, a ich wielkość nie ma na niego bezpośredniego wpływu.

Dlatego Monitoring Pospolitych Ptaków Lęgowych liczył w ostatnich latach na ok. 900 losowo wybranych powierzchniach po 1 km² w całej Polsce, a nie na kilku dużych (według strony OTOP). Poradnik dodaje, że lepiej wydać zaoszczędzony czas na kolejną powierzchnię niż na bardzo dokładne, a w praktyce tylko pozornie lepsze liczenie jednej.

## A drapieżniki?

Według opisu Monitoringu Ptaków Polski na stronie OTOP grupy gatunków, takie jak sowy czy ptaki drapieżne, też liczy się na wylosowanych powierzchniach próbnych, tylko dobranych do wielkości ich rewirów. Monitoring Ptaków Drapieżnych, uruchomiony w 2007 roku dla 11 rozpowszechnionych gatunków, liczył je według publikacji o programie na ok. 40 powierzchniach 10 × 10 km, bo w kwadracie 1 × 1 km zmieściłby się co najwyżej kawałek jednego rewiru. Dla rzadkich gatunków prowadzi się natomiast cenzusy całego znanego areału: kontroluje się znane stanowiska, dawne i obecne, i szuka nowych. Osobne programy mają m.in. orzeł przedni, orlik grubodzioby i rybołów. To jedna z niewielu sytuacji, w których monitoring zbliża się do cenzusu.

## Rozpowszechnienie: tańsza miara

Zamiast liczyć ptaki, można zapisać tylko, **czy gatunek jest w kwadracie**. Odsetek zasiedlonych kwadratów to **rozpowszechnienie** (ang. *occupancy*). Kontrola jest prostsza i szybsza, więc da się objąć większy obszar.

Poradnik zauważa, że granica między rozpowszechnieniem a liczebnością jest płynna. Gdy kwadrat ma mniej więcej wielkość jednego terytorium, odsetek zasiedlonych kwadratów prawie równa się liczbie par: tak jest z dzięciołem czarnym w kwadratach 2 × 2 km albo 1 × 1 km. Zbyt duże kwadraty są za to mało czułe: w skrajnym przypadku, gdy powierzchnią jest cały park narodowy, rozpowszechnienie każdego gatunku, który tam w ogóle gniazduje, wynosi 100%. Dla gatunków z załącznika I Dyrektywy Ptasiej poradnik proponuje kwadraty od 250 × 250 m do 5 × 5 km, najchętniej 1 × 1 albo 2 × 2 km.

Rozpowszechnienie też ma swoje fałszywe zera: kwadrat, w którym nie stwierdzono gatunku, nie musi być pusty ([lekcja 2](02-wykrywalnosc.md)).

## Źródła i dalsza nauka
- Chylarecki P., Sikora A., Cenian Z., Chodkiewicz T. (red.) 2015. *Monitoring ptaków lęgowych. Poradnik metodyczny. Wydanie 2.* GIOŚ, Warszawa, s. 27–35 (rozpowszechnienie, populacja docelowa, wybór powierzchni, ramki „Dużo małych powierzchni czy kilka dużych?” i „Wskazanie powierzchni próbnych przez losowanie proste”)
- [OTOP: Monitoring Ptaków Polski](https://otop.org.pl/naszeprojekty/liczymy/monitoring-ptakow-polski/): struktura programu, powierzchnie próbne i cenzusy rzadkich gatunków
- [OTOP: Monitoring Pospolitych Ptaków Lęgowych](https://otop.org.pl/naszeprojekty/liczymy/monitoring-ptakow-polski/mppl/): ok. 900 losowych powierzchni 1 km²
- Thompson S.K. 2012. *Sampling*. Wiley (podręcznik metod losowania prób)

## Mini-quiz
1. Wykluczyłam z losowania kwadraty bez dróg. Czego nie mogę potem powiedzieć?
2. Kiedy losowanie warstwowe daje lepszy wynik niż proste?
3. Co bardziej zmniejsza błąd oszacowania: dwa razy większe powierzchnie czy dwa razy więcej powierzchni?

<details><summary>Odpowiedzi</summary>

1. Niczego o ptakach w tych kwadratach: wyniki dotyczą tylko terenu z operatu losowania.
2. Gdy kwadraty da się podzielić na grupy wyraźnie różne (np. leśne i nieleśne), a podobne wewnątrz grupy.
3. Dwa razy więcej powierzchni: błąd zależy od ich liczby, nie od wielkości.
</details>
