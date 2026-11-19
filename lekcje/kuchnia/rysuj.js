/* Mistrz Kanapek – rysowanie realistycznych składników na canvasie 2D (perspektywa 3/4). */
export const P = 0.36;                     // spłaszczenie elips (perspektywa)
const los = s => { let a = 0; for (const c of String(s)) a = (a * 31 + c.charCodeAt(0)) >>> 0; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296); };

function elipsa(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); }
function cien(g, x, y, r) { const gr = g.createRadialGradient(x, y, r * 0.2, x, y, r * 1.1); gr.addColorStop(0, "rgba(0,0,0,.28)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; elipsa(g, x, y, r * 1.1, r * P * 1.15); g.fill(); }
/* ściana boczna dysku: od elipsy górnej (y) do dolnej (y+t) */
function bok(g, x, y, r, t, k1, k2) {
  const gr = g.createLinearGradient(x - r, 0, x + r, 0); gr.addColorStop(0, k2); gr.addColorStop(0.45, k1); gr.addColorStop(1, k2);
  g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * P, 0, 0, Math.PI); g.lineTo(x - r, y); g.ellipse(x, y + t, r, r * P, 0, Math.PI, 0, true); g.closePath(); g.fill();
}
const mix = (a, b, t) => { const h = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); const A = h(a), B = h(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`; };

/* ---------------- BUŁKI ---------------- */
function sezam(g, x, y, r, h, ziarno) {
  const R = los(ziarno); g.fillStyle = "#f3e2b4";
  for (let i = 0; i < 46; i++) { const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 0.85; const px = x + Math.cos(a) * d * r, py = y - h * (1 - d * d) * 0.85 + Math.sin(a) * d * r * P; g.save(); g.translate(px, py); g.rotate(R() * 3); elipsa(g, 0, 0, r * 0.035, r * 0.016); g.fill(); g.restore(); }
}
export function bulkaKorona(g, x, y, r, o = {}) {
  const opiek = o.opieczenie ?? 0, h = r * (o.wys ?? 0.62);
  if (o.odwrocona) {          // przekrojem do góry: widać miąższ, kopuła pod spodem
    g.fillStyle = mix("#c98a3d", "#8a4f1e", opiek * 0.6); g.beginPath(); g.ellipse(x, y, r, r * P, 0, 0, Math.PI); g.ellipse(x, y + h * 0.55, r * 0.92, r * P * 0.9, 0, Math.PI, 0, true); g.closePath(); g.fill();
    const gr = g.createRadialGradient(x, y, r * 0.1, x, y, r); gr.addColorStop(0, mix("#f6e3b5", "#d9a45c", opiek)); gr.addColorStop(0.85, mix("#efd398", "#c4843a", opiek)); gr.addColorStop(1, "#b9772f");
    g.fillStyle = gr; elipsa(g, x, y, r, r * P); g.fill(); porowatosc(g, x, y, r, o.id || "k"); return;
  }
  const gr = g.createRadialGradient(x - r * 0.3, y - h * 0.9, r * 0.1, x, y - h * 0.3, r * 1.2);
  gr.addColorStop(0, mix("#f0b866", "#c98034", opiek * 0.3)); gr.addColorStop(0.55, mix("#d68d3b", "#a5601f", opiek * 0.4)); gr.addColorStop(1, "#8a4b18");
  g.fillStyle = gr; g.beginPath(); g.moveTo(x - r, y); g.bezierCurveTo(x - r, y - h * 1.25, x + r, y - h * 1.25, x + r, y); g.ellipse(x, y, r, r * P, 0, 0, Math.PI); g.closePath(); g.fill();
  g.fillStyle = "rgba(255,240,200,.25)"; elipsa(g, x - r * 0.28, y - h * 0.72, r * 0.32, h * 0.18); g.fill();
  if (o.sezam) sezam(g, x, y, r, h, o.id || "s");
}
export function bulkaSpod(g, x, y, r, o = {}) {
  const opiek = o.opieczenie ?? 0, t = r * 0.2;
  bok(g, x, y, r, t, "#d99a4d", "#a5652a"); g.fillStyle = "#8a4b18"; elipsa(g, x, y + t, r, r * P); g.globalAlpha = 0.25; g.fill(); g.globalAlpha = 1;
  const gr = g.createRadialGradient(x, y, r * 0.1, x, y, r); gr.addColorStop(0, mix("#f6e3b5", "#d9a45c", opiek)); gr.addColorStop(0.9, mix("#ecd092", "#c4843a", opiek)); gr.addColorStop(1, "#b5722c");
  g.fillStyle = gr; elipsa(g, x, y, r, r * P); g.fill(); porowatosc(g, x, y, r, o.id || "p");
}
export function bulkaSrodek(g, x, y, r, o = {}) { bulkaSpod(g, x, y, r, o); }
function porowatosc(g, x, y, r, id) { const R = los(id + "por"); g.fillStyle = "rgba(160,110,50,.18)"; for (let i = 0; i < 40; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * 0.8; elipsa(g, x + Math.cos(a) * d * r, y + Math.sin(a) * d * r * P, r * 0.03, r * 0.012); g.fill(); } }

/* ---------------- MIĘSO ---------------- */
export function kotlet(g, x, y, r, o = {}) {
  // o.gora: stopień usmażenia widocznej strony 0..1.6, o.dol: spodniej (widać na boku)
  const R = los(o.id || "m"), t = r * 0.16, gora = o.gora ?? 1, dol = o.dol ?? gora;
  const kol = s => s < 0.05 ? "#c7646a" : s < 0.85 ? mix("#b86a5f", "#6e4126", s / 0.85) : s < 1.25 ? mix("#6e4126", "#4a2a17", (s - 0.85) / 0.4) : mix("#4a2a17", "#1b120c", Math.min(1, (s - 1.25) / 0.35));
  const kontur = []; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; kontur.push([Math.cos(a) * r * (0.94 + R() * 0.08), Math.sin(a) * r * P * (0.94 + R() * 0.08)]); }
  g.fillStyle = kol(dol); g.beginPath(); kontur.forEach(([a, b], i) => i ? g.lineTo(x + a, y + b + t) : g.moveTo(x + a, y + b + t)); g.closePath(); g.fill();
  g.fillRect(x - r * 0.97, y, r * 1.94, t);
  const gr = g.createRadialGradient(x - r * 0.2, y - r * P * 0.3, r * 0.1, x, y, r); gr.addColorStop(0, kol(gora * 0.92)); gr.addColorStop(1, kol(Math.min(1.6, gora * 1.08)));
  g.fillStyle = gr; g.beginPath(); kontur.forEach(([a, b], i) => i ? g.lineTo(x + a, y + b) : g.moveTo(x + a, y + b)); g.closePath(); g.fill();
  // tekstura mięsa mielonego
  for (let i = 0; i < 70; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * 0.9; g.fillStyle = R() > 0.5 ? "rgba(0,0,0,.12)" : "rgba(255,220,200,.08)"; elipsa(g, x + Math.cos(a) * d * r, y + Math.sin(a) * d * r * P, r * 0.04, r * 0.018); g.fill(); }
  if (gora > 0.5) { g.save(); g.beginPath(); kontur.forEach(([a, b], i) => i ? g.lineTo(x + a * 0.92, y + b * 0.92) : g.moveTo(x + a * 0.92, y + b * 0.92)); g.closePath(); g.clip(); g.strokeStyle = `rgba(20,10,5,${Math.min(0.5, (gora - 0.5) * 0.8)})`; g.lineWidth = r * 0.05; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x - r * 0.75 + i * r * 0.18, y - r * P * 0.7); g.lineTo(x + r * 0.35 + i * r * 0.18, y + r * P * 0.7); g.stroke(); } g.restore(); }
  if (gora < 0.05 && o.mrozony) { g.fillStyle = "rgba(230,240,255,.45)"; elipsa(g, x, y, r * 0.9, r * P * 0.85); g.fill(); }
  if (o.para) { g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 2; const T = performance.now() / 600; for (let i = 0; i < 3; i++) { g.beginPath(); const bx = x - r * 0.4 + i * r * 0.4; for (let k = 0; k < 8; k++) g.lineTo(bx + Math.sin(T + k * 0.8 + i) * 4, y - 6 - k * 5 - ((T * 20) % 10)); g.stroke(); } }
}

/* ---------------- SER ---------------- */
export function ser(g, x, y, r, o = {}) {
  const s = r * 0.92, top = o.topnienie ?? 0, kor = [[-s, 0], [0, -s * P], [s, 0], [0, s * P]];   // kwadrat obrócony o 45°
  g.fillStyle = "#f0a51c"; g.beginPath(); kor.forEach(([a, b], i) => i ? g.lineTo(x + a, y + b) : g.moveTo(x + a, y + b)); g.closePath(); g.fill();
  g.fillStyle = "#e38f0f"; g.fillRect(x - s, y, s * 2, r * 0.04);
  if (top > 0.05) { // roztopione rogi spływają po krawędzi
    g.fillStyle = "#f2a91f"; for (const [a, b] of [[-s, 0], [s, 0], [0, s * P]]) { g.beginPath(); g.moveTo(x + a * 0.85 - 8, y + b); g.quadraticCurveTo(x + a, y + b + top * r * 0.35, x + a * 0.85 + 8, y + b); g.fill(); }
  }
  const gr = g.createLinearGradient(x - s, y - s * P, x + s, y + s * P); gr.addColorStop(0, "#ffd36b"); gr.addColorStop(1, "#f6b230");
  g.fillStyle = gr; g.beginPath(); kor.forEach(([a, b], i) => { const k = 1 - top * 0.12; i ? g.lineTo(x + a * k, y + b * k - 1) : g.moveTo(x + a * k, y + b * k - 1); }); g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,.25)"; elipsa(g, x - s * 0.25, y - s * P * 0.25, s * 0.3, s * P * 0.15); g.fill();
}

/* ---------------- SOSY ---------------- */
export const SOSY = { ketchup: ["#b3150d", "#e2372a"], musztarda: ["#c99a00", "#f2c40f"], sosSpec: ["#d27a3b", "#f0a46a"], sosMajo: ["#e9e2cc", "#fffaf0"] };
export function sos(g, x, y, r, rodzaj, ile = 1, id = "s") {
  const [k1, k2] = SOSY[rodzaj] || SOSY.ketchup, R = los(id), obroty = 1.2 + Math.min(2, ile) * 0.9, sz = r * (0.06 + Math.min(1.6, ile) * 0.03);
  g.lineCap = "round"; g.lineJoin = "round";
  for (const [kol, w, dy] of [[k1, sz * 1.25, 1.5], [k2, sz, 0]]) {
    g.strokeStyle = kol; g.lineWidth = w; g.beginPath();
    for (let a = 0; a < obroty * Math.PI * 2; a += 0.15) { const d = (a / (obroty * Math.PI * 2)) * r * 0.62 * (0.6 + 0.4 * Math.min(1.5, ile)); g.lineTo(x + Math.cos(a) * d + (R() - 0.5) * 2, y + dy + Math.sin(a) * d * P); }
    g.stroke();
  }
  g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = sz * 0.3; g.beginPath(); for (let a = 0.5; a < obroty * 4; a += 0.2) { const d = (a / (obroty * Math.PI * 2)) * r * 0.62; g.lineTo(x + Math.cos(a) * d - sz * 0.2, y - sz * 0.2 + Math.sin(a) * d * P); } g.stroke();
}

/* ---------------- WARZYWA ---------------- */
export function cebulka(g, x, y, r, id = "c") { const R = los(id); for (let i = 0; i < 60; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * 0.7; g.fillStyle = R() > 0.5 ? "rgba(250,248,235,.95)" : "rgba(225,220,190,.9)"; g.save(); g.translate(x + Math.cos(a) * d * r, y + Math.sin(a) * d * r * P); g.rotate(R() * 3); g.fillRect(-r * 0.035, -r * 0.012, r * 0.07, r * 0.024); g.restore(); } }
export function ogorek(g, x, y, r, id = "o") {
  const rr = r * 0.33; g.fillStyle = "#3f6b1f"; elipsa(g, x, y + 2, rr, rr * P); g.fill();
  const gr = g.createRadialGradient(x, y, 1, x, y, rr); gr.addColorStop(0, "#d9e59a"); gr.addColorStop(0.7, "#a8c160"); gr.addColorStop(0.92, "#7d9b3a"); gr.addColorStop(1, "#3f6b1f");
  g.fillStyle = gr; elipsa(g, x, y, rr, rr * P); g.fill();
  g.fillStyle = "rgba(240,245,200,.9)"; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; elipsa(g, x + Math.cos(a) * rr * 0.45, y + Math.sin(a) * rr * 0.45 * P, rr * 0.08, rr * 0.05); g.fill(); }
  g.strokeStyle = "rgba(60,90,20,.4)"; g.lineWidth = 1; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; g.beginPath(); g.moveTo(x + Math.cos(a) * rr * 0.8, y + Math.sin(a) * rr * 0.8 * P); g.lineTo(x + Math.cos(a) * rr * 0.95, y + Math.sin(a) * rr * 0.95 * P); g.stroke(); }
}
export function salata(g, x, y, r, id = "l") { const R = los(id); for (let i = 0; i < 70; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * 0.85; g.strokeStyle = R() > 0.6 ? "#dbeec0" : R() > 0.3 ? "#b5d77f" : "#8fbf55"; g.lineWidth = r * 0.03; g.lineCap = "round"; const px = x + Math.cos(a) * d * r, py = y + Math.sin(a) * d * r * P - r * 0.03, an = R() * 3.14; g.beginPath(); g.moveTo(px - Math.cos(an) * r * 0.09, py - Math.sin(an) * r * 0.03); g.quadraticCurveTo(px, py - r * 0.04, px + Math.cos(an) * r * 0.09, py + Math.sin(an) * r * 0.03); g.stroke(); } }
export function pomidor(g, x, y, r, id = "t") {
  const rr = r * 0.62, t = r * 0.07; bok(g, x, y, rr, t, "#d1372a", "#9c1f16");
  const gr = g.createRadialGradient(x, y, 1, x, y, rr); gr.addColorStop(0, "#f0a090"); gr.addColorStop(0.5, "#e2493a"); gr.addColorStop(1, "#c42a1f"); g.fillStyle = gr; elipsa(g, x, y, rr, rr * P); g.fill();
  for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + 0.4; g.fillStyle = "rgba(250,200,120,.75)"; elipsa(g, x + Math.cos(a) * rr * 0.5, y + Math.sin(a) * rr * 0.5 * P, rr * 0.22, rr * 0.22 * P); g.fill(); g.fillStyle = "#f6e4a0"; for (let k = 0; k < 4; k++) { elipsa(g, x + Math.cos(a) * rr * 0.5 + (k - 1.5) * 3, y + Math.sin(a) * rr * 0.5 * P, 1.6, 1.1); g.fill(); } }
}

/* ---------------- TORTILLA I KURCZAK ---------------- */
export function tortilla(g, x, y, r, o = {}) {
  const R = los(o.id || "w"), rr = r * 1.35, opiek = o.opieczenie ?? 0;
  const gr = g.createRadialGradient(x, y, 1, x, y, rr); gr.addColorStop(0, mix("#f6ead0", "#efd9ad", opiek)); gr.addColorStop(1, mix("#ead6ad", "#d8b77d", opiek)); g.fillStyle = gr; elipsa(g, x, y, rr, rr * P); g.fill();
  for (let i = 0; i < 26; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * 0.9; g.fillStyle = `rgba(150,95,40,${0.15 + opiek * 0.25})`; elipsa(g, x + Math.cos(a) * d * rr, y + Math.sin(a) * d * rr * P, rr * 0.04, rr * 0.02); g.fill(); }
}
export function kurczak(g, x, y, r, o = {}) {
  const R = los(o.id || "k"), w = r * 0.85, h = r * 0.24, s = o.smazenie ?? 1;
  const kol = s < 0.05 ? "#e8d6b0" : s < 1.0 ? mix("#e8c88a", "#c98a3a", s) : s < 1.35 ? "#c98a3a" : mix("#c98a3a", "#5a3315", Math.min(1, (s - 1.35) / 0.4));
  g.fillStyle = mix("#c98a3a", "#7a4a1f", 0.4); g.beginPath(); g.ellipse(x, y + h * 0.35, w * 0.5, h * 0.7, -0.08, 0, 6.28); g.fill();
  const gr = g.createLinearGradient(x, y - h, x, y + h); gr.addColorStop(0, kol); gr.addColorStop(1, mix("#c98a3a", "#7a4a1f", 0.3));
  g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, w * 0.5, h * 0.62, -0.08, 0, 6.28); g.fill();
  for (let i = 0; i < 40; i++) { g.fillStyle = R() > 0.5 ? "rgba(255,230,170,.5)" : "rgba(120,60,20,.35)"; elipsa(g, x + (R() - 0.5) * w * 0.9, y + (R() - 0.5) * h * 1.0, 1.6, 1.2); g.fill(); }
}

/* ---------------- WARSTWA (do stosu na stole montażowym) ---------------- */
export const GRUBOSC = { korona: 0.55, koronaSez: 0.6, spod: 0.2, spodDuzy: 0.22, srodek: 0.2, tortilla: 0.04, wolowina: 0.16, kurczak: 0.2, ser: 0.04, ketchup: 0.02, musztarda: 0.015, sosSpec: 0.03, sosMajo: 0.03, cebulka: 0.02, ogorek: 0.03, salata: 0.07, pomidor: 0.07 };
export function warstwa(g, k, x, y, r, st = {}) {
  const id = st.id || k;
  switch (k) {
    case "korona": case "koronaSez": return bulkaKorona(g, x, y, r, { ...st, sezam: k === "koronaSez", id });
    case "spod": case "spodDuzy": return bulkaSpod(g, x, y, r, { ...st, id });
    case "srodek": return bulkaSrodek(g, x, y, r, { ...st, id });
    case "wolowina": return kotlet(g, x, y, r * 0.98, { gora: st.gora ?? 1, dol: st.dol ?? 1, id });
    case "ser": return ser(g, x, y, r, st);
    case "ketchup": case "musztarda": case "sosSpec": case "sosMajo": return sos(g, x, y, r, k, st.ile ?? 1, id);
    case "cebulka": return cebulka(g, x, y, r, id);
    case "ogorek": return ogorek(g, x, y, r, id);
    case "salata": return salata(g, x, y, r, id);
    case "pomidor": return pomidor(g, x, y, r, id);
    case "tortilla": return tortilla(g, x, y, r, st);
    case "kurczak": return kurczak(g, x, y, r, { ...st, id });
  }
}

/* ---------------- NARZĘDZIA I SPRZĘT ---------------- */
export function lopatka(g, x, y, s = 1, kat = -0.5) {
  g.save(); g.translate(x, y); g.rotate(kat); g.scale(s, s);
  g.fillStyle = "#2b2b2b"; g.beginPath(); g.roundRect(-8, 26, 16, 70, 6); g.fill();                 // rękojeść
  g.fillStyle = "#777"; g.fillRect(-3, 6, 6, 24);
  const gr = g.createLinearGradient(-30, -40, 30, 10); gr.addColorStop(0, "#f4f6f8"); gr.addColorStop(0.5, "#b9c0c7"); gr.addColorStop(1, "#8d959d");
  g.fillStyle = gr; g.beginPath(); g.moveTo(-28, -46); g.lineTo(28, -46); g.lineTo(22, 8); g.lineTo(-22, 8); g.closePath(); g.fill();
  g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 1; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 8, -38); g.lineTo(i * 6, -4); g.stroke(); }
  g.restore();
}
export function szczypce(g, x, y, s = 1, otwarte = 0.3) {
  g.save(); g.translate(x, y); g.scale(s, s);
  for (const k of [-1, 1]) { g.save(); g.rotate(k * otwarte * 0.3); const gr = g.createLinearGradient(-6, 0, 6, 0); gr.addColorStop(0, "#9aa1a8"); gr.addColorStop(0.5, "#eef1f3"); gr.addColorStop(1, "#8b9299"); g.fillStyle = gr; g.beginPath(); g.roundRect(-5 + k * 5, -50, 9, 92, 4); g.fill(); g.fillStyle = "#c0392b"; g.beginPath(); g.roundRect(-5 + k * 5, 20, 9, 26, 4); g.fill(); g.restore(); }
  g.restore();
}
export function butelka(g, x, y, s, kolor, napis) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const gr = g.createLinearGradient(-22, 0, 22, 0); gr.addColorStop(0, kolor[0]); gr.addColorStop(0.45, kolor[1]); gr.addColorStop(1, kolor[0]);
  g.fillStyle = gr; g.beginPath(); g.roundRect(-20, -30, 40, 76, 12); g.fill();
  g.fillStyle = "#f5f5f5"; g.beginPath(); g.moveTo(-12, -30); g.lineTo(12, -30); g.lineTo(5, -46); g.lineTo(-5, -46); g.closePath(); g.fill(); g.fillRect(-2, -58, 4, 14);
  g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(-14, -22, 6, 56);
  if (napis) { g.fillStyle = "rgba(255,255,255,.9)"; g.beginPath(); g.roundRect(-17, 0, 34, 16, 4); g.fill(); g.fillStyle = "#333"; g.font = "700 9px system-ui"; g.textAlign = "center"; g.fillText(napis, 0, 11); }
  g.restore();
}
