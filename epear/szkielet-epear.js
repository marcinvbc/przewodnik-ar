/*
 * UKŁAD KOSTNY – kurs e-peAR „Ułóż szkielet”.
 * Uruchamiane na stronie konsoli e-peAR (po wczytaniu Pomocnika): pobiera kości z GitHub Pages
 * (modele/szkielet), układa slajdy i przekazuje paczkę do Pomocnika. Zawiera też ocenę ułożenia
 * z zapisanej sceny (porównanie ze wzorcem).
 *
 *   await __szkieletEpear.utworz()                // tworzy paczkę i otwiera Pomocnika (kliknij „Utwórz kurs”)
 *   __szkieletEpear.flagi(courseData)             // po utworzeniu: ustawia flagi przesuwania / układanki
 *   __szkieletEpear.ocen(courseData, nrSlajdu)    // ocena ułożenia z zapisanej sceny
 */
(function () {
  const BAZA = "https://marcinvbc.github.io/przewodnik-ar/modele/szkielet/";
  const C = 0.0733;                          // e-peAR: największy wymiar modelu ≈ C × skala
  const K = 0.6;                             // skala szkieletu w scenie (1,75 m → ok. 1 m)
  const B = { x: 0.5, y: 0.31, z: 2.2 };     // miejsce stóp szkieletu (podłoga sceny)
  const tp = [-0.78, 1.23, -0.2], ip = [-2.4, 1.4, 1.7];
  const DOBRZE = 0.05, PRAWIE = 0.10;        // metry w skali naturalnej

  const wTekst = n => ({ x: B.x + K * n[0], y: B.y + K * n[1], z: B.z + K * n[2] });

  function rozsyp(meta, ziarno = 7) {        // jak w lekcji web: dwie półki po bokach
    let a = ziarno >>> 0; const r = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const ids = meta.map(m => m.id).sort(() => r() - 0.5), pos = {}, strony = [[], []];
    ids.forEach((id, i) => strony[i % 2].push(id));
    strony.forEach((lista, s) => { let x = 0.62, y = 1.85, szer = 0;
      for (const id of lista) { const m = meta.find(q => q.id === id), [w, h] = m.rozmiar;
        if (y - h < 0.03) { x += szer + 0.08; y = 1.85; szer = 0; }
        pos[id] = [(x + w / 2) * (s ? 1 : -1), y - h / 2, m.srodek[2]]; y -= h + 0.07; szer = Math.max(szer, w); } });
    return pos;
  }

  async function plansza(meta) {
    const c = document.createElement("canvas"); c.width = 1600; c.height = 1000; const g = c.getContext("2d");
    g.fillStyle = "#f6f1e7"; g.fillRect(0, 0, 1600, 1000); g.fillStyle = "#16232a"; g.fillRect(0, 0, 1600, 130);
    g.fillStyle = "#fff"; g.font = "800 52px system-ui"; g.fillText("Układ kostny – ułóż szkielet", 50, 80);
    g.fillStyle = "#cfe0ea"; g.font = "26px system-ui"; g.fillText("22 części prawdziwego szkieletu (BodyParts3D, CC BY 4.0). Porównaj z wzorcem obok.", 50, 117);
    const img = new Image(); img.crossOrigin = "anonymous"; img.src = BAZA + "szkielet-przod.jpg";
    await img.decode().catch(() => {}); if (img.width) g.drawImage(img, 1080, 140, 860 * img.width / img.height * 0.98, 840);
    g.fillStyle = "#16232a"; g.font = "700 28px system-ui"; g.fillText("Części do ułożenia", 50, 185);
    g.font = "22px system-ui";
    meta.forEach((m, i) => { const kol = i < 11 ? 0 : 1, w = i % 11; g.fillText(`${i + 1}. ${m.nazwa.replace(/ \(.*\)/, "")}`, 50 + kol * 500, 228 + w * 40); });
    g.font = "22px system-ui"; g.fillStyle = "#33424a";
    ["Lewa strona szkieletu jest po Twojej prawej – patrzysz na niego z przodu.", "Zaliczenie: min. 60% zgodności ze wzorcem (do 5 cm = 1 pkt, do 10 cm = ½ pkt)."].forEach((t, i) => g.fillText(t, 50, 690 + i * 36));
    return await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
  }

  async function utworz() {
    const meta = await (await fetch(BAZA + "szkielet.json")).json();
    const wz = await (await fetch(BAZA + "wzorzec.json")).json();
    const pliki = [], ix = {};
    const dodaj = (klucz, f) => { ix[klucz] = pliki.length; pliki.push(f); };
    for (const m of meta) dodaj(m.id, { nazwa: m.nazwa + ".glb", typ: "model/gltf-binary", rodzaj: "model", blob: await (await fetch(BAZA + m.id + ".glb")).blob() });
    dodaj("wzorzec", { nazwa: "Wzorzec szkieletu.glb", typ: "model/gltf-binary", rodzaj: "model", blob: await (await fetch(BAZA + "wzorzec.glb")).blob() });
    dodaj("krazek", { nazwa: "Miejsce na szkielet.glb", typ: "model/gltf-binary", rodzaj: "model", blob: await (await fetch(BAZA + "krazek.glb")).blob() });
    dodaj("plansza", { nazwa: "Układ kostny – plansza.jpg", typ: "image/jpeg", rodzaj: "obraz", blob: await plansza(meta) });
    const tx = (k, nazwa, tekst) => dodaj(k, { nazwa, typ: "text/plain", rodzaj: "tekst", tekst, blob: new Blob([tekst], { type: "text/plain" }) });
    tx("t1", "S1 Układ kostny – tekst.txt", "UKŁAD KOSTNY\n\nSzkielet dorosłego człowieka ma 206 kości. Tu ułożysz go z 22 części.\n\nObejrzyj wzorzec i planszę.\n\n➡ Ułóż szkielet: slajd 2");
    tx("t2", "S2 Ułóż szkielet – tekst.txt", "UŁÓŻ SZKIELET\n\nPrzenieś każdą kość na złoty krążek tak, jak we wzorcu obok.\n\nLewa strona szkieletu = Twoja prawa.\n\nNa koniec zapiszcie scenę.");
    tx("t3", "S3 Układanka – tekst.txt", "UKŁADANKA e-peAR\n\nTa sama lekcja w trybie układanki wbudowanym w e-peAR: aplikacja sama sprawdza, czy kość trafiła na miejsce.");
    tx("t4", "S4 Wynik – tekst.txt", "WYNIK\n\nProwadzący porównuje zapisany szkielet ze wzorcem: każda kość do 5 cm = 1 pkt, do 10 cm = ½ pkt.\n\nZaliczenie: 60%. Wynik trafia do Moodle.");
    const ob = (k, poz, skala, extra = {}) => ({ rodzaj: pliki[ix[k]].rodzaj, plik: ix[k], nazwa: pliki[ix[k]].nazwa, poz, rotY: 0, skala, tekst: pliki[ix[k]].tekst || "", ...extra });
    const skalaKosci = m => K * Math.max(...m.rozmiar) / C;
    const KW = 0.32, wzP = [B.x - 1.55, B.y + KW * wz.srodek[1], B.z + KW * wz.srodek[2]];
    const wzorzec = ob("wzorzec", wzP, KW * Math.max(...wz.rozmiar) / C);
    const krazek = ob("krazek", [B.x, B.y + 0.003, B.z + K * 0.1], K * 0.9 / C);
    const rozs = rozsyp(meta);
    const naMiejscu = meta.map(m => { const p = wTekst(m.srodek); return ob(m.id, [p.x, p.y, p.z], skalaKosci(m)); });
    const rozsypane = meta.map(m => { const p = wTekst(rozs[m.id]); return ob(m.id, [p.x, p.y, p.z], skalaKosci(m), { uczen: true }); });
    const slajdy = [
      { obiekty: [ob("t1", tp, 1.71, { rotY: 8 }), ob("plansza", ip, 38.2, { rotY: 316 }), { ...wzorzec, poz: [B.x, B.y + K * wz.srodek[1], B.z + K * wz.srodek[2]], skala: K * Math.max(...wz.rozmiar) / C, uczen: true }], dymki: [] },
      { obiekty: [ob("t2", tp, 1.71, { rotY: 8 }), wzorzec, krazek, ...rozsypane], dymki: [] },
      { obiekty: [ob("t3", tp, 1.71, { rotY: 8 }), wzorzec, ...naMiejscu], dymki: [] },
      { obiekty: [ob("t4", tp, 1.71, { rotY: 8 }), ob("plansza", ip, 38.2, { rotY: 316 })], dymki: [] },
    ];
    for (const s of slajdy) for (const o of s.obiekty) if (o.rotY == null) o.rotY = 0;
    const P = { wersja: 2, kurs: { tytul: "Układ kostny – ułóż szkielet", krotkiOpis: "Ułóż szkielet człowieka z 22 części i porównaj go ze wzorcem.", opisHtml: "<p>Realistyczne kości (BodyParts3D, CC BY 4.0). Uczniowie przenoszą kości na miejsce, pracując razem w teleobecności; ułożenie oceniamy przez porównanie ze wzorcem.</p>", przedmiot: "Biologia", czas: 45, czegoSieNauczysz: ["Nazwać główne części szkieletu człowieka", "Rozróżnić kości lewej i prawej strony", "Ułożyć szkielet zgodnie ze wzorcem", "Współpracować w grupie na wspólnej scenie AR"] },
      pliki, galeria: [{ nazwa: "Układ kostny – plansza.jpg", typ: "image/jpeg", blob: pliki[ix.plansza].blob }], pominiete: [], sceny: ["Układ kostny", "Ułóż szkielet", "Układanka e-peAR", "Wynik"], scena: { slajdy }, quiz: null };
    window.__P = P;
    window.__pomocnikEpear.wczytaj(P);
    return `${pliki.length} plików, slajdy: ${slajdy.map(s => s.obiekty.length).join("/")}`;
  }

  /** flagi po utworzeniu kursu: slajd 2 – kości przesuwane (bez skalowania i obracania), slajd 3 – tryb układanki */
  function flagi(cd) {
    const sl = cd.slides.$values;
    sl.forEach((s, i) => s.sceneData.objectDatas.$values.forEach(o => {
      if ("fontSize" in o) o.fontSize = 14;
      o.isScalableByStudents = false;
      const n = o.assetData?.name || "";
      const kosc = !/Wzorzec|Miejsce|plansza|tekst/i.test(n) && o.$type?.includes("AssetObjectData");
      if (i === 1 && kosc) { o.isMovableByStudents = true; o.isRotatableByStudents = false; }
      if (i === 2 && kosc) { o.isPuzzle = true; o.puzzlePrecisionNeeded = true; o.isMovableByStudents = true; o.isRotatableByStudents = false; }
      if (/Wzorzec/.test(n) && i === 0) { o.isRotatableByStudents = true; o.isMovableByStudents = false; }
      if (/Wzorzec|Miejsce/.test(n) && i > 0) { o.isMovableByStudents = false; o.isRotatableByStudents = false; }
    }));
    return cd;
  }

  /** ocena z zapisanej sceny: dopasowanie przesunięcia (mediana), potem odległość każdej kości od wzorca */
  async function ocen(cd, nrSlajdu = 1) {
    const meta = await (await fetch(BAZA + "szkielet.json")).json();
    const obiekty = cd.slides.$values[nrSlajdu].sceneData.objectDatas.$values;
    const poz = {};
    for (const m of meta) { const o = obiekty.find(q => (q.assetData?.name || "").replace(/\.glb$/i, "") === m.nazwa); if (o) poz[m.id] = [(o.position.x - B.x) / K, (o.position.y - B.y) / K, (o.position.z - B.z) / K]; }
    const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
    const ids = Object.keys(poz), t = [0, 1, 2].map(k => med(ids.map(id => poz[id][k] - meta.find(m => m.id === id).srodek[k])));
    const wiersze = meta.map(m => {
      const p = poz[m.id]; if (!p) return { nazwa: m.nazwa, cm: null, st: "brak" };
      const d = Math.hypot(p[0] - t[0] - m.srodek[0], p[1] - t[1] - m.srodek[1], p[2] - t[2] - m.srodek[2]);
      return { nazwa: m.nazwa, cm: Math.round(d * 100), st: d <= DOBRZE ? "ok" : d <= PRAWIE ? "prawie" : "zle" };
    });
    const pkt = wiersze.reduce((s, w) => s + (w.st === "ok" ? 1 : w.st === "prawie" ? 0.5 : 0), 0), proc = Math.round(pkt / meta.length * 100);
    const ocena = proc >= 98 ? 6 : proc >= 88 ? 5 : proc >= 75 ? 4 : proc >= 60 ? 3 : proc >= 45 ? 2 : 1;
    return { proc, pkt, ocena, zaliczone: proc >= 60, przesuniecie_m: t.map(v => +(v * K).toFixed(3)), wiersze };
  }

  window.__szkieletEpear = { utworz, flagi, ocen, rozsyp, K, B, C };
})();
