/* Modele 3D do lekcji RFID – proceduralne, w prawdziwych wymiarach (metry).
   Każda część ma userData.opis (podpis w lekcji) i userData.rozklad (wektor przesunięcia w widoku rozłożonym).
   Wygląd ogólny, bez znaków towarowych producentów. */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

let ziarno = 11; const los = () => ((ziarno = (ziarno * 16807) % 2147483647) / 2147483647);
const tex = (w, h, rysuj, srgb = true) => { const c = document.createElement("canvas"); c.width = w; c.height = h; rysuj(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData.mimeType = "image/png"; return t; };

/* ---------- materiały ---------- */
export const MAT = {};
function mat() {
  if (MAT.miedz) return MAT;
  Object.assign(MAT, {
    miedz: new THREE.MeshStandardMaterial({ color: "#d9824a", metalness: 1, roughness: 0.28 }),
    aluminium: new THREE.MeshStandardMaterial({ color: "#cfd4da", metalness: 1, roughness: 0.32 }),
    zloto: new THREE.MeshStandardMaterial({ color: "#e8c066", metalness: 1, roughness: 0.22 }),
    cyna: new THREE.MeshStandardMaterial({ color: "#c9cdd1", metalness: 1, roughness: 0.25 }),
    epoksyd: new THREE.MeshStandardMaterial({ color: "#121316", roughness: 0.45 }),
    pcb: new THREE.MeshPhysicalMaterial({ color: "#1f4fa3", roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
    pcbZiel: new THREE.MeshPhysicalMaterial({ color: "#1d6b3c", roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
    pet: new THREE.MeshPhysicalMaterial({ color: "#f4f1e6", roughness: 0.3, transmission: 0.55, thickness: 0.0002, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    pvcBialy: new THREE.MeshPhysicalMaterial({ color: "#f7f6f2", roughness: 0.35, clearcoat: 0.5 }),
    szklo: new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.05, transmission: 0.95, thickness: 0.002, ior: 1.5, transparent: true, opacity: 0.35 }),
    ferryt: new THREE.MeshStandardMaterial({ color: "#3a3b3f", roughness: 0.6, metalness: 0.2 }),
    plastikBialy: new THREE.MeshPhysicalMaterial({ color: "#eceeef", roughness: 0.4, clearcoat: 0.3 }),
    plastikCzarny: new THREE.MeshStandardMaterial({ color: "#26282b", roughness: 0.5 }),
    plastikSzary: new THREE.MeshStandardMaterial({ color: "#5d636a", roughness: 0.45 }),
    stal: new THREE.MeshStandardMaterial({ color: "#b8bdc3", metalness: 1, roughness: 0.35 }),
    stalSzczot: new THREE.MeshStandardMaterial({ color: "#d4d7da", metalness: 1, roughness: 0.42 }),
    szybaPlexi: new THREE.MeshPhysicalMaterial({ color: "#dff3ff", roughness: 0.05, transmission: 0.9, thickness: 0.01, transparent: true, opacity: 0.45 }),
    led: new THREE.MeshStandardMaterial({ color: "#2be37a", emissive: "#2be37a", emissiveIntensity: 1.5 }),
    ledCzerw: new THREE.MeshStandardMaterial({ color: "#ff3b30", emissive: "#ff3b30", emissiveIntensity: 1.2 }),
    karton: new THREE.MeshStandardMaterial({ map: tex(256, 256, (g, w, h) => { g.fillStyle = "#c49a64"; g.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${los() < 0.5 ? "90,60,30" : "230,200,150"},${0.05 + los() * 0.08})`; g.fillRect(los() * w, los() * h, 1 + los() * 3, 1 + los() * 3); } g.fillStyle = "#a57c4a"; g.fillRect(0, h * 0.46, w, h * 0.08); }), roughness: 0.85 }),
    drewno: new THREE.MeshStandardMaterial({ map: tex(256, 64, (g, w, h) => { g.fillStyle = "#c8a476"; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(120,80,40,${0.1 + los() * 0.2})`; g.beginPath(); const y = los() * h; g.moveTo(0, y); g.bezierCurveTo(w / 3, y + (los() - 0.5) * 8, 2 * w / 3, y + (los() - 0.5) * 8, w, y); g.stroke(); } }), roughness: 0.8 }),
    etykieta: new THREE.MeshStandardMaterial({ map: tex(256, 128, (g, w, h) => { g.fillStyle = "#fbfbf8"; g.fillRect(0, 0, w, h); g.fillStyle = "#111"; for (let x = 16; x < 150; x += 3 + Math.floor(los() * 3)) g.fillRect(x, 22, 1 + Math.floor(los() * 3), 54); g.font = "bold 16px sans-serif"; g.fillText("RFID", 170, 50); g.font = "12px monospace"; g.fillText("EPC 3034…", 16, 100); g.strokeStyle = "#c9a227"; g.lineWidth = 3; g.strokeRect(162, 62, 80, 34); }), roughness: 0.6 }),
  });
  MAT.nadruk = new THREE.MeshPhysicalMaterial({ map: tex(1024, 646, (g, w, h) => {   // nadruk karty dostępu – ogólny wzór
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#0d3b66"); gr.addColorStop(1, "#1d7fb8"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.globalAlpha = 0.18; for (let i = 0; i < 9; i++) { g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.arc(w * 0.85, h * 0.35, 40 + i * 34, Math.PI * 0.6, Math.PI * 1.4); g.stroke(); } g.globalAlpha = 1;
    g.fillStyle = "#fff"; g.font = "bold 58px sans-serif"; g.fillText("KARTA DOSTĘPU", 60, 110); g.font = "34px sans-serif"; g.fillText("Laboratorium RFID", 60, 165);
    g.fillStyle = "#ffffffcc"; g.fillRect(60, 250, 230, 290); g.fillStyle = "#0d3b66"; g.beginPath(); g.arc(175, 350, 60, 0, 7); g.fill(); g.fillRect(105, 420, 140, 110);
    g.fillStyle = "#fff"; g.font = "30px sans-serif"; g.fillText("Student / Studentka", 330, 300); g.font = "26px monospace"; g.fillText("UID: 04 A2 3B 1C 5D 80", 330, 360); g.fillText("13,56 MHz · ISO/IEC 14443-A", 330, 410);
    g.strokeStyle = "#fff"; g.lineWidth = 4; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(880, 540, 22 + i * 20, -0.9, 0.9); g.stroke(); }
  }), roughness: 0.25, clearcoat: 0.9, clearcoatRoughness: 0.08 });
  MAT.rewers = new THREE.MeshPhysicalMaterial({ map: tex(1024, 646, (g, w, h) => { g.fillStyle = "#eef2f5"; g.fillRect(0, 0, w, h); g.fillStyle = "#33424a"; g.font = "28px sans-serif"; ["Karta zbliżeniowa – przyłóż do czytnika.", "Znalazłeś? Oddaj do portierni.", "Nie zginaj – w środku jest antena."].forEach((t, i) => g.fillText(t, 60, 120 + i * 50)); g.fillStyle = "#111"; for (let x = 60; x < 560; x += 4 + Math.floor(los() * 4)) g.fillRect(x, 420, 2 + Math.floor(los() * 2), 120); }), roughness: 0.3, clearcoat: 0.8 });
  return MAT;
}

/* ---------- pomocnicze ---------- */
export function zaokr(w, h, d, r, m, seg = 4) {    // prostopadłościan o zaokrąglonych krawędziach (w,h,d – x,y,z)
  const s = new THREE.Shape(), x = -w / 2 + r, y = -d / 2 + r, W = w - 2 * r, D = d - 2 * r;
  s.moveTo(x, y - r); s.lineTo(x + W, y - r); s.quadraticCurveTo(x + W + r, y - r, x + W + r, y); s.lineTo(x + W + r, y + D); s.quadraticCurveTo(x + W + r, y + D + r, x + W, y + D + r); s.lineTo(x, y + D + r); s.quadraticCurveTo(x - r, y + D + r, x - r, y + D); s.lineTo(x - r, y); s.quadraticCurveTo(x - r, y - r, x, y - r);
  const b = Math.min(r * 0.6, h * 0.3), g = new THREE.ExtrudeGeometry(s, { depth: Math.max(1e-5, h - 2 * b), bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: seg, curveSegments: 6 });
  g.rotateX(-Math.PI / 2); g.translate(0, -h / 2 + b, 0); return new THREE.Mesh(g, m);
}
const czesc = (o, nazwa, opis, rozklad = [0, 0, 0]) => { o.name = nazwa; o.userData.opis = opis; o.userData.rozklad = rozklad; o.userData.baza = o.position.clone(); return o; };
function tuba(punkty, r, m, zamk = false) { const k = new THREE.CatmullRomCurve3(punkty, zamk, "catmullrom", 0.02); return new THREE.Mesh(new THREE.TubeGeometry(k, Math.max(64, punkty.length * 8), r, 6, zamk), m); }
function spiralaProst(w, d, zwoje, skok, y) {     // prostokątna spirala anteny (płaska), od zewnątrz do środka
  const p = []; for (let i = 0; i < zwoje; i++) { const a = w / 2 - i * skok, b = d / 2 - i * skok, r = Math.min(a, b) * 0.12;
    p.push(new THREE.Vector3(-a + r, y, -b), new THREE.Vector3(a - r, y, -b), new THREE.Vector3(a, y, -b + r), new THREE.Vector3(a, y, b - r), new THREE.Vector3(a - r, y, b), new THREE.Vector3(-a + r, y, b), new THREE.Vector3(-a, y, b - r), new THREE.Vector3(-a, y, -b + r + skok)); }
  return p;
}

/* ================= KARTA HF 13,56 MHz (ISO 14443) – do rozłożenia ================= */
export function kartaHF() {
  const M = mat(), g = new THREE.Group(); g.name = "Karta HF";
  const W = 0.0856, D = 0.054, T = 0.00076;
  const przod = zaokr(W, T * 0.3, D, 0.0032, [M.nadruk]); przod.position.y = T * 0.35;
  przod.geometry.groups.length && (przod.material = [M.nadruk, M.pvcBialy]);
  const uvs = przod.geometry.attributes.uv, pz = przod.geometry.attributes.position; for (let i = 0; i < uvs.count; i++) uvs.setXY(i, (pz.getX(i) + W / 2) / W, (-pz.getZ(i) + D / 2) / D);
  g.add(czesc(przod, "Warstwa wierzchnia (PVC z nadrukiem)", "Laminat PVC z nadrukiem – chroni antenę i chip, nie ma wpływu na działanie.", [0, 0.03, 0]));
  const inlay = zaokr(W * 0.96, T * 0.25, D * 0.94, 0.003, M.pet); inlay.position.y = 0;
  g.add(czesc(inlay, "Inlay (nośnik anteny)", "Cienka folia, na której nawinięto lub wytrawiono antenę i przyklejono chip.", [0, 0.012, 0]));
  const spir = tuba(spiralaProst(W * 0.86, D * 0.8, 5, 0.0011, T * 0.16), 0.00018, M.miedz); spir.userData.krzywa = spir.geometry.parameters.path;
  g.add(czesc(spir, "Antena – cewka", "Kilka zwojów drutu miedzianego. Pole magnetyczne czytnika indukuje w niej napięcie – to zasilanie chipu (karta nie ma baterii).", [0, 0.012, 0]));
  const chip = new THREE.Group(); const kap = zaokr(0.005, 0.00022, 0.005, 0.0006, M.epoksyd); chip.add(kap); const pad = new THREE.Mesh(new THREE.BoxGeometry(0.0062, 0.00008, 0.0062), M.zloto); pad.position.y = -0.00012; chip.add(pad);
  chip.position.set(W * 0.3, T * 0.02, -D * 0.22);
  g.add(czesc(chip, "Chip (układ scalony)", "Pamięć z unikalnym numerem UID, logika protokołu i modulator obciążenia. Odpowiada czytnikowi, zmieniając obciążenie swojej anteny.", [0, 0.016, 0]));
  const tyl = zaokr(W, T * 0.3, D, 0.0032, M.rewers); tyl.position.y = -T * 0.35; const uv2 = tyl.geometry.attributes.uv, p2 = tyl.geometry.attributes.position; for (let i = 0; i < uv2.count; i++) uv2.setXY(i, (p2.getX(i) + W / 2) / W, (-p2.getZ(i) + D / 2) / D);
  g.add(czesc(tyl, "Warstwa spodnia (PVC)", "Druga warstwa laminatu.", [0, -0.012, 0]));
  return g;
}

/* ================= INLAY UHF (EPC Gen2) – antena dipolowa z meandrami ================= */
export function tagUHF() {
  const M = mat(), g = new THREE.Group(); g.name = "Tag UHF";
  const L = 0.095, S = 0.024;
  const folia = new THREE.Mesh(new THREE.BoxGeometry(L + 0.004, 0.00006, S + 0.004), M.pet); g.add(czesc(folia, "Folia PET", "Przezroczysty nośnik – cały tag jest cieńszy niż kartka papieru.", [0, -0.006, 0]));
  const s = new THREE.Shape(), m = 0.0011, amp = S * 0.42;
  // meandry: ścieżka aluminiowa po jednej stronie, lustrzana po drugiej (dipol skrócony meandrami)
  const ramie = znak => { let y = 0.0016; const pts = [[znak * 0.004, y]], kroki = 9, krok = 0.0042;
    for (let k = 0; k < kroki; k++) { const x = znak * (0.006 + k * krok), yN = k % 2 ? -amp : amp; pts.push([x, y], [x, yN]); y = yN; }
    const xe = znak * (0.006 + kroki * krok); pts.push([xe, y], [xe, -y * 0.2]); return pts; };
  const geomRamienia = pts => { const czesci = []; for (let i = 0; i < pts.length - 1; i++) { const [x1, z1] = pts[i], [x2, z2] = pts[i + 1], dl = Math.hypot(x2 - x1, z2 - z1); if (dl < 1e-6) continue; const b = new THREE.BoxGeometry(dl + m, 0.00003, m); b.rotateY(-Math.atan2(z2 - z1, x2 - x1)); b.translate((x1 + x2) / 2, 0.00005, (z1 + z2) / 2); czesci.push(b); } return mergeGeometries(czesci); };
  const koncowki = [1, -1].map(z => { const b = new THREE.BoxGeometry(L / 2 - 0.006 - 9 * 0.0042 + 0.001, 0.00003, amp * 1.6); b.translate(z * (L / 2 + 0.006 + 9 * 0.0042) / 2, 0.00005, 0); return b; });
  const ant = new THREE.Mesh(mergeGeometries([geomRamienia(ramie(1)), geomRamienia(ramie(-1)), ...koncowki]), M.aluminium);
  g.add(czesc(ant, "Antena dipolowa (aluminium)", "Dipol pół­falowy „zwinięty” w meandry, żeby zmieścić ok. 17 cm (λ/2 dla 868 MHz) na 9,5 cm. Odbija falę czytnika – na tym polega backscatter.", [0, 0.006, 0]));
  const petla = tuba([new THREE.Vector3(-0.004, 0.00008, 0.0016), new THREE.Vector3(-0.004, 0.00008, 0.0045), new THREE.Vector3(0.004, 0.00008, 0.0045), new THREE.Vector3(0.004, 0.00008, 0.0016)], 0.00035, M.aluminium);
  g.add(czesc(petla, "Pętla dopasowująca (T-match)", "Dopasowuje impedancję anteny do impedancji chipu – od tego zależy zasięg odczytu.", [0, 0.006, 0]));
  const chip = zaokr(0.0012, 0.0003, 0.0012, 0.0002, M.epoksyd); chip.position.set(0, 0.0002, 0.0016);
  g.add(czesc(chip, "Chip EPC Gen2", "Pamięć: EPC (identyfikator produktu), TID (numer chipu), User, Reserved (hasła dostępu i kill).", [0, 0.012, 0]));
  return g;
}

/* ================= TRANSPONDER LF 134,2 kHz w szklanej kapsułce (zwierzęta, ISO 11784/11785) ================= */
export function kapsulaLF() {
  const M = mat(), g = new THREE.Group(); g.name = "Kapsułka LF";
  const L = 0.012, R = 0.001;
  const szklo = new THREE.Mesh(new THREE.CapsuleGeometry(R, L - 2 * R, 10, 24), M.szklo); szklo.rotation.z = Math.PI / 2;
  g.add(czesc(szklo, "Szklana kapsułka (biozgodna)", "Szkło biozgodne – kapsułkę wszczepia się pod skórę zwierzęcia strzykawką.", [0, 0.004, 0]));
  const rdzen = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.42, R * 0.42, L * 0.62, 16), M.ferryt); rdzen.rotation.z = Math.PI / 2; rdzen.position.x = -L * 0.08;
  g.add(czesc(rdzen, "Rdzeń ferrytowy", "Skupia pole magnetyczne – dzięki niemu malutka cewka działa z odległości kilku–kilkunastu cm.", [0, -0.003, 0]));
  const hel = []; for (let i = 0; i <= 600; i++) { const t = i / 600, a = t * Math.PI * 2 * 60; hel.push(new THREE.Vector3(-L * 0.08 - L * 0.29 + t * L * 0.58, Math.sin(a) * R * 0.55, Math.cos(a) * R * 0.55)); }
  g.add(czesc(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hel), 1400, R * 0.05, 4), M.miedz), "Cewka (antena)", "Setki zwojów cienkiego drutu na rdzeniu ferrytowym.", [0, 0, 0]));
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(L * 0.16, R * 0.15, R * 1.1), M.pcbZiel); pcb.position.x = L * 0.33;
  const ic = new THREE.Mesh(new THREE.BoxGeometry(L * 0.08, R * 0.25, R * 0.7), M.epoksyd); ic.position.set(L * 0.33, R * 0.18, 0);
  const uk = new THREE.Group(); uk.add(pcb, ic); g.add(czesc(uk, "Chip i kondensator rezonansowy", "Obwód LC dostrojony do 134,2 kHz i chip z 15-cyfrowym numerem (kod kraju + numer zwierzęcia).", [0.004, 0, 0]));
  return g;
}

/* ================= MODUŁ CZYTNIKA 13,56 MHz (typowy moduł laboratoryjny) ================= */
export function modulCzytnika() {
  const M = mat(), g = new THREE.Group(); g.name = "Moduł czytnika HF";
  const W = 0.06, D = 0.04, T = 0.0016;
  const pcb = zaokr(W, T, D, 0.0015, M.pcb); g.add(czesc(pcb, "Płytka drukowana", "Moduł z układem czytnika 13,56 MHz (np. z rodziny MFRC522/PN532) – podłączasz go do mikrokontrolera.", [0, 0, 0]));
  const sp = spiralaProst(W * 0.6, D * 0.78, 3, 0.0018, T / 2 + 0.00004); sp.forEach(p => p.x -= W * 0.15);
  g.add(czesc(tuba(sp, 0.0004, M.miedz), "Antena drukowana", "Kilka zwojów ścieżki miedzianej na płytce – wytwarza zmienne pole magnetyczne 13,56 MHz.", [0, 0.012, 0]));
  const ic = zaokr(0.005, 0.0009, 0.005, 0.0003, M.epoksyd); ic.position.set(W * 0.3, T / 2 + 0.00045, -D * 0.05); g.add(czesc(ic, "Układ czytnika (front-end RF)", "Generuje nośną, moduluje zapytania, demoduluje odpowiedź tagu i rozmawia z mikrokontrolerem po SPI / I²C / UART.", [0, 0.018, 0]));
  const kw = new THREE.Mesh(new THREE.CapsuleGeometry(0.0013, 0.0035, 6, 16), M.stalSzczot); kw.rotation.z = Math.PI / 2; kw.scale.set(1, 1, 0.45); kw.position.set(W * 0.3, T / 2 + 0.0007, D * 0.25); g.add(czesc(kw, "Kwarc 27,12 MHz", "Rezonator kwarcowy – wzorzec częstotliwości (2 × 13,56 MHz).", [0, 0.018, 0]));
  const piny = new THREE.Group(); for (let i = 0; i < 8; i++) { const ob = new THREE.Mesh(new THREE.BoxGeometry(0.0025, 0.0025, 0.0025), M.plastikCzarny); ob.position.set(W / 2 - 0.0025, T / 2 + 0.00125, -D * 0.4 + i * 0.00254 * 2.2 + 0.004); const pin = new THREE.Mesh(new THREE.BoxGeometry(0.0006, 0.009, 0.0006), M.zloto); pin.position.set(W / 2 - 0.0025, T / 2 + 0.005, ob.position.z); piny.add(ob, pin); }
  g.add(czesc(piny, "Złącze (SDA, SCK, MOSI, MISO, IRQ, GND, RST, 3,3 V)", "Tu podłączasz przewody do płytki mikrokontrolera – w laboratorium zaczniecie od interfejsu SPI.", [0.01, 0, 0]));
  for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.0016, 0.0006, 0.0008), i % 2 ? M.plastikSzary : new THREE.MeshStandardMaterial({ color: "#a37b4a", roughness: 0.5 })); c.position.set(W * 0.16 + (i % 3) * 0.003, T / 2 + 0.0003, -D * 0.28 + Math.floor(i / 3) * 0.004); g.add(c); }
  return g;
}

/* ================= PŁYTKA MIKROKONTROLERA (ogólna) ================= */
export function plytkaMCU() {
  const M = mat(), g = new THREE.Group(); g.name = "Płytka mikrokontrolera";
  const W = 0.052, D = 0.026, T = 0.0016;
  g.add(czesc(zaokr(W, T, D, 0.0012, M.pcbZiel), "Płytka mikrokontrolera", "Odczytuje UID z modułu, sprawdza listę uprawnień i steruje przekaźnikiem bramki.", [0, 0, 0]));
  const mcu = zaokr(0.009, 0.0012, 0.009, 0.0003, M.epoksyd); mcu.position.set(0, T / 2 + 0.0006, 0); g.add(czesc(mcu, "Mikrokontroler", "Program napiszecie sami: obsługa czytnika, baza kart, logika przejścia.", [0, 0.012, 0]));
  const usb = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.003, 0.008), M.stal); usb.position.set(-W / 2 + 0.0028, T / 2 + 0.0015, 0); g.add(czesc(usb, "Złącze USB", "Zasilanie i programowanie.", [-0.008, 0, 0]));
  for (const z of [-1, 1]) for (let i = 0; i < 15; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.0006, 0.0055, 0.0006), M.zloto); p.position.set(-W / 2 + 0.006 + i * 0.00254 * 1.2, T / 2 + 0.0028, z * (D / 2 - 0.0018)); g.add(p); }
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.0016, 0.0006, 0.0008), M.led); led.position.set(W * 0.35, T / 2 + 0.0003, -D * 0.2); g.add(led);
  return g;
}

/* ================= ANTENA PANELOWA UHF ================= */
export function antenaUHF() {
  const M = mat(), g = new THREE.Group(); g.name = "Antena panelowa UHF";
  const ob = zaokr(0.26, 0.04, 0.26, 0.012, M.plastikBialy); ob.rotation.x = Math.PI / 2; g.add(czesc(ob, "Antena panelowa UHF (polaryzacja kołowa)", "Kierunkowa antena 865–868 MHz. Polaryzacja kołowa – tag odczyta się bez względu na to, jak jest obrócony.", [0, 0, 0]));
  const zl = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 20), M.stal); zl.rotation.x = Math.PI / 2; zl.position.set(0, -0.09, -0.03); g.add(czesc(zl, "Złącze RF", "Kabel koncentryczny do czytnika UHF.", [0, 0, -0.03]));
  return g;
}

/* ================= BRAMKA UHF (portal) + paleta z kartonami ================= */
export function bramkaUHF() {
  const M = mat(), g = new THREE.Group(); g.name = "Bramka UHF";
  const szer = 2.4, wys = 2.2;
  for (const s of [-1, 1]) {
    const slup = zaokr(0.08, wys, 0.08, 0.01, M.stalSzczot); slup.position.set(s * szer / 2, wys / 2, 0); g.add(czesc(slup, "Słup bramki", "Konstrukcja nośna z kablami antenowymi.", [s * 0.4, 0, 0]));
    const st = zaokr(0.4, 0.02, 0.4, 0.01, M.stal); st.position.set(s * szer / 2, 0.01, 0); g.add(st);
    for (const h of [0.7, 1.5]) { const a = antenaUHF(); a.position.set(s * (szer / 2 - 0.08), h, 0); a.rotation.y = -s * Math.PI / 2; a.name = "Antena " + (s < 0 ? "A" : "B") + (h < 1 ? "1" : "2"); a.userData.opis = "Antena panelowa skierowana do środka bramki – kilka anten pokrywa całe przejście."; a.userData.rozklad = [s * 0.4, 0, 0]; a.userData.baza = a.position.clone(); g.add(a); }
  }
  const belka = zaokr(szer + 0.08, 0.08, 0.08, 0.01, M.stalSzczot); belka.position.y = wys; g.add(czesc(belka, "Belka górna", "Na górze często montuje się lampę sygnalizacyjną i czujnik ruchu (wyzwalanie odczytu).", [0, 0.3, 0]));
  const lampa = new THREE.Group(); const kz = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 24), M.led); kz.position.y = 0.06; const kc = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 24), M.ledCzerw); kc.position.y = 0.18; lampa.add(kz, kc); lampa.position.set(0, wys + 0.04, 0);
  g.add(czesc(lampa, "Lampa sygnalizacyjna", "Zielona – odczyt poprawny, czerwona – brak odczytu lub towar nieuprawniony.", [0, 0.4, 0]));
  const czyt = zaokr(0.3, 0.08, 0.22, 0.01, M.plastikCzarny); czyt.position.set(szer / 2 + 0.22, 1.1, 0); g.add(czesc(czyt, "Czytnik UHF (4 porty antenowe)", "Steruje antenami po kolei, wykonuje antykolizję i wysyła odczytane EPC do systemu magazynowego.", [0.4, 0, 0]));
  return g;
}
export function paleta(ileKartonow = 12) {
  const M = mat(), g = new THREE.Group(); g.name = "Paleta";
  const pl = new THREE.Group(); for (let i = 0; i < 7; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.022, 0.1), M.drewno); d.position.set(0, 0.144 - 0.011, -0.36 + i * 0.12); pl.add(d); }
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.1), M.drewno); k.position.set(-0.53 + i * 0.53, 0.06, -0.35 + j * 0.35); pl.add(k); }
  for (let i = 0; i < 3; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.022, 0.1), M.drewno); d.position.set(0, 0.011, -0.35 + i * 0.35); pl.add(d); }
  g.add(czesc(pl, "Paleta EUR", "1200 × 800 mm.", [0, -0.2, 0]));
  const kartony = []; const n = ileKartonow, kol = 3, rz = 2; for (let i = 0; i < n; i++) { const x = i % kol, z = Math.floor(i / kol) % rz, y = Math.floor(i / (kol * rz));
    const k = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.38), M.karton); k.position.set(-0.4 + x * 0.4, 0.155 + 0.14 + y * 0.285, -0.2 + z * 0.4);
    const et = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.05), M.etykieta); et.position.set(0, 0, 0.1901 * (z ? 1 : -1)); if (!z) et.rotation.y = Math.PI; k.add(et);
    k.name = "Karton " + (i + 1); k.userData.tag = i; g.add(k); kartony.push(k); }
  g.userData.kartony = kartony;
  return g;
}

/* ================= BRAMKA DOSTĘPU (szybkie przejście z czytnikiem HF) ================= */
export function bramkaDostepu() {
  const M = mat(), g = new THREE.Group(); g.name = "Bramka dostępu";
  const L = 1.2, H = 1.0, S = 0.2, prz = 0.65;
  for (const s of [-1, 1]) {
    const sz = zaokr(S, H, L, 0.03, M.stalSzczot); sz.position.set(s * (prz / 2 + S / 2), H / 2, 0); g.add(czesc(sz, "Obudowa (szafka)", "W środku: sterownik, napędy skrzydeł i czujniki podczerwieni wykrywające przechodzącą osobę.", [s * 0.35, 0, 0]));
    const zaw = new THREE.Group(); zaw.position.set(s * prz / 2, 0, 0); const sk = zaokr(prz / 2 - 0.01, 0.55, 0.012, 0.006, M.szybaPlexi); sk.position.set(-s * (prz / 4 - 0.005), 0.62, 0); zaw.add(sk);
    zaw.name = "Skrzydło " + (s < 0 ? "L" : "P"); zaw.userData.opis = "Szklane skrzydło – zamyka przejście; po odczycie uprawnionej karty obraca się i otwiera."; zaw.userData.skrzydlo = s; g.add(zaw);
    for (const kz of [-0.4, 0.4]) { const pas = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.012, 0.1), M.led); pas.position.set(s * (prz / 2 + 0.001), H - 0.06, kz); g.add(pas); }
  }
  const czyt = new THREE.Group(); const plyta = zaokr(0.12, 0.012, 0.16, 0.012, M.plastikCzarny); czyt.add(plyta);
  const ikona = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.08), new THREE.MeshBasicMaterial({ map: tex(128, 128, (c, w, h) => { c.strokeStyle = "#7fd3ff"; c.lineWidth = 6; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(40, 64, 18 + i * 18, -0.8, 0.8); c.stroke(); } c.fillStyle = "#7fd3ff"; c.beginPath(); c.arc(40, 64, 8, 0, 7); c.fill(); }), transparent: true }));
  ikona.rotation.x = -Math.PI / 2; ikona.position.y = 0.0065; czyt.add(ikona); czyt.position.set(-(prz / 2 + S / 2), H + 0.007, -0.35);
  g.add(czesc(czyt, "Czytnik kart 13,56 MHz", "Odczyt UID / danych z karty. W laboratorium: moduł czytnika + mikrokontroler + przekaźnik.", [0, 0.15, 0]));
  const czyt2 = czyt.clone(); czyt2.position.set(prz / 2 + S / 2, H + 0.007, 0.35); czyt2.name = "Czytnik wyjściowy"; czyt2.userData = { opis: "Drugi czytnik po stronie wyjścia – system wie, w którą stronę idzie osoba (anti-passback).", rozklad: [0, 0.15, 0], baza: czyt2.position.clone() }; g.add(czyt2);
  g.userData.otworz = t => g.traverse(o => { if (o.userData.skrzydlo) o.rotation.y = o.userData.skrzydlo * t * Math.PI / 2 * 0.98; });
  return g;
}

/* ================= TAG UHF NA METAL (twarda obudowa, antena łatkowa nad masą) ================= */
export function tagNaMetal() {
  const M = mat(), g = new THREE.Group(); g.name = "Tag UHF na metal";
  const L = 0.08, S = 0.026, H = 0.0062;
  const gora = zaokr(L, H * 0.32, S, 0.004, M.plastikBialy); gora.position.y = H * 0.34;
  g.add(czesc(gora, "Obudowa ABS – pokrywa", "Twarda obudowa odporna na uderzenia i chemię – tag przykręca się lub przykleja do metalu.", [0, 0.03, 0]));
  const lata = new THREE.Mesh(new THREE.BoxGeometry(L * 0.78, 0.00008, S * 0.72), M.miedz); lata.position.y = H * 0.17;
  g.add(czesc(lata, "Antena łatkowa (patch)", "Płaska łatka miedziana – promieniuje w górę, od metalu. Metal pod spodem staje się częścią anteny (lustro), zamiast ją „zabijać”.", [0, 0.02, 0]));
  const chip = zaokr(0.0016, 0.0004, 0.0016, 0.0002, M.epoksyd); chip.position.set(-L * 0.3, H * 0.17 + 0.0002, 0);
  g.add(czesc(chip, "Chip EPC Gen2", "Ten sam typ chipu co w zwykłej etykiecie UHF – różni się tylko antena i konstrukcja.", [0, 0.026, 0]));
  const zwora = new THREE.Mesh(new THREE.BoxGeometry(0.001, H * 0.36, S * 0.5), M.miedz); zwora.position.set(-L * 0.39, 0, 0);
  g.add(czesc(zwora, "Zwarcie do masy (PIFA)", "Pasek łączący łatkę z masą – skraca antenę o połowę (antena typu PIFA), dzięki temu tag jest mały.", [-0.012, 0.01, 0]));
  const dyst = new THREE.Mesh(new THREE.BoxGeometry(L * 0.94, H * 0.32, S * 0.9), new THREE.MeshStandardMaterial({ color: "#e9d89a", roughness: 0.8 })); dyst.position.y = 0;
  g.add(czesc(dyst, "Przekładka dielektryczna (dystans)", "Odsuwa antenę od metalu o kilka milimetrów. Bez niej prąd indukowany w metalu wygasiłby pole – zwykła etykieta na puszce nie działa.", [0, 0.008, 0]));
  const masa = new THREE.Mesh(new THREE.BoxGeometry(L * 0.94, 0.0001, S * 0.9), M.miedz); masa.position.y = -H * 0.17;
  g.add(czesc(masa, "Płaszczyzna masy", "Miedziana warstwa od spodu – razem z metalowym podłożem tworzy „lustro” dla anteny.", [0, -0.006, 0]));
  const dol = zaokr(L, H * 0.3, S, 0.004, M.plastikSzary); dol.position.y = -H * 0.34;
  for (const x of [-1, 1]) { const o = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, H * 0.32, 16), M.stal); o.position.set(x * L * 0.44, 0, 0); dol.add(o); }
  g.add(czesc(dol, "Spód z otworami montażowymi", "Otwory na wkręty lub nity – tagi na kontenery, narzędzia, butle gazowe, regały.", [0, -0.02, 0]));
  const blacha = new THREE.Mesh(new THREE.BoxGeometry(L * 1.6, 0.002, S * 2.2), M.stalSzczot); blacha.position.y = -H * 0.5 - 0.001;
  g.add(czesc(blacha, "Podłoże metalowe (np. ściana kontenera)", "Pokazuje, gdzie tag pracuje: przykręcony do stali.", [0, -0.04, 0]));
  return g;
}

/* ================= OPASKA NA RĘKĘ HF/NFC (silikon) ================= */
export function opaskaHF() {
  const M = mat(), g = new THREE.Group(); g.name = "Opaska RFID";
  const sil = new THREE.MeshPhysicalMaterial({ color: "#1f7a8c", roughness: 0.55, clearcoat: 0.2 }), sil2 = new THREE.MeshPhysicalMaterial({ color: "#16606e", roughness: 0.5 });
  const R = 0.032, sz = 0.016, gr = 0.0028, pkt = [];
  for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; pkt.push(new THREE.Vector3(Math.cos(a) * R * 1.12, 0, Math.sin(a) * R * 0.92)); }
  const ks = new THREE.Shape(); ks.moveTo(-sz / 2, -gr / 2); ks.lineTo(sz / 2, -gr / 2); ks.lineTo(sz / 2, gr / 2); ks.lineTo(-sz / 2, gr / 2); ks.lineTo(-sz / 2, -gr / 2);
  const pas = new THREE.Mesh(new THREE.ExtrudeGeometry(ks, { steps: 128, extrudePath: new THREE.CatmullRomCurve3(pkt, true), bevelEnabled: false }), sil);
  g.add(czesc(pas, "Pasek silikonowy", "Wodoodporny – opaski RFID działają na basenach, w szatniach, na festiwalach i w szpitalach.", [0, -0.03, 0]));
  const glowa = new THREE.Group(); glowa.position.set(0, 0, -R * 0.92 - gr * 0.2);
  const obud = zaokr(0.036, 0.007, 0.03, 0.009, sil2); obud.rotation.x = Math.PI / 2; obud.position.z = -0.0018;
  obud.position.add(glowa.position);
  g.add(czesc(obud, "Główka opaski (obudowa)", "Zalana silikonem – w środku antena i chip, całkowicie szczelne.", [0, 0.012, -0.03]));
  const kp = []; for (let i = 0; i <= 5 * 48; i++) { const t = i / 48 * Math.PI * 2, r = 0.0115 - i / (5 * 48) * 0.0025; kp.push(new THREE.Vector3(Math.cos(t) * r, Math.sin(t) * r, -0.0026 - i * 0.000004)); }
  const cewka = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(kp), 600, 0.00025, 5), M.miedz); cewka.position.copy(glowa.position);
  g.add(czesc(cewka, "Antena – cewka okrągła", "Kilka zwojów na średnicy ok. 2 cm – taka sama zasada jak w karcie HF, tylko mniejsza powierzchnia, więc mniejszy zasięg (ok. 2–4 cm).", [0, 0.045, -0.012]));
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.0006), M.epoksyd); chip.position.copy(glowa.position).add(new THREE.Vector3(0, 0, -0.0026));
  g.add(czesc(chip, "Chip NFC / ISO 14443", "Np. układ typu NTAG lub MIFARE – numer UID, pamięć na saldo, numer szafki albo bilet.", [0, 0.07, -0.016]));
  return g;
}

/* ================= BRAMKA UHF DO MONTAŻU (każda część osobno – do puzzli) ================= */
export function bramkaMontaz({ strefa = false } = {}) {
  const M = mat(), g = new THREE.Group(); g.name = strefa ? "Bramka UHF – strefa odczytu" : "Bramka UHF – montaż";
  const szer = 2.0, wys = 2.1, kat = THREE.MathUtils.degToRad(15);
  const czer = new THREE.MeshStandardMaterial({ color: "#e0e3e6", metalness: 0.6, roughness: 0.35 });
  for (const s of [-1, 1]) {
    const nz = s < 0 ? "lewa" : "prawa", nm = s < 0 ? "lewy" : "prawy";
    const pod = zaokr(0.45, 0.025, 0.45, 0.02, M.stal); pod.position.set(s * szer / 2, 0.0125, 0);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 12), M.stalSzczot); k.position.set(x * 0.18, 0.01, z * 0.18); pod.add(k); }
    g.add(czesc(pod, `1. Podstawa ${nz}`, "Stalowa płyta kotwiona do posadzki 4 kołkami – najpierw wyznacz rozstaw bramki (tu 2 m).", [s * 0.5, -0.15, 0.4]));
    const slup = zaokr(0.09, wys, 0.09, 0.012, czer); slup.position.set(s * szer / 2, wys / 2 + 0.025, 0);
    g.add(czesc(slup, `2. Słup ${nm}`, "Profil aluminiowy – w środku prowadzi się kable antenowe i zasilanie.", [s * 0.7, 0, 0]));
    for (const h of [0.75, 1.55]) { const a = antenaUHF(); a.position.set(s * (szer / 2 - 0.1), h, 0); a.rotation.y = -s * (Math.PI / 2 - kat);
      a.name = `3. Antena ${s < 0 ? "L" : "P"}${h < 1 ? "1 (dolna)" : "2 (górna)"}`; a.userData.opis = "Antena panelowa skierowana do środka i lekko (ok. 15°) w stronę wejścia – strefa odczytu zaczyna się, zanim towar wjedzie w bramkę."; a.userData.rozklad = [s * 0.9, h < 1 ? -0.2 : 0.2, 0.3]; a.userData.baza = a.position.clone(); g.add(a); }
  }
  const belka = zaokr(szer + 0.09, 0.09, 0.09, 0.012, czer); belka.position.y = wys + 0.07;
  g.add(czesc(belka, "4. Belka górna", "Usztywnia bramkę i przenosi kable między słupami.", [0, 0.6, 0]));
  const czyt = new THREE.Group(); const ob = zaokr(0.32, 0.07, 0.22, 0.012, M.plastikCzarny); czyt.add(ob);
  for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.02, 12), M.zloto); p.rotation.x = Math.PI / 2; p.position.set(-0.11 + i * 0.07, 0, 0.115); czyt.add(p); }
  const ld = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.004, 0.01), M.led); ld.position.set(0.12, 0.037, -0.07); czyt.add(ld);
  czyt.position.set(szer / 2 + 0.2, 1.15, 0); czyt.rotation.z = Math.PI / 2;
  g.add(czesc(czyt, "5. Czytnik UHF (4 porty)", "Każda antena na osobny port (ANT1–ANT4). Czytnik przełącza anteny po kolei i wykonuje antykolizję EPC Gen2.", [0.7, 0, 0]));
  const skr = zaokr(0.3, 0.4, 0.15, 0.015, M.plastikSzary); skr.position.set(szer / 2 + 0.2, 0.45, 0);
  const wy = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.005), M.ledCzerw); wy.position.set(0, 0.12, 0.078); skr.add(wy);
  g.add(czesc(skr, "6. Skrzynka sterująca (zasilacz, PLC, sieć)", "Zasilacz 24 V, sterownik PLC lub komputer przemysłowy i switch – łączy bramkę z systemem magazynowym.", [0.7, -0.1, 0]));
  const kab = new THREE.Group(), cm = new THREE.MeshStandardMaterial({ color: "#1a1b1d", roughness: 0.6 });
  const xc = szer / 2 + 0.2, porty = [[-0.11, 0], [-0.04, 1], [0.03, 2], [0.1, 3]], ant = [[-1, 0.75], [-1, 1.55], [1, 0.75], [1, 1.55]];
  ant.forEach(([s, h], i) => { const ax = s * (szer / 2 - 0.1), py = 1.15 + porty[i][0]; const pts = s > 0
      ? [new THREE.Vector3(ax, h - 0.12, -0.04), new THREE.Vector3(szer / 2, h - 0.15, -0.05), new THREE.Vector3(szer / 2 + 0.06, py, -0.06), new THREE.Vector3(xc - 0.03, py, -0.1)]
      : [new THREE.Vector3(ax, h - 0.12, -0.04), new THREE.Vector3(-szer / 2, h, -0.05), new THREE.Vector3(-szer / 2, wys + 0.02, -0.06), new THREE.Vector3(szer / 2, wys + 0.02, -0.06), new THREE.Vector3(szer / 2 + 0.06, py, -0.06), new THREE.Vector3(xc - 0.03, py, -0.1)];
    kab.add(tuba(pts, 0.006, cm)); });
  kab.add(tuba([new THREE.Vector3(xc, 1.0, -0.06), new THREE.Vector3(xc + 0.05, 0.8, -0.06), new THREE.Vector3(xc, 0.66, -0.06)], 0.008, cm));
  g.add(czesc(kab, "7. Kable antenowe (koncentryczne)", "Kabel o niskiej tłumienności, możliwie krótki – każdy metr to strata sygnału (ok. 0,2–0,5 dB/m). Wszystkie cztery tej samej długości.", [0, 0, -0.6]));
  const fot = new THREE.Group(); for (const s of [-1, 1]) { const f = zaokr(0.05, 0.08, 0.04, 0.008, M.plastikCzarny); f.position.set(s * (szer / 2 - 0.07), 0.45, 0.35); const so = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 16), M.ledCzerw); so.rotation.z = Math.PI / 2; so.position.set(-s * 0.026, 0, 0); f.add(so); fot.add(f); }
  g.add(czesc(fot, "8. Fotokomórka (wyzwalanie odczytu)", "Para nadajnik–odbiornik na wejściu: przerwanie wiązki włącza odczyt, druga para mówi, w którą stronę jedzie towar.", [0, -0.2, 0.7]));
  const lampa = new THREE.Group(); const kz = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.1, 24), M.led); kz.position.y = 0.05; const kc = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.1, 24), M.ledCzerw); kc.position.y = 0.15; lampa.add(kz, kc); lampa.position.set(0, wys + 0.115, 0);
  g.add(czesc(lampa, "9. Lampa sygnalizacyjna", "Zielona – odczyt poprawny, czerwona – brak odczytu lub towar niezgodny z zamówieniem.", [0, 0.9, 0]));
  if (strefa) {
    const sm = c => new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: 0.22, depthWrite: false, roughness: 1, side: THREE.DoubleSide });
    const st = new THREE.Group(); st.name = "Strefa odczytu";
    ant.forEach(([s, h], i) => { const l = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), sm(i % 2 ? "#2bb3ff" : "#38d39f")); l.scale.set(0.75, 0.42, 0.6);
      const d = new THREE.Vector3(-s * Math.cos(kat), 0, Math.sin(kat)); l.position.set(s * (szer / 2 - 0.1), h, 0).addScaledVector(d, 0.72); l.lookAt(l.position.clone().add(d)); l.rotateY(Math.PI / 2); st.add(l); });
    const pod = new THREE.Mesh(new THREE.PlaneGeometry(szer, 2.2), sm("#ffd23f")); pod.rotation.x = -Math.PI / 2; pod.position.set(0, 0.005, 0.3); st.add(pod);
    g.add(czesc(st, "Strefa odczytu (przybliżona)", "Cztery płaty promieniowania nakładają się w środku – tag jest widziany z każdej strony palety. Kąt 15° przesuwa strefę w stronę wejścia.", [0, 0, 0]));
  }
  return g;
}

/** animacja rozkładania: t = 0 (złożony) … 1 (rozłożony) */
export function rozloz(g, t) {
  g.traverse(o => { if (o.userData.baza && o.userData.rozklad) { const r = o.userData.rozklad, k = t * t * (3 - 2 * t); o.position.set(o.userData.baza.x + r[0] * k, o.userData.baza.y + r[1] * k, o.userData.baza.z + r[2] * k); } });
}
export { mat as materialy };
export const MODELE = { kartaHF, tagUHF, kapsulaLF, modulCzytnika, plytkaMCU, antenaUHF, bramkaUHF, paleta, bramkaDostepu, tagNaMetal, opaskaHF, bramkaMontaz, bramkaStrefa: () => bramkaMontaz({ strefa: true }) };
