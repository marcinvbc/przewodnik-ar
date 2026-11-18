/*
 * ŻURAW WIEŻOWY – scena 3D: plac budowy, żuraw (wieża, wysięgnik z wózkiem, przeciwwysięgnik, kabina),
 * lina z hakiem i ładunki. Fizyka uproszczona: wahadło haka z tłumieniem, przeszkody jako prostopadłościany.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const WIEZA = 30, WYSIEG = 42, WYS_WYSIEGU = 32.2, R_MIN = 4;
const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);

/** kratownica: cztery pasy + krzyżulce co `krok` wzdłuż osi X */
function kratownica(dl, szer, wys, krok = 2, gr = 0.12) {
  const g = [];
  for (const y of [0, wys]) for (const z of [-szer / 2, szer / 2]) g.push(box(dl, gr, gr, dl / 2, y, z));
  for (let x = 0; x <= dl + 0.01; x += krok) {
    g.push(box(gr * 0.8, wys, gr * 0.8, x, wys / 2, -szer / 2), box(gr * 0.8, wys, gr * 0.8, x, wys / 2, szer / 2));
    if (x + krok <= dl + 0.01) {
      for (const z of [-szer / 2, szer / 2]) { const k = box(Math.hypot(krok, wys), gr * 0.7, gr * 0.7); k.rotateZ(Math.atan2(wys, krok) * ((x / krok) % 2 ? 1 : -1)); k.translate(x + krok / 2, wys / 2, z); g.push(k); }
      const k2 = box(Math.hypot(krok, szer), gr * 0.7, gr * 0.7); k2.rotateY(Math.atan2(szer, krok)); k2.translate(x + krok / 2, 0, 0); g.push(k2);
    }
  }
  return mergeGeometries(g);
}
function maszt(wys, szer = 1.8, krok = 2.2) {
  const g = kratownica(wys, szer, szer, krok, 0.16); g.rotateZ(Math.PI / 2); g.translate(szer / 2, 0, 0); return g;
}
function tekstura(rysuj, w = 256, h = 256, powt = 1) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; rysuj(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(powt, powt); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const szum = (g, w, h, baza, n = 2500, roz = 30) => { g.fillStyle = baza; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { const v = (Math.random() - 0.5) * roz; g.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 255})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } };

export function zbudujScene(scene) {
  scene.background = new THREE.Color("#a9c9e6"); scene.fog = new THREE.Fog("#c4d8ea", 90, 260);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a60, 1.0));
  const slonce = new THREE.DirectionalLight(0xfff1dc, 2.0); slonce.position.set(60, 90, 40); slonce.castShadow = true;
  Object.assign(slonce.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, far: 260 }); slonce.shadow.mapSize.set(2048, 2048); scene.add(slonce);
  // teren
  const ziemia = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: tekstura((g, w, h) => szum(g, w, h, "#8a7a5e", 4000, 50), 256, 256, 60), roughness: 1 }));
  ziemia.rotation.x = -Math.PI / 2; ziemia.receiveShadow = true; scene.add(ziemia);
  const plac = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ map: tekstura((g, w, h) => szum(g, w, h, "#9a9488", 3000, 40), 256, 256, 12), roughness: 1 }));
  plac.rotation.x = -Math.PI / 2; plac.position.y = 0.01; plac.receiveShadow = true; scene.add(plac);
  // ogrodzenie
  const plot = new THREE.MeshStandardMaterial({ color: "#c9cfd4", metalness: 0.4, roughness: 0.5, transparent: true, opacity: 0.55 });
  for (const [x, z, w, d] of [[0, -45, 90, 0.1], [0, 45, 90, 0.1], [-45, 0, 0.1, 90], [45, 0, 0.1, 90]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 2, d), plot); m.position.set(x, 1, z); scene.add(m); }
  // budynek w budowie (przeszkoda) i stos materiałów
  const beton = new THREE.MeshStandardMaterial({ map: tekstura((g, w, h) => szum(g, w, h, "#b7b2a8", 2500, 35), 256, 256, 3), roughness: 0.95 });
  const przeszkody = [];
  const dodajBlok = (w, h, d, x, z, mat = beton, y0 = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y0 + h / 2, z); m.castShadow = m.receiveShadow = true; scene.add(m); przeszkody.push(new THREE.Box3().setFromObject(m)); return m; };
  // budynek: 3 kondygnacje + słupy na dachu
  dodajBlok(16, 12, 12, 18, -16);
  for (const [x, z] of [[11, -21], [25, -21], [11, -11], [25, -11]]) dodajBlok(0.5, 3, 0.5, x, z, beton, 12);
  // kontenery biurowe
  const kont = new THREE.MeshStandardMaterial({ color: "#2f6fa3", roughness: 0.6, metalness: 0.2 });
  dodajBlok(6, 2.7, 2.5, -22, -24, kont); dodajBlok(6, 2.7, 2.5, -22, -24, kont, 2.7);
  // wieża żurawia: fundament + maszt (stały), część obrotowa
  dodajBlok(5, 1, 5, 0, 0, beton).name = "Fundament";
  const zolty = new THREE.MeshStandardMaterial({ color: "#f2b705", roughness: 0.55, metalness: 0.3 });
  const mast = new THREE.Mesh(maszt(WIEZA - 1), zolty); mast.position.set(-0.9, 1, -0.9); mast.castShadow = true; mast.name = "Maszt";
  mast.geometry.translate(0, 0, 0); scene.add(mast);
  przeszkody.push(new THREE.Box3(new THREE.Vector3(-1.2, 0, -1.2), new THREE.Vector3(1.2, WIEZA, 1.2)));
  const obrot = new THREE.Group(); obrot.position.y = WIEZA; scene.add(obrot);
  const jib = new THREE.Mesh(kratownica(WYSIEG + 2, 1.6, 1.6, 2.2), zolty); jib.position.set(-1, WYS_WYSIEGU - WIEZA - 0.8, 0); jib.castShadow = true; jib.name = "Wysięgnik"; obrot.add(jib);
  const przeciw = new THREE.Mesh(kratownica(13, 1.6, 1.0, 2.2), zolty); przeciw.rotation.y = Math.PI; przeciw.position.set(-1, WYS_WYSIEGU - WIEZA - 0.8, 0); przeciw.name = "Przeciwwysięgnik"; obrot.add(przeciw);
  const balast = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.4, 2.2), beton); balast.position.set(-12, WYS_WYSIEGU - WIEZA - 1.6, 0); balast.castShadow = true; balast.name = "Balast (przeciwwaga)"; obrot.add(balast);
  const wciagarka = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 1.6), new THREE.MeshStandardMaterial({ color: "#555", metalness: 0.5, roughness: 0.4 })); wciagarka.position.set(-7, WYS_WYSIEGU - WIEZA - 0.2, 0); wciagarka.name = "Wciągarka"; obrot.add(wciagarka);
  const czubek = new THREE.Mesh(maszt(6, 1.4, 2), zolty); czubek.position.set(-0.7, 0.4, -0.7); czubek.name = "Wierzchołek wieży"; obrot.add(czubek);
  // cięgna czubka
  const ciegnoMat = new THREE.LineBasicMaterial({ color: "#333" });
  for (const x of [26, -12]) obrot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 6.3, 0), new THREE.Vector3(x, WYS_WYSIEGU - WIEZA + 0.8, 0)]), ciegnoMat));
  // kabina operatora (przy maszcie, z przodu, pod wysięgnikiem)
  const kabina = new THREE.Group(); kabina.name = "Kabina operatora"; kabina.position.set(2.3, -2.7, 1.5); obrot.add(kabina);
  // wspornik kabiny pod wysięgnikiem
  const wsp = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 0.3), zolty); wsp.position.set(1.4, -0.3, 1.5); obrot.add(wsp); const wsp2 = wsp.clone(); wsp2.rotation.z = Math.PI / 2; wsp2.scale.x = 0.9; wsp2.position.set(1.4, -1.4, 1.5); obrot.add(wsp2);
  const szyba = new THREE.MeshStandardMaterial({ color: "#9ec3d6", transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false });
  const rama = new THREE.MeshStandardMaterial({ color: "#d9a800", roughness: 0.5, metalness: 0.3 });
  const kab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.3, 1.8), szyba); kab.position.y = 1.15; kabina.add(kab);
  const ramy = mergeGeometries([...[0, 2.3].flatMap(y => [box(2.25, 0.1, 0.1, 0, y, -0.9), box(2.25, 0.1, 0.1, 0, y, 0.9), box(0.1, 0.1, 1.85, -1.1, y, 0), box(0.1, 0.1, 1.85, 1.1, y, 0)]), box(2.25, 0.06, 1.85, 0, 2.33, 0), ...[[-1.1, -0.9], [1.1, -0.9], [-1.1, 0.9], [1.1, 0.9]].map(([x, z]) => box(0.09, 2.3, 0.09, x, 1.15, z)), box(0.06, 0.06, 1.85, 1.1, 0.95, 0)]);
  kabina.add(new THREE.Mesh(ramy, rama));
  const podloga = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 1.7), new THREE.MeshStandardMaterial({ color: "#7fa7b8", transparent: true, opacity: 0.18, depthWrite: false })); podloga.position.y = 0.04; kabina.add(podloga);
  // wózek, lina, hak
  const wozek = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.8), new THREE.MeshStandardMaterial({ color: "#444", metalness: 0.5, roughness: 0.4 }));
  wozek.position.y = WYS_WYSIEGU - WIEZA - 1.05; wozek.name = "Wózek"; obrot.add(wozek);
  const hak = new THREE.Group(); hak.name = "Zblocze z hakiem";
  const blok = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.45), new THREE.MeshStandardMaterial({ color: "#f2b705", roughness: 0.5 })); blok.castShadow = true; hak.add(blok);
  const zakrzywiony = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 10, 20, Math.PI * 1.4), new THREE.MeshStandardMaterial({ color: "#555", metalness: 0.6, roughness: 0.3 }));
  zakrzywiony.position.y = -0.7; zakrzywiony.rotation.z = -Math.PI * 0.2; hak.add(zakrzywiony);
  scene.add(hak);
  const lina = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: "#222" }));
  scene.add(lina);
  const zawiesia = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(Array(8).fill(0).map(() => new THREE.Vector3())), new THREE.LineBasicMaterial({ color: "#e8e1c8" }));
  zawiesia.visible = false; scene.add(zawiesia);
  // światła robocze (nocne)
  const reflektor = new THREE.SpotLight(0xffffff, 0, 60, 0.6, 0.5); reflektor.position.set(0, 0, 0); wozek.add(reflektor); reflektor.target.position.set(0, -30, 0); wozek.add(reflektor.target);
  return { obrot, wozek, hak, lina, zawiesia, kabina, przeszkody, reflektor, slonce };
}

/* ---------------- ładunki i strefy docelowe ---------------- */
export const LADUNKI = [
  { id: "cegly", nazwa: "Paleta cegieł", masa: 1.4, wym: [1.2, 1.1, 1.0], kolor: "#b5532f", start: [-10, 8], cel: "A" },
  { id: "belka", nazwa: "Belka stalowa", masa: 2.2, wym: [8, 0.45, 0.45], kolor: "#5b6a75", start: [-20, 14], cel: "B" },
  { id: "kontener", nazwa: "Kontener na gruz", masa: 3.6, wym: [4, 1.6, 2.2], kolor: "#3f7d3a", start: [10, 22], cel: "C" },
  { id: "zbiornik", nazwa: "Zbiornik z wodą", masa: 5.5, wym: [2.0, 2.4, 2.0], kolor: "#3a6ea5", start: [-4, 12], cel: "D", walec: true },
];
export const STREFY = {
  A: { nazwa: "A – dach budynku", srodek: [14, 12, -14], wym: [3, 3], kolor: "#e33b2f" },
  B: { nazwa: "B – plac przy budynku", srodek: [30, 0, 4], wym: [10, 2.5], kolor: "#f08a24" },
  C: { nazwa: "C – przy kontenerach biurowych", srodek: [-22, 0, -16], wym: [5, 3.5], kolor: "#2f8f5a" },
  D: { nazwa: "D – przy maszcie żurawia", srodek: [6, 0, -8], wym: [3.5, 3.5], kolor: "#3a6ea5" },
};
/** udźwig maksymalny [t] na wysięgu r [m] – krzywa jak w tabliczce udźwigu */
export const udzwig = r => Math.min(6, 6 * 18 / Math.max(r, 1));

export function zbudujLadunki(scene) {
  const lista = [];
  for (const L of LADUNKI) {
    const mat = new THREE.MeshStandardMaterial({ color: L.kolor, roughness: 0.7, metalness: L.id === "belka" ? 0.5 : 0.1 });
    const geo = L.walec ? new THREE.CylinderGeometry(L.wym[0] / 2, L.wym[0] / 2, L.wym[1], 24) : new THREE.BoxGeometry(...L.wym);
    const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true;
    m.position.set(L.start[0], L.wym[1] / 2 + 0.01, L.start[1]); scene.add(m);
    if (L.id === "cegly") { const pal = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.15, 1.05), new THREE.MeshStandardMaterial({ color: "#a7814f" })); pal.position.y = -L.wym[1] / 2 + 0.07; m.add(pal); }
    const S = STREFY[L.cel];
    const ramka = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 4, 1), new THREE.MeshBasicMaterial({ color: S.kolor, side: THREE.DoubleSide }));
    const pole = new THREE.Mesh(new THREE.PlaneGeometry(S.wym[0], S.wym[1]), new THREE.MeshBasicMaterial({ color: S.kolor, transparent: true, opacity: 0.35, depthWrite: false }));
    pole.rotation.x = -Math.PI / 2; pole.position.set(S.srodek[0], S.srodek[1] + 0.03, S.srodek[2]); scene.add(pole);
    const brzeg = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(S.wym[0], S.wym[1])), new THREE.LineBasicMaterial({ color: S.kolor }));
    brzeg.rotation.x = -Math.PI / 2; brzeg.position.copy(pole.position).y += 0.01; scene.add(brzeg);
    // tabliczka z literą strefy
    const c = document.createElement("canvas"); c.width = 256; c.height = 128; const g = c.getContext("2d"); g.fillStyle = S.kolor; g.beginPath(); g.roundRect(4, 14, 248, 84, 18); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 6; g.stroke();
    g.beginPath(); g.moveTo(112, 98); g.lineTo(144, 98); g.lineTo(128, 124); g.fillStyle = S.kolor; g.fill(); g.fillStyle = "#fff"; g.font = "800 46px system-ui"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("STREFA " + L.cel, 128, 58);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false })); sp.scale.set(5, 2.5, 1); sp.position.set(S.srodek[0], S.srodek[1] + 3.2, S.srodek[2]); sp.renderOrder = 5; scene.add(sp);
    const c2 = document.createElement("canvas"); c2.width = c2.height = 128; const g2 = c2.getContext("2d"); g2.fillStyle = S.kolor; g2.beginPath(); g2.arc(64, 64, 60, 0, Math.PI * 2); g2.fill(); g2.fillStyle = "#fff"; g2.font = "800 80px system-ui"; g2.textAlign = "center"; g2.textBaseline = "middle"; g2.fillText(L.cel, 64, 70);
    const sp2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c2), depthTest: false, opacity: 0.85, transparent: true })); sp2.scale.set(1.3, 1.3, 1); sp2.position.y = L.wym[1] / 2 + 1.2; sp2.renderOrder = 5; m.add(sp2);
    lista.push({ ...L, mesh: m, stan: "czeka", strefa: S, tabliczka: sp, pole });
    ramka.geometry.dispose();
  }
  return lista;
}
