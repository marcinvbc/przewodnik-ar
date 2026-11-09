/*
 * „📤 Wyślij do e-peAR” – przygotowanie paczki kursu i przekazanie jej Pomocnikowi e-peAR.
 *
 * Jak to działa:
 *  1. Z lekcji (albo scenariusza) budujemy paczkę: opis kursu, „czego się nauczysz”, pliki (modele GLB, obrazy JPG/PNG,
 *     filmy MP4, teksty TXT, PDF), galeria i quiz. Formatów, których e-peAR nie przyjmuje (Word, Excel, PowerPoint),
 *     nie wysyłamy – zamiast nich idzie obraz karty pliku.
 *  2. Otwieramy e-peAR w nowej karcie. Nauczyciel (zalogowany) klika tam zakładkę „Pomocnik e-peAR”.
 *  3. Pomocnik daje znać, że jest gotowy – wtedy wysyłamy mu paczkę (postMessage, tylko do adresu e-peAR).
 *     Zapasowo: paczkę można pobrać jako .zip i wczytać w Pomocniku.
 */
import { esc, toast, resolveUrl } from "./wspolne.js";
import { wykresJpg, kartaPliku } from "./gen-media.js";

export const EPEAR_URL = String((window.LEKCJE_CONFIG || {}).epearUrl || "https://arplus.test.dio.vobacom.org").replace(/\/+$/, "");
const EPEAR_ORIGIN = new URL(EPEAR_URL).origin;
const POMOC_URL = new URL("../epear/index.html", import.meta.url).href;

const TYPY = { glb: "model/gltf-binary", gltf: "model/gltf+json", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", mp4: "video/mp4", mp3: "audio/mpeg", wav: "audio/wav", txt: "text/plain", pdf: "application/pdf" };
const rozszerzenie = n => (String(n).split("?")[0].split(".").pop() || "").toLowerCase();
const czystaNazwa = n => String(n || "plik").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 90);
const nr = i => String(i + 1).padStart(2, "0");

async function pobierz(url) {
  const abs = /^(idb|blob|data):/.test(url) ? url : new URL(url, location.href).href;
  const r = await fetch(await resolveUrl(abs));
  if (!r.ok) throw new Error(`nie mogę pobrać ${String(url).split("/").pop()} (${r.status})`);
  return r.blob();
}
/** Czy GLB ma animacje (e-peAR pyta o to przy wgrywaniu). */
async function maAnimacje(blob) {
  try {
    const b = new DataView(await blob.slice(0, 20).arrayBuffer()); const len = b.getUint32(12, true);
    const json = await blob.slice(20, 20 + len).text(); return /"animations"\s*:\s*\[\s*\{/.test(json);
  } catch { return false; }
}
const html = t => esc(t).replace(/\n/g, "<br>");

/* ======================================================================= budowa paczki */
function nacobezu(cele) {
  const t = String(cele || ""), i = t.search(/NaCoBeZu|kryteria sukcesu/i);
  const linie = (i >= 0 ? t.slice(i) : "").split("\n").slice(1).map(l => l.replace(/^\s*[•\-–*]\s*|^\s*\d+[.)]\s*/, "").trim()).filter(l => l.length > 3);
  return linie.slice(0, 8);
}

/** Paczka ze scenariusza z generatora (najpełniejsza: cele, NaCoBeZu, przebieg). */
export async function paczkaZeScenariusza(sc, postep = () => {}) {
  const etapy = (sc.sekcje || []).filter(s => s.typ === "etap" && s.wAR !== false);
  const sek = k => (sc.sekcje || []).find(s => s.klucz === k);
  const wym = (sc.wymaganiaLista || []).filter(w => (sc.wymagania || []).includes(w.kod));
  const cele = sek("cele")?.tresc || "";
  const opisHtml = [
    `<p><b>${esc(sc.przedmiot || "")}</b> · ${esc(sc.szkolaOpis || "")}<br>Temat: ${esc(sc.temat || sc.tytul)}</p>`,
    wym.length ? `<h3>Podstawa programowa</h3><ul>${wym.map(w => `<li>${esc(w.kod)} – uczeń ${esc(w.tekst)}</li>`).join("")}</ul>` : "",
    cele ? `<h3>Cele lekcji</h3><p>${html(cele)}</p>` : "",
    `<h3>Przebieg lekcji</h3><ol>${etapy.map(s => `<li><b>${esc(s.tytul)}</b>${s.czas ? ` (${esc(s.czas)} min)` : ""}${s.narracja ? `<br>${html(s.narracja)}` : ""}</li>`).join("")}</ol>`,
    sek("praca_domowa")?.tresc ? `<h3>Praca domowa</h3><p>${html(sek("praca_domowa").tresc)}</p>` : "",
    `<p><i>Przygotowano w generatorze scenariuszy Lekcja AR.</i></p>`,
  ].join("");
  const kurs = {
    tytul: sc.tytul || sc.temat, przedmiot: sc.przedmiot || "", czas: +sc.czas || 45, opisHtml,
    krotkiOpis: [sc.przedmiot, sc.szkola?.klasa != null ? `klasa ${sc.szkola.klasa}` : "", sc.temat].filter(Boolean).join(" · ").slice(0, 250),
    czegoSieNauczysz: nacobezu(cele).length ? nacobezu(cele) : (wym.length ? wym.map(w => w.tekst.charAt(0).toUpperCase() + w.tekst.slice(1)) : etapy.map(s => s.tytul)).slice(0, 8),
  };
  const sceny = etapy.map(s => ({ tytul: s.tytul, narracja: s.narracja, media: s.media || [], quiz: s.quiz || [] }));
  return zbuduj(kurs, sceny, postep);
}

/** Paczka z gotowej lekcji AR (panel nauczyciela). */
export async function paczkaZLekcji(l, postep = () => {}) {
  const zs = l.plan?.scenariusz || {};
  const sceny = (l.plan?.sceny || []).map(s => ({
    tytul: s.tytul, narracja: s.narracja, quiz: s.quiz || [],
    media: s.elementy.map(id => l.materialy.find(m => m.id === id)).filter(Boolean).filter(m => m.rodzaj !== "tekst").map(m => ({
      nazwa: m.nazwa, url: m.url, w: m.w, h: m.h, dane: m.dane,
      rodzaj: m.typ === "model" ? "model" : m.typ === "wideo" ? "film" : m.rodzaj === "dokument" ? "plik" : "obraz",
      ...(m.rodzaj === "dokument" ? { url: m.plik, karta: m.url } : {}),
    })),
  }));
  const kurs = {
    tytul: l.tytul, przedmiot: zs.przedmiot || "", czas: 45,
    krotkiOpis: [zs.przedmiot, zs.klasa != null ? `klasa ${zs.klasa}` : "", zs.temat || l.tytul].filter(Boolean).join(" · ").slice(0, 250),
    opisHtml: `<p>${esc(zs.szkola || "")}${zs.temat ? `<br>Temat: ${esc(zs.temat)}` : ""}</p>${(zs.wymagania || []).length ? `<h3>Podstawa programowa</h3><ul>${zs.wymagania.map(w => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}
      <h3>Przebieg lekcji</h3><ol>${sceny.map(s => `<li><b>${esc(s.tytul)}</b>${s.narracja ? `<br>${html(s.narracja)}` : ""}</li>`).join("")}</ol><p><i>Przygotowano w aplikacji Lekcja AR.</i></p>`,
    czegoSieNauczysz: ((zs.wymagania || []).length ? zs.wymagania.map(w => w.replace(/^\S+\s/, "")) : sceny.map(s => s.tytul)).slice(0, 8),
  };
  return zbuduj(kurs, sceny, postep);
}

async function zbuduj(kurs, sceny, postep) {
  const pliki = [], galeria = [], pominiete = [], pytania = [], widziane = new Set();
  for (const [i, s] of sceny.entries()) {
    postep(`Scena ${i + 1} z ${sceny.length}: ${s.tytul}`);
    for (const m of s.media) {
      const baza = `${nr(i)} ${czystaNazwa(m.nazwa).replace(/\.[a-z0-9]{2,4}$/i, "")}`;
      try {
        if (m.rodzaj === "model") {
          const blob = await pobierz(m.url);
          pliki.push({ nazwa: baza + ".glb", typ: TYPY.glb, rodzaj: "model", animowany: await maAnimacje(blob), blob });
        } else if (m.rodzaj === "obraz") {
          const blob = await pobierz(m.url), ext = blob.type === "image/png" ? "png" : "jpg";
          pliki.push({ nazwa: `${baza}.${ext}`, typ: TYPY[ext], rodzaj: "obraz", blob });
          if (!widziane.has(m.url) && galeria.length < 6) { widziane.add(m.url); galeria.push({ nazwa: `${baza}.${ext}`, typ: TYPY[ext], blob }); }
        } else if (m.rodzaj === "film") {
          if (rozszerzenie(m.url) !== "mp4" && !/\.mp4$/i.test(m.nazwa)) { pominiete.push(`${m.nazwa} (e-peAR przyjmuje tylko MP4)`); continue; }
          pliki.push({ nazwa: baza + ".mp4", typ: TYPY.mp4, rodzaj: "film", blob: await pobierz(m.url) });
        } else if (m.rodzaj === "wykres") {
          const { blob } = await wykresJpg(m.dane);
          pliki.push({ nazwa: baza + ".jpg", typ: TYPY.jpg, rodzaj: "obraz", blob });
        } else if (m.rodzaj === "plik") {
          const ext = (m.typPliku || rozszerzenie(m.nazwa || m.url));
          if (ext === "pdf" || ext === "txt") pliki.push({ nazwa: `${baza}.${ext}`, typ: TYPY[ext], rodzaj: ext === "pdf" ? "pdf" : "tekst", blob: await pobierz(m.url) });
          else {
            pominiete.push(`${m.nazwa} (wysłano jako obraz karty – e-peAR nie przyjmuje plików ${ext.toUpperCase()})`);
            const karta = m.karta ? await pobierz(m.karta) : (await kartaPliku(m.nazwa)).blob;
            pliki.push({ nazwa: `${baza} (karta).jpg`, typ: TYPY.jpg, rodzaj: "obraz", blob: karta });
          }
        }
      } catch (e) { pominiete.push(`${m.nazwa} (${e.message})`); }
    }
    if (s.narracja?.trim()) pliki.push({ nazwa: `${nr(i)} ${czystaNazwa(s.tytul)} – tekst.txt`, typ: TYPY.txt, rodzaj: "tekst", blob: new Blob([`${s.tytul}\n\n${s.narracja.trim()}\n`], { type: TYPY.txt }) });
    for (const q of s.quiz) if (q.pytanie?.trim() && (q.odpowiedzi || []).filter(Boolean).length >= 2) pytania.push({ pytanie: q.pytanie.trim(), odpowiedzi: q.odpowiedzi.filter(Boolean), poprawna: q.poprawna || 0 });
  }
  return {
    wersja: 1, kurs, pliki, galeria, pominiete,
    quiz: pytania.length ? { tytul: `Quiz: ${kurs.tytul}`.slice(0, 120), opis: `Sprawdź, co pamiętasz z lekcji „${kurs.tytul}”.`, instrukcje: "Przy każdym pytaniu wybierz jedną poprawną odpowiedź.", czas: Math.max(5, pytania.length), pytania } : null,
  };
}

/* ======================================================================= paczka .zip (zapasowo) */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export async function paczkaZip(P) {
  const wpisy = [];
  const meta = { ...P, pliki: P.pliki.map((f, i) => ({ ...f, blob: undefined, plik: `p${i}-${f.nazwa}` })), galeria: P.galeria.map((f, i) => ({ ...f, blob: undefined, plik: `g${i}-${f.nazwa}` })) };
  wpisy.push(["paczka.json", new TextEncoder().encode(JSON.stringify(meta))]);
  for (const [i, f] of P.pliki.entries()) wpisy.push([`pliki/${meta.pliki[i].plik}`, new Uint8Array(await f.blob.arrayBuffer())]);
  for (const [i, f] of P.galeria.entries()) wpisy.push([`pliki/${meta.galeria[i].plik}`, new Uint8Array(await f.blob.arrayBuffer())]);
  const czesci = [], centralny = []; let off = 0;
  for (const [nazwa, dane] of wpisy) {
    const n = new TextEncoder().encode(nazwa), c = crc32(dane);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, c, true); h.setUint32(18, dane.length, true); h.setUint32(22, dane.length, true); h.setUint16(26, n.length, true);
    czesci.push(new Uint8Array(h.buffer), n, dane);
    const d = new DataView(new ArrayBuffer(46));
    d.setUint32(0, 0x02014b50, true); d.setUint16(4, 20, true); d.setUint16(6, 20, true); d.setUint16(8, 0x0800, true); d.setUint32(16, c, true); d.setUint32(20, dane.length, true); d.setUint32(24, dane.length, true); d.setUint16(28, n.length, true); d.setUint32(42, off, true);
    centralny.push(new Uint8Array(d.buffer), n);
    off += 30 + n.length + dane.length;
  }
  const rozm = centralny.reduce((a, x) => a + x.length, 0), k = new DataView(new ArrayBuffer(22));
  k.setUint32(0, 0x06054b50, true); k.setUint16(8, wpisy.length, true); k.setUint16(10, wpisy.length, true); k.setUint32(12, rozm, true); k.setUint32(16, off, true);
  return new Blob([...czesci, ...centralny, new Uint8Array(k.buffer)], { type: "application/zip" });
}

/* ======================================================================= okno „Wyślij do e-peAR” */
export async function oknoEpear(zbudujPaczke) {
  const el = document.createElement("div");
  el.style.cssText = "position:fixed;inset:0;background:rgba(15,20,22,.6);z-index:130;display:grid;place-items:center;padding:14px";
  el.innerHTML = `<div style="background:#fffdf8;border-radius:20px;padding:20px;max-width:640px;width:100%;max-height:92vh;overflow:auto;font:15px/1.5 system-ui,sans-serif;color:#1f2a2e">
    <div style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-size:21px;margin:0">📤 Wyślij do e-peAR</h2><button class="btn sm ghost" data-x>✕</button></div>
    <div data-tresc><p>⏳ Przygotowuję paczkę kursu…</p><p class="small muted" data-postep></p></div></div>`;
  document.body.appendChild(el);
  let sluchacz = null;
  const zamknij = () => { el.remove(); if (sluchacz) removeEventListener("message", sluchacz); };
  el.querySelector("[data-x]").onclick = zamknij;
  el.onclick = e => { if (e.target === el) zamknij(); };
  const tresc = el.querySelector("[data-tresc]");
  let P;
  try { P = await zbudujPaczke(t => { const p = el.querySelector("[data-postep]"); if (p) p.textContent = t; }); }
  catch (e) { tresc.innerHTML = `<p>❌ ${esc(e.message)}</p>`; return; }
  const ile = t => P.pliki.filter(f => f.rodzaj === t).length, mb = P.pliki.reduce((a, f) => a + f.blob.size, 0) / 1048576;
  tresc.innerHTML = `
    <div class="card" style="margin:10px 0;padding:12px"><b>${esc(P.kurs.tytul)}</b><div class="small muted">${esc(P.kurs.krotkiOpis)}</div>
      <div class="small" style="margin-top:6px">${P.pliki.length} plików (${ile("model")} modeli 3D, ${ile("obraz")} obrazów, ${ile("film")} filmów, ${ile("tekst")} tekstów, ${ile("pdf")} PDF) · ${mb.toFixed(1)} MB ·
        galeria: ${P.galeria.length} · quiz: ${P.quiz ? P.quiz.pytania.length + " pytań" : "brak"}</div>
      ${P.pominiete.length ? `<div class="small" style="margin-top:6px;color:#7a5a00">Uwaga: ${P.pominiete.map(esc).join("; ")}</div>` : ""}</div>
    <ol style="padding-left:20px;margin:8px 0">
      <li>Kliknij <b>Otwórz e-peAR</b> – otworzy się nowa karta (zaloguj się, jeśli trzeba).</li>
      <li>Na karcie e-peAR kliknij zakładkę <b>📤 Pomocnik e-peAR</b> na pasku zakładek.</li>
      <li>Pomocnik pokaże podsumowanie – wybierz kategorię i kliknij <b>Utwórz kurs</b>.</li></ol>
    <p class="small muted" style="margin:4px 0">Pierwszy raz? <a href="${POMOC_URL}" target="_blank">Zainstaluj pomocnika (1 minuta)</a>. Wysyłanie dużych modeli 3D może potrwać kilka minut.</p>
    <div data-stan class="small" style="margin:10px 0;font-weight:600"></div>
    <div class="row" style="justify-content:flex-end;gap:8px;display:flex;flex-wrap:wrap">
      <button class="btn" data-zip>⬇ Pobierz paczkę .zip</button><button class="btn accent" data-otworz>Otwórz e-peAR</button></div>`;
  const stan = t => el.querySelector("[data-stan]").innerHTML = t;
  let okno = null;
  el.querySelector("[data-otworz]").onclick = () => {
    okno = window.open(EPEAR_URL + "/my-courses", "epear");
    if (!okno) return stan("❌ Przeglądarka zablokowała nowe okno – zezwól na wyskakujące okna dla tej strony i spróbuj ponownie.");
    stan("⏳ Czekam, aż klikniesz zakładkę „Pomocnik e-peAR” na karcie e-peAR…");
  };
  el.querySelector("[data-zip]").onclick = async () => {
    stan("⏳ Pakuję…");
    const z = await paczkaZip(P), a = document.createElement("a");
    a.href = URL.createObjectURL(z); a.download = czystaNazwa(P.kurs.tytul).slice(0, 60) + " – e-peAR.zip"; a.click();
    stan("✅ Paczka pobrana. W e-peAR kliknij zakładkę „Pomocnik e-peAR” i wybierz ten plik.");
  };
  sluchacz = e => {
    if (e.origin !== EPEAR_ORIGIN || !e.data?.typ) return;
    if (e.data.typ === "epear-gotowy") {
      (e.source || okno)?.postMessage({ typ: "epear-paczka", paczka: P }, EPEAR_ORIGIN);
      stan("✅ Pomocnik połączony – lekcja przekazana. Dokończ na karcie e-peAR („Utwórz kurs”).");
    }
    if (e.data.typ === "epear-wynik") {
      const k = e.data.kurs;
      stan(e.data.ok ? `🎉 Kurs utworzony w e-peAR: <a href="${esc(k.link)}" target="_blank">${esc(k.tytul)}</a>`
        : k ? `⚠️ Kurs utworzony z błędami (${esc(e.data.bledy.join(", "))}): <a href="${esc(k.link)}" target="_blank">${esc(k.tytul)}</a>` : `❌ Nie udało się utworzyć kursu: ${esc(e.data.bledy?.[0] || "")}`);
      toast(e.data.ok ? "🎉 Kurs jest w e-peAR" : "⚠️ Sprawdź wynik w e-peAR", 5000);
    }
  };
  addEventListener("message", sluchacz);
}
