/* „Lekcje w e-peAR” – podgląd kursów pobranych z e-peAR (Pomocnik → eksport.json + pliki).
   Pokazuje każdą lekcję tak, jak jest teraz ustawiona: slajdy sceny AR w 3D (modele, obrazy, teksty, filmy, awatary, dymki),
   ustawienia każdego obiektu, opis kursu, pliki i quiz. Dane trzymane lokalnie w przeglądarce (IndexedDB). */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const EPEAR = String((window.LEKCJE_CONFIG || {}).epearUrl || "https://arplus.test.dio.vobacom.org").replace(/\/+$/, "");
const C = 0.0733;   // e-peAR: największy wymiar modelu w scenie = skala × C [m]
const TYP = o => String(o?.$type || "").split(",")[0].split(".").pop();
const RODZAJ_ASSET = { 0: "model", 1: "obraz", 2: "tekst", 3: "film", 4: "awatar" };
const IKONA = { model: "🧊", obraz: "🖼", tekst: "📝", film: "🎬", awatar: "🧑", dymek: "💬", pdf: "📄", dzwiek: "🔊", inny: "📎" };
const NAZWA_RODZAJU = { model: "Model 3D", obraz: "Obraz", tekst: "Tekst", film: "Film", awatar: "Awatar", dymek: "Dymek" };

/* ---------------- dane: eksport + pliki (Blob) ---------------- */
let E = null, PLIKI = {}, wybrany = null, zakladka = "scena", slajd = 0;
const db = () => new Promise((ok, zle) => { const r = indexedDB.open("epear-lekcje", 1); r.onupgradeneeded = () => r.result.createObjectStore("dane"); r.onsuccess = () => ok(r.result); r.onerror = () => zle(r.error); });
async function zapisz() { try { const d = await db(); await new Promise((ok, zle) => { const t = d.transaction("dane", "readwrite"); t.objectStore("dane").put({ eksport: E, pliki: PLIKI }, "ostatni"); t.oncomplete = ok; t.onerror = () => zle(t.error); }); } catch (e) { console.warn("Nie zapisano w przeglądarce:", e); } }
async function wczytajZapisane() { try { const d = await db(); return await new Promise(ok => { const r = d.transaction("dane").objectStore("dane").get("ostatni"); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); }); } catch { return null; } }
async function czytajZip(file) {
  const buf = new Uint8Array(await file.arrayBuffer()), dv = new DataView(buf.buffer), out = {};
  let e = buf.length - 22; while (e > 0 && dv.getUint32(e, true) !== 0x06054b50) e--; if (e <= 0) throw new Error("To nie jest plik .zip");
  let p = dv.getUint32(e + 16, true); const n = dv.getUint16(e + 10, true);
  for (let i = 0; i < n; i++) {
    const met = dv.getUint16(p + 10, true), cs = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const nazwa = new TextDecoder().decode(buf.slice(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
    const start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true); let dane = buf.slice(start, start + cs);
    if (met === 8) dane = new Uint8Array(await new Response(new Blob([dane]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
    out[nazwa] = dane;
  }
  if (!out["eksport.json"]) throw new Error("W pliku brakuje eksport.json – to nie jest eksport lekcji z Pomocnika e-peAR");
  const eksport = JSON.parse(new TextDecoder().decode(out["eksport.json"])), pliki = {};
  for (const [k, v] of Object.entries(out)) if (k.startsWith("pliki/")) pliki[k] = new Blob([v]);
  return { eksport, pliki };
}
function ustaw(eksport, pliki, trwale = true) {
  if (!eksport?.kursy) throw new Error("Nieprawidłowy eksport"); E = eksport; PLIKI = pliki || {}; wybrany = null;
  $("#info").textContent = `· ${E.kursy.length} lekcji · pobrano ${new Date(E.pobrano).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" })} z ${E.zrodlo?.replace(/^https?:\/\//, "") || "e-peAR"}`;
  if (trwale) zapisz(); rysujListe(); pokazKurs(E.kursy[0]?.id);
}

/* ---------------- analiza sceny kursu ---------------- */
const slajdyKursu = k => (k.scena?.slides?.$values || []).map(s => s.sceneData?.objectDatas?.$values || []);
function rodzajObiektu(o) { const t = TYP(o); if (t === "AvatarObjectData") return "awatar"; if (t === "TooltipObjectData") return "dymek"; if (t === "TextObjectData") return "tekst"; return RODZAJ_ASSET[o.assetData?.assetType] || "model"; }
function statystyka(k) { const s = {}; slajdyKursu(k).flat().forEach(o => { const r = rodzajObiektu(o); s[r] = (s[r] || 0) + 1; }); return s; }
const plikKursu = (k, id) => k.pliki.find(f => f.id === id);
const pytaniaKursu = k => (k.quizy || []).reduce((a, q) => a + (q.taskList?.length || 0), 0);

/* ---------------- lista ---------------- */
function rysujListe() {
  const f = $("#filtr").value, q = $("#szukaj").value.trim().toLowerCase();
  const l = (E?.kursy || []).filter(k => { const st = statystyka(k), sc = slajdyKursu(k).length; if (q && !(k.tytul || "").toLowerCase().includes(q)) return false; return !f || (f === "scena" && sc) || (f === "bez" && !sc) || (f === "awatar" && st.awatar) || (f === "quiz" && pytaniaKursu(k)); });
  $("#kursy").innerHTML = l.length ? l.map(k => { const st = statystyka(k), sc = slajdyKursu(k).length;
    return `<button class="kurs ${k.id === wybrany ? "wyb" : ""}" data-id="${esc(k.id)}"><b>${esc(k.tytul || "(bez tytułu)")}</b><div class="ik"><span class="st ${k.status === "MOBILE_INITIALIZED" ? "mob" : ""}">${sc ? `${sc} ${sc === 1 ? "slajd" : sc < 5 ? "slajdy" : "slajdów"}` : "bez sceny"}</span>${k.publiczny ? '<span class="st pub">publiczny</span>' : ""}
      ${Object.entries(st).map(([r, n]) => `${IKONA[r]}${n}`).join(" ")}${pytaniaKursu(k) ? ` ❓${pytaniaKursu(k)}` : ""}</div></button>`; }).join("")
    : `<div class="empty">${E ? "Brak lekcji pasujących do filtra." : "Brak lekcji. Pobierz je z e-peAR albo wczytaj plik .zip."}</div>`;
  $$(".kurs").forEach(b => b.onclick = () => pokazKurs(b.dataset.id));
}
$("#szukaj").oninput = rysujListe; $("#filtr").onchange = rysujListe;

/* ---------------- szczegóły ---------------- */
function pokazKurs(id) {
  const k = E?.kursy.find(x => x.id === id); wybrany = id; slajd = 0; zatrzymaj3D();
  $$(".kurs").forEach(b => b.classList.toggle("wyb", b.dataset.id === id));
  if (!k) { $("#szczeg").innerHTML = ekranStartowy(); podepnijStart(); return; }
  const sc = slajdyKursu(k).length;
  $("#szczeg").innerHTML = `<div id="naglowek"><h1>${esc(k.tytul || "(bez tytułu)")}</h1><div class="small muted">${esc(k.krotkiOpis || "")}</div>
    <div id="zakladki">${[["scena", `🎬 Scena AR${sc ? ` (${sc})` : ""}`], ["opis", "📋 Opis i ustawienia"], ["pliki", `📎 Pliki (${k.pliki.length})`], ["quiz", `❓ Quiz${pytaniaKursu(k) ? ` (${pytaniaKursu(k)})` : ""}`], ["surowe", "{ } Dane"]].map(([z, t]) => `<button data-z="${z}" class="${z === zakladka ? "wyb" : ""}">${t}</button>`).join("")}</div></div><div id="tresc"></div>`;
  $$("#zakladki button").forEach(b => b.onclick = () => { zakladka = b.dataset.z; $$("#zakladki button").forEach(x => x.classList.toggle("wyb", x === b)); rysujZakladke(k); });
  rysujZakladke(k);
}
function rysujZakladke(k) {
  zatrzymaj3D(); const T = $("#tresc");
  if (zakladka === "scena") { if (!slajdyKursu(k).length) { T.innerHTML = `<div class="pusto2"><div><b>Ta lekcja nie ma jeszcze sceny AR.</b><br>Scena powstaje w aplikacji e-peAR (lub z Pomocnika). Status kursu: ${esc(k.status || "–")}.</div></div>`; return; } T.innerHTML = `<div class="scena"><div class="scena3d" id="s3d"><div class="slajdy" id="slajdy"></div><div class="legenda3d" id="leg"></div></div><div class="obiekty" id="obiekty"></div></div>`; scena3D(k); return; }
  if (zakladka === "opis") {
    T.innerHTML = `<div style="display:grid;gap:12px;max-width:980px">
      <table class="t opis"><tr><th style="width:220px">Status</th><td>${esc(k.status === "MOBILE_INITIALIZED" ? "scena gotowa w aplikacji (MOBILE_INITIALIZED)" : k.status === "WEB_INITIALIZED" ? "tylko w panelu www – bez sceny (WEB_INITIALIZED)" : k.status || "–")}</td></tr>
      <tr><th>Widoczność</th><td>${k.publiczny ? "publiczny – w katalogu „Kursy”" : "prywatny"}${k.komentarze ? " · komentarze włączone" : ""}${k.jednorazowy ? " · jednorazowy" : ""}</td></tr><tr><th>Kategoria</th><td>${esc(k.kategorie?.join(", ") || "–")}</td></tr>
      <tr><th>Utworzono / zmieniono</th><td>${esc(fmtData(k.utworzono))} / ${esc(fmtData(k.zmieniono))}</td></tr><tr><th>Obrazy w galerii</th><td>${k.obrazowGalerii || 0}</td></tr>
      <tr><th>Scena</th><td>${slajdyKursu(k).length} slajdów · ${Object.entries(statystyka(k)).map(([r, n]) => `${IKONA[r]} ${NAZWA_RODZAJU[r] || r}: ${n}`).join(" · ") || "brak obiektów"}</td></tr>
      ${k.wymagania ? `<tr><th>Wymagania</th><td>${esc(k.wymagania)}</td></tr>` : ""}</table>
      ${k.czegoSieNauczysz?.length ? `<div class="opis"><b>Czego się nauczysz</b><ul>${k.czegoSieNauczysz.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
      <div class="opis"><b>Opis kursu</b><div>${bezpiecznyHtml(k.opis) || '<span class="muted">brak opisu</span>'}</div></div></div>`;
    return;
  }
  if (zakladka === "pliki") {
    T.innerHTML = k.pliki.length ? `<table class="t"><tr><th></th><th>Plik</th><th>Rodzaj</th><th>Użyty w scenie</th><th>Podgląd</th></tr>${k.pliki.map(f => { const uz = slajdyKursu(k).map((l, i) => l.some(o => o.assetData?.pathOrUrl === f.id) ? i + 1 : 0).filter(Boolean);
      return `<tr><td>${IKONA[f.rodzaj] || "📎"}</td><td><b>${esc(f.nazwa)}</b>${f.animowany ? ' <span class="chip">animowany</span>' : ""}</td><td>${esc(f.rodzaj)}${f.ext ? ` (.${esc(f.ext)})` : ""}</td><td>${uz.length ? "slajd " + uz.join(", ") : '<span class="muted">nie</span>'}</td><td>${f.plik && PLIKI[f.plik] ? `✔ pobrany (${(f.rozmiar / 1048576).toFixed(1)} MB)` : `<span class="muted">${esc(f.pominiety || "nie pobierano")}</span>`}</td></tr>`; }).join("")}</table>` : `<div class="pusto2">Brak plików w kursie.</div>`;
    return;
  }
  if (zakladka === "quiz") {
    const qz = k.quizy || []; if (!qz.length) { T.innerHTML = `<div class="pusto2">Ta lekcja nie ma quizu.</div>`; return; }
    T.innerHTML = qz.map(q => `<div style="max-width:900px"><h2 style="font-size:18px;margin:4px 0">${esc(q.title || "Quiz")}</h2><p class="small muted">${esc(q.description || "")} · limit ${esc(q.timeLimitInMinutes || "–")} min · ${q.taskList?.length || 0} pytań</p>
      ${(q.taskList || []).slice().sort((a, b) => (a.orderNumber ?? 0) - (b.orderNumber ?? 0)).map((t, i) => `<div class="pyt"><b>${i + 1}. ${esc(t.question?.data || "")}</b><ol type="a">${(t.testAnswers || []).slice().sort((a, b) => (a.orderNumber ?? 0) - (b.orderNumber ?? 0)).map(a => `<li class="${a.correct ? "ok" : ""}">${esc(a.content?.data || "")}${a.correct ? " ✓" : ""}</li>`).join("")}</ol>
        ${t.matchAnswers?.length ? `<div class="small">Dopasowanie: ${t.matchAnswers.map(m => esc(JSON.stringify(m))).join(", ")}</div>` : ""}</div>`).join("")}</div>`).join("");
    return;
  }
  T.innerHTML = `<pre class="surowe">${esc(JSON.stringify({ ...k, scena: k.scena ? "(niżej)" : null }, null, 2))}</pre><h3 style="margin:12px 0 6px">Scena (courseData)</h3><pre class="surowe">${esc(JSON.stringify(k.scena, null, 2))}</pre>`;
}
const fmtData = d => d ? new Date(d).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" }) : "–";
function bezpiecznyHtml(html) {   // opis z e-peAR: zostawiamy tylko podstawowe znaczniki
  if (!html) return ""; const doc = new DOMParser().parseFromString(String(html), "text/html"), DOZW = new Set(["P", "B", "STRONG", "I", "EM", "U", "UL", "OL", "LI", "BR", "H1", "H2", "H3", "H4", "A", "SPAN", "DIV"]);
  const czysc = el => { for (const n of [...el.childNodes]) { if (n.nodeType === 1) { if (!DOZW.has(n.tagName)) { n.replaceWith(...n.childNodes); continue; } const href = n.tagName === "A" ? n.getAttribute("href") : null; for (const a of [...n.attributes]) n.removeAttribute(a.name); if (href && /^https?:\/\//i.test(href)) { n.setAttribute("href", href); n.setAttribute("target", "_blank"); n.setAttribute("rel", "noopener"); } czysc(n); } else if (n.nodeType !== 3) n.remove(); } };
  czysc(doc.body); return doc.body.innerHTML;
}

/* ---------------- scena 3D ---------------- */
let R3 = null;
function zatrzymaj3D() { if (R3) { cancelAnimationFrame(R3.raf); R3.ro?.disconnect(); R3.r.dispose(); R3.urls.forEach(u => URL.revokeObjectURL(u)); R3 = null; } }
const v3 = v => new THREE.Vector3(v?.x || 0, v?.y || 0, -(v?.z || 0));    // Unity (lewoskrętny) → three.js
const rot = (obj, r) => obj.rotation.set(THREE.MathUtils.degToRad(-(r?.x || 0)), THREE.MathUtils.degToRad(-(r?.y || 0)), THREE.MathUtils.degToRad(r?.z || 0), "YXZ");
function etykieta(tekst, kolor = "#1f2a2e", tlo = "#fffdf8") {
  const c = document.createElement("canvas"), g = c.getContext("2d"), f = 56, txt = tekst.length > 60 ? tekst.slice(0, 58) + "…" : tekst; g.font = `600 ${f}px system-ui`; const w = Math.min(1800, g.measureText(txt).width + 52);
  c.width = w; c.height = f + 40; g.fillStyle = tlo; g.beginPath(); g.roundRect(0, 0, w, c.height, 26); g.fill(); g.fillStyle = kolor; g.font = `600 ${f}px system-ui`; g.fillText(txt, 26, f + 6);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(w / c.height * 0.12, 0.12, 1); s.renderOrder = 10; return s;
}
function panelTekstu(o) {
  const txt = String(o.text || ""), szer = Math.max(0.3, 0.35 * (o.scale?.x || 1)), c = document.createElement("canvas"), g = c.getContext("2d"), W = 1800, rozm = 2 * Math.max(18, Math.min(46, (o.fontSize || 24) * 1.4));
  g.font = `${o.isBold ? 700 : 400} ${rozm}px system-ui`; const linie = []; for (const akapit of txt.split("\n")) { let l = ""; for (const w of akapit.split(" ")) { if (g.measureText(l + w).width > W - 120) { linie.push(l.trim()); l = ""; } l += w + " "; } linie.push(l.trim()); }
  const H = Math.min(4096, Math.max(240, linie.length * rozm * 1.3 + 120)); c.width = W; c.height = H;
  if (!o.isTransparentBackground && !o.TransparentBackground) { g.fillStyle = "#fffdf8"; g.beginPath(); g.roundRect(0, 0, W, H, 60); g.fill(); }
  const kol = o.isCustomColor && o.colorText ? `rgb(${o.colorText.x * 255},${o.colorText.y * 255},${o.colorText.z * 255})` : "#1f2a2e";
  g.fillStyle = kol; g.font = `${o.isBold ? 700 : 400} ${o.isItalic ? "italic " : ""}${rozm}px system-ui`; g.textAlign = o.isLeftAlignment ? "left" : o.isRightAlignment ? "right" : "center";
  const x = o.isLeftAlignment ? 60 : o.isRightAlignment ? W - 60 : W / 2; linie.forEach((l, i) => g.fillText(o.isUppercase ? l.toUpperCase() : l, x, 60 + rozm + i * rozm * 1.3));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return new THREE.Mesh(new THREE.PlaneGeometry(szer, szer * H / W), new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide }));
}
function awatar(o) {
  const g = new THREE.Group(), h = 1.05 * (o.scale?.x || 1.6), kob = o.thisAvatarGender === 1, m = new THREE.MeshStandardMaterial({ color: kob ? "#c97aa8" : "#5b8fd1", roughness: 0.5 });
  const cialo = new THREE.Mesh(new THREE.CapsuleGeometry(h * 0.13, h * 0.42, 6, 16), m); cialo.position.y = h * 0.42; g.add(cialo);
  const glowa = new THREE.Mesh(new THREE.SphereGeometry(h * 0.1, 24, 16), new THREE.MeshStandardMaterial({ color: "#f1c9a5", roughness: 0.6 })); glowa.position.y = h * 0.86; g.add(glowa);
  const e = etykieta(`🧑 Awatar${kob ? " (kobieta)" : " (mężczyzna)"}${o.isStartSpeechOnStart ? " · mówi od razu" : ""}${o.isChatAvailableForStudents ? " · czat" : ""}`); e.position.y = h * 1.05; g.add(e);
  g.position.y = -h / 2;   // pozycja e-peAR = środek postaci
  const k = new THREE.Group(); k.add(g); return k;
}
async function zbudujObiekt(o, k, gltf, urls) {
  const r = rodzajObiektu(o), s = o.scale?.x || 1, f = plikKursu(k, o.assetData?.pathOrUrl), blob = f?.plik && PLIKI[f.plik];
  if (r === "tekst") return panelTekstu(o);
  if (r === "awatar") return awatar(o);
  if (r === "obraz" || r === "film") {
    const szer = Math.max(0.2, s * C); let mat = new THREE.MeshBasicMaterial({ color: r === "film" ? "#111" : "#ddd", side: THREE.DoubleSide }), prop = r === "film" ? 9 / 16 : 0.66;
    if (blob && r === "obraz") { const u = URL.createObjectURL(blob); urls.push(u); try { const t = await new THREE.TextureLoader().loadAsync(u); t.colorSpace = THREE.SRGBColorSpace; prop = t.image.height / t.image.width; mat = new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }); } catch {} }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(szer, szer * prop), mat); if (r === "film" || !blob) { const e = etykieta(`${IKONA[r]} ${f?.nazwa || o.assetData?.name || r}`); e.position.z = 0.01; m.add(e); } return m;
  }
  // model 3D
  const g = new THREE.Group(); let blad = "";
  if (blob) { const u = URL.createObjectURL(blob); urls.push(u); try { await dekodery(gltf, blob); const sc = (await gltf.loadAsync(u)).scene, bb = new THREE.Box3().setFromObject(sc), roz = bb.getSize(new THREE.Vector3()), max = Math.max(roz.x, roz.y, roz.z) || 1, k2 = s * C / max;
      sc.scale.setScalar(k2); sc.position.copy(bb.getCenter(new THREE.Vector3()).multiplyScalar(-k2)); g.add(sc); g.userData.norm = { k: k2, c: bb.getCenter(new THREE.Vector3()) }; return g; } catch (e) { console.warn("GLB", f?.nazwa, e); blad = powodBledu(e, blob); } }
  const b = new THREE.Mesh(new THREE.BoxGeometry(s * C, s * C * 0.6, s * C * 0.6), new THREE.MeshStandardMaterial({ color: "#c9562f", transparent: true, opacity: 0.35, wireframe: false }));
  b.add(new THREE.LineSegments(new THREE.EdgesGeometry(b.geometry), new THREE.LineBasicMaterial({ color: "#ffb27a" }))); const e = etykieta(`🧊 ${f?.nazwa || o.assetData?.name || "model"}${f?.pominiety ? ` – nie pobrano: ${f.pominiety}` : blad ? ` – ⚠️ ${blad}` : ""}`); e.position.y = s * C * 0.4; b.add(e); g.add(b); const pow = f?.pominiety ? "nie pobrano – " + f.pominiety : blad; if (pow && o.guid) { const el = document.querySelector(`#obiekty .ob[data-guid="${CSS.escape(o.guid)}"]`); el?.insertAdjacentHTML("beforeend", `<div class="small" style="color:#b3401c;margin-top:4px">⚠️ Model nie wyświetlony: ${esc(pow)}</div>`); } return g;
}
async function scena3D(k) {
  const kont = $("#s3d"), r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.toneMapping = THREE.NeutralToneMapping; kont.prepend(r.domElement);
  const sc = new THREE.Scene(); sc.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture; const sw = new THREE.DirectionalLight("#fff", 1); sw.position.set(2, 5, 3); sc.add(sw);
  const kam = new THREE.PerspectiveCamera(50, 1, 0.005, 200), ster = new OrbitControls(kam, r.domElement); ster.enableDamping = true; ster.zoomToCursor = true; ster.minDistance = 0.03; ster.maxDistance = 60; ster.screenSpacePanning = true;
  const siatka = new THREE.GridHelper(12, 24, "#6f8597", "#34495a"); sc.add(siatka);
  const start = new THREE.Group(); const ludzik = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 16), new THREE.MeshStandardMaterial({ color: "#f2b705" })); ludzik.rotation.x = -Math.PI / 2; ludzik.position.set(0, 0.02, -0.15); start.add(ludzik);
  const es = etykieta("📍 punkt startu – patrzy w stronę sceny", "#1f2a2e", "#f2b705"); es.position.set(0, 0.35, 0); start.add(es); sc.add(start);
  R3 = { r, sc, kam, ster, urls: [], raf: 0, obiekty: [], grupa: null };
  const rozm = () => { const w = kont.clientWidth, h = kont.clientHeight; r.setSize(w, h, false); kam.aspect = w / Math.max(1, h); kam.updateProjectionMatrix(); };
  R3.ro = new ResizeObserver(rozm); R3.ro.observe(kont); rozm();
  const pet = () => { R3.raf = requestAnimationFrame(pet); ster.update(); r.render(sc, kam); }; pet();
  const ray = new THREE.Raycaster(), m = new THREE.Vector2(); let d0 = null;
  r.domElement.addEventListener("pointerdown", e => d0 = [e.clientX, e.clientY]);
  r.domElement.addEventListener("pointerup", e => { if (!d0 || Math.hypot(e.clientX - d0[0], e.clientY - d0[1]) > 5) return; const b = r.domElement.getBoundingClientRect(); m.set((e.clientX - b.left) / b.width * 2 - 1, -(e.clientY - b.top) / b.height * 2 + 1); ray.setFromCamera(m, kam);
    const h = ray.intersectObjects(R3.obiekty.map(x => x.obj), true)[0]; if (!h) return; const x = R3.obiekty.find(q => { let p = h.object; while (p) { if (p === q.obj) return true; p = p.parent; } return false; }); if (x) zaznacz(x.i, false); });
  r.domElement.addEventListener("dblclick", e => { const b = r.domElement.getBoundingClientRect(); m.set((e.clientX - b.left) / b.width * 2 - 1, -(e.clientY - b.top) / b.height * 2 + 1); ray.setFromCamera(m, kam);
    const h = ray.intersectObjects(R3.obiekty.map(x => x.obj), true)[0]; if (!h) return; const x = R3.obiekty.find(q => { let p = h.object; while (p) { if (p === q.obj) return true; p = p.parent; } return false; });
    if (x) { zaznacz(x.i, true); const o = slajdyKursu(k)[slajd]?.[x.i], rr = o && rodzajObiektu(o); if (rr === "tekst" || rr === "obraz") podgladTresci(o, k); } });
  const nav = document.createElement("div"); nav.className = "nav3d"; nav.innerHTML = `<button title="Cały slajd">⤢</button><button title="Przybliż">＋</button><button title="Oddal">－</button>`; kont.appendChild(nav);
  const [bCaly, bPlus, bMinus] = nav.querySelectorAll("button"); bCaly.onclick = () => kadruj(); bPlus.onclick = () => dolly(0.7); bMinus.onclick = () => dolly(1 / 0.7);
  const slajdy = slajdyKursu(k);
  $("#slajdy").innerHTML = slajdy.map((l, i) => `<button data-s="${i}">Slajd ${i + 1} · ${l.filter(o => rodzajObiektu(o) !== "dymek").length} ob.</button>`).join("");
  $$("#slajdy button").forEach(b => b.onclick = () => pokazSlajd(k, +b.dataset.s));
  pokazSlajd(k, 0);
}
/* Modele skompresowane (Draco, Meshopt, tekstury KTX2) – dekodery doczytywane z CDN tylko wtedy, gdy model ich wymaga. */
const CDN3 = "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/";
async function naglowekGlb(blob) {
  const b = new DataView(await blob.slice(0, 20).arrayBuffer());
  if (b.byteLength < 20 || b.getUint32(0, true) !== 0x46546c67) return null;
  try { return JSON.parse(new TextDecoder().decode(await blob.slice(20, 20 + b.getUint32(12, true)).arrayBuffer())); } catch { return null; }
}
async function dekodery(gltf, blob) {
  const j = await naglowekGlb(blob); if (!j) return;
  const ext = new Set([...(j.extensionsUsed || []), ...(j.extensionsRequired || [])]);
  if ((ext.has("EXT_meshopt_compression") || ext.has("KHR_meshopt_compression")) && !gltf.__meshopt) { const { MeshoptDecoder } = await import(CDN3 + "libs/meshopt_decoder.module.js"); await MeshoptDecoder.ready; gltf.setMeshoptDecoder(MeshoptDecoder); gltf.__meshopt = 1; }
  if (ext.has("KHR_draco_mesh_compression") && !gltf.__draco) { const { DRACOLoader } = await import(CDN3 + "loaders/DRACOLoader.js"); const d = new DRACOLoader(); d.setDecoderPath(CDN3 + "libs/draco/gltf/"); gltf.setDRACOLoader(d); gltf.__draco = 1; }
  if (ext.has("KHR_texture_basisu") && !gltf.__ktx2 && R3) { const { KTX2Loader } = await import(CDN3 + "loaders/KTX2Loader.js"); const k = new KTX2Loader(); k.setTranscoderPath(CDN3 + "libs/basis/"); k.detectSupport(R3.r); gltf.setKTX2Loader(k); gltf.__ktx2 = 1; }
}
function powodBledu(e, blob) {
  const t = String(e?.message || e || "");
  if (/meshopt/i.test(t)) return "kompresja Meshopt (brak dekodera)";
  if (/draco/i.test(t)) return "kompresja Draco (brak dekodera)";
  if (/ktx|basis/i.test(t)) return "tekstury KTX2 (brak dekodera)";
  if (/fetch|import|module/i.test(t)) return "nie udało się doczytać dekodera z internetu";
  if (/not valid JSON|Unexpected token|Unexpected end/i.test(t)) return "plik uszkodzony albo to nie jest GLB";
  if (/Unsupported asset|version/i.test(t)) return "stary format glTF 1.0";
  return "nie wczytano (" + t.slice(0, 60) + ")";
}

async function pokazSlajd(k, i) {
  if (!R3) return; slajd = i; const lista = slajdyKursu(k)[i] || [], { sc, kam, ster } = R3, gltf = new GLTFLoader();
  $$("#slajdy button").forEach(b => b.classList.toggle("wyb", +b.dataset.s === i));
  if (R3.grupa) sc.remove(R3.grupa); const g = R3.grupa = new THREE.Group(); sc.add(g); R3.obiekty = [];
  $("#obiekty").innerHTML = lista.map((o, j) => kartaObiektu(o, j, k, lista)).join("") || `<div class="muted small">Pusty slajd.</div>`;
  $$("#obiekty .ob").forEach(el => el.onclick = () => { const j = +el.dataset.j, o = lista[j], rr = rodzajObiektu(o); zaznacz(j, true); if (rr === "tekst" || rr === "obraz") el.querySelector(".czytaj") || el.insertAdjacentHTML("beforeend", `<button class="btn sm czytaj" style="margin-top:6px">🔍 ${rr === "tekst" ? "Czytaj tekst" : "Pokaż obraz"}</button>`); const b = el.querySelector(".czytaj"); if (b) b.onclick = e => { e.stopPropagation(); podgladTresci(o, k); }; });
  $$("#obiekty audio[data-glos]").forEach(a => { const u = URL.createObjectURL(PLIKI[a.dataset.glos]); R3.urls.push(u); a.src = u; a.onclick = e => e.stopPropagation(); });
  $("#leg").textContent = "Wczytuję obiekty…";
  const wgGuid = {};
  for (const [j, o] of lista.entries()) { if (rodzajObiektu(o) === "dymek") continue; if (!R3 || R3.grupa !== g) return;
    const obj = await zbudujObiekt(o, k, gltf, R3.urls); obj.position.copy(v3(o.position)); rot(obj, o.rotation); g.add(obj); R3.obiekty.push({ i: j, obj }); wgGuid[o.guid] = { o, obj }; }
  for (const [j, o] of lista.entries()) { if (rodzajObiektu(o) !== "dymek") continue; const cel = wgGuid[o.objectId]; const e = etykieta("💬 " + (o.tooltipText || ""), "#fff", "#1f2a2ee6");
    const d = new THREE.Group(); d.add(e);
    if (cel) { const n = cel.obj.userData.norm, lok = v3(o.position), roz = new THREE.Box3().setFromObject(cel.obj).getSize(new THREE.Vector3()).length();
      const pkt = n ? lok.sub(n.c).multiplyScalar(n.k) : lok.multiplyScalar(0.05);   // punkt na modelu (układ lokalny modelu → świat)
      pkt.applyQuaternion(cel.obj.quaternion).add(cel.obj.position);
      const nr = (cel.dymki = (cel.dymki || 0) + 1) - 1, wys = Math.max(0.04, Math.min(0.25, roz * 0.12)) * (1 + 0.55 * nr);   // kolejne dymki tego obiektu wyżej – mniej nakładania
      const asp = e.scale.x / e.scale.y; e.material.sizeAttenuation = false; e.scale.set(0.042 * asp, 0.042, 1); e.center.set(0.5, 0);   // stała wielkość na ekranie – czytelne przy każdym przybliżeniu
      e.position.copy(pkt).add(new THREE.Vector3(0, wys, 0));
      const kropka = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.003, roz * 0.006), 12, 8), new THREE.MeshBasicMaterial({ color: "#f2b705", depthTest: false })); kropka.position.copy(pkt); kropka.renderOrder = 11;
      const linia = new THREE.Line(new THREE.BufferGeometry().setFromPoints([pkt, e.position.clone()]), new THREE.LineBasicMaterial({ color: "#f2b705", depthTest: false })); linia.renderOrder = 11;
      d.add(kropka, linia); }
    g.add(d); R3.obiekty.push({ i: j, obj: d }); }
  kadruj(true);
  const ile = {}; lista.forEach(o => { const r = rodzajObiektu(o); ile[r] = (ile[r] || 0) + 1; });
  $("#leg").textContent = `Slajd ${i + 1}: ${Object.entries(ile).map(([r, n]) => `${IKONA[r]} ${n}`).join("  ")} · przeciągaj – obrót · kółko/szczypanie – przybliżenie w miejsce kursora · prawy przycisk/2 palce – przesuwanie · dwuklik na obiekcie – najazd (tekst i obraz otworzą się do czytania).`;
}
function kartaObiektu(o, j, k, lista) {
  const r = rodzajObiektu(o), f = plikKursu(k, o.assetData?.pathOrUrl), p = o.position || {}, ro = o.rotation || {}, s = o.scale?.x;
  const nazwa = r === "dymek" ? `„${o.tooltipText || ""}”` : r === "tekst" ? (o.text || "").slice(0, 70) + ((o.text || "").length > 70 ? "…" : "") : (f?.nazwa || o.assetData?.name || "–");
  const fl = (on, t) => `<span class="chip ${on ? "on" : ""}">${on ? "✓" : "✕"} ${t}</span>`;
  const cel = r === "dymek" ? lista.find(x => x.guid === o.objectId) : null;
  const ustaw = r === "dymek" ? `<div class="small">przypięty do: ${esc(cel ? (plikKursu(k, cel.assetData?.pathOrUrl)?.nazwa || cel.assetData?.name || rodzajObiektu(cel)) : "obiektu spoza slajdu")}</div>`
    : `${fl(o.isMovableByStudents, "przesuwanie")}${fl(o.isRotatableByStudents, "obracanie")}${fl(o.isScalableByStudents, "skalowanie")}${r === "model" ? fl(o.isDisassemblableByStudents, "rozkładanie") + fl(o.isPuzzle, "puzzle") + fl(o.showHierarchyToStudents || o.showInteractablePartsList, "lista części") : ""}
       ${o.chosenAnimation ? `<span class="chip on">▶ animacja: ${esc(o.chosenAnimation)}</span>` : ""}${o.isPuzzle ? `<span class="chip">precyzja ${o.puzzlePrecisionNeeded}</span>` : ""}
       ${r === "awatar" ? `<div class="small" style="margin-top:4px">Płeć: ${o.thisAvatarGender === 1 ? "kobieta" : "mężczyzna"} · mowa: ${o.isHaveSpeech ? "tak" : "nie"} · mówi od razu: ${o.isStartSpeechOnStart || o.StartWithSlide ? "tak" : "nie"} · czat dla uczniów: ${o.isChatAvailableForStudents ? "tak" : "nie"}${f ? ` · głos: ${esc(f.nazwa)}` : ""}</div>${f?.plik && PLIKI[f.plik] && f.rodzaj === "dzwiek" ? `<audio controls preload="none" style="width:100%;margin-top:4px" data-glos="${esc(f.plik)}"></audio>` : ""}` : ""}
       ${r === "tekst" ? `<div class="small" style="margin-top:4px">czcionka ${Math.round(o.fontSize || 0)}${o.isBold ? ", pogrubiona" : ""}${o.isAutoFontSize ? ", auto" : ""} · ${o.isLeftAlignment ? "do lewej" : o.isRightAlignment ? "do prawej" : "wyśrodkowany"}</div>` : ""}
       ${(r === "film") ? `<div class="small" style="margin-top:4px">pętla: ${o.assetData?.isLooping ? "tak" : "nie"} · start automatyczny: ${o.assetData?.isPlayOnAwake ? "tak" : "nie"}</div>` : ""}`;
  return `<div class="ob" data-j="${j}" data-guid="${esc(o.guid || "")}"><b>${IKONA[r]} ${NAZWA_RODZAJU[r] || r}</b> · ${esc(nazwa)}
    ${r !== "dymek" ? `<div class="poz">poz. (${(+p.x || 0).toFixed(2)}, ${(+p.y || 0).toFixed(2)}, ${(+p.z || 0).toFixed(2)}) m · obrót ${Math.round(((+ro.y || 0) % 360 + 360) % 360)}° · skala ${s != null ? (+s).toFixed(2) : "–"}${r === "model" && s ? ` (≈ ${(s * C).toFixed(2)} m)` : ""}</div>` : ""}<div>${ustaw}</div></div>`;
}
/* ---- kamera: kadr całego slajdu, najazd na obiekt, przybliżanie ---- */
function lot(cel, poz, ms = 450) {
  if (!R3) return; const { kam, ster } = R3, t0 = performance.now(), a = ster.target.clone(), b = kam.position.clone(), id = R3.lot = (R3.lot || 0) + 1;
  R3.celLotu = { cel: cel.clone(), poz: poz.clone() };
  const krok = () => { if (!R3 || R3.lot !== id) return; const u = Math.min(1, (performance.now() - t0) / ms), e = u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2; ster.target.lerpVectors(a, cel, e); kam.position.lerpVectors(b, poz, e); if (u < 1) requestAnimationFrame(krok); else R3.celLotu = null; };
  krok();
}
function kadruj(odRazu) {
  if (!R3?.grupa) return; const bb = new THREE.Box3().setFromObject(R3.grupa).union(new THREE.Box3(new THREE.Vector3(-0.3, 0, -0.3), new THREE.Vector3(0.3, 1.7, 0.3))), c = bb.getCenter(new THREE.Vector3()), s = Math.max(2, bb.getSize(new THREE.Vector3()).length());
  const poz = new THREE.Vector3(c.x + s * 0.15, c.y + s * 0.45, c.z + s * 0.85); if (odRazu) { R3.kam.position.copy(poz); R3.ster.target.copy(c); R3.ster.update(); } else lot(c, poz);
}
function najedz(obj) {
  const bb = new THREE.Box3().setFromObject(obj), c = bb.getCenter(new THREE.Vector3()), r = Math.max(0.05, bb.getSize(new THREE.Vector3()).length() / 2), d = r / Math.sin(THREE.MathUtils.degToRad(R3.kam.fov / 2)) * 1.05;
  const kier = R3.kam.position.clone().sub(R3.ster.target).normalize(); if (kier.y < 0.15) { kier.y = 0.3; kier.normalize(); } lot(c, c.clone().addScaledVector(kier, d));
}
function dolly(f) { if (!R3) return; const { kam, ster } = R3, t = R3.celLotu?.cel || ster.target.clone(), p = R3.celLotu?.poz || kam.position.clone(), v = p.clone().sub(t); if (f < 1 && v.length() * f < ster.minDistance) return; lot(t, t.clone().addScaledVector(v, f), 250); }
function podgladTresci(o, k) {
  const r = rodzajObiektu(o), f = plikKursu(k, o.assetData?.pathOrUrl), blob = f?.plik && PLIKI[f.plik];
  const w = document.createElement("div"); w.className = "podglad"; w.innerHTML = `<div class="okno"><button class="x" title="Zamknij">✕</button>${r === "tekst" ? `<div class="txt">${esc(o.text || "").replace(/\n/g, "<br>")}</div>` : blob ? `<img alt="">` : `<p>Obraz nie został pobrany.</p>`}</div>`;
  if (r === "obraz" && blob) { const u = URL.createObjectURL(blob); w.querySelector("img").src = u; R3?.urls.push(u); }
  w.onclick = e => { if (e.target === w || e.target.classList.contains("x")) w.remove(); }; document.body.appendChild(w);
}
function zaznacz(j, kamera) {
  $$("#obiekty .ob").forEach(el => el.classList.toggle("wyb", +el.dataset.j === j)); const el = $(`#obiekty .ob[data-j="${j}"]`); el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  if (!R3) return; R3.sc.getObjectByName("__ramka")?.removeFromParent(); const x = R3.obiekty.find(q => q.i === j); if (!x) return;
  const h = new THREE.BoxHelper(x.obj, "#f2b705"); h.name = "__ramka"; R3.sc.add(h);
  if (kamera) najedz(x.obj);
}

/* ---------------- start, import, połączenie z Pomocnikiem ---------------- */
function ekranStartowy() {
  return `<div class="pusto2"><div class="drop" id="drop" style="max-width:640px;text-align:left">
    <h2 style="font-size:20px;margin-bottom:6px">📚 Lekcje w e-peAR</h2>
    <p>Pobierz swoje kursy z e-peAR, żeby zobaczyć, jak są teraz ustawione: slajdy sceny AR w 3D, modele, teksty, obrazy, filmy, awatary i dymki, ustawienia każdego obiektu, opis kursu i quiz.</p>
    <ol><li>Kliknij <b>📥 Pobierz z e-peAR</b> – otworzy się e-peAR (zaloguj się, jeśli trzeba).</li><li>Na karcie e-peAR kliknij zakładkę <b>📤 Pomocnik e-peAR</b> (<a href="index.html" target="_blank">jak ją dodać</a>).</li><li>Zaznacz lekcje i kliknij <b>Pobierz zaznaczone</b> – trafią tutaj same.</li></ol>
    <p class="small muted">Masz już plik z Pomocnika? Przeciągnij go tutaj albo użyj „📂 Wczytaj plik .zip”. Dane zostają w tej przeglądarce. Pobieranie tylko odczytuje e-peAR – niczego tam nie zmienia.</p>
    <p class="small" id="stanPob"></p></div></div>`;
}
function podepnijStart() {
  const d = $("#drop"); if (!d) return;
  d.ondragover = e => { e.preventDefault(); d.classList.add("nad"); }; d.ondragleave = () => d.classList.remove("nad");
  d.ondrop = e => { e.preventDefault(); d.classList.remove("nad"); const f = e.dataTransfer.files[0]; if (f) wczytajPlik(f); };
}
async function wczytajPlik(f) { try { const { eksport, pliki } = await czytajZip(f); ustaw(eksport, pliki); } catch (e) { alert("Nie udało się wczytać: " + e.message); } }
$("#plik").onchange = e => e.target.files[0] && wczytajPlik(e.target.files[0]);
let oknoEpear = null;
$("#bPobierz").onclick = () => {
  oknoEpear = window.open(EPEAR + "/my-courses", "epear-lekcje");
  if (!wybrany) { const s = $("#stanPob"); if (s) s.textContent = "⏳ Czekam, aż na karcie e-peAR klikniesz zakładkę „Pomocnik e-peAR”…"; }
};
addEventListener("message", e => {
  if (e.origin !== new URL(EPEAR).origin) return;
  if (e.data?.typ === "epear-gotowy" && e.source) { e.source.postMessage({ typ: "epear-chce-lekcje" }, e.origin); const s = $("#stanPob"); if (s) s.textContent = "🔗 Pomocnik połączony – wybierz lekcje na karcie e-peAR."; }
  if (e.data?.typ === "epear-lekcje" && e.data.eksport) { const pliki = {}; for (const f of e.data.pliki || []) pliki[f.nazwa] = f.blob; try { ustaw(e.data.eksport, pliki); window.focus(); } catch (err) { alert(err.message); } }
});
(async () => { const z = await wczytajZapisane(); if (z?.eksport) ustaw(z.eksport, z.pliki, false); else { rysujListe(); pokazKurs(null); } })();
window.__lekcjeEpear = { ustaw, stan: () => ({ E, wybrany, slajd, obiekty: R3?.obiekty.length ?? 0 }), pokazKurs, pokazSlajd: i => { const k = E.kursy.find(x => x.id === wybrany); return pokazSlajd(k, i); }, zakladka: z => { zakladka = z; pokazKurs(wybrany); }, r3: () => R3, THREE, kadruj, podgladTresci: (j) => { const k = E.kursy.find(x => x.id === wybrany); podgladTresci(slajdyKursu(k)[slajd][j], k); } };
