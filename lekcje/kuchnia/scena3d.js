/* Mistrz Kanapek – scena 3D kuchni (three.js): sprzęt, pojemniki i realistyczne składniki.
   Jednostka: 1 = 1 cm. Blat leży na y = 0. Wszystkie grafiki są proceduralne (bez zdjęć i znaków towarowych). */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/* ===================================================== tekstury proceduralne */
const losG = s => { let a = 2166136261; for (const c of String(s)) a = Math.imul(a ^ c.charCodeAt(0), 16777619) >>> 0; return () => ((a = Math.imul(a ^ (a >>> 15), 2246822507) >>> 0) / 4294967296); };
function tekstura(w, h, rysuj, o = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; rysuj(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = o.dane ? THREE.NoColorSpace : THREE.SRGBColorSpace; t.anisotropy = 8;
  if (o.powt) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...o.powt); }
  return t;
}
const plamki = (g, w, h, n, kol, rmin, rmax, R) => { for (let i = 0; i < n; i++) { g.fillStyle = kol(R); g.beginPath(); g.ellipse(R() * w, R() * h, rmin + R() * (rmax - rmin), (rmin + R() * (rmax - rmin)) * (0.5 + R() * 0.5), R() * 3, 0, 7); g.fill(); } };
const TX = {};
function tx() {
  if (TX.ok) return TX; const R = losG("kuchnia");
  TX.stal = tekstura(512, 512, (g, w, h) => { g.fillStyle = "#c9ced3"; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const y = R() * h, a = 0.03 + R() * 0.08; g.strokeStyle = R() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(60,65,70,${a})`; g.lineWidth = R() * 1.4; g.beginPath(); g.moveTo(R() * w - 80, y); g.lineTo(R() * w + 200, y + (R() - 0.5) * 2); g.stroke(); } }, { powt: [3, 3] });
  TX.stalSzorstk = tekstura(256, 256, (g, w, h) => { g.fillStyle = "#6a6a6a"; g.fillRect(0, 0, w, h); for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${R() > 0.5 ? 255 : 0},${R() > 0.5 ? 255 : 0},${R() > 0.5 ? 255 : 0},.06)`; g.fillRect(R() * w, R() * h, 60 * R(), 1); } }, { powt: [3, 3], dane: true });
  TX.miaz = tekstura(512, 512, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, "#fbf1d6"); gr.addColorStop(0.82, "#f3e2b8"); gr.addColorStop(0.93, "#d9b276"); gr.addColorStop(1, "#b77a35"); g.fillStyle = gr; g.fillRect(0, 0, w, h); plamki(g, w, h, 900, R => `rgba(${170 + R() * 40},${130 + R() * 30},${70 + R() * 30},${0.12 + R() * 0.2})`, 1, 5, R); plamki(g, w, h, 300, () => "rgba(255,255,250,.35)", 1, 3, R); });
  TX.skorka = tekstura(512, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#f2d39b"); gr.addColorStop(0.12, "#e0a456"); gr.addColorStop(0.5, "#c98436"); gr.addColorStop(1, "#a9631f"); g.fillStyle = gr; g.fillRect(0, 0, w, h); plamki(g, w, h, 700, R => `rgba(${120 + R() * 60},${60 + R() * 30},20,${0.06 + R() * 0.12})`, 1, 6, R); plamki(g, w, h, 120, () => "rgba(255,235,190,.18)", 4, 14, R); });
  TX.skorkaBump = tekstura(256, 128, (g, w, h) => { g.fillStyle = "#808080"; g.fillRect(0, 0, w, h); plamki(g, w, h, 900, R => `rgba(${R() > 0.5 ? 255 : 0},${R() > 0.5 ? 255 : 0},${R() > 0.5 ? 255 : 0},.12)`, 1, 3, R); }, { dane: true });
  const mieso = (smaz) => tekstura(512, 512, (g, w, h) => {
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
    plamki(g, w, h, 5200, R => { const v = 150 + R() * 105; return `rgba(${v},${v * 0.92},${v * 0.9},${0.35 + R() * 0.5})`; }, 1, 4.5, R);
    plamki(g, w, h, 900, () => "rgba(60,40,30,.25)", 1, 3, R);
    plamki(g, w, h, 500, () => "rgba(255,245,235,.35)", 1, 2.5, R);                 // drobinki tłuszczu
    if (smaz) { g.strokeStyle = "rgba(25,15,10,.6)"; g.lineWidth = 15; for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(-50 + i * 70, -20); g.lineTo(220 + i * 70, h + 20); g.stroke(); } }
  });
  TX.mieso = mieso(false); TX.miesoGrill = mieso(true);
  TX.miesoBump = tekstura(256, 256, (g, w, h) => { g.fillStyle = "#808080"; g.fillRect(0, 0, w, h); plamki(g, w, h, 2600, R => (R() > 0.5 ? "rgba(255,255,255,.35)" : "rgba(0,0,0,.35)"), 1, 3, R); }, { dane: true });
  TX.ogorek = tekstura(256, 256, (g, w, h) => { const c = w / 2, gr = g.createRadialGradient(c, c, 4, c, c, c); gr.addColorStop(0, "#e9f0b6"); gr.addColorStop(0.55, "#bccf73"); gr.addColorStop(0.82, "#93ad46"); gr.addColorStop(0.9, "#5c7d27"); gr.addColorStop(1, "#2f4f15"); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; g.fillStyle = "rgba(250,250,215,.9)"; g.beginPath(); g.ellipse(c + Math.cos(a) * c * 0.42, c + Math.sin(a) * c * 0.42, 9, 6, a, 0, 7); g.fill(); } g.strokeStyle = "rgba(70,100,30,.35)"; for (let i = 0; i < 40; i++) { const a = i / 40 * 6.28; g.beginPath(); g.moveTo(c + Math.cos(a) * c * 0.72, c + Math.sin(a) * c * 0.72); g.lineTo(c + Math.cos(a) * c * 0.88, c + Math.sin(a) * c * 0.88); g.stroke(); } });
  TX.pomidor = tekstura(256, 256, (g, w, h) => { const c = w / 2; g.fillStyle = "#c92d22"; g.fillRect(0, 0, w, h); const gr = g.createRadialGradient(c, c, 6, c, c, c); gr.addColorStop(0, "#f3a191"); gr.addColorStop(0.35, "#e24a3b"); gr.addColorStop(0.92, "#d0362a"); gr.addColorStop(1, "#9c1f16"); g.fillStyle = gr; g.beginPath(); g.arc(c, c, c, 0, 7); g.fill(); for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + 0.4; g.fillStyle = "rgba(247,190,110,.8)"; g.beginPath(); g.ellipse(c + Math.cos(a) * c * 0.5, c + Math.sin(a) * c * 0.5, c * 0.24, c * 0.17, a, 0, 7); g.fill(); g.fillStyle = "#f6e6a0"; for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(c + Math.cos(a) * c * (0.4 + k * 0.035), c + Math.sin(a) * c * (0.4 + k * 0.035) + (k % 2 ? 6 : -6), 4, 2.6, a, 0, 7); g.fill(); } } });
  TX.tortilla = tekstura(512, 512, (g, w, h) => { g.fillStyle = "#f1e2bf"; g.fillRect(0, 0, w, h); plamki(g, w, h, 160, R => `rgba(${150 + R() * 40},${90 + R() * 30},40,${0.25 + R() * 0.35})`, 3, 14, R); plamki(g, w, h, 1800, () => "rgba(200,170,120,.12)", 1, 3, R); });
  TX.panierka = tekstura(256, 256, (g, w, h) => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h); plamki(g, w, h, 2400, R => { const v = 170 + R() * 85; return `rgba(${v},${v * 0.85},${v * 0.6},.8)`; }, 1, 4, R); }, { powt: [2, 1] });
  TX.panierkaBump = tekstura(256, 256, (g, w, h) => { g.fillStyle = "#808080"; g.fillRect(0, 0, w, h); plamki(g, w, h, 2400, R => (R() > 0.5 ? "rgba(255,255,255,.6)" : "rgba(0,0,0,.5)"), 1, 3.5, R); }, { powt: [2, 1], dane: true });
  TX.papier = tekstura(512, 512, (g, w, h) => { g.fillStyle = "#fbf7ee"; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(218,41,28,.16)"; for (let i = 0; i < 9; i++) g.fillRect(i * 64 + 18, 0, 26, h); plamki(g, w, h, 400, () => "rgba(150,130,100,.05)", 2, 8, R); });
  TX.plyta = tekstura(512, 256, (g, w, h) => { g.fillStyle = "#2a2a2a"; g.fillRect(0, 0, w, h); for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${R() > 0.5 ? 120 : 10},${R() > 0.5 ? 100 : 10},80,.08)`; g.fillRect(R() * w, R() * h, 30 * R(), 1.2); } plamki(g, w, h, 60, () => "rgba(90,60,20,.18)", 6, 26, R); });
  TX.grzalka = tekstura(256, 256, (g, w, h) => { g.fillStyle = "#1c1c1c"; g.fillRect(0, 0, w, h); g.strokeStyle = "#ff7a1a"; g.lineWidth = 7; g.shadowColor = "#ff5a00"; g.shadowBlur = 14; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(20, 30 + i * 48); g.lineTo(w - 20, 30 + i * 48); g.stroke(); } });
  TX.kafle = tekstura(512, 256, (g, w, h) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? "#ffc72c" : "#ffb21e"; g.fillRect(x * 64, y * 64, 64, 64); g.strokeStyle = "#fff3d0"; g.lineWidth = 3; g.strokeRect(x * 64 + 1.5, y * 64 + 1.5, 61, 61); } g.fillStyle = "#da291c"; g.fillRect(0, 118, w, 20); }, { powt: [3, 1] });
  TX.siatka = tekstura(128, 128, (g, w, h) => { g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.strokeStyle = "#fff"; g.lineWidth = 3; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16, h); g.moveTo(0, i * 16); g.lineTo(w, i * 16); g.stroke(); } }, { powt: [3, 2], dane: true });
  TX.olej = tekstura(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7); gr.addColorStop(0, "#f2c454"); gr.addColorStop(1, "#b9801c"); g.fillStyle = gr; g.fillRect(0, 0, w, h); plamki(g, w, h, 60, () => "rgba(255,240,180,.25)", 4, 12, R); });
  TX.ok = true; return TX;
}
function etykietaTx(napis, kol) { return tekstura(256, 128, (g, w, h) => { g.fillStyle = kol; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(255,255,255,.92)"; g.beginPath(); g.roundRect(30, 28, 196, 72, 14); g.fill(); g.fillStyle = "#27170e"; g.font = "900 34px system-ui"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(napis, w / 2, h / 2 + 2); }); }

/* ===================================================== materiały */
const M = {};
function mat() {
  if (M.ok) return M; const T = tx();
  M.stal = new THREE.MeshStandardMaterial({ color: "#d9dde1", metalness: 0.9, roughness: 0.32, map: T.stal, roughnessMap: T.stalSzorstk });
  M.stalCiemna = new THREE.MeshStandardMaterial({ color: "#8f979e", metalness: 0.9, roughness: 0.45, map: T.stal });
  M.czarny = new THREE.MeshStandardMaterial({ color: "#1d1d1d", roughness: 0.55, metalness: 0.2 });
  M.plyta = new THREE.MeshStandardMaterial({ map: T.plyta, roughness: 0.42, metalness: 0.6 });
  M.grzalka = new THREE.MeshStandardMaterial({ map: T.grzalka, emissiveMap: T.grzalka, emissive: "#ffffff", emissiveIntensity: 1.2, roughness: 0.6 });
  M.papier = new THREE.MeshStandardMaterial({ map: T.papier, roughness: 0.85, side: THREE.DoubleSide });
  M.kafle = new THREE.MeshStandardMaterial({ map: T.kafle, roughness: 0.35 });
  M.olej = new THREE.MeshPhysicalMaterial({ map: T.olej, roughness: 0.08, clearcoat: 1, emissive: "#3a2200", emissiveIntensity: 0.4 });
  M.siatka = new THREE.MeshStandardMaterial({ color: "#d7dade", metalness: 0.9, roughness: 0.3, alphaMap: T.siatka, transparent: true, side: THREE.DoubleSide, alphaTest: 0.3 });
  M.szron = new THREE.MeshStandardMaterial({ color: "#dcecf7", roughness: 0.9 });
  M.ok = true; return M;
}

/* ===================================================== składniki */
export const WYS = { korona: 3.3, koronaSez: 3.5, spod: 1.4, spodDuzy: 1.5, srodek: 1.2, tortilla: 0.25, wolowina: 1.0, kurczak: 1.7, ser: 0.15, ketchup: 0.35, musztarda: 0.3, sosSpec: 0.4, sosMajo: 0.4, cebulka: 0.3, ogorek: 0.3, salata: 0.7, pomidor: 0.5 };
export const R_BULKI = 5.5;
export const SKALA_STOSU = 1.85;      // kanapka na stole montażowym pokazana większa – lepiej widać warstwy
export { SOS_KOL, lopatka, szczypce };
const SOS_KOL = { ketchup: "#c41c10", musztarda: "#e9b30c", sosSpec: "#ee9a5d", sosMajo: "#f4eedb" };
const kolSmaz = s => { const c = new THREE.Color(); if (s < 0.05) c.set("#e58a8f"); else if (s < 0.85) c.set("#e58a8f").lerp(new THREE.Color("#7a4a30"), s / 0.85); else if (s < 1.25) c.set("#7a4a30").lerp(new THREE.Color("#55331f"), (s - 0.85) / 0.4); else c.set("#55331f").lerp(new THREE.Color("#1e130c"), Math.min(1, (s - 1.25) / 0.35)); return c; };
const kolTost = (p, baza = "#ffffff") => new THREE.Color(baza).lerp(new THREE.Color("#d39a52"), Math.min(1, p) * 0.75);

function kopula(r, h, sezam, id) {
  const T = tx(), pr = []; for (let i = 0; i <= 16; i++) { const t = i / 16, a = t * Math.PI / 2; pr.push(new THREE.Vector2(Math.sin(a) * r * (1 - 0.04 * Math.sin(a * 2)), Math.cos(a) * h)); }
  pr.push(new THREE.Vector2(r * 0.985, -0.05)); pr.reverse();   // od dołu do góry – normalne na zewnątrz
  const g = new THREE.Group(), skorka = new THREE.MeshStandardMaterial({ map: T.skorka, bumpMap: T.skorkaBump, bumpScale: 0.4, roughness: 0.55, color: "#ffffff" });
  const dome = new THREE.Mesh(new THREE.LatheGeometry(pr, 64), skorka); dome.castShadow = dome.receiveShadow = true; g.add(dome);
  const miaz = new THREE.MeshStandardMaterial({ map: T.miaz, roughness: 0.9, color: "#ffffff" });
  const cap = new THREE.Mesh(new THREE.CircleGeometry(r * 0.985, 64), miaz); cap.rotation.x = Math.PI / 2; cap.position.y = -0.05; cap.receiveShadow = true; g.add(cap);
  g.userData.miaz = miaz; g.userData.skorka = skorka;
  if (sezam) {
    const R = losG(id + "sez"), n = 90, ins = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 8, 6), new THREE.MeshStandardMaterial({ color: "#f6e7bf", roughness: 0.6 }), n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, t = Math.sqrt(R()) * 0.85, an = t * Math.PI / 2, x = Math.sin(an) * r * Math.cos(a), z = Math.sin(an) * r * Math.sin(a), y = Math.cos(an) * h; e.set(R() * 3, R() * 3, R() * 3); q.setFromEuler(e); m4.compose(new THREE.Vector3(x, y + 0.04, z), q, new THREE.Vector3(1, 0.45, 0.62)); ins.setMatrixAt(i, m4); }
    ins.castShadow = true; g.add(ins);
  }
  return g;
}
function krazekBulki(r, h, gornyMiaz = true, dolnyMiaz = false) {
  const T = tx(), skorka = new THREE.MeshStandardMaterial({ map: T.skorka, bumpMap: T.skorkaBump, bumpScale: 0.3, roughness: 0.6 }), miaz = new THREE.MeshStandardMaterial({ map: T.miaz, roughness: 0.9 });
  const geo = new THREE.CylinderGeometry(r, r * 0.97, h, 64, 1); const m = new THREE.Mesh(geo, [skorka, gornyMiaz ? miaz : skorka, dolnyMiaz ? miaz : skorka]); m.position.y = h / 2; m.castShadow = m.receiveShadow = true;
  const g = new THREE.Group(); g.add(m); g.userData.miaz = miaz; g.userData.skorka = skorka; return g;
}
function kotletGeo(r, h, id) {
  const geo = new THREE.CylinderGeometry(r, r, h, 56, 2), p = geo.attributes.position, R = losG(id), fazy = [R() * 6, R() * 6, R() * 6];
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(z, x), d = Math.hypot(x, z);
    const k = 1 + 0.035 * Math.sin(a * 5 + fazy[0]) + 0.025 * Math.sin(a * 9 + fazy[1]) + 0.02 * Math.sin(a * 14 + fazy[2]);
    const yy = y + (Math.abs(y) > h * 0.4 ? Math.sign(y) * (0.06 * Math.sin(x * 2.1 + fazy[1]) * Math.cos(z * 1.7)) : 0) - (d < r * 0.6 && y > 0 ? 0.08 : 0);
    p.setXYZ(i, x * k, yy, z * k); }
  geo.computeVertexNormals(); geo.translate(0, h / 2, 0); return geo;
}
function spirala(ile, rMax, id) {
  const R = losG(id), pkt = [], obr = 2.2 + Math.min(1.5, ile) * 0.8, n = 140, rr = rMax * (0.55 + 0.35 * Math.min(1.5, ile));
  for (let i = 0; i <= n; i++) { const t = i / n, a = t * obr * Math.PI * 2, d = 0.25 + t * rr; pkt.push(new THREE.Vector3(Math.cos(a) * d + (R() - 0.5) * 0.12, 0.18 + Math.sin(t * 40) * 0.03, Math.sin(a) * d + (R() - 0.5) * 0.12)); }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pkt), 220, 0.2 + 0.1 * Math.min(1.6, ile), 10, false);
}

/** Tworzy składnik; zwraca grupę z metodą ustaw(stan) do zmiany wypieczenia/usmażenia/topnienia/ilości sosu. */
export function stworzSkladnik(k, st = {}) {
  const T = tx(), id = st.id || k + Math.random(), g = new THREE.Group(); g.userData.k = k;
  let ustaw = () => {};
  if (k === "korona" || k === "koronaSez") {
    const d = kopula(k === "koronaSez" ? 5.9 : R_BULKI, WYS[k] - 0.1, k === "koronaSez", id); g.add(d);
    ustaw = s => { d.userData.miaz.color.copy(kolTost(s.opieczenie ?? 0)); d.userData.skorka.color.set(s.opieczenie > 0.3 ? "#f4e6d4" : "#ffffff"); d.rotation.x = s.odwrocona ? Math.PI : 0; d.position.y = s.odwrocona ? WYS[k] - 0.1 : 0.05; };
  } else if (k === "spod" || k === "spodDuzy" || k === "srodek") {
    const d = krazekBulki(k === "spodDuzy" ? 5.9 : k === "srodek" ? 5.7 : R_BULKI, WYS[k], true, k === "srodek"); g.add(d);
    ustaw = s => d.userData.miaz.color.copy(kolTost(s.opieczenie ?? 0));
  } else if (k === "wolowina") {
    const gora = new THREE.MeshStandardMaterial({ map: T.mieso, bumpMap: T.miesoBump, bumpScale: 0.5, roughness: 0.62 }), dol = gora.clone(), bok = new THREE.MeshStandardMaterial({ map: T.mieso, bumpMap: T.miesoBump, bumpScale: 0.6, roughness: 0.7 });
    const m = new THREE.Mesh(kotletGeo(5.1, WYS.wolowina, id), [bok, gora, dol]); m.castShadow = m.receiveShadow = true; g.add(m);
    const szron = new THREE.Mesh(new THREE.CylinderGeometry(5.0, 5.0, 0.04, 40), new THREE.MeshStandardMaterial({ color: "#eef6ff", transparent: true, opacity: 0.45, roughness: 1 })); szron.position.y = WYS.wolowina + 0.03; g.add(szron);
    ustaw = s => { const gg = s.gora ?? 0, dd = s.dol ?? 0; gora.color.copy(kolSmaz(gg)); dol.color.copy(kolSmaz(dd)); bok.color.copy(kolSmaz(Math.max(gg, dd) * 0.8)); gora.map = gg > 0.5 ? T.miesoGrill : T.mieso; dol.map = dd > 0.5 ? T.miesoGrill : T.mieso; gora.needsUpdate = dol.needsUpdate = true; gora.roughness = gg > 0.3 ? 0.42 : 0.7; szron.visible = !!s.mrozony && gg < 0.05 && dd < 0.05; };
  } else if (k === "ser") {
    const geo = new THREE.PlaneGeometry(8.6, 8.6, 24, 24); geo.rotateX(-Math.PI / 2); geo.rotateY(Math.PI / 4); const baza = geo.attributes.position.array.slice();
    const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: "#f7b12a", roughness: 0.38, clearcoat: 0.3, sheen: 0.4, sheenColor: "#ffe08a", side: THREE.DoubleSide })); m.position.y = 0.08; m.castShadow = true; g.add(m);
    let ost = -1; ustaw = s => { const t = s.topnienie ?? 0; if (Math.abs(t - ost) < 0.02) return; ost = t; const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = baza[i * 3], z = baza[i * 3 + 2], d = Math.hypot(x, z), nad = Math.max(0, d - 4.4); p.setY(i, -nad * nad * 0.5 * t - nad * 0.6 * t); const kk = 1 - t * 0.04 * nad; p.setX(i, x * kk); p.setZ(i, z * kk); } p.needsUpdate = true; geo.computeVertexNormals(); };
  } else if (SOS_KOL[k]) {
    const matS = new THREE.MeshPhysicalMaterial({ color: SOS_KOL[k], roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08 }); const m = new THREE.Mesh(spirala(1, 3.6, id), matS); m.castShadow = true; g.add(m);
    let ost = -1; ustaw = s => { const ile = s.ile ?? 1; if (Math.abs(ile - ost) < 0.04) return; ost = ile; m.geometry.dispose(); m.geometry = spirala(Math.max(0.1, ile), 3.6, id); };
  } else if (k === "cebulka") {
    const R = losG(id), n = 80, ins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.13, 0.26), new THREE.MeshPhysicalMaterial({ color: "#f5f1e2", roughness: 0.35, transmission: 0.25, thickness: 0.2 }), n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let i = 0; i < n; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * 3.9; q.setFromEuler(new THREE.Euler(R() * 0.5, R() * 6.28, R() * 0.5)); m4.compose(new THREE.Vector3(Math.cos(a) * d, 0.1 + R() * 0.12, Math.sin(a) * d), q, new THREE.Vector3(0.6 + R() * 0.8, 1, 1)); ins.setMatrixAt(i, m4); }
    ins.castShadow = true; g.add(ins);
  } else if (k === "ogorek") {
    const sk = new THREE.MeshStandardMaterial({ color: "#2f5216", roughness: 0.5 }), w = new THREE.MeshPhysicalMaterial({ map: T.ogorek, roughness: 0.3, clearcoat: 0.6 });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.28, 40), [sk, w, w]); m.position.y = 0.14; m.castShadow = true; g.add(m);
  } else if (k === "pomidor") {
    const sk = new THREE.MeshStandardMaterial({ color: "#b8231a", roughness: 0.3 }), w = new THREE.MeshPhysicalMaterial({ map: T.pomidor, roughness: 0.25, clearcoat: 0.8 });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 0.5, 48), [sk, w, w]); m.position.y = 0.25; m.castShadow = true; g.add(m);
  } else if (k === "salata") {
    const R = losG(id), n = 110, geo = new THREE.PlaneGeometry(2.2, 0.42, 6, 1); { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 1.4) * 0.18); geo.computeVertexNormals(); }
    const ins = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.45, side: THREE.DoubleSide }), n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), kol = [new THREE.Color("#e3f2c6"), new THREE.Color("#b9db84"), new THREE.Color("#8fc256"), new THREE.Color("#d4ebae")];
    for (let i = 0; i < n; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * 4.8; q.setFromEuler(new THREE.Euler(-Math.PI / 2 + (R() - 0.5) * 0.8, R() * 6.28, (R() - 0.5) * 0.6)); m4.compose(new THREE.Vector3(Math.cos(a) * d, 0.12 + R() * 0.45, Math.sin(a) * d), q, new THREE.Vector3(1, 1, 1)); ins.setMatrixAt(i, m4); ins.setColorAt(i, kol[i % 4]); }
    ins.castShadow = true; g.add(ins);
  } else if (k === "tortilla") {
    const geo = new THREE.CylinderGeometry(10.5, 10.5, WYS.tortilla, 72, 1); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) + Math.sin(x * 0.5) * Math.cos(z * 0.4) * 0.12); } geo.computeVertexNormals();
    const w = new THREE.MeshStandardMaterial({ map: T.tortilla, roughness: 0.85 }), bok = new THREE.MeshStandardMaterial({ color: "#e5cf9f", roughness: 0.9 });
    const m = new THREE.Mesh(geo, [bok, w, w]); m.position.y = WYS.tortilla / 2; m.receiveShadow = m.castShadow = true; g.add(m);
    ustaw = s => w.color.copy(kolTost(s.opieczenie ?? 0, "#ffffff"));
  } else if (k === "kurczak") {
    const geo = new THREE.CapsuleGeometry(1.25, 5.6, 8, 20); geo.rotateZ(Math.PI / 2); geo.scale(1, 0.62, 1); const p = geo.attributes.position, R = losG(id);
    for (let i = 0; i < p.count; i++) { const n = 1 + (R() - 0.5) * 0.08; p.setXYZ(i, p.getX(i) * (1 + (R() - 0.5) * 0.03), p.getY(i) * n, p.getZ(i) * n); } geo.computeVertexNormals();
    const mt = new THREE.MeshStandardMaterial({ map: T.panierka, bumpMap: T.panierkaBump, bumpScale: 0.9, roughness: 0.72 }); const m = new THREE.Mesh(geo, mt); m.position.y = 0.85; m.castShadow = true; g.add(m);
    ustaw = s => { const sm = s.smazenie ?? 0, c = new THREE.Color(); if (sm < 0.05) c.set("#efe0c2"); else if (sm < 1) c.set("#eed6a2").lerp(new THREE.Color("#d18f3c"), sm); else if (sm < 1.35) c.set("#d18f3c"); else c.set("#d18f3c").lerp(new THREE.Color("#4a2a10"), Math.min(1, (sm - 1.35) / 0.4)); mt.color.copy(c); };
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.ustaw = ustaw; ustaw(st); return g;
}

/* ===================================================== sprzęt i pojemniki */
function skrzynka(w, h, d, matZew, matWew, grub = 0.5) {
  const g = new THREE.Group(), dodaj = (gw, gh, gd, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(gw, gh, gd), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; g.add(b); return b; };
  dodaj(w, grub, d, 0, grub / 2, 0, matWew || matZew);
  dodaj(w, h, grub, 0, h / 2, -d / 2 + grub / 2, matZew); dodaj(w, h, grub, 0, h / 2, d / 2 - grub / 2, matZew);
  dodaj(grub, h, d, -w / 2 + grub / 2, h / 2, 0, matZew); dodaj(grub, h, d, w / 2 - grub / 2, h / 2, 0, matZew);
  const brzeg = new THREE.Mesh(new THREE.TorusGeometry(1, 0.25, 6, 4), matZew); return g;
}
export function butelka(kolor, napis) {
  const g = new THREE.Group(), pr = [[0, 0], [2.6, 0], [2.9, 0.4], [2.95, 11], [2.6, 12.6], [1.2, 13.4], [0, 13.4]].map(([x, y]) => new THREE.Vector2(x, y));
  const plastik = new THREE.MeshPhysicalMaterial({ color: kolor, roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  const ciało = new THREE.Mesh(new THREE.LatheGeometry(pr, 40), plastik); ciało.castShadow = true; g.add(ciało);
  const etyk = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, 4.4, 40, 1, true, -Math.PI * 0.45, Math.PI * 0.9), new THREE.MeshStandardMaterial({ map: etykietaTx(napis, kolor), roughness: 0.6 })); etyk.position.y = 6.4; etyk.rotation.y = Math.PI; g.add(etyk);
  const nak = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 1.2, 24), new THREE.MeshStandardMaterial({ color: "#f4f4f4", roughness: 0.4 })); nak.position.y = 13.9; g.add(nak);
  const dz = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.6, 16), nak.material); dz.position.y = 15.8; g.add(dz);
  return g;
}
function lopatka() {
  const g = new THREE.Group(), m = mat();
  const ostrze = new THREE.Mesh(new THREE.BoxGeometry(9, 0.25, 8.5), new THREE.MeshStandardMaterial({ color: "#e8ecef", metalness: 0.95, roughness: 0.22, map: tx().stal })); ostrze.position.set(0, 0.2, -4.5); ostrze.castShadow = true; g.add(ostrze);
  const szyja = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 5), m.stalCiemna); szyja.position.set(0, 0.9, 2); szyja.rotation.x = -0.35; g.add(szyja);
  const rek = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.15, 11, 16), new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.5 })); rek.rotation.x = Math.PI / 2 - 0.15; rek.position.set(0, 2.1, 9.5); rek.castShadow = true; g.add(rek);
  return g;
}
function szczypce() {
  const g = new THREE.Group(), st = new THREE.MeshStandardMaterial({ color: "#e3e7ea", metalness: 0.95, roughness: 0.25 }), czer = new THREE.MeshStandardMaterial({ color: "#c0261b", roughness: 0.5 });
  for (const s of [-1, 1]) { const ramie = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 22), st); b.position.z = 0; ramie.add(b); const ch = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 7), czer); ch.position.set(0, 0.2, 7); ramie.add(ch); const k = new THREE.Mesh(new THREE.BoxGeometry(2, 0.35, 2.4), st); k.position.set(s * 0.5, 0, -10.5); ramie.add(k); ramie.rotation.y = s * 0.09; ramie.position.x = s * 1.4; ramie.position.y = 0.4 + (s > 0 ? 0.35 : 0); ramie.traverse(o => o.castShadow = true); g.add(ramie); }
  return g;
}

/* ===================================================== plan stanowiska */
export function plan(pion) {
  if (!pion) {
    const P = { blat: { x: 0, z: 4, w: 144, d: 112 }, sciana: -48,
      toster: { x: -46, z: -31, w: 32, d: 24 }, grill: { x: 0, z: -31, w: 52, d: 26 }, fryt: { x: 46, z: -31, w: 32, d: 26 },
      mroz: { x: -52, z: -1, w: 20, d: 18 }, mrozK: { x: 52, z: -1, w: 20, d: 18 },
      lopatka: { x: -32, z: -7 }, szczypce: { x: 31, z: -7 }, papier: { x: 0, z: 3, r: 18 }, poj: [] };
    const rz1 = ["korona", "spod", "koronaSez", "srodek", "spodDuzy", "tortilla", "ser", "cebulka"], rz2 = ["ogorek", "salata", "pomidor", "ketchup", "musztarda", "sosSpec", "sosMajo"];
    rz1.forEach((k, i) => P.poj.push({ k, x: -59.5 + i * 17, z: 31, w: 16, d: 16 })); rz2.forEach((k, i) => P.poj.push({ k, x: -51 + i * 17, z: 49, w: 16, d: 16 }));
    return P;
  }
  const P = { blat: { x: 0, z: 5, w: 84, d: 168 }, sciana: -76,
    toster: { x: -20, z: -62, w: 34, d: 22 }, fryt: { x: 21, z: -62, w: 34, d: 24 },
    grill: { x: -9, z: -36, w: 58, d: 24 }, mroz: { x: 30, z: -36, w: 16, d: 18 },
    lopatka: { x: -28, z: -15 }, szczypce: { x: -11, z: -15 }, mrozK: { x: 30, z: -15, w: 16, d: 16 },
    papier: { x: -8, z: 8, r: 17 }, poj: [] };
  ["ketchup", "musztarda", "sosSpec", "sosMajo"].forEach((k, i) => P.poj.push({ k, x: 30, z: -1 + i * 8.6, w: 16, d: 8.2, sos: true }));
  ["korona", "spod", "koronaSez", "srodek", "spodDuzy", "tortilla", "ser", "cebulka", "ogorek", "salata", "pomidor"].forEach((k, i) => P.poj.push({ k, x: -28.5 + (i % 4) * 19, z: 42 + Math.floor(i / 4) * 19, w: 18, d: 18 }));
  return P;
}

/* ===================================================== klasa sceny */
export class Kuchnia3D {
  constructor(canvas) {
    this.cv = canvas;
    this.r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); this.r.setPixelRatio(Math.min(2, devicePixelRatio));
    this.r.outputColorSpace = THREE.SRGBColorSpace; this.r.toneMapping = THREE.ACESFilmicToneMapping; this.r.toneMappingExposure = 1.05; this.r.shadowMap.enabled = true; this.r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.sc = new THREE.Scene(); this.sc.environment = new THREE.PMREMGenerator(this.r).fromScene(new RoomEnvironment(), 0.04).texture; this.sc.environmentIntensity = 0.85;
    this.cam = new THREE.PerspectiveCamera(32, 1, 1, 2000);
    const sw = new THREE.DirectionalLight("#fff6e8", 2.4); sw.position.set(-40, 140, 60); sw.castShadow = true; sw.shadow.mapSize.set(2048, 2048); sw.shadow.bias = -0.0004; sw.shadow.radius = 4;
    Object.assign(sw.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 10, far: 400 }); this.sc.add(sw, sw.target); this.sw = sw;
    this.sc.add(new THREE.HemisphereLight("#fff2d6", "#6d4a2c", 0.6));
    this.ray = new THREE.Raycaster(); this.plaszczyzna = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.grupaStal = new THREE.Group(); this.sc.add(this.grupaStal); this.dyn = new THREE.Group(); this.sc.add(this.dyn);
    this.para = this.stworzPare(); this.sc.add(this.para.pts);
  }
  zbuduj(pion, pokazFryt) {
    this.pion = pion; this.P = plan(pion); const P = this.P, m = mat(); this.grupaStal.clear(); this.cele = [];
    const G = this.grupaStal, dodajCel = (o, cel) => { o.traverse(x => x.userData.cel = cel); this.cele.push(o); };
    // blat i ściana z kaflami
    const blat = new THREE.Mesh(new THREE.BoxGeometry(P.blat.w, 4, P.blat.d), m.stal); blat.position.set(P.blat.x, -2, P.blat.z); blat.receiveShadow = true; G.add(blat);
    const sciana = new THREE.Mesh(new THREE.PlaneGeometry(P.blat.w + 40, 60), m.kafle); sciana.position.set(0, 26, P.sciana); sciana.receiveShadow = true; G.add(sciana);
    // TOSTER (opiekacz płytowy)
    { const T = P.toster, g = new THREE.Group(); g.position.set(T.x, 0, T.z);
      const kor = new THREE.Mesh(new THREE.BoxGeometry(T.w, 6, T.d), m.stal); kor.position.y = 3; kor.castShadow = kor.receiveShadow = true; g.add(kor);
      const pl = new THREE.Mesh(new THREE.BoxGeometry(T.w - 3, 0.3, T.d - 3), m.grzalka); pl.position.y = 6.15; g.add(pl);
      const tyl = new THREE.Mesh(new THREE.BoxGeometry(T.w, 8, 2), m.stal); tyl.position.set(0, 10, -T.d / 2 + 1); tyl.castShadow = true; g.add(tyl);
      const lampka = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), new THREE.MeshStandardMaterial({ color: "#ff3b1f", emissive: "#ff3b1f", emissiveIntensity: 2 })); lampka.position.set(T.w / 2 - 3, 4, T.d / 2 + 0.1); g.add(lampka);
      G.add(g); dodajCel(g, { typ: "toster" }); }
    // GRILL
    { const R = P.grill, g = new THREE.Group(); g.position.set(R.x, 0, R.z);
      const kor = new THREE.Mesh(new THREE.BoxGeometry(R.w, 6, R.d), m.stal); kor.position.y = 3; kor.castShadow = kor.receiveShadow = true; g.add(kor);
      const pl = new THREE.Mesh(new THREE.BoxGeometry(R.w - 2, 0.5, R.d - 2), m.plyta); pl.position.y = 6.25; pl.receiveShadow = true; g.add(pl);
      const tyl = new THREE.Mesh(new THREE.BoxGeometry(R.w, 7, 1.2), m.stal); tyl.position.set(0, 9.5, -R.d / 2 + 0.6); g.add(tyl);
      for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3, R.d), m.stal); b.position.set(s * (R.w / 2 - 0.6), 7.5, 0); g.add(b); }
      const ryn = new THREE.Mesh(new THREE.BoxGeometry(R.w - 4, 1.2, 2.2), m.stalCiemna); ryn.position.set(0, 6.2, R.d / 2 + 1); g.add(ryn);
      G.add(g); dodajCel(g, { typ: "grill" }); }
    // FRYTOWNICA
    if (pokazFryt) { const F = P.fryt, g = new THREE.Group(); g.position.set(F.x, 0, F.z);
      const kor = new THREE.Mesh(new THREE.BoxGeometry(F.w, 8, F.d), m.stal); kor.position.y = 4; kor.castShadow = kor.receiveShadow = true; g.add(kor);
      const olej = new THREE.Mesh(new THREE.BoxGeometry(F.w - 5, 0.3, F.d - 5), m.olej); olej.position.y = 7.6; g.add(olej);
      const rama = skrzynka(F.w - 3, 2, F.d - 3, m.stal); rama.position.y = 7; g.add(rama);
      const kosz = new THREE.Group(); const siat = skrzynka(F.w - 8, 5, F.d - 8, m.siatka, m.siatka, 0.2); kosz.add(siat);
      const uch = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 12, 10), new THREE.MeshStandardMaterial({ color: "#151515" })); uch.rotation.x = Math.PI / 2 - 0.5; uch.position.set(0, 5, (F.d - 8) / 2 + 5); kosz.add(uch);
      kosz.position.y = 10; g.add(kosz); this.kosz = kosz;
      G.add(g); dodajCel(g, { typ: "kosz" }); }
    else this.kosz = null;
    // ZAMRAŻARKI
    for (const [klucz, kk] of [["mroz", "wolowina"], ["mrozK", "kurczak"]]) { if (klucz === "mrozK" && !pokazFryt) continue; const Z = P[klucz], g = skrzynka(Z.w, 7, Z.d, m.stal, m.szron); g.position.set(Z.x, 0, Z.z);
      for (let i = 0; i < 3; i++) { const s = stworzSkladnik(kk, { mrozony: true, id: klucz + i }); s.position.set((i - 1) * (kk === "kurczak" ? 4.6 : 1.2), 0.6 + i * (kk === "kurczak" ? 0 : 1.2), (i - 1) * (kk === "kurczak" ? 0 : 1.2)); if (kk === "kurczak") s.rotation.y = 1.5 + i * 0.1; s.scale.setScalar(kk === "kurczak" ? 0.9 : 1.2 * Math.min(1, Z.w / 14)); g.add(s); }
      G.add(g); dodajCel(g, { typ: klucz }); }
    // PAPIER
    { const pa = new THREE.Mesh(new THREE.PlaneGeometry(P.papier.r * 2.1, P.papier.r * 2.1), m.papier); pa.rotation.x = -Math.PI / 2; pa.rotation.z = 0.25; pa.position.set(P.papier.x, 0.05, P.papier.z); pa.receiveShadow = true; G.add(pa); dodajCel(pa, { typ: "papier" }); }
    // NARZĘDZIA
    this.narz = {};
    { const l = lopatka(); l.position.set(P.lopatka.x, 0.2, P.lopatka.z); l.rotation.y = 0.6; G.add(l); dodajCel(l, { typ: "narz", n: "lopatka" }); this.narz.lopatka = l; }
    if (pokazFryt) { const s = szczypce(); s.position.set(P.szczypce.x, 0.2, P.szczypce.z); s.rotation.y = -0.5; G.add(s); dodajCel(s, { typ: "narz", n: "szczypce" }); this.narz.szczypce = s; }
    // POJEMNIKI
    for (const p of P.poj) {
      if (["ketchup", "musztarda", "sosSpec", "sosMajo"].includes(p.k)) { const NAP = { ketchup: "KETCHUP", musztarda: "MUSZTARDA", sosSpec: "SPECJALNY", sosMajo: "MAJO" };
        const b = butelka(SOS_KOL[p.k], NAP[p.k]); b.position.set(p.x, 0, p.z); b.scale.setScalar(this.pion ? 0.95 : 1.05); if (this.pion) { b.rotation.z = Math.PI / 2; b.position.y = 2.8; b.position.x = p.x + 7; /* leży na blacie, dziobkiem do środka */ } G.add(b); dodajCel(b, { typ: "poj", k: p.k }); p.obiekt = b; continue; }
      const g = skrzynka(p.w, 6, p.d, m.stal, m.stalCiemna); g.position.set(p.x, 0, p.z);
      const bulka = ["korona", "spod", "koronaSez", "srodek", "spodDuzy"].includes(p.k), n = bulka ? 2 : p.k === "tortilla" ? 3 : 1;
      for (let i = 0; i < n; i++) { const s = stworzSkladnik(p.k, { id: p.k + i, opieczenie: 0 }); const sk = p.k === "tortilla" ? (p.w - 2) / 21 : p.k === "ser" ? (p.w - 3) / 12.2 : bulka ? (p.w - 2.6) / 12.2 : p.k === "pomidor" || p.k === "ogorek" ? 1 : (p.w - 2) / 10.5; s.scale.setScalar(sk);
        s.position.set(bulka ? (i - 0.5) * 0.8 : 0, 0.5 + i * (bulka ? WYS[p.k] * sk * 0.7 : 0.25), bulka ? (i - 0.5) * 0.8 : 0); g.add(s); }
      if (p.k === "ogorek" || p.k === "pomidor") { for (let i = 0; i < (p.k === "ogorek" ? 9 : 4); i++) { const s = stworzSkladnik(p.k, { id: p.k + "x" + i }); const a = i * 2.4; s.position.set(Math.cos(a) * (p.k === "ogorek" ? 4.5 : 3.5) * (i ? 1 : 0), 0.5 + i * 0.12, Math.sin(a) * (p.k === "ogorek" ? 4.5 : 3.5) * (i ? 1 : 0)); s.rotation.x = (i % 3 - 1) * 0.15; g.add(s); } }
      if (p.k === "ser") for (let i = 0; i < 4; i++) { const s = stworzSkladnik("ser", {}); s.scale.setScalar((p.w - 3) / 12.2); s.position.y = 0.7 + i * 0.16; s.rotation.y = i * 0.05; g.add(s); }
      G.add(g); dodajCel(g, { typ: "poj", k: p.k }); p.obiekt = g;
    }
    this.dopasujKamere();
  }
  rozmiar(w, h) { this.W = w; this.H = h; this.r.setSize(w, h, false); this.cam.aspect = w / h; this.dopasujKamere(); }
  dopasujKamere() {
    if (!this.P || !this.W) return; const B = this.P.blat, el = this.pion ? 1.02 : 0.84, c = new THREE.Vector3(B.x, 0, B.z + (this.pion ? 4 : 2));
    const kier = new THREE.Vector3(0, Math.sin(el), Math.cos(el)), rog = [];
    for (const x of [-1, 1]) for (const z of [-1, 1]) rog.push(new THREE.Vector3(B.x + x * B.w / 2, 0, B.z + z * B.d / 2));
    const tyl = Math.min(this.P.toster.z - this.P.toster.d / 2, this.P.grill.z - this.P.grill.d / 2); rog.push(new THREE.Vector3(B.x - B.w / 2, 12, tyl), new THREE.Vector3(B.x + B.w / 2, 12, tyl));
    let lo = 50, hi = 2000;
    for (let i = 0; i < 30; i++) { const d = (lo + hi) / 2; this.cam.position.copy(c).addScaledVector(kier, d); this.cam.lookAt(c); this.cam.updateMatrixWorld(); this.cam.updateProjectionMatrix();
      const ok = rog.every(p => { const v = p.clone().project(this.cam); return Math.abs(v.x) <= 0.995 && Math.abs(v.y) <= 0.99; }); if (ok) hi = d; else lo = d; }
    this.cam.position.copy(c).addScaledVector(kier, hi); this.cam.lookAt(c); this.cam.updateMatrixWorld();
  }
  promien(x, y) { const v = new THREE.Vector2(x / this.W * 2 - 1, -(y / this.H) * 2 + 1); this.ray.setFromCamera(v, this.cam); return this.ray; }
  trafienie(x, y, dodatkowe = []) { const r = this.promien(x, y), h = r.intersectObjects([...dodatkowe, ...this.cele], true); for (const t of h) { let o = t.object; while (o && !o.userData.cel) o = o.parent; if (o) return { cel: o.userData.cel, punkt: t.point }; } return null; }
  naPoziom(x, y, wys = 0) { const r = this.promien(x, y), p = new THREE.Vector3(); this.plaszczyzna.constant = -wys; return r.ray.intersectPlane(this.plaszczyzna, p) ? p : null; }
  rzut(v) { const p = v.clone().project(this.cam); return { x: (p.x + 1) / 2 * this.W, y: (1 - p.y) / 2 * this.H, z: p.z }; }
  stworzPare() {
    const n = 140, geo = new THREE.BufferGeometry(), poz = new Float32Array(n * 3), zycie = new Float32Array(n); geo.setAttribute("position", new THREE.BufferAttribute(poz, 3));
    const t = tekstura(64, 64, (g, w) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 5, map: t, transparent: true, depthWrite: false, opacity: 0.6 })); pts.frustumCulled = false;
    return { pts, poz, zycie, n, i: 0 };
  }
  emituj(x, y, z, ile = 1) { const P = this.para; for (let k = 0; k < ile; k++) { const i = P.i = (P.i + 1) % P.n; P.poz[i * 3] = x + (Math.random() - 0.5) * 6; P.poz[i * 3 + 1] = y; P.poz[i * 3 + 2] = z + (Math.random() - 0.5) * 4; P.zycie[i] = 1; } }
  krokPary(dt) { const P = this.para; for (let i = 0; i < P.n; i++) { if (P.zycie[i] <= 0) { P.poz[i * 3 + 1] = -999; continue; } P.zycie[i] -= dt * 0.7; P.poz[i * 3 + 1] += dt * 9; P.poz[i * 3] += Math.sin(i + P.poz[i * 3 + 1] * 0.3) * dt * 2; } P.pts.geometry.attributes.position.needsUpdate = true; }
  render() { this.r.render(this.sc, this.cam); }
}
