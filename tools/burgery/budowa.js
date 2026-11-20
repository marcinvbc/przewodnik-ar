/* Realistyczne modele kanapek (PBR) do podglądu 3D/AR.
   Jednostki: cm (korzeń skalowany 0.01 → metry, prawdziwa wielkość w AR).
   Wszystko proceduralne: tekstury z szumu, mapy normalnych, clearcoat na sosach/serze/ogórkach. */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/* ---------- losowość i szum ---------- */
let ziarno = 1;
const los = () => ((ziarno = (ziarno * 16807) % 2147483647) / 2147483647);
const losZ = (a, b) => a + (b - a) * los();
function szum(period, seed) {          // okresowy w osi x (u) – bez szwu na lathe
  const H = (x, y) => { let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  const s = t => t * t * (3 - 2 * t);
  return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = s(x - xi), fy = s(y - yi), p = q => ((q % period) + period) % period;
    const a = H(p(xi), yi), b = H(p(xi + 1), yi), c = H(p(xi), yi + 1), d = H(p(xi + 1), yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
}
function fbm(oktawy, baza, seed) {
  const n = Array.from({ length: oktawy }, (_, i) => szum(baza * 2 ** i, seed + i * 17));
  return (u, v) => { let s = 0, a = 0.5, t = 0; for (let i = 0; i < oktawy; i++) { const f = baza * 2 ** i; s += a * n[i](u * f, v * f); t += a; a *= 0.5; } return s / t; };
}

/* ---------- tekstury: albedo + normalne z mapy wysokości ---------- */
function tekstury(w, h, fn, sila = 2.5, szorstkosc = false) {
  const ca = document.createElement("canvas"), cn = document.createElement("canvas"), cr = document.createElement("canvas"); ca.width = cn.width = cr.width = w; ca.height = cn.height = cr.height = h;
  const A = ca.getContext("2d").createImageData(w, h), N = cn.getContext("2d").createImageData(w, h), S = cr.getContext("2d").createImageData(w, h), H = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const r = fn(x / w, 1 - y / h), i = (y * w + x); H[i] = r.h ?? 0; A.data[i * 4] = r.c[0]; A.data[i * 4 + 1] = r.c[1]; A.data[i * 4 + 2] = r.c[2]; A.data[i * 4 + 3] = 255;
    S.data[i * 4] = 255; S.data[i * 4 + 1] = Math.max(0, Math.min(1, r.r ?? 0.5)) * 255; S.data[i * 4 + 2] = 0; S.data[i * 4 + 3] = 255; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const g = (xx, yy) => H[((yy + h) % h) * w + ((xx + w) % w)], dx = (g(x + 1, y) - g(x - 1, y)) * sila, dy = (g(x, y - 1) - g(x, y + 1)) * sila, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    N.data[i] = (-dx / l * 0.5 + 0.5) * 255; N.data[i + 1] = (-dy / l * 0.5 + 0.5) * 255; N.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; N.data[i + 3] = 255;
  }
  ca.getContext("2d").putImageData(A, 0, 0); cn.getContext("2d").putImageData(N, 0, 0); cr.getContext("2d").putImageData(S, 0, 0);
  const t = (c, srgb) => { const x = new THREE.CanvasTexture(c); x.wrapS = THREE.RepeatWrapping; x.wrapT = THREE.ClampToEdgeWrapping; if (srgb) x.colorSpace = THREE.SRGBColorSpace; x.userData.mimeType = "image/jpeg"; x.anisotropy = 4; return x; };
  const wynik = { map: t(ca, true), normalMap: t(cn, false) };
  if (szorstkosc) { wynik.roughnessMap = wynik.metalnessMap = t(cr, false); wynik.roughness = 1; wynik.metalness = 0; }
  return wynik;
}
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * Math.max(0, Math.min(1, t)));
const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

/* ---------- materiały (tworzone raz na model) ---------- */
function materialy() {
  const M = {};
  // bułka: złocisto-brązowa, ciemniejsza na szczycie, jasny opieczony przekrój, delikatny połysk glazury
  const nb = fbm(5, 6, 3), nd = fbm(3, 24, 9), plam = fbm(3, 3, 5);
  const miekiszTylko = m => m > 0.3; const bul = (miekisz) => tekstury(1024, 512, (u, v) => {
    const n = nb(u, v), d = nd(u, v), cut = v < miekisz;
    if (cut) { const c = mix(hex("#e2b26f"), hex("#b8763a"), 0.2 + n * 0.9); return { c: mix(c, hex("#f0dcae"), d > 0.66 ? 0.35 : 0), h: d * 0.6 - (d > 0.66 ? 0.4 : 0), r: 0.85 }; }
    const t = (v - miekisz) / (1 - miekisz), boki = mix(hex("#d39443"), hex("#a5531a"), Math.min(1, t * 2.4));
    let c = mix(boki, hex("#7a3510"), Math.min(1, Math.max(0, (t - 0.3) * 1.5) * (0.55 + plam(u, v) * 0.8)));
    c = mix(c, hex("#ecc58a"), Math.max(0, 0.16 - t) * 6 * (0.6 + n * 0.6));
    c = mix(c, hex("#5e270b"), Math.max(0, plam(u * 3 % 1, v * 2 % 1) - 0.62) * 1.6 * Math.min(1, t * 2));
    c = c.map(x => x * (0.86 + n * 0.28 + (d - 0.5) * 0.12));
    return { c, h: n * 0.5 + d * 0.35, r: 0.42 + (1 - t) * 0.15 + (d - 0.5) * 0.18 + (plam(u, v) - 0.5) * 0.1 };
  }, 3, !miekiszTylko(miekisz));
  M.bulka = new THREE.MeshPhysicalMaterial({ roughness: 0.5, ...bul(0.16), clearcoat: 0.3, clearcoatRoughness: 0.3, sheen: 0.12, sheenColor: new THREE.Color("#f7c98a"), sheenRoughness: 0.6, normalScale: new THREE.Vector2(1.1, 1.1) });
  M.bulkaSpod = new THREE.MeshPhysicalMaterial({ ...bul(0.42), roughness: 0.62, sheen: 0.1, sheenColor: new THREE.Color("#f7c98a"), normalScale: new THREE.Vector2(0.7, 0.7) });
  M.sezam = new THREE.MeshPhysicalMaterial({ color: "#f3e3b8", roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  // kotlet wołowy: ciemna skórka z porami, soczysty połysk
  const nm = fbm(5, 10, 21), np = fbm(2, 60, 33);
  M.mieso = new THREE.MeshPhysicalMaterial({ ...tekstury(1024, 512, (u, v) => { const n = nm(u, v), p = np(u, v);
    let c = mix(hex("#4a2a17"), hex("#24130a"), n * 1.3 - 0.15); c = mix(c, hex("#6e3f22"), Math.max(0, p - 0.6) * 3); c = mix(c, hex("#120904"), Math.max(0, 0.32 - p) * 3);
    return { c, h: n * 0.8 + p * 0.6 - (p < 0.32 ? 0.4 : 0), r: 0.82 - p * 0.45 + (n - 0.5) * 0.2 }; }, 4, true), roughness: 1, clearcoat: 0.22, clearcoatRoughness: 0.35, normalScale: new THREE.Vector2(1.4, 1.4) });
  // ser topiony
  const ns = fbm(3, 4, 41);
  M.ser = new THREE.MeshPhysicalMaterial({ ...tekstury(512, 512, (u, v) => ({ c: mix(hex("#ec8a00"), hex("#cf6400"), ns(u, v) * 1.2 - 0.1), h: ns(u, v) * 0.2 })), roughness: 0.34, clearcoat: 0.55, clearcoatRoughness: 0.2, side: THREE.DoubleSide });
  // ogórek: przekrój z pierścieniem pestek, ciemnozielona skórka
  const no = fbm(3, 8, 51);
  M.ogorekPrzekroj = new THREE.MeshPhysicalMaterial({ ...tekstury(512, 512, (u, v) => { const x = u - 0.5, y = v - 0.5, r = Math.hypot(x, y) * 2, a = Math.atan2(y, x), n = no(u, v);
    let c = r > 0.9 ? hex("#3d5a17") : mix(hex("#a9b44a"), hex("#8f9a2e"), r + n * 0.4 - 0.2);
    const pest = r > 0.35 && r < 0.62 && Math.abs(Math.sin(a * 6)) > 0.55 && Math.abs(r - 0.48) < 0.09 * Math.abs(Math.sin(a * 6));
    if (pest) c = hex("#dfe1a6"); if (r < 0.3) c = mix(c, hex("#c9cc76"), 0.4);
    return { c, h: (r > 0.9 ? 0.3 : 0) + (pest ? 0.4 : 0) + n * 0.3 }; }), roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12 });
  M.ogorekSkorka = new THREE.MeshPhysicalMaterial({ color: "#35501a", roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15 });
  M.cebula = new THREE.MeshPhysicalMaterial({ color: "#f1ecd9", roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.15, sheen: 0.4, sheenColor: new THREE.Color("#fff8e0") });
  const sos = (k, r = 0.14) => new THREE.MeshPhysicalMaterial({ color: k, roughness: r, clearcoat: 0.8, clearcoatRoughness: 0.08, side: THREE.DoubleSide });
  M.ketchup = sos("#8e1006"); M.musztarda = sos("#c88f07"); M.sosSpec = sos("#e19564", 0.2); M.sosMajo = sos("#f0e6cc", 0.2);
  M.salata = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25, side: THREE.DoubleSide, sheen: 0.3, sheenColor: new THREE.Color("#eaffc0") });
  // pomidor
  const nt = fbm(3, 8, 61);
  M.pomidorPrzekroj = new THREE.MeshPhysicalMaterial({ ...tekstury(512, 512, (u, v) => { const x = u - 0.5, y = v - 0.5, r = Math.hypot(x, y) * 2, a = Math.atan2(y, x), n = nt(u, v), kom = Math.cos(a * 4 + 0.4);
    let c = r > 0.93 ? hex("#b8170c") : r > 0.78 ? hex("#d9301a") : (kom > 0.15 && r > 0.25 && r < 0.75) ? mix(hex("#e9653c"), hex("#f08c4c"), n) : hex("#d4321d");
    const pest = kom > 0.3 && r > 0.35 && r < 0.68 && ((x * 97 + y * 61) * 13 % 1 + 1) % 1 < 0.08 + 0.1 * n; if (pest) c = hex("#f2d58a"); if (r < 0.2) c = mix(c, hex("#e9a06a"), 0.5);
    return { c, h: (kom > 0.15 && r < 0.75 ? -0.3 : 0) + (pest ? 0.3 : 0) + n * 0.2 }; }), roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1, emissive: new THREE.Color("#3a0500"), emissiveIntensity: 0.25 });
  M.pomidorSkorka = new THREE.MeshPhysicalMaterial({ color: "#b3170b", roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
  // panierka kurczaka
  const nk = fbm(5, 14, 71), nk2 = fbm(2, 50, 73);
  M.panierka = new THREE.MeshPhysicalMaterial({ ...tekstury(512, 512, (u, v) => { const n = nk(u, v), p = nk2(u, v);
    return { c: mix(mix(hex("#d58a32"), hex("#93460f"), n * 1.4 - 0.2), hex("#f4c77a"), Math.max(0, p - 0.62) * 3), h: n + p * 0.8 }; }, 5), roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.5, normalScale: new THREE.Vector2(1.6, 1.6) });
  // tortilla
  const nw = fbm(4, 5, 81), nw2 = fbm(3, 18, 83);
  M.tortilla = new THREE.MeshPhysicalMaterial({ ...tekstury(1024, 512, (u, v) => { const n = nw(u, v), p = nw2(u, v), plamka = Math.max(0, n - 0.55) * 3 + Math.max(0, p - 0.64) * 2.6 + (Math.abs(((v * 7 + u * 3) % 1) - 0.5) < 0.035 ? 0.55 + p * 0.4 : 0);
    return { c: mix(mix(hex("#ead2a0"), hex("#dcbd80"), p), hex("#8a521f"), plamka * 0.8), h: n * 0.3 + p * 0.3 + plamka * 0.3 }; }, 1.5), roughness: 0.72, sheen: 0.5, sheenColor: new THREE.Color("#fff1d0"), side: THREE.DoubleSide });
  const npap = fbm(3, 10, 91);
  M.papier = new THREE.MeshPhysicalMaterial({ ...tekstury(512, 512, (u, v) => { const n = npap(u, v); return { c: mix(hex("#cfa977"), hex("#b48a58"), n), h: n * 0.6 + Math.abs(Math.sin(u * 60 + n * 8)) * 0.15 }; }, 2), roughness: 0.88, side: THREE.DoubleSide });
  for (const m of Object.values(M)) m.vertexColors = true;
  return M;
}

/* ---------- geometrie ---------- */
const R = 5.1;   // promień bułki [cm]
function lathe(profil, seg = 96, n = 48) {      // równomierny podział po długości łuku → tekstura i zaburzenia bez rozciągania
  const d = [0]; for (let i = 1; i < profil.length; i++) d.push(d[i - 1] + Math.hypot(profil[i][0] - profil[i - 1][0], profil[i][1] - profil[i - 1][1]));
  const pts = []; for (let k = 0; k <= n; k++) { const t = d.at(-1) * k / n; let i = 1; while (i < d.length - 1 && d[i] < t) i++; const f = (t - d[i - 1]) / Math.max(1e-6, d[i] - d[i - 1]); pts.push(new THREE.Vector2(profil[i - 1][0] + (profil[i][0] - profil[i - 1][0]) * f, profil[i - 1][1] + (profil[i][1] - profil[i - 1][1]) * f)); }
  const g = new THREE.LatheGeometry(pts, seg); g.userData.lathe = [seg, pts.length]; normalne(g); return g; }
function normalne(g) {      // normalne + zszycie szwu tokarki (pierwsza i ostatnia kolumna to te same punkty)
  g.computeVertexNormals(); const L = g.userData.lathe; if (!L) return g; const [seg, n] = L, N = g.attributes.normal, P = g.attributes.position;
  for (let j = 0; j < n; j++) { const a = j, b = seg * n + j, x = N.getX(a) + N.getX(b), y = N.getY(a) + N.getY(b), z = N.getZ(a) + N.getZ(b), l = Math.hypot(x, y, z) || 1;
    N.setXYZ(a, x / l, y / l, z / l); N.setXYZ(b, x / l, y / l, z / l); P.setXYZ(b, P.getX(a), P.getY(a), P.getZ(a)); }
  return g; }
function wzgorze(R, h0, H, n = 18) { const p = []; for (let i = 0; i <= n; i++) { const t = i / n, a = t * Math.PI / 2; p.push([R * Math.cos(a) ** 0.75 * (1 - 0.02 * t), h0 + H * Math.sin(a) ** 1.25]); } return p; }
function zaburz(g, amp, f, seed, tylkoGora = false) {     // nieregularność wzdłuż normalnych
  const n = fbm(3, f, seed), p = g.attributes.position, nr = g.attributes.normal, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); if (tylkoGora && v.y < 0.05) continue; const a = Math.atan2(v.z, v.x) / (2 * Math.PI) + 0.5, d = (n(a, (v.y * 0.5 + Math.hypot(v.x, v.z) * 0.25) / f * 2) - 0.5) * amp;
    p.setXYZ(i, v.x + nr.getX(i) * d, v.y + nr.getY(i) * d, v.z + nr.getZ(i) * d); }
  return normalne(g);
}
function korona(M, sezam, r = R, h = 3.3) {
  const g = new THREE.Group(), prof = [[0, 0], [r * 0.9, 0], [r * 0.985, 0.12], [r, 0.45], ...wzgorze(r, 0.5, h - 0.5)];
  prof.push([0.001, h]);
  const geo = zaburz(zaburz(lathe(prof, 128, 56), 0.16, 2, 7 + Math.floor(los() * 30)), 0.08, 9, 8); geo.scale(1.015, 1, 0.99); normalne(geo); g.add(new THREE.Mesh(geo, M.bulka));
  if (sezam) {
    const ziarnko = new THREE.SphereGeometry(0.17, 8, 6); ziarnko.scale(1, 0.42, 0.6); const czesci = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < 140; i++) { const t = Math.sqrt(los()) * 0.86, a = los() * Math.PI * 2, ang = (1 - t) * Math.PI / 2, rr = r * Math.cos(ang) ** 0.75, y = 0.5 + (h - 0.5) * Math.sin(ang) ** 1.25;
      const nrm = new THREE.Vector3(Math.cos(a) * Math.sin(Math.PI / 2 - ang) * 0.8, Math.cos(Math.PI / 2 - ang) + 0.2, Math.sin(a) * Math.sin(Math.PI / 2 - ang) * 0.8).normalize();
      q.setFromUnitVectors(up, nrm).multiply(new THREE.Quaternion().setFromAxisAngle(up, los() * 6.28));
      m.compose(new THREE.Vector3(Math.cos(a) * rr, y + 0.03, Math.sin(a) * rr), q, new THREE.Vector3(1, 1, 1).multiplyScalar(losZ(0.85, 1.15))); const z = ziarnko.clone().applyMatrix4(m), odc = losZ(0.72, 1);
      z.setAttribute("color", new THREE.Float32BufferAttribute(Array.from({ length: z.attributes.position.count * 3 }, (_, k) => k % 3 === 2 ? odc * odc : odc), 3)); czesci.push(z); }
    g.add(new THREE.Mesh(mergeGeometries(czesci), M.sezam));
  }
  return g;
}
function spod(M, r = R, h = 1.4) { return new THREE.Mesh(zaburz(lathe([[0, 0], [r * 0.92, 0], [r * 0.99, 0.12], [r, 0.5], [r * 0.995, h - 0.22], [r * 0.95, h - 0.02], [r * 0.9, h], [0, h]]), 0.12, 3, 11), M.bulkaSpod); }
function srodek(M, r = R, h = 1.2) { return new THREE.Mesh(zaburz(lathe([[0, 0], [r * 0.9, 0], [r * 0.98, 0.12], [r, 0.45], [r * 0.98, h - 0.12], [r * 0.9, h], [0, h]]), 0.12, 3, 13), M.bulkaSpod); }
function kotlet(M, r = R * 0.98, h = 0.9) {
  const prof = [[0, 0], [r * 0.93, 0], [r * 0.99, 0.12], [r, h * 0.5], [r * 0.985, h - 0.14], [r * 0.93, h], [0.001, h]];
  const g = zaburz(lathe(prof, 160, 40), 0.3, 6, 23 + Math.floor(los() * 50)), p = g.attributes.position, sd = Math.floor(los() * 90), obrys = szum(5, 140 + sd), poszarp = szum(23, 150 + sd), pion = szum(9, 160 + sd);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = (Math.atan2(z, x) / 6.2832 + 0.5), bok = Math.max(0, 1 - Math.abs(y - h / 2) / (h * 0.6)), rr = Math.hypot(x, z) / r;
    const k = 1 + (obrys(a * 5, 0.5) - 0.5) * 0.07 + (poszarp(a * 23, y * 3) - 0.5) * 0.06 * bok * rr + (pion(a * 9, y * 4) - 0.5) * 0.03 * rr;
    p.setX(i, x * k); p.setZ(i, z * k); }
  normalne(g); return new THREE.Mesh(g, M.mieso);
}
function ser(M, rPod = R * 0.92, bok = 8.6) {
  const g = new THREE.PlaneGeometry(bok, bok, 64, 64); g.rotateX(-Math.PI / 2); const p = g.attributes.position, n = fbm(2, 3, 91 + Math.floor(los() * 9));
  for (let i = 0; i < p.count; i++) { const x0 = p.getX(i), z0 = p.getZ(i), a = Math.atan2(z0, x0), c = Math.abs(Math.cos(a)), sn = Math.abs(Math.sin(a)), k = (1 / Math.max(c, sn)) > 0 ? (1 / (c ** 4 + sn ** 4) ** 0.25) / (1 / Math.max(c, sn)) : 1; p.setX(i, x0 * k); p.setZ(i, z0 * k); }
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z), nad = Math.max(0, d - rPod);
    p.setY(i, -(nad ** 1.8) * 1.4 - nad * 0.35 + (n(x * 0.1 + 0.5, z * 0.1 + 0.5) - 0.5) * 0.15 * Math.min(1, nad + 0.2)); }
  g.computeVertexNormals(); const m = new THREE.Mesh(gruby(g, 0.13, 64), M.ser); m.rotation.y = losZ(0.5, 1.1); m.position.y = 0.2; return m;
}
function gruby(g, t, seg) {      // z siatki płaskiej (seg×seg) robi płat z grubością t
  const n = (seg + 1) ** 2, P = g.attributes.position, N = g.attributes.normal, poz = new Float32Array(n * 6), idx = [];
  for (let i = 0; i < n; i++) { poz.set([P.getX(i), P.getY(i), P.getZ(i)], i * 3); poz.set([P.getX(i) - N.getX(i) * t, P.getY(i) - N.getY(i) * t, P.getZ(i) - N.getZ(i) * t], (n + i) * 3); }
  const I = g.index.array; for (let k = 0; k < I.length; k += 3) { idx.push(I[k], I[k + 1], I[k + 2], n + I[k], n + I[k + 2], n + I[k + 1]); }
  const brzeg = []; for (let i = 0; i < seg; i++) brzeg.push(i); for (let j = 0; j < seg; j++) brzeg.push(seg + j * (seg + 1)); for (let i = seg; i > 0; i--) brzeg.push(seg * (seg + 1) + i); for (let j = seg; j > 0; j--) brzeg.push(j * (seg + 1));
  for (let k = 0; k < brzeg.length; k++) { const a = brzeg[k], b = brzeg[(k + 1) % brzeg.length]; idx.push(a, n + a, b, b, n + a, n + b); }
  const w = new THREE.BufferGeometry(); w.setAttribute("position", new THREE.BufferAttribute(poz, 3)); w.setIndex(idx); w.computeVertexNormals(); return w;
}
function ogorek(M) {
  const g = new THREE.CylinderGeometry(1.35, 1.35, 0.24, 48, 1); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z); if (r > 0.01) { const k = 1 + 0.05 * Math.sin(a * 16); p.setX(i, x * k); p.setZ(i, z * k); } }
  g.computeVertexNormals(); const m = new THREE.Mesh(g, [M.ogorekSkorka, M.ogorekPrzekroj, M.ogorekPrzekroj]); m.position.y = 0.12; m.rotation.set(losZ(-0.06, 0.06), 0, losZ(-0.06, 0.06)); return m;
}
function cebulka(M, r = R * 0.85) {
  const cz = []; for (let i = 0; i < 70; i++) { const b = new THREE.BoxGeometry(losZ(0.25, 0.55), 0.1, losZ(0.2, 0.45), 1, 1, 1); const a = los() * 6.28, rr = Math.sqrt(los()) * r;
    b.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(losZ(-0.4, 0.4), los() * 6.28, losZ(-0.4, 0.4)))); b.translate(Math.cos(a) * rr, losZ(0.06, 0.2), Math.sin(a) * rr); cz.push(b); }
  return new THREE.Mesh(mergeGeometries(cz), M.cebula);
}
function sos(mat, r = R * 0.8, h = 0.22, kapki = 3, rKraw = 99) {
  // nieregularna kałuża z kopułką i kilkoma „językami” wychodzącymi do krawędzi
  const n = fbm(2, 3, 101 + Math.floor(los() * 50)), jez = Array.from({ length: kapki }, () => [los() * 6.28, losZ(0.15, 0.32)]);
  const RAD = 40, PIER = 12, poz = [], idx = [];
  const brzeg = a => { let k = r * (0.78 + 0.35 * n(a / 6.28, 0.3)); for (const [ja, jw] of jez) { const d = Math.atan2(Math.sin(a - ja), Math.cos(a - ja)); k += r * 0.26 * Math.exp(-((d / jw) ** 2)); } return k; };
  poz.push(0, h, 0);
  for (let j = 1; j <= PIER; j++) for (let i = 0; i < RAD; i++) { const a = i / RAD * 6.28, t = j / PIER, b = brzeg(a) * t, nad = Math.max(0, b - rKraw); poz.push(Math.cos(a) * b, h * (1 - t ** 5) * (0.75 + 0.25 * n(a, t)) + 0.02 - nad ** 1.3 * 1.6 + (nad > 0 ? h * 0.6 : 0), Math.sin(a) * b); }
  for (let i = 0; i < RAD; i++) idx.push(0, 1 + (i + 1) % RAD, 1 + i);
  for (let i = 0; i < RAD; i++) { const k = 1 + (PIER - 1) * RAD + i; poz.push(poz[k * 3] * 1.01, poz[k * 3 + 1] - 0.16, poz[k * 3 + 2] * 1.01); }   // zaokrąglony brzeg kałuży
  for (let j = 1; j <= PIER; j++) for (let i = 0; i < RAD; i++) { const a = 1 + (j - 1) * RAD + i, b = 1 + (j - 1) * RAD + (i + 1) % RAD, c = a + RAD, d = b + RAD; idx.push(a, b, d, a, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(poz, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.rotation.y = los() * 6.28; m.userData.jezyki = jez.map(([a]) => [a - m.rotation.y, brzeg(a)]); return m;
}
function kapka(mat, dl) {      // spływająca kropla sosu: wydłużona łza wzdłuż boku
  const g = new THREE.LatheGeometry([[0, -0.05], [0.3, 0], [0.42, 0.12], [0.4, 0.3], [0.27, dl * 0.55], [0.2, dl * 0.85], [0.24, dl + 0.05], [0.18, dl + 0.22], [0.001, dl + 0.3]].map(([x, y]) => new THREE.Vector2(x, y)), 24);
  g.scale(1, 1, 0.4); g.rotateX(Math.PI); g.computeVertexNormals(); return new THREE.Mesh(g, mat);
}
function salata(M, r = R * 1.02, ile = 320) {
  const cz = []; for (let i = 0; i < ile; i++) { const dl = losZ(0.8, 1.9), g = new THREE.PlaneGeometry(dl, losZ(0.14, 0.3), 10, 1); const p = g.attributes.position, fal = losZ(2, 4.5), am = losZ(0.1, 0.24), skret = losZ(-0.8, 0.8);
    for (let k = 0; k < p.count; k++) { const x = p.getX(k), yy = p.getY(k); p.setZ(k, Math.sin(x * fal) * am + x * x * 0.08 + yy * Math.sin(x * skret) * 0.8); }
    const kol = [], jasny = los(); for (let k = 0; k < p.count; k++) { const c = new THREE.Color().lerpColors(new THREE.Color("#7fb83e"), new THREE.Color("#eef6cf"), Math.min(1, 0.25 + jasny * 0.7 + (p.getY(k) > 0 ? 0.2 : 0))); kol.push(c.r, c.g, c.b); }
    g.setAttribute("color", new THREE.Float32BufferAttribute(kol, 3));
    const a = los() * 6.28, rr = Math.pow(los(), 0.35) * r; g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-Math.PI / 2 + losZ(-0.5, 0.5), losZ(-0.4, 0.4), los() * 6.28)));
    g.translate(Math.cos(a) * rr, losZ(0.1, 0.55) - Math.max(0, rr - r * 0.85) * 0.6, Math.sin(a) * rr); g.deleteAttribute("uv"); g.computeVertexNormals(); cz.push(g); }
  return new THREE.Mesh(mergeGeometries(cz), M.salata);
}
function pomidor(M, r = 3.2) { const g = new THREE.CylinderGeometry(r, r * 0.98, 0.45, 48); const m = new THREE.Mesh(g, [M.pomidorSkorka, M.pomidorPrzekroj, M.pomidorPrzekroj]); m.position.y = 0.23; return m; }
function kurczak(M, dl = 7, sz = 1.8, gr = 1.3) {
  const g = new THREE.CapsuleGeometry(0.5, 1, 8, 24); g.scale(sz / 1, dl / 2, gr / 1); g.rotateZ(Math.PI / 2); g.computeVertexNormals();
  const p = g.attributes.position, nr = g.attributes.normal, n = fbm(3, 6, 111 + Math.floor(los() * 40)); for (let i = 0; i < p.count; i++) { const d = (n(p.getX(i) * 0.25 + 0.5, p.getY(i) * 0.5 + p.getZ(i) * 0.4) - 0.5) * 0.8; p.setXYZ(i, p.getX(i) + nr.getX(i) * d, p.getY(i) + nr.getY(i) * d, p.getZ(i) + nr.getZ(i) * d); }
  g.computeVertexNormals(); return new THREE.Mesh(g, M.panierka);
}

/* ---------- składanie ---------- */
const WYS = { korona: 3.3, koronaSez: 3.5, spod: 1.4, spodDuzy: 1.5, srodek: 1.2, wolowina: 0.9, ser: 0.22, ketchup: 0.12, musztarda: 0.1, sosSpec: 0.15, sosMajo: 0.15, cebulka: 0.15, ogorek: 0.24, salata: 0.45, pomidor: 0.45 };
export const KOLEJNOSC = {
  hamburger: ["spod", "wolowina", "ogorek", "cebulka", "ketchup", "musztarda", "korona"],
  cheeseburger: ["spod", "wolowina", "ser", "ogorek", "ogorek", "cebulka", "ketchup", "musztarda", "korona"],
  podwojny: ["spod", "wolowina", "ser", "wolowina", "ser", "ogorek", "ogorek", "cebulka", "ketchup", "musztarda", "korona"],
  pietrowy: ["spodDuzy", "sosSpec", "cebulka", "salata", "ser", "wolowina", "srodek", "sosSpec", "cebulka", "salata", "ogorek", "ogorek", "wolowina", "koronaSez"],
};
export function zbudujBurger(id, seed = 7) {
  ziarno = seed * 9973 + 11; const M = materialy(), sk = KOLEJNOSC[id], g = new THREE.Group(), duzy = id === "pietrowy", r = duzy ? 5.6 : R;
  let y = 0; const szwy = [];
  for (let i = 0; i < sk.length; i++) {
    const k = sk[i]; let o;
    if (k === "ogorek") { const grupa = sk[i - 1] === "ogorek" || sk[i + 1] === "ogorek"; o = ogorek(M); const naBrzegu = !grupa || sk[i + 1] === "ogorek";
      const a = naBrzegu ? 0.35 + los() * 0.6 : 2.6 + los(), rr = naBrzegu ? r - 1.05 : 1.3; o.position.x = Math.cos(a) * rr; o.position.z = Math.sin(a) * rr;
      if (sk[i + 1] === "ogorek") { o.position.y += y; g.add(o); continue; } }
    else if (k === "korona" || k === "koronaSez") { o = korona(M, k === "koronaSez", r, WYS[k]); o.rotation.set(losZ(-0.03, 0.03), 0, losZ(-0.035, 0.035)); o.position.x = losZ(-0.15, 0.15); }
    else if (k === "spod" || k === "spodDuzy") o = spod(M, r, WYS[k]);
    else if (k === "srodek") o = srodek(M, r, WYS[k]);
    else if (k === "wolowina") { o = kotlet(M, r * (duzy ? 0.95 : 0.98)); o.position.x = losZ(-0.2, 0.2); }
    else if (k === "ser") o = ser(M, r * 0.97, duzy ? 10.6 : 9.8);
    else if (k === "cebulka") o = cebulka(M, r * 0.82);
    else if (k === "salata") o = salata(M, r * 1.0, 480);
    else if (k === "pomidor") o = pomidor(M);
    else { o = k === "ketchup" ? sos(M[k], r * 0.88, 0.26, 3, r * 0.97) : k === "sosSpec" ? sos(M[k], r * 0.8, 0.26, 3, r * 0.97) : sos(M[k], r * 0.74); const ileKapek = { ketchup: 2, sosSpec: 2, musztarda: 1 }[k] || 0;
      for (const [a, b] of (ileKapek < 0 ? o.userData.jezyki : [])) { const kp = kapka(M[k], losZ(0.5, 0.95)), rk = r * 0.99 + 0.12; kp.position.set(Math.cos(a) * rk, y + 0.16, Math.sin(a) * rk); kp.rotation.y = -a + Math.PI / 2; g.add(kp); } }
    if (["spod", "spodDuzy", "srodek", "wolowina", "korona", "koronaSez"].includes(k)) szwy.push(y);
    o.position.y += y; g.add(o); y += WYS[k];
  }
  szwy.push(y); okluzja(g, szwy.slice(1, -1), r);
  const root = new THREE.Group(); root.name = id; g.scale.setScalar(0.01); root.add(g); return root;
}
/* cienie kontaktowe zapisane w kolorach wierzchołków: ciemniej w szczelinach między warstwami i przy blacie */
function okluzja(g, szwy, r, przyBlacie = true) {
  g.updateMatrixWorld(true); const v = new THREE.Vector3();
  g.traverse(o => { if (!o.isMesh) return; let geo = o.geometry; if (geo.userData.ao) geo = o.geometry = geo.clone(); geo.userData.ao = true;
    const p = geo.attributes.position, stare = geo.attributes.color, kol = new Float32Array(p.count * 3), lisc = o.material === undefined ? false : [].concat(o.material).some(m => m.side === THREE.DoubleSide && !m.map);
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); const rr = Math.hypot(v.x, v.z) / r; let ao = 1;
      for (const sy of szwy) { const d = Math.abs(v.y - sy); ao *= 1 - (lisc ? 0.3 : 0.5) * Math.exp(-((d / 0.32) ** 2)) * Math.min(1, Math.max(0, (1.06 - rr) * 3 + 0.4)); }
      if (przyBlacie) ao *= 1 - 0.45 * Math.exp(-((v.y / 0.35) ** 2));
      ao = Math.max(0.35, ao); for (let c = 0; c < 3; c++) kol[i * 3 + c] = (stare ? stare.array[i * 3 + c] : 1) * ao; }
    geo.setAttribute("color", new THREE.BufferAttribute(kol, 3)); });
}
export function zbudujWrap(seed = 5) {
  ziarno = seed * 9973 + 11; const M = materialy(), g = new THREE.Group(), L = 17, r0 = 2.6;
  // zwinięta tortilla: rura z lekko nieregularnym przekrojem, zwężona na końcu (zawinięta), otwarta z przodu
  const prof = []; for (let i = 0; i <= 30; i++) { const t = i / 30, x = -L / 2 + t * L; let r = r0 * (1 + 0.03 * Math.sin(t * 9)); if (t < 0.18) r *= 0.55 + 0.45 * Math.sin(t / 0.18 * Math.PI / 2); prof.push([r, x]); }
  const rura = new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 72); rura.rotateZ(-Math.PI / 2); zaburz(rura, 0.12, 4, 131);
  const p = rura.attributes.position; for (let i = 0; i < p.count; i++) { const yy = p.getY(i); if (yy < 0) p.setY(i, yy * 0.82); } rura.computeVertexNormals();   // spłaszczenie od spodu
  const tort = new THREE.Mesh(rura, M.tortilla); tort.position.y = r0 * 0.82; g.add(tort);
  const klapa = new THREE.Mesh(new THREE.CylinderGeometry(r0 + 0.07, r0 + 0.07, L * 0.84, 48, 1, true, 0.3, 1.9), M.tortilla); klapa.rotation.z = -Math.PI / 2; klapa.position.set(0.9, r0 * 0.82, 0); g.add(klapa);
  // nadzienie wystające z otwartego końca
  const nad = new THREE.Group(); nad.position.set(L / 2 - 1.2, r0 * 0.82, 0);
  for (let i = 0; i < 3; i++) { const k = kurczak(M, losZ(3.2, 4.2), losZ(1.7, 2.1), losZ(0.9, 1.2)); k.position.set(losZ(0.4, 1.6), losZ(-0.9, 0.9), losZ(-1, 1)); k.rotation.set(losZ(-0.3, 0.3), losZ(-0.4, 0.4), losZ(-0.25, 0.25)); nad.add(k); }
  const sal = salata(M, 1.9, 70); sal.rotation.z = Math.PI / 2; sal.position.set(1.0, 0, 0); nad.add(sal);
  const pom = pomidor(M, 1.6); pom.rotation.z = Math.PI / 2; pom.position.set(0.6, 1.1, -0.5); nad.add(pom);
  const s = sos(M.sosMajo, 1.4, 0.25, 2); s.rotation.z = Math.PI / 2; s.position.set(0.5, -0.4, 0.8); nad.add(s);
  g.add(nad);
  // papierowa tuleja na zawiniętej połowie
  const tul = new THREE.CylinderGeometry(r0 + 0.14, r0 + 0.14, L * 0.46, 72, 10, true); tul.rotateZ(-Math.PI / 2); zaburz(tul, 0.16, 7, 171);
  const tp = tul.attributes.position; for (let i = 0; i < tp.count; i++) { const yy = tp.getY(i); if (yy < 0) tp.setY(i, yy * 0.84); } tul.computeVertexNormals();
  const tuleja = new THREE.Mesh(tul, M.papier); tuleja.position.set(-L * 0.27, r0 * 0.82 + 0.02, 0); g.add(tuleja);
  g.rotation.y = -0.5; okluzja(g, [], 99);
  const root = new THREE.Group(); root.name = "wrap"; g.scale.setScalar(0.01); root.add(g); return root;
}
export function zbuduj(id) { return id === "wrap" ? zbudujWrap() : zbudujBurger(id); }
