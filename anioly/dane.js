/* Zwiedzaj z Aniołami – dane trasy.
   Anioły: projekt miejski „Śladem Toruńskich Aniołów” (Biuro Toruńskiego Centrum Miasta), rzeźby Małgorzaty Więcławskiej-Furyk.
   Opisy napisane na podstawie artykułów torun.pl, nowosci.com.pl, gra.fm, tylkotorun.pl, lepszytorunlepszapolska.pl.
   WSPÓŁRZĘDNE SĄ PRZYBLIŻONE – popraw je w trybie „Kalibracja” (stojąc przy figurze) i wklej wynik tutaj.
   Modele 3D w aplikacji to własne, stylizowane anioły z atrybutem miejsca – nie kopie rzeźb. */

export const PROJEKT = {
  nazwa: "Zwiedzaj z Aniołami",
  haslo: "Toruńska gra miejska śladem aniołów – zbieraj wirtualne pierniki!",
  stronaAniolow: "https://torunskieanioly.pl/",
  promienGps: 60,          // [m] – w tej odległości uznajemy, że jesteś przy punkcie
};

// PUNKTACJA w piernikach 🍪
export const PIERNIKI = { aniol: 3, atrakcja: 2, pytanie: 1, bezPodpowiedzi: 1, podpowiedz: -0.5 };

export const ANIOLY = [
  {
    id: "jonasz", nr: 1, imie: "JOnasz", miejsce: "Ratusz Staromiejski – przy wejściu",
    lat: 53.01040, lng: 18.60460,
    opis: "Pierwszy anioł szlaku, od maja 2025 r. Imię wybrali mieszkańcy w plebiscycie – „JO” na początku to ukłon w stronę typowo toruńskiego „jo”. Imię Jonasz kojarzy się też z podróżą, odwagą i łagodnością.",
    atrybut: "jo", kolor: "#b07a3b",
    pytanie: { tresc: "Od jakiego toruńskiego słowa zaczyna się imię tego anioła?", odp: ["JO", "NO", "TO", "HEJ"], ok: 0 },
    aliasy: ["jonasz", "ratusz"],
  },
  {
    id: "rynek5", nr: 2, imie: "Anioł z Rynku 5", miejsce: "Rynek Staromiejski 5 – naprzeciw JOnasza",
    lat: 53.01005, lng: 18.60390,
    opis: "Siódmy anioł szlaku (listopad 2025), przy butiku „Iga Sarzyńska Wzrusza Toruń”. Ma przypominać, że drobne gesty, zapach domowego ciasta i piękno detali potrafią wzruszać i zbliżać ludzi.",
    atrybut: "ciasto", kolor: "#c08850",
    pytanie: { tresc: "Naprzeciw którego anioła siedzi ten aniołek?", odp: ["JOnasza", "Janka", "Optusia", "Lenka"], ok: 0 },
    aliasy: ["rynek-5", "rynek5", "sarzynska", "iga"],
    uwaga: "Imienia tego anioła nie znaleźliśmy w źródłach – uzupełnij je w danych.",
  },
  {
    id: "manekinek", nr: 3, imie: "Manekinek", miejsce: "ul. Wysoka – przy naleśnikarni Manekin",
    lat: 53.00975, lng: 18.60245,
    opis: "Piąty anioł szlaku, ufundowany z okazji 25-lecia naleśnikarni Manekin, która zaczynała właśnie na ulicy Wysokiej. Imię wybrali mieszkańcy – wśród propozycji były też Mankuś, Placuś i Głodek.",
    atrybut: "nalesnik", kolor: "#b8743a",
    pytanie: { tresc: "Którego imienia NIE było wśród propozycji dla tego anioła?", odp: ["Pierniczek", "Placuś", "Mankuś", "Głodek"], ok: 0 },
    aliasy: ["manekinek", "manekin", "wysoka"],
  },
  {
    id: "krzywa", nr: 4, imie: "Anioł spod Krzywej Wieży", miejsce: "ul. Pod Krzywą Wieżą",
    lat: 53.00838, lng: 18.60230,
    opis: "Dziesiąty anioł szlaku (marzec 2026), ufundowany przez Fundację Świat Zdrowia. Uosabia witalność, zdrowie i siłę – i jakby podpierał najsłynniejszą krzywą budowlę Torunia.",
    atrybut: "zdrowie", kolor: "#a9733f",
    pytanie: { tresc: "Co symbolizuje anioł spod Krzywej Wieży?", odp: ["Zdrowie i siłę", "Piwowarstwo", "Flisactwo", "Optykę"], ok: 0 },
    aliasy: ["krzywa", "krzywa-wieza", "swiat-zdrowia"],
    uwaga: "Imienia tego anioła nie znaleźliśmy w źródłach – uzupełnij je w danych.",
  },
  {
    id: "bulwarek", nr: 5, imie: "Bulwarek", miejsce: "Bulwar Filadelfijski – przy pawilonie Między Mostami",
    lat: 53.00720, lng: 18.60600,
    opis: "Trzeci anioł szlaku (lipiec 2025) – flisak. Przypomina, że bogactwo hanzeatyckiego Torunia płynęło Wisłą, a flisacy spławiali nią towary. Dziś po Wiśle znów pływają łodzie flisackie z turystami.",
    atrybut: "wioslo", kolor: "#9c6b3a",
    pytanie: { tresc: "Do jakiego zawodu nawiązuje Bulwarek?", odp: ["Flisaka", "Piekarza", "Kowala", "Rybaka"], ok: 0 },
    aliasy: ["bulwarek", "bulwar", "flisak"],
  },
];

// ATRAKCJE do odnalezienia między aniołami (zadanie terenowe)
export const ATRAKCJE = [
  {
    id: "osiolek", po: "jonasz", nazwa: "Osiołek – pręgierz", lat: 53.01020, lng: 18.60425,
    zagadka: "Na rynku stoi zwierzak, na którego grzbiet nikt nie chciał trafić. Dawniej sadzano na nim winnych, by cały rynek mógł się z nich śmiać.",
    podpowiedzi: ["Szukaj tuż przy Ratuszu – nie odchodź daleko od JOnasza.", "To zwierzę z długimi uszami, a jego „siodło” jest ostre jak brzytwa.", "Pręgierz w kształcie osła – symbol dawnego porządku i prawa w mieście."],
    ciekawostka: "Kara była podwójna: skazanego wystawiano na pośmiewisko, a ostry grzbiet osła wbijał się w siedzenie. Oryginalny osioł stał na rynku do 1797 r. Dzisiejszą rzeźbę współtworzyła Małgorzata Więcławska-Furyk – autorka toruńskich aniołów.",
    pytanie: { tresc: "Do którego roku stał na rynku oryginalny osioł-pręgierz?", odp: ["1797", "1233", "1920", "1474"], ok: 0 },
  },
  {
    id: "krzywa-wieza", po: "manekinek", nazwa: "Krzywa Wieża", lat: 53.00834, lng: 18.60220,
    zagadka: "Idź w stronę Wisły i szukaj baszty, która nie trzyma pionu. Legenda mówi, że to rzeka zawołała do niej, a od tego okrzyku miasto wzięło nazwę.",
    podpowiedzi: ["Zejdź z ulicy Wysokiej w stronę murów obronnych nad Wisłą.", "Ulica, przy której stoi, ma ją w nazwie: „Pod …”.", "Gotycka baszta z XIII wieku przy murach – wychylona o prawie półtora metra."],
    ciekawostka: "Baszta powstała w XIII w. jako część murów obronnych. Gliniaste podłoże sprawiło, że odchyla się od pionu o ok. 1,46 m. Była potem więzieniem i kuźnią, dziś mieści małe muzeum i kawiarnię.",
    pytanie: { tresc: "O ile w przybliżeniu Krzywa Wieża odchyla się od pionu?", odp: ["ok. 1,5 m", "ok. 15 cm", "ok. 5 m", "ok. 50 cm"], ok: 0 },
  },
];

// KOLEJNOŚĆ ETAPÓW TRASY „Od Ratusza nad Wisłę” (ok. 1 km)
export const TRASA = {
  nazwa: "Od Ratusza nad Wisłę",
  etapy: [
    { typ: "aniol", id: "jonasz" },
    { typ: "atrakcja", id: "osiolek" },
    { typ: "aniol", id: "rynek5" },
    { typ: "aniol", id: "manekinek" },
    { typ: "atrakcja", id: "krzywa-wieza" },
    { typ: "aniol", id: "krzywa" },
    { typ: "aniol", id: "bulwarek" },
  ],
  // wskazówki dojścia do kolejnego anioła (po zaliczeniu poprzedniego etapu)
  dojscie: {
    jonasz: "Start: Rynek Staromiejski. Szukaj anioła przy wejściu do Ratusza – siedzi nisko, łatwo go przeoczyć!",
    rynek5: "Odwróć się plecami do JOnasza – kolejny aniołek przysiadł po drugiej stronie, przy kamienicy nr 5.",
    manekinek: "Z rynku skręć w ulicę Wysoką. Szukaj miejsca, gdzie pachnie naleśnikami.",
    krzywa: "Anioł zdrowia czuwa tuż obok krzywej baszty – rozejrzyj się po ulicy Pod Krzywą Wieżą.",
    bulwarek: "Przejdź przez bramę w murach na bulwar nad Wisłą i idź wzdłuż rzeki – flisak czeka przy pawilonie.",
  },
};

// ODZNAKI w Anielskim Paszporcie
export const ODZNAKI = [
  { id: "pierwszy", nazwa: "Pierwsze pióro", opis: "Odnaleziony pierwszy anioł", warunek: s => s.anioly >= 1 },
  { id: "detektyw", nazwa: "Miejski detektyw", opis: "Obie atrakcje odnalezione", warunek: s => s.atrakcje >= 2 },
  { id: "bez-pomocy", nazwa: "Bez podpowiedzi", opis: "Atrakcja znaleziona bez żadnej podpowiedzi", warunek: s => s.bezPodp >= 1 },
  { id: "madrala", nazwa: "Anielski mądrala", opis: "5 poprawnych odpowiedzi", warunek: s => s.pytania >= 5 },
  { id: "przewodnik", nazwa: "Anielski Przewodnik", opis: "Cała trasa przebyta", warunek: s => s.koniec },
];
