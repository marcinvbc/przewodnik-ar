// Zwiedzaj z Aniołami – generator stylizowanych, „brązowych” aniołków (własny projekt, nie kopie rzeźb).
// Każdy anioł dostaje atrybut miejsca: JO, ciasto, naleśnik, jabłko i hantel (zdrowie), wiosło flisaka.
import * as THREE from "three";

function brazMat(kolor = "#9a6434", ciemny = false) {
  return new THREE.MeshStandardMaterial({ color: ciemny ? new THREE.Color(kolor).multiplyScalar(0.55) : kolor, metalness: 0.85, roughness: 0.38 });
}
function kapsula(r, dl, mat) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, dl, 6, 12), mat); m.castShadow = true; return m; }

function skrzydlo(mat, strona) {
  // kształt skrzydła z „piórami” – profil wyciągnięty w bryłę
  const s = new THREE.Shape(); s.moveTo(0, 0);
  s.bezierCurveTo(0.10, 0.30, 0.35, 0.42, 0.52, 0.36);
  s.lineTo(0.44, 0.28); s.lineTo(0.50, 0.22); s.lineTo(0.40, 0.16); s.lineTo(0.45, 0.10); s.lineTo(0.33, 0.06); s.lineTo(0.36, 0.0);
  s.bezierCurveTo(0.22, -0.04, 0.10, -0.06, 0, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 16 });
  g.translate(0, 0, -0.017);
  const m = new THREE.Mesh(g, mat); m.castShadow = true;
  const gr = new THREE.Group(); gr.add(m);
  m.rotation.y = strona * -0.5; m.scale.x = strona;
  return gr;
}

function napisJO(mat) {
  const g = new THREE.Group(), r = 0.012;
  const J = new THREE.Mesh(new THREE.TorusGeometry(0.035, r, 8, 16, Math.PI), mat); J.rotation.z = Math.PI; J.position.set(-0.05, 0.02, 0);
  const Jk = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.09, 8), mat); Jk.position.set(-0.015, 0.065, 0);
  const O = new THREE.Mesh(new THREE.TorusGeometry(0.045, r, 8, 24), mat); O.position.set(0.06, 0.06, 0); O.scale.y = 1.25;
  g.add(J, Jk, O); return g;
}

const ATRYBUTY = {
  jo(mat) {          // dymek z napisem „JO”
    const g = new THREE.Group();
    const dymek = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 32), mat); dymek.rotation.x = Math.PI / 2; dymek.scale.set(1.2, 1, 1);
    const ogon = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 8), mat); ogon.position.set(-0.11, -0.12, 0); ogon.rotation.z = 0.8;
    const n = napisJO(brazMat("#d9a75a")); n.position.set(-0.01, -0.06, 0.02);
    g.add(dymek, ogon, n); g.position.set(0.32, 0.95, 0.05); return { grupa: g, wDloni: false };
  },
  ciasto(mat) {      // kawałek ciasta na talerzyku
    const g = new THREE.Group();
    const talerz = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.015, 32), mat);
    const ks = new THREE.Shape(); ks.moveTo(0, 0); ks.absarc(0, 0, 0.085, -0.45, 0.45, false); ks.lineTo(0, 0);
    const kawal = new THREE.Mesh(new THREE.ExtrudeGeometry(ks, { depth: 0.06, bevelEnabled: false, curveSegments: 12 }), brazMat("#c99456")); kawal.rotation.x = -Math.PI / 2; kawal.position.y = 0.008;
    const wis = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), brazMat("#e0b070")); wis.position.set(0.05, 0.08, 0);
    g.add(talerz, kawal, wis); return { grupa: g, wDloni: true };
  },
  nalesnik(mat) {    // patelnia z naleśnikiem
    const g = new THREE.Group();
    const pat = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.095, 0.025, 32), mat);
    const ras = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), mat); ras.rotation.z = Math.PI / 2; ras.position.set(0.2, 0.01, 0);
    const nal = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.012, 32), brazMat("#d6a463")); nal.position.y = 0.06; nal.rotation.x = 0.35;
    g.add(pat, ras, nal); return { grupa: g, wDloni: true };
  },
  zdrowie(mat) {     // jabłko i mały hantel
    const g = new THREE.Group();
    const jab = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 16), brazMat("#b0703a")); jab.scale.y = 0.9;
    const og = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.04, 6), mat); og.position.y = 0.065;
    const lis = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mat); lis.scale.set(1.4, 0.4, 0.8); lis.position.set(0.02, 0.075, 0);
    const h = new THREE.Group(); const dr = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), mat); dr.rotation.z = Math.PI / 2;
    for (const x of [-0.07, 0.07]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16), mat); t.rotation.z = Math.PI / 2; t.position.x = x; h.add(t); }
    h.add(dr); h.position.set(0.0, -0.08, 0.06);
    g.add(jab, og, lis, h); return { grupa: g, wDloni: true };
  },
  wioslo(mat) {      // wiosło flisackie + kapelusz
    const g = new THREE.Group();
    const trzon = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.75, 8), mat);
    const pioro = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.012), mat); pioro.position.y = -0.45;
    g.add(trzon, pioro); g.rotation.z = 0.35; return { grupa: g, wDloni: true, kapelusz: true };
  },
};

/** Buduje anioła; zwraca THREE.Group o wysokości ~1 j. (podstawa na y=0). */
export function zbudujAniola(aniol) {
  const mat = brazMat(aniol.kolor || "#9a6434"), matC = brazMat(aniol.kolor || "#9a6434", true);
  const A = new THREE.Group(); A.name = aniol.imie;
  // cokół – kamienny schodek
  const cokol = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 0.42), new THREE.MeshStandardMaterial({ color: "#b9a990", roughness: 0.9 }));
  cokol.position.y = 0.11; cokol.receiveShadow = cokol.castShadow = true; A.add(cokol);
  const S = new THREE.Group(); S.position.y = 0.22; A.add(S);           // siedzący anioł
  // szata – bryła obrotowa
  const prof = [[0, 0], [0.17, 0.0], [0.19, 0.05], [0.16, 0.2], [0.12, 0.33], [0.1, 0.38], [0, 0.4]].map(([x, y]) => new THREE.Vector2(x, y));
  const szata = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), mat); szata.castShadow = true; szata.scale.z = 0.8; S.add(szata);
  // fałdy szaty
  for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.3, 6), matC); const a = -1.2 + i * 0.4; f.position.set(Math.sin(a) * 0.16, 0.13, Math.cos(a) * 0.13); f.rotation.x = -0.15; S.add(f); }
  // nogi zwisające z krawędzi
  for (const s of [-1, 1]) {
    const udo = kapsula(0.045, 0.14, mat); udo.rotation.x = Math.PI / 2; udo.position.set(s * 0.07, 0.05, 0.14); S.add(udo);
    const lyd = kapsula(0.038, 0.12, mat); lyd.position.set(s * 0.07, -0.04, 0.24); S.add(lyd);
    const st = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), mat); st.scale.set(0.8, 0.5, 1.4); st.position.set(s * 0.07, -0.13, 0.27); S.add(st);
  }
  // głowa z lokami
  const glowa = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 24), mat); glowa.position.y = 0.55; glowa.castShadow = true; S.add(glowa);
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, l = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), matC); l.position.set(Math.cos(a) * 0.12, 0.62 + Math.sin(i * 1.7) * 0.02, Math.sin(a) * 0.11 - 0.02); if (Math.sin(a) > 0.6) continue; S.add(l); }
  for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), matC); l.position.set(-0.08 + i * 0.04, 0.68, 0.04); S.add(l); }
  for (const s of [-1, 1]) { const oko = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), matC); oko.position.set(s * 0.05, 0.56, 0.135); S.add(oko); const pol = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), mat); pol.position.set(s * 0.075, 0.52, 0.12); pol.scale.z = 0.5; S.add(pol); }
  const usm = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 12, Math.PI), matC); usm.rotation.z = Math.PI; usm.position.set(0, 0.505, 0.14); S.add(usm);
  // aureola
  const aur = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.01, 8, 40), brazMat("#e2b867")); aur.rotation.x = Math.PI / 2 - 0.25; aur.position.set(0, 0.76, -0.03); S.add(aur);
  // skrzydła
  for (const s of [-1, 1]) { const w = skrzydlo(mat, s); w.position.set(s * 0.06, 0.3, -0.1); w.rotation.set(0.15, s * 0.6, s * -0.15); S.add(w); }
  // atrybut i ręce
  const at = (ATRYBUTY[aniol.atrybut] || ATRYBUTY.jo)(mat);
  const dlonL = new THREE.Vector3(-0.1, 0.27, 0.2), dlonP = new THREE.Vector3(0.1, 0.27, 0.2);
  if (at.wDloni) { at.grupa.position.set(0, 0.3, 0.24); if (aniol.atrybut === "wioslo") { at.grupa.position.set(0.2, 0.3, 0.2); dlonP.set(0.19, 0.3, 0.2); } }
  else { dlonP.set(0.2, 0.5, 0.12); }        // JOnasz macha ręką
  S.add(at.grupa);
  for (const [bark, dl] of [[new THREE.Vector3(-0.1, 0.36, 0), dlonL], [new THREE.Vector3(0.1, 0.36, 0), dlonP]]) {
    const d = dl.clone().sub(bark), r = kapsula(0.035, d.length() - 0.05, mat); r.position.copy(bark).add(d.clone().multiplyScalar(0.5));
    r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); S.add(r);
    const dlon = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 8), mat); dlon.position.copy(dl); S.add(dlon);
  }
  if (at.kapelusz) { const k = new THREE.Group(); const ron = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.015, 32), matC); const kor = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.08, 24), matC); kor.position.y = 0.045; k.add(ron, kor); k.position.set(0, 0.69, 0); k.rotation.z = 0.12; S.add(k); aur.visible = false; }
  A.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return A;
}
