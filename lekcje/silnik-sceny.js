/*
 * Silnik sceny lekcji (three.js): układa materiały (slajdy, zdjęcia, filmy, modele 3D) w przestrzeni.
 * Ten sam silnik działa u nauczyciela (projektor), u ucznia na znaczniku AR, na ławce (WebXR) i w widoku 3D.
 *
 * Układ współrzędnych sceny: środek = (0,0,0) na „podłodze”, widz domyślnie od strony +Z, scena ma ok. 3 jednostki średnicy.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { resolveUrl } from "./wspolne.js";

const ACCENT = 0xe0a030;
const loader = new GLTFLoader();
const texLoader = new THREE.TextureLoader(); texLoader.setCrossOrigin("anonymous");

/* ------------------------------------------------------------------ pomocnicze */
function canvasText(lines, { w = 1024, h = 256, bg = "rgba(20,28,32,0.86)", color = "#fff", size = 84, sub = 40 } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = bg; const r = 40;
  g.beginPath(); g.roundRect ? g.roundRect(0, 0, w, h, r) : g.rect(0, 0, w, h); g.fill();
  g.fillStyle = color; g.textAlign = "center"; g.textBaseline = "middle";
  const [a, b] = lines;
  const fit = (t, s) => { let f = s; do { g.font = `700 ${f}px system-ui, sans-serif`; f -= 4; } while (g.measureText(t).width > w - 60 && f > 20); };
  fit(a || "", size); g.fillText(a || "", w / 2, b ? h * 0.4 : h / 2);
  if (b) { g.globalAlpha = .75; g.font = `500 ${sub}px system-ui, sans-serif`; g.fillText(b, w / 2, h * 0.75); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const facing = (p, target) => Math.atan2(target.x - p.x, target.z - p.z);

/** Rozmieszczenie elementów zależnie od układu. Zwraca [{ m, pos, rotY, width }] */
export function rozmiesc(uklad, mats) {
  const ekrany = mats.filter(m => m.typ !== "model"), modele = mats.filter(m => m.typ === "model");
  const out = [];
  const ar = m => (m.w && m.h ? m.w / m.h : 16 / 9);
  const VIEW = new THREE.Vector3(0, 0.45, 1.2);
  const modelZ = { muzeum: 0.2, teatr: 0.25, orbita: 0, galeria: 0.25 }[uklad] ?? 0.2;
  const teatrZModelem = uklad === "teatr" && modele.length && ekrany.length;
  modele.forEach((m, i) => {
    const x = teatrZModelem ? -0.9 - i * 0.2 : (i - (modele.length - 1) / 2) * 0.62;
    const z = teatrZModelem ? 0.1 + i * 0.5 : modelZ;
    out.push({ m, pos: new THREE.Vector3(x, 0, z), rotY: teatrZModelem ? 0.5 : 0, width: modele.length > 1 || teatrZModelem ? 0.5 : 0.62 });
  });
  const n = ekrany.length; if (!n) return out;
  if (uklad === "galeria") {
    const cols = Math.min(3, n), rows = Math.ceil(n / cols), W = n > 3 ? 0.5 : 0.62;
    ekrany.forEach((m, i) => {
      const r = Math.floor(i / cols), c = i % cols, inRow = Math.min(cols, n - r * cols);
      const x = (c - (inRow - 1) / 2) * (W + 0.1);
      const y = 0.3 + (rows - 1 - r) * (W / 1.5 + 0.1);
      out.push({ m, pos: new THREE.Vector3(x, y, -0.75), rotY: 0, width: W, wall: true });
    });
  } else if (uklad === "teatr") {
    const main = ekrany.find(m => m.typ === "wideo") || ekrany[0];
    out.push({ m: main, pos: new THREE.Vector3(0, 0.42, -0.8), rotY: 0, width: 1.25, big: true });
    ekrany.filter(m => m !== main).forEach((m, i) => {
      const side = teatrZModelem ? 1 : (i % 2 ? -1 : 1), row = teatrZModelem ? i : Math.floor(i / 2);
      const p = new THREE.Vector3(side * (0.98 + row * 0.12), 0.32, -0.25 + row * 0.42);
      out.push({ m, pos: p, rotY: facing(p, VIEW), width: 0.5 });
    });
  } else if (uklad === "orbita") {
    ekrany.forEach((m, i) => {
      const a = (i / n) * Math.PI * 2 + (modele.length ? 0 : Math.PI / n);
      const p = new THREE.Vector3(Math.sin(a) * 0.98, 0.32, Math.cos(a) * 0.98);
      out.push({ m, pos: p, rotY: Math.atan2(p.x, p.z), width: 0.55 });
    });
  } else { // muzeum
    const span = Math.min(110, 40 * n) * Math.PI / 180;
    ekrany.forEach((m, i) => {
      const f = n === 1 ? 0 : -span / 2 + span * i / (n - 1);
      const p = new THREE.Vector3(Math.sin(f) * 1.0, 0.32, 0.2 - Math.cos(f) * 1.0);
      // ekran tuż za modelem podnosimy wyżej, żeby model go nie zasłaniał
      const raise = modele.length && Math.abs(f) < 0.35;
      out.push({ m, pos: p, rotY: facing(p, VIEW), width: n > 3 ? 0.55 : 0.66, raise });
    });
  }
  for (const o of out) if (o.m.typ !== "model") {
    let w = o.width, h = w / ar(o.m);
    const maxH = o.big ? 0.75 : 0.5;
    if (h > maxH) { h = maxH; w = h * ar(o.m); }
    o.width = w; o.height = h;
  }
  return out;
}

/* ------------------------------------------------------------------ silnik */
export class ScenaLekcji {
  constructor({ wycisz = true } = {}) {
    this.root = new THREE.Group();
    this.items = new Map();          // id materiału -> { group, kind, target, panelMat, ... }
    this.videos = new Map();         // id -> HTMLVideoElement (zachowywane między scenami)
    this.gltfCache = new Map();
    this.mixers = [];
    this.focusId = null;
    this.wycisz = wycisz;
    this.token = 0;
    this.t = 0;
    this.arrow = this._arrow();
    this.onReady = null;
  }

  _arrow() {
    const g = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.11, 20), new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.5 }));
    cone.rotation.x = Math.PI; g.add(cone);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 8, 32), cone.material); ring.rotation.x = Math.PI / 2; ring.position.y = 0.09; g.add(ring);
    g.visible = false; return g;
  }

  _clear() {
    for (const it of this.items.values()) {
      it.group.traverse(o => { if (o.isMesh && !o.userData.shared) { o.geometry?.dispose(); if (!o.material?.userData?.keep) o.material?.dispose?.(); } });
      if (it.video) it.video.pause();
    }
    this.items.clear(); this.mixers = [];
    while (this.root.children.length) this.root.remove(this.root.children[0]);
    this.root.add(this.arrow); this.arrow.visible = false;
    if (this.guide) this.root.add(this.guide.holder);
  }

  /** Buduje scenę nr `nr` z planu. Zwraca Promise (po wczytaniu tekstur i modeli). */
  async pokaz(plan, materialy, nr) {
    const token = ++this.token;
    this._clear(); this.focusId = null;
    const s = plan?.sceny?.[nr]; if (!s) return;
    const byId = Object.fromEntries(materialy.map(m => [m.id, m]));
    const mats = s.elementy.map(id => byId[id]).filter(Boolean);

    // podłoga + tytuł
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.5, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = 0.001; this.root.add(floor);
    const rim = new THREE.Mesh(new THREE.RingGeometry(1.47, 1.5, 96), new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    rim.rotation.x = -Math.PI / 2; rim.position.y = 0.002; this.root.add(rim);
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.325), new THREE.MeshBasicMaterial({ map: canvasText([s.tytul, `Scena ${nr + 1} z ${plan.sceny.length}`]), transparent: true, toneMapped: false }));
    const bz = s.uklad === "orbita" ? -0.2 : -1.05;
    banner.position.set(0, s.uklad === "galeria" ? 1.45 : 1.22, bz); this.root.add(banner);
    this.banner = banner;

    const placed = rozmiesc(s.uklad, mats);
    const raised = placed.find(p => p.raise);
    if (raised) banner.position.y = 0.92 + raised.height + 0.3;
    await Promise.all(placed.map(p => this._dodaj(p, token).catch(e => console.warn("Nie wczytano", p.m.nazwa, e))));
    if (token !== this.token) return;
    this.onReady && this.onReady();
  }

  async _dodaj(p, token) {
    const { m } = p;
    const group = new THREE.Group(); group.position.copy(p.pos); group.rotation.y = p.rotY; group.userData.id = m.id;
    const it = { group, kind: m.typ, scale: 1, target: 1, base: p, width: p.width || 0.6 };
    this.items.set(m.id, it); this.root.add(group);
    if (m.typ === "model") return this._model(it, m, p, token);
    return this._ekran(it, m, p, token);
  }

  async _ekran(it, m, p, token) {
    const { group } = it, w = p.width, h = p.height, bottom = p.wall ? p.pos.y - h / 2 : (p.raise ? 0.92 : 0.2);
    const cy = p.wall ? 0 : bottom + h / 2 - p.pos.y;
    // rama, ekran, stojak
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, h + 0.04, 0.025), new THREE.MeshStandardMaterial({ color: 0x222831, roughness: 0.6, metalness: 0.2 }));
    frame.position.set(0, cy, -0.014); group.add(frame);
    const mat = new THREE.MeshBasicMaterial({ color: 0x888888, toneMapped: false });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); panel.position.set(0, cy, 0.0); group.add(panel);
    const bg = new THREE.PlaneGeometry(w, h); const uv = bg.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
    const back = new THREE.Mesh(bg, mat); back.rotation.y = Math.PI; back.position.set(0, cy, -0.028); group.add(back);
    if (!p.wall) {
      const legs = p.big ? [-w * 0.35, w * 0.35] : [0];
      for (const lx of legs) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, bottom + 0.01, 10), frame.material);
        pole.position.set(lx, (bottom) / 2 - p.pos.y, -0.03); group.add(pole);
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.015, 20), frame.material);
        foot.position.set(lx, 0.0075 - p.pos.y, -0.03); group.add(foot);
      }
    }
    it.panelMat = mat; it.top = new THREE.Vector3(0, cy + h / 2 + 0.1, 0);
    const url = await resolveUrl(m.url);
    if (token !== this.token) return;
    if (m.typ === "wideo") {
      let v = this.videos.get(m.id);
      if (!v) {
        v = document.createElement("video");
        Object.assign(v, { crossOrigin: "anonymous", playsInline: true, muted: this.wycisz, preload: "auto", loop: false });
        v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", "");
        v.addEventListener("loadeddata", () => { if (v.currentTime === 0) v.currentTime = 0.05; }, { once: true });
        v.src = url; this.videos.set(m.id, v);
      }
      const tex = new THREE.VideoTexture(v); tex.colorSpace = THREE.SRGBColorSpace;
      mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true; it.video = v;
      const icon = new THREE.Mesh(new THREE.CircleGeometry(Math.min(w, h) * 0.18, 40), new THREE.MeshBasicMaterial({ map: canvasText(["▶"], { w: 256, h: 256, size: 150, bg: "rgba(0,0,0,0.55)" }), transparent: true, toneMapped: false }));
      icon.position.set(0, cy, 0.005); group.add(icon); it.playIcon = icon;
    } else {
      const tex = await texLoader.loadAsync(url);
      if (token !== this.token) { tex.dispose(); return; }
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      mat.map = tex; mat.color.set(0xffffff); mat.needsUpdate = true;
    }
  }

  async _model(it, m, p, token) {
    const { group } = it;
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.06, 48), new THREE.MeshStandardMaterial({ color: 0xf1ece2, roughness: 0.5 }));
    ped.position.y = 0.03; group.add(ped);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.006, 8, 64), new THREE.MeshStandardMaterial({ color: ACCENT, metalness: 0.6, roughness: 0.3 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.06; group.add(ring);
    const url = await resolveUrl(m.url);
    let gltf = this.gltfCache.get(url);
    if (!gltf) { gltf = await loader.loadAsync(url); this.gltfCache.set(url, gltf); }
    if (token !== this.token) return;
    const obj = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(obj), d = box.getSize(new THREE.Vector3());
    const s = Math.min(0.78 / d.y, p.width / Math.max(d.x, d.z));
    obj.scale.setScalar(s);
    const c = box.getCenter(new THREE.Vector3());
    obj.position.set(-c.x * s, 0.06 - box.min.y * s, -c.z * s);
    obj.traverse(o => { if (o.isMesh) o.userData.shared = true; });
    const spin = new THREE.Group(); spin.add(obj); group.add(spin);
    it.spin = spin; it.top = new THREE.Vector3(0, 0.06 + d.y * s + 0.12, 0);
    if (gltf.animations?.length) {
      const mixer = new THREE.AnimationMixer(obj); gltf.animations.forEach(a => mixer.clipAction(a).play()); this.mixers.push(mixer);
    }
  }

  /** Awatar-przewodnik stojący z boku sceny (nie znika przy zmianie sceny). */
  async dodajPrzewodnika(url, { x = 1.22, z = 0.55 } = {}) {
    const g = await loader.loadAsync(url);
    const av = g.scene, box = new THREE.Box3().setFromObject(av), d = box.getSize(new THREE.Vector3());
    const k = 0.62 / d.y; av.scale.setScalar(k); av.position.y = -box.min.y * k;
    const holder = new THREE.Group(); holder.add(av); holder.position.set(x, 0, z);
    holder.rotation.y = Math.atan2(-x, 1.2 - z) * 0.6;   // zwrócony między widzów a środek sceny
    const mixer = new THREE.AnimationMixer(av);
    const acts = Object.fromEntries(g.animations.map(c => [c.name, mixer.clipAction(c)]));
    let cur = null, talking = false;
    const to = (n, once) => {
      const a = acts[n] || acts.Spoczynek || Object.values(acts)[0]; if (!a || (a === cur && !once)) return;
      a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = !!once; a.play();
      if (cur && cur !== a) cur.crossFadeTo(a, 0.3, false); cur = a;
    };
    mixer.addEventListener("finished", () => to(talking ? "Mowi" : "Spoczynek"));
    to("Spoczynek");
    this.guide = { holder, mixer, to, set talking(v) { talking = v; to(v ? "Mowi" : "Spoczynek"); }, get talking() { return talking; } };
    this.root.add(holder);
    return this.guide;
  }
  przewodnikMowi(on) { if (this.guide && this.guide.talking !== on) this.guide.talking = on; }
  przewodnikMacha() { this.guide?.to("Macha", true); }
  przewodnikWskazuje() { this.guide?.to("Wskazuje", true); }

  /** Wyróżnienie elementu (strzałka nad nim, lekkie powiększenie, przyciemnienie reszty). null = brak. */
  ustawFokus(id) {
    this.focusId = id && this.items.has(id) ? id : null;
    for (const [k, it] of this.items) {
      it.target = !this.focusId ? 1 : (k === this.focusId ? 1.22 : 0.9);
      if (it.panelMat) it.panelMat.color.setScalar(!this.focusId || k === this.focusId ? 1 : 0.45);
    }
    this.arrow.visible = !!this.focusId;
  }

  /** Synchronizacja filmu: { id, gra, t } */
  ustawWideo(st) {
    if (!st) return;
    const v = this.videos.get(st.id); if (!v) return;
    const target = st.t + (st.gra ? 0.25 : 0);
    if (Number.isFinite(target) && Math.abs(v.currentTime - target) > 1.2) { try { v.currentTime = target; } catch {} }
    if (st.gra && v.paused) v.play().catch(() => {});
    if (!st.gra && !v.paused) v.pause();
  }

  wyciszenie(on) { this.wycisz = on; for (const v of this.videos.values()) v.muted = on; }

  /** Element trafiony promieniem (klik w scenę) → id materiału albo null */
  trafienie(raycaster) {
    const hit = raycaster.intersectObjects(this.root.children, true).find(h => h.object.visible);
    let o = hit?.object;
    while (o && !o.userData.id) o = o.parent;
    return o?.userData.id || null;
  }

  /** Pozycja elementu w układzie świata (do ustawienia kamery) */
  pozycja(id) {
    const it = this.items.get(id); if (!it) return null;
    const v = new THREE.Vector3(0, (it.top?.y || 0.6) * 0.55, 0); return it.group.localToWorld(v);
  }

  update(dt) {
    this.t += dt;
    for (const m of this.mixers) m.update(dt);
    this.guide?.mixer.update(dt);
    for (const [k, it] of this.items) {
      it.scale += (it.target - it.scale) * Math.min(1, dt * 6);
      it.group.scale.setScalar(it.scale);
      if (it.spin && k !== this.focusId) it.spin.rotation.y += dt * 0.18;
      if (it.playIcon) it.playIcon.visible = !!it.video?.paused;
    }
    if (this.focusId) {
      const it = this.items.get(this.focusId);
      const p = it.top.clone(); p.y += Math.sin(this.t * 3) * 0.025;
      this.arrow.position.copy(it.group.localToWorld(p)); this.root.worldToLocal(this.arrow.position);
      this.arrow.rotation.y += dt * 1.5;
    }
  }
}

/** Standardowe oświetlenie sceny (dla widoku 3D i AR) */
export function swiatla(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7f70, 2.0));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(1.2, 2.5, 1.8); scene.add(sun);
  return sun;
}
