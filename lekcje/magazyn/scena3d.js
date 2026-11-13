/*
 * Widok 3D magazynu (three.js): regały z kolorami popularności towaru (ABC), stanowiska pakowania,
 * strefa startu/WMS, strefa wysyłki, przenośnik, animowani kompletujący i pakujący, kolejki paczek,
 * ślady tras, kursory innych osób z grupy. Stanowiska można przeciągać myszą/palcem.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { STALE, droga, stanW } from "./sim.js";

const W = 36, D = 24;                                      // wymiary hali (m)
const X = x => x - W / 2, Z = z => z - D / 2;              // układ symulacji → świat
const KOL = { A: 0xe0703a, B: 0xe8c25a, C: 0xcdbfa5, pusty: 0x7d7a73 };

function sprite(tekst, { tlo = "rgba(31,42,46,.85)", kolor = "#fff", rozmiar = 1 } = {}) {
  const c = document.createElement("canvas"), g = c.getContext("2d"); const f = 44;
  g.font = `700 ${f}px system-ui`; const w = Math.ceil(g.measureText(tekst).width) + 36;
  c.width = w; c.height = f + 26; g.font = `700 ${f}px system-ui`;
  g.fillStyle = tlo; g.beginPath(); g.roundRect(0, 0, w, c.height, 18); g.fill();
  g.fillStyle = kolor; g.textBaseline = "middle"; g.fillText(tekst, 18, c.height / 2 + 2);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, depthTest: false, transparent: true }));
  s.scale.set(rozmiar * w / c.height * 0.7, rozmiar * 0.7, 1); s.renderOrder = 10; s.userData.bezEksportu = true; s.center.set(0.5, 0);
  return s;
}
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0.05, ...o });
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);

/* -------------------------------------------------------------- postacie */
function postac(kolorKamizelki, zWozkiem) {
  const g = new THREE.Group();
  const nogi = box(0.3, 0.8, 0.22, mat(0x2d3a4a)); nogi.position.y = 0.4; g.add(nogi);
  const tulow = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.7, 12), mat(kolorKamizelki)); tulow.position.y = 1.15; g.add(tulow);
  const glowa = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), mat(0xe9c3a0)); glowa.position.y = 1.65; g.add(glowa);
  const kask = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xf2c230)); kask.position.y = 1.68; g.add(kask);
  if (zWozkiem) {
    const w = new THREE.Group(); w.position.set(0, 0, 0.75);
    const kosz = box(0.6, 0.45, 0.8, mat(0x3a6ea5)); kosz.position.y = 0.6; w.add(kosz);
    for (const [x, z] of [[-0.25, -0.3], [0.25, -0.3], [-0.25, 0.3], [0.25, 0.3]]) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 10), mat(0x222222)); k.rotation.z = Math.PI / 2; k.position.set(x, 0.07, z); w.add(k); }
    const raczka = box(0.6, 0.04, 0.04, mat(0x999999)); raczka.position.set(0, 1.0, -0.42); w.add(raczka);
    const tow = box(0.4, 0.2, 0.5, mat(0xc89a5c)); tow.position.y = 0.92; tow.name = "towar"; tow.visible = false; w.add(tow);
    g.add(w); g.userData.towar = tow;
  }
  return g;
}

export function utworzScene(el, { onPrzesun, onKursor, onWybierz } = {}) {
  let brudny = true;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; el.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xe9e4da);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 300); cam.position.set(3, 24, 25);
  const ctl = new OrbitControls(cam, renderer.domElement); ctl.target.set(0, 0, 1); ctl.maxPolarAngle = Math.PI * 0.48; ctl.enableDamping = true;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9ad98, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(-12, 30, 14); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 20, bottom: -20, far: 80 }); sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; scene.add(sun);

  /* -------- hala (część stała) */
  const hala = new THREE.Group(); hala.name = "hala"; scene.add(hala);
  const podloga = box(W, 0.1, D, mat(0xb7b2a6, { roughness: 0.95 })); podloga.position.y = -0.05; podloga.receiveShadow = true; podloga.name = "podloga"; hala.add(podloga);
  const scianaM = mat(0xd9d2c3);
  for (const [w, d, x, z] of [[W, 0.3, 0, -D / 2], [0.3, D, -W / 2, 0], [0.3, D, W / 2, 0]]) { const s = box(w, 1.2, d, scianaM); s.position.set(x, 0.6, z); hala.add(s); }
  // alejki poprzeczne – żółte linie
  const liniaM = mat(0xf2c230, { roughness: 0.6 });
  for (const zc of STALE.poprzeczne) for (const dz of [-1.1, 1.1]) { const l = box(28, 0.02, 0.08, liniaM); l.position.set(X(15), 0.01, Z(zc + dz)); hala.add(l); }
  // regały
  const nAl = STALE.alejek, regM = mat(0x2f5f8f, { metalness: 0.4, roughness: 0.5 }), polkaM = mat(0xd96b2b, { metalness: 0.3 });
  const xReg = []; for (let a = 0; a < nAl; a++) { const x = STALE.alejkaX0 + a * STALE.alejkaDx; xReg.push(x - 1.5, x + 1.5); }
  const dl = STALE.zDo - STALE.zOd, zSr = (STALE.zOd + STALE.zDo) / 2;
  for (const xr of xReg) {
    for (const zz of [STALE.zOd, STALE.zOd + dl / 3, STALE.zOd + 2 * dl / 3, STALE.zDo]) for (const dx of [-0.48, 0.48]) { const s = box(0.08, 2.6, 0.08, regM); s.position.set(X(xr + dx), 1.3, Z(zz)); s.castShadow = true; hala.add(s); }
    for (let p = 0; p < STALE.poziomow; p++) { const pl = box(1, 0.06, dl, polkaM); pl.position.set(X(xr), 0.15 + p * 0.85, Z(zSr)); pl.castShadow = pl.receiveShadow = true; hala.add(pl); }
  }
  // kartony w lokalizacjach (kolor = popularność)
  const lokSzt = STALE.alejek * (STALE.zDo - STALE.zOd) * 2 * STALE.poziomow;
  const kart = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 0.55, 0.85), mat(0xffffff), lokSzt); kart.castShadow = true; kart.name = "kartony"; hala.add(kart);
  const lblReg = sprite("Regały – 432 lokalizacje", { rozmiar: 1.1 }); lblReg.position.set(X(15), 3.1, Z(17.2)); scene.add(lblReg);

  /* -------- część zależna od wariantu */
  let dyn = new THREE.Group(); scene.add(dyn);
  let ludzie = { kompl: [], pak: [] }, paczkiPula = [], kolejkiG = [], dokStos = null, slady = null, wariant = null, sim = null;
  const przeciagalne = [];

  function kolorujKartony(simW) {
    const m = new THREE.Matrix4(), c = new THREE.Color();
    const skuW = new Map(); simW.miejsce.forEach((li, sku) => skuW.set(li, sku));
    simW.lok.forEach((l, i) => {
      m.makeTranslation(X(l.x + l.strona * 1.5), 0.15 + l.poziom * 0.85 + 0.31, Z(l.z)); kart.setMatrixAt(i, m);
      const sku = skuW.get(i); c.setHex(sku == null ? KOL.pusty : sku < 60 ? KOL.A : sku < 180 ? KOL.B : KOL.C); kart.setColorAt(i, c);
    });
    kart.count = simW.lok.length; kart.instanceMatrix.needsUpdate = true; kart.instanceColor.needsUpdate = true;
  }

  function stanowisko(i) {
    const g = new THREE.Group();
    const blat = box(1.8, 0.08, 0.9, mat(0xc9a36b)); blat.position.y = 0.9; g.add(blat);
    for (const [x, z] of [[-0.8, -0.38], [0.8, -0.38], [-0.8, 0.38], [0.8, 0.38]]) { const n = box(0.06, 0.9, 0.06, mat(0x666666)); n.position.set(x, 0.45, z); g.add(n); }
    const mon = box(0.5, 0.32, 0.04, mat(0x222222)); mon.position.set(-0.5, 1.15, -0.35); g.add(mon);
    const rolka = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 14), mat(0xdcd2bd)); rolka.rotation.z = Math.PI / 2; rolka.position.set(0.55, 1.06, -0.25); g.add(rolka);
    const mata = box(2.6, 0.02, 2.4, mat(0x3f8f5a, { transparent: true, opacity: 0.55 })); mata.position.set(0, 0.012, 0.3); g.add(mata);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.drag = { typ: "pakowanie", idx: i }; } });
    const l = sprite(`Pakowanie ${i + 1}`, { tlo: "rgba(47,107,58,.9)" }); l.position.set(0, 2.3, 0); g.add(l);
    return g;
  }
  function strefaStart() {
    const g = new THREE.Group();
    const pad = box(3.2, 0.03, 2.4, mat(0x3a6ea5, { transparent: true, opacity: 0.55 })); pad.position.y = 0.015; g.add(pad);
    const term = box(0.5, 1.2, 0.4, mat(0x2c3e50)); term.position.set(-1.1, 0.6, -0.8); g.add(term);
    const ekr = box(0.42, 0.3, 0.02, mat(0x7fd3ff, { emissive: 0x2a7fb0, emissiveIntensity: 0.6 })); ekr.position.set(-1.1, 1.05, -0.59); g.add(ekr);
    g.traverse(o => { if (o.isMesh) o.userData.drag = { typ: "start" }; });
    const l = sprite("Start / WMS", { tlo: "rgba(58,110,165,.92)" }); l.position.set(0, 1.9, 0); g.add(l);
    return g;
  }
  function strefaWysylki() {
    const g = new THREE.Group();
    const pad = box(4, 0.03, 3, mat(0x9b6b2f, { transparent: true, opacity: 0.5 })); pad.position.y = 0.015; g.add(pad);
    const paleta = box(1.2, 0.15, 1.0, mat(0xb08550)); paleta.position.set(-0.8, 0.08, 0); g.add(paleta);
    // furgonetka kuriera
    const auto = new THREE.Group(); auto.position.set(1.0, 0, 0.1);
    const kab = box(1.6, 1.7, 1.4, mat(0xf2f2f2)); kab.position.set(0, 1.05, 0.3); auto.add(kab);
    const przod = box(1.5, 1.1, 0.7, mat(0xd94f2b)); przod.position.set(0, 0.75, -0.75); auto.add(przod);
    for (const [x, z] of [[-0.75, -0.7], [0.75, -0.7], [-0.75, 0.75], [0.75, 0.75]]) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 14), mat(0x1a1a1a)); k.rotation.z = Math.PI / 2; k.position.set(x, 0.28, z); auto.add(k); }
    g.add(auto);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.drag = { typ: "wysylka" }; } });
    const stos = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.26, 0.3), mat(0xc89a5c), 60); stos.count = 0; stos.userData.drag = { typ: "wysylka" }; g.add(stos);
    const l = sprite("Wysyłka / kurier", { tlo: "rgba(155,107,47,.92)" }); l.position.set(0, 2.5, 0); g.add(l);
    return { g, stos };
  }
  function przenosnik(pkt) {
    const g = new THREE.Group(), tasM = mat(0x333a40, { roughness: 0.4 }), ramaM = mat(0x8c9399, { metalness: 0.5 });
    for (let i = 0; i < pkt.length - 1; i++) {
      const a = pkt[i], b = pkt[i + 1], dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz); if (L < 0.05) continue;
      const t = box(L + 0.6, 0.08, 0.6, tasM); t.position.set(X((a.x + b.x) / 2), 0.75, Z((a.z + b.z) / 2)); t.rotation.y = -Math.atan2(dz, dx); t.castShadow = true; g.add(t);
      for (let s = 0; s <= L; s += 2) { const n = box(0.06, 0.75, 0.6, ramaM); n.position.set(X(a.x + dx * s / L), 0.37, Z(a.z + dz * s / L)); n.rotation.y = t.rotation.y; g.add(n); }
    }
    return g;
  }

  function ustaw(w, s) {
    wariant = w; sim = s;
    scene.remove(dyn); dyn.traverse(o => { o.geometry?.dispose?.(); }); dyn = new THREE.Group(); dyn.name = "uklad"; scene.add(dyn);
    przeciagalne.length = 0;
    kolorujKartony(s);
    const st = strefaStart(); st.position.set(X(w.uklad.start.x), 0, Z(w.uklad.start.z)); dyn.add(st); przeciagalne.push(st); st.userData.rola = { typ: "start" };
    w.uklad.pakowanie.forEach((p, i) => { const g = stanowisko(i); g.position.set(X(p.x), 0, Z(p.z)); dyn.add(g); przeciagalne.push(g); g.userData.rola = { typ: "pakowanie", idx: i }; });
    const wy = strefaWysylki(); wy.g.position.set(X(w.uklad.wysylka.x), 0, Z(w.uklad.wysylka.z)); dyn.add(wy.g); przeciagalne.push(wy.g); wy.g.userData.rola = { typ: "wysylka" }; dokStos = wy.stos;
    if (w.param.przenosnik) for (const p of w.uklad.pakowanie) dyn.add(przenosnik(droga(p, w.uklad.wysylka).pkt));
    // ludzie
    ludzie.kompl = s.kompl.map((_, i) => { const p = postac(0xff7a1a, true); p.name = `kompletujacy_${i + 1}`; p.traverse(o => o.castShadow = o.isMesh); dyn.add(p); return p; });
    ludzie.pak = s.stan.map((_, i) => { const p = postac(0x2f9e5a, false); p.name = `pakujacy_${i + 1}`; p.traverse(o => o.castShadow = o.isMesh); dyn.add(p); return p; });
    paczkiPula = Array.from({ length: 40 }, () => { const b = box(0.4, 0.3, 0.35, mat(0xc89a5c)); b.visible = false; b.castShadow = true; dyn.add(b); return b; });
    kolejkiG = w.uklad.pakowanie.map(p => {
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.3, 0.42), mat(0x5b8fd1), 80); im.count = 0; im.position.set(X(p.x) - 1.6, 0, Z(p.z)); im.userData.bezEksportu = true; dyn.add(im);
      const l = sprite("0", { tlo: "rgba(155,28,28,.92)", rozmiar: 0.9 }); l.position.set(X(p.x) - 1.6, 1.0, Z(p.z)); l.visible = false; dyn.add(l);
      return { im, l, n: -1 };
    });
    // ślady tras
    const pts = [];
    for (const k of s.kompl) for (const r of k.ruchy) if (r.pkt && r.pkt.length > 1) for (let i = 0; i < r.pkt.length - 1; i++) pts.push(X(r.pkt[i].x), 0.04, Z(r.pkt[i].z), X(r.pkt[i + 1].x), 0.04, Z(r.pkt[i + 1].z));
    const gs = new THREE.BufferGeometry(); gs.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    slady = new THREE.LineSegments(gs, new THREE.LineBasicMaterial({ color: 0xff5a1f, transparent: true, opacity: 0.05, depthWrite: false }));
    slady.userData.bezEksportu = true; slady.visible = pokazSlady; dyn.add(slady);
    klatka(tAkt);
  }
  let pokazSlady = false, tAkt = 0;

  function ustawPostac(o, p, kier) {
    if (!p) { o.visible = false; return; } o.visible = true; o.position.set(X(p.x), 0, Z(p.z));
    if (kier && (kier.x || kier.z)) o.rotation.y = Math.atan2(kier.x, kier.z);
  }
  function klatka(t) {
    tAkt = t; brudny = true; if (!sim) return;
    const s = stanW(sim, t);
    s.kompl.forEach((k, i) => {
      const o = ludzie.kompl[i]; const p = k.p || wariant.uklad.start;
      ustawPostac(o, p, k.kier); if (o.userData.towar) o.userData.towar.visible = k.typ === "dostawa" || k.typ === "pobranie";
    });
    s.pak.forEach((k, i) => { const o = ludzie.pak[i]; const p = k.p; ustawPostac(o, k.typ === "pakowanie" || k.typ === "czeka" ? { x: p.x, z: p.z + 0.75 } : p, k.typ === "pakowanie" || k.typ === "czeka" ? { x: 0, z: -1 } : k.kier); });
    paczkiPula.forEach((b, i) => { const q = s.paczki[i]; if (!q) { b.visible = false; return; } b.visible = true; b.position.set(X(q.p.x), q.przenosnik ? 0.95 : 1.0, Z(q.p.z)); });
    // pakujący bez przenośnika niesie paczkę
    s.pak.forEach((k, i) => { if (k.typ === "odnosi") { /* paczka pokazana w s.paczki */ } });
    const m = new THREE.Matrix4();
    s.kolejki.forEach((n, i) => {
      const q = kolejkiG[i]; if (!q || q.n === n) return; q.n = n;
      const vis = Math.min(n, 80); q.im.count = vis;
      for (let j = 0; j < vis; j++) { m.makeTranslation((j % 2) * 0.45 - 0.22, 0.15 + Math.floor(j / 4) * 0.31, (Math.floor(j / 2) % 2) * 0.45 - 0.22); q.im.setMatrixAt(j, m); }
      q.im.instanceMatrix.needsUpdate = true;
      q.l.visible = n > 0; if (n > 0) { const nowy = sprite(`kolejka: ${n}`, { tlo: n > 8 ? "rgba(155,28,28,.92)" : "rgba(31,42,46,.85)", rozmiar: 0.9 }); q.l.material.map.dispose(); q.l.material = nowy.material; q.l.scale.copy(nowy.scale); q.l.position.y = 0.6 + Math.ceil(vis / 4) * 0.31; }
    });
    if (dokStos) { const n = Math.min(60, s.wDoku); dokStos.count = n; for (let j = 0; j < n; j++) { m.makeTranslation(-0.8 + ((j % 3) - 1) * 0.36, 0.3 + Math.floor(j / 9) * 0.27, ((Math.floor(j / 3) % 3) - 1) * 0.31); dokStos.setMatrixAt(j, m); } dokStos.instanceMatrix.needsUpdate = true; }
  }

  /* -------- kursory innych osób */
  const kursory = new Map();
  function kursor(uidK, { x, z, imie, kolor }) {
    let k = kursory.get(uidK);
    if (!k) {
      const g = new THREE.Group(); g.userData.bezEksportu = true;
      const r = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.65, 32), new THREE.MeshBasicMaterial({ color: kolor, transparent: true, opacity: 0.9, side: THREE.DoubleSide })); r.rotation.x = -Math.PI / 2; r.position.y = 0.06; g.add(r);
      const l = sprite(imie, { tlo: kolor, rozmiar: 0.8 }); l.position.y = 0.4; g.add(l);
      scene.add(g); k = { g }; kursory.set(uidK, k);
    }
    brudny = true; k.g.visible = x != null; if (x != null) k.g.position.set(X(x), 0, Z(z)); k.t = performance.now();
  }
  function usunKursor(uidK) { const k = kursory.get(uidK); if (k) { scene.remove(k.g); kursory.delete(uidK); brudny = true; } }

  /* -------- przeciąganie i wskazywanie */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plaszczyzna = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), pkt = new THREE.Vector3();
  let ciagniety = null, edycja = true;
  const naPodlodze = e => {
    const r = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, cam); return ray.ray.intersectPlane(plaszczyzna, pkt) ? { x: pkt.x + W / 2, z: pkt.z + D / 2 } : null;
  };
  const dozwolone = p => {
    let x = Math.max(1.5, Math.min(W - 1.5, p.x)), z = Math.max(0.8, Math.min(D - 1.2, p.z));
    const bx0 = STALE.alejkaX0 - 2.6, bx1 = STALE.alejkaX0 + (STALE.alejek - 1) * STALE.alejkaDx + 2.6, bz0 = STALE.zOd - 1.4, bz1 = STALE.zDo + 1.4;
    if (x > bx0 && x < bx1 && z > bz0 && z < bz1) {         // nie wolno stawiać w bloku regałów – wypchnij do najbliższej krawędzi
      const o = [[x - bx0, bx0, z], [bx1 - x, bx1, z], [z - bz0, x, bz0], [bz1 - z, x, bz1]].sort((a, b) => a[0] - b[0])[0]; x = o[1]; z = o[2];
    }
    return { x: Math.round(x * 2) / 2, z: Math.round(z * 2) / 2 };
  };
  renderer.domElement.addEventListener("pointerdown", e => {
    const r = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(przeciagalne, true).find(h => h.object.userData.drag);
    if (hit && edycja) {
      let g = hit.object; while (g && !g.userData.rola) g = g.parent;
      ciagniety = g; ctl.enabled = false; renderer.domElement.setPointerCapture(e.pointerId); el.classList.add("ciagnie");
    } else if (hit && onWybierz) onWybierz(hit.object.userData.drag);
  });
  renderer.domElement.addEventListener("pointermove", e => {
    const p = naPodlodze(e); if (p && onKursor) onKursor(p);
    if (!ciagniety || !p) return; const q = dozwolone(p); ciagniety.position.set(X(q.x), 0, Z(q.z)); ciagniety.userData.poz = q; brudny = true;
  });
  const pusc = () => {
    if (!ciagniety) return; const g = ciagniety; ciagniety = null; ctl.enabled = true; el.classList.remove("ciagnie");
    if (g.userData.poz && onPrzesun) onPrzesun(g.userData.rola, g.userData.poz); g.userData.poz = null;
  };
  renderer.domElement.addEventListener("pointerup", pusc); renderer.domElement.addEventListener("pointercancel", pusc);
  renderer.domElement.addEventListener("pointerleave", () => onKursor && onKursor(null));

  /* -------- kamera */
  let lot = null;
  function widok(rodzaj, cel) {
    const d = rodzaj === "gora" ? { p: [0, 40, 0.01], t: [0, 0, 0] } : rodzaj === "persp" ? { p: [3, 24, 25], t: [0, 0, 1] }
      : cel ? { p: [X(cel.x) + 6, 9, Z(cel.z) + 9], t: [X(cel.x), 0.8, Z(cel.z)] } : null;
    if (!d) return; lot = { od: cam.position.clone(), odT: ctl.target.clone(), do: new THREE.Vector3(...d.p), doT: new THREE.Vector3(...d.t), t0: performance.now() };
  }
  function zmienRozmiar() { const w = el.clientWidth, h = el.clientHeight || 400; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); brudny = true; }
  new ResizeObserver(zmienRozmiar).observe(el); zmienRozmiar();
  let naKlatke = null;
  ctl.addEventListener("change", () => brudny = true);
  renderer.setAnimationLoop(() => {
    if (lot) { const f = Math.min(1, (performance.now() - lot.t0) / 900), e = f * f * (3 - 2 * f); cam.position.lerpVectors(lot.od, lot.do, e); ctl.target.lerpVectors(lot.odT, lot.doT, e); if (f >= 1) lot = null; }
    for (const [u, k] of kursory) if (performance.now() - k.t > 15000) usunKursor(u);
    naKlatke && naKlatke();
    if (ctl.update()) brudny = true;
    if (brudny || lot) { renderer.render(scene, cam); brudny = false; }
  });

  /* -------- eksport GLB (do e-peAR / AR): hala + układ + animacja ludzi (opcjonalnie) */
  async function eksportGLB({ animacja = true, odT = 1200, ileS = 600, czasKlipu = 60, skala = 1 / 36 } = {}) {
    const { GLTFExporter } = await import("three/addons/exporters/GLTFExporter.js");
    const root = new THREE.Group(); root.name = "magazyn"; root.scale.setScalar(skala);
    const kopia = o => { const c = o.clone(true); const usun = []; c.traverse(x => { if (x.userData.bezEksportu || x.isSprite) usun.push(x); }); usun.forEach(x => x.parent && x.parent.remove(x)); return c; };
    root.add(kopia(hala)); const uk = kopia(dyn); root.add(uk);
    const klipy = [];
    if (animacja && sim) {
      const kroki = 61, tracks = [];
      const osoby = [...sim.kompl.map((_, i) => [`kompletujacy_${i + 1}`, "k", i]), ...sim.stan.map((_, i) => [`pakujacy_${i + 1}`, "p", i])];
      const czasy = [], pozycje = Object.fromEntries(osoby.map(o => [o[0], []])), obroty = Object.fromEntries(osoby.map(o => [o[0], []]));
      for (let j = 0; j < kroki; j++) {
        const t = odT + ileS * j / (kroki - 1); czasy.push(czasKlipu * j / (kroki - 1)); const s = stanW(sim, t);
        for (const [n, r, i] of osoby) {
          const st = r === "k" ? s.kompl[i] : s.pak[i]; let p = st.p || wariant.uklad.start;
          if (r === "p" && (st.typ === "pakowanie" || st.typ === "czeka")) p = { x: p.x, z: p.z + 0.75 };
          pozycje[n].push(X(p.x), 0, Z(p.z));
          const kat = r === "p" && (st.typ === "pakowanie" || st.typ === "czeka") ? Math.PI : st.kier && (st.kier.x || st.kier.z) ? Math.atan2(st.kier.x, st.kier.z) : (obroty[n].length ? null : 0);
          const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), kat ?? 0);
          if (kat == null) { const o = obroty[n]; obroty[n].push(o[o.length - 4], o[o.length - 3], o[o.length - 2], o[o.length - 1]); } else obroty[n].push(q.x, q.y, q.z, q.w);
        }
      }
      for (const [n] of osoby) { tracks.push(new THREE.VectorKeyframeTrack(`${n}.position`, czasy, pozycje[n])); tracks.push(new THREE.QuaternionKeyframeTrack(`${n}.quaternion`, czasy, obroty[n])); }
      klipy.push(new THREE.AnimationClip("Praca magazynu", czasKlipu, tracks));
    }
    const sc = new THREE.Scene(); sc.add(root);
    return await new GLTFExporter().parseAsync(sc, { binary: true, animations: klipy, onlyVisible: false });
  }

  return {
    ustaw, klatka, widok, kursor, usunKursor, eksportGLB, renderer, cam, scene,
    set slady(v) { pokazSlady = v; if (slady) slady.visible = v; brudny = true; },
    set edycja(v) { edycja = v; },
    set naKlatke(f) { naKlatke = f; },
  };
}
