/*
 * REALISTYCZNE CIAŁO do lekcji masażu: siatka MakeHuman (CC0), wersja kobieca i męska, bez ubrania –
 * odwzorowanie anatomiczne do zajęć z biologii. Okolice ciała liczymy z punktu trafienia i stawów
 * (pozycje stawów zapisane obok modelu), a warstwę „mięśni pod spodem” kładziemy na skórę promieniami.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const MODELE = "../modele/cialo/";
const loader = new GLTFLoader();

export async function zbudujCialo(plec = "K") {
  const plik = plec === "K" ? "kobieta" : "mezczyzna", v = window.WERSJA || "";
  const [gltf, dane] = await Promise.all([loader.loadAsync(`${MODELE}${plik}.glb?v=${v}`), fetch(`${MODELE}${plik}.json?v=${v}`).then(r => r.json())]);
  const grupa = gltf.scene;
  let kolizja = null;
  grupa.traverse(o => {
    if (!o.isMesh) return;
    if (o.name.startsWith("Kolizja")) { kolizja = o; o.visible = false; o.material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }); }
    else if (o.name.startsWith("Ciało")) { o.material.roughness = 0.58; o.material.sheen = 0; }
  });
  const S = n => new THREE.Vector3(...dane.stawy[n]);
  const st = {}; for (const k in dane.stawy) st[k] = S(k);
  // odcinki „kości” do rozpoznawania okolic: [nazwa części, początek, koniec, typowy promień]
  const odc = [["glowa", st["neck"].clone().lerp(st["head"], 0.95), st["head-2"].clone().add(new THREE.Vector3(0, -0.04, 0)), 0.075], ["szyja", st["neck"].clone().add(new THREE.Vector3(0, -0.03, 0)), st["neck"].clone().lerp(st["head"], 0.55), 0.062],
    ["tulow", st["upper-leg"] || st["pelvis"], st["neck"], 0.13]];
  for (const [s, nz] of [["l", "L"], ["r", "P"]]) {
    const dloKon = st[`${s}-hand`].clone().add(st[`${s}-hand`].clone().sub(st[`${s}-elbow`]).normalize().multiplyScalar(0.13));
    const palce = st[`${s}-foot-2`].clone().add(new THREE.Vector3(0, 0, 0.04));
    odc.push([`ramie${nz}`, st[`${s}-shoulder`], st[`${s}-elbow`], 0.045], [`przedramie${nz}`, st[`${s}-elbow`], st[`${s}-hand`], 0.036], [`dlon${nz}`, st[`${s}-hand`], dloKon, 0.03],
      [`udo${nz}`, st[`${s}-upper-leg`], st[`${s}-knee`], 0.075], [`podudzie${nz}`, st[`${s}-knee`], st[`${s}-ankle`], 0.05], [`stopa${nz}`, st[`${s}-ankle`].clone().add(new THREE.Vector3(0, -0.04, -0.03)), palce, 0.035]);
  }
  odc[2][1] = new THREE.Vector3(0, (st["l-upper-leg"].y + st["pelvis"].y) / 2, 0.01);
  grupa.userData = { plec, st, odc, kolizja, wysokosc: dane.wysokosc };
  return grupa;
}

/** najbliższy odcinek ciała dla punktu w układzie ciała */
export function czescDla(p, cialo) {
  let naj = null;
  for (const [nazwa, a, b, r] of cialo.userData.odc) {
    const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq()));
    let d = p.distanceTo(a.clone().addScaledVector(ab, t)) - r * (nazwa === "tulow" ? 1.2 : 1);
    if (nazwa === "tulow" && t >= 0.999) d += 0.2;          // ponad szyją to już nie tułów
    if (!naj || d < naj.d) naj = { nazwa, t, d, osZ: a.z + ab.z * t };
  }
  return naj;
}

/** okolica masażu z trafienia promienia w ciało */
export function okolicaZ(trafienie, cialo) {
  const p = cialo.worldToLocal(trafienie.point.clone()), { st } = cialo.userData, c = czescDla(p, cialo);
  const cz = c.nazwa.replace(/[LP]$/, ""), przod = p.z > c.osZ + (cz === "tulow" ? 0.0 : 0);
  if (cz === "glowa") return przod ? "twarz" : "potylica";
  if (cz === "szyja") return przod ? "szyja" : "kark";
  if (cz === "tulow") {
    const y0 = st["l-upper-leg"].y, y1 = st["neck"].y, f = (p.y - y0) / (y1 - y0), bok = Math.abs(p.x) > st["l-shoulder"].x * 0.72;
    if (f > 0.95) return przod ? "szyja" : "kark";
    if (przod) return f > 0.8 && bok ? "bark" : f > 0.62 ? "klatka" : f > 0.2 ? "brzuch" : "pachwina";
    return f > 0.82 && bok ? "bark" : f > 0.62 ? "lopatki" : f > 0.4 ? "plecy" : f > 0.18 ? "ledzwie" : "posladek";
  }
  if (cz === "ramie") return c.t < 0.2 ? "bark" : przod ? "ramiePrzod" : "ramieTyl";
  if (cz === "przedramie") return przod ? "przedramiePrzod" : "przedramieTyl";
  if (cz === "dlon") return "dlon";
  if (cz === "udo") { if (c.t > 0.9) return przod ? "kolano" : "podkolanowy"; if (c.t < 0.12) return przod ? "pachwina" : "posladek"; return przod ? "udoPrzod" : "udoTyl"; }
  if (cz === "podudzie") { if (c.t < 0.1) return przod ? "kolano" : "podkolanowy"; return przod ? "golen" : "lydka"; }
  if (cz === "stopa") return p.y > 0.035 && c.t > 0.25 ? "stopaGrzbiet" : "podeszwa";
  return null;
}

/* ---------------- warstwa mięśni: łaty z włóknami położone na skórze ---------------- */
let teksturaWlokien = null;
function wlokna() {
  if (teksturaWlokien) return teksturaWlokien;
  const c = document.createElement("canvas"); c.width = 64; c.height = 256; const g = c.getContext("2d");
  g.fillStyle = "#b8323a"; g.fillRect(0, 0, 64, 256);
  for (let x = 0; x < 64; x += 4) { g.fillStyle = x % 8 ? "#d4545a" : "#8f1f27"; g.fillRect(x, 0, 2, 256); }
  teksturaWlokien = new THREE.CanvasTexture(c); teksturaWlokien.wrapS = teksturaWlokien.wrapT = THREE.RepeatWrapping; teksturaWlokien.colorSpace = THREE.SRGBColorSpace;
  return teksturaWlokien;
}
export function zbudujMiesnie(cialo) {
  const { st, odc, kolizja } = cialo.userData, g = new THREE.Group(), ray = new THREE.Raycaster();
  kolizja.visible = true; cialo.updateMatrixWorld(true);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  /** łata w punkcie (x,y) na przodzie albo tyle ciała; os – kierunek włókien w płaszczyźnie ekranu */
  function lata(okolica, x, y, przod, szer, wys, os = V(0, 1, 0), zOs = 0) {
    ray.set(cialo.localToWorld(V(x, y, zOs + (przod ? 1 : -1))), V(0, 0, przod ? -1 : 1).transformDirection(cialo.matrixWorld));
    const hit = ray.intersectObject(kolizja, false)[0]; if (!hit) return;
    const n = hit.face.normal.clone().transformDirection(kolizja.matrixWorld);
    if ((n.z > 0) !== przod) n.negate();
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), new THREE.MeshStandardMaterial({ map: wlokna(), transparent: true, opacity: 0, depthWrite: false, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -4 }));
    m.position.copy(cialo.worldToLocal(hit.point.clone())).addScaledVector(n, 0.002);
    // lokalna oś Z = normalna skóry, oś Y = kierunek włókien rzutowany na skórę
    const zz = n.clone().normalize(), yy = os.clone().sub(zz.clone().multiplyScalar(os.dot(zz))).normalize(), xx = yy.clone().cross(zz);
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xx, yy, zz));
    m.scale.set(szer, wys, 0.006); m.userData.okolica = okolica; m.renderOrder = 2; m.raycast = () => {};
    g.add(m);
  }
  const y0 = st["l-upper-leg"].y, y1 = st["neck"].y, Y = f => y0 + (y1 - y0) * f, sx = st["l-shoulder"].x, hx = st["l-upper-leg"].x;
  for (const s of [1, -1]) {
    lata("klatka", s * sx * 0.48, Y(0.78), true, 0.07, 0.05, V(s * 1, 0.35, 0));
    lata("brzuch", s * 0.032, Y(0.45), true, 0.03, 0.1);
    lata("brzuch", s * 0.1, Y(0.4), true, 0.035, 0.08, V(-s * 0.4, 1, 0));
    lata("pachwina", s * (hx + 0.02), Y(0.1), true, 0.045, 0.035, V(s * 0.6, 1, 0));
    lata("lopatki", s * sx * 0.5, Y(0.76), false, 0.065, 0.06, V(s * 0.3, 1, 0));
    lata("plecy", s * sx * 0.62, Y(0.52), false, 0.055, 0.1, V(s * 0.25, 1, 0));
    lata("ledzwie", s * 0.045, Y(0.3), false, 0.03, 0.07);
    lata("posladek", s * (hx + 0.005), Y(0.04), false, 0.07, 0.07);
    lata("kark", s * 0.045, (st["neck"].y + st["l-shoulder"].y) / 2 + 0.02, false, 0.07, 0.025, V(s * 1, -0.5, 0));
    lata("szyja", s * 0.03, st["neck"].y + 0.035, true, 0.012, 0.045, V(-s * 0.4, 1, 0), st["neck"].z);
    lata("bark", s * (sx + 0.035), st["l-shoulder"].y - 0.02, true, 0.04, 0.055, V(s * 0.3, -1, 0), st["l-shoulder"].z - 0.02);
    lata("bark", s * (sx + 0.035), st["l-shoulder"].y - 0.02, false, 0.04, 0.055, V(s * 0.3, -1, 0), st["l-shoulder"].z - 0.02);
  }
  // kończyny: punkt na odcinku → łata z przodu albo z tyłu, włókna wzdłuż kończyny
  const naOdcinku = (nazwa, t0, t1, okP, okT, szer) => {
    const o = odc.find(x => x[0] === nazwa); if (!o) return;
    const [, a, b] = o, p = a.clone().lerp(b, (t0 + t1) / 2), dl = a.distanceTo(b) * (t1 - t0) / 2, os = b.clone().sub(a).normalize();
    if (okP) lata(okP, p.x, p.y, true, szer, dl, os, p.z);
    if (okT) lata(okT, p.x, p.y, false, szer, dl, os, p.z);
  };
  for (const s of ["L", "P"]) {
    naOdcinku("ramie" + s, 0.3, 0.85, "ramiePrzod", "ramieTyl", 0.03);
    naOdcinku("przedramie" + s, 0.08, 0.7, "przedramiePrzod", "przedramieTyl", 0.025);
    naOdcinku("udo" + s, 0.15, 0.82, "udoPrzod", "udoTyl", 0.05);
    naOdcinku("udo" + s, 0.9, 1.0, "kolano", "podkolanowy", 0.035);
    naOdcinku("podudzie" + s, 0.1, 0.65, "golen", "lydka", 0.03);
  }
  for (const s of [1, -1]) {
    lata("twarz", s * 0.045, st["l-eye"].y - 0.055, true, 0.018, 0.026, V(s * 0.25, 1, 0));      // żwacze
    lata("twarz", s * 0.058, st["l-eye"].y + 0.012, true, 0.016, 0.022, V(s * 0.3, 1, 0), 0.0);  // skronie
  }
  lata("twarz", 0, st["l-eye"].y + 0.05, true, 0.045, 0.022);                                  // czołowy (włókna pionowe)
  lata("potylica", 0, st["head"].y + 0.02, false, 0.055, 0.045);
  kolizja.visible = false;
  return g;
}
