/* Gitara basowa 3D nakładana na obraz z kamery.
   Kamera ortograficzna: 1 jednostka = 1 piksel CSS, więc układ (progi, struny, strefa szarpania) liczony jest
   wprost w pikselach ekranu – trafienia palcem/dłonią sprawdzamy bez rzutowania. Wygląd 3D dają fazowania,
   oświetlenie i odbicia otoczenia (lakier, metal progów i strun). Kształt korpusu – własny, ogólny. */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export const STRUNY = [
  { nazwa: "E", midi: 28, grubosc: 1.0 },   // najgrubsza – na górze (tak jak trzymasz bas)
  { nazwa: "A", midi: 33, grubosc: 0.84 },
  { nazwa: "D", midi: 38, grubosc: 0.68 },
  { nazwa: "G", midi: 43, grubosc: 0.52 },
];
const NAZWY = ["C", "Cis", "D", "Dis", "E", "F", "Fis", "G", "Gis", "A", "B", "H"];
export const nazwaNuty = midi => NAZWY[midi % 12];
export const czestotliwosc = midi => 440 * 2 ** ((midi - 69) / 12);

function tekstura(w, h, rysuj, srgb = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; rysuj(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
let ziarno = 7; const los = () => ((ziarno = (ziarno * 16807) % 2147483647) / 2147483647);

export class Bas3D {
  constructor(canvas) {
    this.r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); this.r.toneMapping = THREE.NeutralToneMapping; this.r.toneMappingExposure = 1.05;
    this.scena = new THREE.Scene();
    this.scena.environment = new THREE.PMREMGenerator(this.r).fromScene(new RoomEnvironment(), 0.04).texture;
    const k = new THREE.DirectionalLight("#fff4e6", 1.3); k.position.set(-0.4, 1, 1.2); this.scena.add(k);
    this.kam = new THREE.OrthographicCamera(-1, 1, 1, -1, -2000, 2000); this.kam.position.z = 1000;
    this.grupa = null; this.drgania = [0, 0, 0, 0]; this.fazy = [0, 0, 0, 0];
    this.M = this.materialy();
  }
  materialy() {
    const M = {};
    M.podstrunnica = new THREE.MeshPhysicalMaterial({ map: tekstura(1024, 128, (g, w, h) => {   // palisander: ciemny, słoje wzdłuż gryfu
      g.fillStyle = "#3a2216"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) { const y = los() * h; g.strokeStyle = `rgba(${los() < 0.5 ? "20,10,5" : "92,56,36"},${0.15 + los() * 0.35})`; g.lineWidth = 0.5 + los() * 1.8; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 64) g.lineTo(x, y + Math.sin(x * 0.01 + i) * (1 + los() * 3)); g.stroke(); }
    }), roughness: 0.62, clearcoat: 0.15 });
    M.szyjka = new THREE.MeshPhysicalMaterial({ color: "#e2bf84", roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 });
    M.korpus = new THREE.MeshPhysicalMaterial({ map: tekstura(512, 512, (g, w, h) => {   // cieniowanie „sunburst”: jasny środek, ciemny brzeg
      const gr = g.createRadialGradient(w * 0.5, h * 0.5, w * 0.05, w * 0.5, h * 0.5, w * 0.62); gr.addColorStop(0, "#f2a640"); gr.addColorStop(0.45, "#c2451a"); gr.addColorStop(0.75, "#5a1408"); gr.addColorStop(1, "#160502");
      g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let i = 0; i < 120; i++) { g.strokeStyle = `rgba(60,20,5,${0.04 + los() * 0.06})`; g.beginPath(); const y = los() * h; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 20 * (los() - 0.5), w * 0.7, y + 20 * (los() - 0.5), w, y); g.stroke(); }
    }), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.04 });
    M.oslona = new THREE.MeshPhysicalMaterial({ color: "#f2efe6", roughness: 0.25, clearcoat: 0.6 });
    M.prog = new THREE.MeshStandardMaterial({ color: "#d8d8d4", metalness: 1, roughness: 0.22 });
    M.chrom = new THREE.MeshStandardMaterial({ color: "#eeeeee", metalness: 1, roughness: 0.12 });
    M.czarny = new THREE.MeshStandardMaterial({ color: "#121212", roughness: 0.4, metalness: 0.1 });
    M.siodelko = new THREE.MeshStandardMaterial({ color: "#f4efe0", roughness: 0.35 });
    M.perla = new THREE.MeshPhysicalMaterial({ color: "#f4f1ea", roughness: 0.2, clearcoat: 1, iridescence: 0.6, iridescenceIOR: 1.5 });
    const owijka = tekstura(64, 16, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#777"); gr.addColorStop(0.5, "#fff"); gr.addColorStop(1, "#555"); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 4) { g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x, 0, 1, h); } }, true);
    owijka.wrapS = owijka.wrapT = THREE.RepeatWrapping;
    M.struna = STRUNY.map((s, i) => { const t = owijka.clone(); t.needsUpdate = true; t.repeat.set(400 / (0.6 + s.grubosc), 1); return new THREE.MeshStandardMaterial({ map: t, color: i < 3 ? "#cfcfcf" : "#e0e0e0", metalness: 1, roughness: 0.3 }); });
    M.smuga = STRUNY.map(() => new THREE.MeshBasicMaterial({ color: "#fff6c8", transparent: true, opacity: 0, depthWrite: false }));
    M.cel = new THREE.MeshBasicMaterial({ color: "#3dff8a", transparent: true, opacity: 0.85, depthWrite: false });
    M.celStruna = new THREE.MeshBasicMaterial({ color: "#3dff8a", transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending });
    M.palec = new THREE.MeshBasicMaterial({ color: "#ffb02e", transparent: true, opacity: 0.9, depthWrite: false });
    return M;
  }

  /** Buduje bas dla ekranu W×H (piksele CSS). Zwraca układ do trafień palcami. */
  uklad(W, H) {
    this.W = W; this.H = H; this.r.setSize(W, H, false);
    Object.assign(this.kam, { left: -W / 2, right: W / 2, top: H / 2, bottom: -H / 2 }); this.kam.updateProjectionMatrix();
    if (this.grupa) { this.scena.remove(this.grupa); this.grupa.traverse(o => o.geometry?.dispose()); }
    const g = this.grupa = new THREE.Group(); this.scena.add(g);
    const pion = H > W, maxProg = W < 620 ? 5 : W < 900 ? 7 : 9;
    const nh = Math.round(Math.min(pion ? W * 0.42 : H * (H < 520 ? 0.32 : 0.24), 200, Math.max(96, H * (pion ? 0.18 : H < 520 ? 0.32 : 0.24))));   // szerokość podstrunnicy
    const x0 = W * (pion ? 0.06 : 0.1), xKonca = W * (pion ? 0.64 : 0.66), S = (xKonca - x0) / (1 - 2 ** (-(maxProg + 0.6) / 12));
    const progX = n => x0 + S * (1 - 2 ** (-n / 12)), yc = H * (pion ? 0.56 : 0.58);
    const strunaY = STRUNY.map((_, i) => yc - nh * 0.36 + nh * 0.24 * i), sp = nh * 0.24;
    const korpusX = progX(maxProg + 0.6), Hb = nh * 3.3, Wb = nh * 4.2;
    const L = this.L = { W, H, x0, maxProg, progX, strunaY, sp, nh, yc, korpusX, szarp: { x1: korpusX + (W - korpusX) * 0.12, x2: W - Math.max(8, (W - korpusX) * 0.06) } };
    const P = (x, y) => [x - W / 2, H / 2 - y];   // ekran → świat
    const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); const [a, c] = P(x, y); b.position.set(a, c, z); g.add(b); return b; };

    // korpus: wyciągnięty kształt z fazowaniem (dwa „rogi” w stronę gryfu, okrągły dół)
    const sh = new THREE.Shape(), u = Hb / 2;
    sh.moveTo(0, -u * 0.55); sh.bezierCurveTo(Wb * 0.1, -u * 1.05, Wb * 0.55, -u * 1.15, Wb * 0.85, -u * 0.8);
    sh.bezierCurveTo(Wb * 1.05, -u * 0.5, Wb * 1.05, u * 0.5, Wb * 0.85, u * 0.8); sh.bezierCurveTo(Wb * 0.6, u * 1.1, Wb * 0.3, u * 0.95, Wb * 0.15, u * 0.75);
    sh.bezierCurveTo(Wb * 0.05, u * 0.9, -Wb * 0.12, u * 1.05, -Wb * 0.2, u * 0.85); sh.bezierCurveTo(-Wb * 0.12, u * 0.6, Wb * 0.02, u * 0.45, 0, u * 0.3);
    sh.lineTo(0, -u * 0.3); sh.bezierCurveTo(-Wb * 0.02, -u * 0.45, -Wb * 0.06, -u * 0.5, 0, -u * 0.55);
    const kg = new THREE.ExtrudeGeometry(sh, { depth: nh * 0.32, bevelEnabled: true, bevelSize: nh * 0.07, bevelThickness: nh * 0.08, bevelSegments: 6, curveSegments: 40 });
    const uvA = kg.attributes.uv, poz = kg.attributes.position; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, (poz.getX(i) + Wb * 0.2) / (Wb * 1.25), (poz.getY(i) + u * 1.15) / (u * 2.3));
    const korpus = new THREE.Mesh(kg, this.M.korpus); const [kx, ky] = P(korpusX - nh * 0.35, yc); korpus.position.set(kx, ky, -nh * 0.45); g.add(korpus);
    // osłona (pickguard) i przetwornik
    const os = new THREE.Shape(); os.moveTo(0, -u * 0.5); os.bezierCurveTo(Wb * 0.25, -u * 0.75, Wb * 0.45, -u * 0.6, Wb * 0.5, -u * 0.2); os.lineTo(Wb * 0.5, u * 0.15); os.bezierCurveTo(Wb * 0.3, u * 0.45, Wb * 0.1, u * 0.7, -Wb * 0.12, u * 0.72); os.bezierCurveTo(0, u * 0.4, 0, u * 0.1, 0, -u * 0.5);
    const osl = new THREE.Mesh(new THREE.ExtrudeGeometry(os, { depth: 2, bevelEnabled: true, bevelSize: 1.2, bevelThickness: 1, bevelSegments: 2 }), this.M.oslona); osl.position.set(kx + nh * 0.05, ky, -nh * 0.45 + nh * 0.32 + nh * 0.08 + 0.5); g.add(osl);
    const zf = osl.position.z + 3;
    const pkX = L.szarp.x1 + (L.szarp.x2 - L.szarp.x1) * 0.62;
    box(nh * 0.26, nh * 1.02, nh * 0.08, this.M.czarny, pkX, yc, zf + nh * 0.04).geometry.translate(0, 0, 0);
    for (let i = 0; i < 4; i++) box(nh * 0.07, nh * 0.07, nh * 0.1, this.M.chrom, pkX, strunaY[i], zf + nh * 0.05);
    // mostek poza strefą szarpania (często za prawą krawędzią ekranu)
    const mostX = Math.min(korpusX + Wb * 0.78, W + nh * 0.5);
    box(nh * 0.45, nh * 1.05, nh * 0.06, this.M.chrom, mostX, yc, zf + nh * 0.03);
    for (let i = 0; i < 4; i++) box(nh * 0.22, nh * 0.13, nh * 0.12, this.M.chrom, mostX - nh * 0.05, strunaY[i], zf + nh * 0.08);

    // gryf (szyjka klonowa + podstrunnica) od główki do korpusu
    const gryfDo = korpusX + nh * 0.6, zG = zf + nh * 0.02;
    box(gryfDo - x0, nh * 1.02, nh * 0.22, this.M.szyjka, (x0 + gryfDo) / 2, yc, zG);
    const pod = box(gryfDo - x0, nh, nh * 0.06, this.M.podstrunnica, (x0 + gryfDo) / 2, yc, zG + nh * 0.14);
    const zP = zG + nh * 0.17;
    for (let n = 1; n <= maxProg + 2; n++) { const x = progX(n); if (x > gryfDo) break; const pr = box(Math.max(2.5, nh * 0.022), nh * 0.99, nh * 0.035, this.M.prog, x, yc, zP + nh * 0.01); pr.geometry = new THREE.CylinderGeometry(Math.max(1.5, nh * 0.013), Math.max(1.5, nh * 0.013), nh * 0.99, 10); }
    for (const n of [3, 5, 7, 9, 12]) { if (n > maxProg) break; const x = (progX(n - 1) + progX(n)) / 2; const kropka = (yy) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(nh * 0.055, nh * 0.055, 2, 24), this.M.perla); m.rotation.x = Math.PI / 2; const [a, b] = P(x, yy); m.position.set(a, b, zP + 0.5); g.add(m); }; if (n === 12) { kropka(yc - nh * 0.2); kropka(yc + nh * 0.2); } else kropka(yc); }
    box(Math.max(4, nh * 0.045), nh * 1.0, nh * 0.09, this.M.siodelko, x0, yc, zP + nh * 0.03);
    // główka z kluczami (4 w linii, u góry) – w lewo od siodełka
    const gl = new THREE.Shape(); gl.moveTo(0, -nh * 0.5); gl.lineTo(-nh * 2.6, -nh * 0.62); gl.bezierCurveTo(-nh * 2.9, -nh * 0.6, -nh * 2.95, -nh * 0.2, -nh * 2.75, nh * 0.05); gl.lineTo(-nh * 0.4, nh * 0.75); gl.lineTo(0, nh * 0.5); gl.lineTo(0, -nh * 0.5);
    const glowka = new THREE.Mesh(new THREE.ExtrudeGeometry(gl, { depth: nh * 0.12, bevelEnabled: true, bevelSize: nh * 0.03, bevelThickness: nh * 0.03, bevelSegments: 3 }), this.M.szyjka);
    const [gx, gy] = P(x0, yc); glowka.position.set(gx, gy, zG); g.add(glowka);
    const kolki = [];
    for (let i = 0; i < 4; i++) { const kx2 = x0 - nh * (0.55 + 0.55 * i); const post = box(nh * 0.09, nh * 0.09, nh * 0.18, this.M.chrom, kx2, yc - nh * 0.2 + i * 0.05 * nh, zG + nh * 0.2); post.geometry = new THREE.CylinderGeometry(nh * 0.05, nh * 0.06, nh * 0.2, 16); post.rotation.x = Math.PI / 2; kolki.push(kx2);
      const k2 = box(nh * 0.3, nh * 0.12, nh * 0.08, this.M.chrom, kx2, yc - nh * 0.72, zG + nh * 0.08); k2.geometry = new THREE.CylinderGeometry(nh * 0.12, nh * 0.12, nh * 0.06, 20); }

    // struny (od kołków do mostka)
    this.struny = []; this.smugi = [];
    STRUNY.forEach((s, i) => {
      const r = Math.max(0.9, nh * 0.011 * s.grubosc + 0.6), x1 = x0 - nh * 0.1, x2 = mostX, zS = zP + nh * 0.06;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, x2 - x1, 10), this.M.struna[i]); m.rotation.z = Math.PI / 2; const [a, b] = P((x1 + x2) / 2, strunaY[i]); m.position.set(a, b, zS); g.add(m); this.struny.push(m);
      const za = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r * 0.8, x1 - kolki[i], 8), this.M.struna[i]); za.rotation.z = Math.PI / 2; const ang = Math.atan2((yc - nh * 0.2 + i * 0.05 * nh) - strunaY[i], kolki[i] - x1); za.rotation.z = Math.PI / 2 - ang; const [c, d] = P((x1 + kolki[i]) / 2, (strunaY[i] + yc - nh * 0.2 + i * 0.05 * nh) / 2); za.position.set(c, d, zS); g.add(za);
      const sm = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, 1), this.M.smuga[i]); sm.position.set(a, b, zS + 1); g.add(sm); this.smugi.push(sm);
    });
    this.zS = zP + nh * 0.06 + 3;
    // warstwy podświetleń
    this.cele = new THREE.Group(); this.palce = new THREE.Group(); g.add(this.cele, this.palce);
    this.drgania = [0, 0, 0, 0];
    return L;
  }

  /** cel: { s, f } – pozycja do zagrania (f=0 → pusta struna); null = brak */
  ustawCel(cel, kolor = "#3dff8a") {
    this.cele.clear(); if (!cel || !this.L) return; const L = this.L, P = (x, y) => [x - this.W / 2, this.H / 2 - y];
    this.M.cel.color.set(kolor); this.M.celStruna.color.set(kolor);
    if (cel.f > 0) { const x = L.progX(cel.f) - (L.progX(cel.f) - L.progX(cel.f - 1)) * 0.38, [a, b] = P(x, L.strunaY[cel.s]);
      const pier = new THREE.Mesh(new THREE.RingGeometry(L.sp * 0.32, L.sp * 0.46, 40), this.M.cel); pier.position.set(a, b, this.zS + 2); this.cele.add(pier);
      const k = new THREE.Mesh(new THREE.CircleGeometry(L.sp * 0.2, 32), this.M.celStruna); k.position.set(a, b, this.zS + 2); this.cele.add(k); this.pierscien = pier; }
    else { const [a, b] = P(L.x0 + 4, L.strunaY[cel.s]); const z = new THREE.Mesh(new THREE.RingGeometry(L.sp * 0.25, L.sp * 0.38, 32), this.M.cel); z.position.set(a - L.sp * 0.5, b, this.zS + 2); this.cele.add(z); this.pierscien = z; }
    const [c, d] = P((L.szarp.x1 + L.szarp.x2) / 2, L.strunaY[cel.s]);
    const pas = new THREE.Mesh(new THREE.PlaneGeometry(L.szarp.x2 - L.szarp.x1, L.sp * 0.4), this.M.celStruna); pas.position.set(c, d, this.zS + 1); this.cele.add(pas);
  }
  /** palce dociskające: [{ s, f }] */
  ustawPalce(lista) {
    this.palce.clear(); const L = this.L; if (!L) return;
    for (const { s, f } of lista) { if (f <= 0) continue; const x = L.progX(f) - (L.progX(f) - L.progX(f - 1)) * 0.38, k = new THREE.Mesh(new THREE.CircleGeometry(L.sp * 0.22, 28), this.M.palec); k.position.set(x - this.W / 2, this.H / 2 - L.strunaY[s], this.zS + 3); this.palce.add(k); }
  }
  szarpnij(s, sila = 1) { this.drgania[s] = Math.min(1.4, 0.6 + sila * 0.6); }
  klatka(dt, t) {
    if (this.struny) for (let i = 0; i < 4; i++) {
      const a = this.drgania[i]; this.drgania[i] *= Math.exp(-dt * (1.6 + i * 0.25));
      const amp = a * this.L.sp * 0.16; this.smugi[i].scale.y = Math.max(0.001, amp * 2); this.M.smuga[i].opacity = Math.min(0.55, a * 0.5);
      this.struny[i].position.y = this.H / 2 - this.L.strunaY[i] + Math.sin(t * (60 - i * 6)) * amp * 0.35;
    }
    if (this.pierscien) this.pierscien.scale.setScalar(1 + Math.sin(t * 6) * 0.08);
    this.r.render(this.scena, this.kam);
  }
}
