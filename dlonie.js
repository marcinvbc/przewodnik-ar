/*
 * ŚLEDZENIE DWÓCH DŁONI z kamery (MediaPipe Gesture Recognizer, wszystko liczone w przeglądarce –
 * obraz z kamery nie opuszcza komputera). Używa tego samego modelu co gesty.js, ale zwraca pełne
 * 21 punktów każdej dłoni, żeby strona mogła narysować wirtualne dłonie i chwytać nimi treści.
 *
 *   const t = await uruchomDlonie({ video, onRamka(dlonie, czas) { … } });
 *   t.stop();
 *
 * dlonie: [{ strona: "Lewa"|"Prawa", punkty: [{x,y,z}×21] (0..1, już w lustrzanym odbiciu),
 *            rozmiar, szczypie: bool, chwyt: {x,y} (środek kciuk–wskazujący), gest: "Open_Palm"|… }]
 */
const MP = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10";
const MODEL = "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";

let _rec = null;
async function recognizer() {
  if (_rec) return _rec;
  const { FilesetResolver, GestureRecognizer } = await import(`${MP}/vision_bundle.mjs`);
  const vision = await FilesetResolver.forVisionTasks(`${MP}/wasm`);
  const make = delegate => GestureRecognizer.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: "VIDEO", numHands: 2,
    minHandDetectionConfidence: 0.55, minHandPresenceConfidence: 0.55, minTrackingConfidence: 0.5,
  });
  try { _rec = await make("GPU"); } catch { _rec = await make("CPU"); }
  return _rec;
}

const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export async function kamera(video) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  video.srcObject = stream; video.muted = true; video.playsInline = true;
  await video.play().catch(() => {});
  if (!video.videoWidth) await new Promise(r => video.addEventListener("loadedmetadata", r, { once: true }));
  return stream;
}

export async function uruchomDlonie({ video, onRamka = () => {}, symulacja = null, lustro = true } = {}) {
  const rec = symulacja ? null : await recognizer();
  let running = true, last = 0;
  const pamiec = {};                       // wygładzanie i histereza szczypnięcia – osobno dla każdej strony
  const X = x => (lustro ? 1 - x : x);

  function przetworz(res) {
    const wynik = [];
    (res?.landmarks || []).forEach((lm, i) => {
      // MediaPipe zakłada obraz już odbity (selfie); obraz z kamery laptopa nie jest odbity, więc nazwy są zamienione
      const kat = res.handedness?.[i]?.[0]?.categoryName || (i ? "Right" : "Left");
      const strona = kat === "Left" ? "Prawa" : "Lewa";
      const top = res.gestures?.[i]?.[0];
      const gest = top && top.score > 0.55 ? top.categoryName : "None";
      const pkt = lm.map(p => ({ x: X(p.x), y: p.y, z: p.z || 0 }));
      const m = pamiec[strona] || (pamiec[strona] = { pkt: null, szczypie: false, widziana: 0 });
      // wygładzanie (lekkie – dłoń ma reagować szybko)
      m.pkt = m.pkt && m.pkt.length === pkt.length ? pkt.map((p, k) => ({ x: m.pkt[k].x * 0.35 + p.x * 0.65, y: m.pkt[k].y * 0.35 + p.y * 0.65, z: p.z })) : pkt;
      m.widziana = performance.now();
      const P = m.pkt, rozmiar = Math.max(0.02, d2(P[0], P[9]));
      const pd = d2(P[4], P[8]) / rozmiar;
      if (!m.szczypie && pd < 0.32 && gest !== "Open_Palm") m.szczypie = true;
      else if (m.szczypie && pd > 0.5) m.szczypie = false;
      wynik.push({ strona, punkty: P, rozmiar, szczypie: m.szczypie, chwyt: { x: (P[4].x + P[8].x) / 2, y: (P[4].y + P[8].y) / 2 }, gest });
    });
    // dłoń, która zniknęła, przestaje szczypać
    for (const s of Object.keys(pamiec)) if (!wynik.some(d => d.strona === s)) { pamiec[s].szczypie = false; pamiec[s].pkt = null; }
    return wynik;
  }

  function petla(now) {
    if (!running) return;
    requestAnimationFrame(petla);
    if (now - last < 33) return;           // ~30 klatek/s
    last = now;
    try {
      if (symulacja) onRamka(przetworz(symulacja(now)), now);
      else if (video.readyState >= 2 && video.videoWidth) onRamka(przetworz(rec.recognizeForVideo(video, now)), now);
    } catch (e) { console.warn("dlonie:", e); }
  }
  requestAnimationFrame(petla);
  return { stop() { running = false; } };
}

/* ---------- rysowanie wirtualnej dłoni na płótnie ---------- */
const KOSCI = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
const DLON = [0, 1, 5, 9, 13, 17];
const CZUBKI = [4, 8, 12, 16, 20];

/** g – kontekst 2D, P – punkty w pikselach ekranu, kolor – [r,g,b], stan – { szczypie, nadCzyms } */
export function rysujDlon(g, P, kolor, stan = {}) {
  const [r, gg, b] = kolor, c = a => `rgba(${r},${gg},${b},${a})`;
  const s = Math.hypot(P[0].x - P[9].x, P[0].y - P[9].y);       // wielkość dłoni w pikselach
  const gr = Math.max(6, s * 0.16);
  g.save();
  g.globalAlpha = 0.85;                                          // treść pod dłonią ma pozostać czytelna
  g.lineCap = "round"; g.lineJoin = "round";
  // wnętrze dłoni
  g.beginPath(); DLON.forEach((k, i) => (i ? g.lineTo(P[k].x, P[k].y) : g.moveTo(P[k].x, P[k].y))); g.closePath();
  g.fillStyle = c(0.28); g.fill();
  // palce – grube „kości” z poświatą
  g.shadowColor = c(0.9); g.shadowBlur = 18;
  g.strokeStyle = c(0.55); g.lineWidth = gr * 1.7;
  for (const [a, bb] of KOSCI) { g.beginPath(); g.moveTo(P[a].x, P[a].y); g.lineTo(P[bb].x, P[bb].y); g.stroke(); }
  g.shadowBlur = 0;
  g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = Math.max(2, gr * 0.35);
  for (const [a, bb] of KOSCI) { g.beginPath(); g.moveTo(P[a].x, P[a].y); g.lineTo(P[bb].x, P[bb].y); g.stroke(); }
  // stawy i opuszki
  for (let k = 0; k < 21; k++) {
    const tip = CZUBKI.includes(k);
    g.beginPath(); g.arc(P[k].x, P[k].y, tip ? gr * 0.75 : gr * 0.45, 0, Math.PI * 2);
    g.fillStyle = tip ? "#fff" : c(0.95); g.fill();
  }
  // punkt chwytu między kciukiem a palcem wskazującym
  const cx = (P[4].x + P[8].x) / 2, cy = (P[4].y + P[8].y) / 2;
  g.beginPath(); g.arc(cx, cy, stan.szczypie ? gr * 1.2 : gr * 1.6, 0, Math.PI * 2);
  g.lineWidth = 3; g.strokeStyle = stan.szczypie ? "#ffd23f" : stan.nadCzyms ? "#ffffff" : c(0.8);
  if (stan.szczypie) { g.fillStyle = "rgba(255,210,63,0.35)"; g.fill(); }
  g.stroke();
  g.restore();
}

/* ---------- symulowane dłonie do testów bez kamery ---------- */
export function sztucznaDlon({ x = 0.5, y = 0.5, rozmiar = 0.16, chwyt = false, strona = "Prawa", gest = "None" }) {
  const lewa = strona === "Lewa", s = rozmiar * 1.6, k = lewa ? -1 : 1;
  const base = [[0, 0.5], [-0.35, 0.35], [-0.55, 0.15], [-0.65, -0.05], [-0.72, -0.25], [-0.25, -0.05], [-0.28, -0.4], [-0.3, -0.62], [-0.31, -0.8],
    [0, 0], [0, -0.42], [0, -0.66], [0, -0.86], [0.22, 0.02], [0.24, -0.36], [0.25, -0.58], [0.26, -0.76], [0.4, 0.1], [0.44, -0.2], [0.46, -0.38], [0.47, -0.52]];
  const pts = base.map(([a, b]) => ({ x: a * k, y: b }));
  if (chwyt) { pts[4] = { x: -0.31 * k, y: -0.6 }; pts[8] = { x: -0.31 * k, y: -0.58 }; pts[3] = { x: -0.5 * k, y: -0.35 }; }
  // współrzędne „z kamery” (przed lustrem) – uruchomDlonie odbija je z powrotem
  return { lm: pts.map(p => ({ x: 1 - (x + p.x * s), y: y + p.y * s, z: 0 })), strona: lewa ? "Right" : "Left", gest: chwyt ? "None" : gest };
}
export const wynikSymulacji = dlonie => ({ landmarks: dlonie.map(d => d.lm), handedness: dlonie.map(d => [{ categoryName: d.strona }]), gestures: dlonie.map(d => [{ categoryName: d.gest, score: 0.9 }]) });
