/* Wzorzec układu laboratoryjnego RFID na płytce stykowej – do nałożenia w AR na układ studenta.
   Jednostki: metry. Początek układu = lewy-górny róg pola „płytki” na macie stanowiska, x w prawo, z do studenta, y w górę.
   Etap 1 „Odczyt UID”: moduł czytnika 13,56 MHz + płytka mikrokontrolera (SPI).
   Etap 2 „Bramka”: + dioda zielona i czerwona z rezystorami, brzęczyk, moduł przekaźnika.
   Wygląd ogólny – bez znaków towarowych; rozkład pinów zgodny ze standardem płytek typu „Uno”. */
import * as THREE from "three";
import { zaokr, materialy } from "./modele.js";

const mm = v => v / 1000, P = 2.54;
// położenie pinów płytki MCU (mm, względem lewego-górnego rogu pola)
const MCU = { x: 0, z: 0, w: 68.6, d: 53.3 };
const pinD = n => ({ x: n >= 8 ? 26.4 + (13 - n) * P : 44.2 + (7 - n) * P, z: 2.6 });        // D13…D8, D7…D0 (górna krawędź)
const pinZ = nazwa => ({ x: { "3V3": 32.0, "5V": 34.5, "GND": 37.1, "GND2": 39.6 }[nazwa], z: 50.8 });   // złącze zasilania (dolna krawędź)
// płytka stykowa (830 otworów): kolumny co 2,54 mm wzdłuż x, rzędy a–e (z 31…41) i f–j (z 15…25); szyny zasilania na dole
const BB = { x: 80, z: 0, w: 165, d: 55 };
const otwor = (kol, rzad) => ({ x: BB.x + 6 + kol * P, z: BB.z + { j: 14.8, i: 17.3, h: 19.9, g: 22.4, f: 25.0, e: 30.1, d: 32.6, c: 35.2, b: 37.7, a: 40.3, "+": 47.0, "-": 49.5 }[rzad] });
// moduł czytnika: złącze 8 pinów wzdłuż x w rzędzie „e”, kolumny 36…43; korpus wystaje do tyłu (za płytkę)
const RC_KOL = 36, RC_PINY = ["SDA", "SCK", "MOSI", "MISO", "IRQ", "GND", "RST", "3.3V"];

export const ETAPY = [
  { id: 1, nazwa: "Etap 1 – odczyt UID", opis: "Moduł czytnika 13,56 MHz podłączony do mikrokontrolera przez SPI. Program wypisuje UID przyłożonej karty." },
  { id: 2, nazwa: "Etap 2 – bramka", opis: "Do układu z etapu 1 dochodzą: dioda zielona (wejście), czerwona (odmowa), brzęczyk i przekaźnik zamka." },
];

/** Lista połączeń wzorca (kolejność = kolejność montażu) */
export function polaczenia(etap = 2) {
  const rc = p => otwor(RC_KOL + RC_PINY.indexOf(p), "d");
  const L = [
    { id: "rc-33", etap: 1, kolor: "#e53935", od: ["MCU", "3V3", pinZ("3V3")], do: ["Czytnik", "3.3V", rc("3.3V")], opis: "Zasilanie czytnika: 3,3 V z płytki MCU → pin 3.3V modułu. Uwaga: NIE 5 V – moduł działa na 3,3 V." },
    { id: "rc-gnd", etap: 1, kolor: "#212121", od: ["MCU", "GND", pinZ("GND")], do: ["Czytnik", "GND", rc("GND")], opis: "Masa: GND płytki MCU → GND modułu czytnika." },
    { id: "rc-sda", etap: 1, kolor: "#fb8c00", od: ["MCU", "D10", pinD(10)], do: ["Czytnik", "SDA", rc("SDA")], opis: "SDA (SS – wybór układu) → D10." },
    { id: "rc-sck", etap: 1, kolor: "#fdd835", od: ["MCU", "D13", pinD(13)], do: ["Czytnik", "SCK", rc("SCK")], opis: "SCK (zegar SPI) → D13." },
    { id: "rc-mosi", etap: 1, kolor: "#43a047", od: ["MCU", "D11", pinD(11)], do: ["Czytnik", "MOSI", rc("MOSI")], opis: "MOSI (dane MCU → czytnik) → D11." },
    { id: "rc-miso", etap: 1, kolor: "#1e88e5", od: ["MCU", "D12", pinD(12)], do: ["Czytnik", "MISO", rc("MISO")], opis: "MISO (dane czytnik → MCU) → D12." },
    { id: "rc-rst", etap: 1, kolor: "#8e24aa", od: ["MCU", "D9", pinD(9)], do: ["Czytnik", "RST", rc("RST")], opis: "RST (reset modułu) → D9. Pin IRQ zostaje niepodłączony." },
    { id: "sz-5v", etap: 2, kolor: "#e53935", od: ["MCU", "5V", pinZ("5V")], do: ["Szyna", "+", otwor(2, "+")], opis: "5 V z płytki MCU → szyna „+” płytki stykowej (zasilanie przekaźnika i brzęczyka)." },
    { id: "sz-gnd", etap: 2, kolor: "#212121", od: ["MCU", "GND", pinZ("GND2")], do: ["Szyna", "−", otwor(3, "-")], opis: "Druga masa GND → szyna „−” płytki stykowej." },
    { id: "led-z", etap: 2, kolor: "#43a047", od: ["MCU", "D5", pinD(5)], do: ["Dioda zielona", "anoda", otwor(8, "e")], opis: "D5 → anoda (dłuższa nóżka) diody zielonej. Katoda przez rezystor 220 Ω do szyny „−”." },
    { id: "led-c", etap: 2, kolor: "#e53935", od: ["MCU", "D6", pinD(6)], do: ["Dioda czerwona", "anoda", otwor(14, "e")], opis: "D6 → anoda diody czerwonej, katoda przez 220 Ω do szyny „−”." },
    { id: "buz", etap: 2, kolor: "#fdd835", od: ["MCU", "D7", pinD(7)], do: ["Brzęczyk", "+", otwor(21, "e")], opis: "D7 → „+” brzęczyka, drugi pin brzęczyka do szyny „−”." },
    { id: "prz-in", etap: 2, kolor: "#00acc1", od: ["MCU", "D4", pinD(4)], do: ["Przekaźnik", "IN", { x: 88, z: 72 }], opis: "D4 → wejście IN modułu przekaźnika (stan wysoki = otwarcie zamka)." },
    { id: "prz-vcc", etap: 2, kolor: "#e53935", od: ["Szyna", "+", otwor(5, "+")], do: ["Przekaźnik", "VCC", { x: 93, z: 72 }], opis: "Szyna „+” (5 V) → VCC przekaźnika." },
    { id: "prz-gnd", etap: 2, kolor: "#212121", od: ["Szyna", "−", otwor(6, "-")], do: ["Przekaźnik", "GND", { x: 98, z: 72 }], opis: "Szyna „−” → GND przekaźnika." },
  ];
  return L.filter(p => p.etap <= etap);
}

function etykieta(tekst, tlo = "#16232a", kolor = "#fff") {
  const c = document.createElement("canvas"), g = c.getContext("2d"), f = 44; g.font = `700 ${f}px system-ui,sans-serif`;
  const w = Math.ceil(g.measureText(tekst).width) + 36; c.width = w; c.height = f + 26;
  g.font = `700 ${f}px system-ui,sans-serif`; g.fillStyle = tlo; g.beginPath(); g.roundRect(0, 0, w, c.height, 18); g.fill(); g.fillStyle = kolor; g.textBaseline = "middle"; g.fillText(tekst, 18, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); const h = 0.0055; s.scale.set(h * w / c.height, h, 1); s.renderOrder = 10; return s;
}

/** Buduje model wzorca. Zwraca { grupa, polaczenia: [{…, obj, znaczniki}], elementy: {nazwa: obiekt} } */
export function ukladLab(etap = 2, { etykiety = true } = {}) {
  const M = materialy(), g = new THREE.Group(); g.name = `Układ RFID – etap ${etap}`; const el = {};
  const dodaj = (nazwa, o) => { o.name = nazwa; el[nazwa] = o; g.add(o); return o; };
  // płytka MCU
  const mcu = new THREE.Group(); mcu.add(zaokr(mm(MCU.w), mm(1.6), mm(MCU.d), mm(2), M.pcbZiel)); mcu.position.set(mm(MCU.x + MCU.w / 2), mm(0.8), mm(MCU.z + MCU.d / 2));
  const chip = zaokr(mm(35), mm(3.5), mm(9), mm(0.5), M.epoksyd); chip.position.set(mm(8), mm(2.5), mm(8)); mcu.add(chip);
  const usb = new THREE.Mesh(new THREE.BoxGeometry(mm(16), mm(11), mm(12)), M.stal); usb.position.set(mm(-MCU.w / 2 + 6), mm(6), mm(-14)); mcu.add(usb);
  const gn = new THREE.Mesh(new THREE.BoxGeometry(mm(14), mm(11), mm(9)), M.plastikCzarny); gn.position.set(mm(-MCU.w / 2 + 7), mm(6), mm(18)); mcu.add(gn);
  const listwa = (x0, n, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(mm(n * P), mm(8.5), mm(2.5)), M.plastikCzarny); b.position.set(mm(x0 + (n - 1) * P / 2 - MCU.w / 2), mm(5), mm(z - MCU.d / 2)); mcu.add(b); };
  listwa(pinD(13).x - 2 * P, 10, 2.6); listwa(pinD(7).x, 8, 2.6); listwa(pinZ("3V3").x - 2 * P, 8, 50.8); listwa(pinZ("GND2").x + 3 * P, 6, 50.8);
  dodaj("Płytka mikrokontrolera", mcu);
  // płytka stykowa
  const bb = new THREE.Group(); bb.add(zaokr(mm(BB.w), mm(9), mm(BB.d), mm(1.5), M.plastikBialy)); bb.position.set(mm(BB.x + BB.w / 2), mm(4.5), mm(BB.z + BB.d / 2));
  const kropki = new THREE.InstancedMesh(new THREE.BoxGeometry(mm(1), mm(0.2), mm(1)), new THREE.MeshBasicMaterial({ color: "#3b3f44" }), 63 * 12); let k = 0; const m4 = new THREE.Matrix4();
  for (let c = 0; c < 63; c++) for (const r of ["j", "i", "h", "g", "f", "e", "d", "c", "b", "a", "+", "-"]) { const o = otwor(c, r); m4.makeTranslation(mm(o.x - BB.x - BB.w / 2), mm(4.55), mm(o.z - BB.z - BB.d / 2)); kropki.setMatrixAt(k++, m4); }
  bb.add(kropki);
  for (const [z, kol] of [[45.7, "#e53935"], [50.8, "#1e88e5"]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(mm(BB.w - 8), mm(0.3), mm(0.6)), new THREE.MeshBasicMaterial({ color: kol })); l.position.set(0, mm(4.6), mm(z - BB.d / 2)); bb.add(l); }
  dodaj("Płytka stykowa", bb);
  // moduł czytnika 13,56 MHz (40 × 60 mm), złącze w rzędzie e
  const rc = new THREE.Group(); const p0 = otwor(RC_KOL, "e");
  const pcb = zaokr(mm(40), mm(1.6), mm(60), mm(1.5), M.pcb); pcb.position.set(mm(9), mm(12), mm(-28)); rc.add(pcb);
  const zw = []; for (let i = 0; i < 4; i++) { const a = mm(15 - i * 1.8), b = mm(22 - i * 1.8); zw.push(new THREE.Vector3(mm(9) - a, mm(12.9), mm(-38) - b), new THREE.Vector3(mm(9) + a, mm(12.9), mm(-38) - b), new THREE.Vector3(mm(9) + a, mm(12.9), mm(-38) + b), new THREE.Vector3(mm(9) - a, mm(12.9), mm(-38) + b)); }
  rc.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(zw, true), 200, mm(0.5), 4, true), M.miedz));
  const icr = zaokr(mm(5), mm(1), mm(5), mm(0.3), M.epoksyd); icr.position.set(mm(9), mm(13.2), mm(-8)); rc.add(icr);
  const hdr = new THREE.Mesh(new THREE.BoxGeometry(mm(8 * P), mm(2.5), mm(2.5)), M.plastikCzarny); hdr.position.set(mm(3.5 * P), mm(10.5), 0); rc.add(hdr);
  for (let i = 0; i < 8; i++) { const pin = new THREE.Mesh(new THREE.BoxGeometry(mm(0.64), mm(12), mm(0.64)), M.zloto); pin.position.set(mm(i * P), mm(6), 0); rc.add(pin); }
  rc.position.set(mm(p0.x), mm(0), mm(p0.z)); dodaj("Moduł czytnika 13,56 MHz", rc);
  if (etap >= 2) {
    const led = (nazwa, kol, mat) => { const o = new THREE.Group(), a = otwor(kol, "e"); const k1 = new THREE.Mesh(new THREE.CylinderGeometry(mm(2.5), mm(2.5), mm(5), 20), mat); k1.position.y = mm(16); const k2 = new THREE.Mesh(new THREE.SphereGeometry(mm(2.5), 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat); k2.position.y = mm(18.5);
      for (const dx of [0, P]) { const n = new THREE.Mesh(new THREE.CylinderGeometry(mm(0.25), mm(0.25), mm(dx ? 12 : 14)), M.cyna); n.position.set(mm(dx), mm(dx ? 8 : 7), 0); o.add(n); }
      o.add(k1, k2); o.position.set(mm(a.x), mm(0), mm(a.z)); dodaj(nazwa, o);
      const r = new THREE.Group(); const korp = new THREE.Mesh(new THREE.CylinderGeometry(mm(1.2), mm(1.2), mm(6), 12), new THREE.MeshStandardMaterial({ color: "#d9c39a", roughness: 0.6 })); korp.rotation.x = Math.PI / 2; r.add(korp);
      for (const [i, c] of ["#cc0000", "#cc0000", "#5a3a1a"].entries()) { const pas = new THREE.Mesh(new THREE.CylinderGeometry(mm(1.25), mm(1.25), mm(0.6), 12), new THREE.MeshBasicMaterial({ color: c })); pas.rotation.x = Math.PI / 2; pas.position.z = mm(-1.8 + i * 1.2); r.add(pas); }
      const b1 = otwor(kol + 1, "a"); const b2 = otwor(kol + 1, "-"); r.position.set(mm(b1.x), mm(11), mm((b1.z + b2.z) / 2)); dodaj(nazwa.replace("Dioda", "Rezystor 220 Ω –"), r); };
    led("Dioda zielona", 8, M.led); led("Dioda czerwona", 14, M.ledCzerw);
    const bz = new THREE.Mesh(new THREE.CylinderGeometry(mm(6), mm(6), mm(9), 28), M.plastikCzarny); const bp = otwor(21, "e"); bz.position.set(mm(bp.x + 1.3), mm(13.5), mm(bp.z - 3)); dodaj("Brzęczyk", bz);
    const pr = new THREE.Group(); pr.add(zaokr(mm(26), mm(1.6), mm(34), mm(1), M.pcb)); const kost = zaokr(mm(15), mm(15), mm(19), mm(1), new THREE.MeshStandardMaterial({ color: "#1565c0", roughness: 0.4 })); kost.position.set(0, mm(8.5), mm(4)); pr.add(kost);
    const zac = new THREE.Mesh(new THREE.BoxGeometry(mm(15), mm(10), mm(7)), new THREE.MeshStandardMaterial({ color: "#1e88e5" })); zac.position.set(0, mm(6), mm(14)); pr.add(zac);
    pr.position.set(mm(93), mm(0.8), mm(86)); dodaj("Moduł przekaźnika", pr);
  }
  // przewody
  const lista = polaczenia(etap).map((p, i) => {
    const a = p.od[2], b = p.do[2], ya = mm(p.od[0] === "MCU" ? 9.5 : 9.5), yb = mm(p.do[0] === "Czytnik" ? 9.5 : p.do[0] === "Przekaźnik" ? 3 : 9.5);
    const A = new THREE.Vector3(mm(a.x), ya, mm(a.z)), B = new THREE.Vector3(mm(b.x), yb, mm(b.z)), dl = A.distanceTo(B), h = Math.min(mm(28), mm(8) + dl * 0.22) + mm(i % 4);
    const krzywa = new THREE.CubicBezierCurve3(A, A.clone().add(new THREE.Vector3(0, h, 0)), B.clone().add(new THREE.Vector3(0, h, 0)), B);
    const mat = new THREE.MeshStandardMaterial({ color: p.kolor, roughness: 0.45, emissive: p.kolor, emissiveIntensity: 0.0 });
    const obj = new THREE.Mesh(new THREE.TubeGeometry(krzywa, 48, mm(0.9), 8), mat); obj.name = `Przewód: ${p.od[0]} ${p.od[1]} → ${p.do[0]} ${p.do[1]}`; obj.userData.polaczenie = p.id; g.add(obj);
    const znaczniki = new THREE.Group(); znaczniki.visible = false;
    if (etykiety) { const ea = etykieta(`${p.od[1]}`, "#16232a"); ea.position.copy(A).add(new THREE.Vector3(0, mm(14), 0)); const eb = etykieta(`${p.do[0] === "Czytnik" ? "czytnik " : ""}${p.do[1]}`, p.kolor === "#fdd835" ? "#8a7400" : p.kolor === "#212121" ? "#455a64" : p.kolor); eb.position.copy(B).add(new THREE.Vector3(0, mm(14), 0)); znaczniki.add(ea, eb); }
    for (const P3 of [A, B]) { const r = new THREE.Mesh(new THREE.TorusGeometry(mm(2.4), mm(0.45), 8, 24), new THREE.MeshBasicMaterial({ color: "#ffeb3b", depthTest: false, transparent: true })); r.rotation.x = Math.PI / 2; r.position.copy(P3).setY(P3.y + mm(0.6)); r.renderOrder = 9; znaczniki.add(r); }
    g.add(znaczniki);
    return { ...p, obj, znaczniki };
  });
  return { grupa: g, polaczenia: lista, elementy: el };
}

/** Wymiary pola układu na macie (mm) – pokrywają się z tools/rfid/mata.py */
export const MATA = { szer: 297, wys: 210, znacznik: { x: 12, y: 12, bok: 62 }, pole: { x: 30, y: 88 } };
