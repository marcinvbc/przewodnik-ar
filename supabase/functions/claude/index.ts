// =====================================================================
//  Funkcja „claude” – pośrednik między aplikacją a Claude API.
//  Klucz API zostaje na serwerze (sekret ANTHROPIC_API_KEY), nigdy nie trafia do przeglądarki.
//
//  Tryby:
//   { tryb: "plan",    tytul, materialy: [...] }   → plan scen lekcji (tylko zalogowany nauczyciel)
//   { tryb: "pytanie", pytanie, kontekst }          → krótka odpowiedź Bartka dla ucznia / zwiedzającego
//   { tryb: "generator", zadanie, ...kontekst }     → generator scenariuszy (tylko zalogowany nauczyciel):
//        zadanie: napisz | rozwin | uprosc | popraw | polecenie | quiz | tematy | obraz (SVG) | model (przepis 3D)
//        Zawsze w ramie podstawy programowej / sylabusa przekazanej w kontekście.
//
//  Sekrety (Supabase → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY  – wymagany
//   CLAUDE_MODEL       – opcjonalnie, model do planowania (domyślnie claude-sonnet-5-5)
//   CLAUDE_MODEL_SZYBKI– opcjonalnie, model do odpowiedzi na pytania (domyślnie claude-haiku-5-5)
// =====================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

async function claude(model: string, system: string, user: string, maxTokens: number) {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("Brak sekretu ANTHROPIC_API_KEY w Supabase");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  if (!r.ok) throw new Error(`Claude API: ${r.status} ${await r.text()}`);
  const data = await r.json();
  return (data.content || []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("\n");
}

const SYSTEM_PLAN = `Jesteś doświadczonym nauczycielem-metodykiem i reżyserem lekcji w rozszerzonej rzeczywistości (AR).
Nauczyciel wgrał materiały (slajdy, zdjęcia, filmy, modele 3D). Ułóż z nich angażującą lekcję podzieloną na 3–7 scen.
Każda scena to wspólna przestrzeń AR, którą uczniowie oglądają telefonami wokół biurka nauczyciela.

Zasady:
- Używaj WYŁĄCZNIE identyfikatorów materiałów z listy. Każdy slajd, zdjęcie, film i model użyj dokładnie raz (pomiń tylko ewidentne duplikaty).
- Zachowaj logiczną kolejność slajdów (kolejność stron prezentacji).
- Model 3D umieszczaj w scenie, której slajdy mówią o tym samym (porównaj nazwę pliku z tekstem slajdów).
- W scenie maksymalnie 6 elementów. Film najlepiej w osobnej scenie lub z 1–2 slajdami.
- Układy: "muzeum" (model na środku, ekrany w półkolu za nim), "teatr" (jeden duży ekran, np. film, i małe po bokach),
  "orbita" (elementy dookoła – każdy uczeń widzi inny), "galeria" (ściana z wieloma slajdami/zdjęciami).
- Dla każdej sceny napisz "narracja": 2–4 zdania, które przewodnik Bartek przeczyta uczniom (po polsku, prosto, ciekawie).
- Dodaj quiz: w 1–3 scenach po 1–2 pytania jednokrotnego wyboru (3–4 odpowiedzi), sprawdzające zrozumienie.
- Odpowiedz WYŁĄCZNIE poprawnym JSON-em (bez komentarzy i bez \`\`\`), w formacie:
{"tytul":"…","sceny":[{"tytul":"…","uklad":"muzeum|teatr|orbita|galeria","elementy":["id1","id2"],"narracja":"…",
"quiz":[{"pytanie":"…","odpowiedzi":["…","…","…"],"poprawna":0}]}]}`;

const SYSTEM_PYTANIE = `Jesteś Bartek – przyjazny przewodnik i pomocnik na lekcji w rozszerzonej rzeczywistości.
Odpowiadasz uczniom i zwiedzającym po polsku, krótko (2–4 zdania), prostym językiem, ciepło i z entuzjazmem.
Opieraj się przede wszystkim na podanym kontekście (opis atrakcji lub treść lekcji). Możesz dodać ogólnie znaną wiedzę,
ale nie zmyślaj konkretnych dat, liczb ani nazwisk, jeśli nie masz pewności – wtedy powiedz, że warto zapytać nauczyciela.
Jeśli pytanie nie dotyczy tematu albo jest niestosowne, grzecznie wróć do tematu lekcji. Nie używaj formatowania markdown.`;


// ===================================================================== GENERATOR SCENARIUSZY
const tekstBezMd = (t: string) => t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#+\s*/gm, "").replace(/^[-*]\s+/gm, "• ").trim();
function ramaTekst(k: Record<string, unknown>) {
  const w = (k.wymagania as string[] || []).slice(0, 30).map(x => "– uczeń " + String(x).slice(0, 300)).join("\n");
  return `RAMA PROGRAMOWA (obowiązuje bezwzględnie):
Szkoła: ${String(k.szkola || "").slice(0, 200)}
Przedmiot: ${String(k.przedmiot || "").slice(0, 80)}${k.dzial ? `, dział: ${String(k.dzial).slice(0, 100)}` : ""}
Dokument: ${String(k.rama || "").slice(0, 300)} ${k.ramaOpis ? `(${String(k.ramaOpis).slice(0, 200)})` : ""}
Temat lekcji: ${String(k.temat || "").slice(0, 200)} · czas: ${String(k.czas || 45)} min
Wymagania realizowane na lekcji:
${w || "(nauczyciel nie zaznaczył – trzymaj się typowych wymagań podstawy dla tego przedmiotu i tej klasy)"}
${k.wymaganiaWlasne ? "Dodatkowo wpisane przez nauczyciela:\n" + String(k.wymaganiaWlasne).slice(0, 1500) : ""}
Plan etapów: ${(k.plan as string[] || []).slice(0, 12).join(" → ")}`;
}
const SYSTEM_GEN = `Jesteś doświadczonym polskim nauczycielem-metodykiem i autorem materiałów dydaktycznych. Pomagasz nauczycielowi przygotować scenariusz lekcji, który potem zostanie pokazany uczniom w rozszerzonej rzeczywistości (AR).
Zasady, których nie wolno złamać:
1. Piszesz WYŁĄCZNIE w ramie programowej podanej w wiadomości: tylko treści wynikające z wymienionych wymagań, na poziomie tej klasy / tego etapu. Nie wprowadzaj pojęć, wzorów ani faktów, które wykraczają poza podstawę dla tej klasy.
2. Jeśli polecenie nauczyciela wychodzi poza ramę, wykonaj wersję zgodną z ramą i dopisz na końcu jedno zdanie zaczynające się od „Uwaga:”, co pominąłeś i dlaczego.
3. Poprawność merytoryczna przede wszystkim. Nie zmyślaj liczb, dat, cytatów, nazwisk, adresów stron ani tytułów książek. Jeśli czegoś nie jesteś pewien – pomiń.
4. Język polski, poprawny, przyjazny; dla uczniów – krótkie zdania i słownictwo dopasowane do wieku.
5. Bez markdown (bez #, **). Listy zapisuj znakiem „•” albo numeracją „1.”.`;
const POLA: Record<string, string> = {
  cele: "Cel ogólny (1 zdanie), cele szczegółowe w formie „uczeń: …” (4–6 punktów, każdy odwołuje się do zaznaczonych wymagań) oraz NaCoBeZu – kryteria sukcesu w 1. osobie („Potrafię…”, 3–5 punktów).",
  metody: "Metody, formy pracy i środki dydaktyczne – trzy krótkie akapity zaczynające się od „Metody:”, „Formy pracy:”, „Środki dydaktyczne:”. Uwzględnij lekcję AR (modele 3D na telefonach uczniów).",
  praca_domowa: "Praca domowa: zadanie obowiązkowe (krótkie, wykonalne w 15–20 min) i opcjonalne zadanie dla chętnych.",
  dostosowania: "Dostosowania dla uczniów ze specjalnymi potrzebami edukacyjnymi (dysleksja, słabowidzący, zdolni, brak telefonu, przeciwwskazania do wysiłku – jeśli dotyczy) – 4–6 punktów.",
  zrodla: "Materiały i źródła: tylko pewne pozycje (np. podstawa programowa – Zintegrowana Platforma Edukacyjna zpe.gov.pl). Nie wymyślaj tytułów ani adresów.",
  tresc_etap: "Przebieg etapu dla nauczyciela: 3–6 ponumerowanych kroków (czynności nauczyciela i uczniów, pytania kluczowe z oczekiwaną odpowiedzią w nawiasie, praca z modelem 3D/ilustracją, ewentualne zasady bezpieczeństwa). Zmieść się w czasie etapu.",
  narracja: "Tekst dla uczniów, który przewodnik Bartek przeczyta na głos w lekcji AR: 2–4 krótkie, ciekawe zdania, zwracające się do uczniów („Spójrzcie…”), bez wyliczeń i nawiasów.",
};
async function generator(body: Record<string, unknown>) {
  const z = String(body.zadanie || ""), sek = (body.sekcja || {}) as Record<string, string>, pole = String(body.pole || "tresc");
  const rama = ramaTekst(body);
  const opisPola = pole === "narracja" ? POLA.narracja : sek.typ === "etap" ? POLA.tresc_etap : (POLA[sek.klucz] || `Treść sekcji „${sek.tytul}” scenariusza lekcji.`);
  const obecny = String((sek as Record<string, string>)[pole] || "").slice(0, 5000);
  const kontekstSek = `Sekcja: „${String(sek.tytul || "").slice(0, 120)}”${sek.czas ? ` (${sek.czas} min)` : ""}.
${pole === "narracja" && sek.tresc ? "Przebieg tego etapu (dla kontekstu):\n" + String(sek.tresc).slice(0, 2500) : ""}`;
  const M = Deno.env.get("CLAUDE_MODEL") || "claude-sonnet-5-5";
  if (["napisz", "rozwin", "uprosc", "popraw", "polecenie"].includes(z)) {
    const cel: Record<string, string> = {
      napisz: `Napisz: ${opisPola}`,
      rozwin: `Rozwiń poniższy tekst: dodaj 2–4 zdania lub punkty (przykład z życia, pytanie problemowe, ciekawostkę) – zachowaj dotychczasową treść i styl. Zwróć cały tekst.\n\nTEKST:\n${obecny}`,
      uprosc: `Uprość poniższy tekst dla uczniów tej klasy: krótsze zdania, prostsze słowa, ta sama treść merytoryczna. Zwróć cały tekst.\n\nTEKST:\n${obecny}`,
      popraw: `Popraw język poniższego tekstu (ortografia, interpunkcja, styl), nie zmieniaj treści. Zwróć cały tekst.\n\nTEKST:\n${obecny}`,
      polecenie: `Polecenie nauczyciela: ${String(body.polecenie || "").slice(0, 500)}\nDotyczy pola: ${opisPola}\n\nOBECNY TEKST:\n${obecny || "(pusty)"}\n\nZwróć cały nowy tekst pola.`,
    };
    const t = await claude(M, SYSTEM_GEN, `${rama}\n\n${kontekstSek}\n\n${cel[z]}\n\nOdpowiedz samym tekstem pola, bez wstępów.`, 1800);
    return { tekst: tekstBezMd(t) };
  }
  if (z === "quiz") {
    const t = await claude(M, SYSTEM_GEN, `${rama}\n\n${kontekstSek}\nTreść etapu:\n${String(sek.tresc || "").slice(0, 2500)}\n${String(sek.narracja || "").slice(0, 1000)}
Ułóż 2 pytania jednokrotnego wyboru (3–4 odpowiedzi, jedna poprawna) sprawdzające ten etap. Odpowiedz WYŁĄCZNIE JSON-em:
[{"pytanie":"…","odpowiedzi":["…","…","…"],"poprawna":0}]`, 900);
    const q = JSON.parse(t.slice(t.indexOf("["), t.lastIndexOf("]") + 1));
    return { quiz: q.filter((x: Record<string, unknown>) => x.pytanie && Array.isArray(x.odpowiedzi)).slice(0, 4) };
  }
  if (z === "tematy") {
    const t = await claude(M, SYSTEM_GEN, `${rama}\n\nZaproponuj 8 tematów lekcji z tego przedmiotu dla tej klasy, zgodnych z podstawą programową${body.temat ? `, powiązanych z: „${String(body.temat).slice(0, 150)}”` : ""}. Odpowiedz WYŁĄCZNIE JSON-em: ["…","…"]`, 700);
    return { tematy: JSON.parse(t.slice(t.indexOf("["), t.lastIndexOf("]") + 1)).map(String).slice(0, 10) };
  }
  if (z === "obraz") {
    const pop = body.poprzedni ? `\n\nOBECNA ILUSTRACJA (popraw ją zgodnie z poleceniem, resztę zostaw):\n${String(body.poprzedni).slice(0, 30000)}` : "";
    const t = await claude(M, SYSTEM_GEN + `
Rysujesz ilustracje edukacyjne w SVG. Wymagania techniczne:
- <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">, pierwszy element: prostokąt tła #fffdf8 na całą powierzchnię.
- Czcionka: font-family="'Segoe UI', Roboto, Arial, sans-serif"; napisy po polsku, min. 28 px, kolor #1f2a2e.
- Grupy: <text class="tytul"> dla tytułu, <g class="podpisy"> dla wszystkich podpisów i linii odniesienia, <g class="strzalki"> dla strzałek, <g class="legenda"> dla legendy.
- Styl płaski, czytelny, kolory jak w podręczniku; schematy uproszczone, ale merytorycznie poprawne.
- Bez <script>, <image>, <foreignObject>, zewnętrznych odnośników i czcionek. Maks. ok. 15 000 znaków.
Odpowiedź: pierwsza linia „ODPOWIEDZ: …” (1–2 zdania do nauczyciela, co narysowałeś lub zmieniłeś), potem sam kod SVG.`,
      `${rama}\n\n${kontekstSek}\n\nPolecenie nauczyciela: ${String(body.polecenie || "").slice(0, 1200)}${pop}`, 12000);
    const a = t.indexOf("<svg"), b = t.lastIndexOf("</svg>");
    if (a < 0 || b < 0) throw new Error("AI nie zwróciło poprawnego SVG – spróbuj jeszcze raz");
    const svg = t.slice(a, b + 6).replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, "").replace(/(href)\s*=\s*("|')(?!#)[^"']*\2/gi, "");
    const odp = (t.match(/ODPOWIEDZ:\s*(.+)/) || [])[1] || "Gotowe.";
    const nazwa = (svg.match(/<text[^>]*class="tytul"[^>]*>([^<]{2,80})</) || [])[1];
    return { svg, odpowiedz: odp.trim(), nazwa };
  }
  if (z === "model") {
    const pop = body.poprzedni ? `\n\nOBECNY PRZEPIS (zmień go zgodnie z poleceniem):\n${String(body.poprzedni).slice(0, 12000)}` : "";
    const t = await claude(M, SYSTEM_GEN + `
Projektujesz proste, poglądowe modele 3D jako „przepis” z brył. Przeglądarka zbuduje z niego model GLB.
Format (WYŁĄCZNIE JSON, bez komentarzy):
{"odpowiedz":"1–2 zdania do nauczyciela","przepis":{"nazwa":"…","czesci":[
 {"nazwa":"…","ksztalt":"kula|walec|stozek|szescian|ostroslup|torus|kapsula|plaszczyzna|rura",
  "pozycja":[x,y,z],"rozmiar":[sx,sy,sz],"obrot":[stopnieX,stopnieY,stopnieZ],"kolor":"#rrggbb","przezroczystosc":0..0.8,"metal":false,
  "sciezka":[[x,y,z],…],"promien":0.05}],
 "animacja":{"typ":"obrot|puls|brak","okres":sekundy},
 "podpisy":[{"tekst":"…","pozycja":[x,y,z]}]}}
Zasady: jednostki dowolne (model zostanie przeskalowany), y w górę, model stoi na y=0. „rura” używa „sciezka” i „promien” zamiast pozycji/rozmiaru.
Najwyżej 60 części i 8 podpisów. Kolory zgodne z konwencją podręcznikową. Kształt ma być rozpoznawalny i merytorycznie poprawny na poziomie tej klasy.`,
      `${rama}\n\n${kontekstSek}\n\nPolecenie nauczyciela: ${String(body.polecenie || "").slice(0, 1200)}${pop}`, 6000);
    const j = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
    if (!j.przepis?.czesci?.length) throw new Error("AI nie zwróciło modelu – spróbuj opisać go inaczej");
    j.przepis.czesci = j.przepis.czesci.slice(0, 80);
    return { przepis: j.przepis, odpowiedz: j.odpowiedz || "Gotowe." };
  }
  throw new Error("Nieznane zadanie generatora");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json();

    if (body.tryb === "plan" || body.tryb === "generator") {
      // planowanie i generator tylko dla zalogowanego nauczyciela
      const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, (Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!);
      const { data, error } = await sb.auth.getUser(token);
      if (error || !data?.user) return json({ blad: "Zaloguj się jako nauczyciel" }, 401);
      if (body.tryb === "generator") return json(await generator(body));

      const mats = (body.materialy || []).slice(0, 120).map((m: Record<string, unknown>) => ({
        id: m.id, typ: m.typ, nazwa: String(m.nazwa || "").slice(0, 80),
        tekst: String(m.tekst || "").replace(/\s+/g, " ").slice(0, 350),
      }));
      const user = `Temat lekcji: ${String(body.tytul || "").slice(0, 120)}\n\nMateriały:\n${JSON.stringify(mats, null, 1)}`;
      const txt = await claude(Deno.env.get("CLAUDE_MODEL") || "claude-sonnet-5-5", SYSTEM_PLAN, user, 4000);
      const start = txt.indexOf("{"), end = txt.lastIndexOf("}");
      const plan = JSON.parse(txt.slice(start, end + 1));
      return json({ plan });
    }

    if (body.tryb === "pytanie") {
      const pytanie = String(body.pytanie || "").trim().slice(0, 400);
      if (pytanie.length < 2) return json({ blad: "Puste pytanie" }, 400);
      const k = body.kontekst || {};
      const kontekst = `Temat: ${String(k.tytul || "").slice(0, 150)}\nTreść:\n${String(k.tekst || "").slice(0, 6000)}`;
      const odp = await claude(Deno.env.get("CLAUDE_MODEL_SZYBKI") || "claude-haiku-5-5", SYSTEM_PYTANIE,
        `${kontekst}\n\nPytanie: ${pytanie}`, 350);
      return json({ odpowiedz: odp.trim() });
    }

    return json({ blad: "Nieznany tryb" }, 400);
  } catch (e) {
    return json({ blad: String((e as Error).message || e) }, 500);
  }
});
