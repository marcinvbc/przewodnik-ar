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

/* ---------- awatar-przewodnik ---------- */
async function loadGuide(url, height, offsetX) {
  const g = await new GLTFLoader().loadAsync(url);
  const root = new THREE.Group(), av = g.scene;
  av.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const b = new THREE.Box3().setFromObject(av), d = b.getSize(new THREE.Vector3());
  const k = height / d.y;
  av.scale.setScalar(k);
  av.position.set(-(b.min.x + d.x / 2) * k, -b.min.y * k, -(b.min.z + d.z / 2) * k);
  root.add(av);
  root.position.set(Math.max(0.42, offsetX + d.x * k / 2), 0, 0.05);
  root.rotation.y = -0.45;                      // zwrócony trochę w stronę zabytku
  const sh = shadowDisc(); sh.scale.setScalar(d.x * k * 1.6); sh.position.y = 0.003; root.add(sh);

  const mixer = new THREE.AnimationMixer(av);
  const acts = Object.fromEntries(g.animations.map(c => [c.name, mixer.clipAction(c)]));
  const fallback = acts.Spoczynek || Object.values(acts)[0];
  let current = null, talking = false;
  function to(name, once = false) {
    const a = acts[name] || fallback; if (!a) return;
    if (a === current && !once) return;
    a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = once;
    a.play();
    if (current && current !== a) current.crossFadeTo(a, 0.3, false);
    current = a;
  }
  mixer.addEventListener("finished", () => to(talking ? "Mowi" : "Spoczynek"));
  to("Spoczynek");
  return {
    root, mixer,
    wave: () => to("Macha", true),
    point: () => to("Wskazuje", true),
    talk(on) { talking = on; if (on) to("Wskazuje", true); else to("Spoczynek"); },   // najpierw wskaże zabytek, potem mówi
  };
}

/**
 * Uruchamia AR.
 *  container    – element na obraz z kamery
 *  mindUrl      – adres pliku .mind
 *  modelUrl     – adres modelu .glb
 *  orientation  – "sciana" (plakat na ścianie, model stoi przed nim) | "stol" (obrazek leży, model wyrasta w górę)
 *  size         – wysokość modelu względem szerokości plakatu (domyślnie 0.9)
 *  avatarUrl    – (opcjonalnie) awatar-przewodnik .glb z animacjami Spoczynek / Macha / Mowi / Wskazuje
 *  avatarSize   – wysokość awatara względem szerokości plakatu (domyślnie 0.55)
 */
export async function startPosterAR({ container, mindUrl, modelUrl, orientation = "sciana", size = 0.9,
                                      avatarUrl = null, avatarSize = 0.55, onFound, onLost }) {
  const mindar = new MindARThree({
    container, imageTargetSrc: mindUrl,
    uiLoading: "no", uiScanning: "no", uiError: "yes",
  });
  const { renderer, scene, camera } = mindar;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // realistyczne światło: mapa otoczenia (odbicia), słońce z miękkim cieniem, filmowe tony
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1.15));
  const sun = new THREE.DirectionalLight(0xfff2e0, 2.3); sun.position.set(0.6, 1.6, 1.0);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.normalBias = 0.01;
  Object.assign(sun.shadow.camera, { left: -1.5, right: 1.5, top: 1.5, bottom: -1.5, near: 0.05, far: 6 }); scene.add(sun);
  try {
    const env = await new THREE.TextureLoader().loadAsync(new URL("modele/otoczenie.jpg", import.meta.url).href);
    env.mapping = THREE.EquirectangularReflectionMapping; env.colorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(env).texture; pm.dispose();
  } catch {}

  const anchor = mindar.addAnchor(0);
  const holder = new THREE.Group();   // obraca się zależnie od orientacji
  const pop = new THREE.Group();      // animacja „wyskoczenia” modelu
  holder.add(pop); anchor.group.add(holder);

  // model
  const gltf = await new GLTFLoader().loadAsync(modelUrl);
  const model = gltf.scene;
  model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const box = new THREE.Box3().setFromObject(model);
  const dim = box.getSize(new THREE.Vector3());
  const s = size / Math.max(dim.y, dim.x * 0.8, dim.z * 0.8);
  model.scale.setScalar(s);
  const c = box.getCenter(new THREE.Vector3());
  model.position.set(-c.x * s, -box.min.y * s, -c.z * s);   // podstawa modelu w (0,0,0)
  pop.add(model);
  const shadow = shadowDisc(); shadow.scale.setScalar(Math.max(dim.x, dim.z) * s * 1.25); shadow.position.y = 0.002;
  pop.add(shadow);
  const floorShadow = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.ShadowMaterial({ opacity: 0.3 }));
  floorShadow.rotation.x = -Math.PI / 2; floorShadow.position.y = 0.003; floorShadow.receiveShadow = true; pop.add(floorShadow);

  const mixer = new THREE.AnimationMixer(model);
  gltf.animations.forEach(clip => mixer.clipAction(clip).play());

  // awatar-przewodnik stoi obok modelu (po prawej stronie, lekko zwrócony w stronę zabytku)
  const guide = avatarUrl ? await loadGuide(avatarUrl, avatarSize, Math.max(dim.x, dim.z) * s / 2 + 0.12) : null;
  if (guide) pop.add(guide.root);

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
  anchor.onTargetFound = () => { popT = 0; guide?.wave(); onFound && onFound(); };
  anchor.onTargetLost = () => { onLost && onLost(); };

  await mindar.start();
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = clock.getDelta();
    mixer.update(dt); guide?.mixer.update(dt);
    if (popT < 1) {
      popT = Math.min(1, popT + dt * 2.2);
      const k = 1.70158, t = popT - 1;                 // easeOutBack
      pop.scale.setScalar(Math.max(0.001, t * t * ((k + 1) * t + k) + 1));
    }
    renderer.render(scene, camera);
  });

  return {
    guide,   // null albo { wave(), point(), talk(true/false) }
    setOrientation, get orientation() { return orientation; },
    stop() { renderer.setAnimationLoop(null); try { mindar.stop(); } catch {} },
  };
}
