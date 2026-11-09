/*
 * Dane generatora scenariuszy: typy szkół, klasy, przedmioty, podstawa programowa, tematy i szablony sekcji.
 *
 * Stan prawny (sprawdzony w listopadzie 2026):
 *  - Reforma26 „Kompas Jutra” – nowa podstawa (rozporządzenie MEN z 11.03.2026, Dz.U. 2026 poz. 378, zmiana 8.07.2026)
 *    wchodzi stopniowo: 2026/27 klasy I i IV, 2027/28 – też II i V, 2028/29 – I–VI, 2029/30 – I–VII, 2030/31 – I–VIII.
 *    Przyroda w klasach IV–VI (3 h, interdyscyplinarnie), biologia/chemia/fizyka/geografia od klasy VII,
 *    zajęcia praktyczno-techniczne IV–VI, kształcenie obronne w kl. VIII (zamiast EDB).
 *  - Pozostałe klasy: podstawa z 2017 r. (z późniejszymi zmianami, m.in. z 2024 r.).
 *  - Szkoły ponadpodstawowe: nowa podstawa od 2027/28 w klasach I.
 * Listy przedmiotów można dowolnie zmieniać – to tylko podpowiedzi. Szkoła może też zdefiniować własny profil.
 */

export const ROK_SZKOLNY = (() => { const d = new Date(); return d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1; })();
export const rokTekst = r => `${r}/${String(r + 1).slice(2)}`;

/** Która podstawa obowiązuje w danej klasie szkoły podstawowej w danym roku szkolnym. */
export function podstawaSP(klasa, rok = ROK_SZKOLNY) {
  const lat = rok - 2026;
  const nowa = lat >= 0 && ((klasa <= 3 && klasa <= 1 + lat) || (klasa >= 4 && klasa <= 4 + lat));
  return nowa
    ? { id: "kj2026", nazwa: "Kompas Jutra (2026)", opis: "nowa podstawa programowa – Reforma26 „Kompas Jutra”, rozporządzenie MEN z 11.03.2026 r." }
    : { id: "pp2017", nazwa: "podstawa 2017", opis: "podstawa programowa z 2017 r. (z późniejszymi zmianami, m.in. z 2024 r.)" };
}

const L = s => s.split("|");
function przedmiotySP(klasa, rok) {
  const p = podstawaSP(klasa, rok).id;
  if (klasa <= 3) return L("edukacja polonistyczna|edukacja matematyczna|edukacja przyrodnicza|edukacja społeczna|edukacja plastyczna|edukacja muzyczna|edukacja techniczna|edukacja informatyczna|wychowanie fizyczne|język obcy nowożytny|etyka");
  const lista = ["język polski", "język obcy nowożytny", "matematyka", "historia", "informatyka", "wychowanie fizyczne", "edukacja zdrowotna", "etyka", "godzina wychowawcza"];
  if (klasa <= 7) lista.push("muzyka", "plastyka");
  if (klasa >= 7) lista.push("drugi język obcy", "biologia", "chemia", "fizyka", "geografia", "doradztwo zawodowe");
  if (klasa <= 6) {
    if (p === "kj2026") lista.push("przyroda", "zajęcia praktyczno-techniczne");
    else { lista.push("technika"); if (klasa === 4) lista.push("przyroda"); else lista.push("biologia", "geografia"); }
  }
  if (klasa === 8) lista.push(p === "kj2026" ? "kształcenie obronne" : "edukacja dla bezpieczeństwa", "wiedza o społeczeństwie");
  return [...new Set(lista)].sort((a, b) => a.localeCompare(b, "pl"));
}
const OGOLNE_PONAD = L("język polski|język angielski|język niemiecki|drugi język obcy|matematyka|historia|wiedza o społeczeństwie|edukacja obywatelska|geografia|biologia|chemia|fizyka|informatyka|biznes i zarządzanie|filozofia|plastyka|muzyka|edukacja dla bezpieczeństwa|edukacja zdrowotna|wychowanie fizyczne|etyka|godzina wychowawcza");

export const TYPY_SZKOL = [
  { id: "przedszkole", nazwa: "Przedszkole", ikona: "🧸", klasy: ["3-latki", "4-latki", "5-latki", "6-latki"], etap: "wychowanie przedszkolne",
    przedmioty: () => L("rozwój fizyczny|rozwój emocjonalny|rozwój społeczny|rozwój poznawczy|język obcy|zajęcia umuzykalniające") },
  { id: "sp13", nazwa: "Szkoła podstawowa, klasy 1–3", ikona: "✏️", klasy: [1, 2, 3], etap: "I etap edukacyjny (edukacja wczesnoszkolna)", przedmioty: (k, r) => przedmiotySP(+k, r) },
  { id: "sp48", nazwa: "Szkoła podstawowa, klasy 4–8", ikona: "🏫", klasy: [4, 5, 6, 7, 8], etap: "II etap edukacyjny", przedmioty: (k, r) => przedmiotySP(+k, r) },
  { id: "lo", nazwa: "Liceum ogólnokształcące", ikona: "🎓", klasy: [1, 2, 3, 4], etap: "III etap edukacyjny", przedmioty: () => OGOLNE_PONAD, zakresy: true },
  { id: "tech", nazwa: "Technikum", ikona: "🛠️", klasy: [1, 2, 3, 4, 5], etap: "III etap edukacyjny + kształcenie zawodowe",
    przedmioty: () => [...OGOLNE_PONAD, "przedmiot zawodowy (wpisz nazwę)"], zakresy: true, zawod: true },
  { id: "bs1", nazwa: "Branżowa szkoła I stopnia", ikona: "🔧", klasy: [1, 2, 3], etap: "III etap edukacyjny + kształcenie zawodowe",
    przedmioty: () => L("język polski|język obcy nowożytny|historia|wiedza o społeczeństwie|matematyka|informatyka|fizyka|chemia|biologia|geografia|edukacja dla bezpieczeństwa|edukacja zdrowotna|wychowanie fizyczne|przedmiot zawodowy (wpisz nazwę)"), zawod: true },
  { id: "uczelnia", nazwa: "Uczelnia / uniwersytet", ikona: "🏛️", klasy: ["I rok", "II rok", "III rok", "IV rok", "V rok", "studia podyplomowe"], etap: "szkolnictwo wyższe (PRK 6–7)",
    przedmioty: () => [], uczelnia: true },
  { id: "wlasna", nazwa: "Własna definicja szkoły", ikona: "➕", klasy: [], etap: "", przedmioty: () => [], wlasna: true },
];

/** Opis ramy programowej dla AI i dla nauczyciela. */
export function rama(s) {
  const t = TYPY_SZKOL.find(x => x.id === s.typ) || {};
  if (s.typ === "sp13" || s.typ === "sp48") {
    const p = podstawaSP(+s.klasa, s.rok || ROK_SZKOLNY);
    return { podstawa: p.id, nazwa: `Podstawa programowa kształcenia ogólnego dla szkoły podstawowej – ${p.nazwa}`, opis: p.opis, etap: t.etap };
  }
  if (s.typ === "lo" || s.typ === "tech" || s.typ === "bs1") {
    const nowa = (s.rok || ROK_SZKOLNY) >= 2027 && +s.klasa <= (s.rok || ROK_SZKOLNY) - 2026;
    return { podstawa: nowa ? "kj2026" : "pp2018", etap: t.etap,
      nazwa: `Podstawa programowa kształcenia ogólnego dla szkół ponadpodstawowych${s.zakres ? ` – zakres ${s.zakres}` : ""}${nowa ? " (Kompas Jutra)" : " (2018 z późn. zm.)"}`
        + (t.zawod ? `; kształcenie zawodowe: podstawa programowa kształcenia w zawodzie${s.zawod ? ` „${s.zawod}”` : ""}` : ""),
      opis: nowa ? "nowa podstawa dla szkół ponadpodstawowych (od 2027/28 w klasach I)" : "podstawa dla szkół ponadpodstawowych z 2018 r. z późniejszymi zmianami" };
  }
  if (s.typ === "przedszkole") return { podstawa: "przedszkole", nazwa: "Podstawa programowa wychowania przedszkolnego", opis: "", etap: t.etap };
  if (s.typ === "uczelnia") return { podstawa: "sylabus", nazwa: `Sylabus przedmiotu i efekty uczenia się kierunku${s.kierunek ? ` „${s.kierunek}”` : ""}`, opis: "Polska Rama Kwalifikacji, poziom 6–7", etap: t.etap };
  return { podstawa: "wlasna", nazwa: s.wlasnaRama || "Program nauczania zdefiniowany przez szkołę", opis: "", etap: s.etap || "" };
}

/* ------------------------------------------------------------------ tematy i wymagania
 * Klucz: przedmiot|klasa|podstawa. Wymagania szczegółowe zacytowane z podstawy programowej (ZPE).
 * Dla przedmiotów bez pełnej listy nauczyciel wpisuje temat sam albo prosi AI o propozycje.
 */
export const BIOLOGIA_CELE_OGOLNE = [
  "I. Znajomość różnorodności biologicznej oraz podstawowych zjawisk i procesów biologicznych.",
  "II. Planowanie i przeprowadzanie obserwacji oraz doświadczeń; wnioskowanie w oparciu o ich wyniki.",
  "III. Posługiwanie się informacjami pochodzącymi z analizy materiałów źródłowych.",
  "IV. Rozumowanie i zastosowanie nabytej wiedzy do rozwiązywania problemów biologicznych.",
  "V. Znajomość uwarunkowań zdrowia człowieka.",
];
const KRAZENIE = [
  { kod: "III.4.1", tekst: "rozpoznaje elementy budowy układu krążenia (na schemacie, rysunku, według opisu itd.) i przedstawia ich funkcje" },
  { kod: "III.4.2", tekst: "analizuje krążenie krwi w obiegu małym i dużym" },
  { kod: "III.4.3", tekst: "przedstawia rolę głównych składników krwi (krwinki czerwone i białe, płytki krwi, osocze)" },
  { kod: "III.4.4", tekst: "wymienia grupy krwi układu AB0 i Rh oraz przedstawia społeczne znaczenie krwiodawstwa" },
  { kod: "III.4.5", tekst: "przedstawia zasady prawidłowego pomiaru ciśnienia tętniczego krwi i stosuje się do tych zasad podczas wykonywania pomiaru" },
  { kod: "III.4.6", tekst: "analizuje wpływ aktywności fizycznej i prawidłowej diety na funkcjonowanie układu krążenia" },
  { kod: "III.4.7", tekst: "podaje zasady profilaktyki chorób układu krążenia (miażdżyca, nadciśnienie tętnicze, zawał serca)" },
  { kod: "III.4.8", tekst: "uzasadnia konieczność okresowego wykonywania badań kontrolnych krwi, pomiaru tętna i ciśnienia tętniczego" },
];
const dzial = (dzial, tematy, wymagania = []) => ({ dzial, tematy, wymagania });

export const TEMATY = {
  "biologia|7|pp2017": {
    zrodlo: "https://zpe.gov.pl/podstawa-programowa/szkola-podstawowa/biologia",
    celeOgolne: BIOLOGIA_CELE_OGOLNE,
    dzialy: [
      dzial("Organizm człowieka jako całość", ["Hierarchiczna budowa organizmu człowieka", "Tkanki człowieka"]),
      dzial("Skóra", ["Budowa i funkcje skóry", "Choroby i higiena skóry"]),
      dzial("Układ ruchu", ["Budowa szkieletu", "Połączenia kości", "Mięśnie – budowa i praca", "Choroby układu ruchu i profilaktyka"]),
      dzial("Układ pokarmowy i odżywianie się", ["Składniki pokarmowe", "Budowa i funkcje układu pokarmowego", "Higiena i choroby układu pokarmowego"]),
      dzial("Układ krążenia", ["Krew – skład i funkcje", "Naczynia krwionośne", "Budowa serca i układu krwionośnego – krwiobieg mały i duży",
        "Praca serca. Pomiar tętna i ciśnienia krwi", "Grupy krwi i krwiodawstwo", "Choroby układu krążenia i ich profilaktyka"], KRAZENIE),
      dzial("Układ odpornościowy", ["Odporność organizmu", "Szczepienia i przeszczepy"]),
      dzial("Układ oddechowy", ["Budowa i funkcje układu oddechowego", "Wymiana gazowa i oddychanie komórkowe", "Choroby układu oddechowego"]),
      dzial("Układ wydalniczy", ["Budowa i funkcje układu moczowego", "Choroby układu moczowego"]),
      dzial("Układ nerwowy", ["Budowa i funkcje układu nerwowego", "Odruchy", "Higiena układu nerwowego"]),
      dzial("Narządy zmysłów", ["Oko – budowa i działanie", "Ucho – narząd słuchu i równowagi", "Zmysły powonienia, smaku i dotyku"]),
      dzial("Regulacja hormonalna", ["Gruczoły dokrewne i hormony", "Zaburzenia hormonalne"]),
      dzial("Rozmnażanie i rozwój człowieka", ["Układ rozrodczy", "Etapy rozwoju człowieka"]),
    ],
  },
  "przyroda|4|kj2026": {
    zrodlo: "https://zpe.gov.pl/podstawa-programowa",
    dzialy: [
      dzial("Jak poznawać przyrodę", ["Obserwacja i doświadczenie", "Przyrządy badawcze – lupa i mikroskop"]),
      dzial("Orientacja w terenie", ["Kierunki geograficzne", "Plan i mapa"]),
      dzial("Pogoda i klimat", ["Składniki pogody", "Obserwacje pogody"]),
      dzial("Organizmy wokół nas", ["Rośliny i zwierzęta w najbliższym otoczeniu", "Zależności pokarmowe"]),
      dzial("Mój organizm i zdrowie", ["Jak dbać o zdrowie", "Ruch i odpoczynek"]),
    ],
  },
  "fizyka|7|pp2017": { dzialy: [dzial("Pierwsze spotkanie z fizyką", ["Wielkości fizyczne i jednostki"]), dzial("Siły i ruch", ["Ruch prostoliniowy jednostajny", "Zasady dynamiki Newtona"]), dzial("Energia", ["Praca i moc", "Zasada zachowania energii"])] },
  "historia|5|pp2017": { dzialy: [dzial("Starożytność", ["Egipt faraonów", "Demokracja ateńska", "Starożytny Rzym"]), dzial("Średniowiecze", ["Zamek i rycerstwo", "Polska pierwszych Piastów"])] },
  "matematyka|6|pp2017": { dzialy: [dzial("Geometria przestrzenna", ["Graniastosłupy", "Ostrosłupy", "Siatki brył"]), dzial("Liczby", ["Ułamki zwykłe i dziesiętne", "Liczby ujemne"])] },
};
/** Szukamy tematów dokładnie dla klasy; jak brak – podobne (ten sam przedmiot). */
export function tematyDla(przedmiot, klasa, podstawa) {
  return TEMATY[`${przedmiot}|${klasa}|${podstawa}`] || null;
}

/* ------------------------------------------------------------------ szablony sekcji */
const S = (klucz, tytul, typ, extra = {}) => ({ klucz, tytul, typ, ...extra });
export const SZABLONY = {
  konspekt: {
    nazwa: "Scenariusz lekcji (konspekt)", opis: "Standardowy układ: cele, podstawa programowa, metody, przebieg w etapach, podsumowanie, praca domowa.",
    sekcje: [
      S("informacje", "Informacje ogólne", "info"),
      S("podstawa", "Podstawa programowa – wymagania", "wymagania"),
      S("cele", "Cele lekcji i kryteria sukcesu (NaCoBeZu)", "tekst", { podpowiedz: "Cel ogólny, cele szczegółowe (Uczeń: …) i kryteria sukcesu" }),
      S("metody", "Metody, formy pracy i środki dydaktyczne", "tekst"),
      S("wstep", "Wprowadzenie", "etap", { czas: 5 }),
      S("etap1", "Część główna – etap 1", "etap", { czas: 10 }),
      S("etap2", "Część główna – etap 2", "etap", { czas: 10 }),
      S("etap3", "Część główna – etap 3", "etap", { czas: 10 }),
      S("podsumowanie", "Podsumowanie i sprawdzenie wiedzy", "etap", { czas: 10 }),
      S("praca_domowa", "Praca domowa", "tekst"),
      S("dostosowania", "Dostosowania (SPE) i uwagi", "tekst"),
      S("zrodla", "Materiały i źródła", "zrodla"),
    ],
  },
  wyklad: {
    nazwa: "Wykład / zajęcia akademickie", opis: "Efekty uczenia się, części wykładu, dyskusja i literatura.",
    sekcje: [
      S("informacje", "Informacje o zajęciach", "info"),
      S("podstawa", "Efekty uczenia się (sylabus)", "wymagania"),
      S("cele", "Cele zajęć", "tekst"),
      S("wstep", "Wprowadzenie do problemu", "etap", { czas: 10 }),
      S("etap1", "Część I", "etap", { czas: 25 }),
      S("etap2", "Część II", "etap", { czas: 25 }),
      S("podsumowanie", "Dyskusja i podsumowanie", "etap", { czas: 15 }),
      S("praca_domowa", "Zadania i lektury na kolejne zajęcia", "tekst"),
      S("zrodla", "Literatura i materiały", "zrodla"),
    ],
  },
  krotki: {
    nazwa: "Krótki plan lekcji", opis: "Minimum: cele, trzy etapy i podsumowanie – na szybko.",
    sekcje: [
      S("informacje", "Informacje ogólne", "info"),
      S("podstawa", "Podstawa programowa", "wymagania"),
      S("cele", "Cele lekcji", "tekst"),
      S("wstep", "Początek lekcji", "etap", { czas: 5 }),
      S("etap1", "Najważniejsza część", "etap", { czas: 30 }),
      S("podsumowanie", "Zakończenie", "etap", { czas: 10 }),
    ],
  },
};
export const nowaSekcja = (wzor, i) => ({ id: "s" + Math.random().toString(36).slice(2, 9), ...wzor, tresc: "", narracja: "", media: [], quiz: [], wAR: wzor.typ === "etap", tablica: true, i });
