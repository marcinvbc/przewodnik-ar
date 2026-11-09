/*
 * Scenariusz → Lekcja AR (materiały + sceny) oraz wydruk / eksport scenariusza do Worda.
 */
import { uid, esc, resolveUrl } from "./wspolne.js";
import { wybierzUklad } from "./planer.js";
import { tablicaTekstu, wykresJpg, kartaPliku } from "./gen-media.js";

const abs = u => (!u || /^(https?:|idb:|blob:|data:)/.test(u)) ? u : new URL(u, location.href).href;

export function etapyAR(sc) { return (sc.sekcje || []).filter(s => s.typ === "etap" && s.wAR !== false); }

export function podsumowanieLekcji(sc) {
  const et = etapyAR(sc);
  const ile = r => et.reduce((a, s) => a + (s.media || []).filter(m => m.rodzaj === r).length, 0);
  return { sceny: et.length, obrazy: ile("obraz"), filmy: ile("film"), modele: ile("model"), wykresy: ile("wykres"), pliki: ile("plik"),
    quiz: et.reduce((a, s) => a + (s.quiz || []).length, 0), tablice: et.filter(s => s.tablica !== false && s.narracja?.trim()).length };
}

/** Tworzy (albo aktualizuje) lekcję AR w panelu nauczyciela. Zwraca lekcję. */
export async function scenariuszDoLekcji(b, sc, postep = () => {}) {
  let lekcja = sc.lekcjaId ? await b.lessons.get(sc.lekcjaId).catch(() => null) : null;
  if (!lekcja) lekcja = await b.lessons.create(sc.tytul || sc.temat || "Lekcja");
  const materialy = [], sceny = [];
  const wgraj = async (blob, nazwa, typ) => b.files.upload(lekcja.id, blob, nazwa, typ);
  const etapy = etapyAR(sc);
  for (const [i, s] of etapy.entries()) {
    postep(`Scena ${i + 1} z ${etapy.length}: ${s.tytul}`);
    const el = [];
    const dodaj = m => { const x = { id: uid(), ...m }; materialy.push(x); el.push(x.id); return x; };
    for (const m of [...(s.media || [])].sort((a, b) => (a.rodzaj === "model" ? 0 : 1) - (b.rodzaj === "model" ? 0 : 1))) {
      if (m.rodzaj === "obraz") dodaj({ typ: "obraz", nazwa: m.nazwa, url: abs(m.url), w: m.w, h: m.h });
      else if (m.rodzaj === "film") dodaj({ typ: "wideo", nazwa: m.nazwa, url: abs(m.url), w: m.w || 16, h: m.h || 9 });
      else if (m.rodzaj === "model") dodaj({ typ: "model", nazwa: m.nazwa, url: abs(m.url) });
      else if (m.rodzaj === "wykres") {
        const { blob, w, h } = await wykresJpg(m.dane); const { url, path } = await wgraj(blob, "wykres.jpg", "image/jpeg");
        dodaj({ typ: "obraz", rodzaj: "wykres", nazwa: m.nazwa, url, path, w, h, dane: m.dane });
      } else if (m.rodzaj === "plik") {
        let karta = m.karta ? { url: abs(m.karta), w: 1600, h: 1000 } : null;
        if (!karta) { const r = await kartaPliku(m.nazwa); const up = await wgraj(r.blob, "karta.jpg", "image/jpeg"); karta = { url: up.url, path: up.path, w: r.w, h: r.h }; }
        dodaj({ typ: "obraz", rodzaj: "dokument", nazwa: m.nazwa, url: karta.url, path: karta.path, w: karta.w, h: karta.h, plik: abs(m.url) });
      }
    }
    if (s.tablica !== false && s.narracja?.trim()) {
      const { blob, w, h } = await tablicaTekstu(s.tytul, s.narracja);
      const { url, path } = await wgraj(blob, "tablica.jpg", "image/jpeg");
      dodaj({ typ: "obraz", rodzaj: "tekst", nazwa: `Tablica – ${s.tytul}`, url, path, w, h, tekst: s.narracja });
    }
    sceny.push({ id: uid(), tytul: s.tytul, uklad: wybierzUklad(el, materialy), elementy: el, narracja: s.narracja || "", quiz: (s.quiz || []).filter(q => q.pytanie) });
  }
  const plan = { tytul: sc.tytul, sceny: sceny.filter(x => x.elementy.length || x.narracja),
    scenariusz: { id: sc.id, przedmiot: sc.przedmiot, klasa: sc.szkola?.klasa, temat: sc.temat, szkola: sc.szkolaOpis, rama: sc.rama?.nazwa,
      wymagania: (sc.wymaganiaLista || []).filter(w => (sc.wymagania || []).includes(w.kod)).map(w => `${w.kod} ${w.tekst}`) } };
  postep("Zapisuję lekcję…");
  return b.lessons.update(lekcja.id, { tytul: sc.tytul, materialy, plan });
}

/* ======================================================================= wydruk i Word */
export function htmlScenariusza(sc, prowadzacy) {
  const p = t => esc(t || "").replace(/\n/g, "<br>");
  const wym = (sc.wymaganiaLista || []).filter(w => (sc.wymagania || []).includes(w.kod));
  const czasSuma = (sc.sekcje || []).filter(s => s.typ === "etap").reduce((a, s) => a + (+s.czas || 0), 0);
  let n = 0;
  const sek = (sc.sekcje || []).map(s => {
    if (s.typ === "info") return "";
    if (s.typ === "wymagania") return `<h2>${esc(s.tytul)}</h2><p><b>${esc(sc.rama?.nazwa || "")}</b></p>
      ${sc.celeOgolneLista?.length ? `<p><i>Cele kształcenia – wymagania ogólne:</i> ${sc.celeOgolneLista.filter(c => (sc.celeOgolne || []).includes(c.split(".")[0])).map(esc).join("; ")}</p>` : ""}
      <ul>${wym.map(w => `<li><b>${esc(w.kod)}</b> – uczeń ${esc(w.tekst)}</li>`).join("")}</ul>${sc.wymaganiaWlasne ? `<p>${p(sc.wymaganiaWlasne)}</p>` : ""}`;
    if (s.typ === "etap") {
      n++;
      return `<h3>${n}. ${esc(s.tytul)} <span class="czas">(${s.czas || "?"} min)</span></h3>
        ${s.tresc ? `<p>${p(s.tresc)}</p>` : ""}
        ${s.narracja ? `<div class="ucz"><b>Treść dla uczniów (lekcja AR):</b><br>${p(s.narracja)}</div>` : ""}
        ${(s.media || []).length ? `<p class="m"><b>Materiały:</b> ${(s.media || []).map(m => `${{ obraz: "🖼", film: "🎬", model: "🧊", wykres: "📊", plik: "📎" }[m.rodzaj] || ""} ${esc(m.nazwa)}`).join(" · ")}</p>` : ""}
        ${(s.quiz || []).length ? `<p class="m"><b>Pytania sprawdzające:</b></p><ol>${s.quiz.map(q => `<li>${esc(q.pytanie)} <i>(${q.odpowiedzi.map((a, i) => i === q.poprawna ? `<u>${esc(a)}</u>` : esc(a)).join(" / ")})</i></li>`).join("")}</ol>` : ""}`;
    }
    const pierwszyEtap = s.klucz === "wstep" ? "" : "";
    return `${pierwszyEtap}<h2>${esc(s.tytul)}</h2><p>${p(s.tresc)}</p>`;
  });
  // nagłówek „Przebieg lekcji” przed pierwszym etapem
  const i0 = (sc.sekcje || []).findIndex(s => s.typ === "etap");
  if (i0 >= 0) sek[i0] = `<h2>Przebieg lekcji (${czasSuma} min)</h2>` + sek[i0];
  return `<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8"><title>${esc(sc.tytul)}</title><style>
body{font:12pt/1.45 Calibri,'Segoe UI',Arial,sans-serif;color:#1f2a2e;max-width:780px;margin:24px auto;padding:0 18px}
h1{font-size:20pt;margin:0 0 6px} h2{font-size:14pt;border-bottom:2px solid #c9562f;padding-bottom:3px;margin-top:22px} h3{font-size:12.5pt;margin:16px 0 4px}
.czas{color:#888;font-weight:400} table.info td{padding:3px 12px 3px 0;vertical-align:top} .ucz{background:#f6f1e7;border-left:4px solid #e0a030;padding:8px 12px;margin:6px 0}
.m{margin:4px 0} @media print{body{margin:0}}</style></head><body>
<h1>Scenariusz lekcji: ${esc(sc.temat || sc.tytul)}</h1>
<table class="info"><tr><td><b>Szkoła</b></td><td>${esc(sc.szkolaOpis || "")}</td></tr>
<tr><td><b>Przedmiot</b></td><td>${esc(sc.przedmiot || "")}${sc.dzial ? ` · dział: ${esc(sc.dzial)}` : ""}</td></tr>
<tr><td><b>Czas</b></td><td>${esc(sc.czas || 45)} min</td></tr>
<tr><td><b>Prowadzący</b></td><td>${esc(prowadzacy || "")}</td></tr>
<tr><td><b>Podstawa</b></td><td>${esc(sc.rama?.nazwa || "")}</td></tr></table>
${sek.join("\n")}
<p style="color:#888;font-size:9pt;margin-top:30px">Przygotowano w generatorze scenariuszy Lekcja AR · ${new Date().toLocaleDateString("pl-PL")}</p></body></html>`;
}
export function drukuj(sc, prowadzacy) {
  const w = open("", "_blank"); if (!w) throw new Error("Przeglądarka zablokowała nowe okno – zezwól na wyskakujące okna");
  w.document.write(htmlScenariusza(sc, prowadzacy)); w.document.close(); setTimeout(() => w.print(), 400);
}
export function pobierzWord(sc, prowadzacy) {
  const html = htmlScenariusza(sc, prowadzacy).replace("<html lang=\"pl\">", '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="pl">');
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + html], { type: "application/msword" }));
  a.download = (sc.temat || sc.tytul || "scenariusz").replace(/[^\p{L}\p{N} _-]+/gu, "").slice(0, 60) + ".doc"; a.click();
}
export { resolveUrl };
