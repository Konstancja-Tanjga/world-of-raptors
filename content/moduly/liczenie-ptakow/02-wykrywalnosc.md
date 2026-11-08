# Lekcja 2: Wykrywalność: ptaki, których nie słychać

Wynik liczenia to zawsze tylko część ptaków, które naprawdę są na powierzchni, a nawet najlepsza obserwatorka nie wie, jaka to część tej konkretnej nocy. W tej lekcji poznajesz jedno proste równanie, sprawdzasz je na wirtualnych puszczykach i liczysz, ile razy trzeba wrócić z pustymi rękami, żeby uczciwie napisać „tego gatunku tu nie ma”.

## C = p · N

Poradnik GIOŚ zapisuje to tak: wynik liczenia **C** to tylko część **N**, czyli ptaków rzeczywiście obecnych na powierzchni.

**C = p · N**

**p** to prawdopodobieństwo, że obecnego ptaka wykryję podczas jednej kontroli. Jak każde prawdopodobieństwo, leży między 0 a 1, a w sezonie lęgowym prawie zawsze wyraźnie poniżej 1. Gdybym znała p, mogłabym odwrócić równanie: **N = C / p**. Słyszę 6 puszczyków przy p = 0,5, więc jest ich mniej więcej 12.

Dwie uwagi z poradnika:

- p zawsze dotyczy **konkretnej powierzchni i konkretnego czasu kontroli**. Wykrywalność na hektarze i na kilometrze kwadratowym to dwie różne liczby.
- Prawie pełna wykrywalność zdarza się głównie **poza sezonem lęgowym**: gęsi na polu, kaczki na jeziorze, siewkowce na mule. Wtedy policzenie wszystkich jest problemem technicznym, nie losowym (to świat [liczenia stad w B9](../siewkowce/07-liczenie-obraczki-etyka.md) i [przelotu w B8](../punkt-obserwacyjny/01-jak-liczy-sie-przelot.md)). W sezonie lęgowym ptaki siedzą w rozproszeniu, w gęstej roślinności, i niepełna wykrywalność jest normą.

## Rzut monetą: dwadzieścia wodniczek

<margines>

<zdjecie src="https://thumb.wikimedia.org/wikipedia/commons/thumb/8/84/Aquatic_warbler_%28Acrocephalus_paludicola%29_02.jpg/960px-Aquatic_warbler_%28Acrocephalus_paludicola%29_02.jpg?utm_source=commons.wikimedia.org&amp;utm_campaign=imageinfo&amp;utm_content=thumbnail" width="960" height="657" oryginal="2799x1915" alt="Mały brązowy ptak z kreskowanym grzbietem siedzi na źdźble wśród wysokich, płowych traw" podpis="Wodniczka w turzycach: samiec, który nie śpiewa, jest dla liczącego prawie niewidzialny" autor="Bouke ten Cate" licencja="CC BY-SA 4.0" licencja-url="https://creativecommons.org/licenses/by-sa/4.0" strona="https://commons.wikimedia.org/wiki/File:Aquatic_warbler_(Acrocephalus_paludicola)_02.jpg">
</zdjecie>

</margines>

Poradnik ilustruje to przykładem, który warto zapamiętać. Na małej powierzchni ma terytoria 20 samców wodniczki *Acrocephalus paludicola* (ang. Aquatic Warbler). Samiec, który nie śpiewa, tylko żeruje w turzycach, jest praktycznie nie do wykrycia, więc wykrycie zależy od tego, czy zaśpiewa w czasie kontroli. Załóżmy, że szansa wynosi p = 0,5.

Średnio usłyszę 10 samców (20 · 0,5). Ale pojedyncze liczenie to jak **20 rzutów monetą**: wynik zależy od przypadku, nie od obserwatorki. Autorzy poradnika „wykonali” 1000 wirtualnych kontroli i pokazali, że jedno liczenie może się skończyć prawie każdym wynikiem od ok. 3 do 17 samców. Najczęściej wychodzi 8–11, ale 5 albo 16 też się zdarzają, a 19 albo 20 praktycznie nigdy. Nawet przy p = 0,9, czyli u świetnie przygotowanej obserwatorki w najlepszej porze, może się trafić kontrola z zaledwie 13 samcami.

Wynik liczenia kształtują więc **dwa źródła zmienności**:

1. To, co zmienia **średnie p**: doświadczenie obserwatorki, termin, godzina, pogoda. Na to można wpływać: ujednolicać warunki, szkolić się, liczyć w najlepszej porze.
2. **Czysty przypadek** wokół tego średniego p. Tego nie da się usunąć żadną metodą. Trzeba o nim wiedzieć. Poradnik pisze wprost, że obserwatorzy doskonali, którzy za każdym razem wykrywają 90% ptaków, nie istnieją.

### Kogo słychać, a kogo nie

Różnice między gatunkami są ogromne. Według poradnika samice przepiórki, derkacza czy wodniczki są podczas zwykłych kontroli wykrywane prawie nigdy. U wielu ptaków śpiewających wykrywalność samca wynosi ok. 0,6–0,7, a u skrytych i cichych gatunków poniżej 0,2. Grubodzioba na powierzchniach 1 km² szwajcarskiego monitoringu wykrywano podczas kontroli tylko w ok. 16% przypadków.

U sów i drapieżników jest podobnie. Samiec puszczyka, który w marcową noc poluje w milczeniu, jest dla liczącej tak samo nieobecny jak ten, którego nie ma. Wysiadująca samica błotniaka stawowego siedzi w trzcinie i nie widać jej wcale.

## Sprawdź sama: noc na powierzchni

Poniżej jest powierzchnia 2 × 2 km z ukrytą liczbą rewirów puszczyka. Wybierz warunki i rób kolejne nocne kontrole. Słyszysz tylko te samce, które akurat się odezwały. Kiedy uznasz, że wiesz dość, wpisz, ile według Ciebie jest rewirów. Potem zobaczysz wszystkie i to, jak rozłożyłoby się 1000 wirtualnych kontroli.

<ile-ich-jest data-wariant="kontrole">
</ile-ich-jest>

Zwróć uwagę na dwie liczby: najlepszy pojedynczy wynik i to, ilu samców usłyszałaś **choć raz** we wszystkich kontrolach. Druga zwykle jest bliższa prawdy. Dlatego programy monitoringu każą wracać na powierzchnię kilka razy w sezonie.

### Puszczyk — *Strix aluco*

Puszczyk *Strix aluco* (ang. Tawny Owl) jest dobrym bohaterem tej lekcji, bo liczy się go prawie wyłącznie uchem. Samiec zaznacza rewir pohukiwaniem, a samica woła „kju-wik” (posłuchaj ich osobno i w duecie w [A8](../swiat-sow/05-glosy-i-sylwetki.md)). Toki trwają od późnej zimy do wiosny, a puszczyk odzywa się też jesienią ([B5](../sowy/02-jak-rozpoznawac.md)). Każdy samiec ma przy tym własną wersję pieśni, co badacze wykorzystują, by odróżniać sąsiednie ptaki. Ta sama sowa w wietrzną noc może jednak milczeć do rana.

<glos data-id="puszczyk/samiec">
</glos>

## Ile kontroli, żeby wiedzieć, że gatunku nie ma?

„Wykrywalność” ma w literaturze dwa znaczenia. Pierwsze to p, szansa wykrycia **jednego ptaka**. Drugie to szansa wykrycia **gatunku**, czyli choć jednego z jego przedstawicieli na powierzchni. Jeśli jest tam N ptaków i każdy ma to samo p:

**D = 1 − (1 − p)^N**

Przykład z pójdźką *Athene noctua* (ang. Little Owl). Jeden samiec, który odzywa się podczas kontroli z szansą 0,3, daje D = 0,3. Trzy takie samce na powierzchni dają D = 1 − 0,7³ ≈ 0,66: choć jednego usłyszę w dwóch kontrolach na trzy.

Jeśli wracam n razy, szansa, że gatunek obecny na powierzchni choć raz się pokaże, rośnie:

**K = 1 − (1 − D)^n**

Dla D = 0,3: po jednej kontroli 30%, po trzech ok. 66%, po sześciu ok. 88%.

<margines>

> Poradnik podaje też wzór, który uwzględnia, jak bardzo spodziewałam się gatunku przed liczeniem (Wintle i in. 2005). Im pewniejsza byłam, że gatunek tu jest, tym więcej pustych kontroli potrzeba, żeby zmienić zdanie: przy D = 0,1 i wcześniejszej szansie spotkania 0,8 wychodzi ok. 41 kontroli, przy D = 0,3 ok. 12.

</margines>

Stąd odpowiedź na pytanie z tytułu. Żeby mieć np. 95% pewności, że **wykryłabym gatunek, gdyby tu był**, potrzebuję tylu pustych kontroli z rzędu, by K przekroczyło 0,95. Dla D = 0,3 to **9 kontroli**, a dla rzadko odzywającego się gatunku z D = 0,1 aż 29. Sprawdź to na suwakach:

<ile-ich-jest data-wariant="powroty">
</ile-ich-jest>

### Fałszywe zera

Miejsce, gdzie gatunku **nie stwierdzono**, to nie to samo co miejsce, gdzie go **nie ma**. W literaturze mówi się o fałszywych zerach (*false zeros*, *false absences*). Poradnik wymienia typowe błędy lokalnych programów: milczące założenie, że wykrywa się wszystko, i bazy danych, które nie odróżniają kontroli z wynikiem zero od braku kontroli. W notatniku to dwie różne rzeczy: „byłam, słuchałam 10 minut, nic” i „nie byłam”.

## Czy niska wykrywalność psuje monitoring?

Mniej, niż mogłoby się wydawać. Według poradnika większość programów monitoringu przyjmuje, że p jest **mniej więcej stałe z roku na rok**. Wtedy surowe wyniki liczeń są dobrymi wskaźnikami i trendy z nich policzone są wiarygodne (to myśl z [lekcji 1](01-cenzus-i-monitoring.md)). Kłopot zaczyna się, gdy p zmienia się kierunkowo, na przykład dlatego, że obserwatorzy z roku na rok są coraz lepsi.

Coraz częściej wykrywalność szacuje się więc z samych danych. Wymaga to **powtarzanych liczeń**: jeśli na tej samej powierzchni w krótkim czasie liczę kilka razy, to z tego, jak wyniki się różnią, da się oszacować p. Na tym opierają się modele rozpowszechnienia (*occupancy*) i modele N-mixture. Dlatego dwie albo trzy kontrole w sezonie to nie marnowanie czasu: zmniejszają też szansę, że trafią mi się same nietypowe wyniki.

## Źródła i dalsza nauka
- Chylarecki P., Sikora A., Cenian Z., Chodkiewicz T. (red.) 2015. *Monitoring ptaków lęgowych. Poradnik metodyczny. Wydanie 2.* GIOŚ, Warszawa, s. 22–26 (wykrywalność, ramka „Konsekwencje niepełnej wykrywalności”, ryc. 2.1–2.4, wzory 1–4)
- Kéry M., Schmidt B.R. 2008. Imperfect detection and its consequences for monitoring for conservation. *Community Ecology* 9: 207–216 (cytowane w poradniku)
- Wintle B.A., Kavanagh R.P., McCarthy M.A., Burgman M.A. 2005. Estimating and dealing with detectability in occupancy surveys for forest owls and arboreal marsupials. *Journal of Wildlife Management* 69: 905–917 (cytowane w poradniku; przykład z sowami)
- MacKenzie D.I. i in. 2006. *Occupancy Estimation and Modeling*. Academic Press (modele rozpowszechnienia)

## Mini-quiz
1. Słyszę 4 samce przy p = 0,5. Ilu samców mogę się spodziewać na powierzchni?
2. Dlaczego nawet najlepsza obserwatorka nie usłyszy co noc tej samej liczby puszczyków?
3. Gatunek wykrywam w 3 kontrolach na 10. Czy po trzech pustych nocach mogę napisać, że go nie ma?

<details><summary>Odpowiedzi</summary>

1. Ok. 8 (N = C / p = 4 / 0,5).
2. Bo każdy samiec odzywa się albo nie z pewną szansą, jak w rzucie monetą: wynik jednej kontroli zależy od przypadku, nie tylko od niej.
3. Nie. Po trzech kontrolach wykryłabym go, gdyby był, tylko z szansą ok. 66%. Do 95% pewności potrzeba 9 pustych kontroli.
</details>
