/* Szkolenie zdalne „Mistrz Kanapek” – wspólne reguły dla panelu szkoleniowca i tabletu uczestnika.
   Poziomy, kryteria zaliczenia i ocena prób są tu w jednym miejscu, żeby obie strony liczyły tak samo. */
import { MENU } from "./menu.js?v=47";

export const POZIOMY = {
  1: { nazwa: "Nauka z podpowiedzią", krotko: "z podpowiedzią", ikona: "🟢", dla: "dla początkujących",
       opis: "Receptura na ekranie, podświetlony pojemnik, wskazówka do każdego kroku. Przy pomyłce gra mówi, czego brakuje." },
  2: { nazwa: "Ćwiczenie", krotko: "tylko nazwa kroku", ikona: "🟡", dla: "po pierwszej nauce",
       opis: "Na ekranie tylko nazwa kolejnego składnika – bez receptury, podświetleń i wskazówek." },
  3: { nazwa: "Z pamięci", krotko: "bez podpowiedzi", ikona: "🟠", dla: "sprawdzenie pamięci",
       opis: "Żadnych nazw kroków. Przy pomyłce tylko „to nie ten składnik”. Sprawdza zapamiętanie kolejności." },
  4: { nazwa: "Egzamin", krotko: "egzamin z limitem", ikona: "🔴", dla: "na zaliczenie",
       opis: "Jak „Z pamięci”, plus limit czasu i jedna próba (bez powtórki na tablecie)." },
};

export const KRYTERIA_DOMYSLNE = {
  limitCzasu: 120,        // [s] maks. wynik (czas + kary) na poziomie 3–4, żeby pozycja była zaliczona
  maxBledowKolejnosci: 0, // pomyłki kolejności składników dopuszczalne w próbie zaliczającej
  maxInnychBledow: 2,     // inne błędy (niedosmażone, krzywo, za mało sosu…)
  minDokladnosc: 70,      // [%] równość układania
  probPamieci: 2,         // tyle prób „z pamięci” bez żadnej pomyłki kolejności = kolejność opanowana pamięciowo
};

export const OPIS_KRYTERIOW = k => [
  `<b>Pozycja zaliczona</b> – co najmniej jedna próba na poziomie 🟠 „Z pamięci” albo 🔴 „Egzamin”, w której: pomyłek kolejności ≤ ${k.maxBledowKolejnosci}, innych błędów ≤ ${k.maxInnychBledow}, wynik (czas + kary) ≤ ${k.limitCzasu} s i równość układania ≥ ${k.minDokladnosc}%.`,
  `<b>Kolejność opanowana pamięciowo</b> – ${k.probPamieci} ${k.probPamieci === 1 ? "próba" : "próby"} bez podpowiedzi (poziom 🟠 lub 🔴) bez ani jednej pomyłki kolejności składników.`,
  `<b>Szkolenie zaliczone</b> – każda pozycja z programu szkolenia jest zaliczona i ma opanowaną pamięciowo kolejność.`,
  `<b>Trafność kolejności</b> (wskaźnik pamięci) = odsetek kroków złożonych za pierwszym razem, liczony z prób bez podpowiedzi.`,
];

export const nazwaDania = id => (MENU.find(d => d.id === id) || { nazwa: id }).nazwa;
export const danieId = id => MENU.find(d => d.id === id) || MENU[0];

/** Ocena jednej próby względem kryteriów. */
export function ocenProbe(p, k = KRYTERIA_DOMYSLNE) {
  const powody = [];
  if (p.poziom < 3) powody.push("próba z podpowiedziami nie liczy się do zaliczenia");
  if (p.bledyKol > k.maxBledowKolejnosci) powody.push(`pomyłki kolejności: ${p.bledyKol} (dopuszczalne ${k.maxBledowKolejnosci})`);
  if (p.bledyInne > k.maxInnychBledow) powody.push(`inne błędy: ${p.bledyInne} (dopuszczalne ${k.maxInnychBledow})`);
  if (p.wynik > k.limitCzasu) powody.push(`wynik ${p.wynik.toFixed(1)} s > limit ${k.limitCzasu} s`);
  if (p.dok < k.minDokladnosc) powody.push(`równość ${p.dok}% < ${k.minDokladnosc}%`);
  const pamiec = p.poziom >= 3 && p.bledyKol === 0;
  return { zaliczona: !powody.length, pamiec, powody };
}
/** Trafność kolejności w próbie: kroki trafione za pierwszym razem / wszystkie kroki. */
export const trafnosc = p => Math.max(0, Math.round((1 - (p.pierwszeProbyZle ?? p.bledyKol) / Math.max(1, p.n)) * 100));

/** Stan uczestnika dla każdej pozycji programu. */
export function ocenUczestnika(probyU, program, k = KRYTERIA_DOMYSLNE) {
  const pozycje = program.map(id => {
    const l = probyU.filter(p => p.danie === id), bez = l.filter(p => p.poziom >= 3);
    const zal = l.find(p => ocenProbe(p, k).zaliczona), czystePamiec = bez.filter(p => p.bledyKol === 0).length;
    const naj = l.length ? l.reduce((a, b) => (b.wynik < a.wynik ? b : a)) : null;
    return { id, prob: l.length, maxPoziom: l.reduce((m, p) => Math.max(m, p.poziom), 0), zaliczona: !!zal, pamiec: czystePamiec >= k.probPamieci, czystePamiec,
      trafnosc: bez.length ? Math.round(bez.reduce((s, p) => s + trafnosc(p), 0) / bez.length) : null, najlepszy: naj?.wynik ?? null };
  });
  const brakuje = pozycje.filter(p => !p.zaliczona || !p.pamiec).map(p => `${nazwaDania(p.id)}: ${!p.zaliczona ? "brak próby zaliczającej" : ""}${!p.zaliczona && !p.pamiec ? ", " : ""}${!p.pamiec ? `pamięć ${p.czystePamiec}/${k.probPamieci}` : ""}`);
  return { pozycje, zaliczone: program.length > 0 && !brakuje.length, brakuje };
}
