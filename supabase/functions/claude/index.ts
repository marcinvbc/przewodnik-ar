// =====================================================================
//  Funkcja „claude” – pośrednik między aplikacją a Claude API.
//  Klucz API zostaje na serwerze (sekret ANTHROPIC_API_KEY), nigdy nie trafia do przeglądarki.
//
//  Tryby:
//   { tryb: "plan",    tytul, materialy: [...] }   → plan scen lekcji (tylko zalogowany nauczyciel)
//   { tryb: "pytanie", pytanie, kontekst }          → krótka odpowiedź Bartka dla ucznia / zwiedzającego
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json();

    if (body.tryb === "plan") {
      // planowanie tylko dla zalogowanego nauczyciela
      const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, (Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!);
      const { data, error } = await sb.auth.getUser(token);
      if (error || !data?.user) return json({ blad: "Zaloguj się jako nauczyciel" }, 401);

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
