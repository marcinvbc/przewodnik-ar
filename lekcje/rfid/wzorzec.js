/* „Sprawdź swój układ” – nałożenie wzorca połączeń (AR na znaczniku maty) na układ studenta, tryb krok po kroku i raport zgodności. */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { ukladLab, ETAPY, MATA } from "./uklad.js";

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const S = { etap: 1, tryb: "caly", krok: 0, przez: 0.55, podpisy: true, stat: wczytaj(), kor: { x: 0, z: 0 } };
let W = null, root = null, R = null;   // W – wzorzec, root – kontener w scenie, R – aktywny widok {renderer, scene, camera, stop}
function wczytaj() { try { return JSON.parse(localStorage.getItem("rfid-wzorzec") || "{}"); } catch { return {}; } }
function zapisz() { try { localStorage.setItem("rfid-wzorzec", JSON.stringify(S.stat)); } catch {} }
const st = () => (S.stat[S.etap] ||= {});
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- wzorzec ---------- */
function zbuduj() {
  if (W) root.remove(W.grupa);
  W = ukladLab(S.etap); root.add(W.grupa);
  const przew = new Set(W.polaczenia.map(p => p.obj));
  W.grupa.children.forEach(ch => { if (przew.has(ch) || W.polaczenia.some(p => p.znaczniki === ch)) return;
    ch.userData.element = true; ch.traverse(o => { if (o.isMesh || o.isInstancedMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.depthWrite = false; } }); });
  S.krok = Math.min(S.krok, W.polaczenia.length - 1); pokaz(); lista();
}
function pokaz() {
  if (!W) return;
  const op = 1 - S.przez * 0.92;
  W.grupa.children.forEach(ch => { if (!ch.userData.element) return; ch.visible = S.tryb !== "przewody"; ch.traverse(o => { if (o.material) o.material.opacity = op; }); });
  W.polaczenia.forEach((p, i) => {
    const akt = S.tryb === "krok" ? i === S.krok : true, przed = S.tryb === "krok" && i < S.krok;
    p.obj.visible = S.tryb !== "krok" || i <= S.krok;
    p.obj.material.transparent = true; p.obj.material.opacity = akt ? 1 : przed ? 0.28 : 1;
    p.obj.material.emissiveIntensity = S.tryb === "krok" && akt ? 0.55 : 0;
    p.znaczniki.visible = S.podpisy && (S.tryb === "krok" ? akt : false);
  });
  const p = W.polaczenia[S.krok];
  $("#krok").hidden = S.tryb !== "krok";
  if (p) { $("#kNr").textContent = `${S.krok + 1}/${W.polaczenia.length}`; $("#kOd").innerHTML = `<span class="kolor" style="background:${p.kolor}"></span>${esc(p.od[0])} ${esc(p.od[1])} → ${esc(p.do[0])} ${esc(p.do[1])}`; $("#kOpis").textContent = p.opis; }
  $$("#lista li").forEach((li, i) => li.classList.toggle("akt", S.tryb === "krok" && i === S.krok));
}
function lista() {
  const s = st();
  $("#lista").innerHTML = W.polaczenia.map((p, i) => `<li data-i="${i}"><span class="kolor" style="background:${p.kolor}"></span>${esc(p.od[1])} → ${esc(p.do[0] === "Czytnik" ? "czytnik " : p.do[0] === "Szyna" ? "szyna " : p.do[0] + " ")}${esc(p.do[1])}<span class="st ${s[p.id] || ""}">${s[p.id] === "ok" ? "✓" : s[p.id] === "zle" ? "✗" : "–"}</span></li>`).join("");
  $$("#lista li").forEach(li => li.onclick = () => { S.tryb = "krok"; S.krok = +li.dataset.i; trybUI(); pokaz(); });
  const n = W.polaczenia.length, ok = W.polaczenia.filter(p => s[p.id] === "ok").length, spr = W.polaczenia.filter(p => s[p.id]).length;
  $("#wynik").textContent = `${Math.round(ok / n * 100)}%`; $("#pas").style.width = (ok / n * 100) + "%";
  $("#wynik").title = `sprawdzono ${spr} z ${n}`;
  pokaz();
}
function ocen(w) { const p = W.polaczenia[S.krok]; if (!p) return; st()[p.id] = w; zapisz(); if (S.krok < W.polaczenia.length - 1) S.krok++; lista(); }
function trybUI() { $$("#tryb button").forEach(b => b.classList.toggle("wyb", b.dataset.t === S.tryb)); }
function etapUI() { $$("#etap button").forEach(b => b.classList.toggle("wyb", +b.dataset.e === S.etap)); $("#etapOpis").textContent = ETAPY[S.etap - 1].opis; }

/* ---------- widoki ---------- */
function swiatla(scene, renderer) {
  scene.add(new THREE.HemisphereLight("#ffffff", "#667788", 1.4)); const d = new THREE.DirectionalLight("#fff", 1.6); d.position.set(0.3, 1, 0.5); scene.add(d);
  try { scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; } catch {}
}
function podpowiedz(html) { const p = $("#podp"); p.hidden = !html; p.querySelector("span").innerHTML = html || ""; }
const MM = 0.001;

async function start3D() {
  zatrzymaj(); $("#start").hidden = true; $("#korekta").hidden = true;
  const box = $("#scena"), renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping;
  box.prepend(renderer.domElement); renderer.domElement.style.cssText = "width:100%;height:100%;display:block";
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#1b2a38"); swiatla(scene, renderer);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.005, 10); camera.position.set(0.14, 0.27, 0.3);
  const ster = new OrbitControls(camera, renderer.domElement); ster.target.set(0.12, 0, 0.04); ster.enableDamping = true; ster.update();
  const tex = await new THREE.TextureLoader().loadAsync("rfid/mata-rfid.png"); tex.colorSpace = THREE.SRGBColorSpace;
  const mata = new THREE.Mesh(new THREE.PlaneGeometry(MATA.szer * MM, MATA.wys * MM), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
  mata.rotation.x = -Math.PI / 2; mata.position.set((MATA.szer / 2 - MATA.pole.x) * MM, -0.0002, (MATA.wys / 2 - MATA.pole.y) * MM); scene.add(mata);
  root = new THREE.Group(); scene.add(root); zbuduj();
  const rozmiar = () => { const w = box.clientWidth, h = box.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  rozmiar(); const ro = new ResizeObserver(rozmiar); ro.observe(box);
  renderer.setAnimationLoop(() => { ster.update(); renderer.render(scene, camera); });
  R = { renderer, scene, camera, stop() { renderer.setAnimationLoop(null); ro.disconnect(); renderer.dispose(); renderer.domElement.remove(); } };
  przyciskWyjscia(); podpowiedz("Podgląd 3D na wirtualnej macie · przeciągaj, by obracać");
  setTimeout(() => podpowiedz(""), 4000);
}

async function startAR() {
  zatrzymaj(); $("#start").hidden = true; $("#korekta").hidden = false;
  const img = `<img src="rfid/znacznik-rfid.jpg" alt="">`;
  podpowiedz(`${img}<span>Przygotowuję kamerę i znacznik…</span>`);
  try {
    const { getMindUrl } = await import("../../ar-plakat.js");
    const { MindARThree } = await import("mindar-image-three");
    const url = await getMindUrl({ image: "rfid/znacznik-rfid.jpg" }, p => podpowiedz(`${img}<span>Uczę się znacznika… ${Math.round(p)}% (tylko za pierwszym razem)</span>`));
    const mindar = new MindARThree({ container: $("#scena"), imageTargetSrc: url, uiLoading: "no", uiScanning: "no", uiError: "yes", filterMinCF: 0.0005, filterBeta: 0.01 });
    const { renderer, scene, camera } = mindar; renderer.outputColorSpace = THREE.SRGBColorSpace; swiatla(scene, renderer);
    const kotwica = mindar.addAnchor(0);
    // znacznik ma szerokość 1 w układzie kotwicy; pole układu na macie jest przesunięte względem środka znacznika
    const bok = MATA.znacznik.bok, sx = MATA.znacznik.x + bok / 2, sy = MATA.znacznik.y + bok / 2;
    const uchwyt = new THREE.Group(); uchwyt.rotation.x = Math.PI / 2; uchwyt.scale.setScalar(1 / (bok * MM));
    const ustaw = () => uchwyt.position.set((MATA.pole.x - sx + S.kor.x) / bok, -(MATA.pole.y - sy + S.kor.z) / bok, 0);
    ustaw(); R = { ustaw };
    root = uchwyt; kotwica.group.add(uchwyt); zbuduj();
    const zgub = () => podpowiedz(`${img}<span>Wyceluj telefon w znacznik na macie. Trzymaj go nad płytką, ok. 30–40 cm.</span>`);
    kotwica.onTargetFound = () => podpowiedz(""); kotwica.onTargetLost = zgub;
    await mindar.start(); zgub(); przyciskWyjscia();
    renderer.setAnimationLoop(() => renderer.render(scene, camera));
    R = { renderer, scene, camera, video: mindar.video, ustaw, stop() { renderer.setAnimationLoop(null); try { mindar.stop(); } catch {} renderer.dispose(); $$("#scena > video, #scena > canvas, #scena .mindar-ui-overlay").forEach(e => e.remove()); } };
  } catch (e) {
    console.error(e); podpowiedz(`Nie udało się uruchomić kamery AR (${esc(e.message || e)}). Sprawdź zgodę na kamerę albo użyj podglądu 3D.`);
    $("#start").hidden = false;
  }
}
function zatrzymaj() { if (R?.stop) R.stop(); R = null; W = null; root = null; $("#bWyjdz")?.remove(); }
function przyciskWyjscia() { const b = document.createElement("button"); b.id = "bWyjdz"; b.className = "btn"; b.textContent = "✕ Zakończ"; b.style.cssText = "position:absolute;left:10px;top:10px;z-index:20;box-shadow:0 2px 10px #0006";
  b.onclick = () => { zatrzymaj(); podpowiedz(""); $("#korekta").hidden = true; $("#start").hidden = false; root = new THREE.Group(); zbuduj(); }; $("#scena").appendChild(b); }

/* ---------- zdjęcie i raport ---------- */
function pobierz(blob, nazwa) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nazwa; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
function zdjecie() {
  if (!R?.renderer) return alertM("Najpierw włącz kamerę AR albo podgląd 3D.");
  R.renderer.render(R.scene, R.camera);
  const cv = R.renderer.domElement, c = document.createElement("canvas"); c.width = cv.width; c.height = cv.height; const g = c.getContext("2d");
  if (R.video) { const v = R.video, rv = v.getBoundingClientRect(), rc = cv.getBoundingClientRect(), k = c.width / rc.width;   // wideo MindAR leży pod płótnem – odwzoruj jego położenie
    g.drawImage(v, (rv.left - rc.left) * k, (rv.top - rc.top) * k, rv.width * k, rv.height * k); }
  g.drawImage(cv, 0, 0);
  g.fillStyle = "#0e1620cc"; g.fillRect(0, c.height - 46, c.width, 46); g.fillStyle = "#fff"; g.font = "600 20px system-ui";
  g.fillText(`Wzorzec RFID · ${ETAPY[S.etap - 1].nazwa} · zgodność ${$("#wynik").textContent} · ${new Date().toLocaleString("pl-PL")}${$("#kto").value ? " · " + $("#kto").value : ""}`, 14, c.height - 16);
  c.toBlob(b => pobierz(b, `uklad-rfid-etap${S.etap}-${Date.now()}.png`), "image/png");
}
function raport() {
  const s = st(), L = W ? W.polaczenia : [], n = L.length || 1, ok = L.filter(p => s[p.id] === "ok");
  const t = [`RAPORT ZGODNOŚCI ZE WZORCEM – układ RFID`, `${ETAPY[S.etap - 1].nazwa}`, `Kto: ${$("#kto").value || "–"}`, `Data: ${new Date().toLocaleString("pl-PL")}`, `Zgodność: ${Math.round(ok.length / n * 100)}% (${ok.length}/${L.length})`, "",
    ...L.map((p, i) => `${String(i + 1).padStart(2)}. [${s[p.id] === "ok" ? "✓" : s[p.id] === "zle" ? "✗" : " "}] ${p.od[0]} ${p.od[1]} → ${p.do[0]} ${p.do[1]}${s[p.id] === "zle" ? "   ← DO POPRAWY: " + p.opis : ""}`)].join("\n");
  pobierz(new Blob([t], { type: "text/plain;charset=utf-8" }), `raport-rfid-etap${S.etap}.txt`);
}
function alertM(t) { podpowiedz(t); setTimeout(() => podpowiedz(""), 3500); }

/* ---------- zdarzenia ---------- */
$$("#etap button").forEach(b => b.onclick = () => { S.etap = +b.dataset.e; S.krok = 0; etapUI(); if (root) zbuduj(); });
$$("#tryb button").forEach(b => b.onclick = () => { S.tryb = b.dataset.t; trybUI(); pokaz(); });
$("#przez").oninput = e => { S.przez = e.target.value / 100; pokaz(); };
$("#podpisy").onchange = e => { S.podpisy = e.target.checked; pokaz(); };
$("#kPrev").onclick = () => { S.krok = Math.max(0, S.krok - 1); pokaz(); }; $("#kNext").onclick = () => { S.krok = Math.min(W.polaczenia.length - 1, S.krok + 1); pokaz(); };
$("#kOk").onclick = () => ocen("ok"); $("#kZle").onclick = () => ocen("zle");
$("#bReset").onclick = () => { S.stat[S.etap] = {}; zapisz(); S.krok = 0; lista(); };
$("#bFoto").onclick = zdjecie; $("#bRaport").onclick = () => { if (!W) { root = new THREE.Group(); zbuduj(); } raport(); };
$("#bAR").onclick = startAR; $("#b3D").onclick = start3D;
$$("#korekta button").forEach(b => b.onclick = () => { const k = b.dataset.k; if (k === "0") S.kor = { x: 0, z: 0 }; else S.kor[k[1]] += (k[0] === "+" ? 1 : -1) * 2; R?.ustaw?.(); });
etapUI(); trybUI(); root = new THREE.Group(); zbuduj();
window.__wzorzecRFID = { S, start3D, ocen, raport, pokaz, lista, get W() { return W; }, get R() { return R; } };
