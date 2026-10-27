/*
 * Sterowanie gestami dłoni (MediaPipe Gesture Recognizer, działa w przeglądarce, obraz nie opuszcza urządzenia).
 *
 *   const g = await uruchomGesty({ facing: "user", onZdarzenie(typ, dane) { … }, onRamka(stan) { … } });
 *   g.stop();
 *
 * Zdarzenia (typ → dane):
 *   "szczypniecieStart" {x, y}         – złączenie kciuka i palca wskazującego („chwyt”)
 *   "szczypniecie"      {dx, dy, skala} – ruch chwyconej dłoni (od poprzedniej klatki); skala > 1 = dłoń bliżej kamery
 *   "szczypniecieKoniec"
 *   "machniecie"        {kierunek: "lewo"|"prawo"} – szybki ruch otwartej dłoni w bok
 *   "gest"              {nazwa}         – gest przytrzymany ok. 0,9 s: Open_Palm, Closed_Fist, Thumb_Up, Thumb_Down, Victory, ILoveYou
 * Stan klatki (onRamka): { reka, x, y, wskaz: {x,y}|null, szczypanie, gest }  – współrzędne 0..1 jak na ekranie
 */
const MP = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10";
const MODEL = "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";

export const NAZWY = { Open_Palm: "✋ otwarta dłoń", Closed_Fist: "✊ pięść", Pointing_Up: "☝️ wskazanie", Thumb_Up: "👍 kciuk w górę",
  Thumb_Down: "👎 kciuk w dół", Victory: "✌️ znak V", ILoveYou: "🤟", None: "" };

let _recognizer = null;
async function recognizer() {
  if (_recognizer) return _recognizer;
  const { FilesetResolver, GestureRecognizer } = await import(`${MP}/vision_bundle.mjs`);
  const vision = await FilesetResolver.forVisionTasks(`${MP}/wasm`);
  const make = delegate => GestureRecognizer.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: "VIDEO", numHands: 1,
    minHandDetectionConfidence: 0.6, minHandPresenceConfidence: 0.6, minTrackingConfidence: 0.5,
  });
  try { _recognizer = await make("GPU"); } catch { _recognizer = await make("CPU"); }
  return _recognizer;
}

const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export async function uruchomGesty({ video = null, facing = "user", podglad = true, miejscePodgladu = "lewy-dol",
                                     onZdarzenie = () => {}, onRamka = () => {}, symulacja = null } = {}) {
  let stream = null, wlasneVideo = false, running = true;
  const mirror = facing === "user";

  if (!video && !symulacja) {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    video = Object.assign(document.createElement("video"), { muted: true, playsInline: true, autoplay: true });
    video.setAttribute("playsinline", ""); video.srcObject = stream; await video.play().catch(() => {});
    wlasneVideo = true;
  }
  const rec = symulacja ? null : await recognizer();

  /* ---------- podgląd: mały obraz z kamery + szkielet dłoni ---------- */
  let box = null, cv = null, label = null;
  if (podglad) {
    box = document.createElement("div");
    const pos = { "lewy-dol": "left:12px;bottom:12px", "prawy-dol": "right:12px;bottom:12px", "lewy-gora": "left:12px;top:70px", "prawy-gora": "right:12px;top:70px" }[miejscePodgladu];
    const [bw, bh] = innerWidth < 600 ? [116, 87] : [176, 132];   // na telefonie mniejszy podgląd
    box.style.cssText = `position:fixed;${pos};width:${bw}px;height:${bh}px;border-radius:14px;overflow:hidden;z-index:60;background:#000;box-shadow:0 6px 20px rgba(0,0,0,.35);border:2px solid rgba(255,255,255,.85)`;
    if (wlasneVideo) {
      const v2 = video; v2.style.cssText = `width:100%;height:100%;object-fit:cover;${mirror ? "transform:scaleX(-1)" : ""}`; box.appendChild(v2);
    } else box.style.background = "rgba(0,0,0,.45)";
    cv = document.createElement("canvas"); cv.width = 176; cv.height = 132; cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
    label = document.createElement("div"); label.style.cssText = "position:absolute;left:6px;bottom:5px;right:6px;color:#fff;font:700 12px system-ui,sans-serif;text-shadow:0 1px 3px #000";
    box.append(cv, label); document.body.appendChild(box);
  } else if (wlasneVideo) { video.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none"; document.body.appendChild(video); }

  /* ---------- logika gestów ---------- */
  let pinch = false, prev = null, sm = null, hist = [], lastSwipe = -1e9, hold = { n: null, t: 0, fired: false, x: 0, y: 0 };
  const stan = { reka: false };
  const X = p => (mirror ? 1 - p.x : p.x);
  const ext = (lm, tip, pip) => d2(lm[tip], lm[0]) > d2(lm[pip], lm[0]) * 1.12;

  function przetworz(res, now) {
    const lm = res?.landmarks?.[0];
    if (!lm) {
      if (pinch) { pinch = false; onZdarzenie("szczypniecieKoniec", {}); }
      Object.assign(stan, { reka: false, wskaz: null, szczypanie: false, gest: "None" }); hist = []; hold.n = null; sm = null; prev = null;
      onRamka(stan); rysuj(null); return;
    }
    const top = res.gestures?.[0]?.[0];
    let gest = top && top.score > 0.55 ? top.categoryName : "None";
    const size = Math.max(0.02, d2(lm[0], lm[9]));
    const pd = d2(lm[4], lm[8]) / size;
    const raw = { x: X(lm[9]), y: lm[9].y, px: X(lm[8]), py: lm[8].y };
    sm = sm ? { x: sm.x * 0.45 + raw.x * 0.55, y: sm.y * 0.45 + raw.y * 0.55, px: sm.px * 0.4 + raw.px * 0.6, py: sm.py * 0.4 + raw.py * 0.6, size: sm.size * 0.6 + size * 0.4 } : { ...raw, size };
    const wskazuje = !pinch && (gest === "Pointing_Up" || (ext(lm, 8, 6) && !ext(lm, 12, 10) && !ext(lm, 16, 14) && !ext(lm, 20, 18)));
    if (wskazuje) gest = "Pointing_Up";

    // szczypnięcie (z histerezą)
    if (!pinch && pd < 0.33 && gest !== "Open_Palm") { pinch = true; onZdarzenie("szczypniecieStart", { x: sm.x, y: sm.y }); }
    else if (pinch && pd > 0.52) { pinch = false; onZdarzenie("szczypniecieKoniec", {}); }
    if (pinch && prev) onZdarzenie("szczypniecie", { dx: sm.x - prev.x, dy: sm.y - prev.y, skala: sm.size / prev.size, x: sm.x, y: sm.y });

    // machnięcie (otwarta dłoń / brak gestu, szybki ruch w poziomie)
    if (!pinch && !wskazuje) {
      hist.push({ t: now, x: raw.x, y: raw.y }); hist = hist.filter(h => now - h.t < 600);   // surowa pozycja: działa też przy niskim fps
      const a = hist[0], b = hist[hist.length - 1];
      if (hist.length >= 2 && b.t - a.t > 80 && now - lastSwipe > 900 && Math.abs(b.x - a.x) > 0.22 && Math.abs(b.y - a.y) < 0.16) {
        lastSwipe = now; hist = []; hold.n = null;
        onZdarzenie("machniecie", { kierunek: b.x < a.x ? "lewo" : "prawo" });
      }
    } else hist = [];

    // przytrzymany gest (dłoń prawie nieruchoma)
    const n = pinch ? "Pinch" : gest;
    if (n !== hold.n || Math.hypot(sm.x - hold.x, sm.y - hold.y) > 0.07) hold = { n, t: now, fired: false, x: sm.x, y: sm.y };
    else if (!hold.fired && now - hold.t > 900 && !["None", "Pinch", "Pointing_Up"].includes(n) && now - lastSwipe > 700) {
      hold.fired = true; onZdarzenie("gest", { nazwa: n });
    }
    prev = { ...sm };
    Object.assign(stan, { reka: true, x: sm.x, y: sm.y, wskaz: wskazuje ? { x: sm.px, y: sm.py } : null, szczypanie: pinch, gest, postep: hold.fired || hold.n === "None" || hold.n === "Pinch" || hold.n === "Pointing_Up" ? 0 : Math.min(1, (now - hold.t) / 900) });
    onRamka(stan); rysuj(lm);
  }

  const POL = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
  function rysuj(lm) {
    if (!cv) return;
    const g = cv.getContext("2d"); g.clearRect(0, 0, cv.width, cv.height);
    label.textContent = !lm ? "pokaż dłoń 🖐" : (stan.szczypanie ? "🤏 chwyt" : NAZWY[stan.gest] || "");
    if (!lm) return;
    const P = p => [X(p) * cv.width, p.y * cv.height];
    g.strokeStyle = stan.szczypanie ? "#ffcc33" : "#5cf08a"; g.lineWidth = 2.5;
    for (const [a, b] of POL) { const [x1, y1] = P(lm[a]), [x2, y2] = P(lm[b]); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
    g.fillStyle = "#fff"; for (const p of lm) { const [x, y] = P(p); g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill(); }
    if (stan.postep > 0) { g.strokeStyle = "#ffcc33"; g.lineWidth = 4; g.beginPath(); g.arc(cv.width - 18, 18, 11, -Math.PI / 2, -Math.PI / 2 + stan.postep * Math.PI * 2); g.stroke(); }
  }

  let last = 0;
  function petla(now) {
    if (!running) return;
    requestAnimationFrame(petla);
    if (now - last < 45) return;      // ok. 20 klatek/s wystarcza i oszczędza baterię
    last = now;
    try {
      if (symulacja) przetworz(symulacja(now), now);
      else if (video.readyState >= 2 && video.videoWidth) przetworz(rec.recognizeForVideo(video, now), now);
    } catch (e) { console.warn("gesty:", e); }
  }
  requestAnimationFrame(petla);

  return {
    stan,
    stop() {
      running = false; box?.remove();
      if (wlasneVideo) { stream?.getTracks().forEach(t => t.stop()); video.remove(); }
    },
  };
}

/* ---------- symulowana dłoń (do testów bez kamery): tworzy 21 punktów dla podanej pozy ---------- */
export function sztucznaDlon({ x = 0.5, y = 0.5, rozmiar = 0.18, poza = "dlon", mirror = true }) {
  // układ punktów jak w MediaPipe (0 nadgarstek, 4 kciuk, 8 wskazujący, 12 środkowy, 16 serdeczny, 20 mały)
  const s = rozmiar, sx = mirror ? 1 - x : x;
  const base = [[0, 0.5], [-0.35, 0.35], [-0.55, 0.15], [-0.65, -0.05], [-0.72, -0.25],
    [-0.25, -0.05], [-0.28, -0.4], [-0.3, -0.62], [-0.31, -0.8], [0, -0.0], [0, -0.42], [0, -0.66], [0, -0.86],
    [0.22, 0.02], [0.24, -0.36], [0.25, -0.58], [0.26, -0.76], [0.4, 0.1], [0.44, -0.2], [0.46, -0.38], [0.47, -0.52]];
  const pts = base.map(([a, b]) => ({ x: a, y: b }));
  const zegnij = (tip, pip, mcp) => { pts[tip] = { x: pts[mcp].x * 0.9, y: pts[mcp].y + 0.12 }; pts[pip] = { x: pts[mcp].x, y: pts[mcp].y - 0.1 }; };
  let gest = "Open_Palm";
  if (poza === "wskaz") { zegnij(12, 10, 9); zegnij(16, 14, 13); zegnij(20, 18, 17); pts[4] = { x: -0.15, y: 0.05 }; gest = "Pointing_Up"; }
  if (poza === "chwyt") { pts[4] = { x: -0.3, y: -0.62 }; pts[8] = { x: -0.31, y: -0.6 }; gest = "None"; }
  if (poza === "piesc") { zegnij(8, 6, 5); zegnij(12, 10, 9); zegnij(16, 14, 13); zegnij(20, 18, 17); gest = "Closed_Fist"; }
  if (poza === "kciuk") { zegnij(8, 6, 5); zegnij(12, 10, 9); zegnij(16, 14, 13); zegnij(20, 18, 17); pts[4] = { x: -0.5, y: -0.6 }; gest = "Thumb_Up"; }
  if (poza === "v") { zegnij(16, 14, 13); zegnij(20, 18, 17); pts[4] = { x: -0.1, y: 0.05 }; gest = "Victory"; }
  // skala: odległość nadgarstek–środek dłoni ≈ rozmiar
  return { landmarks: [pts.map(p => ({ x: sx + p.x * s * 1.6, y: y + p.y * s * 1.6, z: 0 }))], gestures: [[{ categoryName: gest, score: 0.9 }]] };
}
