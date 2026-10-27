/*
 * Silnik "AR na plakacie" (MindAR image tracking + three.js).
 * Używany przez plakat.html (zwiedzanie) i kreator.html (dodawanie własnych znaczników).
 *
 * Układ współrzędnych MindAR: środek obrazka = (0,0,0), szerokość obrazka = 1 jednostka,
 * oś X w prawo, Y w górę obrazka, Z wychodzi z obrazka w stronę oglądającego.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MindARThree } from "mindar-image-three";
import { Compiler } from "mindar-image";

/* ---------- pamięć podręczna skompilowanych znaczników (IndexedDB) ---------- */
const DB = "przewodnik-ar", STORE = "znaczniki";
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function cacheGet(key) {
  try { const db = await idb(); return await new Promise(r => { const q = db.transaction(STORE).objectStore(STORE).get(key); q.onsuccess = () => r(q.result || null); q.onerror = () => r(null); }); }
  catch { return null; }
}
async function cacheSet(key, val) {
  try { const db = await idb(); db.transaction(STORE, "readwrite").objectStore(STORE).put(val, key); } catch {}
}

/* ---------- kompilacja obrazka do formatu .mind (w przeglądarce) ---------- */
export function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img); img.onerror = () => rej(new Error("Nie udało się wczytać obrazka znacznika"));
    img.src = src instanceof Blob ? URL.createObjectURL(src) : src;
  });
}

/** Kompiluje obrazek (URL / File / Blob). Zwraca { buffer, data } – buffer to zawartość pliku .mind */
export async function compileImage(src, onProgress = () => {}) {
  const img = await loadImage(src);
  const compiler = new Compiler();
  const dataList = await compiler.compileImageTargets([img], p => onProgress(Math.min(100, p)));
  const buffer = await compiler.exportData();
  return { buffer, data: dataList[0] };
}

/**
 * Zwraca adres (blob:) pliku .mind dla atrakcji.
 * 1) gotowy plik .mind, jeśli podany  2) wcześniej skompilowany (pamięć telefonu)  3) kompilacja teraz.
 */
export async function getMindUrl({ mind, image }, onProgress = () => {}) {
  if (mind) return mind;
  const blob = await (await fetch(image)).blob();
  const key = `${new URL(image, location.href).href}|${blob.size}`;
  let buf = await cacheGet(key);
  if (!buf) {
    const { buffer } = await compileImage(blob, onProgress);
    buf = buffer; cacheSet(key, buf);
  }
  return URL.createObjectURL(new Blob([buf]));
}

/* ---------- miękki cień pod modelem ---------- */
function shadowDisc() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d").createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,.45)"); g.addColorStop(1, "rgba(0,0,0,0)");
  const ctx = c.getContext("2d"); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

/**
 * Uruchamia AR.
 *  container    – element na obraz z kamery
 *  mindUrl      – adres pliku .mind
 *  modelUrl     – adres modelu .glb
 *  orientation  – "sciana" (plakat na ścianie, model stoi przed nim) | "stol" (obrazek leży, model wyrasta w górę)
 *  size         – wysokość modelu względem szerokości plakatu (domyślnie 0.9)
 */
export async function startPosterAR({ container, mindUrl, modelUrl, orientation = "sciana", size = 0.9, onFound, onLost }) {
  const mindar = new MindARThree({
    container, imageTargetSrc: mindUrl,
    uiLoading: "no", uiScanning: "no", uiError: "yes",
  });
  const { renderer, scene, camera } = mindar;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(0.5, 1, 1.2); scene.add(sun);

  const anchor = mindar.addAnchor(0);
  const holder = new THREE.Group();   // obraca się zależnie od orientacji
  const pop = new THREE.Group();      // animacja „wyskoczenia” modelu
  holder.add(pop); anchor.group.add(holder);

  // model
  const gltf = await new GLTFLoader().loadAsync(modelUrl);
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  const dim = box.getSize(new THREE.Vector3());
  const s = size / Math.max(dim.y, dim.x * 0.8, dim.z * 0.8);
  model.scale.setScalar(s);
  const c = box.getCenter(new THREE.Vector3());
  model.position.set(-c.x * s, -box.min.y * s, -c.z * s);   // podstawa modelu w (0,0,0)
  pop.add(model);
  const shadow = shadowDisc(); shadow.scale.setScalar(Math.max(dim.x, dim.z) * s * 1.25); shadow.position.y = 0.002;
  pop.add(shadow);

  const mixer = new THREE.AnimationMixer(model);
  gltf.animations.forEach(clip => mixer.clipAction(clip).play());

  function setOrientation(o) {
    orientation = o;
    if (o === "stol") {          // obrazek leży poziomo – model „wyrasta” z niego
      holder.rotation.set(Math.PI / 2, 0, 0);
      holder.position.set(0, 0, 0);
    } else {                      // plakat na ścianie – model stoi na „półce” przed dolną krawędzią
      holder.rotation.set(0, 0, 0);
      holder.position.set(0, -0.5, 0.35);
    }
  }
  setOrientation(orientation);

  let popT = 1;
  anchor.onTargetFound = () => { popT = 0; onFound && onFound(); };
  anchor.onTargetLost = () => { onLost && onLost(); };

  await mindar.start();
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    mixer.update(dt);
    if (popT < 1) {
      popT = Math.min(1, popT + dt * 2.2);
      const k = 1.70158, t = popT - 1;                 // easeOutBack
      pop.scale.setScalar(Math.max(0.001, t * t * ((k + 1) * t + k) + 1));
    }
    renderer.render(scene, camera);
  });

  return {
    setOrientation, get orientation() { return orientation; },
    stop() { renderer.setAnimationLoop(null); try { mindar.stop(); } catch {} },
  };
}
