/*
 * TEREN – kamera telefonu + model w skali 1:1 nałożony na obraz na żywo.
 * Orientacja z żyroskopu/kompasu (świat: −Z = północ, +X = wschód, Y = góra), kamera na wysokości oczu nad terenem (y = 0).
 * Model stawiany przed sobą, przesuwany palcem po terenie, obracany dwoma palcami lub przyciskami.
 * Cień liczony z położenia Słońca dla GPS i godziny. „Zamroź kadr” pozwala dopracować ustawienie na nieruchomym obrazie.
 * Zdjęcie = klatka z kamery + model + pasek z opisem projektu (składane na <canvas>, więc działa na każdym telefonie).
 */
import * as THREE from "three";
import { zbuduj } from "./budynki.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const DEG = Math.PI / 180;

export function utworzTeren(el, { onStan } = {}) {
  el.innerHTML = `<video playsinline muted autoplay class="t-wideo"></video><canvas class="t-stop" hidden></canvas><div class="t-3d"></div>`;
  const video = el.querySelector("video"), stopC = el.querySelector(".t-stop"), kont = el.querySelector(".t-3d");
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x000000, 0); kont.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 2000); cam.rotation.order = "YXZ";
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8f8a7c, 1.15); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; scene.add(sun); scene.add(sun.target);
  const cienPodloga = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.38 })); cienPodloga.rotation.x = -Math.PI / 2; cienPodloga.receiveShadow = true; scene.add(cienPodloga);
  const komp = new THREE.Group(); komp.visible = false; scene.add(komp);           // kompozycja (budynek + zieleń)
  const czlowiek = (() => { const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: "#c9562f" });
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 1.2, 12), m); t.position.y = 0.95; g.add(t); const h = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), m); h.position.y = 1.68; g.add(h);
    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.4, 8), m); n.position.y = 0.2; g.add(n); g.traverse(o => o.castShadow = o.isMesh); g.visible = false; return g; })();
  komp.add(czlowiek);

  const S = { oko: 1.6, fovDl: 68, odleglosc: 30, yaw: 0, pitch: 0, roll: 0, zamrozony: false, orientacja: "brak", heading: null, gps: null, cienie: true, czas: new Date(), stream: null };
  let qUrz = null;                                   // kwaternion z żyroskopu

  /* ---------------- kamera telefonu */
  async function startKamery() {
    try {
      S.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      video.srcObject = S.stream; await video.play().catch(() => {}); return true;
    } catch (e) { return false; }
  }
  function stopKamery() { S.stream?.getTracks().forEach(t => t.stop()); S.stream = null; }
  video.addEventListener("loadedmetadata", dopasujKamere);

  /* ---------------- orientacja telefonu (żyroskop + kompas) */
  const zee = new THREE.Vector3(0, 0, 1), q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)), eul = new THREE.Euler();
  function naOrientacje(e, absolutna) {
    if (e.alpha == null) return;
    let alpha = e.alpha;
    if (e.webkitCompassHeading != null) { alpha = 360 - e.webkitCompassHeading; absolutna = true; }      // iPhone
    S.orientacja = absolutna ? "kompas" : "żyroskop";
    const ekran = (screen.orientation?.angle ?? window.orientation ?? 0) * DEG;
    eul.set(e.beta * DEG, alpha * DEG, -e.gamma * DEG, "YXZ");
    qUrz = new THREE.Quaternion().setFromEuler(eul).multiply(q1).multiply(q0.setFromAxisAngle(zee, -ekran));
  }
  let sluchaAbs = false;
  async function startOrientacji() {
    if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) { try { if (await DeviceOrientationEvent.requestPermission() !== "granted") return false; } catch { return false; } }
    if ("ondeviceorientationabsolute" in window) { window.addEventListener("deviceorientationabsolute", e => { sluchaAbs = true; naOrientacje(e, true); }); }
    window.addEventListener("deviceorientation", e => { if (!sluchaAbs) naOrientacje(e, !!e.absolute); });
    return true;
  }

  /* ---------------- GPS */
  function startGPS(cb) {
    if (!navigator.geolocation) return;
    navigator.geolocation.watchPosition(p => { S.gps = { lat: p.coords.latitude, lon: p.coords.longitude, dokl: p.coords.accuracy }; ustawSlonce(); cb && cb(S.gps); }, () => {}, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  }

  /* ---------------- dopasowanie kąta widzenia do obrazu z kamery (object-fit: cover) */
  function dopasujKamere() {
    const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false);
    const vw = video.videoWidth || 16, vh = video.videoHeight || 9;
    const dl = Math.max(vw, vh), f = (dl / 2) / Math.tan(S.fovDl * DEG / 2);       // ogniskowa w pikselach obrazu kamery
    const skala = Math.max(w / vw, h / vh), widacH = h / skala;
    cam.fov = 2 * Math.atan((widacH / 2) / f) / DEG; cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  new ResizeObserver(dopasujKamere).observe(el);

  /* ---------------- słońce */
  let slonceFn = null;
  function ustawSlonce() {
    const sl = S.gps && slonceFn ? slonceFn(S.gps.lat, S.gps.lon, S.czas) : { azymut: 200, wysokosc: 40 };
    const el_ = Math.max(4, sl.wysokosc) * DEG, az = sl.azymut * DEG, r = 150;
    const c = komp.position;
    sun.position.set(c.x + Math.sin(az) * Math.cos(el_) * r, Math.sin(el_) * r, c.z - Math.cos(az) * Math.cos(el_) * r); sun.target.position.copy(c);
    sun.intensity = sl.wysokosc > 0 ? 2.0 : 0.25; hemi.intensity = sl.wysokosc > 0 ? 1.15 : 0.5;
    const ext = 60; Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 400 }); sun.shadow.camera.updateProjectionMatrix();
    sun.castShadow = S.cienie; cienPodloga.visible = S.cienie; S.slonce = sl;
  }

  /* ---------------- kompozycja */
  const glb = new GLTFLoader(); let glowny = null;
  async function ustawKompozycje(obiekty) {
    for (const c of [...komp.children]) if (c !== czlowiek) komp.remove(c);
    for (const o of obiekty) {
      let m;
      if (o.typ === "glb") { const g = await glb.loadAsync(o.url); m = g.scene; if (o.skala) m.scale.setScalar(o.skala); m.traverse(x => { if (x.isMesh) { x.castShadow = x.receiveShadow = true; } }); }
      else m = zbuduj(o);
      m.position.set(o.x || 0, 0, o.z || 0); m.rotation.y = (o.rot || 0) * DEG; komp.add(m);
      if (o === obiekty[0]) glowny = m;
    }
    const bb = new THREE.Box3(); komp.children.filter(c => c !== czlowiek).forEach(c => bb.expandByObject(c));
    const r = bb.isEmpty() ? new THREE.Vector3(10, 10, 10) : bb.getSize(new THREE.Vector3());
    czlowiek.position.set(Math.min(r.x / 2 + 2, 30), 0, Math.min(r.z / 2 + 1, 20));   // człowiek 1,8 m obok – do sprawdzenia skali
    S.rozmiar = r;
  }

  /** Postaw kompozycję przed sobą w kierunku patrzenia, w odległości S.odleglosc. */
  function postaw() {
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion); f.y = 0; if (f.lengthSq() < 1e-4) f.set(0, 0, -1); f.normalize();
    komp.position.set(f.x * S.odleglosc, 0, f.z * S.odleglosc);
    komp.rotation.y = Math.atan2(f.x, f.z);                                           // front budynku (+z) zwrócony do patrzącego
    komp.visible = true; ustawSlonce(); stan();
  }
  const azymutModelu = () => { const p = komp.position; return ((Math.atan2(p.x, -p.z) / DEG) + 360) % 360; };
  let ostatniStan = {};
  function stan() { onStan && onStan(ostatniStan = { odleglosc: Math.hypot(komp.position.x, komp.position.z), azymut: azymutModelu(), obrot: ((komp.rotation.y / DEG) % 360 + 360) % 360, orientacja: S.orientacja, zamrozony: S.zamrozony, postawiony: komp.visible, fov: S.fovDl, oko: S.oko, slonce: S.slonce }); }

  /* ---------------- dopasowanie do istniejącego budynku: 3 stuknięcia – lewy dolny róg, prawy dolny róg, góra gzymsu */
  let dop = null; const znaczniki = new THREE.Group(); scene.add(znaczniki);
  const kulka = kol => new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), new THREE.MeshBasicMaterial({ color: kol, depthTest: false })); 
  function startDopasuj(cb) { dop = { pkt: [], cb }; znaczniki.clear(); komp.visible = false; stan(); }
  function anulujDopasuj() { dop = null; znaczniki.clear(); }
  function stuknijDopasuj(x, y) {
    const r = renderer.domElement.getBoundingClientRect(); ndc.set((x - r.left) / r.width * 2 - 1, -(y - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, cam);
    const k = dop.pkt.length;
    if (k < 2) { const p = ray.ray.intersectPlane(teren, new THREE.Vector3()); if (!p || p.length() > 300) return { blad: "Stuknij niżej – w miejsce, gdzie ściana styka się z chodnikiem." }; dop.pkt.push(p); }
    else {
      const [A, B] = dop.pkt, u = B.clone().sub(A).setY(0).normalize(), n = new THREE.Vector3(-u.z, 0, u.x);
      const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(n, A), p = ray.ray.intersectPlane(pl, new THREE.Vector3());
      if (!p || p.y < 2) return { blad: "Stuknij wyżej – w linię gzymsu (górną krawędź elewacji)." }; dop.pkt.push(p);
    }
    const m = kulka(["#ff5a1f", "#ff5a1f", "#ffd21f"][k]); m.position.copy(dop.pkt[k]); m.renderOrder = 20; znaczniki.add(m);
    if (k === 1) { const g = new THREE.BufferGeometry().setFromPoints(dop.pkt); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: "#ff5a1f", depthTest: false })); l.renderOrder = 20; znaczniki.add(l); }
    if (dop.pkt.length < 3) return { krok: dop.pkt.length };
    const [A, B, C] = dop.pkt, AB = B.clone().sub(A).setY(0), w = AB.length(), u = AB.clone().normalize();
    let n = new THREE.Vector3(-u.z, 0, u.x); const M = A.clone().add(B).multiplyScalar(0.5); M.y = 0;
    if (n.dot(M) < 0) n.negate();                                          // normalna od obserwatora w głąb budynku
    const wynik = { szer: w, wys: C.y, srodek: M, normalna: n, odleglosc: Math.hypot(M.x, M.z) };
    const cb = dop.cb; dop = null; setTimeout(() => znaczniki.clear(), 2500); cb(wynik); return { krok: 3, wynik };
  }
  /** Ustawia kompozycję tak, by front głównego budynku leżał na linii pierzei, a gzyms na zmierzonej wysokości. */
  function ustawWgPomiaru(w, glebokosc, wysScian) {
    const n = w.normalna; komp.position.copy(w.srodek).addScaledVector(n, glebokosc / 2);
    komp.rotation.y = Math.atan2(-n.x, -n.z);
    if (glowny && wysScian) glowny.scale.y = w.wys / wysScian;
    komp.visible = true; ustawSlonce(); stan();
  }

  /* ---------------- dotyk: 1 palec = przesuwanie po terenie (lub rozglądanie się bez żyroskopu), 2 palce = obrót */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), teren = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), pkt = new THREE.Vector3();
  const palce = new Map(); let start = null;
  const naTeren = (x, y) => { const r = renderer.domElement.getBoundingClientRect(); ndc.set((x - r.left) / r.width * 2 - 1, -(y - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, cam); return ray.ray.intersectPlane(teren, pkt) ? pkt.clone() : null; };
  const c = renderer.domElement;
  c.addEventListener("pointerdown", e => {
    if (dop) { const r = stuknijDopasuj(e.clientX, e.clientY); dop?.onKrok?.(r); onStan && onStan({ ...ostatniStan, dopasowanie: r }); return; }
    c.setPointerCapture(e.pointerId); palce.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const tryb = !komp.visible || (S.rozgladanie && !qUrz) ? "patrz" : "przesun";
    if (palce.size === 1) start = { tryb, x: e.clientX, y: e.clientY, yaw: S.yaw, pitch: S.pitch, poz: komp.position.clone(), p: naTeren(e.clientX, e.clientY) };
    if (palce.size === 2) { const [a, b] = [...palce.values()]; start = { tryb: "obrot", kat: Math.atan2(b.y - a.y, b.x - a.x), rot: komp.rotation.y }; }
  });
  c.addEventListener("pointermove", e => {
    if (!palce.has(e.pointerId) || !start) return; palce.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (start.tryb === "obrot" && palce.size === 2) { const [a, b] = [...palce.values()]; komp.rotation.y = start.rot - (Math.atan2(b.y - a.y, b.x - a.x) - start.kat); stan(); }
    else if (start.tryb === "patrz") { S.yaw = start.yaw + (e.clientX - start.x) * 0.15 * DEG; S.pitch = Math.max(-80 * DEG, Math.min(80 * DEG, start.pitch + (e.clientY - start.y) * 0.15 * DEG)); }
    else if (start.tryb === "przesun" && start.p) { const p = naTeren(e.clientX, e.clientY); if (p) { komp.position.set(start.poz.x + p.x - start.p.x, 0, start.poz.z + p.z - start.p.z); ustawSlonce(); stan(); } }
  });
  const koniec = e => { palce.delete(e.pointerId); if (!palce.size) start = null; };
  c.addEventListener("pointerup", koniec); c.addEventListener("pointercancel", koniec);

  /* ---------------- pętla */
  renderer.setAnimationLoop(() => {
    if (!S.zamrozony) {
      if (qUrz && !S.rozgladanie) cam.quaternion.copy(qUrz);
      else cam.rotation.set(S.pitch, S.yaw, 0, "YXZ");
    }
    cam.position.set(0, S.oko, 0);
    renderer.render(scene, cam);
  });

  /* ---------------- zamrożenie kadru i zdjęcie */
  function zamroz(t) {
    S.zamrozony = t;
    if (t) { const w = el.clientWidth, h = el.clientHeight; stopC.width = w * 2; stopC.height = h * 2; rysujTlo(stopC.getContext("2d"), stopC.width, stopC.height); stopC.hidden = false; video.hidden = true; }
    else { stopC.hidden = true; video.hidden = false; }
    stan();
  }
  /** Rysuje tło (kadr z kamery albo zamrożony kadr albo wczytane zdjęcie) z przycięciem jak object-fit: cover. */
  function rysujTlo(g, W, H) {
    if (S.zamrozony && !stopC.hidden && stopC.width) { g.drawImage(stopC, 0, 0, W, H); return; }
    const src = S.tloObraz || video, vw = src.videoWidth || src.naturalWidth || src.width, vh = src.videoHeight || src.naturalHeight || src.height;
    if (!vw) { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#9ec3dc"); gr.addColorStop(0.55, "#dfe8ec"); gr.addColorStop(0.56, "#9d9a90"); gr.addColorStop(1, "#77746c"); g.fillStyle = gr; g.fillRect(0, 0, W, H); return; }
    const s = Math.max(W / vw, H / vh), dw = vw * s, dh = vh * s; g.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }
  /** Zdjęcie: tło + model; zwraca canvas (bez opisu – opis dokłada karta projektu). */
  function zdjecie() {
    const w = el.clientWidth, h = el.clientHeight, sk = Math.min(2, 2048 / Math.max(w, h)) * 1.0;
    const W = Math.round(w * sk), H = Math.round(h * sk), out = document.createElement("canvas"); out.width = W; out.height = H;
    const g = out.getContext("2d"); rysujTlo(g, W, H); renderer.render(scene, cam); g.drawImage(renderer.domElement, 0, 0, W, H);
    return out;
  }
  /** Tło z pliku (zdjęcie zrobione wcześniej) – np. gdy przeglądarka nie daje dostępu do kamery. */
  function tloZPliku(img) { S.tloObraz = img; video.hidden = true; stopC.hidden = false; stopC.width = el.clientWidth * 2; stopC.height = el.clientHeight * 2; const g = stopC.getContext("2d"); const vw = img.naturalWidth, vh = img.naturalHeight, s = Math.max(stopC.width / vw, stopC.height / vh); g.drawImage(img, (stopC.width - vw * s) / 2, (stopC.height - vh * s) / 2, vw * s, vh * s); S.zamrozony = true; S.rozgladanie = true; }

  return {
    S, cam, scene, renderer, komp, czlowiek,
    startDopasuj, anulujDopasuj, ustawWgPomiaru, get glowny() { return glowny; },
    startKamery, stopKamery, startOrientacji, startGPS, ustawKompozycje, postaw, zamroz, zdjecie, tloZPliku, dopasujKamere, ustawSlonce, stan,
    set slonceFn(f) { slonceFn = f; ustawSlonce(); },
    obroc(st) { komp.rotation.y += st * DEG; stan(); },
    odsun(d) { const p = komp.position, r = Math.hypot(p.x, p.z) || 1, n = Math.max(3, r + d); p.multiplyScalar(n / r); ustawSlonce(); stan(); },
    przesunWBok(d) { const p = komp.position, r = Math.hypot(p.x, p.z) || 1, bx = -p.z / r, bz = p.x / r; p.x += bx * d; p.z += bz * d; ustawSlonce(); stan(); },
    set fov(v) { S.fovDl = v; dopasujKamere(); stan(); }, set oko(v) { S.oko = v; stan(); },
    set cienie(v) { S.cienie = v; ustawSlonce(); }, set czlowiekWidoczny(v) { czlowiek.visible = v; },
    set czas(d) { S.czas = d; ustawSlonce(); },
    set rozgladanie(v) { S.rozgladanie = v; },
  };
}
