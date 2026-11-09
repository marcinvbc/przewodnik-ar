/*
 * AI generatora scenariuszy.
 *  - Z Supabase: funkcja „claude” (tryb "generator") – Claude pisze treści, quizy, ilustracje (SVG) i przepisy modeli 3D,
 *    zawsze w ramie podstawy programowej przekazanej w kontekście.
 *  - Bez serwera (tryb demo): „AI pokazowe” – odpowiedzi z gotowego scenariusza o sercu i szablonów.
 *    Pozwala przejść cały proces i zobaczyć, jak to działa, ale nie pisze nowych treści.
 */
import { SCENARIUSZ_SERCE, BIBLIOTEKA } from "./pokazowa-biologia/scenariusz.js";
import { tematyDla } from "./gen-dane.js";

export function kontekstAI(sc, sekcja) {
  return {
    szkola: sc.szkolaOpis, klasa: sc.szkola?.klasa, przedmiot: sc.przedmiot, dzial: sc.dzial, temat: sc.temat, czas: sc.czas,
    rama: sc.rama?.nazwa, ramaOpis: sc.rama?.opis,
    wymagania: (sc.wymaganiaLista || []).filter(w => (sc.wymagania || []).includes(w.kod)).map(w => `${w.kod} ${w.tekst}`),
    wymaganiaWlasne: sc.wymaganiaWlasne || "",
    sekcja: sekcja ? { klucz: sekcja.klucz, typ: sekcja.typ, tytul: sekcja.tytul, czas: sekcja.czas, tresc: sekcja.tresc, narracja: sekcja.narracja } : null,
    plan: (sc.sekcje || []).filter(s => s.typ === "etap").map(s => `${s.tytul} (${s.czas || "?"} min)`),
  };
}

/** zadanie: napisz | rozwin | uprosc | popraw | polecenie | quiz | tematy | obraz | model */
export async function ai(b, zadanie, ctx) {
  if (b.ai?.dostepne && !b.demo) {
    const r = await b.ai.generator({ zadanie, ...ctx });
    return { ...r, prawdziwe: true };
  }
  await new Promise(r => setTimeout(r, 450 + Math.random() * 500));       // „myślenie”
  return { ...pokazowe(zadanie, ctx), pokazowe: true };
}

/* ======================================================================= AI POKAZOWE */
const SERCE = /serc|krąż|krwi|krwio|tętn|naczy/i;
const zdania = t => (String(t || "").match(/[^.!?\n]+[.!?]*/g) || []).map(s => s.trim()).filter(Boolean);
const bankSekcji = sekcja => {
  if (!sekcja) return null;
  const bank = SCENARIUSZ_SERCE.sekcje;
  if (bank[sekcja.klucz]) return bank[sekcja.klucz];
  const slowa = String(sekcja.tytul || "").toLowerCase().split(/\W+/).filter(w => w.length > 3);
  return Object.values(bank).find(s => s.tytul && slowa.some(w => s.tytul.toLowerCase().includes(w.slice(0, 5)))) || null;
};

const ROZWINIECIA = {
  wstep: "Ciekawostka na start: serce dorosłego człowieka przepompowuje w spoczynku ok. 5 litrów krwi na minutę – tyle, ile mieści duża butelka wody razy trzy.",
  etap1: "Serce leży w klatce piersiowej, między płucami, lekko po lewej stronie. Otacza je worek osierdziowy, a mięsień serca odżywiają naczynia wieńcowe – ich zatkanie to przyczyna zawału.",
  etap2: "Puls, który czujemy na nadgarstku, to fala rozciągająca sprężystą ścianę tętnicy po każdym skurczu lewej komory. Dlatego tętno mierzymy na tętnicach, a nie na żyłach.",
  etap3: "Uwaga na pułapkę: tętnice płucne prowadzą krew odtlenowaną, a żyły płucne – utlenowaną. O nazwie naczynia decyduje kierunek przepływu (od serca / do serca), a nie ilość tlenu.",
  etap4: "Wynik można przeliczyć: liczba uderzeń w 15 s × 4 = tętno na minutę. U nastolatków w spoczynku to zwykle 60–100 uderzeń na minutę.",
  podsumowanie: "Na koniec warto wrócić do pytania z początku lekcji i porównać szacunki uczniów z prawdziwą liczbą skurczów serca w ciągu doby.",
};

function ogolny(klucz, typ, ctx, pole) {
  const t = ctx.temat || "temat lekcji", s = ctx.sekcja || {}, wym = ctx.wymagania || [];
  if (pole === "narracja") return `Teraz zajmiemy się częścią „${s.tytul}”. Przyjrzyjcie się uważnie materiałom wokół was – za chwilę sprawdzimy, co zapamiętaliście.`;
  if (klucz === "cele") return `Cel ogólny: Uczeń poznaje zagadnienie „${t}”.\n\nCele szczegółowe – uczeń:\n${(wym.length ? wym.map(w => "• " + w.replace(/^\S+\s/, "")) : ["• wyjaśnia najważniejsze pojęcia związane z tematem;", "• podaje przykłady z życia codziennego;", "• stosuje zdobytą wiedzę w zadaniu."]).join("\n")}\n\nNaCoBeZu:\n• Potrafię własnymi słowami wyjaśnić, czym jest „${t}”.\n• Umiem podać dwa przykłady.`;
  if (klucz === "metody") return "Metody: pogadanka, pokaz z modelami 3D w rozszerzonej rzeczywistości (AR), praca z ilustracją, quiz.\nFormy pracy: praca z całą klasą, w parach, indywidualna.\nŚrodki dydaktyczne: lekcja AR (telefony uczniów, projektor), ilustracje, karta pracy.";
  if (klucz === "praca_domowa") return `Przygotuj krótką notatkę (5–6 zdań) lub mapę myśli: „${t}”.`;
  if (klucz === "dostosowania") return "• Uczniowie z dysleksją: odsłuch tekstu przewodnika, większa czcionka w karcie pracy.\n• Uczniowie zdolni: zadanie dodatkowe o podwyższonym stopniu trudności.\n• Brak telefonu: praca w parach lub widok sceny na projektorze.";
  if (typ === "etap") return `1. Nauczyciel wprowadza zagadnienie „${s.tytul}”.\n2. Uczniowie oglądają materiały w AR i odpowiadają na pytania.\n3. Krótkie podsumowanie etapu i notatka w zeszycie.`;
  return `Treść sekcji „${s.tytul}” dla tematu „${t}”.`;
}

function pokazowe(zadanie, ctx) {
  const serce = /serc|krwiob/i.test(ctx.temat || "");             // gotowe treści tylko dla lekcji o sercu
  const s = ctx.sekcja || {}, pole = ctx.pole || "tresc";
  const bank = serce ? bankSekcji(s) : null;
  const tekst = s[pole] || "";
  switch (zadanie) {
    case "napisz": {
      const t = bank?.[pole] || ogolny(s.klucz, s.typ, ctx, pole);
      return { tekst: t, uwaga: bank ? "" : "W trybie pokazowym to szablon – po podłączeniu Claude dostaniesz treść napisaną dla tego tematu." };
    }
    case "rozwin": {
      const extra = serce && ROZWINIECIA[s.klucz] ? ROZWINIECIA[s.klucz] : `Przykład z życia codziennego: poproś uczniów, by podali sytuację, w której spotykają się z zagadnieniem „${ctx.temat}”.`;
      return { tekst: (tekst ? tekst.trimEnd() + "\n\n" : "") + extra };
    }
    case "uprosc": {
      const par = tekst.split(/\n{2,}/).map(p => p.includes("\n") ? p.split("\n").slice(0, 4).join("\n") : zdania(p).slice(0, 2).join(" "));
      return { tekst: par.join("\n\n").replace(/\(([^)]{30,})\)/g, ""), uwaga: "Tryb pokazowy skraca tekst. Claude uprości też słownictwo do poziomu klasy." };
    }
    case "popraw": {
      const t = tekst.replace(/[ \t]+/g, " ").replace(/ ([,.;:!?])/g, "$1").replace(/(^|[.!?]\s+)([a-ząćęłńóśźż])/g, (m, a, c) => a + c.toUpperCase()).trim();
      return { tekst: /[.!?…:]$/.test(t) ? t : t + "." };
    }
    case "polecenie":
      return { tekst: tekst, uwaga: `Tryb pokazowy nie wykonuje własnych poleceń („${ctx.polecenie}”). Po podłączeniu Claude to polecenie zostanie wykonane – w ramach podstawy programowej.` };
    case "quiz": {
      if (bank?.quiz?.length) return { quiz: bank.quiz };
      const z = zdania(s.narracja || s.tresc)[0];
      return { quiz: [{ pytanie: `Prawda czy fałsz: ${z || "…"}`, odpowiedzi: ["prawda", "fałsz"], poprawna: 0 }] };
    }
    case "tematy": {
      const t = tematyDla(ctx.przedmiot, ctx.klasa, ctx.podstawa);
      return { tematy: t ? t.dzialy.flatMap(d => d.tematy).slice(0, 8) : ["Wprowadzenie do działu", "Najważniejsze pojęcia", "Powtórzenie wiadomości"] };
    }
    case "obraz": return obrazPokazowy(ctx);
    case "model": return modelPokazowy(ctx);
  }
  return { tekst };
}

/* ---------------------------------------------------------------- obrazy (SVG) */
const pasuje = (item, txt) => item.slowa.reduce((a, w) => a + (txt.includes(w) ? 1 : 0), 0);
function najlepszy(lista, txt) {
  let best = null, bs = 0;
  for (const it of lista) { const p = pasuje(it, txt); if (p > bs) { bs = p; best = it; } }
  return best;
}
export const POPRAWKI_SVG = [
  [/bez podpis|usuń podpis|ukryj podpis|do podpisania|kartkówk/i, svg => svg.replace(/<g class="podpisy">[\s\S]*?<\/g>\n?/g, ""), "Usunąłem podpisy – świetne do kartkówki lub zadania „podpisz elementy”."],
  [/bez strzał|usuń strzał/i, svg => svg.replace(/<g class="strzalki">[\s\S]*?<\/g>\n?/g, ""), "Usunąłem strzałki przepływu."],
  [/bez tytuł|usuń tytuł/i, svg => svg.replace(/<text class="tytul"[^>]*>[\s\S]*?<\/text>/g, ""), "Usunąłem tytuł."],
  [/bez legend|usuń legend/i, svg => svg.replace(/<g class="legenda"[\s\S]*?<\/g>/g, ""), "Usunąłem legendę."],
  [/większ|powiększ|czytel/i, svg => svg.replace(/\.podpisy text\{font-size:(\d+)px/, (m, n) => `.podpisy text{font-size:${Math.round(n * 1.25)}px`).replace(/class="tytul" /g, 'class="tytul" style="font-size:58px" '), "Powiększyłem napisy – będą czytelne na projektorze i w AR."],
  [/ciemn|czarn.*tło|tryb nocny/i, svg => svg.replace(/<rect width="(\d+)" height="(\d+)" fill="#fffdf8"\/>/, '<rect width="$1" height="$2" fill="#1f2a2e"/>').replace(/fill:#1f2a2e/g, "fill:#f6f1e7").replace(/stroke:#1f2a2e/g, "stroke:#f6f1e7"), "Zmieniłem tło na ciemne."],
  [/jasn.*tło|biał.*tło/i, svg => svg.replace(/<rect width="(\d+)" height="(\d+)" fill="#[0-9a-f]{6}"\/>/i, '<rect width="$1" height="$2" fill="#ffffff"/>'), "Ustawiłem białe tło."],
];

async function wczytajSvg(url) { return (await fetch(url)).text(); }

function obrazPokazowy(ctx) {
  const txt = `${ctx.polecenie || ""} ${ctx.sekcja?.tytul || ""} ${ctx.temat || ""}`.toLowerCase();
  // poprawka istniejącego obrazu
  if (ctx.poprzedni) {
    const p = POPRAWKI_SVG.find(([re]) => re.test(ctx.polecenie || ""));
    if (p) return { svg: p[1](ctx.poprzedni), odpowiedz: p[2] };
    return { svg: ctx.poprzedni, odpowiedz: "W trybie pokazowym potrafię: usunąć podpisy, strzałki, tytuł lub legendę, powiększyć napisy, zmienić tło na ciemne lub jasne. Swobodne poprawki („dorysuj…”, „zmień kolor…”) wykona Claude po podłączeniu serwera." };
  }
  if (SERCE.test(txt)) {
    const it = najlepszy(BIBLIOTEKA.obrazy, txt) || BIBLIOTEKA.obrazy[0];
    return { svgUrl: it.svg, nazwa: it.nazwa, odpowiedz: `Przygotowałem ilustrację „${it.nazwa}”. Napisz, co poprawić – np. „bez podpisów”, „większe napisy”, „ciemne tło”.` };
  }
  return { svg: plansza(ctx), nazwa: ctx.sekcja?.tytul || ctx.temat, odpowiedz: "Przygotowałem planszę z najważniejszymi punktami tego etapu. Claude (po podłączeniu) narysuje pełną ilustrację tematyczną." };
}

/** Prosta infografika z tytułu i punktów – działa dla każdego tematu. */
export function plansza(ctx) {
  const s = ctx.sekcja || {};
  const pkt = zdania(s.narracja || s.tresc).slice(0, 4);
  const esc = t => String(t).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const zawin = (t, n) => { const w = t.split(" "), out = [""]; for (const x of w) { if ((out[out.length - 1] + " " + x).length > n) out.push(x); else out[out.length - 1] = (out[out.length - 1] + " " + x).trim(); } return out; };
  const kol = ["#c9562f", "#e0a030", "#2f6b3a", "#3f63c9"];
  const karty = (pkt.length ? pkt : [ctx.temat || "Temat lekcji"]).map((p, i) => {
    const x = 70 + (i % 2) * 830, y = 260 + Math.floor(i / 2) * 330;
    return `<rect x="${x}" y="${y}" width="790" height="290" rx="30" fill="#fff" stroke="#e3dccd" stroke-width="4"/>
<circle cx="${x + 70}" cy="${y + 75}" r="42" fill="${kol[i]}"/><text x="${x + 70}" y="${y + 92}" text-anchor="middle" font-size="46" font-weight="800" fill="#fff">${i + 1}</text>
${zawin(p, 34).slice(0, 4).map((l, k) => `<text x="${x + 135}" y="${y + 88 + k * 48}" font-size="36" fill="#1f2a2e">${esc(l)}</text>`).join("")}`;
  }).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1800 980" width="1800" height="980" font-family="'Segoe UI', Roboto, 'DejaVu Sans', Arial, sans-serif">
<style>.podpisy text{font-size:36px}</style><rect width="1800" height="980" fill="#fffdf8"/>
<text class="tytul" x="70" y="130" font-size="64" font-weight="800" fill="#1f2a2e">${esc(s.tytul || ctx.temat || "")}</text>
<text x="70" y="190" font-size="32" fill="#6b6f66">${esc(ctx.przedmiot || "")}${ctx.klasa ? " · klasa " + esc(ctx.klasa) : ""} · ${esc(ctx.temat || "")}</text>
<g class="podpisy">${karty}</g></svg>`;
}
export { wczytajSvg };

/* ---------------------------------------------------------------- modele 3D */
function modelPokazowy(ctx) {
  const txt = `${ctx.polecenie || ""} ${ctx.sekcja?.tytul || ""} ${ctx.temat || ""}`.toLowerCase();
  if (SERCE.test(txt) || /krew|krwink/.test(txt)) {
    const it = najlepszy(BIBLIOTEKA.modele, (ctx.polecenie || "").toLowerCase()) || najlepszy(BIBLIOTEKA.modele, txt) || BIBLIOTEKA.modele[0];
    return { model: it, odpowiedz: `Proponuję model „${it.nazwa}”. Możesz poprosić o inny: „przekrój serca”, „naczynia krwionośne”, „składniki krwi”, „całe serce”.` };
  }
  const przepisy = {
    komorka: { nazwa: "Komórka (model uproszczony)", czesci: [
      { nazwa: "błona", ksztalt: "kula", pozycja: [0, 0.5, 0], rozmiar: [1, 0.8, 1], kolor: "#9fd3a8", przezroczystosc: 0.45 },
      { nazwa: "jądro", ksztalt: "kula", pozycja: [0.1, 0.55, 0], rozmiar: [0.32, 0.3, 0.32], kolor: "#6b4fb3" },
      { nazwa: "mitochondrium", ksztalt: "kapsula", pozycja: [-0.45, 0.45, 0.2], rozmiar: [0.12, 0.3, 0.12], obrot: [0, 0, 70], kolor: "#e07a3a" },
      { nazwa: "mitochondrium 2", ksztalt: "kapsula", pozycja: [0.4, 0.35, -0.35], rozmiar: [0.1, 0.26, 0.1], obrot: [40, 0, 20], kolor: "#e07a3a" }],
      animacja: { typ: "obrot", okres: 12 }, podpisy: [{ tekst: "jądro", pozycja: [0.1, 1.05, 0] }] },
    czasteczka: { nazwa: "Cząsteczka wody H₂O", czesci: [
      { nazwa: "O", ksztalt: "kula", pozycja: [0, 0.6, 0], rozmiar: [0.42, 0.42, 0.42], kolor: "#e0473a" },
      { nazwa: "H1", ksztalt: "kula", pozycja: [-0.5, 0.25, 0], rozmiar: [0.26, 0.26, 0.26], kolor: "#f2f2f2" },
      { nazwa: "H2", ksztalt: "kula", pozycja: [0.5, 0.25, 0], rozmiar: [0.26, 0.26, 0.26], kolor: "#f2f2f2" },
      { nazwa: "wiązanie1", ksztalt: "rura", sciezka: [[0, 0.6, 0], [-0.5, 0.25, 0]], promien: 0.06, kolor: "#bbbbbb" },
      { nazwa: "wiązanie2", ksztalt: "rura", sciezka: [[0, 0.6, 0], [0.5, 0.25, 0]], promien: 0.06, kolor: "#bbbbbb" }],
      animacja: { typ: "obrot", okres: 8 } },
    bryla: { nazwa: "Bryły: sześcian, ostrosłup, walec, stożek", czesci: [
      { nazwa: "sześcian", ksztalt: "szescian", pozycja: [-1.2, 0.35, 0], rozmiar: [0.7, 0.7, 0.7], kolor: "#3f63c9" },
      { nazwa: "ostrosłup", ksztalt: "ostroslup", pozycja: [-0.4, 0.35, 0], rozmiar: [0.7, 0.7, 0.7], kolor: "#e0a030" },
      { nazwa: "walec", ksztalt: "walec", pozycja: [0.4, 0.35, 0], rozmiar: [0.6, 0.7, 0.6], kolor: "#2f6b3a" },
      { nazwa: "stożek", ksztalt: "stozek", pozycja: [1.2, 0.35, 0], rozmiar: [0.6, 0.7, 0.6], kolor: "#c9562f" }],
      animacja: { typ: "obrot", okres: 10 } },
  };
  const k = /cząst|atom|wod|molek/.test(txt) ? "czasteczka" : /bry|geometr|sześcian|ostrosłup|graniast|walec|stoż/.test(txt) ? "bryla" : "komorka";
  return { przepis: przepisy[k], odpowiedz: `W trybie pokazowym mam kilka gotowych przepisów (komórka, cząsteczka, bryły). Wybrałem: „${przepisy[k].nazwa}”. Claude po podłączeniu zbuduje model dla dowolnego opisu.` };
}
