/*
 * Multimedia generatora: obrazy (SVG → JPG), modele 3D (przepis → GLB), wykresy, karty plików i tablice z tekstem,
 * podgląd 3D oraz okno czatu AI do tworzenia i poprawiania obrazów i modeli.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { esc, resolveUrl } from "./wspolne.js";
import { ai, wczytajSvg } from "./gen-ai.js";

/* ======================================================================= obrazy */
/** Usuwa z SVG wszystko, co mogłoby uruchomić kod albo pobrać coś z zewnątrz. */
export const czyscSvg = svg => String(svg).replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
  .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, "").replace(/\s(xlink:)?href\s*=\s*("|')(?!#)[^"']*\2/gi, "");
export async function svgDoJpg(svg, max = 1800) {
  const m = svg.match(/viewBox="[\d.\s-]*?\s([\d.]+)\s+([\d.]+)"/);
  const w0 = m ? +m[1] : 1600, h0 = m ? +m[2] : 1000, k = Math.min(1, max / Math.max(w0, h0));
  const src = svg.includes("width=") ? svg : svg.replace("<svg", `<svg width="${w0}" height="${h0}"`);
  const url = URL.createObjectURL(new Blob([src], { type: "image/svg+xml" }));
  try {
    const img = new Image(); img.src = url; await img.decode();
    const c = document.createElement("canvas"); c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    return { blob: await new Promise(r => c.toBlob(r, "image/jpeg", 0.9)), w: c.width, h: c.height };
  } finally { URL.revokeObjectURL(url); }
}
export async function obrazZPliku(file, max = 2048) {
  const img = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
  return { blob: await new Promise(r => c.toBlob(r, "image/jpeg", 0.88)), w: c.width, h: c.height };
}
const canvasJpg = async c => ({ blob: await new Promise(r => c.toBlob(r, "image/jpeg", 0.9)), w: c.width, h: c.height });

function zawin(g, tekst, maxW) {
  const out = [];
  for (const akapit of String(tekst).split("\n")) {
    let line = "";
    for (const w of akapit.split(" ")) {
      const t = line ? line + " " + w : w;
      if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  return out;
}

/** Tablica z tekstem dla uczniów – pojawia się w scenie AR obok modeli i zdjęć. */
export async function tablicaTekstu(tytul, tekst) {
  const W = 1600, c = document.createElement("canvas"), g = c.getContext("2d");
  g.font = "36px system-ui, sans-serif";
  const lines = zawin(g, tekst, W - 200);
  const H = Math.max(700, 260 + lines.length * 54);
  c.width = W; c.height = Math.min(H, 1500);
  g.fillStyle = "#fffdf8"; g.fillRect(0, 0, W, c.height);
  g.fillStyle = "#c9562f"; g.fillRect(0, 0, 24, c.height);
  g.fillStyle = "#1f2a2e"; g.font = "800 60px system-ui, sans-serif";
  zawin(g, tytul, W - 200).slice(0, 2).forEach((l, i) => g.fillText(l, 100, 120 + i * 70));
  g.font = "36px system-ui, sans-serif"; g.fillStyle = "#2b3438";
  const y0 = tytul.length > 40 ? 290 : 220;
  lines.forEach((l, i) => { if (y0 + i * 54 < c.height - 40) g.fillText(l, 100, y0 + i * 54); });
  return canvasJpg(c);
}

/* ======================================================================= wykresy */
const PALETA = ["#c9562f", "#3f63c9", "#e0a030", "#2f6b3a", "#8a4fb3", "#2a9d8f"];
export function rysujWykres(c, d) {
  const W = c.width, H = c.height, g = c.getContext("2d");
  g.fillStyle = "#fffdf8"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#1f2a2e"; g.font = `800 ${Math.round(W / 28)}px system-ui, sans-serif`; g.fillText(d.tytul || "", W * 0.05, H * 0.1);
  const serie = d.serie || [], et = d.etykiety || [];
  const L = W * 0.1, R = W * 0.95, T = H * 0.18, B = H * 0.8;
  if (d.typ === "kolowy") {
    const v = serie[0]?.wartosci || [], sum = v.reduce((a, x) => a + Math.max(0, +x || 0), 0) || 1;
    let a = -Math.PI / 2; const cx = W * 0.35, cy = (T + B) / 2 + H * 0.05, r = Math.min(W * 0.25, (B - T) * 0.6);
    v.forEach((x, i) => {
      const da = 2 * Math.PI * Math.max(0, +x || 0) / sum; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a, a + da); g.closePath();
      g.fillStyle = PALETA[i % PALETA.length]; g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 4; g.stroke(); a += da;
      g.fillRect(W * 0.66, T + i * H * 0.08, W * 0.025, W * 0.025); g.fillStyle = "#1f2a2e"; g.font = `${Math.round(W / 45)}px system-ui`;
      g.fillText(`${et[i] || ""} – ${Math.round(100 * (+x || 0) / sum)}%`, W * 0.7, T + i * H * 0.08 + W * 0.022);
    });
    return c;
  }
  const all = serie.flatMap(s => s.wartosci.map(Number).filter(Number.isFinite));
  const maxV = Math.max(1, ...all), krok = Math.pow(10, Math.floor(Math.log10(maxV))) * (maxV / Math.pow(10, Math.floor(Math.log10(maxV))) > 5 ? 2 : 1);
  const top = Math.ceil(maxV / krok) * krok, Y = v => B - (B - T) * v / top;
  g.font = `${Math.round(W / 55)}px system-ui`; g.strokeStyle = "#e3dccd"; g.lineWidth = 2;
  for (let v = 0; v <= top + 1e-9; v += krok) { g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(R, Y(v)); g.stroke(); g.fillStyle = "#6b6f66"; g.textAlign = "right"; g.fillText(String(+v.toFixed(2)), L - 12, Y(v) + 8); }
  if (d.os) { g.save(); g.translate(W * 0.025, (T + B) / 2); g.rotate(-Math.PI / 2); g.textAlign = "center"; g.fillText(d.os, 0, 0); g.restore(); }
  const n = et.length || Math.max(...serie.map(s => s.wartosci.length)), slot = (R - L) / n;
  g.textAlign = "center";
  et.forEach((e, i) => { g.fillStyle = "#1f2a2e"; zawin(g, e, slot - 10).slice(0, 2).forEach((l, k) => g.fillText(l, L + slot * (i + 0.5), B + 36 + k * 30)); });
  serie.forEach((s, k) => {
    g.fillStyle = g.strokeStyle = PALETA[k % PALETA.length];
    if (d.typ === "liniowy") {
      g.lineWidth = 6; g.beginPath(); s.wartosci.forEach((v, i) => { const x = L + slot * (i + 0.5); i ? g.lineTo(x, Y(+v)) : g.moveTo(x, Y(+v)); }); g.stroke();
      s.wartosci.forEach((v, i) => { g.beginPath(); g.arc(L + slot * (i + 0.5), Y(+v), 10, 0, 7); g.fill(); });
    } else {
      const bw = slot * 0.7 / serie.length;
      s.wartosci.forEach((v, i) => {
        const x = L + slot * i + slot * 0.15 + bw * k; g.fillStyle = PALETA[k % PALETA.length]; g.fillRect(x, Y(+v), bw - 6, B - Y(+v));
        g.fillStyle = "#1f2a2e"; g.font = `700 ${Math.round(W / 50)}px system-ui`; g.fillText(String(v), x + (bw - 6) / 2, Y(+v) - 10);
      });
    }
  });
  if (serie.length > 1) serie.forEach((s, k) => { g.fillStyle = PALETA[k % PALETA.length]; g.fillRect(R - 300, H * 0.06 + k * 34, 22, 22); g.fillStyle = "#1f2a2e"; g.textAlign = "left"; g.font = `${Math.round(W / 60)}px system-ui`; g.fillText(s.nazwa, R - 270, H * 0.06 + k * 34 + 19); });
  g.textAlign = "left";
  return c;
}
export async function wykresJpg(d) { const c = document.createElement("canvas"); c.width = 1600; c.height = 1000; return canvasJpg(rysujWykres(c, d)); }

/* ======================================================================= karty plików */
const TYPY_PLIKOW = { docx: ["W", "#2b579a", "dokument Word"], doc: ["W", "#2b579a", "dokument Word"], xlsx: ["X", "#217346", "arkusz Excel"], xls: ["X", "#217346", "arkusz Excel"],
  pptx: ["P", "#c43e1c", "prezentacja PowerPoint"], ppt: ["P", "#c43e1c", "prezentacja PowerPoint"], pdf: ["PDF", "#b30b00", "dokument PDF"], odt: ["T", "#2a6099", "dokument"], ods: ["S", "#2a8a3e", "arkusz"], odp: ["P", "#b6491b", "prezentacja"], csv: ["CSV", "#217346", "dane CSV"], txt: ["TXT", "#555", "tekst"] };
export const typPliku = n => (n.split(".").pop() || "").toLowerCase();
export async function kartaPliku(nazwa, podglad) {
  const [lit, kol, opis] = TYPY_PLIKOW[typPliku(nazwa)] || ["?", "#555", "plik"];
  const c = document.createElement("canvas"); c.width = 1600; c.height = 1000; const g = c.getContext("2d");
  g.fillStyle = "#fffdf8"; g.fillRect(0, 0, 1600, 1000);
  g.fillStyle = kol; g.fillRect(0, 0, 1600, 200);
  g.fillStyle = "#fff"; g.font = "800 110px system-ui"; g.fillText(lit, 70, 140);
  g.font = "700 54px system-ui"; zawin(g, nazwa, 1150).slice(0, 2).forEach((l, i) => g.fillText(l, 70 + g.measureText(lit).width * 0 + 330, 90 + i * 62));
  g.fillStyle = "#6b6f66"; g.font = "36px system-ui"; g.fillText(opis + " · załącznik do lekcji", 70, 270);
  if (podglad?.tabela) {
    const t = podglad.tabela.slice(0, 12), kols = Math.min(6, Math.max(...t.map(r => r.length))), cw = 1460 / kols;
    t.forEach((r, i) => r.slice(0, kols).forEach((v, j) => {
      g.fillStyle = i === 0 ? "#eef3ee" : (i % 2 ? "#fff" : "#faf7f0"); g.fillRect(70 + j * cw, 320 + i * 54, cw, 54);
      g.strokeStyle = "#e3dccd"; g.strokeRect(70 + j * cw, 320 + i * 54, cw, 54);
      g.fillStyle = "#1f2a2e"; g.font = (i === 0 ? "700 " : "") + "28px system-ui"; g.fillText(String(v ?? "").slice(0, 22), 82 + j * cw, 356 + i * 54);
    }));
  } else if (podglad?.tekst) {
    g.fillStyle = "#2b3438"; g.font = "34px system-ui"; zawin(g, podglad.tekst, 1460).slice(0, 12).forEach((l, i) => g.fillText(l, 70, 350 + i * 50));
  } else {
    g.fillStyle = "#e3dccd"; for (let i = 0; i < 8; i++) g.fillRect(70, 340 + i * 70, 1460 - (i % 3) * 260, 26);
  }
  return canvasJpg(c);
}
/** Podgląd zawartości: xlsx/csv → tabela (SheetJS), docx → tekst, pptx → tekst slajdów, pdf → tekst 1. strony. */
export async function podgladPliku(file) {
  const t = typPliku(file.name);
  try {
    if (["xlsx", "xls", "ods", "csv"].includes(t)) {
      const XLSX = await zaladujXLSX();
      const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array" });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, blankrows: false });
      return { tabela: rows.filter(r => r.some(v => v !== "" && v != null)), arkusz: wb };
    }
    if (["docx", "pptx"].includes(t)) {
      const zip = await zaladujZip(file);
      const pliki = Object.keys(zip).filter(k => t === "docx" ? k === "word/document.xml" : /^ppt\/slides\/slide\d+\.xml$/.test(k)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      const txt = pliki.map(k => (zip[k].match(/<a:t>([^<]*)<\/a:t>|<w:t[^>]*>([^<]*)<\/w:t>/g) || []).map(x => x.replace(/<[^>]+>/g, "")).join(" ")).join("\n");
      return { tekst: txt.replace(/\s+\n/g, "\n").slice(0, 1500) };
    }
  } catch (e) { console.warn("podgląd pliku", e); }
  return null;
}
let _xlsx = null;
export async function zaladujXLSX() {
  if (_xlsx) return _xlsx;
  await new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"; s.onload = res; s.onerror = () => rej(new Error("Nie udało się wczytać czytnika arkuszy")); document.head.appendChild(s); });
  return (_xlsx = window.XLSX);
}
/** Minimalny czytnik ZIP (tylko pliki XML, kompresja deflate przez DecompressionStream). */
async function zaladujZip(file) {
  const buf = new Uint8Array(await file.arrayBuffer()), dv = new DataView(buf.buffer), out = {};
  let e = buf.length - 22; while (e > 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  let p = dv.getUint32(e + 16, true); const n = dv.getUint16(e + 10, true);
  for (let i = 0; i < n; i++) {
    const met = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(buf.slice(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
    if (!name.endsWith(".xml")) continue;
    const start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true), data = buf.slice(start, start + csize);
    out[name] = met === 0 ? new TextDecoder().decode(data) : await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();
  }
  return out;
}

/* ======================================================================= modele 3D z przepisu */
const deg = a => (a || 0) * Math.PI / 180;
function geometria(c) {
  switch (c.ksztalt) {
    case "szescian": case "prostopadloscian": return new THREE.BoxGeometry(1, 1, 1);
    case "walec": return new THREE.CylinderGeometry(0.5, 0.5, 1, 40);
    case "stozek": return new THREE.ConeGeometry(0.5, 1, 40);
    case "ostroslup": return new THREE.ConeGeometry(0.6, 1, 4);
    case "torus": return new THREE.TorusGeometry(0.5, 0.15, 20, 48);
    case "kapsula": return new THREE.CapsuleGeometry(0.5, 1, 8, 20);
    case "plaszczyzna": return new THREE.PlaneGeometry(1, 1);
    case "rura": {
      const pts = (c.sciezka || [[0, 0, 0], [0, 1, 0]]).map(p => new THREE.Vector3(...p));
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(8, pts.length * 12), c.promien || 0.05, 16, false);
    }
    default: return new THREE.SphereGeometry(0.5, 40, 28);        // kula, elipsoida
  }
}
function etykieta(tekst) {
  const c = document.createElement("canvas"), g = c.getContext("2d"); g.font = "700 64px system-ui";
  c.width = Math.ceil(g.measureText(tekst).width) + 60; c.height = 104;
  g.fillStyle = "rgba(255,253,248,.95)"; g.beginPath(); g.roundRect(0, 0, c.width, c.height, 30); g.fill();
  g.fillStyle = "#1f2a2e"; g.font = "700 64px system-ui"; g.fillText(tekst, 30, 74);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(c.width / c.height * 0.14, 0.14), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
  m.name = "etykieta-" + tekst; return m;
}
export function zbudujZPrzepisu(p) {
  const root = new THREE.Group(); root.name = p.nazwa || "Model"; const obrot = new THREE.Group(); obrot.name = "Obrot"; root.add(obrot);
  for (const [i, c] of (p.czesci || []).entries()) {
    const kol = new THREE.Color(c.kolor || "#cccccc");
    const mat = new THREE.MeshStandardMaterial({ color: kol, roughness: c.metal ? 0.35 : 0.55, metalness: c.metal ? 0.6 : 0, transparent: (c.przezroczystosc || 0) > 0, opacity: 1 - (c.przezroczystosc || 0) });
    const m = new THREE.Mesh(geometria(c), mat); m.name = c.nazwa || "czesc" + i;
    if (c.ksztalt !== "rura") { m.position.set(...(c.pozycja || [0, 0, 0])); m.scale.set(...(c.rozmiar || [1, 1, 1])); m.rotation.set(deg(c.obrot?.[0]), deg(c.obrot?.[1]), deg(c.obrot?.[2])); }
    obrot.add(m);
  }
  for (const e of p.podpisy || []) { const l = etykieta(e.tekst); l.position.set(...e.pozycja); obrot.add(l); }
  const clips = [], a = p.animacja || {}, T = a.okres || 10;
  if (a.typ === "obrot") clips.push(new THREE.AnimationClip("Obrot", T, [new THREE.QuaternionKeyframeTrack("Obrot.quaternion", [0, T / 3, 2 * T / 3, T],
    [0, 1, 2, 3].flatMap(k => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), k * 2 * Math.PI / 3).toArray()))]));
  if (a.typ === "puls") clips.push(new THREE.AnimationClip("Puls", T, [new THREE.VectorKeyframeTrack("Obrot.scale", [0, T / 2, T], [1, 1, 1, 1.08, 1.08, 1.08, 1, 1, 1])]));
  // dopasowanie wielkości (ok. 40 cm) i postawienie na ziemi
  const box = new THREE.Box3().setFromObject(root), s = box.getSize(new THREE.Vector3());
  const k = 0.4 / Math.max(s.x, s.y, s.z, 1e-6); root.scale.setScalar(k); root.position.y = -box.min.y * k;
  const wrap = new THREE.Group(); wrap.add(root);
  return { obiekt: wrap, clips };
}
export async function eksportGLB(obiekt, clips) {
  const ex = new GLTFExporter();
  const r = await ex.parseAsync(obiekt, { binary: true, animations: clips, onlyVisible: true });
  return new Blob([r], { type: "model/gltf-binary" });
}

/* ======================================================================= podgląd 3D */
export function podglad3D(el) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
  r.setPixelRatio(Math.min(2, devicePixelRatio)); el.appendChild(r.domElement);
  const sc = new THREE.Scene(); sc.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
  sc.add(new THREE.HemisphereLight(0xffffff, 0x8a7f70, 0.6)); const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(1, 2, 1.5); sc.add(sun);
  const cam = new THREE.PerspectiveCamera(35, 1, 0.01, 50); const ctl = new OrbitControls(cam, r.domElement); ctl.enableDamping = true; ctl.autoRotate = true; ctl.autoRotateSpeed = 1.2;
  let obj = null, mixer = null, alive = true; const clock = new THREE.Clock();
  const size = () => { const w = el.clientWidth || 300, h = el.clientHeight || 240; r.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  new ResizeObserver(size).observe(el); size();
  (function loop() { if (!alive) return; requestAnimationFrame(loop); const dt = clock.getDelta(); mixer?.update(dt); ctl.update(); r.render(sc, cam); })();
  function pokaz(o, clips = []) {
    if (obj) sc.remove(obj); obj = o; sc.add(o); mixer = new THREE.AnimationMixer(o); clips.forEach(c => mixer.clipAction(c).play());
    const box = new THREE.Box3().setFromObject(o), c = box.getCenter(new THREE.Vector3()), d = box.getSize(new THREE.Vector3()).length();
    ctl.target.copy(c); cam.position.copy(c).add(new THREE.Vector3(0.55, 0.35, 0.8).multiplyScalar(d * 1.15)); cam.near = d / 100; cam.updateProjectionMatrix();
  }
  return {
    pokaz,
    async wczytaj(url) { const g = await new GLTFLoader().loadAsync(await resolveUrl(url)); pokaz(g.scene, g.animations); return g; },
    zniszcz() { alive = false; r.dispose(); r.domElement.remove(); },
  };
}

/* ======================================================================= okno czatu AI */
/**
 * Okno czatu do tworzenia obrazu lub modelu 3D z AI. Zamyka się po „Dodaj do lekcji”.
 * opcje: { b, rodzaj: "obraz"|"model", kontekst, autoPrompt, onDodaj(wynik) }
 *   wynik obrazu: { svg, nazwa }   wynik modelu: { model: elementBiblioteki } | { przepis }
 */
export function oknoCzatuAI({ b, rodzaj, kontekst, autoPrompt, onDodaj }) {
  const el = document.createElement("div"); el.className = "czat-ai";
  const tytul = rodzaj === "obraz" ? "✨ Asystent ilustracji" : "✨ Asystent modeli 3D";
  el.innerHTML = `<div class="czat-tlo"></div><aside class="czat-panel" role="dialog" aria-label="${tytul}">
    <header><div><b>${tytul}</b><div class="small muted">${esc(kontekst.sekcja?.tytul || "")} · ${esc(kontekst.temat || "")}</div></div><button class="btn sm ghost" data-x title="Zamknij">✕</button></header>
    <div class="rama small">🎯 AI trzyma się ramy: <b>${esc(kontekst.przedmiot || "")}${kontekst.klasa ? ", klasa " + esc(kontekst.klasa) : ""}</b> · ${esc(kontekst.rama || "")}</div>
    <div class="wiad"></div>
    <footer><textarea rows="3" placeholder="${rodzaj === "obraz" ? "Opisz ilustrację albo co poprawić, np. „bez podpisów”, „większe napisy”…" : "Opisz model albo co zmienić…"}"></textarea>
      <div class="row" style="justify-content:space-between"><span class="small muted" data-stan></span><button class="btn accent" data-wyslij>Wyślij ↵</button></div></footer></aside>`;
  document.body.appendChild(el);
  const wiad = el.querySelector(".wiad"), ta = el.querySelector("textarea"), stan = el.querySelector("[data-stan]");
  let biezacy = null, viewer = null;
  const zamknij = () => { viewer?.zniszcz(); el.remove(); };
  el.querySelector("[data-x]").onclick = zamknij; el.querySelector(".czat-tlo").onclick = zamknij;
  addEventListener("keydown", function k(e) { if (e.key === "Escape" && document.body.contains(el)) { zamknij(); removeEventListener("keydown", k); } });
  const dodaj = (kto, html) => { const d = document.createElement("div"); d.className = "msg " + kto; d.innerHTML = html; wiad.appendChild(d); wiad.scrollTop = wiad.scrollHeight; return d; };

  async function wyslij(tekst) {
    if (!tekst.trim()) return;
    dodaj("ja", esc(tekst)); ta.value = ""; stan.textContent = "AI pracuje…"; el.querySelector("[data-wyslij]").disabled = true;
    const myk = dodaj("ai", `<span class="kropki"><i></i><i></i><i></i></span>`);
    try {
      const r = await ai(b, rodzaj, { ...kontekst, polecenie: tekst, poprzedni: rodzaj === "obraz" ? biezacy?.svg : biezacy?.przepis ? JSON.stringify(biezacy.przepis) : undefined });
      if (rodzaj === "obraz") {
        const svg0 = r.svg || (r.svgUrl ? await wczytajSvg(r.svgUrl) : null), svg = svg0 && czyscSvg(svg0);
        if (!svg) throw new Error(r.odpowiedz || "AI nie zwróciło obrazu");
        biezacy = { svg, nazwa: r.nazwa || biezacy?.nazwa || kontekst.sekcja?.tytul || "Ilustracja" };
        myk.innerHTML = `${r.pokazowe ? '<span class="tag">AI pokazowe</span> ' : ""}${esc(r.odpowiedz || "Gotowe.")}
          <div class="podglad-obraz"><img alt=""></div>
          <div class="row"><button class="btn accent sm" data-dodaj>✅ Dodaj do lekcji</button><span class="small muted">albo napisz, co poprawić</span></div>`;
        myk.querySelector("img").src = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      } else {
        biezacy = r.model ? { model: r.model } : r.przepis ? { przepis: typeof r.przepis === "string" ? JSON.parse(r.przepis) : r.przepis } : null;
        if (!biezacy) throw new Error(r.odpowiedz || "AI nie zwróciło modelu");
        myk.innerHTML = `${r.pokazowe ? '<span class="tag">AI pokazowe</span> ' : ""}${esc(r.odpowiedz || "Gotowe.")}
          <div class="podglad-3d"></div><div class="row"><button class="btn accent sm" data-dodaj>✅ Dodaj do lekcji</button><span class="small muted">obracaj palcem lub myszą</span></div>`;
        viewer?.zniszcz(); viewer = podglad3D(myk.querySelector(".podglad-3d"));
        if (biezacy.model) await viewer.wczytaj(new URL(biezacy.model.url, location.href).href);
        else { const { obiekt, clips } = zbudujZPrzepisu(biezacy.przepis); viewer.pokaz(obiekt, clips); }
      }
      myk.querySelector("[data-dodaj]").onclick = async e => {
        e.target.disabled = true; e.target.textContent = "Dodaję…";
        try { await onDodaj(biezacy); zamknij(); } catch (err) { e.target.disabled = false; e.target.textContent = "✅ Dodaj do lekcji"; dodaj("ai", "❌ " + esc(err.message)); }
      };
      stan.textContent = "";
    } catch (e) { myk.innerHTML = "❌ " + esc(e.message); stan.textContent = ""; }
    el.querySelector("[data-wyslij]").disabled = false; ta.focus();
  }
  el.querySelector("[data-wyslij]").onclick = () => wyslij(ta.value);
  ta.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); wyslij(ta.value); } };
  dodaj("ai", rodzaj === "obraz"
    ? "Cześć! Przygotowałem opis ilustracji na podstawie tego etapu lekcji. Możesz go zmienić i wysłać – albo od razu kliknąć <b>Wyślij</b>."
    : "Cześć! Przygotowałem opis modelu 3D na podstawie tego etapu lekcji. Zmień go, jeśli chcesz, i kliknij <b>Wyślij</b>.");
  ta.value = autoPrompt || ""; ta.focus(); ta.select();
  return { zamknij, wyslij };
}
