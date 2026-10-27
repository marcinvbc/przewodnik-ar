/*
 * Planowanie scen lekcji: Claude (jeśli dostępny) albo automatyczny układ regułowy.
 * Materiał: { id, typ: "slajd"|"obraz"|"wideo"|"model"|"pdf", nazwa, url, w, h, tekst, zrodlo, strona }
 * Plan:     { tytul, sceny: [{ id, tytul, uklad, elementy:[id], narracja, quiz:[{pytanie, odpowiedzi[], poprawna}] }] }
 */
import { uid } from "./wspolne.js";

export const UKLADY = {
  muzeum: "Muzeum – model na środku, ekrany w półkolu",
  teatr: "Teatr – jeden duży ekran, małe po bokach",
  orbita: "Orbita – elementy dookoła (każdy widzi co innego)",
  galeria: "Galeria – ściana slajdów i zdjęć",
};

const sceniczne = m => ["slajd", "obraz", "wideo", "model"].includes(m.typ);
function pierwszaLinia(t) {
  const txt = String(t || "").replace(/\s+/g, " ").trim(); if (!txt) return "";
  const m = txt.match(/^(.{3,55}?[?!.:])(\s|$)/);
  if (m) return m[1].replace(/[.:]$/, "");
  const w = txt.split(" "); let out = "";
  for (const x of w) { if ((out + " " + x).trim().length > 42) break; out = (out + " " + x).trim(); }
  return out;
}
const ladnaNazwa = n => String(n || "").replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").replace(/^\d+\s*/, "").trim();
const zdania = (t, n) => (String(t || "").replace(/\s+/g, " ").match(/[^.!?]+[.!?]+/g) || []).slice(0, n).join(" ").trim();

function wybierzUklad(elems, mats) {
  const by = id => mats.find(m => m.id === id);
  const typy = elems.map(id => by(id)?.typ);
  const ekrany = typy.filter(t => t !== "model").length;
  if (typy.includes("wideo")) return "teatr";
  if (!typy.includes("model") && ekrany >= 4) return "galeria";
  if (typy.filter(t => t === "obraz").length >= 3) return "orbita";
  return "muzeum";
}

/** Plan bez AI: dzieli slajdy na sceny, dokłada modele, zdjęcia i filmy. */
export function planRegulowy(tytul, materialy) {
  const mats = materialy.filter(sceniczne);
  const slajdy = mats.filter(m => m.typ === "slajd");
  const modele = mats.filter(m => m.typ === "model");
  const obrazy = mats.filter(m => m.typ === "obraz");
  const wideo = mats.filter(m => m.typ === "wideo");
  const sceny = [];
  const nowa = (t, el) => ({ id: uid(), tytul: t, uklad: "muzeum", elementy: el, narracja: "", quiz: [] });

  if (slajdy.length) {
    sceny.push(nowa("Wstęp", [slajdy[0].id]));
    const reszta = slajdy.slice(1);
    const ostatni = reszta.length > 4 ? reszta.pop() : null;
    for (let i = 0; i < reszta.length; i += 3) {
      const g = reszta.slice(i, i + 3);
      sceny.push(nowa(g[0].tytulSlajdu || pierwszaLinia(g[0].tekst) || `Część ${sceny.length}`, g.map(m => m.id)));
    }
    if (ostatni) sceny.push(nowa("Podsumowanie", [ostatni.id]));
  }
  // modele: do scen środkowych (albo każda w swojej scenie, gdy brak slajdów)
  const srodek = sceny.length > 2 ? sceny.slice(1, -1) : sceny;
  modele.forEach((m, i) => {
    if (srodek.length) srodek[i % srodek.length].elementy.unshift(m.id);
    else sceny.push(nowa(ladnaNazwa(m.nazwa) || "Model 3D", [m.id]));
  });
  // zdjęcia: po 2 do scen, a gdy dużo – osobna galeria
  if (obrazy.length > 4 || !sceny.length) sceny.push(nowa("Galeria", obrazy.map(m => m.id)));
  else obrazy.forEach((m, i) => (srodek[i % Math.max(1, srodek.length)] || sceny[0]).elementy.push(m.id));
  // filmy: osobne sceny w środku lekcji
  wideo.forEach((m, i) => {
    const pos = Math.min(sceny.length, Math.max(1, Math.round(sceny.length * (i + 1) / (wideo.length + 1))));
    sceny.splice(pos, 0, nowa("Film: " + ladnaNazwa(m.nazwa), [m.id]));
  });
  const byId = Object.fromEntries(mats.map(m => [m.id, m]));
  for (const s of sceny) {
    s.uklad = wybierzUklad(s.elementy, mats);
    s.narracja = zdania(s.elementy.map(id => byId[id]?.tekst).filter(Boolean).join(" "), 3)
      || `Spójrzcie na scenę „${s.tytul}”. Obejdźcie ją dookoła i przyjrzyjcie się szczegółom.`;
  }
  return { tytul, sceny: sceny.filter(s => s.elementy.length) };
}

/** Sprawdza i naprawia plan z AI: tylko istniejące id, brakujące materiały dokłada na koniec. */
export function napraw(plan, materialy) {
  const mats = materialy.filter(sceniczne);
  const ids = new Set(mats.map(m => m.id)), uzyte = new Set();
  const sceny = (plan?.sceny || []).map(s => {
    const el = (s.elementy || []).filter(id => ids.has(id) && !uzyte.has(id) && uzyte.add(id));
    return {
      id: uid(), tytul: String(s.tytul || "Scena").slice(0, 80),
      uklad: UKLADY[s.uklad] ? s.uklad : wybierzUklad(el, mats),
      elementy: el.slice(0, 8), narracja: String(s.narracja || "").slice(0, 900),
      quiz: (s.quiz || []).filter(q => q && q.pytanie && Array.isArray(q.odpowiedzi) && q.odpowiedzi.length >= 2).slice(0, 3)
        .map(q => ({ pytanie: String(q.pytanie), odpowiedzi: q.odpowiedzi.slice(0, 5).map(String), poprawna: Math.max(0, Math.min(q.odpowiedzi.length - 1, +q.poprawna || 0)) })),
    };
  }).filter(s => s.elementy.length);
  const brak = mats.filter(m => !uzyte.has(m.id));
  if (brak.length) {
    for (let i = 0; i < brak.length; i += 4) {
      const el = brak.slice(i, i + 4).map(m => m.id);
      sceny.push({ id: uid(), tytul: "Dodatkowe materiały", uklad: wybierzUklad(el, mats), elementy: el, narracja: "", quiz: [] });
    }
  }
  return { tytul: plan?.tytul || "", sceny };
}

/** Planowanie: najpierw Claude, w razie problemu – układ regułowy. Zwraca { plan, zrodlo, blad } */
export async function zaplanuj(b, tytul, materialy, { ai = true } = {}) {
  if (ai && b.ai.dostepne) {
    try {
      const p = await b.ai.plan(tytul, materialy.filter(sceniczne).map(({ id, typ, nazwa, tekst, tytulSlajdu }) => ({ id, typ, nazwa: tytulSlajdu ? `${nazwa} („${tytulSlajdu}”)` : nazwa, tekst })));
      if (p) return { plan: napraw(p, materialy), zrodlo: "ai" };
    } catch (e) { return { plan: planRegulowy(tytul, materialy), zrodlo: "auto", blad: e.message }; }
  }
  return { plan: planRegulowy(tytul, materialy), zrodlo: "auto" };
}
