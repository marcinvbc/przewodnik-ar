/*
 * PLANER SCENY e-peAR
 * Układa slajdy sceny AR (modele 3D, zdjęcia, filmy, teksty, PDF) tak, jak robi to aplikacja mobilna e-peAR,
 * pokazuje podgląd (widok z góry + 3D) i pozwala poprawiać obiekty przyciskami: większy, mniejszy, w lewo, w prawo,
 * bliżej, dalej, wyżej, niżej, obrót. Wynik trafia do paczki – Pomocnik e-peAR zapisuje go w kursie jako scenę.
 *
 * Współrzędne jak w e-peAR (Unity): metry, y w górę, oglądający stoi w punkcie (0, 0, 0).
 * „Skala” to liczba z aplikacji e-peAR (np. model ≈ 20, zdjęcie ≈ 30, tekst ≈ 1,7) – podgląd jest przybliżony.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { esc, toast } from "./wspolne.js";

/* Układ bazowy – z kursu testowego ułożonego w aplikacji e-peAR (13.11.2026): tekst po lewej, model z przodu, zdjęcie po prawej.
   Każde miejsce: [x, y, z, obrót Y, skala]. Kolejne obiekty tego samego rodzaju trafiają na następne miejsca. */
export const UKLAD_FABRYCZNY = {
  model: [[0.5, 0.97, 1.48, 0, 20.8], [-0.9, 0.97, 1.3, 20, 20.8], [1.6, 0.97, 0.9, -40, 20.8]],
  obraz: [[2.87, 1.43, -1.64, 92, 30.8], [-2.4, 1.4, 1.7, 316, 38.2], [2.2, 1.43, 1.2, 60, 30.8], [-2.2, 1.43, -0.6, 280, 30.8]],
  film: [[0.8, 1.7, 1.9, 0, 16], [2.4, 1.6, 0.4, 80, 16]],
  tekst: [[-0.78, 1.23, -0.2, 8, 1.71], [-1.6, 1.23, 1.0, -40, 1.71]],
  pdf: [[-0.75, 1.3, 1.9, 0, 1.71]],
  awatar: [[-1.15, 0.85, 0.64, 253, 1.62]],
};
const KLUCZ = "epearUkladBazowy";
export function ukladBazowy() { try { return { ...UKLAD_FABRYCZNY, ...JSON.parse(localStorage.getItem(KLUCZ) || "{}") }; } catch { return { ...UKLAD_FABRYCZNY }; } }
export function zapiszUkladBazowy(slajd) {
  const u = {};
  for (const o of slajd.obiekty) (u[o.rodzaj] ||= []).push([...o.poz.map(v => +v.toFixed(3)), Math.round(o.rotY), +o.skala.toFixed(2)]);
  const stary = ukladBazowy();
  for (const k of Object.keys(UKLAD_FABRYCZNY)) if (u[k]) u[k] = [...u[k], ...stary[k].slice(u[k].length)];
  localStorage.setItem(KLUCZ, JSON.stringify(u));
}
export function przywrocFabryczny() { localStorage.removeItem(KLUCZ); }

const RODZAJE = { model: "🧊 model 3D", obraz: "🖼 zdjęcie", film: "🎬 film", tekst: "📝 tekst", pdf: "📄 PDF", awatar: "🧑‍🏫 awatar" };
const KOLORY = { model: "#c9562f", obraz: "#3f63c9", film: "#8a4fb3", tekst: "#2f6b3a", pdf: "#b30b00", awatar: "#e0a030" };

/** Automatyczny układ: jeden slajd na scenę lekcji, obiekty rozkładane na miejscach z układu bazowego. */
export function ukladAuto(P) {
  const u = ukladBazowy();
  const slajdy = [];
  const wgSceny = new Map();
  P.pliki.forEach((f, i) => {
    const n = parseInt(f.nazwa, 10); const k = Number.isFinite(n) ? n : 1;
    if (!wgSceny.has(k)) wgSceny.set(k, []);
    wgSceny.get(k).push(i);
  });
  for (const [nr, idx] of [...wgSceny.entries()].sort((a, b) => a[0] - b[0])) {
    const licz = {}, obiekty = [];
    for (const i of idx) {
      const f = P.pliki[i];
      const rodzaj = f.rodzaj === "pdf" ? "pdf" : f.rodzaj;
      if (!RODZAJE[rodzaj]) continue;
      const nrM = licz[rodzaj] = (licz[rodzaj] ?? -1) + 1;
      const m = u[rodzaj][nrM] || przesun(u[rodzaj][u[rodzaj].length - 1], nrM - u[rodzaj].length + 1);
      obiekty.push({ id: crypto.randomUUID(), rodzaj, plik: i, nazwa: f.nazwa, poz: m.slice(0, 3), rotY: m[3], skala: m[4], tekst: f.tekst || "" });
    }
    slajdy.push({ tytul: P.sceny?.[nr - 1] || `Slajd ${nr}`, obiekty });
  }
  return { slajdy };
}
function przesun(m, k) { const a = Math.atan2(m[0], m[2]) + k * 0.5, r = Math.hypot(m[0], m[2]); return [Math.sin(a) * r, m[1], Math.cos(a) * r, m[3] + k * 28, m[4]]; }

/* ======================================================================= okno planera */
export function oknoPlanera(P, scena, onGotowe) {
  const el = document.createElement("div");
  el.className = "planer-ep";
  el.innerHTML = `<style>
    .planer-ep{position:fixed;inset:0;z-index:140;background:rgba(15,20,22,.65);display:grid;place-items:center;padding:10px;font:14px/1.45 system-ui,sans-serif;color:#1f2a2e}
    .planer-ep .ok{background:#fffdf8;border-radius:20px;width:min(1180px,100%);height:min(820px,100%);display:grid;grid-template-rows:auto 1fr auto;overflow:hidden}
    .planer-ep header,.planer-ep footer{display:flex;gap:8px;align-items:center;padding:12px 16px;border-bottom:1px solid #e3dccd;flex-wrap:wrap}
    .planer-ep footer{border-top:1px solid #e3dccd;border-bottom:0;justify-content:space-between}
    .planer-ep .tabs{display:flex;gap:6px;flex-wrap:wrap;flex:1}.planer-ep .tabs button{border:1.5px solid #e3dccd;background:#fff;border-radius:99px;padding:6px 12px;font:600 13px system-ui;cursor:pointer}
    .planer-ep .tabs button.on{background:#1f2a2e;color:#fff;border-color:#1f2a2e}
    .planer-ep .srodek{display:grid;grid-template-columns:minmax(0,1fr) 340px;min-height:0}
    @media(max-width:860px){.planer-ep .srodek{grid-template-columns:1fr;grid-template-rows:55% 45%}}
    .planer-ep .widoki{display:grid;grid-template-rows:1fr 1fr;min-height:0;background:#eef0ee}
    .planer-ep .widok3d,.planer-ep .zgory{position:relative;min-height:0}
    .planer-ep .zgory canvas{width:100%;height:100%;display:block}
    .planer-ep .etyk{position:absolute;left:10px;top:8px;font-size:12px;font-weight:700;color:#5b6266;background:rgba(255,255,255,.8);border-radius:99px;padding:2px 9px;pointer-events:none}
    .planer-ep .lista{min-width:0;overflow:auto;padding:12px;border-left:1px solid #e3dccd;display:grid;gap:8px;align-content:start}
    .planer-ep .ob{min-width:0;border:1.5px solid #e3dccd;border-radius:14px;padding:9px;background:#fff;cursor:pointer}
    .planer-ep .ob.on{border-color:#c9562f;box-shadow:0 0 0 3px #f6d3c4}
    .planer-ep .ob .n{font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .planer-ep .przy{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;margin-top:7px}
    .planer-ep .przy button{border:1px solid #e3dccd;background:#faf7f0;border-radius:9px;padding:6px 0;font:700 13px system-ui;cursor:pointer}
    .planer-ep .przy button:hover{background:#fff1e9;border-color:#c9562f}
    .planer-ep .m{color:#6b6f66;font-size:12px}
    .planer-ep .btn{border:1px solid #e3dccd;background:#fff;border-radius:99px;padding:8px 14px;font:600 13px system-ui;cursor:pointer}
    .planer-ep .btn.g{background:#c9562f;color:#fff;border-color:#c9562f}
  </style>
  <div class="ok">
    <header><b style="font-size:17px">🎬 Scena w e-peAR</b><div class="tabs" data-tabs></div><button class="btn" data-x>✕</button></header>
    <div class="srodek">
      <div class="widoki"><div class="widok3d" data-3d><span class="etyk">Podgląd – tak mniej więcej zobaczysz to w AR (obracaj myszą lub palcem)</span></div>
        <div class="zgory"><canvas data-gora></canvas><span class="etyk">Widok z góry – Ty stoisz w środku ●, patrzysz w górę ekranu</span></div></div>
      <div class="lista" data-lista></div>
    </div>
    <footer><span class="m">Wielkości w podglądzie są przybliżone – sprawdź scenę w aplikacji e-peAR.</span>
      <span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" data-baza title="Zapamiętaj ustawienie tego slajdu jako bazowe dla nowych lekcji">⭐ Zapamiętaj jako układ bazowy</button>
      <button class="btn" data-auto>↺ Ułóż od nowa</button><button class="btn g" data-ok>✅ Gotowe</button></span></footer>
  </div>`;
  document.body.appendChild(el);
  let nr = 0, wybrany = null;
  const $ = s => el.querySelector(s);
  const zamknij = () => { r.dispose(); el.remove(); };
  $("[data-x]").onclick = zamknij;
  $("[data-ok]").onclick = () => { onGotowe(scena); zamknij(); };
  $("[data-baza]").onclick = () => { zapiszUkladBazowy(scena.slajdy[nr]); toast("⭐ Zapamiętano – nowe lekcje będą układane tak jak ten slajd"); };
  $("[data-auto]").onclick = () => { if (!confirm("Ułożyć wszystkie slajdy od nowa według układu bazowego?")) return; scena.slajdy = ukladAuto(P).slajdy; nr = Math.min(nr, scena.slajdy.length - 1); wybrany = null; rysuj(); };

  /* ---------- podgląd 3D */
  const box3 = $("[data-3d]");
  const r = new THREE.WebGLRenderer({ antialias: true }); r.setPixelRatio(Math.min(2, devicePixelRatio)); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
  box3.appendChild(r.domElement);
  const sc = new THREE.Scene(); sc.background = new THREE.Color("#e9edf0");
  sc.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
  sc.add(new THREE.HemisphereLight(0xffffff, 0x9a907f, 0.7)); const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(2, 4, 1); sc.add(sun);
  const podloga = new THREE.Mesh(new THREE.CircleGeometry(4.5, 64), new THREE.MeshStandardMaterial({ color: "#d9dcd6", roughness: 1 })); podloga.rotation.x = -Math.PI / 2; sc.add(podloga);
  sc.add(new THREE.GridHelper(9, 18, 0xb8bdb4, 0xc9cdc6));
  const ludzik = new THREE.Group(); const mat = new THREE.MeshStandardMaterial({ color: "#1f2a2e", transparent: true, opacity: 0.35 });
  const glowa = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), mat); glowa.position.y = 1.6; ludzik.add(glowa);
  const cialo = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.3, 20), mat); cialo.position.y = 0.75; ludzik.add(cialo); sc.add(ludzik);
  const kam = new THREE.PerspectiveCamera(60, 1, 0.05, 100); kam.position.set(0, 5.2, -2.4);
  const ctl = new OrbitControls(kam, r.domElement); ctl.target.set(0, 0.6, 0.7); ctl.update();
  const grupa = new THREE.Group(); sc.add(grupa);
  const cache = new Map(), loader = new GLTFLoader();
  let zyje = true;
  const rozmiar = () => { const w = box3.clientWidth, h = box3.clientHeight; if (w && h) { r.setSize(w, h); kam.aspect = w / h; kam.updateProjectionMatrix(); } rysujGore(); };
  new ResizeObserver(rozmiar).observe(box3);
  (function petla() { if (!zyje) return; requestAnimationFrame(petla); ctl.update(); r.render(sc, kam); })();
  r.dispose = (d => () => { zyje = false; d.call(r); })(r.dispose);

  const url = i => { const f = P.pliki[i]; return f.url ||= URL.createObjectURL(f.blob); };
  async function obiekt3d(o) {
    const g = new THREE.Group(); g.userData.id = o.id;
    const f = P.pliki[o.plik];
    if (o.rodzaj === "awatar") {
      const m = new THREE.MeshStandardMaterial({ color: "#e0a030" }), k = o.skala / 1.62;
      const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.17 * k, 0.75 * k, 6, 16), m); t.position.y = 0.55 * k; g.add(t);
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.14 * k, 20, 14), new THREE.MeshStandardMaterial({ color: "#f2c9a0" })); h.position.y = 1.18 * k; g.add(h);
      g.position.set(o.poz[0], 0, o.poz[2]); g.rotation.y = THREE.MathUtils.degToRad(o.rotY); return g;
    }
    if (o.rodzaj === "model") {
      try {
        if (!cache.has(o.plik)) cache.set(o.plik, loader.loadAsync(url(o.plik)));
        const m = (await cache.get(o.plik)).scene.clone(true);
        const b = new THREE.Box3().setFromObject(m), s = b.getSize(new THREE.Vector3());
        const k = (o.skala / 20.8) * 0.5 / Math.max(s.x, s.y, s.z, 1e-6);       // model ≈ 0,5 m przy skali 20,8
        m.scale.setScalar(k); m.position.set(-(b.min.x + b.max.x) / 2 * k, -b.min.y * k, -(b.min.z + b.max.z) / 2 * k);
        g.add(m);
      } catch { g.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: KOLORY.model }))); }
    } else {
      const w = o.rodzaj === "obraz" ? 0.9 * o.skala / 30.8 : o.rodzaj === "film" ? 1.0 * o.skala / 16 : 0.7 * o.skala / 1.71;
      let tex = null, asp = 0.62;
      if (o.rodzaj === "obraz" && f?.blob) { tex = await new THREE.TextureLoader().loadAsync(url(o.plik)); asp = tex.image.height / tex.image.width; }
      else {
        const c = document.createElement("canvas"); c.width = 512; c.height = 320; const x = c.getContext("2d");
        x.fillStyle = "#fff"; x.fillRect(0, 0, 512, 320); x.fillStyle = KOLORY[o.rodzaj]; x.fillRect(0, 0, 512, 56);
        x.fillStyle = "#fff"; x.font = "700 30px system-ui"; x.fillText(RODZAJE[o.rodzaj], 16, 39);
        x.fillStyle = "#1f2a2e"; x.font = "24px system-ui"; String(o.tekst || f?.nazwa || "").slice(0, 200).match(/.{1,34}(\s|$)/g)?.slice(0, 8).forEach((l, i) => x.fillText(l.trim(), 16, 96 + i * 30));
        tex = new THREE.CanvasTexture(c); asp = 320 / 512;
      }
      if (tex) tex.colorSpace = THREE.SRGBColorSpace;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, w * asp), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
      p.position.y = 0; g.add(p);
    }
    g.position.set(o.poz[0], o.poz[1], o.poz[2]);
    if (o.rodzaj === "model") g.rotation.y = THREE.MathUtils.degToRad(o.rotY);
    else g.lookAt(0, o.poz[1], 0);                                          // zdjęcia, filmy i teksty są zwrócone do oglądającego
    return g;
  }
  let licznik = 0;
  async function scena3d() {
    const moj = ++licznik;
    const nowe = await Promise.all((scena.slajdy[nr]?.obiekty || []).map(obiekt3d));
    if (moj !== licznik) return;
    grupa.clear(); nowe.forEach(n => grupa.add(n));
    podswietl();
  }
  function podswietl() { grupa.children.forEach(g => g.traverse(m => { if (m.material?.emissive) m.material.emissive.set(g.userData.id === wybrany ? 0x331100 : 0x000000); })); }

  /* ---------- widok z góry */
  const gora = $("[data-gora]");
  function rysujGore() {
    const W = gora.clientWidth * devicePixelRatio, H = gora.clientHeight * devicePixelRatio; if (!W || !H) return;
    gora.width = W; gora.height = H; const g = gora.getContext("2d"), s = Math.min(W, H) / 9.5, cx = W / 2, cy = H / 2 + s * 0.6;
    g.fillStyle = "#f6f7f5"; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#dfe2dc"; for (let r = 1; r <= 4; r++) { g.beginPath(); g.arc(cx, cy, r * s, 0, 7); g.stroke(); }
    g.fillStyle = "#1f2a2e"; g.beginPath(); g.arc(cx, cy, 7 * devicePixelRatio, 0, 7); g.fill();
    g.beginPath(); g.moveTo(cx, cy - 16 * devicePixelRatio); g.lineTo(cx - 6 * devicePixelRatio, cy - 6 * devicePixelRatio); g.lineTo(cx + 6 * devicePixelRatio, cy - 6 * devicePixelRatio); g.fill();
    for (const o of scena.slajdy[nr]?.obiekty || []) {
      const x = cx + o.poz[0] * s, y = cy - o.poz[2] * s, on = o.id === wybrany;
      g.fillStyle = KOLORY[o.rodzaj]; g.globalAlpha = on ? 1 : 0.8; g.beginPath(); g.arc(x, y, (on ? 11 : 8) * devicePixelRatio, 0, 7); g.fill(); g.globalAlpha = 1;
      g.fillStyle = "#1f2a2e"; g.font = `${(on ? 700 : 500)} ${12 * devicePixelRatio}px system-ui`; g.fillText(o.nazwa.replace(/^\d+\s/, "").slice(0, 22), x + 12 * devicePixelRatio, y + 4 * devicePixelRatio);
    }
    gora._s = { s, cx, cy };
  }
  gora.onclick = e => {
    const { s, cx, cy } = gora._s || {}; if (!s) return; const b = gora.getBoundingClientRect(), px = (e.clientX - b.left) * devicePixelRatio, py = (e.clientY - b.top) * devicePixelRatio;
    let best = null, bd = 1e9; for (const o of scena.slajdy[nr].obiekty) { const d = Math.hypot(cx + o.poz[0] * s - px, cy - o.poz[2] * s - py); if (d < bd) { bd = d; best = o; } }
    if (best && bd < 30 * devicePixelRatio) { wybrany = best.id; lista(); rysujGore(); podswietl(); }
  };

  /* ---------- lista obiektów z przyciskami */
  const PRZ = [["wieksz", "➕", "Większy"], ["mniej", "➖", "Mniejszy"], ["lewo", "⬅", "W lewo"], ["prawo", "➡", "W prawo"], ["obrot", "⟳", "Obróć o 15°"],
    ["blizej", "⬇", "Bliżej mnie"], ["dalej", "⬆", "Dalej ode mnie"], ["wyzej", "⏫", "Wyżej"], ["nizej", "⏬", "Niżej"], ["usun", "🗑", "Usuń ze slajdu"]];
  function lista() {
    const s = scena.slajdy[nr];
    $("[data-lista]").innerHTML = (s?.obiekty || []).map(o => `<div class="ob ${o.id === wybrany ? "on" : ""}" data-o="${o.id}">
      <div class="n">${RODZAJE[o.rodzaj].split(" ")[0]} ${esc(o.nazwa.replace(/^\d+\s/, ""))}</div>
      <div class="m">skala ${o.skala.toFixed(1)} · ${o.poz.map(v => v.toFixed(2)).join(", ")} m</div>
      <div class="przy">${PRZ.filter(([k]) => k !== "obrot" || o.rodzaj === "model").map(([k, i, t]) => `<button data-a="${k}" title="${t}">${i}</button>`).join("")}</div></div>`).join("")
      + (s && !s.obiekty.some(o => o.rodzaj === "awatar") ? `<button class="btn" data-awatar style="justify-self:start">🧑‍🏫 Dodaj awatara z głosem</button>` : "")
      + `<div class="m">Przenieś obiekt na inny slajd: <select data-przenies>${scena.slajdy.map((x, i) => `<option value="${i}" ${i === nr ? "selected" : ""}>${i + 1}. ${esc(x.tytul)}</option>`).join("")}</select></div>`
      || `<div class="m">Ten slajd jest pusty.</div>`;
  }
  $("[data-lista]").onclick = e => {
    const kart = e.target.closest("[data-o]"); if (!kart) return;
    const o = scena.slajdy[nr].obiekty.find(x => x.id === kart.dataset.o); wybrany = o.id;
    const a = e.target.closest("[data-a]")?.dataset.a;
    if (a) {
      const kat = Math.atan2(o.poz[0], o.poz[2]), r_ = Math.hypot(o.poz[0], o.poz[2]);
      const naKat = (k, rr) => { o.poz[0] = Math.sin(k) * rr; o.poz[2] = Math.cos(k) * rr; o.rotY += THREE.MathUtils.radToDeg(k - kat); };
      if (a === "wieksz") o.skala *= 1.15;
      if (a === "mniej") o.skala /= 1.15;
      if (a === "lewo") naKat(kat - 0.25 / Math.max(r_, 0.5), r_);
      if (a === "prawo") naKat(kat + 0.25 / Math.max(r_, 0.5), r_);
      if (a === "blizej") naKat(kat, Math.max(0.4, r_ - 0.25));
      if (a === "dalej") naKat(kat, r_ + 0.25);
      if (a === "wyzej") o.poz[1] += 0.1;
      if (a === "nizej") o.poz[1] = Math.max(0, o.poz[1] - 0.1);
      if (a === "obrot") o.rotY = (o.rotY + 15) % 360;
      if (a === "usun") { scena.slajdy[nr].obiekty = scena.slajdy[nr].obiekty.filter(x => x !== o); wybrany = null; }
      scena3d();
    }
    lista(); rysujGore(); podswietl();
  };
  $("[data-lista]").addEventListener("click", e => {
    if (!e.target.closest("[data-awatar]")) return;
    oknoGlosu(P, scena.slajdy[nr], plikIdx => {
      const m = ukladBazowy().awatar[0];
      const o = { id: crypto.randomUUID(), rodzaj: "awatar", plik: plikIdx, nazwa: "Awatar – " + scena.slajdy[nr].tytul, poz: m.slice(0, 3), rotY: m[3], skala: m[4], mowiOdRazu: false, plec: 0 };
      scena.slajdy[nr].obiekty.push(o); wybrany = o.id; rysuj();
    });
  });
  $("[data-lista]").onchange = e => {
    if (!e.target.matches("[data-przenies]") || !wybrany) return;
    const o = scena.slajdy[nr].obiekty.find(x => x.id === wybrany); if (!o) return;
    scena.slajdy[nr].obiekty = scena.slajdy[nr].obiekty.filter(x => x !== o); scena.slajdy[+e.target.value].obiekty.push(o);
    toast(`Przeniesiono na slajd ${+e.target.value + 1}`); scena3d(); lista(); rysujGore();
  };
  function zakladki() {
    $("[data-tabs]").innerHTML = scena.slajdy.map((s, i) => `<button data-t="${i}" class="${i === nr ? "on" : ""}">${i + 1}. ${esc(s.tytul).slice(0, 26)} <span style="opacity:.6">(${s.obiekty.length})</span></button>`).join("")
      + `<button data-nowy>＋ slajd</button>`;
  }
  $("[data-tabs]").onclick = e => {
    const t = e.target.closest("[data-t]"); if (t) { nr = +t.dataset.t; wybrany = null; rysuj(); }
    if (e.target.closest("[data-nowy]")) { scena.slajdy.push({ tytul: `Slajd ${scena.slajdy.length + 1}`, obiekty: [] }); nr = scena.slajdy.length - 1; rysuj(); }
  };
  function rysuj() { zakladki(); lista(); rysujGore(); scena3d(); }
  rysuj(); setTimeout(rozmiar, 50);
}

/* ======================================================================= głos awatara (nagranie → WAV) */
async function naWav(blob) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const buf = await ctx.decodeAudioData(await blob.arrayBuffer()); ctx.close();
  const sr = 22050, n = Math.round(buf.duration * sr), off = new OfflineAudioContext(1, n, sr);
  const src = off.createBufferSource(); src.buffer = buf; src.connect(off.destination); src.start();
  const d = (await off.startRendering()).getChannelData(0);
  const out = new DataView(new ArrayBuffer(44 + n * 2)), w = (o, t) => [...t].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); out.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, sr, true); out.setUint32(28, sr * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true); w(36, "data"); out.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 0x7fff, true);
  return new Blob([out.buffer], { type: "audio/wav" });
}
function oknoGlosu(P, slajd, gotowe) {
  const tekst = slajd.obiekty.find(o => o.rodzaj === "tekst")?.tekst || "";
  const el = document.createElement("div");
  el.style.cssText = "position:fixed;inset:0;z-index:150;background:rgba(15,20,22,.6);display:grid;place-items:center;padding:12px;font:14px/1.5 system-ui,sans-serif;color:#1f2a2e";
  el.innerHTML = `<div style="background:#fffdf8;border-radius:18px;padding:18px;max-width:560px;width:100%">
    <h3 style="margin:0 0 6px;font-size:18px">🧑‍🏫 Głos awatara – ${esc(slajd.tytul)}</h3>
    <p style="margin:0 0 10px;color:#6b6f66">Awatar e-peAR odtwarza nagranie. Nagraj, co ma powiedzieć (np. przeczytaj tekst poniżej), albo wybierz plik z nagraniem.</p>
    ${tekst ? `<div style="background:#f6f1e7;border-left:4px solid #e0a030;border-radius:8px;padding:8px 10px;max-height:150px;overflow:auto">${esc(tekst)}</div>` : ""}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center">
      <button class="btn g" data-nagraj>🎙 Nagraj</button><button class="btn" data-plik>📁 Wybierz nagranie</button><span data-stan style="color:#6b6f66"></span></div>
    <audio controls data-odsluch style="width:100%;margin-top:10px" hidden></audio>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="btn" data-anuluj>Anuluj</button><button class="btn g" data-ok disabled>Dodaj awatara</button></div></div>`;
  document.body.appendChild(el);
  const $ = s => el.querySelector(s); let wav = null, rec = null, t0 = 0, tim = null;
  const pokaz = b => { wav = b; const a = $("[data-odsluch]"); a.hidden = false; a.src = URL.createObjectURL(b); $("[data-ok]").disabled = false; $("[data-stan]").textContent = `✅ ${(b.size / 1024).toFixed(0)} kB – odsłuchaj poniżej`; };
  $("[data-anuluj]").onclick = () => { rec?.stream.getTracks().forEach(t => t.stop()); el.remove(); };
  $("[data-nagraj]").onclick = async () => {
    if (rec) { rec.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }), czesci = [];
      rec = new MediaRecorder(stream); rec.stream = stream; rec.ondataavailable = e => czesci.push(e.data);
      rec.onstop = async () => { stream.getTracks().forEach(t => t.stop()); clearInterval(tim); $("[data-nagraj]").textContent = "🎙 Nagraj ponownie"; rec = null;
        $("[data-stan]").textContent = "Przetwarzam…"; pokaz(await naWav(new Blob(czesci))); };
      rec.start(); t0 = Date.now(); $("[data-nagraj]").textContent = "⏹ Zatrzymaj";
      tim = setInterval(() => $("[data-stan]").textContent = `🔴 nagrywam… ${Math.round((Date.now() - t0) / 1000)} s`, 500);
    } catch (e) { $("[data-stan]").textContent = "❌ Brak dostępu do mikrofonu: " + e.message; }
  };
  $("[data-plik]").onclick = () => { const i = document.createElement("input"); i.type = "file"; i.accept = "audio/*"; i.onchange = async () => { try { $("[data-stan]").textContent = "Przetwarzam…"; pokaz(await naWav(i.files[0])); } catch (e) { $("[data-stan]").textContent = "❌ " + e.message; } }; i.click(); };
  $("[data-ok]").onclick = () => {
    const nr = String(P.scena?.slajdy?.indexOf(slajd) + 1 || 1).padStart(2, "0");
    P.pliki.push({ nazwa: `${nr} Głos awatara.wav`, typ: "audio/wav", rodzaj: "audio", blob: wav });
    gotowe(P.pliki.length - 1); el.remove();
  };
}
