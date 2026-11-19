/* Mistrz Kanapek – menu, składniki i receptury.
   Pozycje i kolejność składania odpowiadają typowym kanapkom sieci szybkiej obsługi (bez nazw i znaków towarowych).
   Kalorie składników są WARTOŚCIAMI ORIENTACYJNYMI (typowe gramatury i tabele wartości odżywczych) –
   restauracja może je zastąpić oficjalnymi danymi swojego menu, zmieniając pola „kcal” i „gramy” poniżej. */

export const SKLADNIKI = {
  korona:     { nazwa: "Bułka – korona (wierzch)", gramy: 30, kcal: 75, gdzie: "toster", miejsce: "pojemnik z bułkami" },
  spod:       { nazwa: "Bułka – spód", gramy: 25, kcal: 60, gdzie: "toster", miejsce: "pojemnik z bułkami" },
  koronaSez:  { nazwa: "Bułka z sezamem – korona", gramy: 35, kcal: 95, gdzie: "toster", miejsce: "pojemnik z bułkami" },
  srodek:     { nazwa: "Bułka – część środkowa", gramy: 22, kcal: 55, gdzie: "toster", miejsce: "pojemnik z bułkami" },
  spodDuzy:   { nazwa: "Bułka z sezamem – spód", gramy: 30, kcal: 80, gdzie: "toster", miejsce: "pojemnik z bułkami" },
  tortilla:   { nazwa: "Tortilla pszenna", gramy: 62, kcal: 180, gdzie: "toster", miejsce: "pojemnik z tortillami" },
  wolowina:   { nazwa: "Kotlet wołowy 100% (ok. 45 g po usmażeniu)", gramy: 45, kcal: 90, gdzie: "grill", miejsce: "zamrażarka przy grillu", goracy: true },
  kurczak:    { nazwa: "Kurczak panierowany (kawałek)", gramy: 50, kcal: 110, gdzie: "frytownica", miejsce: "zamrażarka przy frytownicy", goracy: true },
  ser:        { nazwa: "Ser topiony typu cheddar (plaster)", gramy: 14, kcal: 50, miejsce: "pojemnik z serem" },
  ketchup:    { nazwa: "Ketchup (porcja)", gramy: 6, kcal: 7, sos: true, miejsce: "dozownik" },
  musztarda:  { nazwa: "Musztarda (porcja)", gramy: 3, kcal: 2, sos: true, miejsce: "dozownik" },
  sosSpec:    { nazwa: "Sos specjalny (porcja)", gramy: 15, kcal: 55, sos: true, miejsce: "dozownik" },
  sosMajo:    { nazwa: "Sos majonezowo-czosnkowy (porcja)", gramy: 15, kcal: 70, sos: true, miejsce: "dozownik" },
  cebulka:    { nazwa: "Cebulka drobno siekana (porcja)", gramy: 4, kcal: 1, miejsce: "pojemnik z cebulką" },
  ogorek:     { nazwa: "Ogórek konserwowy (plaster)", gramy: 4, kcal: 1, miejsce: "pojemnik z ogórkami" },
  salata:     { nazwa: "Sałata lodowa szatkowana (porcja)", gramy: 10, kcal: 2, miejsce: "pojemnik z sałatą" },
  pomidor:    { nazwa: "Pomidor (plaster)", gramy: 20, kcal: 4, miejsce: "pojemnik z pomidorami" },
};

/* Kroki receptury:
   - przygotuj: co trzeba opiec/usmażyć zanim się złoży (toster, grill, frytownica)
   - sklad: kolejność warstw na stole montażowym (od pierwszej położonej)
   - odwroc: true – składanie „do góry nogami” na odwróconej koronie, na końcu kanapkę się odwraca
   - zawin: "papier" | "zwin" (wrap)
   - sos: { ile: docelowa liczba porcji } – dozowanie przytrzymaniem */
export const MENU = [
  {
    id: "hamburger", nazwa: "Hamburger", emoji: "🍔", opis: "Klasyk: kotlet wołowy, ketchup, musztarda, cebulka i ogórek w opiekanej bułce.",
    przygotuj: [{ co: "korona", gdzie: "toster" }, { co: "spod", gdzie: "toster" }, { co: "wolowina", gdzie: "grill", ile: 1 }],
    odwroc: true, zawin: "papier",
    sklad: ["korona", "musztarda", "ketchup", "cebulka", "ogorek", "wolowina", "spod"],
    wskazowki: { korona: "Połóż opieczoną koronę przekrojem do góry – kanapkę składasz „do góry nogami”.", musztarda: "Jedna porcja musztardy na środek korony.", ketchup: "Porcja ketchupu – spiralnie, nie do krawędzi.", cebulka: "Szczypta cebulki równo na sosie.", ogorek: "Jeden plaster ogórka na środku.", wolowina: "Gorący kotlet przenieś łopatką prosto z grilla.", spod: "Przykryj spodem bułki – potem odwróć kanapkę." },
  },
  {
    id: "cheeseburger", nazwa: "Cheeseburger", emoji: "🧀", opis: "Jak hamburger, z plastrem sera topionego, który rozpuszcza się na gorącym kotlecie.",
    przygotuj: [{ co: "korona", gdzie: "toster" }, { co: "spod", gdzie: "toster" }, { co: "wolowina", gdzie: "grill", ile: 1 }],
    odwroc: true, zawin: "papier",
    sklad: ["korona", "musztarda", "ketchup", "cebulka", "ogorek", "ogorek", "ser", "wolowina", "spod"],
    wskazowki: { ogorek: "Dwa plastry ogórka obok siebie.", ser: "Plaster sera na środek – roztopi go ciepło kotleta.", wolowina: "Kotlet łopatką na ser.", spod: "Przykryj spodem i odwróć." },
  },
  {
    id: "podwojny", nazwa: "Podwójny cheeseburger", emoji: "🍔🍔", opis: "Dwa kotlety wołowe i dwa plastry sera.",
    przygotuj: [{ co: "korona", gdzie: "toster" }, { co: "spod", gdzie: "toster" }, { co: "wolowina", gdzie: "grill", ile: 2 }],
    odwroc: true, zawin: "papier",
    sklad: ["korona", "musztarda", "ketchup", "cebulka", "ogorek", "ogorek", "ser", "wolowina", "ser", "wolowina", "spod"],
    wskazowki: { ser: "Ser między kotletami – oba plastry mają się roztopić.", wolowina: "Każdy kotlet przenosisz łopatką." },
  },
  {
    id: "wrap", nazwa: "Wrap z kurczakiem", emoji: "🌯", opis: "Tortilla z chrupiącym kurczakiem, sałatą, pomidorem i sosem.",
    przygotuj: [{ co: "tortilla", gdzie: "toster" }, { co: "kurczak", gdzie: "frytownica", ile: 2 }],
    odwroc: false, zawin: "zwin",
    sklad: ["tortilla", "sosMajo", "salata", "pomidor", "pomidor", "kurczak", "kurczak"],
    wskazowki: { tortilla: "Ciepłą tortillę rozłóż na środku papieru.", sosMajo: "Sos pasem przez środek.", salata: "Sałata na sos.", pomidor: "Dwa plastry pomidora.", kurczak: "Kurczaka z frytownicy przenoś szczypcami – jest gorący!" },
  },
  {
    id: "pietrowy", nazwa: "Burger piętrowy z sosem specjalnym", emoji: "🍔🏢", opis: "Dwa kotlety, trzyczęściowa bułka z sezamem, sos specjalny, sałata, cebulka, ser i ogórki.",
    przygotuj: [{ co: "koronaSez", gdzie: "toster" }, { co: "srodek", gdzie: "toster" }, { co: "spodDuzy", gdzie: "toster" }, { co: "wolowina", gdzie: "grill", ile: 2 }],
    odwroc: false, zawin: "papier",
    sklad: ["spodDuzy", "sosSpec", "cebulka", "salata", "ser", "wolowina", "srodek", "sosSpec", "cebulka", "salata", "ogorek", "ogorek", "wolowina", "koronaSez"],
    wskazowki: { spodDuzy: "Zaczynasz od spodu bułki.", sosSpec: "Porcja sosu specjalnego na każde piętro.", srodek: "Środkowa część bułki rozdziela piętra.", koronaSez: "Na koniec korona z sezamem." },
  },
];

export const KARY = { zlySkladnik: 4, bezOpiekania: 5, niedopieczone: 6, przypalone: 6, goraceReka: 5, sosZaMalo: 2, sosZaDuzo: 2, krzywo: 1 };
export const CZASY = { toster: 4, stronaGrill: 6, frytownica: 8 };   // [s] – skrócone na potrzeby gry (w kuchni dłużej)

export const kcalDania = d => d.sklad.reduce((s, k) => s + SKLADNIKI[k].kcal, 0);
