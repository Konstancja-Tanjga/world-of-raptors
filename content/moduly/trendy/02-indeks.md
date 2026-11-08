# Lekcja 2: Indeks, czyli wszystko względem pierwszego roku

Raporty monitoringu rzadko mówią, ile dokładnie jest ptaków. Mówią za to, ile jest ich w porównaniu z pierwszym rokiem badań. Ta lekcja wyjaśnia, dlaczego tak się robi, co znaczy indeks 0,8 albo 1,3, dlaczego wykresy trendów często mają dziwną, logarytmiczną oś i jak przeliczyć „spadek o 15% w 10 lat” na tempo roczne.

## Liczymy tylko część ptaków

Liczący nigdy nie widzi i nie słyszy wszystkich ptaków na powierzchni. Ptak, który akurat milczy, siedzi na gnieździe albo poluje kilometr dalej, jest dla niego niewidzialny. Poradnik GIOŚ zapisuje to prostym wzorem:

**C = p · N**

gdzie **C** to wynik liczenia, **N** to liczba ptaków naprawdę obecnych, a **p** to prawdopodobieństwo, że liczący wykryje ptaka, który tam jest. Jak każde prawdopodobieństwo, p leży między 0 a 1 i w sezonie lęgowym jest prawie zawsze wyraźnie mniejsze od 1.

<margines>

> Poradnik podaje przykład pięciohektarowego płatu lasu: nawet tam nie da się w jednej kontroli wykryć wszystkich terytorialnych samców zięby. Usłyszy się głównie te, które akurat intensywnie śpiewają.

</margines>

Skoro nie znamy p, nie znamy też N. Czy to znaczy, że liczenia są bezwartościowe? Nie, jeśli przyjmiemy jedno założenie.

## Indeks: liczba, która rośnie i maleje razem z populacją

Większość europejskich programów monitoringu przyjmuje, że **wykrywalność p jest stała**: ta sama metoda, te same terminy, godziny i tempo marszu dają co roku tę samą część ptaków. Wtedy wynik liczenia jest **indeksem** (wskaźnikiem) liczebności. Nie mówi, ile jest ptaków, ale jeśli ptaków jest dwa razy więcej, to i wynik będzie średnio dwa razy wyższy.

Żeby to założenie było rozsądne, liczenia muszą być **standaryzowane**: instrukcja określa, kiedy, o której i w jakiej pogodzie wolno liczyć. Poradnik przyznaje, że założenie stałego p bywa krytykowane, ale uważa się, że nie psuje oceny trendu, dopóki wykrywalność nie zmienia się kierunkowo, np. dlatego, że z roku na rok liczą coraz lepsi obserwatorzy.

## Rok bazowy

Bezwzględna wartość indeksu jest w dużej części umowna. Liczy się stosunek między latami. Dlatego wyniki przelicza się względem **roku bazowego**, zwykle pierwszego roku badań:

**indeks w roku T = wynik w roku T / wynik w roku bazowym**

Rok bazowy ma więc zawsze indeks 1,00 (albo 100, jeśli ktoś woli procenty). Indeks 1,30 znaczy „o 30% więcej niż w roku bazowym”, a 0,80 znaczy „o 20% mniej”.

<margines>

<zdjecie src="https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/Singing_Skylark_%2851143368485%29.jpg/960px-Singing_Skylark_%2851143368485%29.jpg?utm_source=commons.wikimedia.org&amp;utm_campaign=imageinfo&amp;utm_content=thumbnail" width="960" height="692" oryginal="2126x1532" alt="Skowronek z nastroszonym czubkiem i otwartym dziobem śpiewa, stojąc na drewnianym słupku" podpis="Skowronek, gatunek z przykładu w poradniku GIOŚ: jego indeks liczono z wyników ponad 11 tysięcy kontroli MPPL z lat 2000–2012" autor="caroline legg" licencja="CC BY 2.0" licencja-url="https://creativecommons.org/licenses/by/2.0" strona="https://commons.wikimedia.org/wiki/File:Singing_Skylark_(51143368485).jpg">
</zdjecie>

</margines>

Poradnik pokazuje to na przykładzie skowronka (*Alauda arvensis*, ang. Eurasian Skylark): 11 169 kontroli na 923 powierzchniach Monitoringu Pospolitych Ptaków Lęgowych w latach 2000–2012. Z modelu statystycznego wychodzi wskaźnik dla każdego roku. W tym historycznym przykładzie wskaźnik z 2008 r. był ok. 1,28 razy wyższy niż z 2000 r., a ten z 2012 r. prawie równy wyjściowemu (ok. 1,01). Sam wskaźnik (ok. 3,8 skowronka na powierzchnię w 2000 r.) nic nie mówi o liczbie skowronków w Polsce. Mówi tylko, jak zmieniała się ich liczba względem 2000 roku.

## Nie wyrzucaj liczeń do kosza

Na wielu powierzchniach liczy się dwa albo trzy razy w sezonie. Kusi, żeby z każdego sezonu wziąć tylko **największy wynik**: „tyle co najmniej było”. Poradnik odradza ten skrót. Kto bierze tylko maksimum z trzech liczeń, wyrzuca do kosza **dwie trzecie wyników**, a one też niosą informację o liczbie ptaków. Model, którego używa monitoring, traktuje kolejne kontrole jak powtórzenia tego samego pomiaru i korzysta ze wszystkich.

W ćwiczeniu w [lekcji 3](03-wahanie-czy-trend.md) zobaczysz obie wersje obok siebie: średnią z trzech i największe z trzech.

## Dlaczego oś bywa logarytmiczna

Populacje zmieniają się zwykle **o procent**, a nie o stałą liczbę ptaków: para wychowuje młode, które same zakładają pary, a spadek o 5% rocznie zabiera każdego roku 5% tego, co zostało. Taka zmiana tworzy krzywą wykładniczą, nie prostą.

<margines>

> PECBMS podaje dwie łatwe do zapamiętania liczby: wzrost o 5% rocznie podwaja populację w ok. 15 lat, a spadek o 5% rocznie zmniejsza ją o połowę w podobnym czasie.

</margines>

Na osi logarytmicznej równe odstępy oznaczają równe **stosunki**: od 0,5 do 1 jest tak samo daleko jak od 1 do 2. Stałe tempo procentowe układa się wtedy w prostą linię. Dlatego najprostszy trend, jakiego używa monitoring, to linia prosta dopasowana do **logarytmów** indeksów, czyli trend wykładniczy. Opisuje go jedna liczba: **mnożnik roczny**. Mnożnik 0,97 znaczy −3% rocznie, a 1,05 znaczy +5% rocznie.

## Jak przeliczyć zmianę na tempo roczne

Raport mówi: „spadek o 15% w ciągu 10 lat”. Ile to rocznie? Nie 1,5%, bo procenty się składają. Trzeba znaleźć mnożnik, który podniesiony do dziesiątej potęgi da 0,85:

- 0,85 do potęgi 1/10 to ok. 0,984, czyli ok. **−1,6% rocznie**.

I w drugą stronę: 3% rocznie przez 20 lat to 1,03 do potęgi 20, czyli ok. 1,81, a więc **wzrost o ok. 81%**, nie o 60%.

<margines>

> Przy małych zmianach (do kilku procent rocznie) prosty podział daje wynik bliski prawdziwemu. Przy dużych myli się coraz bardziej: +10% rocznie przez 10 lat to nie +100%, tylko ok. +159%.

</margines>

## Wszystkie modele są złe

Poradnik kończy rozdział o analizie danych znanym powiedzeniem statystyków: **wszystkie modele są złe, ale niektóre są użyteczne**. Prawdziwej liczby ptaków nie zna nikt. Wskaźniki i trendy są oszacowaniami z prób i z modeli lepiej albo gorzej dopasowanych do danych. Trend wykładniczy to uproszczenie: populacja, która przez pięć lat rosła, a potem spadała, dostanie jedną liczbę, która opisze ją słabo. Mimo to jedna liczba o kierunku i tempie zmian jest niezwykle użyteczna, o ile pamiętamy, że ma swój margines niepewności. O tym marginesie jest następna lekcja.

## Źródła

- Chylarecki P., Sikora A., Cenian Z., Chodkiewicz T. (red.) 2015. *Monitoring ptaków lęgowych. Poradnik metodyczny. Wydanie 2.* GIOŚ, Warszawa, s. 22–23 (C = p · N), 26 (indeksy i standaryzacja), 39–42 (wskaźniki roczne, rok bazowy, maksimum z trzech liczeń, trend wykładniczy, przykład skowronka z MPPL 2000–2012).
- PECBMS. [Species trends: trend classification](https://pecbms.info/trends-and-indicators/species-trends/) (podwojenie i połowa w ok. 15 lat przy 5% rocznie).

## Mini-quiz

1. Co znaczy indeks 0,75?
2. Dlaczego wynik liczenia może być indeksem liczebności, choć liczący nie widzi wszystkich ptaków?
3. Ile to rocznie: wzrost o 21% w ciągu dwóch lat?

<details><summary>Odpowiedzi</summary>

1. Że w danym roku wynik był o 25% niższy niż w roku bazowym.
2. Bo przy standaryzowanych liczeniach zakłada się, że wykrywalność p jest co roku taka sama, więc wynik rośnie i maleje proporcjonalnie do prawdziwej liczby ptaków.
3. Ok. 10% rocznie, bo 1,1 · 1,1 = 1,21.
</details>
