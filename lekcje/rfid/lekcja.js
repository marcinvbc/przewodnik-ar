/* Lekcja „RFID – wprowadzenie” (poziom akademicki, wstęp do laboratorium).
   Lewa strona: scena 3D (obrót/zoom, klik na część = opis). Prawa: treść, symulacje, zadania. */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MODELE, rozloz, MAT, zaokr, materialy } from "./modele.js?v=50";
materialy();
import { symuluj, srednio, CZAS } from "./antykolizja.js?v=50";
import { zglos, obecnosc } from "../przekaznik.js?v=44";

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (x, d = 1) => (+x).toFixed(d).replace(".", ",");

/* ================= scena 3D ================= */
const kont = $("#scena"), r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.toneMapping = THREE.NeutralToneMapping; kont.prepend(r.domElement);
const sc = new THREE.Scene(); sc.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
const sw = new THREE.DirectionalLight("#ffffff", 1.1); sw.position.set(1, 3, 2); sc.add(sw);
const kam = new THREE.PerspectiveCamera(35, 1, 0.001, 200), ster = new OrbitControls(kam, r.domElement); ster.enableDamping = true;
function rozmiar() { const w = kont.clientWidth, h = kont.clientHeight; r.setSize(w, h, false); kam.aspect = w / Math.max(1, h); kam.updateProjectionMatrix(); }
new ResizeObserver(rozmiar).observe(kont); rozmiar();
let akt = null;   // bieżąca scena: { grupa, klatka, sprzataj }
function ustawScene(sc3) {
  if (akt) { sc.remove(akt.grupa); akt.sprzataj?.(); }
  akt = sc3; sc.add(akt.grupa); ster.enabled = true; $("#wskaznik").hidden = true; $("#podpis3d").hidden = !akt.podpis; if (akt.podpis) $("#podpis3d").innerHTML = akt.podpis;
  $("#nakl").innerHTML = ""; (akt.przyciski || []).forEach(p => { const b = document.createElement(p.href ? "a" : "button"); b.className = "btn" + (p.wyb ? " wyb" : ""); b.textContent = p.t; if (p.href) { b.href = p.href; b.style.textDecoration = "none"; } else b.onclick = () => { $$("#nakl .btn").forEach(x => x.classList.toggle("wyb", x === b && !p.bezWyb)); p.f(); }; $("#nakl").append(b); });
  kadruj(akt.kadrObj || akt.grupa, akt.kadr || {});
}
function kadruj(obj, { kier = [0.6, 0.55, 1], odl = 1.15, cel = null } = {}) {
  obj.updateMatrixWorld(true); const bb = new THREE.Box3(); obj.children.length ? obj.children.forEach(o => { if (!o.userData.bezKadru && o.visible) bb.expandByObject(o); }) : bb.setFromObject(obj); if (bb.isEmpty()) bb.setFromObject(obj); const _x = 0, c = cel ? new THREE.Vector3(...cel) : bb.getCenter(new THREE.Vector3()), s = bb.getSize(new THREE.Vector3()).length() || 1;
  const k = new THREE.Vector3(...kier).normalize(); kam.near = s / 200; kam.far = s * 50; kam.updateProjectionMatrix(); kam.position.copy(c).addScaledVector(k, s * odl * 1.6 / Math.tan(THREE.MathUtils.degToRad(kam.fov / 2)) / 2.2); ster.target.copy(c); ster.update();
}
// klik w część modelu → opis
const ray = new THREE.Raycaster(), mysz = new THREE.Vector2(); let dol = null;
r.domElement.addEventListener("pointerdown", e => { dol = { x: e.clientX, y: e.clientY }; akt?.wDol?.(e); });
r.domElement.addEventListener("pointermove", e => akt?.wRuch?.(e));
r.domElement.addEventListener("pointerup", e => { akt?.wGora?.(e); if (!dol || Math.hypot(e.clientX - dol.x, e.clientY - dol.y) > 6) return; const t = trafienie(e); if (akt?.klik?.(t, e)) return; pokazOpis(t, e); });
function trafienie(e) { const b = r.domElement.getBoundingClientRect(); mysz.set((e.clientX - b.left) / b.width * 2 - 1, -(e.clientY - b.top) / b.height * 2 + 1); ray.setFromCamera(mysz, kam); return ray.intersectObject(akt.grupa, true).find(h => h.object.visible && h.object.material?.opacity !== 0); }
function pokazOpis(t, e) {
  const et = $("#etykieta"); let o = t?.object; while (o && !o.userData.opis) o = o.parent;
  if (!o) { et.style.display = "none"; return; }
  const b = kont.getBoundingClientRect(); et.innerHTML = `<b>${esc(o.name)}</b>${esc(o.userData.opis)}`; et.style.display = "block";
  et.style.left = Math.min(b.width - 310, e.clientX - b.left + 12) + "px"; et.style.top = Math.max(8, e.clientY - b.top - 20) + "px"; clearTimeout(pokazOpis.t); pokazOpis.t = setTimeout(() => et.style.display = "none", 6000);
}
const podloga = (rozm, kolor = "#16232f") => { const m = new THREE.Mesh(new THREE.CircleGeometry(rozm, 64), new THREE.MeshStandardMaterial({ color: kolor, roughness: 0.9, transparent: true, opacity: 0.85 })); m.rotation.x = -Math.PI / 2; m.position.y = -0.0005; m.userData.bezKadru = true; return m; };
const ar = (plik, tytul) => ({ t: "📱 Zobacz w AR", href: `model-ar.html?m=${encodeURIComponent("rfid/" + plik)}&t=${encodeURIComponent(tytul)}&wroc=${encodeURIComponent("rfid.html#" + (SEKCJE[idx]?.id || ""))}` });
function wskaznik(html) { const w = $("#wskaznik"); w.hidden = false; w.innerHTML = html; }

/* ---------- znaczniki: świecąca kulka (pakiet danych) ---------- */
const kulka = (kolor, r0) => new THREE.Mesh(new THREE.SphereGeometry(r0, 16, 12), new THREE.MeshBasicMaterial({ color: kolor }));

/* ================= SCENY ================= */
function scenaSystem() {
  const g = new THREE.Group(), cz = MODELE.modulCzytnika(), mcu = MODELE.plytkaMCU(), karta = MODELE.kartaHF();
  mcu.position.set(0.1, 0, 0.005); g.add(cz, mcu, podloga(0.25));
  const laptop = new THREE.Group(); const baza = zaokr(0.16, 0.008, 0.11, 0.006, MAT.plastikSzary); baza.position.y = 0.004; laptop.add(baza);
  const ekr = zaokr(0.16, 0.006, 0.1, 0.005, MAT.plastikCzarny); ekr.rotation.x = -1.25; ekr.position.set(0, 0.052, -0.07); laptop.add(ekr);
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 320; const c2 = cv.getContext("2d"), tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  const ek = new THREE.Mesh(new THREE.PlaneGeometry(0.148, 0.09), new THREE.MeshBasicMaterial({ map: tx })); ek.position.set(0, 0.0035, 0); ekr.add(ek); ek.rotation.x = -Math.PI / 2;
  laptop.position.set(0.27, 0, 0.0); laptop.rotation.y = -0.35; laptop.name = "Komputer / serwer"; laptop.userData.opis = "System nadrzędny (middleware, baza): uprawnienia, stany magazynowe, historia zdarzeń. Z czytnikiem rozmawia przez USB/sieć."; g.add(laptop);
  karta.position.set(0, 0.035, 0); karta.rotation.x = -0.25; g.add(karta);
  // przewody SPI
  const kol = ["#e74c3c", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6", "#ecf0f1"]; kol.forEach((k, i) => { const z = -0.016 + i * 0.0056 * 1.15; const pts = [new THREE.Vector3(0.0275, 0.008, z), new THREE.Vector3(0.05, 0.02, z), new THREE.Vector3(0.075, 0.015, z * 0.5 - 0.01), new THREE.Vector3(0.082 + i * 0.003 * 1.2, 0.007, -0.0112)];
    const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.0007, 6), new THREE.MeshStandardMaterial({ color: k, roughness: 0.5 })); t.name = "Przewody SPI"; t.userData.opis = "Magistrala SPI: SCK, MOSI, MISO, SS + zasilanie 3,3 V i masa. Mikrokontroler wysyła komendy do układu czytnika i odbiera dane z karty."; g.add(t); });
  const sciezka = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.033, 0), new THREE.Vector3(-0.01, 0.006, 0), new THREE.Vector3(0.03, 0.01, 0), new THREE.Vector3(0.08, 0.012, -0.005), new THREE.Vector3(0.12, 0.01, 0), new THREE.Vector3(0.2, 0.03, 0), new THREE.Vector3(0.27, 0.05, -0.05)]);
  const pak = [0, 1, 2].map(() => { const k = kulka("#5ad1ff", 0.0025); g.add(k); return k; });
  let tic = 0, uid = ["04 A2 3B 1C", "04 7F 10 9E", "04 A2 3B 1C"], ost = [];
  const rysujEkran = () => { c2.fillStyle = "#0e2233"; c2.fillRect(0, 0, 512, 320); c2.fillStyle = "#7fd3ff"; c2.font = "bold 28px sans-serif"; c2.fillText("Kontrola dostępu – zdarzenia", 20, 44); c2.font = "22px monospace"; ost.slice(-6).forEach((l, i) => { c2.fillStyle = l.includes("ODMOWA") ? "#ff8a80" : "#b8f5c8"; c2.fillText(l, 20, 90 + i * 36); }); tx.needsUpdate = true; };
  rysujEkran();
  return { grupa: g, kadr: { kier: [0.15, 0.7, 1], odl: 0.8, cel: [0.12, 0.02, 0] }, podpis: "Kliknij element, by zobaczyć opis. Obracaj i przybliżaj scenę.",
    przyciski: [ar("modulCzytnika.glb", "Moduł czytnika 13,56 MHz")],
    klatka(dt, t) { karta.position.y = 0.03 + Math.sin(t * 1.2) * 0.008; pak.forEach((p, i) => { const u = ((t * 0.35 + i * 0.33) % 1); p.position.copy(sciezka.getPoint(u)); p.visible = karta.position.y < 0.036; });
      if (karta.position.y < 0.0235 && t - tic > 2.5) { tic = t; const u = uid[ost.length % 3], ok = u !== "04 7F 10 9E"; ost.push(`${new Date().toLocaleTimeString("pl-PL")}  ${u}  ${ok ? "WEJŚCIE" : "ODMOWA"}`); rysujEkran(); } } };
}

/* ---------- 2. zasada działania: HF (indukcja) / UHF (backscatter) ---------- */
let trybZasady = "HF", hKarty = 0.03, dTagu = 4, czulosc = -20;
function scenaZasada() {
  const g = new THREE.Group(); let klatka;
  if (trybZasady === "HF") {
    const cz = MODELE.modulCzytnika(), karta = MODELE.kartaHF(); g.add(cz, karta, podloga(0.2));
    const cx = -0.009;   // środek anteny modułu
    const linie = []; for (const kat of [0, Math.PI / 3, 2 * Math.PI / 3]) for (const rr of [0.006, 0.012, 0.02, 0.03, 0.042]) { const pts = []; for (let i = 0; i <= 80; i++) { const th = i / 80 * Math.PI * 2, x = 0.02 + rr * Math.cos(th), y = rr * 1.25 * Math.sin(th); pts.push(new THREE.Vector3(cx + x * Math.cos(kat), y + 0.001, x * Math.sin(kat))); pts.push(); }
      for (const zn of [1, -1]) { const geo = new THREE.BufferGeometry().setFromPoints(pts.filter(Boolean).map(p => new THREE.Vector3(cx + (p.x - cx) * zn, p.y, p.z * zn))); const l = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: "#5ad1ff", dashSize: 0.004, gapSize: 0.003, transparent: true, opacity: 0.0 })); l.computeLineDistances(); l.userData.r = rr; g.add(l); linie.push(l); } }
    const krzywa = karta.getObjectByName("Antena – cewka").userData.krzywa, prady = Array.from({ length: 24 }, () => { const k = kulka("#ffd166", 0.0007); karta.add(k); return k; });
    const chip = karta.getObjectByName("Chip (układ scalony)"), swiatlo = kulka("#ffd166", 0.003); swiatlo.material.transparent = true; chip.add(swiatlo); swiatlo.position.y = 0.0006;
    const a = 0.022, Umin = 0.09;
    klatka = (dt, t) => {
      karta.position.set(cx, hKarty, 0); const U = (a * a / (a * a + hKarty * hKarty)) ** 1.5, zas = U >= Umin;
      linie.forEach(l => { l.material.opacity = 0.25 + 0.5 * Math.abs(Math.sin(t * 6)); l.material.dashOffset = -t * 0.01 * (l.userData.r * 40); });
      prady.forEach((k, i) => { k.visible = zas; if (zas) k.position.copy(krzywa.getPoint(((i / prady.length) + t * 0.08 * (U / Umin > 3 ? 1.6 : 1)) % 1)); });
      const odp = zas && (t % 2) > 1.2; swiatlo.material.opacity = zas ? (odp ? 0.95 : 0.5) : 0; swiatlo.scale.setScalar(odp ? 1.5 : 1);
      wskaznik(`HF 13,56 MHz · odległość <b>${fmt(hKarty * 100)} cm</b><div style="font-weight:400;font-size:12px;margin-top:4px">Napięcie indukowane (wzgl.)</div><div class="pas"><i style="width:${Math.min(100, U / 0.4 * 100)}%;background:${zas ? "var(--ok)" : "var(--zle)"}"></i></div><div style="margin-top:4px">${zas ? (odp ? "✅ chip zasilony · odpowiada (modulacja obciążenia)" : "✅ chip zasilony") : "❌ za słabe pole – chip nie startuje"}</div>`);
      rysujOsc(t, zas ? (odp ? "odp" : "cw") : "brak", "HF");
    };
    return { grupa: g, kadr: { kier: [0.9, 0.7, 1], odl: 0.75 }, klatka, podpis: "Linie pola magnetycznego czytnika (niebieskie) obejmują cewkę karty – indukuje się w niej prąd (żółte punkty).",
      przyciski: [{ t: "HF – indukcja", wyb: true, f: () => { trybZasady = "HF"; pokazSekcje(idx); } }, { t: "UHF – backscatter", f: () => { trybZasady = "UHF"; pokazSekcje(idx); } }] };
  }
  // UHF
  const ant = MODELE.antenaUHF(); ant.rotation.y = Math.PI / 2; ant.position.set(0, 1, 0); g.add(ant);
  const tag = MODELE.tagUHF(); tag.scale.setScalar(5); tag.rotation.set(0, Math.PI / 2, Math.PI / 2); g.add(tag);
  const pod = new THREE.Mesh(new THREE.PlaneGeometry(16, 3), new THREE.MeshStandardMaterial({ color: "#16232f", roughness: 0.95 })); pod.rotation.x = -Math.PI / 2; pod.position.x = 7.5; g.add(pod);
  for (let m = 1; m <= 15; m++) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.002, m % 5 ? 0.2 : 0.5), new THREE.MeshBasicMaterial({ color: "#5d7489" })); k.position.set(m, 0.002, 0); g.add(k); }
  const fale = Array.from({ length: 10 }, (_, i) => { const m = new THREE.Mesh(new THREE.RingGeometry(0.98, 1, 64), new THREE.MeshBasicMaterial({ color: "#5ad1ff", transparent: true, side: THREE.DoubleSide, depthWrite: false })); m.rotation.y = Math.PI / 2; m.userData.f = i / 10; m.userData.bezKadru = true; g.add(m); return m; });
  const odb = Array.from({ length: 6 }, (_, i) => { const m = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 48), new THREE.MeshBasicMaterial({ color: "#ffb02e", transparent: true, side: THREE.DoubleSide, depthWrite: false })); m.rotation.y = Math.PI / 2; m.userData.f = i / 6; m.userData.bezKadru = true; g.add(m); return m; });
  const lam = 3e8 / 866.5e6, EIRP = 35.15, Gt = 2;
  klatka = (dt, t) => {
    tag.position.set(dTagu, 1, 0); const fspl = 20 * Math.log10(4 * Math.PI * dTagu / lam), P = EIRP + Gt - fspl, zas = P >= czulosc;
    fale.forEach(m => { const u = (m.userData.f + t * 0.25) % 1, x = u * 15.5; m.position.set(x + 0.1, 1, 0); const rr = 0.15 + x * 0.42; m.scale.setScalar(rr); m.material.opacity = 0.55 * (1 - u) * (x < dTagu + 0.2 ? 1 : 0.35); });
    odb.forEach((m, i) => { const u = (m.userData.f + t * 0.35) % 1, x = dTagu - u * dTagu; m.position.set(x, 1, 0); m.scale.setScalar(0.08 + u * dTagu * 0.18); const bit = Math.floor(t * 3 + i) % 2; m.material.opacity = zas ? (bit ? 0.75 : 0.3) * (1 - u * 0.6) : 0; });
    wskaznik(`UHF ${fmt(866.5, 1)} MHz · λ = ${fmt(lam * 100)} cm<br>odległość <b>${fmt(dTagu)} m</b><div style="font-weight:400;font-size:12px;margin-top:4px">Moc docierająca do tagu: <b>${fmt(P)} dBm</b> (próg chipu ${czulosc} dBm)</div><div class="pas"><i style="width:${Math.max(0, Math.min(100, (P + 35) / 35 * 100))}%;background:${zas ? "var(--ok)" : "var(--zle)"}"></i></div><div style="margin-top:4px">${zas ? "✅ tag zasilony · odbija falę (backscatter)" : "❌ za mało mocy – tag milczy"}</div>`);
    rysujOsc(t, zas ? "odpU" : "cwU", "UHF");
  };
  return { grupa: g, kadr: { kier: [0.25, 0.55, 1], odl: 0.55, cel: [6, 0.8, 0] }, klatka, podpis: "Fala z anteny (niebieska) zasila tag; tag odbija jej część, przełączając impedancję anteny (pomarańczowe). Tag powiększony ×5.",
    przyciski: [{ t: "HF – indukcja", f: () => { trybZasady = "HF"; pokazSekcje(idx); } }, { t: "UHF – backscatter", wyb: true, f: () => { trybZasady = "UHF"; pokazSekcje(idx); } }] };
}
function rysujOsc(t, stan, pasmo) {
  const cv = $("#osc"); if (!cv) return; const w = cv.width = cv.clientWidth * 2, h = cv.height = 240, g = cv.getContext("2d"); g.clearRect(0, 0, w, h);
  g.strokeStyle = "#1e3a4f"; g.lineWidth = 1; for (let x = 0; x < w; x += w / 10) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  g.strokeStyle = "#5ad1ff"; g.lineWidth = 2; g.beginPath();
  const okres = 3, faza = (t % okres) / okres;
  for (let x = 0; x < w; x++) {
    const u = (x / w + faza) % 1; let amp = stan === "brak" ? 0.9 : 0.9;
    // zapytanie czytnika: krótkie przerwy nośnej (ASK)
    if (u < 0.3 && stan !== "brak") { const bit = Math.floor(u / 0.3 * 12); if ([1, 3, 4, 7, 9, 10].includes(bit) && (u / 0.3 * 12) % 1 < (pasmo === "HF" ? 0.25 : 0.35)) amp = pasmo === "HF" ? 0.05 : 0.15; }
    // odpowiedź tagu: drobna zmiana amplitudy (podnośna 847,5 kHz w HF / FM0 w UHF)
    if (u > 0.45 && u < 0.9 && (stan === "odp" || stan === "odpU")) { const k = (u - 0.45) / 0.45; amp += (Math.floor(k * (pasmo === "HF" ? 48 : 16)) % 2 ? 0.07 : -0.07) * (Math.floor(k * 8) % 3 ? 1 : 0.2); }
    const y = h / 2 - Math.sin(x * 1.3) * amp * h * 0.42; x ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke(); g.fillStyle = "#cfe3f5"; g.font = "20px system-ui"; g.fillText("zapytanie czytnika (ASK)", 8, 24); g.fillText(stan === "odp" || stan === "odpU" ? "odpowiedź tagu (modulacja obciążenia / backscatter)" : stan === "brak" ? "tag poza zasięgiem – brak odpowiedzi" : "nośna – tag zasilany", w * 0.42, 24);
}

/* ---------- 3. budowa tagów ---------- */
let modelBudowy = "kartaHF", rozlozenie = 0, celRozl = 0;
const BUDOWA = { kartaHF: ["Karta HF (13,56 MHz)", "kartaHF.glb"], tagUHF: ["Inlay UHF (EPC Gen2)", "tagUHF.glb"], kapsulaLF: ["Kapsułka LF 134,2 kHz", "kapsulaLF.glb"], modulCzytnika: ["Moduł czytnika HF", "modulCzytnika.glb"] };
function scenaBudowa() {
  const g = new THREE.Group(), m = MODELE[modelBudowy](); g.add(m); rozlozenie = 0; celRozl = 0.85;
  const bb = new THREE.Box3().setFromObject(m), s = bb.getSize(new THREE.Vector3()).length(); const pd = podloga(s * 0.9); pd.position.y = bb.min.y - s * 0.02; g.add(pd);
  return { grupa: g, kadrObj: m, kadr: { kier: [0.5, 0.9, 1], odl: modelBudowy === "kapsulaLF" ? 0.75 : 0.95 }, podpis: "Model rozkłada się na warstwy. Kliknij część, by przeczytać, do czego służy.",
    klatka(dt) { rozlozenie += (celRozl - rozlozenie) * Math.min(1, dt * 3); rozloz(m, rozlozenie); },
    przyciski: [...Object.entries(BUDOWA).map(([k, [n]]) => ({ t: n, wyb: k === modelBudowy, f: () => { modelBudowy = k; pokazSekcje(idx); } })), { t: "⇕ Złóż / rozłóż", bezWyb: true, f: () => celRozl = celRozl > 0.5 ? 0 : 0.85 }, ar(BUDOWA[modelBudowy][1], BUDOWA[modelBudowy][0])] };
}

/* ---------- 4. pasma – tory zasięgu w skali logarytmicznej ---------- */
const PASMA = [
  { id: "LF", nazwa: "LF 125/134,2 kHz", zasieg: 0.1, kolor: "#9b59b6", model: "kapsulaLF", przyklad: "zwierzęta, immobilizery, starsze karty dostępu" },
  { id: "NFC", nazwa: "HF 13,56 MHz – ISO 14443 / NFC", zasieg: 0.08, kolor: "#2a78d6", model: "kartaHF", przyklad: "karty płatnicze, bilety, legitymacje, paszporty, NFC w telefonie" },
  { id: "15693", nazwa: "HF 13,56 MHz – ISO 15693", zasieg: 1.0, kolor: "#1fa3b8", model: "kartaHF", przyklad: "biblioteki, etykiety na pojemnikach, narty" },
  { id: "UHF", nazwa: "UHF 865–868 MHz – EPC Gen2", zasieg: 10, kolor: "#e67e22", model: "tagUHF", przyklad: "logistyka, magazyny, odzież, pomiar czasu w zawodach" },
];
let wyrozniony = null;
function scenaPasma() {
  const g = new THREE.Group(), X = m => (Math.log10(m) + 2) * 0.5;   // 1 cm → 0, 10 m → 1,5
  const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 128; const c = cv.getContext("2d"); c.fillStyle = "#0d1a24"; c.fillRect(0, 0, 1024, 128); c.strokeStyle = "#5d7489"; c.fillStyle = "#cfe3f5"; c.font = "bold 30px system-ui";
  for (const [m, t] of [[0.01, "1 cm"], [0.1, "10 cm"], [1, "1 m"], [10, "10 m"]]) { const x = X(m) / 1.6 * 1024 + 30; c.fillRect(x - 2, 0, 4, 60); c.fillText(t, x - 30, 105); }
  for (let d = -2; d < 1; d++) for (let k = 2; k < 10; k++) { const x = X(k * 10 ** d) / 1.6 * 1024 + 30; c.fillRect(x - 1, 0, 2, 26); }
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; const linijka = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.2), new THREE.MeshBasicMaterial({ map: tx })); linijka.rotation.x = -Math.PI / 2; linijka.position.set(0.8 - 0.03 * 1.6 / 1024 * 0, 0, 0.55); g.add(linijka);
  const tory = PASMA.map((p, i) => { const z = -0.45 + i * 0.25, dl = X(p.zasieg) + 0.03 * 1.6, tor = new THREE.Mesh(new THREE.BoxGeometry(dl, 0.03, 0.12), new THREE.MeshStandardMaterial({ color: p.kolor, roughness: 0.4, transparent: true, opacity: 0.85 })); tor.position.set(dl / 2, 0.015, z); tor.name = p.nazwa; tor.userData.opis = `Typowy zasięg ok. ${p.zasieg >= 1 ? fmt(p.zasieg, 0) + " m" : fmt(p.zasieg * 100, 0) + " cm"}. Zastosowania: ${p.przyklad}.`; g.add(tor);
    const m = MODELE[p.model](); const bb = new THREE.Box3().setFromObject(m), s = bb.getSize(new THREE.Vector3()), sk = 0.1 / Math.max(s.x, s.z); m.scale.setScalar(sk); m.position.set(-0.09, 0.03 - bb.min.y * sk, z); if (p.model === "kapsulaLF") m.rotation.y = 0.3; g.add(m);
    return tor; });
  return { grupa: g, kadr: { kier: [0.05, 1.2, 1], odl: 0.6, cel: [0.7, 0, 0] }, podpis: "Zasięg odczytu w skali logarytmicznej – każdy krok podziałki to ×10. Kliknij tor.",
    klatka(dt, t) { tory.forEach((tor, i) => { const w = wyrozniony === PASMA[i].id; tor.material.emissive?.set(w ? PASMA[i].kolor : "#000"); tor.material.emissiveIntensity = w ? 0.6 + 0.4 * Math.sin(t * 5) : 0; tor.scale.y = w ? 1.6 : 1; }); } };
}

/* ---------- 5. antykolizja – bramka z paletą ---------- */
let simStan = null;
function scenaAntykolizja() {
  const g = new THREE.Group(), br = MODELE.bramkaUHF(), pal = MODELE.paleta(12); pal.position.set(0, 0, 0); g.add(br, pal, podloga(3.2));
  const kart = pal.userData.kartony; kart.forEach(k => { k.material = k.material.clone(); });
  return { grupa: g, kadr: { kier: [0.7, 0.45, 1], odl: 0.9 }, podpis: "12 kartonów = 12 tagów na palecie w bramce. Zielony – odczytany, czerwony błysk – kolizja.",
    przyciski: [ar("bramkaUHF.glb", "Bramka UHF z paletą")],
    klatka(dt, t) { if (!simStan) { kart.forEach(k => k.material.emissive.set("#000")); return; } const s = simStan; kart.forEach((k, i) => { const stan = s.odczytane.has(i) ? "ok" : s.kolizja.has(i) ? "kol" : ""; k.material.emissive.set(stan === "ok" ? "#1fa45a" : stan === "kol" ? "#d93a2b" : "#000"); k.material.emissiveIntensity = stan === "ok" ? 0.55 : stan === "kol" ? 0.9 : 0; }); } };
}

/* ---------- 6. bramki: dostęp (HF) i portal (UHF) ---------- */
let trybBramki = "dostep";
const KARTY = [{ uid: "04 A2 3B 1C 5D 80", kto: "Anna K. (studentka)", lista: true }, { uid: "04 7F 10 9E 22 31", kto: "Gość – karta nieznana", lista: false }, { uid: "04 18 C3 77 0A 9B", kto: "Karta zgłoszona jako zgubiona", lista: false, zablok: true }];
const wSrodku = new Set(); let logBr = [];
function scenaBramki() {
  const g = new THREE.Group();
  if (trybBramki === "dostep") {
    const b = MODELE.bramkaDostepu(), karta = MODELE.kartaHF(); karta.scale.setScalar(1); karta.visible = false; g.add(b, karta, podloga(1.6));
    let anim = null, otw = 0;
    const czytWe = b.getObjectByName("Czytnik kart 13,56 MHz"), czytWy = b.getObjectByName("Czytnik wyjściowy");
    g.userData.przyloz = (karta0, strona) => {
      const cz = strona === "we" ? czytWe : czytWy, p = cz.getWorldPosition(new THREE.Vector3());
      const wch = strona === "we"; let decyzja, powod;
      if (!karta0.lista) { decyzja = false; powod = karta0.zablok ? "karta zablokowana" : "brak na liście uprawnień"; }
      else if (wch && wSrodku.has(karta0.uid)) { decyzja = false; powod = "anti-passback: karta już jest w środku"; }
      else if (!wch && !wSrodku.has(karta0.uid)) { decyzja = false; powod = "anti-passback: brak zarejestrowanego wejścia"; }
      else { decyzja = true; powod = wch ? "WEJŚCIE" : "WYJŚCIE"; if (wch) wSrodku.add(karta0.uid); else wSrodku.delete(karta0.uid); }
      anim = { t: 0, p, decyzja, cz }; karta.visible = true;
      logBr.push(`${new Date().toLocaleTimeString("pl-PL")}  ${strona === "we" ? "WE" : "WY"}  ${karta0.uid}  ${decyzja ? "OK " + powod : "ODMOWA – " + powod}`); odswiezLog();
    };
    return { grupa: g, kadr: { kier: [0.9, 0.75, 1], odl: 1.15 }, podpis: "Bramka dostępu: czytnik wejściowy i wyjściowy, skrzydła otwierane po pozytywnej decyzji systemu.",
      przyciski: [{ t: "Bramka dostępu (HF)", wyb: true, f: () => { trybBramki = "dostep"; pokazSekcje(idx); } }, { t: "Portal UHF – kierunek", f: () => { trybBramki = "portal"; pokazSekcje(idx); } }, ar("bramkaDostepu.glb", "Bramka dostępu")],
      klatka(dt) {
        if (anim) { anim.t += dt; const k = Math.min(1, anim.t / 0.8), cel = anim.p.clone().add(new THREE.Vector3(0, 0.03, 0)), start = anim.p.clone().add(new THREE.Vector3(0.25, 0.35, 0.3));
          karta.position.lerpVectors(start, cel, k * k * (3 - 2 * k)); karta.rotation.set(0, 0.4, 0);
          const plyta = anim.cz.children[0]; plyta.material = anim.t > 0.8 ? (anim.decyzja ? MAT.led : MAT.ledCzerw) : MAT.plastikCzarny;
          if (anim.decyzja && anim.t > 0.9) otw = Math.min(1, otw + dt * 2.5); if (anim.t > 3.2) { otw = Math.max(0, otw - dt * 2.5); if (otw === 0 && anim.t > 3.8) { plyta.material = MAT.plastikCzarny; karta.visible = false; anim = null; } } }
        else otw = Math.max(0, otw - dt * 2.5);
        b.userData.otworz(otw);
      } };
  }
  // portal UHF – kierunek przejazdu z kolejności odczytów stref A i B
  const br = MODELE.bramkaUHF(), pal = MODELE.paleta(12); g.add(br, pal, podloga(4));
  br.children.filter(o => /^Antena A/.test(o.name)).forEach(a => a.rotation.y += -0.6); br.children.filter(o => /^Antena B/.test(o.name)).forEach(a => a.rotation.y += -0.6);
  const strefy = [["A", -1, "#5ad1ff"], ["B", 1, "#ffb02e"]].map(([n, z, k]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.01, 1.4), new THREE.MeshBasicMaterial({ color: k, transparent: true, opacity: 0.16, depthWrite: false })); m.position.set(0, 0.006, z * 0.8); m.name = "Strefa " + n; m.userData.opis = n === "A" ? "Strefa A – strona magazynu. Pierwsze odczyty tu, potem w B → paleta wyjeżdża na rampę." : "Strefa B – strona rampy. Pierwsze odczyty tu, potem w A → paleta wjeżdża do magazynu."; g.add(m); return m; });
  let ruch = null; const zlicz = { A: new Set(), B: new Set() };
  g.userData.jedz = kier => { ruch = { z: kier > 0 ? -3.2 : 3.2, kier, t: 0, pierwsze: {} }; zlicz.A.clear(); zlicz.B.clear(); logBr.push(`— przejazd ${kier > 0 ? "magazyn → rampa" : "rampa → magazyn"} (czytnik nie zna kierunku, liczy go z odczytów)`); odswiezLog(); };
  return { grupa: g, kadr: { kier: [1, 0.6, 0.4], odl: 0.9 }, podpis: "Dwie pary anten skierowane w przeciwne strony tworzą strefy A i B. Kierunek = która strefa odczytała tagi pierwsza.",
    przyciski: [{ t: "Bramka dostępu (HF)", f: () => { trybBramki = "dostep"; pokazSekcje(idx); } }, { t: "Portal UHF – kierunek", wyb: true, f: () => { trybBramki = "portal"; pokazSekcje(idx); } }],
    klatka(dt, t) {
      strefy.forEach(s => s.material.opacity = 0.12 + 0.06 * Math.sin(t * 4));
      if (!ruch) return; ruch.t += dt; ruch.z += ruch.kier * dt * 1.1; pal.position.z = ruch.z;
      pal.userData.kartony.forEach((k, i) => { const z = ruch.z + k.position.z; for (const [n, z0, z1] of [["A", -1.9, 0.25], ["B", -0.25, 1.9]]) if (z > z0 && z < z1 && Math.random() < dt * 6 && !zlicz[n].has(i)) { zlicz[n].add(i); if (!ruch.pierwsze[n]) ruch.pierwsze[n] = ruch.t;
        logBr.push(`${fmt(ruch.t, 2).padStart(5)} s  antena ${n}${1 + (i % 2)}  EPC 3034…${(4100 + i).toString(16).toUpperCase()}  RSSI ${-48 - Math.round(Math.abs(z - (n === "A" ? -0.8 : 0.8)) * 12)} dBm`); odswiezLog(); } });
      if (Math.abs(ruch.z) > 3.3) { const a = ruch.pierwsze.A ?? 1e9, b = ruch.pierwsze.B ?? 1e9; logBr.push(`➜ wniosek: ${a < b ? "A przed B → WYJAZD na rampę" : "B przed A → WJAZD do magazynu"} (odczytano ${zlicz.A.size}/12 w A, ${zlicz.B.size}/12 w B)`); odswiezLog(); ruch = null; }
    } };
}
function odswiezLog() { const el = $("#logBr"); if (el) { el.textContent = logBr.slice(-40).join("\n"); el.scrollTop = 1e9; } }

/* ---------- 7. bezpieczeństwo – karta w etui ekranującym ---------- */
let etui = false;
function scenaBezp() {
  const g = new THREE.Group(), cz = MODELE.modulCzytnika(), karta = MODELE.kartaHF(); karta.position.set(-0.009, 0.025, 0); g.add(cz, karta, podloga(0.18));
  const ek = zaokr(0.092, 0.004, 0.06, 0.004, new THREE.MeshStandardMaterial({ color: "#9aa3ab", metalness: 1, roughness: 0.45, transparent: true, opacity: 0.9 })); ek.position.copy(karta.position); ek.name = "Etui ekranujące"; ek.userData.opis = "Metalowa folia (klatka Faradaya) tłumi pole 13,56 MHz – karta nie dostanie energii, więc nie odpowie."; g.add(ek);
  const chip = karta.getObjectByName("Chip (układ scalony)"), sw = kulka("#ffd166", 0.003); sw.material.transparent = true; chip.add(sw); sw.position.y = 0.0006;
  return { grupa: g, kadr: { kier: [0.9, 0.8, 1], odl: 0.7 }, podpis: "Etui ekranujące: pole czytnika nie dociera do anteny karty.",
    przyciski: [{ t: "🛡 Etui: włóż / wyjmij", bezWyb: true, f: () => etui = !etui }],
    klatka(dt, t) { ek.visible = etui; sw.material.opacity = etui ? 0 : 0.5 + 0.4 * Math.sin(t * 6); } };
}

/* ---------- 8. zadania – regał do inwentaryzacji ---------- */
let inw = null;
function scenaZadania() {
  const g = new THREE.Group(); const reg = new THREE.Group(); g.add(reg, podloga(3));
  for (let p = 0; p < 4; p++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.03, 0.5), MAT.stal); pl.position.set(0, 0.1 + p * 0.55, 0); reg.add(pl); }
  for (const x of [-1.6, 1.6]) for (const z of [-0.24, 0.24]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.8, 0.04), MAT.stal); s.position.set(x, 0.9, z); reg.add(s); }
  const kart = []; for (let p = 0; p < 3; p++) for (let i = 0; i < 8; i++) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.34), MAT.karton.clone()); k.position.set(-1.38 + i * 0.395, 0.1 + p * 0.55 + 0.165, 0.02); const et = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.06), MAT.etykieta); et.position.z = 0.171; k.add(et); k.userData.idx = kart.length; reg.add(k); kart.push(k); }
  const czyt = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.012, 8, 64), new THREE.MeshBasicMaterial({ color: "#5ad1ff", transparent: true, opacity: 0.7 })); czyt.visible = false; g.add(czyt);
  const plaszcz = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.25); let wciska = false;
  const sc3 = { grupa: g, kadr: { kier: [0, 0.25, 1], odl: 0.8 }, podpis: "Zadanie 1: regał z 24 kartonami. Kod kreskowy – klikaj każdą etykietę. RFID – przytrzymaj i przesuwaj czytnik wzdłuż regału.",
    klik(t) { if (!inw || inw.tryb !== "kod" || !t) return true; let o = t.object; while (o && o.userData.idx === undefined) o = o.parent; if (o) odczytaj(o.userData.idx); return true; },
    wDol(e) { if (inw?.tryb === "rfid") { wciska = true; ster.enabled = false; sc3.wRuch(e); } },
    wRuch(e) { if (!wciska || inw?.tryb !== "rfid") return; const b = r.domElement.getBoundingClientRect(); mysz.set((e.clientX - b.left) / b.width * 2 - 1, -(e.clientY - b.top) / b.height * 2 + 1); ray.setFromCamera(mysz, kam); const p = new THREE.Vector3(); if (ray.ray.intersectPlane(plaszcz, p)) { czyt.position.copy(p); czyt.visible = true; } },
    wGora() { wciska = false; czyt.visible = false; },
    klatka(dt, t) {
      kart.forEach((k, i) => { const ok = inw?.odczyt.has(i); k.material.color.set(ok ? "#7be39b" : "#ffffff"); k.material.emissive.set(ok ? "#0d7a3a" : "#000"); k.material.emissiveIntensity = ok ? 0.35 : 0; });
      if (inw?.tryb === "rfid" && czyt.visible) { inw.kolejka += dt; while (inw.kolejka > 0.045) { inw.kolejka -= 0.045; const w = kart.filter((k, i) => !inw.odczyt.has(i) && k.position.distanceTo(czyt.position) < 0.75); if (w.length) odczytaj(w[Math.floor(Math.random() * w.length)].userData.idx); } }
      if (inw?.start && !inw.koniec) $("#inwCzas") && ($("#inwCzas").textContent = fmt((performance.now() - inw.start) / 1000) + " s");
    } };
  function odczytaj(i) { if (!inw || inw.koniec || inw.odczyt.has(i)) return; if (!inw.start) inw.start = performance.now(); inw.odczyt.add(i); $("#inwIle").textContent = `${inw.odczyt.size}/24`; if (inw.odczyt.size === 24) { inw.koniec = performance.now(); const s = (inw.koniec - inw.start) / 1000; wyniki.inw[inw.tryb] = s; zapiszWyniki(); rysujInw(); } }
  return sc3;
}

/* ================= TREŚCI ================= */
const wyniki = (() => { try { return JSON.parse(localStorage.getItem("rfid-wyniki-v1")) || { inw: {}, pasma: null, q: null, log: null, nfc: [] }; } catch { return { inw: {}, pasma: null, q: null, log: null, nfc: [] }; } })();
const zapiszWyniki = () => { try { localStorage.setItem("rfid-wyniki-v1", JSON.stringify(wyniki)); } catch {} };

const SEKCJE = [
  { id: "system", tytul: "1. System RFID", scena: scenaSystem, html: `
    <h2>Czym jest system RFID?</h2>
    <p><b>RFID</b> (<i>Radio-Frequency Identification</i>) to automatyczna identyfikacja obiektów falami radiowymi – bez kontaktu i bez linii wzroku. Każdy system ma cztery warstwy:</p>
    <ul><li><b>Tag (transponder)</b> – antena + chip z identyfikatorem; pasywny (zasilany polem czytnika), półpasywny lub aktywny (z baterią).</li>
    <li><b>Czytnik</b> – nadajnik i odbiornik RF, który zasila tag, wysyła komendy i demoduluje odpowiedź.</li>
    <li><b>Antena czytnika</b> – kształtuje pole (cewka w HF/LF, antena panelowa w UHF).</li>
    <li><b>Host / middleware</b> – mikrokontroler lub serwer: filtruje odczyty, podejmuje decyzje (wpuścić? zaksięgować?), zapisuje zdarzenia.</li></ul>
    <div class="ramka"><b>RFID vs kod kreskowy</b><table class="t"><tr><th></th><th>Kod kreskowy</th><th>RFID</th></tr>
    <tr><td>Linia wzroku</td><td>wymagana</td><td>niewymagana</td></tr><tr><td>Odczyt wielu naraz</td><td>nie</td><td>tak (antykolizja)</td></tr><tr><td>Zapis danych</td><td>nie</td><td>tak (pamięć tagu)</td></tr><tr><td>Identyfikacja</td><td>typ produktu</td><td>konkretny egzemplarz</td></tr><tr><td>Koszt nośnika</td><td>prawie zero</td><td>od kilku groszy (UHF) do kilku zł (karty)</td></tr></table></div>
    <div class="lab"><b>🔧 W laboratorium</b> zbudujecie właśnie taki łańcuch: karta → moduł czytnika 13,56 MHz → mikrokontroler (SPI) → serwer z listą uprawnień. Na scenie obok widać wszystkie elementy.</div>` },
  { id: "zasada", tytul: "2. Zasada działania", scena: scenaZasada, html: () => `
    <h2>Jak tag bez baterii odpowiada?</h2>
    <p>O sposobie sprzężenia decyduje stosunek odległości do długości fali. Granica pola bliskiego to ok. <span class="wzor">r ≈ λ / 2π</span>.</p>
    <div class="karty"><div class="ramka"><b>HF 13,56 MHz – sprzężenie indukcyjne</b><br>λ ≈ 22,1 m → λ/2π ≈ 3,5 m. Karta pracuje głęboko w polu bliskim: czytnik i tag to <b>transformator powietrzny</b>. Pole magnetyczne na osi cewki maleje jak <span class="wzor">B ∝ a² / (a² + z²)^3/2</span>, czyli ~1/z³. Tag odpowiada <b>modulacją obciążenia</b> (podnośna 847,5 kHz w ISO 14443).</div>
    <div class="ramka"><b>UHF 865–868 MHz – backscatter</b><br>λ ≈ 34,6 cm → λ/2π ≈ 5,5 cm. Tag jest w polu dalekim: odbiera falę EM i <b>odbija jej część</b>, przełączając impedancję anteny. Moc maleje jak 1/d² (wzór Friisa), stąd zasięg rzędu metrów.</div></div>
    <div class="rzad">${trybZasady === "HF" ? `<label class="suw">Odległość karty od czytnika: <b id="vH">${fmt(hKarty * 100)} cm</b><input type="range" id="sH" min="0.5" max="12" step="0.1" value="${hKarty * 100}"></label>`
      : `<label class="suw">Odległość tagu: <b id="vD">${fmt(dTagu)} m</b><input type="range" id="sD" min="0.5" max="15" step="0.1" value="${dTagu}"></label><label class="suw">Czułość chipu: <b id="vC">${czulosc} dBm</b><input type="range" id="sC" min="-24" max="-14" step="0.5" value="${czulosc}"></label>`}</div>
    <canvas class="osc" id="osc"></canvas>
    <p class="male" style="font-size:12.5px;color:var(--t2)">Obwiednia sygnału na antenie czytnika (schemat, czasy nie w skali): przerwy nośnej to komenda czytnika (ASK), drobne zmiany amplitudy – odpowiedź tagu.</p>
    ${trybZasady === "UHF" ? `<div class="ramka"><b>Bilans łącza w przód (zasilenie tagu)</b><br><span class="wzor">P<sub>tag</sub> = EIRP + G<sub>tag</sub> − FSPL</span>, <span class="wzor">FSPL = 20·log₁₀(4πd/λ)</span><br>W UE czytnik nadaje do 2 W ERP (≈ 35,1 dBm EIRP) w 4 kanałach 865,7 / 866,3 / 866,9 / 867,5 MHz. Teoretyczny zasięg z modelu wychodzi kilkanaście metrów; w praktyce zasięg zmniejszają odbicia, metal i woda w pobliżu tagu, niedopasowanie polaryzacji i czułość odbiornika czytnika (łącze zwrotne).</div>` : ""}
    <div class="lab"><b>🔧 W laboratorium</b> zmierzycie realny zasięg modułu HF dla karty i breloka oraz sprawdzicie wpływ metalowej płytki za tagiem UHF.</div>`,
    po() { const s = (id, f) => $(id) && ($(id).oninput = f); s("#sH", e => { hKarty = e.target.value / 100; $("#vH").textContent = fmt(e.target.value) + " cm"; }); s("#sD", e => { dTagu = +e.target.value; $("#vD").textContent = fmt(dTagu) + " m"; }); s("#sC", e => { czulosc = +e.target.value; $("#vC").textContent = czulosc + " dBm"; }); } },
  { id: "budowa", tytul: "3. Budowa tagów", scena: scenaBudowa, html: `
    <h2>Co jest w środku tagu?</h2>
    <p>Każdy tag pasywny to <b>antena dopasowana do pasma</b> i <b>chip</b>, który z energii pola wytwarza zasilanie, dekoduje komendy i moduluje odpowiedź. Wybierz model nad sceną i kliknij jego części.</p>
    <table class="t"><tr><th>Tag</th><th>Antena</th><th>Dlaczego taka?</th></tr>
    <tr><td>Karta HF</td><td>cewka, kilka zwojów</td><td>sprzężenie magnetyczne; obwód LC dostrojony do 13,56 MHz</td></tr>
    <tr><td>Inlay UHF</td><td>dipol z meandrami + pętla T-match</td><td>λ/2 ≈ 17 cm skrócone meandrami; dopasowanie impedancji do chipu (pojemnościowej)</td></tr>
    <tr><td>Kapsułka LF</td><td>setki zwojów na ferrycie</td><td>przy 134,2 kHz potrzeba dużej indukcyjności; ferryt skupia strumień</td></tr></table>
    <div class="ramka"><b>Pamięć chipu EPC Gen2 (4 banki)</b><table class="t"><tr><td><b>00 Reserved</b></td><td>hasło kill (32 b) i hasło dostępu (32 b)</td></tr><tr><td><b>01 EPC</b></td><td>CRC-16, PC (długość/flagi), identyfikator EPC (np. 96 b)</td></tr><tr><td><b>10 TID</b></td><td>identyfikator producenta i modelu chipu (zwykle nieedytowalny, często z numerem seryjnym)</td></tr><tr><td><b>11 User</b></td><td>opcjonalna pamięć użytkownika</td></tr></table></div>
    <div class="lab"><b>🔧 W laboratorium</b> odczytacie UID karty i zawartość bloków pamięci, a w UHF – banki EPC i TID; spróbujecie zapisać własny EPC.</div>` },
  { id: "pasma", tytul: "4. Pasma i standardy", scena: scenaPasma, html: () => `
    <h2>Pasma, normy i zasięgi</h2>
    <table class="t"><tr><th>Pasmo</th><th>Normy</th><th>Zasięg</th><th>Zastosowania</th></tr>
    <tr><td><b>LF</b> 125 / 134,2 kHz</td><td>ISO 11784/11785 (zwierzęta), EM4100 i podobne</td><td>kilka–kilkanaście cm</td><td>zwierzęta, immobilizery, starsze karty dostępu</td></tr>
    <tr><td><b>HF</b> 13,56 MHz</td><td>ISO/IEC 14443 A/B (proximity), ISO/IEC 15693 (vicinity), NFC (ISO/IEC 18092, NDEF)</td><td>14443: do ~10 cm; 15693: do ~1 m</td><td>płatności, bilety, karty uczelniane, paszporty, biblioteki, NFC w telefonach</td></tr>
    <tr><td><b>UHF</b> 860–960 MHz (UE 865–868)</td><td>EPC Gen2 = ISO/IEC 18000-63</td><td>do kilku–kilkunastu m</td><td>łańcuch dostaw, magazyny, handel, pomiar czasu</td></tr>
    <tr><td><b>Mikrofale</b> 2,45 GHz</td><td>m.in. ISO/IEC 18000-4, tagi aktywne</td><td>do kilkudziesięciu m</td><td>lokalizacja, opłaty, kontenery</td></tr></table>
    <p>Wybierz zastosowanie – podświetlimy właściwy tor zasięgu:</p>
    <div class="rzad">${PASMA.map(p => `<button class="btn jasny" data-pas="${p.id}">${p.nazwa.split(" –")[0].split(" ")[0]} ${p.id === "15693" ? "15693" : p.id === "NFC" ? "14443/NFC" : ""}</button>`).join("")}</div>
    <p id="pasOpis" style="color:var(--t2);font-size:13.5px"></p>
    <div class="ramka"><b>Ważne różnice dla inżyniera</b><ul><li>LF/HF: ciecze i ciało człowieka prawie nie przeszkadzają; metal tuż za cewką „rozstraja” obwód.</li><li>UHF: woda pochłania, metal odbija – potrzebne tagi on-metal i przemyślane ustawienie anten.</li><li>Prędkość: ISO 14443 106–848 kbit/s; Gen2 łącze zwrotne do kilkuset kbit/s i setki odczytów na sekundę.</li></ul></div>`,
    po() { $$("[data-pas]").forEach(b => b.onclick = () => { wyrozniony = b.dataset.pas; const p = PASMA.find(x => x.id === wyrozniony); $("#pasOpis").textContent = `${p.nazwa}: ${p.przyklad}. Zasięg ok. ${p.zasieg >= 1 ? fmt(p.zasieg, 0) + " m" : fmt(p.zasieg * 100, 0) + " cm"}.`; }); } },
  { id: "antykolizja", tytul: "5. Antykolizja", scena: scenaAntykolizja, html: `
    <h2>Jak odczytać 100 tagów naraz?</h2>
    <p>Gdy kilka tagów odpowie jednocześnie, sygnały się nakładają – <b>kolizja</b>. EPC Gen2 używa ramkowej szczelinowej <b>ALOHA</b>: czytnik ogłasza ramkę <span class="wzor">2^Q</span> szczelin (<i>Query</i>), każdy tag losuje szczelinę i odpowiada 16-bitową liczbą losową RN16. Gdy w szczelinie jest dokładnie jeden tag – czytnik potwierdza (ACK) i odbiera EPC.</p>
    <p>Maksymalna sprawność ALOHA to <span class="wzor">1/e ≈ 36,8%</span> szczelin z sukcesem – gdy liczba szczelin ≈ liczba tagów. Za małe Q → same kolizje; za duże → puste szczeliny. Czytniki stosują <b>algorytm Q</b>: Q<sub>fp</sub> rośnie o C po kolizji i maleje o C po pustej szczelinie.</p>
    <div class="rzad"><label class="suw">Liczba tagów N: <b id="vN">12</b><input type="range" id="sN" min="1" max="100" value="12"></label><label class="suw">Q (ramka 2^Q): <b id="vQ">4 → 16 szczelin</b><input type="range" id="sQ" min="0" max="10" value="4"></label></div>
    <div class="rzad"><label><input type="checkbox" id="cAd"> algorytm Q (adaptacyjny, C = 0,3)</label><button class="btn akc" id="bSym">▶ Symuluj odczyt</button><button class="btn jasny" id="bPor">📊 Porównaj Q</button></div>
    <canvas class="sloty" id="sloty"></canvas>
    <div class="legenda"><span><i style="background:#c9d3dc"></i>pusta</span><span><i style="background:#1fa45a"></i>sukces</span><span><i style="background:#d93a2b"></i>kolizja</span><span>| pionowa kreska = nowa ramka</span></div>
    <div class="stat" id="simStat"></div>
    <p style="font-size:12.5px;color:var(--t2)">Czasy szczelin orientacyjne: pusta ${fmt(CZAS.pusta, 2)} ms, kolizja ${fmt(CZAS.kolizja, 2)} ms, sukces ${fmt(CZAS.sukces, 2)} ms. Uproszczenie: pominięte sesje S0–S3, flagi A/B i Select.</p>
    <div class="lab"><b>🔧 W laboratorium</b> ustawicie Q, sesję i moc w czytniku UHF (np. przez protokół LLRP) i zmierzycie liczbę odczytów na sekundę dla palety tagów.</div>`, po: przygotujSymulacje },
  { id: "bramki", tytul: "6. Bramki i przejścia", scena: scenaBramki, html: () => `
    <h2>Od odczytu do decyzji: bramki</h2>
    ${trybBramki === "dostep" ? `<p>Kontrola dostępu to <b>maszyna stanów</b>: <i>czekaj → odczyt UID → sprawdź uprawnienia i stan → otwórz / odmów → zaloguj</i>. <b>Anti-passback</b> blokuje drugie wejście tą samą kartą bez wyjścia – ktoś mógł podać kartę przez bramkę.</p>
      <div class="rzad">${KARTY.map((k, i) => `<button class="btn jasny" data-k="${i}" style="font-size:12.5px">${esc(k.kto)}</button>`).join("")}</div>
      <div class="rzad"><button class="btn akc" id="bWe">➡ Przyłóż do czytnika WEJŚCIA</button><button class="btn" id="bWy">⬅ Przyłóż do czytnika WYJŚCIA</button></div>
      <div class="log" id="logBr"></div>
      <h3>Szkic programu sterownika (pseudokod)</h3>
      <pre class="kod">petla():
  uid = czytnik.czekajNaKarte()          // SPI → układ czytnika
  if uid == null: return
  osoba = baza.znajdz(uid)
  if osoba == null or osoba.zablokowana:
      odmowa("brak uprawnień")
  elif kierunek == WEJSCIE and osoba.wSrodku:
      odmowa("anti-passback")
  else:
      przekaznik.otworz(3000 ms)        // elektrozaczep / napęd skrzydeł
      osoba.wSrodku = (kierunek == WEJSCIE)
  log(czas, uid, kierunek, decyzja)</pre>
      <div class="ramka"><b>Uwaga projektowa:</b> sam UID to <i>identyfikator, nie hasło</i> – da się go skopiować. W systemach produkcyjnych karta musi się <b>uwierzytelnić kryptograficznie</b> (np. AES w kartach DESFire EV2/EV3).</div>`
    : `<p>Portal UHF odczytuje wiele tagów w ruchu. Żeby poznać <b>kierunek</b>, anteny dzielą przejście na strefy A i B: kolejność pierwszych odczytów mówi, skąd paleta jedzie. Dodatkowe wskazówki: trend RSSI, przesunięcie fazy (prędkość radialna), czujniki ruchu/fotokomórki.</p>
      <div class="rzad"><button class="btn akc" id="bJedzA">▶ Przejazd magazyn → rampa</button><button class="btn" id="bJedzB">◀ Przejazd rampa → magazyn</button></div>
      <div class="log" id="logBr"></div>
      <div class="ramka"><b>Problemy z praktyki:</b> odczyty z sąsiednich bram (za duża moc), tagi zasłonięte wodą/metalem w środku palety, „błądzące” odczyty tagów leżących obok bramy – filtruje się je w middleware (okno czasowe, minimalna liczba odczytów, RSSI).</div>`}
    <div class="lab"><b>🔧 W laboratorium</b> zbudujecie przejście: moduł czytnika + mikrokontroler + przekaźnik + elektrozaczep/LED/brzęczyk, potem wersję z dwoma czytnikami i anti-passbackiem, a w UHF – detekcję kierunku z dwóch anten.</div>`,
    po() { let wyb = 0; logBr = []; odswiezLog(); $$("[data-k]").forEach(b => b.onclick = () => { wyb = +b.dataset.k; $$("[data-k]").forEach(x => x.classList.toggle("akc", x === b)); }); $$("[data-k]")[0]?.classList.add("akc");
      $("#bWe") && ($("#bWe").onclick = () => akt.grupa.userData.przyloz(KARTY[wyb], "we")); $("#bWy") && ($("#bWy").onclick = () => akt.grupa.userData.przyloz(KARTY[wyb], "wy"));
      $("#bJedzA") && ($("#bJedzA").onclick = () => akt.grupa.userData.jedz(1)); $("#bJedzB") && ($("#bJedzB").onclick = () => akt.grupa.userData.jedz(-1)); } },
  { id: "bezp", tytul: "7. Bezpieczeństwo", scena: scenaBezp, html: `
    <h2>Bezpieczeństwo i prywatność</h2>
    <div class="karty">
      <div class="ramka"><b>Klonowanie UID</b><br>UID jest jawny i odczytywany bez uwierzytelnienia. Istnieją karty z zapisywalnym UID – system, który ufa samemu UID, da się oszukać.</div>
      <div class="ramka"><b>Złamana kryptografia</b><br>Szyfr Crypto1 kart MIFARE Classic został złamany w 2008 r. Dziś stosuje się m.in. AES-128 z wzajemnym uwierzytelnieniem (np. DESFire EV2/EV3).</div>
      <div class="ramka"><b>Atak przekaźnikowy (relay)</b><br>Dwa urządzenia przekazują komunikację między kartą ofiary a odległym czytnikiem. Obrona: limity czasu odpowiedzi (distance bounding), potwierdzenie na telefonie.</div>
      <div class="ramka"><b>Podsłuch i skimming</b><br>Komunikację da się podsłuchać z większej odległości niż zasięg odczytu. Pomaga szyfrowanie sesji i etui ekranujące (przycisk nad sceną).</div>
      <div class="ramka"><b>Prywatność UHF</b><br>Tag na produkcie może być odczytany po zakupie. Gen2 ma komendę <i>Kill</i> (hasło 32 b) i blokowanie banków pamięci (<i>Lock</i>).</div>
      <div class="ramka"><b>Dokumenty</b><br>Paszporty biometryczne chronią dane (BAC/PACE – klucz z danych ze strony paszportu), a chip ma losowy UID przy każdej sesji.</div>
    </div>
    <div class="lab"><b>🔧 W laboratorium</b> sprawdzicie, które karty mają stały, a które losowy UID, i dlaczego bramka oparta tylko na UID jest słaba.</div>` },
  { id: "zadania", tytul: "8. Zadania", scena: scenaZadania, html: () => `
    <h2>Zadania</h2>
    <div class="zad" id="z1"><h3>Zadanie 1 · Inwentaryzacja na czas</h3><p>Policz 24 kartony na regale. Runda <b>kod kreskowy</b>: klikaj każdą etykietę. Runda <b>RFID</b>: przytrzymaj palec/mysz na regale i przesuwaj czytnik.</p>
      <div class="rzad"><button class="btn" id="bKod">▶ Kod kreskowy</button><button class="btn akc" id="bRfid">▶ RFID</button><span>Odczytano: <b id="inwIle">0/24</b> · czas <b id="inwCzas">–</b></span></div><div id="inwWynik"></div></div>
    <div class="zad" id="z2"><h3>Zadanie 2 · Dobierz pasmo</h3><p>Przeciągnij (albo dotknij, a potem dotknij kosza) każde zastosowanie do pasma, w którym typowo pracuje.</p><div id="zetony"></div><div class="kosze">${["LF", "HF", "UHF"].map(p => `<div class="kosz" data-kosz="${p}"><h4>${p}</h4></div>`).join("")}</div><div class="rzad"><button class="btn" id="bSpr2">Sprawdź</button><span class="wynik" id="w2"></span></div></div>
    <div class="zad" id="z3"><h3>Zadanie 3 · Dobierz Q</h3><p>Na palecie jest <b>${ZAD3_N}</b> tagów, a czytnik ma stałe Q (bez adaptacji). Które Q da najkrótszy średni czas inwentaryzacji?</p><div class="rzad" id="opQ">${[3, 4, 5, 6, 7, 8].map(q => `<button class="btn jasny" data-q="${q}">Q = ${q} (${2 ** q} szczelin)</button>`).join("")}</div><div id="w3"></div></div>
    <div class="zad" id="z4"><h3>Zadanie 4 · Decyzja sterownika</h3><p>Na podstawie logu zdecyduj, co powinien zrobić system.</p><div id="logZad"></div><div class="rzad"><span class="wynik" id="w4"></span></div></div>
    <div class="zad" id="z5"><h3>Zadanie 5 (opcjonalne) · Prawdziwe NFC</h3><p>Telefon z Androidem w przeglądarce Chrome może czytać naklejki NFC (Web NFC). Znajdź naklejki ukryte w sali – każda nowa to punkt.</p><div class="rzad"><button class="btn akc" id="bNfc">📱 Skanuj NFC</button><span id="nfcStan"></span></div><div class="log" id="nfcLog" hidden></div></div>
    <div class="ramka"><b>Twój wynik:</b> <span id="suma"></span> <button class="btn jasny" id="bWyslij" style="margin-left:8px">Zapisz wynik</button><br><span style="font-size:12.5px;color:var(--t2)">Wynik trafia do panelu organizatora (bez lokalizacji). Imię: <input id="imie" maxlength="30" placeholder="opcjonalnie" style="font:13px system-ui;padding:3px 6px;border:1px solid var(--linia);border-radius:6px"></span></div>`,
    po: przygotujZadania },
  { id: "podsum", tytul: "Podsumowanie", scena: scenaSystem, html: `
    <h2>Podsumowanie i co dalej w laboratorium</h2>
    <ul><li>RFID = tag + czytnik + antena + host. Tag pasywny dostaje energię z pola czytnika.</li><li>HF/LF: sprzężenie indukcyjne w polu bliskim (zasięg cm); UHF: backscatter w polu dalekim (zasięg m).</li><li>Normy: ISO 11784/85 (LF), ISO 14443 / 15693 / NFC (HF), EPC Gen2 = ISO 18000-63 (UHF).</li><li>Odczyt wielu tagów wymaga antykolizji – optimum ALOHA, gdy liczba szczelin ≈ liczba tagów (≈36,8%).</li><li>Bramka to maszyna stanów z logiką uprawnień, anti-passbackiem i logowaniem; kierunek w UHF – z kolejności stref.</li><li>UID nie jest zabezpieczeniem – potrzebne uwierzytelnienie kryptograficzne.</li></ul>
    <div class="lab"><b>🔧 Plan laboratorium</b><ol style="margin:4px 0 0;padding-left:20px"><li>Odczyt UID karty modułem 13,56 MHz przez SPI.</li><li>Lista uprawnień w mikrokontrolerze, przekaźnik i sygnalizacja LED/brzęczyk.</li><li>Dwa czytniki: wejście/wyjście + anti-passback, log zdarzeń na serwer.</li><li>UHF: odczyt EPC/TID, wpływ mocy i Q, detekcja kierunku z dwóch anten.</li></ol></div>
    <p>Modele z lekcji możesz obejrzeć w AR na telefonie (przyciski „Zobacz w AR”) i w kursie na platformie e-peAR.</p>` },
];
const ZAD3_N = 40;

/* ---------- symulacja antykolizji (sekcja 5) ---------- */
function przygotujSymulacje() {
  const opisQ = () => { const q = +$("#sQ").value; $("#vQ").textContent = `${q} → ${2 ** q} szczelin`; }; opisQ();
  $("#sN").oninput = () => $("#vN").textContent = $("#sN").value; $("#sQ").oninput = opisQ;
  $("#bSym").onclick = () => { const N = +$("#sN").value, Q = +$("#sQ").value, wyn = symuluj({ N, Q, adapt: $("#cAd").checked, ziarno: Date.now() % 9973, maxSzczelin: 3000 }); animujSloty(wyn, N); };
  $("#bPor").onclick = () => { cancelAnimationFrame(animSl); simStan = null; const N = +$("#sN").value, dane = []; for (let q = 0; q <= 10; q++) { const s = srednio({ N, Q: q, maxSzczelin: 3000 }, 12); dane.push({ q, czas: s.czas, ok: s.szczeliny < 2999 }); } const ad = srednio({ N, Q: 4, adapt: true, maxSzczelin: 3000 }, 12); wykresQ(dane, ad.czas, N); };
  wykresPusty();
}
function wykresPusty() { const cv = $("#sloty"), g = cv.getContext("2d"); cv.width = cv.clientWidth * 2; cv.height = 300; g.fillStyle = "#4c5b68"; g.font = "24px system-ui"; g.fillText("Ustaw N i Q, potem „Symuluj odczyt” albo „Porównaj Q”.", 20, 150); $("#simStat").innerHTML = ""; }
let animSl = 0;
function animujSloty(w, N) {
  cancelAnimationFrame(animSl); const cv = $("#sloty"), g = cv.getContext("2d"), W = cv.width = cv.clientWidth * 2, H = cv.height = 300, n = w.szczeliny.length, kol = Math.max(10, Math.ceil(Math.sqrt(n * W / H * 1.1))), wiersze = Math.ceil(n / kol), bw = W / kol, bh = Math.min(28, (H - 10) / Math.max(1, wiersze));
  const KOL = { pusta: "#c9d3dc", sukces: "#1fa45a", kolizja: "#d93a2b" }, startRamek = new Set(w.ramki.map(r => r.od)); let i = 0;
  simStan = { odczytane: new Set(), kolizja: new Set() }; const mapa = t => t % 12;
  const krok = () => { if (!$("#simStat") || $("#sloty") !== cv) { simStan = null; return; } const ile = Math.max(1, Math.ceil(n / 90)); for (let k = 0; k < ile && i < n; k++, i++) { const s = w.szczeliny[i], x = (i % kol) * bw, y = Math.floor(i / kol) * bh + 4; g.fillStyle = KOL[s.wynik]; g.fillRect(x + 1, y + 1, bw - 2, bh - 2); if (startRamek.has(i)) { g.fillStyle = "#0f1b26"; g.fillRect(x, y - 2, 3, bh + 2); }
      simStan.kolizja = new Set(s.wynik === "kolizja" ? s.tagi.map(mapa) : []); if (s.wynik === "sukces") simStan.odczytane.add(mapa(s.tagi[0])); }
    const czesc = w.szczeliny.slice(0, i), il = { pusta: 0, sukces: 0, kolizja: 0 }; czesc.forEach(s => il[s.wynik]++);
    $("#simStat").innerHTML = `<div>Szczeliny<b>${i}</b></div><div>Sukcesy<b>${il.sukces}/${N}</b></div><div>Kolizje<b>${il.kolizja}</b></div><div>Sprawność<b>${fmt(il.sukces / Math.max(1, i) * 100, 0)}%</b></div>`;
    if (i < n) animSl = requestAnimationFrame(krok); else { simStan.kolizja = new Set(); if (!w.zakonczono) $("#simStat").insertAdjacentHTML("beforeend", `<div style="grid-column:1/-1;color:var(--zle)">⛔ Odczyt utknął w kolizjach – ramka za mała dla ${N} tagów. Zwiększ Q albo włącz algorytm Q.</div>`); else $("#simStat").insertAdjacentHTML("beforeend", `<div style="grid-column:1/-1">Czas inwentaryzacji ≈ <b>${fmt(w.czas)} ms</b> · ramek: ${w.ramki.length}</div>`); setTimeout(() => simStan = null, 2500); } };
  krok();
}
function wykresQ(dane, adCzas, N) {
  const cv = $("#sloty"), g = cv.getContext("2d"), W = cv.width = cv.clientWidth * 2, H = cv.height = 300, L = 70, B = 40, T = 30, R = 20;
  const ok = dane.filter(d => d.ok), max = Math.max(...ok.map(d => d.czas), adCzas) * 1.1, x = q => L + (W - L - R) * (q + 0.5) / 11, y = v => H - B - (H - B - T) * v / max, naj = ok.reduce((a, b) => b.czas < a.czas ? b : a);
  g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.strokeStyle = "#e4e2dc"; g.fillStyle = "#4c5b68"; g.font = "20px system-ui";
  for (let k = 0; k <= 4; k++) { const v = max * k / 4; g.beginPath(); g.moveTo(L, y(v)); g.lineTo(W - R, y(v)); g.stroke(); g.fillText(fmt(v, 0), 8, y(v) + 6); }
  g.fillText("czas [ms]", 8, 22);
  dane.forEach(d => { const bw = (W - L - R) / 11 * 0.62; g.fillStyle = d.ok ? (d === naj ? "#1fa45a" : "#2a78d6") : "#e4e2dc"; const h = d.ok ? H - B - y(d.czas) : H - B - T; g.beginPath(); g.roundRect(x(d.q) - bw / 2, H - B - h, bw, h, [6, 6, 0, 0]); g.fill(); g.fillStyle = "#4c5b68"; g.fillText(String(d.q), x(d.q) - 6, H - 14); if (!d.ok) { g.fillStyle = "#d93a2b"; g.fillText("✕", x(d.q) - 8, H - B - 10); } });
  g.strokeStyle = "#e67e22"; g.setLineDash([8, 6]); g.lineWidth = 3; g.beginPath(); g.moveTo(L, y(adCzas)); g.lineTo(W - R, y(adCzas)); g.stroke(); g.setLineDash([]); g.fillStyle = "#b35c00"; g.fillText("algorytm Q (adaptacyjny)", W - R - 250, y(adCzas) - 8);
  $("#simStat").innerHTML = `<div style="grid-column:1/-1">Dla N = ${N}: najlepsze stałe <b>Q = ${naj.q}</b> (${2 ** naj.q} szczelin) ≈ ${fmt(naj.czas)} ms; algorytm Q ≈ ${fmt(adCzas)} ms. ✕ = odczyt utyka w kolizjach. Oś X: Q.</div>`;
}

/* ---------- zadania ---------- */
const ZETONY = [["Chip w psie", "LF"], ["Immobilizer w kluczyku", "LF"], ["Karta płatnicza zbliżeniowa", "HF"], ["Legitymacja / karta uczelniana", "HF"], ["Książka w bibliotece", "HF"], ["Naklejka NFC na plakacie", "HF"], ["Paleta w magazynie", "UHF"], ["Metka w sklepie odzieżowym", "UHF"], ["Chip w numerze startowym biegacza", "UHF"], ["Kolczyk krowy", "LF"]];
const LOGI = [
  { log: "WE  04 A2 3B 1C 5D 80  (na liście, stan: na zewnątrz)", opcje: ["Wpuścić", "Odmówić", "Alarm"], ok: 0, wyj: "Karta uprawniona i poprawny stan – otwieramy." },
  { log: "WE  04 A2 3B 1C 5D 80  (na liście, stan: W ŚRODKU)", opcje: ["Wpuścić", "Odmówić – anti-passback", "Usunąć kartę z bazy"], ok: 1, wyj: "Ta karta już weszła i nie wyszła – ktoś mógł ją podać dalej. Anti-passback." },
  { log: "WE  04 7F 10 9E 22 31  (brak w bazie)", opcje: ["Wpuścić jako gościa", "Odmówić i zalogować", "Dopisać automatycznie"], ok: 1, wyj: "Nieznany UID – odmowa i wpis do logu. Nigdy nie dopisujemy kart automatycznie." },
  { log: "0,40 s  ant A1  EPC …4105  −51 dBm\n0,52 s  ant A2  EPC …4107  −55 dBm\n1,61 s  ant B1  EPC …4105  −49 dBm\n1,70 s  ant B2  EPC …4107  −53 dBm", opcje: ["Wjazd do magazynu (B→A)", "Wyjazd na rampę (A→B)", "Za mało danych"], ok: 1, wyj: "Najpierw strefa A (magazyn), potem B (rampa) → wyjazd." },
  { log: "0,30 s  ant B1  EPC …4103  −62 dBm\n0,90 s  ant B2  EPC …4103  −58 dBm\n2,40 s  ant B1  EPC …4103  −64 dBm\n(brak odczytów w strefie A)", opcje: ["Wjazd do magazynu", "Wyjazd na rampę", "Brak przejścia – paleta zawróciła lub stoi przy bramie"], ok: 2, wyj: "Odczyty tylko w jednej strefie – middleware nie może uznać przejścia (typowy „zabłąkany” tag)." },
];
function przygotujZadania() {
  // Z1
  $("#bKod").onclick = () => startInw("kod"); $("#bRfid").onclick = () => startInw("rfid"); rysujInw();
  // Z2
  const zet = $("#zetony"); let wybr = null; zet.innerHTML = ZETONY.map(([t], i) => `<span class="zeton" data-z="${i}">${esc(t)}</span>`).join("");
  const wrzuc = (el, kosz) => { kosz.append(el); el.classList.remove("wybrany", "ok", "zle"); wybr = null; };
  $$(".zeton").forEach(el => { el.onpointerdown = e => { e.preventDefault(); wybr = el; $$(".zeton").forEach(x => x.classList.toggle("wybrany", x === el)); const start = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId);
    el.onpointermove = ev => { if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 8) { el.style.position = "relative"; el.style.left = ev.clientX - start.x + "px"; el.style.top = ev.clientY - start.y + "px"; el.style.zIndex = 5; const k = document.elementsFromPoint(ev.clientX, ev.clientY).find(x => x.dataset?.kosz); $$(".kosz").forEach(x => x.classList.toggle("nad", x === k)); } };
    el.onpointerup = ev => { el.onpointermove = null; el.style.left = el.style.top = ""; el.style.position = ""; const k = document.elementsFromPoint(ev.clientX, ev.clientY).find(x => x.dataset?.kosz); $$(".kosz").forEach(x => x.classList.remove("nad")); if (k) wrzuc(el, k); }; }; });
  $$(".kosz").forEach(k => k.onclick = () => wybr && wrzuc(wybr, k));
  $("#bSpr2").onclick = () => { let ok = 0; $$(".kosz").forEach(k => k.querySelectorAll(".zeton").forEach(el => { const dobre = ZETONY[+el.dataset.z][1] === k.dataset.kosz; el.classList.toggle("ok", dobre); el.classList.toggle("zle", !dobre); ok += dobre; })); wyniki.pasma = ok; zapiszWyniki(); $("#w2").textContent = `${ok}/${ZETONY.length} poprawnie${ok === ZETONY.length ? " 🎉" : ""}`; sumuj(); };
  // Z3
  $$("[data-q]").forEach(b => b.onclick = () => { const wyn = [3, 4, 5, 6, 7, 8].map(q => ({ q, ...srednio({ N: ZAD3_N, Q: q, maxSzczelin: 4000 }, 25) })), naj = wyn.reduce((a, c) => c.czas < a.czas ? c : a), moj = wyn.find(x => x.q === +b.dataset.q);
    wyniki.q = Math.round(naj.czas / moj.czas * 20); zapiszWyniki(); $$("[data-q]").forEach(x => x.disabled = true);
    $("#w3").innerHTML = `<p>${moj.q === naj.q ? "✅ Dokładnie tak!" : `Najlepsze jest <b>Q = ${naj.q}</b>.`} Średnie czasy (25 losowań): ${wyn.map(x => `Q=${x.q}: <b>${x.szczeliny > 3990 ? "utyka" : fmt(x.czas, 0) + " ms"}</b>`).join(" · ")}.<br>Reguła startowa: 2^Q ≈ liczba tagów (${ZAD3_N}) – wtedy udział szczelin z sukcesem zbliża się do 1/e. Optimum <i>czasowe</i> wypada nieco niżej, bo pusta szczelina i kolizja trwają krócej niż odczyt EPC.</p>`; sumuj(); });
  // Z4
  let nr = 0, pkt = 0; const pokazLog = () => { if (nr >= LOGI.length) { wyniki.log = pkt; zapiszWyniki(); $("#logZad").innerHTML = `<p>Koniec: <b>${pkt}/${LOGI.length}</b> trafnych decyzji.</p>`; sumuj(); return; } const L = LOGI[nr];
    $("#logZad").innerHTML = `<div class="log">${esc(L.log)}</div><div class="rzad">${L.opcje.map((o, i) => `<button class="btn jasny" data-o="${i}">${esc(o)}</button>`).join("")}</div>`;
    $$("[data-o]").forEach(b => b.onclick = () => { const ok = +b.dataset.o === L.ok; pkt += ok; $("#w4").innerHTML = `${ok ? "✅" : "❌"} ${esc(L.wyj)}`; nr++; setTimeout(pokazLog, 1800); }); };
  pokazLog();
  // Z5 – Web NFC
  $("#bNfc").onclick = async () => {
    if (!("NDEFReader" in window)) { $("#nfcStan").textContent = "Ta przeglądarka nie obsługuje Web NFC (działa w Chrome na Androidzie, przez HTTPS). Zadanie jest opcjonalne."; return; }
    try { const rd = new NDEFReader(); await rd.scan(); $("#nfcStan").textContent = "Zbliż telefon do naklejki…"; $("#nfcLog").hidden = false;
      rd.onreading = ev => { const sn = ev.serialNumber || "(brak numeru)", rek = [...ev.message.records].map(r => r.recordType === "text" ? `tekst: ${new TextDecoder(r.encoding || "utf-8").decode(r.data)}` : r.recordType === "url" ? `URL: ${new TextDecoder().decode(r.data)}` : r.recordType).join("; ") || "pusta";
        if (!wyniki.nfc.includes(sn)) wyniki.nfc.push(sn); zapiszWyniki(); $("#nfcLog").textContent += `UID ${sn} · ${rek}\n`; $("#nfcStan").textContent = `Znaleziono różnych naklejek: ${wyniki.nfc.length}`; sumuj(); };
      rd.onreadingerror = () => { $("#nfcStan").textContent = "Nie udało się odczytać – spróbuj jeszcze raz."; };
    } catch (e) { $("#nfcStan").textContent = "Brak zgody na NFC albo NFC wyłączone w telefonie."; }
  };
  $("#bWyslij").onclick = () => { const s = sumuj(); zglos("rfid", "wynik", { gracz: $("#imie").value.trim(), pozycja: "RFID – zadania", bledy: 0, punkty: s, czas: wyniki.inw.rfid ?? "" }); $("#bWyslij").textContent = "✔ Zapisano"; };
  sumuj();
}
function startInw(tryb) { inw = { tryb, odczyt: new Set(), start: null, koniec: null, kolejka: 0 }; ster.enabled = tryb !== "rfid"; $("#inwIle").textContent = "0/24"; $("#inwCzas").textContent = "–"; rysujInw(); kadruj(akt.grupa, akt.kadr); }
function rysujInw() {
  const k = wyniki.inw.kod, f = wyniki.inw.rfid, el = $("#inwWynik"); if (!el) return;
  el.innerHTML = (k || f) ? `<table class="t"><tr><td>Kod kreskowy</td><td><b>${k ? fmt(k) + " s" : "–"}</b></td></tr><tr><td>RFID</td><td><b>${f ? fmt(f) + " s" : "–"}</b></td></tr>${k && f ? `<tr><td colspan="2">RFID było <b>${fmt(k / f)}×</b> szybsze. W prawdziwym magazynie różnica rośnie z liczbą sztuk – i RFID nie wymaga widoczności etykiety.</td></tr>` : ""}</table>` : "";
  sumuj();
}
function sumuj() {
  const z1 = wyniki.inw.kod && wyniki.inw.rfid ? 20 : (wyniki.inw.kod || wyniki.inw.rfid ? 10 : 0), z2 = wyniki.pasma != null ? Math.round(wyniki.pasma / ZETONY.length * 20) : 0, z3 = wyniki.q ?? 0, z4 = wyniki.log != null ? Math.round(wyniki.log / LOGI.length * 20) : 0, z5 = Math.min(10, wyniki.nfc.length * 4);
  const s = z1 + z2 + z3 + z4 + z5; if ($("#suma")) $("#suma").innerHTML = `<b>${s}</b> pkt (Z1 ${z1}/20 · Z2 ${z2}/20 · Z3 ${z3}/20 · Z4 ${z4}/20 · NFC +${z5})`; return s;
}

/* ================= nawigacja ================= */
let idx = 0; const odwiedzone = new Set();
$("#nawig").innerHTML = SEKCJE.map((s, i) => `<option value="${i}">${esc(s.tytul)}</option>`).join("");
$("#nawig").onchange = e => pokazSekcje(+e.target.value);
$("#bWstecz").onclick = () => pokazSekcje(Math.max(0, idx - 1)); $("#bDalej").onclick = () => pokazSekcje(Math.min(SEKCJE.length - 1, idx + 1));
function pokazSekcje(i) {
  const zmiana = i !== idx || !akt; idx = i; odwiedzone.add(i); const s = SEKCJE[i]; history.replaceState(null, "", "#" + s.id);
  if (s.id !== "zadania") inw = null; if (s.id !== "pasma") wyrozniony = null;
  $("#tresc").innerHTML = typeof s.html === "function" ? s.html() : s.html; if (zmiana) $("#tresc").scrollTop = 0; s.po?.();
  $("#nawig").value = i; [...$("#nawig").options].forEach((o, k) => o.textContent = (odwiedzone.has(k) && k !== i ? "✓ " : "") + SEKCJE[k].tytul);
  $("#czescTxt").textContent = `📡 ${i + 1}/${SEKCJE.length} · ${s.tytul.replace(/^\d+\.\s*/, "")}`;
  $("#bWstecz").disabled = i === 0; $("#bDalej").textContent = i === SEKCJE.length - 1 ? "✔ Koniec" : "Dalej ▶";
  ustawScene(s.scena()); $("#etykieta").style.display = "none";
  if (i === SEKCJE.length - 1) zglos("rfid", "wynik", { pozycja: "Lekcja przejrzana do końca", czas: Math.round((performance.now() - t00) / 1000) });
}
const t00 = performance.now();
let poprz = performance.now();
const FILM = new URLSearchParams(location.search).has("film");
function petla(t) { if (FILM) return; const dt = Math.min(0.05, (t - poprz) / 1000); poprz = t; ster.update(); akt?.klatka?.(dt, t / 1000); r.render(sc, kam); requestAnimationFrame(petla); }
if (FILM) { document.getElementById("panel").style.display = "none"; document.getElementById("uklad").style.gridTemplateColumns = "1fr"; document.getElementById("uklad").style.gridTemplateRows = "1fr"; rozmiar(); }
/* tryb nagrywania filmu: klatka sterowana z zewnątrz (deterministyczny czas) */
const film = { sekcja: -1, klatka(t, dt, { sekcja, h, d, obrot = 0.15, tryb }) {
  if (tryb && tryb !== trybZasady) { trybZasady = tryb; this.sekcja = -1; }
  if (sekcja !== this.sekcja) { this.sekcja = sekcja; pokazSekcje(sekcja); rozmiar(); kadruj(akt.kadrObj || akt.grupa, akt.kadr || {}); ster.autoRotate = true; }
  if (h != null) hKarty = h; if (d != null) dTagu = d; ster.autoRotateSpeed = obrot; ster.update(); akt?.klatka?.(dt, t); r.render(sc, kam); } };
const zHasha = SEKCJE.findIndex(s => "#" + s.id === location.hash); pokazSekcje(zHasha >= 0 ? zHasha : 0); requestAnimationFrame(petla);
zglos("rfid", "otwarcie", {}); zglos("rfid", "start", { pozycja: "RFID – wprowadzenie" }); obecnosc("rfid", { gracz: "" });
window.__rfid = { film, pokazSekcje, SEKCJE, akt: () => akt, wyniki, symuluj, ustaw: (k, v) => { if (k === "h") hKarty = v; if (k === "d") dTagu = v; } };
window.__rfidGotowy = true;
