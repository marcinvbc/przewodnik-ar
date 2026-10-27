/*
 * BAZA ATRAKCJI — tu dodajesz własne miejsca.
 * Każda atrakcja dostaje własny adres:  index.html?a=<id>
 * i to właśnie ten adres zamieniasz w kod QR (strona qr.html robi to automatycznie).
 *
 * Pola:
 *  id        – krótki identyfikator do adresu (bez spacji i polskich znaków)
 *  nazwa     – tytuł atrakcji
 *  miejsce   – gdzie się znajduje
 *  model     – plik .glb w folderze modele/ (może też być pełny adres https://...)
 *  modelIOS  – (opcjonalnie) plik .usdz dla iPhone; jeśli brak, model-viewer wygeneruje go sam
 *  kolor     – kolor akcentu na stronie atrakcji
 *  opis      – tekst, który czyta awatar (akapity rozdzielaj \n\n)
 *  ciekawostki – krótkie fakty pod opisem
 *  punkty    – etykiety przyczepione do modelu 3D (pozycja w metrach x y z, normal = kierunek)
 *
 *  AR NA PLAKACIE (MindAR) – opcjonalnie, najłatwiej przygotować w kreator.html:
 *  znacznik     – obrazek-plakat, w który celuje się telefonem (np. "znaczniki/baszta.jpg")
 *  znacznikMind – (opcjonalnie) skompilowany plik .mind – przyspiesza start; bez niego telefon
 *                 przygotuje znacznik sam przy pierwszym użyciu (kilkanaście sekund) i zapamięta go
 *  orientacja   – "sciana" (plakat wisi, model stoi przed nim) albo "stol" (obrazek leży, model wyrasta w górę)
 *  wielkoscNaPlakacie – (opcjonalnie) wysokość modelu względem szerokości plakatu, domyślnie 0.9
 *  bezPrzewodnika – (opcjonalnie) true = w AR na plakacie nie pokazuj awatara obok modelu
 */
/*
 * AWATAR-PRZEWODNIK 3D – wspólny dla wszystkich atrakcji.
 * Własną postać (np. z Mixamo lub Ready Player Me, wyeksportowaną do .glb) podmienisz tutaj.
 * Aplikacja szuka animacji o nazwach: Spoczynek, Macha, Mowi, Wskazuje
 * (jeśli których brakuje, użyje pierwszej dostępnej).
 * Pojedyncza atrakcja może mieć własnego przewodnika: pole  przewodnik: "modele/inna-postac.glb"
 */
window.PRZEWODNIK = {
  imie: "Bartek",
  model: "modele/przewodnik.glb",
};

window.ATRAKCJE = [
  {
    id: "baszta",
    nazwa: "Baszta Rycerska",
    miejsce: "Mury miejskie, wejście od strony rynku",
    model: "modele/baszta.glb",
    znacznik: "znaczniki/baszta.jpg",   // plakat AR (MindAR)
    orientacja: "sciana",
    kolor: "#a8402c",
    opis:
      "Witaj przy Baszcie Rycerskiej! Ta okrągła wieża była kiedyś częścią murów obronnych, które otaczały całe miasto.\n\n" +
      "Na samej górze widzisz krenelaż, czyli zęby muru. Obrońcy chowali się za nimi, a przez przerwy strzelali z łuków i kusz. " +
      "Wąskie okienka nazywano strzelnicami: z zewnątrz trudno było w nie trafić, a ze środka świetnie było widać przedpole.\n\n" +
      "Spróbuj obejść model dookoła w rozszerzonej rzeczywistości i policz zęby krenelażu!",
    ciekawostki: [
      "Mury takich baszt miały często ponad 2 metry grubości.",
      "Spiczasty dach dodawano zwykle później, gdy wieża straciła funkcję obronną.",
      "Drzwi umieszczano wysoko lub bardzo wąsko, żeby trudno było je sforsować.",
    ],
    punkty: [
      { etykieta: "Krenelaż (blanki)", pozycja: "0 0.87 0.26", normal: "0 0 1" },
      { etykieta: "Okno z okiennicami", pozycja: "-0.12 0.5 0.2", normal: "-0.52 0 0.85" },
      { etykieta: "Chorągiew", pozycja: "0.14 0.6 0.19", normal: "0.6 0 0.8" },
      { etykieta: "Brama", pozycja: "0 0.2 0.27", normal: "0 0 1" },
    ],
  },
  {
    id: "latarnia",
    nazwa: "Latarnia Morska",
    miejsce: "Cypel przy porcie rybackim",
    model: "modele/latarnia.glb",
    znacznik: "znaczniki/latarnia.jpg",   // plakat AR (MindAR)
    orientacja: "sciana",
    kolor: "#c8312f",
    opis:
      "Oto Latarnia Morska, strażniczka wybrzeża. Przez ponad sto lat jej światło prowadziło statki bezpiecznie do portu.\n\n" +
      "Biało-czerwone pasy to nie ozdoba, tylko znak rozpoznawczy. Każda latarnia ma inny wzór, dzięki czemu żeglarz w dzień od razu wie, gdzie jest. " +
      "W nocy rozpoznaje ją po rytmie błysków.\n\n" +
      "Na szczycie, w przeszklonej laternie, pracuje soczewka, która skupia światło w wąską wiązkę widoczną z kilkudziesięciu kilometrów.",
    ciekawostki: [
      "Każda latarnia ma własną charakterystykę świecenia, na przykład 3 błyski co 10 sekund.",
      "Dawniej na szczyt codziennie wspinał się latarnik, żeby wyczyścić szyby i soczewkę.",
      "Taki kształt, zwężający się ku górze, lepiej opiera się wiatrom.",
    ],
    punkty: [
      { etykieta: "Laterna ze światłem", pozycja: "0 0.99 0.085", normal: "0 0 1" },
      { etykieta: "Galeria", pozycja: "0 0.93 0.17", normal: "0 0 1" },
      { etykieta: "Pasy dzienne", pozycja: "0 0.5 0.125", normal: "0 0 1" },
      { etykieta: "Domek latarnika", pozycja: "-0.25 0.25 -0.05", normal: "-0.8 0 0.6" },
    ],
  },
  {
    id: "wiatrak",
    nazwa: "Wiatrak Koźlak",
    miejsce: "Skansen, wzgórze za kościołem",
    model: "modele/wiatrak.glb",
    znacznik: "znaczniki/wiatrak.jpg",   // plakat AR (MindAR)
    orientacja: "sciana",
    kolor: "#a9744a",
    opis:
      "Poznaj Wiatrak Koźlak, drewniany młyn napędzany siłą wiatru.\n\n" +
      "Jego nazwa pochodzi od kozła, czyli masywnej podstawy, na której obraca się cały budynek. " +
      "Młynarz za pomocą długiego dyszla ustawiał wiatrak tak, by śmigła zawsze stały twarzą do wiatru.\n\n" +
      "Śmigła obracały wał, a ten poruszał kamienie młyńskie, które mieliły zboże na mąkę. Postaw model obok siebie i zobacz, jak wielkie były jego skrzydła!",
    ciekawostki: [
      "Cały koźlak, ważący kilkanaście ton, obracał się ręcznie wokół jednego słupa.",
      "Na śmigła rozpinano płótno, a jego ilość regulowała prędkość obrotów.",
      "W Polsce zachowało się kilkaset drewnianych wiatraków, głównie w skansenach.",
    ],
    punkty: [
      { etykieta: "Śmigła", pozycja: "0.17 0.9 0.33", normal: "0 0 1" },
      { etykieta: "Wał (piasta)", pozycja: "0 0.73 0.36", normal: "0 0 1" },
      { etykieta: "Kozioł – obrotowa podstawa", pozycja: "0.16 0.15 0.16", normal: "0.7 0 0.7" },
      { etykieta: "Schody i dyszel", pozycja: "0 0.3 -0.33", normal: "0 0 -1" },
    ],
  },
];
