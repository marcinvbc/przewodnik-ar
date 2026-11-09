/*
 * Przykładowy scenariusz: Biologia, klasa 7 – „Budowa serca i układu krwionośnego. Krwiobieg mały i duży”.
 * Zgodny z podstawą programową (2017 z późn. zm.), dział III.4 „Układ krążenia”.
 * Używany jako: (1) przykład do wczytania w generatorze, (2) baza odpowiedzi „AI pokazowego” w trybie demo.
 * Ścieżki plików są względne wobec folderu lekcje/.
 */
const P = "pokazowa-biologia/";
const m = (rodzaj, nazwa, plik, extra = {}) => ({ id: "m-" + plik.replace(/\W+/g, "-"), rodzaj, nazwa, url: P + plik, zrodlo: "biblioteka", ...extra });

export const BIBLIOTEKA = {
  obrazy: [
    m("obraz", "Budowa serca – przekrój", "budowa-serca.jpg", { svg: P + "budowa-serca.svg", w: 1900, h: 1200, slowa: ["serc", "budow", "przekr", "przedsion", "komor", "zastaw"] }),
    m("obraz", "Budowa serca – do podpisania", "budowa-serca-bez-podpisow.jpg", { svg: P + "budowa-serca-bez-podpisow.svg", w: 1900, h: 1200, slowa: ["podpis", "kartk", "ćwicz"] }),
    m("obraz", "Krwiobieg mały i duży", "krwiobiegi.jpg", { svg: P + "krwiobiegi.svg", w: 1800, h: 1520, slowa: ["krwiobieg", "obieg", "krąż", "płuc", "schemat"] }),
    m("obraz", "Naczynia krwionośne – porównanie", "naczynia-porownanie.jpg", { svg: P + "naczynia-porownanie.svg", w: 1800, h: 940, slowa: ["naczyni", "tętnic", "żył", "włosowat"] }),
    m("obraz", "Skład krwi", "sklad-krwi.jpg", { svg: P + "sklad-krwi.svg", w: 1800, h: 960, slowa: ["krew", "krwi", "krwink", "osocz", "płytk", "skład"] }),
    m("obraz", "Cykl pracy serca", "cykl-pracy-serca.jpg", { svg: P + "cykl-pracy-serca.svg", w: 1840, h: 920, slowa: ["cykl", "skurcz", "rozkurcz", "prac", "faz"] }),
  ],
  modele: [
    m("model", "Serce z naczyniami (bije)", "serce.glb", { slowa: ["serc", "bij", "całe", "zewn", "wieńc"] }),
    m("model", "Przekrój serca – przepływ krwi", "serce-przekroj.glb", { slowa: ["przekr", "wnętrz", "jam", "przedsion", "komor", "zastaw", "przepływ"] }),
    m("model", "Tętnica, żyła i naczynia włosowate", "naczynia.glb", { slowa: ["naczyni", "tętnic", "żył", "włosowat", "ścian"] }),
    m("model", "Składniki krwi w powiększeniu", "krew.glb", { slowa: ["krew", "krwink", "erytrocyt", "leukocyt", "płytk", "osocz"] }),
  ],
  filmy: [m("film", "Jak pracuje serce? (animacja, 42 s)", "jak-pracuje-serce.mp4", { w: 1280, h: 720, slowa: ["film", "cykl", "prac", "krwiobieg", "animac"] })],
  pliki: [
    m("plik", "Karta pracy – serce i krążenie (Word)", "karta-pracy-serce.docx", { typPliku: "docx" }),
    m("plik", "Pomiary tętna – arkusz (Excel)", "pomiary-tetna.xlsx", { typPliku: "xlsx" }),
  ],
};
const B = BIBLIOTEKA, ob = n => B.obrazy.find(x => x.nazwa.startsWith(n)), md = n => B.modele.find(x => x.nazwa.startsWith(n));

export const WYKRES_TETNO = {
  id: "m-wykres-tetno", rodzaj: "wykres", nazwa: "Tętno przed i po wysiłku", zrodlo: "plik",
  dane: { typ: "slupkowy", tytul: "Tętno przed i po wysiłku (średnia klasy)", os: "uderzenia na minutę",
    etykiety: ["w spoczynku", "po 20 przysiadach", "po 3 min odpoczynku"],
    serie: [{ nazwa: "średnia klasy", wartosci: [75.3, 120.6, 81.4] }] },
};

export const SCENARIUSZ_SERCE = {
  tytul: "Budowa serca i układu krwionośnego. Krwiobieg mały i duży",
  szablon: "konspekt",
  szkola: { typ: "sp48", nazwa: "Szkoła Podstawowa", klasa: 7 },
  przedmiot: "biologia", dzial: "Układ krążenia", temat: "Budowa serca i układu krwionośnego – krwiobieg mały i duży", czas: 45,
  wymagania: ["III.4.1", "III.4.2", "III.4.6"],
  celeOgolne: ["I", "II", "V"],
  sekcje: {
    cele: {
      tresc: `Cel ogólny: Uczeń poznaje budowę i działanie serca oraz drogę krwi w krwiobiegu małym i dużym.

Cele szczegółowe – uczeń:
• rozpoznaje na modelu, schemacie i rysunku przedsionki, komory, zastawki, aortę, pień płucny i żyły główne;
• wyjaśnia, dlaczego krew w sercu płynie tylko w jedną stronę (rola zastawek);
• porównuje budowę i funkcje tętnic, żył i naczyń włosowatych;
• opisuje drogę krwi w krwiobiegu małym i dużym oraz wskazuje, gdzie krew pobiera i oddaje tlen;
• mierzy tętno i formułuje wniosek o wpływie wysiłku fizycznego na pracę serca.

NaCoBeZu (kryteria sukcesu):
• Potrafię wskazać na modelu 3D cztery jamy serca i główne naczynia.
• Umiem narysować strzałkami drogę krwi w obu krwiobiegach.
• Wiem, czym różnią się tętnice, żyły i naczynia włosowate.
• Potrafię zmierzyć tętno i wyjaśnić, dlaczego rośnie po wysiłku.`,
    },
    metody: {
      tresc: `Metody: pogadanka heurystyczna, pokaz z wykorzystaniem modeli 3D w rozszerzonej rzeczywistości (AR), praca z ilustracją i schematem, doświadczenie (pomiar tętna), animacja filmowa, quiz.
Formy pracy: praca z całą klasą, praca w parach (pomiar tętna), praca indywidualna (karta pracy).
Środki dydaktyczne: modele 3D serca (całe, przekrój), model naczyń krwionośnych, ilustracje: budowa serca, krwiobiegi, naczynia; animacja „Jak pracuje serce?”; arkusz pomiarów tętna; karta pracy; stoper (telefon); znacznik lekcji AR wydrukowany na A4.`,
    },
    wstep: {
      tytul: "Wprowadzenie: pompa, która nie odpoczywa",
      tresc: `1. Sprawy organizacyjne, sprawdzenie obecności (1 min).
2. Pytanie na rozgrzewkę: „Połóż dłoń po lewej stronie klatki piersiowej. Co czujesz? Ile razy uderzy twoje serce w ciągu dnia?” – uczniowie szacują, nauczyciel podaje wynik (ok. 100 tys. razy).
3. Uczniowie dołączają do lekcji AR (kod/QR). Na biurku pojawia się bijący model serca.
4. Podanie tematu i NaCoBeZu.`,
      narracja: "Cześć! Spójrzcie na biurko – to bijące serce. Jest wielkości zaciśniętej pięści, a w ciągu doby kurczy się około stu tysięcy razy. Dziś sprawdzimy, jak jest zbudowane i którędy płynie krew.",
      media: [md("Serce z naczyniami")],
    },
    etap1: {
      tytul: "Budowa serca",
      czas: 12,
      tresc: `1. Oglądamy model 3D serca z zewnątrz: koniuszek, aorta, pień płucny, żyły główne, naczynia wieńcowe (odżywiają mięsień serca).
2. Przełączamy na przekrój serca: uczniowie obchodzą ławkę z telefonem i odszukują 4 jamy: prawy i lewy przedsionek, prawą i lewą komorę.
3. Pytanie problemowe: „Dlaczego ściana lewej komory jest grubsza od prawej?” (lewa komora tłoczy krew do całego ciała).
4. Zastawki: przedsionkowo-komorowe (trójdzielna, dwudzielna) i półksiężycowate – krew płynie tylko w jedną stronę.
5. Uczniowie podpisują elementy na ilustracji w karcie pracy (zad. 1).
Uwaga: na rysunkach strona prawa i lewa serca jest jak u osoby zwróconej do nas przodem.`,
      narracja: "Serce ma cztery jamy: dwa przedsionki na górze i dwie komory na dole. Prawa część serca pompuje krew ubogą w tlen – na modelu jest niebieska. Lewa część pompuje krew bogatą w tlen – czerwoną. Zastawki działają jak drzwi otwierane tylko w jedną stronę, dlatego krew się nie cofa. Zwróćcie uwagę, że ściana lewej komory jest najgrubsza – to ona wysyła krew do całego ciała.",
      media: [md("Przekrój serca"), ob("Budowa serca – przekrój")],
      quiz: [
        { pytanie: "Która jama serca ma najgrubszą ścianę?", odpowiedzi: ["prawy przedsionek", "lewa komora", "prawa komora", "lewy przedsionek"], poprawna: 1 },
        { pytanie: "Do czego służą zastawki serca?", odpowiedzi: ["wytwarzają krwinki", "sprawiają, że krew płynie w jedną stronę", "odżywiają mięsień serca"], poprawna: 1 },
      ],
    },
    etap2: {
      tytul: "Naczynia krwionośne",
      czas: 7,
      tresc: `1. Model 3D naczyń: uczniowie porównują grubość ścian tętnicy i żyły, odnajdują zastawkę w żyle.
2. Krótka notatka w zeszycie (tabela z karty pracy, zad. 3): tętnice – krew OD serca, grube sprężyste ściany, wysokie ciśnienie; żyły – krew DO serca, cienkie ściany, zastawki; naczynia włosowate – jedna warstwa komórek, wymiana gazów i substancji.
3. Ciekawostka: wszystkie naczynia jednego człowieka ułożone w linii miałyby ok. 100 000 km długości.`,
      narracja: "Krew płynie w zamkniętej sieci naczyń. Tętnice prowadzą krew od serca – mają grube, sprężyste ściany, bo krew płynie w nich pod dużym ciśnieniem. Żyły prowadzą krew do serca – mają cieńsze ściany i zastawki. Najcieńsze są naczynia włosowate: przez ich ściany tlen i składniki odżywcze przechodzą do komórek.",
      media: [md("Tętnica, żyła"), ob("Naczynia krwionośne")],
      quiz: [{ pytanie: "Które naczynia prowadzą krew od serca?", odpowiedzi: ["żyły", "tętnice", "naczynia limfatyczne"], poprawna: 1 }],
    },
    etap3: {
      tytul: "Krwiobieg mały i duży",
      czas: 10,
      tresc: `1. Projekcja animacji „Jak pracuje serce?” (42 s) – fazy pracy serca i przepływ krwi.
2. Praca ze schematem krwiobiegów: uczniowie wodzą palcem po drodze krwi, nauczyciel zadaje pytania: „Gdzie krew zmienia kolor z niebieskiego na czerwony?” (w płucach), „Gdzie odwrotnie?” (w naczyniach włosowatych narządów).
3. Uczniowie uzupełniają zad. 2 w karcie pracy (droga krwi).
4. Wniosek: krwiobieg mały służy wymianie gazowej w płucach, duży – dostarcza tlen i składniki odżywcze do komórek całego ciała.`,
      narracja: "Krew krąży w dwóch obiegach. W krwiobiegu małym prawa komora wysyła krew do płuc. Tam krew oddaje dwutlenek węgla, pobiera tlen i wraca do lewego przedsionka. W krwiobiegu dużym lewa komora tłoczy krew przez aortę do całego ciała. Komórki pobierają z niej tlen, a krew żyłami głównymi wraca do prawego przedsionka.",
      media: [ob("Krwiobieg mały"), B.filmy[0], ob("Cykl pracy serca")],
      quiz: [
        { pytanie: "Gdzie zaczyna się krwiobieg duży?", odpowiedzi: ["w prawej komorze", "w lewej komorze", "w płucach", "w prawym przedsionku"], poprawna: 1 },
        { pytanie: "Gdzie krew pobiera tlen?", odpowiedzi: ["w sercu", "w naczyniach włosowatych płuc", "w żyłach głównych"], poprawna: 1 },
      ],
    },
    etap4: {
      tytul: "Doświadczenie: wysiłek a tętno",
      czas: 6,
      tresc: `Problem badawczy: Jak wysiłek fizyczny wpływa na częstość skurczów serca (tętno)?
1. Uczniowie stawiają hipotezę.
2. Pomiar w parach: tętno na tętnicy promieniowej przez 15 s × 4 – w spoczynku, po 20 przysiadach, po 3 min odpoczynku.
3. Wyniki wpisujemy do arkusza „Pomiary tętna” – średnie liczą się automatycznie; omawiamy wykres.
4. Wniosek: podczas wysiłku mięśnie potrzebują więcej tlenu, więc serce bije szybciej; po odpoczynku tętno wraca do normy.
Bezpieczeństwo: uczniowie z przeciwwskazaniami do wysiłku są obserwatorami i zapisują wyniki.`,
      narracja: "Sprawdźmy to na sobie! Zmierzcie tętno w spoczynku, potem po dwudziestu przysiadach i po trzech minutach odpoczynku. Podczas wysiłku mięśnie potrzebują więcej tlenu, dlatego serce przyspiesza. Regularny ruch wzmacnia serce – to najlepsza profilaktyka chorób układu krążenia.",
      media: [WYKRES_TETNO, B.pliki[1]],
      quiz: [{ pytanie: "Dlaczego po wysiłku tętno rośnie?", odpowiedzi: ["mięśnie potrzebują więcej tlenu", "krew robi się gęstsza", "serce się męczy i zwalnia"], poprawna: 0 }],
    },
    podsumowanie: {
      tytul: "Podsumowanie i quiz",
      czas: 5,
      tresc: `1. Quiz na telefonach (wyniki na projektorze) – omówienie błędnych odpowiedzi.
2. Uczniowie sprawdzają NaCoBeZu – kciuk w górę / w bok / w dół przy każdym kryterium.
3. Pytanie zamykające: „Co możesz zrobić już dziś, żeby twoje serce było zdrowe?”`,
      narracja: "Brawo! Wiecie już, że serce ma dwa przedsionki i dwie komory, zastawki kierują przepływem krwi, a krew krąży w krwiobiegu małym i dużym. Na koniec szybki quiz – powodzenia!",
      media: [ob("Budowa serca – do"), B.pliki[0]],
      quiz: [
        { pytanie: "Ile jam ma serce człowieka?", odpowiedzi: ["dwie", "trzy", "cztery", "sześć"], poprawna: 2 },
        { pytanie: "Krwiobieg mały prowadzi krew z serca do…", odpowiedzi: ["mózgu", "płuc", "nerek"], poprawna: 1 },
        { pytanie: "Które naczynia mają zastawki?", odpowiedzi: ["żyły", "tętnice", "naczynia włosowate"], poprawna: 0 },
      ],
    },
    praca_domowa: {
      tresc: `Obowiązkowo: dokończ kartę pracy (zad. 2, 3 i 5).
Dla chętnych: zmierz tętno domownika w spoczynku i po wejściu po schodach na 2. piętro. Porównaj z wynikami klasy i zapisz wniosek.`,
    },
    dostosowania: {
      tresc: `• Uczniowie z dysleksją: karta pracy w większej czcionce, możliwość odsłuchu tekstu przewodnika (Bartek czyta treść).
• Uczniowie słabowidzący: model 3D można powiększyć gestem; ilustracje w wysokim kontraście.
• Uczniowie zdolni: zadanie dodatkowe – wyjaśnij, dlaczego krew w tętnicy płucnej jest odtlenowana, choć płynie tętnicą.
• Uczniowie z przeciwwskazaniami do wysiłku: rola obserwatora i protokolanta w doświadczeniu.
• Brak telefonu: uczniowie pracują w parach albo oglądają scenę na ekranie projektora.`,
    },
    zrodla: {
      tresc: `• Podstawa programowa kształcenia ogólnego – biologia, szkoła podstawowa (ZPE): https://zpe.gov.pl/podstawa-programowa/szkola-podstawowa/biologia
• Modele 3D, ilustracje, animacja i arkusze: przygotowane w aplikacji Lekcja AR (folder pokazowa-biologia).`,
    },
  },
};
