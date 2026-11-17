/*
 * MOST WANTOWY – 12 elementów do wspólnej budowy (układanki 3D).
 * Wymiary w metrach (most ok. 66 m, pomost na wysokości 8 m nad brzegiem, rzeka niżej).
 * Każdy element ma: nazwę, położenie docelowe, symetrię obrotu i listę elementów, które muszą stać wcześniej.
 */
import * as THREE from "three";

const M = {}; const mat = (k, o = {}) => M[k + JSON.stringify(o)] ||= new THREE.MeshStandardMaterial({ color: k, roughness: 0.8, metalness: 0.05, ...o });
const BETON = "#b9b4aa", BETON2 = "#a29d93", STAL = "#c9562f", ASFALT = "#4a4c50", LINA = "#f2f2ee";
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; return b; };
const walec = (r, h, m, x, y, z) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), m); c.position.set(x, y, z); c.castShadow = true; return c; };

export const Y_POD = 6.8, Y_POMOST = 8, SZER = 11, Y_WODA = -4;

function lina(a, b, g) {
  const d = new THREE.Vector3().subVectors(b, a), m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, d.length(), 6), mat(LINA, { metalness: 0.6, roughness: 0.3 }));
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(m);
}

/* ---------------------------------------------------------------- elementy (w układzie lokalnym, środek elementu = 0) */
function przyczolek(strona) {
  const g = new THREE.Group(), b = mat(BETON);
  g.add(box(6, Y_POD, SZER + 2, b, 0, Y_POD / 2, 0));
  g.add(box(1.2, Y_POMOST + 0.4 - Y_POD, SZER + 2, b, strona * 2.4, Y_POD + (Y_POMOST + 0.4 - Y_POD) / 2, 0));      // ścianka zaplecza
  for (const z of [-1, 1]) g.add(box(7, Y_POD + 1, 0.8, mat(BETON2), strona * 1, (Y_POD + 1) / 2, z * (SZER / 2 + 1.4)));   // skrzydła
  g.add(box(2, 0.3, SZER - 1, mat("#6b6b6b"), -strona * 1.6, Y_POD + 0.15, 0));   // łożysko
  return g;
}
function filar() {
  const g = new THREE.Group(), b = mat(BETON);
  const h = Y_POD - Y_WODA;
  for (const z of [-3, 3]) g.add(walec(1.1, h - 1.2, b, 0, Y_WODA + (h - 1.2) / 2, z));
  g.add(box(3, 1.2, SZER + 1, mat(BETON2), 0, Y_POD - 0.6, 0));                    // oczep
  g.add(box(4.5, 1.2, 9, b, 0, Y_WODA + 0.6, 0));                                  // fundament
  return g;
}
function przeslo(dl) {
  const g = new THREE.Group(), s = mat(STAL, { metalness: 0.45, roughness: 0.5 });
  for (const z of [-4, 0, 4]) { g.add(box(dl, 1.0, 0.35, s, 0, Y_POD + 0.5, z)); g.add(box(dl, 0.12, 1.2, s, 0, Y_POD + 0.06, z)); g.add(box(dl, 0.12, 1.2, s, 0, Y_POD + 0.94, z)); }
  for (let x = -dl / 2 + 1; x < dl / 2; x += 3) g.add(box(0.2, 0.8, 8, s, x, Y_POD + 0.5, 0));       // poprzecznice
  return g;
}
function pylon() {
  const g = new THREE.Group(), b = mat("#d9d4ca"), H = 30;
  for (const z of [-1, 1]) { const n = box(1.4, H - Y_POD, 1.6, b, 0, Y_POD + (H - Y_POD) / 2, z * (SZER / 2 + 1)); g.add(n); }
  g.add(box(1.4, 1.4, SZER + 3.6, b, 0, H - 0.7, 0)); g.add(box(1.4, 1.2, SZER + 3.6, b, 0, 18, 0));
  return g;
}
function wanty(xPylon) {
  const g = new THREE.Group(), H = 30;
  for (const z of [-1, 1]) for (let i = 1; i <= 5; i++) for (const s of [-1, 1]) {
    const a = new THREE.Vector3(0, H - 2 - i * 1.6, z * (SZER / 2 + 1)), b = new THREE.Vector3(s * (3 + i * 3.6), Y_POMOST + 0.4, z * (SZER / 2 - 0.2));
    lina(a, b, g);
  }
  for (const z of [-1, 1]) for (const s of [-1, 1]) g.add(box(0.6, 0.3, 0.6, mat("#6b6b6b"), s * 21, Y_POMOST + 0.5, z * (SZER / 2 - 0.2)));
  return g;
}
function pomost(dl) {
  const g = new THREE.Group();
  g.add(box(dl, 0.35, SZER, mat(BETON), 0, Y_POMOST + 0.17, 0));
  g.add(box(dl, 0.06, SZER - 3.5, mat(ASFALT), 0, Y_POMOST + 0.38, 0));
  for (const z of [-1, 1]) { g.add(box(dl, 0.3, 1.6, mat(BETON2), 0, Y_POMOST + 0.5, z * (SZER / 2 - 0.8))); g.add(box(dl, 0.08, 0.08, mat("#3a3a3a", { metalness: 0.6 }), 0, Y_POMOST + 1.7, z * (SZER / 2 - 0.1))); }
  for (let x = -dl / 2; x <= dl / 2; x += 2) for (const z of [-1, 1]) g.add(box(0.06, 1.2, 0.06, mat("#3a3a3a", { metalness: 0.6 }), x, Y_POMOST + 1.1, z * (SZER / 2 - 0.1)));
  for (let x = -dl / 2 + 2; x < dl / 2; x += 5) g.add(box(2.5, 0.02, 0.18, mat("#f4f1ea"), x, Y_POMOST + 0.42, 0));
  return g;
}

/** Lista 12 elementów. `sym` – co ile stopni element wygląda tak samo (180 = obrócony o pół obrotu też pasuje). */
export const ELEMENTY = [
  { id: "przyczolekL", nr: 1, nazwa: "Przyczółek lewy", x: -30, wymaga: [], sym: 360, zbuduj: () => przyczolek(-1), opis: "Opiera most na lewym brzegu i przejmuje parcie gruntu." },
  { id: "przyczolekP", nr: 2, nazwa: "Przyczółek prawy", x: 30, wymaga: [], sym: 360, zbuduj: () => przyczolek(1), opis: "Opiera most na prawym brzegu." },
  { id: "filarL", nr: 3, nazwa: "Filar lewy", x: -12, wymaga: [], sym: 180, zbuduj: filar, opis: "Stoi w rzece na fundamencie, niesie przęsła i pylon." },
  { id: "filarP", nr: 4, nazwa: "Filar prawy", x: 12, wymaga: [], sym: 180, zbuduj: filar, opis: "Drugi filar w nurcie rzeki." },
  { id: "przesloL", nr: 5, nazwa: "Przęsło lewe", x: -21.5, wymaga: ["przyczolekL", "filarL"], sym: 180, zbuduj: () => przeslo(19), opis: "Stalowe dźwigary między przyczółkiem a filarem." },
  { id: "przesloS", nr: 6, nazwa: "Przęsło środkowe", x: 0, wymaga: ["filarL", "filarP"], sym: 180, zbuduj: () => przeslo(24), opis: "Najdłuższe przęsło nad nurtem rzeki." },
  { id: "przesloP", nr: 7, nazwa: "Przęsło prawe", x: 21.5, wymaga: ["filarP", "przyczolekP"], sym: 180, zbuduj: () => przeslo(19), opis: "Dźwigary między filarem a prawym przyczółkiem." },
  { id: "pylonL", nr: 8, nazwa: "Pylon lewy", x: -12, wymaga: ["filarL"], sym: 180, zbuduj: pylon, opis: "Wysoka podpora (30 m), na której wiszą wanty." },
  { id: "pylonP", nr: 9, nazwa: "Pylon prawy", x: 12, wymaga: ["filarP"], sym: 180, zbuduj: pylon, opis: "Drugi pylon." },
  { id: "pomost", nr: 10, nazwa: "Pomost z jezdnią", x: 0, wymaga: ["przesloL", "przesloS", "przesloP"], sym: 180, zbuduj: () => pomost(64), opis: "Płyta pomostu, jezdnia, chodniki i balustrady." },
  { id: "wantyL", nr: 11, nazwa: "Wanty lewe", x: -12, wymaga: ["pylonL", "pomost"], sym: 180, zbuduj: () => wanty(-12), opis: "Liny stalowe podwieszające pomost do lewego pylonu." },
  { id: "wantyP", nr: 12, nazwa: "Wanty prawe", x: 12, wymaga: ["pylonP", "pomost"], sym: 180, zbuduj: () => wanty(12), opis: "Liny podwieszające pomost do prawego pylonu." },
];
export const elementWg = id => ELEMENTY.find(e => e.id === id);

/** Teren: brzegi, rzeka, droga dojazdowa (nie jest elementem układanki). */
export function teren() {
  const g = new THREE.Group(); g.name = "Teren";
  const trawa = mat("#7f9a5c"), skarpa = mat("#9a8a6a");
  for (const s of [-1, 1]) {
    g.add(box(40, 1, 60, trawa, s * 47, -0.5, 0));
    const sk = new THREE.Mesh(new THREE.BoxGeometry(12, 5.2, 60), skarpa); sk.position.set(s * 23, -2.6, 0); sk.castShadow = sk.receiveShadow = true; g.add(sk);
    const nasyp = box(12, Y_POMOST + 0.35, SZER, mat("#8e8a7e"), s * 39, (Y_POMOST + 0.35) / 2, 0); g.add(nasyp);
    g.add(box(12, 0.06, SZER - 3.5, mat(ASFALT), s * 39, Y_POMOST + 0.38, 0));
  }
  // plac budowy przed mostem – tu leżą elementy przed montażem
  const plac = box(150, 0.4, 44, mat("#a39c8c", { roughness: 0.95 }), 0, -0.2, 56); plac.name = "Plac budowy"; g.add(plac);
  for (let x = -70; x <= 70; x += 10) g.add(box(0.15, 0.02, 44, mat("#8f887a"), x, 0.01, 56));
  const dno = box(36, 0.5, 60, mat("#6d6450"), 0, Y_WODA - 1.5, 0); g.add(dno);
  const woda = new THREE.Mesh(new THREE.BoxGeometry(36, 0.3, 60), mat("#4a7fa8", { transparent: true, opacity: 0.82, roughness: 0.15, metalness: 0.1 })); woda.position.set(0, Y_WODA + 0.6, 0); woda.receiveShadow = true; g.add(woda);
  return g;
}

/** Element jako grupa z nazwą (nazwa węzła = „01 Przyczółek lewy” – widoczna w hierarchii modelu). */
export function zbudujElement(e) { const g = e.zbuduj(); g.name = `${String(e.nr).padStart(2, "0")} ${e.nazwa}`; g.userData.element = e.id; return g; }

/** Cały most złożony. */
export function mostZlozony({ zTerenem = true } = {}) {
  const g = new THREE.Group(); g.name = "Most wantowy";
  if (zTerenem) g.add(teren());
  for (const e of ELEMENTY) { const m = zbudujElement(e); m.position.x = e.x; g.add(m); }
  return g;
}
