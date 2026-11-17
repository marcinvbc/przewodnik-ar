/*
 * BIBLIOTEKA BUDYNKÓW PARAMETRYCZNYCH (three.js) – do aranżacji przestrzeni miejskiej w AR.
 * Wszystkie wymiary w metrach, skala 1:1. Początek układu: środek obrysu na poziomie terenu, front budynku w stronę +z.
 * Każdy typ ma parametry (kondygnacje, wymiary, kolory, dach) – grupa dopasowuje budynek do otoczenia.
 */
import * as THREE from "three";

const H_KOND = 3.1;                         // wysokość kondygnacji
const M = {};
const mat = (kolor, o = {}) => { const k = kolor + JSON.stringify(o); return M[k] || (M[k] = new THREE.MeshStandardMaterial({ color: kolor, roughness: 0.82, metalness: 0.02, ...o })); };
const szklo = () => mat("#3c4f5c", { roughness: 0.15, metalness: 0.55 });
const ciemny = () => mat("#2b2b2b");
const box = (w, h, d, m) => { const x = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); x.castShadow = x.receiveShadow = true; return x; };

/** Okna na prostokątnej ścianie: oś „u” wzdłuż ściany, normalna ściany = n (±x / ±z). */
function okna(g, { dl, y0, kond, nOkien, n, odl, szer = 1.3, wys = 1.6, kolorRamy = "#f4f1ea", parter = null, balkony = false, kolorBalk = "#555" }) {
  const rama = mat(kolorRamy), sz = szklo(), b = mat(kolorBalk);
  const krok = dl / nOkien;
  for (let f = 0; f < kond; f++) for (let i = 0; i < nOkien; i++) {
    const u = -dl / 2 + krok * (i + 0.5), y = y0 + f * H_KOND + 0.9;
    let w = szer, h = wys;
    if (f === 0 && parter === "witryny") { w = krok * 0.82; h = 2.4; }
    if (f === 0 && parter === "drzwi" && i === Math.floor(nOkien / 2)) { w = 1.2; h = 2.2; }
    const yy = f === 0 && (parter === "witryny" || (parter === "drzwi" && i === Math.floor(nOkien / 2))) ? y0 + 0.05 : y;
    const r = box(w + 0.16, h + 0.16, 0.08, rama), s = box(w, h, 0.1, sz);
    for (const m of [r, s]) {
      if (n === "z") m.position.set(u, yy + (m === r ? h / 2 : h / 2), odl + (m === r ? 0.02 : 0.03));
      if (n === "-z") m.position.set(-u, yy + h / 2, -odl - (m === r ? 0.02 : 0.03));
      if (n === "x") { m.rotation.y = Math.PI / 2; m.position.set(odl + 0.03, yy + h / 2, -u); }
      if (n === "-x") { m.rotation.y = -Math.PI / 2; m.position.set(-odl - 0.03, yy + h / 2, u); }
      g.add(m);
    }
    if (balkony && f > 0 && i % 2 === 0 && (n === "z")) {
      const pl = box(w + 1.0, 0.15, 1.2, b); pl.position.set(u, y - 0.1, odl + 0.6); g.add(pl);
      const bar = box(w + 1.0, 1.0, 0.05, mat("#8b939a", { metalness: 0.5, roughness: 0.4, transparent: true, opacity: 0.85 })); bar.position.set(u, y + 0.45, odl + 1.18); g.add(bar);
    }
  }
}

/* ------------------------------------------------------------- dachy */
function dachDwuspadowy(g, szer, gleb, y, wysDachu, kolor, wzdluz = "x") {
  const s = new THREE.Shape(); const a = (wzdluz === "x" ? gleb : szer) / 2 + 0.4;
  s.moveTo(-a, 0); s.lineTo(a, 0); s.lineTo(0, wysDachu); s.closePath();
  const dl = (wzdluz === "x" ? szer : gleb) + 0.6;
  const geo = new THREE.ExtrudeGeometry(s, { depth: dl, bevelEnabled: false }); geo.translate(0, 0, -dl / 2);
  const m = new THREE.Mesh(geo, mat(kolor)); m.castShadow = true;
  if (wzdluz === "x") m.rotation.y = Math.PI / 2;
  m.position.y = y; g.add(m);
  // szczyty (ściany trójkątne) w kolorze elewacji dodaje wywołujący
  return m;
}
function dachKopertowy(g, szer, gleb, y, wysDachu, kolor) {
  const geo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); geo.rotateY(Math.PI / 4);
  const m = new THREE.Mesh(geo, mat(kolor)); m.scale.set(szer + 0.8, wysDachu, gleb + 0.8); m.position.y = y + wysDachu / 2; m.castShadow = true; g.add(m);
}
function dachMansardowy(g, szer, gleb, y, kolor) {
  const dol = new THREE.Mesh(new THREE.CylinderGeometry(Math.SQRT1_2 * 0.82, Math.SQRT1_2, 1, 4, 1), mat(kolor));
  dol.geometry.rotateY(Math.PI / 4); dol.scale.set(szer + 0.3, 2.6, gleb + 0.3); dol.position.y = y + 1.3; dol.castShadow = true; g.add(dol);
  const gora = new THREE.Mesh(new THREE.CylinderGeometry(0.0001, Math.SQRT1_2 * 0.82, 1, 4, 1), mat(kolor));
  gora.geometry.rotateY(Math.PI / 4); gora.scale.set(szer + 0.3, 1.2, gleb + 0.3); gora.position.y = y + 2.6 + 0.6; g.add(gora);
  // lukarny
  for (let i = -1; i <= 1; i++) { const l = box(1.2, 1.3, 1.0, mat("#f4f1ea")); l.position.set(i * szer / 3.2, y + 1.3, gleb / 2 - 0.1); g.add(l); const s = box(0.8, 0.9, 1.02, szklo()); s.position.copy(l.position); g.add(s); }
}
function attyka(g, szer, gleb, y, kolor, wys = 0.9) {
  const m = mat(kolor);
  for (const [w, d, x, z] of [[szer, 0.3, 0, gleb / 2 - 0.15], [szer, 0.3, 0, -gleb / 2 + 0.15], [0.3, gleb, szer / 2 - 0.15, 0], [0.3, gleb, -szer / 2 + 0.15, 0]]) { const a = box(w, wys, d, m); a.position.set(x, y + wys / 2, z); g.add(a); }
  const dach = box(szer - 0.3, 0.1, gleb - 0.3, mat("#6d6d6a")); dach.position.y = y + 0.05; g.add(dach);
}
function gzyms(g, szer, gleb, y, kolor = "#f1ece2") { const c = box(szer + 0.5, 0.35, gleb + 0.5, mat(kolor)); c.position.y = y; g.add(c); }

/* ------------------------------------------------------------- typy */
export const TYPY = {
  kamienica: {
    nazwa: "Kamienica", ikona: "🏛️", opis: "Śródmiejska kamienica z parterem usługowym",
    param: { kondygnacje: 4, szerokosc: 14, glebokosc: 12, elewacja: "#d8bf96", dach: "mansardowy", kolorDachu: "#5d6670", parter: "witryny", balkony: true },
    opcje: { kondygnacje: [2, 7], szerokosc: [8, 24], glebokosc: [8, 18], dach: ["mansardowy", "płaski z attyką", "dwuspadowy"], parter: ["witryny", "drzwi", "okna"] },
    zbuduj(p) {
      const g = new THREE.Group(), H = p.kondygnacje * H_KOND;
      const sciany = box(p.szerokosc, H, p.glebokosc, mat(p.elewacja)); sciany.position.y = H / 2; g.add(sciany);
      const cokol = box(p.szerokosc + 0.1, H_KOND, p.glebokosc + 0.1, mat(new THREE.Color(p.elewacja).multiplyScalar(0.82).getStyle())); cokol.position.y = H_KOND / 2; g.add(cokol);
      for (let f = 1; f < p.kondygnacje; f++) { const pas = box(p.szerokosc + 0.16, 0.18, p.glebokosc + 0.16, mat("#efe8da")); pas.position.y = f * H_KOND; g.add(pas); }
      const n = Math.max(2, Math.round(p.szerokosc / 2.8)), nb = Math.max(2, Math.round(p.glebokosc / 3));
      okna(g, { dl: p.szerokosc, y0: 0, kond: p.kondygnacje, nOkien: n, n: "z", odl: p.glebokosc / 2, parter: p.parter, balkony: p.balkony });
      okna(g, { dl: p.szerokosc, y0: 0, kond: p.kondygnacje, nOkien: n, n: "-z", odl: p.glebokosc / 2 });
      okna(g, { dl: p.glebokosc, y0: 0, kond: p.kondygnacje, nOkien: nb, n: "x", odl: p.szerokosc / 2 });
      okna(g, { dl: p.glebokosc, y0: 0, kond: p.kondygnacje, nOkien: nb, n: "-x", odl: p.szerokosc / 2 });
      gzyms(g, p.szerokosc, p.glebokosc, H);
      if (p.dach === "mansardowy") dachMansardowy(g, p.szerokosc, p.glebokosc, H + 0.17, p.kolorDachu);
      else if (p.dach === "dwuspadowy") { dachDwuspadowy(g, p.szerokosc, p.glebokosc, H + 0.17, 4, p.kolorDachu, "x"); szczyty(g, p, H + 0.17, 4, "x"); }
      else attyka(g, p.szerokosc, p.glebokosc, H + 0.17, p.elewacja);
      if (p.parter === "witryny") { const mark = box(p.szerokosc * 0.9, 0.08, 1.4, mat("#7a2e2e")); mark.position.set(0, 2.75, p.glebokosc / 2 + 0.7); mark.rotation.x = 0.18; g.add(mark); }
      return g;
    },
  },
  plomba: {
    nazwa: "Plomba – nowa kamienica", ikona: "🏗️", opis: "Nowoczesny budynek w lukę pierzei: kamienna siatka, duże okna z balustradami, przeszklony parter, dach mansardowy",
    param: { kondygnacje: 5, szerokosc: 15, glebokosc: 13, elewacja: "#d9cdb8", dach: "mansardowy", kolorDachu: "#7d858b", parter: "witryny", balkony: true },
    opcje: { kondygnacje: [3, 8], szerokosc: [8, 30], glebokosc: [8, 18], dach: ["mansardowy", "płaski z attyką"], parter: ["witryny"] },
    zbuduj(p) {
      const g = new THREE.Group(), H = p.kondygnacje * H_KOND, w = p.szerokosc, d = p.glebokosc;
      const kamien = mat(p.elewacja), kamienJ = mat(new THREE.Color(p.elewacja).lerp(new THREE.Color("#ffffff"), 0.25).getStyle());
      const bryla = box(w - 0.02, H, d, mat(new THREE.Color(p.elewacja).multiplyScalar(0.9).getStyle())); bryla.position.y = H / 2; g.add(bryla);
      // siatka kamiennych lizen i gzymsów na froncie
      const nOsi = Math.max(2, Math.round(w / 3.4)), krok = (w - 0.9) / nOsi, zf = d / 2;
      for (let i = 0; i <= nOsi; i++) { const l = box(i === 0 || i === nOsi ? 0.9 : 0.55, H, 0.45, kamienJ); l.position.set(-w / 2 + 0.45 + i * krok, H / 2, zf + 0.2); g.add(l); }
      for (let f = 1; f <= p.kondygnacje; f++) { const b = box(w, f === 1 ? 0.5 : 0.35, 0.5, kamienJ); b.position.set(0, f * H_KOND - (f === 1 ? 0.25 : 0.17), zf + 0.22); g.add(b); }
      const ramaC = mat("#3a3530", { metalness: 0.4, roughness: 0.5 }), sz = szklo(), ciepl = mat("#f3d9a4", { emissive: "#f0b860", emissiveIntensity: 0.55, roughness: 0.4 });
      const bal = mat("#2b2b2b", { metalness: 0.6, roughness: 0.4 });
      for (let i = 0; i < nOsi; i++) {
        const x = -w / 2 + 0.45 + krok * (i + 0.5), ww = krok - 0.75;
        // parter – witryny z ciepłym wnętrzem kawiarni
        const wn = box(ww, 2.55, 0.1, ciepl); wn.position.set(x, 1.45, zf + 0.02); g.add(wn);
        const sk = box(ww, 2.55, 0.06, mat("#9fb6c0", { transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.3 })); sk.position.set(x, 1.45, zf + 0.12); g.add(sk);
        for (const dx of [-ww / 2, 0, ww / 2]) { const r = box(0.08, 2.6, 0.12, ramaC); r.position.set(x + dx, 1.45, zf + 0.12); g.add(r); }
        // piętra – wysokie okna z balustradą francuską
        for (let f = 1; f < p.kondygnacje; f++) {
          const y = f * H_KOND + 0.1, wh = H_KOND - 0.75;
          const o = box(ww, wh, 0.08, sz); o.position.set(x, y + wh / 2, zf + 0.04); g.add(o);
          for (const dx of [-ww / 2, -ww / 6, ww / 6, ww / 2]) { const r = box(0.07, wh, 0.1, ramaC); r.position.set(x + dx, y + wh / 2, zf + 0.08); g.add(r); }
          const zas = box(ww * 0.45, wh * 0.9, 0.03, mat("#efe8dc")); zas.position.set(x - ww * 0.27, y + wh * 0.5, zf - 0.02); g.add(zas);
          if (p.balkony) { for (const yy of [0.92, 0.12]) { const b = box(ww + 0.1, 0.05, 0.05, bal); b.position.set(x, y + yy, zf + 0.42); g.add(b); } for (let k = 0; k <= 14; k++) { const pr = box(0.02, 0.8, 0.02, bal); pr.position.set(x - ww / 2 + k * ww / 14, y + 0.52, zf + 0.42); g.add(pr); } }
        }
      }
      // tylna i boczne ściany (proste okna)
      okna(g, { dl: w, y0: 0, kond: p.kondygnacje, nOkien: nOsi, n: "-z", odl: d / 2, kolorRamy: "#3a3530" });
      gzyms(g, w + 0.1, d, H + 0.2, "#efe8da");
      if (p.dach === "mansardowy") {
        const zn = mat(p.kolorDachu, { metalness: 0.45, roughness: 0.45 });
        const dol = new THREE.Mesh(new THREE.CylinderGeometry(Math.SQRT1_2 * 0.78, Math.SQRT1_2, 1, 4, 1), zn); dol.geometry.rotateY(Math.PI / 4); dol.scale.set(w, 3.0, d); dol.position.y = H + 0.4 + 1.5; g.add(dol);
        const gora = new THREE.Mesh(new THREE.CylinderGeometry(0.0001, Math.SQRT1_2 * 0.78, 1, 4, 1), zn); gora.geometry.rotateY(Math.PI / 4); gora.scale.set(w, 1.1, d); gora.position.y = H + 0.4 + 3.0 + 0.55; g.add(gora);
        for (let i = 0; i < nOsi; i += (nOsi > 4 ? 2 : 1)) { const x = -w / 2 + 0.45 + krok * (i + 0.5); const l = box(1.5, 1.6, 1.4, zn); l.position.set(x, H + 1.9, d / 2 - 0.9); g.add(l); const o = box(1.1, 1.2, 1.42, sz); o.position.copy(l.position); g.add(o); const dz = box(1.8, 0.12, 1.6, zn); dz.position.set(x, H + 2.75, d / 2 - 0.9); g.add(dz); }
      } else attyka(g, w, d, H + 0.4, p.elewacja, 1.0);
      return g;
    },
  },
  dom: {
    nazwa: "Dom jednorodzinny", ikona: "🏠", opis: "Dom wolnostojący z dachem stromym",
    param: { kondygnacje: 2, szerokosc: 11, glebokosc: 9, elewacja: "#ece6dc", dach: "dwuspadowy", kolorDachu: "#3f3f42", parter: "drzwi", balkony: false },
    opcje: { kondygnacje: [1, 3], szerokosc: [7, 16], glebokosc: [7, 13], dach: ["dwuspadowy", "kopertowy", "płaski z attyką"], parter: ["drzwi", "okna"] },
    zbuduj(p) {
      const g = new THREE.Group(), H = p.kondygnacje * H_KOND;
      const s = box(p.szerokosc, H, p.glebokosc, mat(p.elewacja)); s.position.y = H / 2; g.add(s);
      const cokol = box(p.szerokosc + 0.06, 0.5, p.glebokosc + 0.06, mat("#6b6b6b")); cokol.position.y = 0.25; g.add(cokol);
      okna(g, { dl: p.szerokosc, y0: 0, kond: p.kondygnacje, nOkien: Math.max(2, Math.round(p.szerokosc / 3)), n: "z", odl: p.glebokosc / 2, parter: p.parter, kolorRamy: "#3a3a3a" });
      okna(g, { dl: p.szerokosc, y0: 0, kond: p.kondygnacje, nOkien: Math.max(2, Math.round(p.szerokosc / 3.5)), n: "-z", odl: p.glebokosc / 2, kolorRamy: "#3a3a3a", wys: 2.0 });
      okna(g, { dl: p.glebokosc, y0: 0, kond: p.kondygnacje, nOkien: 2, n: "x", odl: p.szerokosc / 2, kolorRamy: "#3a3a3a" });
      okna(g, { dl: p.glebokosc, y0: 0, kond: p.kondygnacje, nOkien: 2, n: "-x", odl: p.szerokosc / 2, kolorRamy: "#3a3a3a" });
      if (p.dach === "dwuspadowy") { dachDwuspadowy(g, p.szerokosc, p.glebokosc, H, p.glebokosc * 0.42, p.kolorDachu, "x"); szczyty(g, p, H, p.glebokosc * 0.42, "x"); }
      else if (p.dach === "kopertowy") dachKopertowy(g, p.szerokosc, p.glebokosc, H, p.glebokosc * 0.35, p.kolorDachu);
      else attyka(g, p.szerokosc, p.glebokosc, H, p.elewacja, 0.6);
      const daszek = box(2.4, 0.12, 1.4, mat("#3a3a3a")); daszek.position.set(0, 2.6, p.glebokosc / 2 + 0.7); g.add(daszek);
      return g;
    },
  },
  szeregowiec: {
    nazwa: "Zabudowa szeregowa", ikona: "🏘️", opis: "Segmenty w różnych kolorach",
    param: { kondygnacje: 2, segmenty: 4, szerokosc: 7, glebokosc: 10, elewacja: "#e8dcc8", dach: "dwuspadowy", kolorDachu: "#7a3b2e", parter: "drzwi", balkony: false },
    opcje: { kondygnacje: [2, 3], segmenty: [2, 6], szerokosc: [5, 9], glebokosc: [8, 13], dach: ["dwuspadowy", "płaski z attyką"], parter: ["drzwi"] },
    zbuduj(p) {
      const g = new THREE.Group(), pal = [p.elewacja, "#cfd8d4", "#e6c9b5", "#d8d2e4", "#f0e4b8", "#c9d6e4"];
      for (let i = 0; i < p.segmenty; i++) {
        const seg = TYPY.dom.zbuduj({ ...p, szerokosc: p.szerokosc, elewacja: pal[i % pal.length], dach: p.dach });
        seg.position.x = (i - (p.segmenty - 1) / 2) * p.szerokosc; g.add(seg);
      }
      return g;
    },
  },
  blok: {
    nazwa: "Budynek wielorodzinny", ikona: "🏢", opis: "Nowoczesny budynek mieszkalny z balkonami",
    param: { kondygnacje: 6, szerokosc: 30, glebokosc: 13, elewacja: "#f2f0eb", dach: "płaski z attyką", kolorDachu: "#555", parter: "witryny", balkony: true },
    opcje: { kondygnacje: [3, 14], szerokosc: [15, 60], glebokosc: [10, 18], dach: ["płaski z attyką"], parter: ["witryny", "okna", "drzwi"] },
    zbuduj(p) {
      const g = new THREE.Group(), H = p.kondygnacje * H_KOND;
      const s = box(p.szerokosc, H, p.glebokosc, mat(p.elewacja)); s.position.y = H / 2; g.add(s);
      const parter = box(p.szerokosc + 0.05, H_KOND, p.glebokosc + 0.05, mat("#4a4f55")); parter.position.y = H_KOND / 2; g.add(parter);
      const pas = box(0.6, H - H_KOND, 0.2, mat("#9c6b4e")); for (const x of [-p.szerokosc / 4, p.szerokosc / 4]) { const q = pas.clone(); q.position.set(x, H_KOND + (H - H_KOND) / 2, p.glebokosc / 2 + 0.1); g.add(q); }
      const n = Math.round(p.szerokosc / 3.2);
      okna(g, { dl: p.szerokosc, y0: 0, kond: p.kondygnacje, nOkien: n, n: "z", odl: p.glebokosc / 2, parter: p.parter, balkony: p.balkony, kolorRamy: "#3a3a3a", szer: 1.6, wys: 2.1 });
      okna(g, { dl: p.szerokosc, y0: 0, kond: p.kondygnacje, nOkien: n, n: "-z", odl: p.glebokosc / 2, kolorRamy: "#3a3a3a" });
      okna(g, { dl: p.glebokosc, y0: 0, kond: p.kondygnacje, nOkien: 3, n: "x", odl: p.szerokosc / 2, kolorRamy: "#3a3a3a" });
      okna(g, { dl: p.glebokosc, y0: 0, kond: p.kondygnacje, nOkien: 3, n: "-x", odl: p.szerokosc / 2, kolorRamy: "#3a3a3a" });
      attyka(g, p.szerokosc, p.glebokosc, H, p.elewacja, 1.0);
      return g;
    },
  },
  biurowiec: {
    nazwa: "Biurowiec", ikona: "🏙️", opis: "Budynek biurowy ze szklaną fasadą",
    param: { kondygnacje: 8, szerokosc: 22, glebokosc: 18, elewacja: "#9fb4c2", dach: "płaski z attyką", kolorDachu: "#555", parter: "witryny", balkony: false },
    opcje: { kondygnacje: [3, 25], szerokosc: [12, 50], glebokosc: [12, 30], dach: ["płaski z attyką"], parter: ["witryny"] },
    zbuduj(p) {
      const g = new THREE.Group(), H = p.kondygnacje * 3.6;
      const s = box(p.szerokosc, H, p.glebokosc, mat(p.elewacja, { roughness: 0.12, metalness: 0.6 })); s.position.y = H / 2; g.add(s);
      const lam = mat("#d7dbde", { metalness: 0.5, roughness: 0.35 });
      for (let f = 1; f <= p.kondygnacje; f++) { const l = box(p.szerokosc + 0.3, 0.25, p.glebokosc + 0.3, lam); l.position.y = f * 3.6 - 0.1; g.add(l); }
      for (let x = -p.szerokosc / 2; x <= p.szerokosc / 2 + 0.01; x += p.szerokosc / Math.round(p.szerokosc / 3)) for (const z of [-1, 1]) { const m = box(0.12, H, 0.12, lam); m.position.set(x, H / 2, z * (p.glebokosc / 2 + 0.06)); g.add(m); }
      const wej = box(6, 3.2, 2.5, mat("#d7dbde", { metalness: 0.5 })); wej.position.set(0, 3.4, p.glebokosc / 2 + 1.2); wej.scale.y = 0.06; g.add(wej);
      attyka(g, p.szerokosc, p.glebokosc, H, "#d7dbde", 1.2);
      return g;
    },
  },
  pawilon: {
    nazwa: "Pawilon usługowy", ikona: "🏪", opis: "Parterowy pawilon z witrynami i markizą",
    param: { kondygnacje: 1, szerokosc: 16, glebokosc: 10, elewacja: "#c9b79c", dach: "płaski z attyką", kolorDachu: "#555", parter: "witryny", balkony: false },
    opcje: { kondygnacje: [1, 2], szerokosc: [8, 30], glebokosc: [6, 16], dach: ["płaski z attyką", "dwuspadowy"], parter: ["witryny"] },
    zbuduj(p) {
      const g = new THREE.Group(), H = p.kondygnacje * 3.6;
      const s = box(p.szerokosc, H, p.glebokosc, mat(p.elewacja)); s.position.y = H / 2; g.add(s);
      okna(g, { dl: p.szerokosc, y0: 0, kond: 1, nOkien: Math.round(p.szerokosc / 4), n: "z", odl: p.glebokosc / 2, parter: "witryny", kolorRamy: "#2b2b2b" });
      const mark = box(p.szerokosc, 0.1, 2.2, mat("#2f6b3a")); mark.position.set(0, 3.0, p.glebokosc / 2 + 1.1); mark.rotation.x = 0.2; g.add(mark);
      const szyld = box(p.szerokosc * 0.5, 0.7, 0.15, mat("#1f2a2e")); szyld.position.set(0, H - 0.2, p.glebokosc / 2 + 0.1); g.add(szyld);
      if (p.dach === "dwuspadowy") { dachDwuspadowy(g, p.szerokosc, p.glebokosc, H, 2.5, p.kolorDachu, "x"); szczyty(g, p, H, 2.5, "x"); } else attyka(g, p.szerokosc, p.glebokosc, H, p.elewacja, 0.7);
      return g;
    },
  },
  /* ---- mała architektura i zieleń */
  drzewo: {
    nazwa: "Drzewo", ikona: "🌳", opis: "Drzewo liściaste", maly: true,
    param: { wysokosc: 9 }, opcje: { wysokosc: [3, 20] },
    zbuduj(p) {
      const g = new THREE.Group(), h = p.wysokosc;
      const pien = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.025, h * 0.04, h * 0.45, 8), mat("#6b4a2f")); pien.position.y = h * 0.225; pien.castShadow = true; g.add(pien);
      const k = mat("#4f7f3a");
      for (const [x, y, z, r] of [[0, 0.62, 0, 0.3], [0.15, 0.72, 0.08, 0.22], [-0.14, 0.7, -0.06, 0.24], [0.02, 0.85, -0.1, 0.2]]) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(h * r, 1), k); s.position.set(x * h, y * h, z * h); s.castShadow = true; g.add(s); }
      return g;
    },
  },
  lawka: {
    nazwa: "Ławka", ikona: "🪑", opis: "Ławka miejska 2 m", maly: true, param: {}, opcje: {},
    zbuduj() {
      const g = new THREE.Group(), d = mat("#9a6b3f"), m = mat("#2b2b2b", { metalness: 0.6 });
      for (let i = 0; i < 3; i++) { const s = box(2, 0.05, 0.12, d); s.position.set(0, 0.45, -0.15 + i * 0.15); g.add(s); }
      for (let i = 0; i < 2; i++) { const s = box(2, 0.12, 0.05, d); s.position.set(0, 0.62 + i * 0.16, -0.25); s.rotation.x = -0.15; g.add(s); }
      for (const x of [-0.85, 0.85]) { const n = box(0.06, 0.45, 0.45, m); n.position.set(x, 0.22, 0); g.add(n); }
      return g;
    },
  },
  latarnia: {
    nazwa: "Latarnia", ikona: "💡", opis: "Latarnia uliczna 5 m", maly: true, param: {}, opcje: {},
    zbuduj() {
      const g = new THREE.Group(), m = mat("#2f3a40", { metalness: 0.6, roughness: 0.4 });
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 5, 10), m); s.position.y = 2.5; g.add(s);
      const r = box(0.9, 0.06, 0.06, m); r.position.set(0.4, 4.9, 0); g.add(r);
      const l = box(0.45, 0.15, 0.3, mat("#fff6d8", { emissive: "#fff2c0", emissiveIntensity: 0.6 })); l.position.set(0.8, 4.8, 0); g.add(l);
      return g;
    },
  },
  wiata: {
    nazwa: "Wiata przystankowa", ikona: "🚏", opis: "Przystanek ze szklaną wiatą", maly: true, param: {}, opcje: {},
    zbuduj() {
      const g = new THREE.Group(), m = mat("#3a4a55", { metalness: 0.5 }), s = mat("#bcd4de", { transparent: true, opacity: 0.35, roughness: 0.1 });
      const dach = box(4.2, 0.12, 1.8, m); dach.position.y = 2.6; g.add(dach);
      const tyl = box(4, 2.2, 0.04, s); tyl.position.set(0, 1.35, -0.8); g.add(tyl);
      for (const x of [-2, 2]) { const b = box(0.04, 2.2, 1.5, s); b.position.set(x, 1.35, 0); g.add(b); const sl = box(0.08, 2.6, 0.08, m); sl.position.set(x, 1.3, -0.8); g.add(sl); }
      const law = box(2.4, 0.06, 0.4, mat("#9a6b3f")); law.position.set(0, 0.48, -0.5); g.add(law);
      return g;
    },
  },
};

function szczyty(g, p, y, wysDachu, wzdluz) {
  const s = new THREE.Shape(), a = p.glebokosc / 2; s.moveTo(-a, 0); s.lineTo(a, 0); s.lineTo(0, wysDachu); s.closePath();
  const geo = new THREE.ShapeGeometry(s); const m = mat(p.elewacja, { side: THREE.DoubleSide });
  for (const x of [-1, 1]) { const t = new THREE.Mesh(geo, m); t.rotation.y = Math.PI / 2; t.position.set(x * p.szerokosc / 2, y, 0); g.add(t); }
}

/** Buduje obiekt sceny z opisu {typ, param} – zwraca grupę z userData (wymiary). */
export function zbuduj(opis) {
  const T = TYPY[opis.typ]; const p = { ...T.param, ...(opis.param || {}) };
  const g = T.zbuduj(p); g.name = T.nazwa;
  const bb = new THREE.Box3().setFromObject(g), r = bb.getSize(new THREE.Vector3());
  g.userData.wymiary = { szer: r.x, gleb: r.z, wys: r.y };
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
export const opisWymiarow = w => `${w.szer.toFixed(1)} × ${w.gleb.toFixed(1)} m, wys. ${w.wys.toFixed(1)} m`;
