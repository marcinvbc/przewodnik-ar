/*
 * POMOCNIK e-peAR
 * Uruchamiany zakładką (bookmarklet) na stronie e-peAR, gdy nauczyciel jest zalogowany.
 * Odbiera paczkę lekcji z aplikacji Lekcja AR (okno, które otworzyło e-peAR) albo z pliku .zip
 * i zakłada w e-peAR kurs: opis, kategoria, „czego się nauczysz”, pliki (modele 3D, zdjęcia, filmy, teksty, PDF),
 * galeria i quiz z pytaniami. Używa sesji zalogowanego nauczyciela – hasło nigdy nie opuszcza e-peAR.
 */
(() => {
  if (window.__pomocnikEpear) { window.__pomocnikEpear.pokaz(); return; }

  const ZAUFANE = [/^https:\/\/marcinvbc\.github\.io$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const bezOgonkow = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L").toUpperCase().trim();

  /* ------------------------------------------------------------ połączenie z e-peAR */
  function keycloak() {
    const app = document.querySelector("#app")?.__vue_app__;
    const k = app?._context?.provides?.keycloakProvideVariable;
    return k?.token ? k : (k?.value?.token ? k.value : null);
  }
  async function adresApi(kc) {
    for (const s of document.querySelectorAll("script[src]")) {
      try {
        const t = await (await fetch(s.src)).text();
        const m = t.match(/https:\/\/[a-z0-9.-]*console-proxy[a-z0-9.-]*\/realm\/[A-Za-z0-9_-]+/);
        if (m) return m[0];
      } catch {}
    }
    return `${location.protocol}//${location.host.replace(/^([^.]+)\./, "$1-console-proxy.")}/realm/${kc.realm}`;
  }
  let API = "", KC = null;
  async function api(metoda, sciezka, cialo, formularz, opcje = {}) {
    const proby = opcje.bezPonowien ? 1 : 3;
    for (let proba = 0; proba < proby; proba++) {
      await KC.updateToken(30).catch(() => {});
      const h = { Authorization: "Bearer " + KC.token, Accept: "application/json, text/plain, */*" };
      if (cialo && !formularz) h["Content-Type"] = "application/json";
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), opcje.czas || 180000);
      try {
        const r = await fetch(API + sciezka, { method: metoda, headers: h, body: formularz ? cialo : (cialo ? JSON.stringify(cialo) : undefined), signal: ctl.signal });
        const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
        if (r.ok) return j;
        if (r.status < 500 || proba === proby - 1) throw new Error(`${metoda} ${sciezka.split("/").slice(0, 3).join("/")}: ${r.status}${t ? " – " + t.slice(0, 120) : ""}`);
      } catch (e) {
        if (proba === proby - 1 || /: [1-4]\d\d/.test(e.message)) throw e.name === "AbortError" ? new Error("serwer nie odpowiedział w czasie") : e;
      } finally { clearTimeout(to); }
      await new Promise(r => setTimeout(r, 1500 * (proba + 1)));
    }
  }
  /** Dołączenie pliku do kursu. Serwer e-peAR potrafi przetwarzać to długo i odpowiedzieć błędem 500 lub przekroczeniem
   *  czasu, mimo że plik został dołączony – dlatego po błędzie sprawdzamy kurs, zamiast powtarzać. */
  async function dolacz(kursId, plikId, log) {
    try { await api("PUT", `/manage_file/add/${kursId}/${plikId}`, null, false, { bezPonowien: true, czas: 150000 }); return true; }
    catch (e) { log("   ⏳ e-peAR jeszcze przetwarza plik – sprawdzam, czy jest w kursie…"); }
    for (let i = 0; i < 30; i++) {
      try { const k = await api("GET", `/course/${kursId}`); if ((k?.courseFiles || []).some(f => f.id === plikId)) return true; } catch {}
      await new Promise(r => setTimeout(r, 10000));
    }
    throw new Error("plik nie pojawił się w kursie (sprawdź „Pliki kursu” w e-peAR)");
  }


  /* ------------------------------------------------------------ scena dla aplikacji mobilnej e-peAR (courseData) */
  const T = n => `Vobacom.ArPlus.Managers.${n}, Assembly-CSharp`;
  const V3 = ([x, y, z]) => ({ $type: "Vobacom.ArPlus.Utils.SerializableVector3, Vobacom.Utils", x, y, z });
  const LISTA = (typ, values) => ({ $type: `System.Collections.Generic.List\`1[[${typ}]], mscorlib`, $values: values });
  const TYP_ASSET = { model: 0, obraz: 1, tekst: 2, pdf: 2, film: 3, awatar: 4 };
  // Wzory obiektów zapisane przez aplikację mobilną e-peAR (format z 13.11.2026)
  function obiektSceny(o, plik) {
    const assetData = { $type: T("AssetData"), assetSource: 1, assetType: TYP_ASSET[o.rodzaj], isPrimitive: false, isLooping: false, isPlayOnAwake: false,
      name: o.rodzaj === "awatar" ? "NewAvatarText" : plik.nazwa, pathOrUrl: plik.epearId, fileExtension: o.rodzaj === "awatar" ? "wav" : null, tagName: "", setActiveAfterSpawn: true };
    const wspolne = { assetData, disassemblyAnimationTime: 1, priority: 0, disassembledType: 0, isTooltips: false, partTtScl: 0, partTtOffset: 0,
      isMovableByStudents: !!o.uczen, isRotatableByStudents: !!o.uczen && !o.bezObrotu, isScalableByStudents: !!o.uczen && !o.bezSkali, isDisassemblableByStudents: !!(o.rozklad || o.puzzle), animationSpeed: 1,
      objectPartsChanges: LISTA("Vobacom.ArPlus.Managers.ObjectPart, Assembly-CSharp", []),
      convertToMrtkShaders: false, showHierarchyToStudents: !!o.czesci, isPuzzle: !!o.puzzle, puzzlePrecisionNeeded: o.precyzja ?? 0.3,
      position: V3(o.poz), rotation: V3([0, o.rotY, 0]), scale: V3([o.skala, o.skala, o.skala]), color: V3([1, 1, 1]),
      BackgroundTransparecncy: 0, showInteractablePartsList: !!o.czesci, chosenAnimation: o.animacja || "", guid: crypto.randomUUID(),
      positionSource: 2, objectId: "00000000-0000-0000-0000-000000000000", pinPointerPosition: V3([0, 0, 0]), IsControllableByStudents: !!o.uczen };
    if (o.rodzaj === "awatar") return { $type: T("AvatarObjectData"), isHaveSpeech: true, isStartSpeechOnStart: o.mowiOdRazu === true, StartWithSlide: o.mowiOdRazu === true,
      isChatAvailableForStudents: o.czat === true, thisAvatarGender: o.plec || 0, thisAvatarChatGPTObjective: 0, ...wspolne };
    if (o.rodzaj === "tekst" || o.rodzaj === "pdf") return { $type: T("TextObjectData"), text: o.tekst || "", colorText: V3([0, 0, 0]),
      isCustomColor: false, isBold: false, isItalic: false, isUnderline: false, isStrikethrough: false, isLowercase: false, isUppercase: false, isSmallcaps: false,
      isLeftAlignment: false, isMidleAlignment: true, isRightAlignment: false, isTransparentBackground: false, isAutoFontSize: false, fontSize: (o.tekst || "").length > 200 ? 14 : (o.tekst || "").length > 100 ? 18 : 24.41877, ...wspolne };
    return { $type: T("AssetObjectData"), lodOverride: null, ...wspolne };
  }
  /** Dymek (TooltipObjectData) przypięty do obiektu sceny – pozycja w układzie lokalnym obiektu. */
  function dymek(d, cel) {
    return { $type: T("TooltipObjectData"), tooltipText: d.tekst || "", componentId: -1, objectId: cel.guid, positionSource: 0, assetData: null,
      disassemblyAnimationTime: 1, priority: 2, disassembledType: 0, isHaveObjectPartTooltips: false, objectPartTooltipsScale: 0, objectPartTooltipsOffset: 0,
      isMovableByStudents: false, isRotatableByStudents: false, isScalableByStudents: false, isDisassemblableByStudents: false, animationSpeed: 1,
      objectPartsChanges: LISTA("Vobacom.ArPlus.Managers.ObjectPart, Assembly-CSharp", []), convertToMrtkShaders: false, showHierarchyToStudents: false,
      isPuzzle: false, puzzlePrecisionNeeded: 0.3, position: V3(d.lokal ? [d.lokal[0], d.lokal[1], -d.lokal[2]] : [0, 0, 0]), rotation: V3([0, 0, 0]), scale: V3([0, 0, 0]), color: V3([1, 1, 1]),
      BackgroundTransparecncy: 0, showInteractablePartsList: false, chosenAnimation: "", guid: crypto.randomUUID(), IsControllableByStudents: false };
  }
  function courseData(P) {
    return { $type: "Vobacom.ArPlus.Courses.CourseData, Assembly-CSharp", slides: LISTA("Slide, Assembly-CSharp", P.scena.slajdy.map((s, i) => {
      const obiekty = [], wgIndeksu = {};
      s.obiekty.forEach((o, j) => { if (P.pliki[o.plik]?.epearId && o.rodzaj !== "pdf" && !/\.pdf$/i.test(P.pliki[o.plik].nazwa)) { const x = obiektSceny(o, P.pliki[o.plik]); wgIndeksu[j] = x; obiekty.push(x); } });
      for (const d of s.dymki || []) if (wgIndeksu[d.cel]) obiekty.push(dymek(d, wgIndeksu[d.cel]));
      return { $type: "Slide, Assembly-CSharp", id: i, sceneData: { $type: T("SceneData"),
        objectDatas: LISTA("Vobacom.ArPlus.Managers.ObjectData, Assembly-CSharp", obiekty),
        objectGroupDatas: LISTA("Vobacom.ArPlus.Managers.ObjectGroupData, Assembly-CSharp", []) } };
    })) };
  }
  /* ------------------------------------------------------------ odczyt paczki .zip (bez kompresji) */
  async function czytajZip(file) {
    const buf = new Uint8Array(await file.arrayBuffer()), dv = new DataView(buf.buffer), pliki = {};
    let e = buf.length - 22; while (e > 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e <= 0) throw new Error("To nie jest paczka .zip z Lekcji AR");
    let p = dv.getUint32(e + 16, true); const n = dv.getUint16(e + 10, true);
    for (let i = 0; i < n; i++) {
      const met = dv.getUint16(p + 10, true), cs = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      const nazwa = new TextDecoder().decode(buf.slice(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
      const start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true);
      let dane = buf.slice(start, start + cs);
      if (met === 8) dane = new Uint8Array(await new Response(new Blob([dane]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
      pliki[nazwa] = dane;
    }
    if (!pliki["paczka.json"]) throw new Error("W paczce brakuje pliku paczka.json");
    const P = JSON.parse(new TextDecoder().decode(pliki["paczka.json"]));
    const blob = (nazwa, typ) => new Blob([pliki["pliki/" + nazwa]], { type: typ });
    P.pliki = (P.pliki || []).map(f => ({ ...f, blob: blob(f.plik, f.typ) }));
    P.galeria = (P.galeria || []).map(f => ({ ...f, blob: blob(f.plik, f.typ) }));
    return P;
  }

  /* ------------------------------------------------------------ panel */
  const host = document.createElement("div"); host.style.cssText = "position:fixed;inset:0;z-index:2147483000;";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
    *{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
    .tlo{position:fixed;inset:0;background:rgba(15,20,22,.55)}
    .p{position:fixed;right:20px;top:20px;bottom:20px;width:min(520px,calc(100vw - 40px));background:#fffdf8;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.35);display:flex;flex-direction:column;overflow:hidden;color:#1f2a2e}
    header{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #e3dccd}
    header .l{width:34px;height:34px;border-radius:9px;background:#c9562f;color:#fff;display:grid;place-items:center;font-weight:800;font-size:13px}
    header b{flex:1;font-size:16px} button{font:600 14px system-ui;border-radius:99px;padding:9px 15px;border:1px solid #e3dccd;background:#fff;cursor:pointer;color:#1f2a2e}
    button.g{background:#c9562f;color:#fff;border-color:#c9562f} button:disabled{opacity:.5;cursor:default} button.x{border:0;background:none;font-size:18px;padding:4px 8px}
    .c{flex:1;overflow:auto;padding:16px;display:grid;gap:12px;align-content:start;font-size:14px;line-height:1.45}
    .k{background:#fff;border:1px solid #e3dccd;border-radius:14px;padding:12px}
    .m{color:#6b6f66;font-size:13px} label{display:flex;gap:8px;align-items:center;margin-top:6px} select{width:100%;padding:8px;border-radius:10px;border:1px solid #e3dccd;font:inherit;margin-top:4px}
    .lista{max-height:180px;overflow:auto;font-size:13px;margin:6px 0 0;padding-left:18px}
    .log{font:12.5px ui-monospace,Menlo,monospace;background:#1f2a2e;color:#e8efe9;border-radius:12px;padding:10px;max-height:240px;overflow:auto;white-space:pre-wrap}
    .pasek{height:8px;background:#f1ebdd;border-radius:99px;overflow:hidden}.pasek div{height:100%;width:0;background:#c9562f;transition:width .3s}
    .ok{background:#eef6ef;border-color:#b9dcc0;color:#24502c} .bl{background:#fdecec;border-color:#f3c0c0;color:#8a1c1c}
    footer{padding:12px 16px;border-top:1px solid #e3dccd;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
    a{color:#c9562f;font-weight:700}
  </style>
  <div class="tlo"></div>
  <div class="p" role="dialog" aria-label="Pomocnik e-peAR">
    <header><div class="l">AR</div><b>Pomocnik e-peAR</b><button class="x" data-x title="Zamknij">✕</button></header>
    <div class="c" id="c"></div>
    <footer id="f"></footer>
  </div>`;
  const $ = s => root.querySelector(s);
  const ekran = (html, stopka = "") => { $("#c").innerHTML = html; $("#f").innerHTML = stopka; };
  let praca = false;
  root.querySelector("[data-x]").onclick = () => { if (!praca || confirm("Przerwać wysyłanie?")) zamknij(); };
  root.querySelector(".tlo").onclick = () => { if (!praca) zamknij(); };
  function zamknij() { host.remove(); }
  window.__pomocnikEpear = { pokaz() { if (!host.isConnected) document.body.appendChild(host); }, wczytaj(P) { przygotuj(P, "plik"); }, async wczytajZip(f) { this.pokaz(); try { przygotuj(await czytajZip(f), "plik"); } catch (err) { alertKarta(err.message); } } };
  document.body.appendChild(host);

  /* ------------------------------------------------------------ start */
  (async () => {
    ekran(`<div class="k">Łączę się z e-peAR…</div>`);
    KC = keycloak();
    if (!KC) return ekran(`<div class="k bl">Nie widzę zalogowanej sesji e-peAR. Zaloguj się, otwórz dowolną stronę panelu (np. „Konfiguracja kursów”) i kliknij zakładkę „Pomocnik e-peAR” jeszcze raz.</div>`);
    API = await adresApi(KC);
    oczekuj();
  })();

  function oczekuj() {
    ekran(`<div class="k"><b>Czekam na lekcję z aplikacji Lekcja AR…</b><p class="m">Jeśli e-peAR otworzył się z przycisku „📤 Wyślij do e-peAR”, lekcja dotrze sama za chwilę.</p>
      <p class="m">Możesz też wczytać paczkę pobraną wcześniej z Lekcji AR (plik <b>.zip</b>):</p>
      <input type="file" accept=".zip" id="plik"></div>
      <div class="k"><b>📥 Pobierz lekcje z e-peAR do podglądu</b><p class="m">Odczytuje Twoje kursy razem ze scenami (slajdy, modele, teksty, obrazy, awatary, dymki), ustawieniami obiektów i quizami. Nic w e-peAR się nie zmienia.</p>
      <button class="g" data-eksport>📥 Wybierz lekcje do pobrania</button></div>`, `<button data-x2>Zamknij</button>`);
    $("[data-x2]").onclick = zamknij; $("[data-eksport]").onclick = () => ekranEksportu();
    $("#plik").onchange = async e => { try { przygotuj(await czytajZip(e.target.files[0]), "plik"); } catch (err) { alertKarta(err.message); } };
    if (window.opener) try { window.opener.postMessage({ typ: "epear-gotowy" }, "*"); } catch {}
  }
  function alertKarta(t) { $("#c").insertAdjacentHTML("beforeend", `<div class="k bl">❌ ${esc(t)}</div>`); }
  let odbiorcaEksportu = null;
  addEventListener("message", e => {
    if (e.data?.typ === "epear-chce-lekcje" && !praca) { if (!ZAUFANE.some(r => r.test(e.origin))) return; odbiorcaEksportu = { okno: e.source, origin: e.origin }; ekranEksportu(); return; }
    if (e.data?.typ !== "epear-paczka" || praca) return;
    if (!ZAUFANE.some(r => r.test(e.origin))) { alertKarta(`Odrzucono paczkę z nieznanej strony: ${e.origin}`); return; }
    przygotuj(e.data.paczka, e.origin);
  });


  /* ------------------------------------------------------------ EKSPORT lekcji do podglądu w Lekcji AR (tylko odczyt) */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(pliki) {   // [{nazwa, dane: Uint8Array}] → Blob (bez kompresji)
    const enc = new TextEncoder(), czesci = [], katalog = []; let off = 0;
    for (const f of pliki) {
      const n = enc.encode(f.nazwa), c = crc32(f.dane), h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true); h.setUint32(14, c, true); h.setUint32(18, f.dane.length, true); h.setUint32(22, f.dane.length, true); h.setUint16(26, n.length, true);
      czesci.push(h, n, f.dane);
      const k = new DataView(new ArrayBuffer(46)); k.setUint32(0, 0x02014b50, true); k.setUint16(4, 20, true); k.setUint16(6, 20, true); k.setUint16(8, 0x800, true); k.setUint32(16, c, true); k.setUint32(20, f.dane.length, true); k.setUint32(24, f.dane.length, true); k.setUint16(28, n.length, true); k.setUint32(42, off, true);
      katalog.push(k, n); off += 30 + n.length + f.dane.length;
    }
    const rozm = katalog.reduce((a, x) => a + (x.byteLength ?? x.length), 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, pliki.length, true); e.setUint16(10, pliki.length, true); e.setUint32(12, rozm, true); e.setUint32(16, off, true);
    return new Blob([...czesci, ...katalog, e], { type: "application/zip" });
  }
  async function pobierzPlik(id, limitMB) {   // pobiera plik z e-peAR; przerywa, gdy przekroczy limit
    await KC.updateToken(30).catch(() => {});
    const ctl = new AbortController(), r = await fetch(API + "/manage_file/" + id, { headers: { Authorization: "Bearer " + KC.token }, signal: ctl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const dl = +r.headers.get("content-length") || 0; if (dl && dl > limitMB * 1048576) { ctl.abort(); return { zaDuzy: dl }; }
    const rd = r.body.getReader(), kaw = []; let suma = 0;
    for (;;) { const { done, value } = await rd.read(); if (done) break; suma += value.length; if (suma > limitMB * 1048576) { ctl.abort(); return { zaDuzy: suma }; } kaw.push(value); }
    const out = new Uint8Array(suma); let o = 0; for (const k of kaw) { out.set(k, o); o += k.length; } return { dane: out, typ: r.headers.get("content-type") || "" };
  }
  async function ekranEksportu() {
    ekran(`<div class="k">Pobieram listę Twoich kursów…</div>`);
    let lista = [];
    try { lista = await api("GET", "/course"); if (!Array.isArray(lista)) lista = lista?.content || []; } catch (e) { return alertKarta("Nie udało się pobrać listy kursów: " + e.message); }
    lista = lista.filter(k => !k.deleted).sort((a, b) => String(b.modifyDate || b.createDate || "").localeCompare(String(a.modifyDate || a.createDate || "")));
    ekran(`<div class="k"><b>📥 Lekcje do pobrania (${lista.length})</b><p class="m">Zaznacz kursy. Pobranie tylko odczytuje dane – nic w e-peAR się nie zmienia.</p>
        <label><input type="checkbox" id="wsz" checked> zaznacz wszystkie</label>
        <div class="lista" style="max-height:260px;list-style:none;padding-left:0">${lista.map(k => `<label><input type="checkbox" data-k="${esc(k.id)}" checked> ${esc(k.title || "(bez tytułu)")} <span class="m">· ${esc(k.status || "")}${k.open ? " · publiczny" : ""}</span></label>`).join("")}</div></div>
      <div class="k"><b>Pliki do podglądu</b>
        <label><input type="checkbox" id="mod" checked> modele 3D (GLB) do <input type="number" id="lim" value="60" min="1" max="200" style="width:64px"> MB każdy</label>
        <label><input type="checkbox" id="obr" checked> obrazy (JPG/PNG)</label>
        <label><input type="checkbox" id="dzw" checked> głosy awatarów i dźwięki (do 10 MB)</label>
        <p class="m">Filmy i PDF zostaną opisane w podglądzie, ale bez pobierania. Większe modele pokażą się jako zarys z nazwą.</p></div>
      ${odbiorcaEksportu ? `<div class="k ok">Lekcje trafią od razu do zakładki „Lekcje w e-peAR” w Lekcji AR (${esc(odbiorcaEksportu.origin)}).</div>` : `<div class="m">Wynik zapiszesz jako plik <b>.zip</b> i wczytasz w zakładce „Lekcje w e-peAR” w Lekcji AR.</div>`}`,
      `<button data-wr>← Wróć</button><button class="g" data-go>📥 Pobierz zaznaczone</button>`);
    $("#wsz").onchange = e => root.querySelectorAll("[data-k]").forEach(c => c.checked = e.target.checked);
    $("[data-wr]").onclick = oczekuj;
    $("[data-go]").onclick = () => eksportuj([...root.querySelectorAll("[data-k]:checked")].map(c => c.dataset.k), { modele: $("#mod").checked, obrazy: $("#obr").checked, dzwieki: $("#dzw").checked, limit: Math.max(1, +$("#lim").value || 60) });
  }
  async function eksportuj(ids, o) {
    if (!ids.length) return alertKarta("Zaznacz co najmniej jeden kurs.");
    praca = true;
    ekran(`<div class="pasek"><div id="pas"></div></div><div class="log" id="log"></div>`, `<button data-x3 disabled>Zamknij</button>`);
    const log = t => { const l = $("#log"); l.textContent += t + "\n"; l.scrollTop = l.scrollHeight; }, pas = (a, b) => $("#pas").style.width = Math.round(a / b * 100) + "%";
    const kursy = [], pliki = [], pobrane = new Map(), pominiete = [];
    for (const [i, id] of ids.entries()) {
      try {
        const k = await api("GET", "/course/" + id); let cd = null;
        try { cd = k.courseData ? JSON.parse(k.courseData) : null; } catch { pominiete.push(`${k.title}: nieczytelne dane sceny`); }
        let quizy = []; try { quizy = await api("GET", "/quiz/course/" + id) || []; } catch {}
        const slajdy = cd?.slides?.$values?.length || 0;
        log(`📘 ${k.title} – ${slajdy} slajdów, ${(k.courseFiles || []).length} plików${quizy.length ? `, quiz (${quizy.reduce((a, q) => a + (q.taskList?.length || 0), 0)} pytań)` : ""}`);
        const pl = [];
        for (const f of k.courseFiles || []) {
          const ext = String(f.extension || (f.title || "").split(".").pop() || "").toLowerCase(), rodzaj = /^(glb|gltf)$/.test(ext) ? "model" : /^(jpe?g|png|webp|gif)$/.test(ext) ? "obraz" : /^(mp4|mov|webm)$/.test(ext) ? "film" : /^(wav|mp3|ogg)$/.test(ext) ? "dzwiek" : ext === "pdf" ? "pdf" : ext === "txt" ? "tekst" : "inny";
          const wpis = { id: f.id, nazwa: f.title || f.name || f.id, ext, rodzaj, typ: f.contentType || "", animowany: !!f.animated };
          const chce = (rodzaj === "model" && o.modele) || (rodzaj === "obraz" && o.obrazy) || (rodzaj === "dzwiek" && o.dzwieki) || rodzaj === "tekst";
          if (chce) {
            if (pobrane.has(f.id)) Object.assign(wpis, pobrane.get(f.id));
            else try { const w = await pobierzPlik(f.id, rodzaj === "model" ? o.limit : rodzaj === "dzwiek" ? 10 : 15);
              if (w.zaDuzy) { const x = { pominiety: `większy niż limit (${(w.zaDuzy / 1048576).toFixed(0)} MB+)` }; Object.assign(wpis, x); pobrane.set(f.id, x); log(`   ⏭ ${wpis.nazwa}: za duży`); }
              else { const x = { plik: `pliki/${f.id}.${ext || "bin"}`, rozmiar: w.dane.length }; pliki.push({ nazwa: x.plik, dane: w.dane }); Object.assign(wpis, x); pobrane.set(f.id, x); log(`   ⬇ ${wpis.nazwa} (${(w.dane.length / 1048576).toFixed(1)} MB)`); }
            } catch (e) { wpis.pominiety = "nie udało się pobrać: " + e.message; log(`   ⚠️ ${wpis.nazwa}: ${e.message}`); }
          }
          pl.push(wpis);
        }
        kursy.push({ id: k.id, tytul: k.title, krotkiOpis: k.shortDescription || "", opis: k.description || "", kategorie: (k.categories || []).map(c => c.label || c.name || c.id), status: k.status, publiczny: !!k.open,
          utworzono: k.createDate, zmieniono: k.modifyDate, komentarze: !!k.commentsAllowed, jednorazowy: !!k.oneTime, waluta: k.currency || "", czegoSieNauczysz: (k.whatWillYouLearn || []).sort((a, b) => a.orderNumber - b.orderNumber).map(w => w.description), wymagania: k.requirements || "", obrazowGalerii: k.numberOfImages || 0,
          pliki: pl, scena: cd, quizy });
      } catch (e) { log(`❌ kurs ${id}: ${e.message}`); pominiete.push(`kurs ${id}: ${e.message}`); }
      pas(i + 1, ids.length);
    }
    const eksport = { wersja: 1, zrodlo: location.origin, pobrano: new Date().toISOString(), kursy, pominiete }; window.__pomocnikEpear.ostatniEksport = { eksport, pliki: pliki.map(f => ({ nazwa: f.nazwa, rozmiar: f.dane.length })) };
    const mb = pliki.reduce((a, f) => a + f.dane.length, 0) / 1048576;
    log(`\n✅ Gotowe: ${kursy.length} kursów, ${pliki.length} plików (${mb.toFixed(1)} MB).`);
    praca = false; $("#f").innerHTML = "";
    if (odbiorcaEksportu?.okno && !odbiorcaEksportu.okno.closed) {
      try { odbiorcaEksportu.okno.postMessage({ typ: "epear-lekcje", eksport, pliki: pliki.map(f => ({ nazwa: f.nazwa, blob: new Blob([f.dane]) })) }, odbiorcaEksportu.origin);
        $("#c").insertAdjacentHTML("afterbegin", `<div class="k ok">✅ Lekcje wysłane do zakładki „Lekcje w e-peAR”. Możesz zamknąć to okno i wrócić do Lekcji AR.</div>`); } catch (e) { alertKarta("Nie udało się przekazać do Lekcji AR: " + e.message); }
    }
    const nazwa = `lekcje-e-peAR-${new Date().toISOString().slice(0, 10)}.zip`;
    $("#f").innerHTML = `<button data-zip>⬇ Zapisz plik .zip</button><button class="g" data-x4>Zamknij</button>`;
    $("[data-x4]").onclick = zamknij;
    $("[data-zip]").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(zip([{ nazwa: "eksport.json", dane: new TextEncoder().encode(JSON.stringify(eksport)) }, ...pliki])); a.download = nazwa; a.click(); };
  }

  /* ------------------------------------------------------------ podsumowanie przed wysłaniem */
  async function przygotuj(P, skad) {
    let kategorie = [];
    try { kategorie = await api("GET", "/category"); } catch (e) { alertKarta("Nie udało się pobrać kategorii: " + e.message); }
    const cel = bezOgonkow(P.kurs.przedmiot);
    const pasujaca = kategorie.find(k => bezOgonkow(k.label) === cel) || kategorie.find(k => cel && (bezOgonkow(k.label).startsWith(cel.slice(0, 5)) || cel.startsWith(bezOgonkow(k.label).slice(0, 5))));
    const ile = t => P.pliki.filter(f => f.rodzaj === t).length;
    const mb = (P.pliki.reduce((a, f) => a + (f.blob?.size || 0), 0) + P.galeria.reduce((a, f) => a + (f.blob?.size || 0), 0)) / 1048576;
    ekran(`<div class="k"><div class="m">Lekcja z: ${esc(skad === "plik" ? "pliku .zip" : skad)}</div>
        <div style="font-size:18px;font-weight:800;margin-top:4px">${esc(P.kurs.tytul)}</div><div class="m">${esc(P.kurs.krotkiOpis)}</div></div>
      <div class="k"><b>Co powstanie w e-peAR</b>
        <ul class="lista"><li>kurs z opisem i ${P.kurs.czegoSieNauczysz.length} punktami „czego się nauczysz”, czas ${esc(P.kurs.czas)} min</li>
        <li>pliki kursu (${P.pliki.length}): ${ile("model")} modeli 3D, ${ile("obraz")} obrazów, ${ile("film")} filmów, ${ile("tekst")} tekstów, ${ile("pdf")} PDF – ok. ${mb.toFixed(1)} MB</li>
        <li>galeria: ${P.galeria.length} obrazów</li>
        <li>${P.quiz?.pytania?.length ? `quiz „${esc(P.quiz.tytul)}” – ${P.quiz.pytania.length} pytań` : "bez quizu"}</li></ul>
        ${P.pominiete?.length ? `<p class="m">Pominięte (e-peAR ich nie przyjmuje): ${P.pominiete.map(esc).join(", ")}</p>` : ""}</div>
      <div class="k"><b>Kategoria kursu</b>
        <select id="kat">${kategorie.map(k => `<option value="${esc(k.id)}" ${k === pasujaca ? "selected" : ""}>${esc(k.label)}</option>`).join("")}</select>
        ${pasujaca ? "" : `<p class="m">Nie ma kategorii „${esc(P.kurs.przedmiot)}” – wybierz najbliższą albo dodaj ją w e-peAR (Konfiguracja kursów → Kategorie kursów) i otwórz pomocnika ponownie.</p>`}
        <label><input type="checkbox" id="gal" ${P.galeria.length ? "checked" : "disabled"}> dodaj obrazy do galerii kursu</label>
        <label><input type="checkbox" id="qz" ${P.quiz?.pytania?.length ? "checked" : "disabled"}> utwórz quiz</label>
        <label><input type="checkbox" id="scn" ${P.scena?.slajdy?.length ? "checked" : "disabled"}> ułóż scenę AR (${P.scena?.slajdy?.length || 0} slajdów) – gotowa do otwarcia w aplikacji e-peAR</label>
        <label><input type="checkbox" id="publ"> kurs publiczny (widoczny dla wszystkich w katalogu „Kursy”)</label></div>
      <div class="m">Nic nie zostanie wysłane, dopóki nie klikniesz „Utwórz kurs”. Pliki trafią też do Twoich „Zasobów”.</div>`,
      `<button data-anuluj>Anuluj</button><button class="g" data-start ${kategorie.length ? "" : "disabled"}>Utwórz kurs w e-peAR</button>`);
    $("[data-anuluj]").onclick = zamknij;
    $("[data-start]").onclick = () => wyslij(P, { kategoria: $("#kat").value, galeria: $("#gal").checked, quiz: $("#qz").checked, scena: $("#scn").checked, publiczny: $("#publ").checked });
  }

  /* ------------------------------------------------------------ wysyłanie */
  async function wyslij(P, o) {
    praca = true;
    ekran(`<div class="pasek"><div id="pas"></div></div><div class="m">e-peAR przetwarza każdy plik na serwerze – przy dużych modelach 3D może to trwać 1–2 minuty na plik. Nie zamykaj tej karty.</div><div class="log" id="log"></div>`, `<button data-x3 disabled>Zamknij</button>`);
    const log = t => { const l = $("#log"); l.textContent += t + "\n"; l.scrollTop = l.scrollHeight; };
    const kroki = 1 + P.pliki.length + (o.galeria ? P.galeria.length : 0) + (o.quiz ? 1 + P.quiz.pytania.length : 0) + (o.scena ? 1 : 0);
    let zrobione = 0; const krok = () => { $("#pas").style.width = Math.round(++zrobione / kroki * 100) + "%"; };
    const bledy = [];
    let kurs = null;
    try {
      log("➕ Tworzę kurs…");
      kurs = await api("POST", "/course", {
        title: P.kurs.tytul.slice(0, 200), shortDescription: P.kurs.krotkiOpis.slice(0, 250), description: P.kurs.opisHtml,
        categories: [{ id: o.kategoria }], duration: +P.kurs.czas || 45, open: !!o.publiczny, courseFiles: [], currency: "PLN", status: "WEB_INITIALIZED",
        whatWillYouLearn: P.kurs.czegoSieNauczysz.slice(0, 12).map((d, i) => ({ description: d.slice(0, 250), orderNumber: i })),
      });
      if (!kurs?.id) throw new Error("e-peAR nie zwrócił numeru kursu");
      log(`   ✅ kurs „${kurs.title}”`); krok();
    } catch (e) { log("❌ " + e.message); return koniec(null, [e.message]); }

    for (const f of P.pliki) {
      try {
        log(`⬆ ${f.nazwa}`);
        const fd = new FormData();
        fd.append("file", f.blob, f.nazwa); fd.append("fileName", f.nazwa); fd.append("contentType", f.typ); fd.append("animated", String(!!f.animowany));
        const z = await api("POST", "/manage_file/educator", fd, true);
        if (!z?.id) throw new Error("brak numeru pliku");
        await api("PUT", `/course/${z.id}/lod`, null, false, { bezPonowien: true, czas: 60000 }).catch(() => {});   // optymalizacja (jak w panelu e-peAR)
        await dolacz(kurs.id, z.id, log);
        f.epearId = z.id;
        log("   ✅ dodano do kursu");
      } catch (e) { log("   ❌ " + e.message); bledy.push(f.nazwa); }
      krok();
    }
    if (o.galeria) for (const g of P.galeria) {
      try {
        log(`🖼 galeria: ${g.nazwa}`);
        const fd = new FormData(); fd.append("file", g.blob, g.nazwa); fd.append("name", g.nazwa); fd.append("contentType", g.typ);
        await api("POST", `/gallery/addImage/${kurs.id}`, fd, true); log("   ✅");
      } catch (e) { log("   ❌ " + e.message); bledy.push("galeria: " + g.nazwa); }
      krok();
    }
    if (o.quiz) {
      try {
        log(`❓ Quiz „${P.quiz.tytul}”…`);
        const q = await api("POST", `/quiz/${kurs.id}`, { title: P.quiz.tytul, description: P.quiz.opis || "", instructions: P.quiz.instrukcje || "", courseId: kurs.id, courseTitle: kurs.title,
          timeLimitInMinutes: String(P.quiz.czas || 10), maxPoints: String(P.quiz.pytania.length), taskList: [], deleted: false });
        let qid = q?.id;
        if (!qid) { const l = await api("GET", `/quiz/course/${kurs.id}`); qid = (Array.isArray(l) ? l[0] : l)?.id; }
        krok();
        for (const [i, p] of P.quiz.pytania.entries()) {
          try {
            await api("POST", `/quiz/${qid}/task`, { orderNumber: i, questionType: "TEST", timeLimitInSeconds: "0", singleChoice: true, points: "1",
              question: { elementType: "TEXT", data: p.pytanie, url: "" }, matchAnswers: [],
              testAnswers: p.odpowiedzi.map((a, j) => ({ orderNumber: j, answerType: "TEST", correct: j === p.poprawna, content: { elementType: "TEXT", data: a, url: "" } })) });
            log(`   ✅ pytanie ${i + 1}`);
          } catch (e) { log(`   ❌ pytanie ${i + 1}: ${e.message}`); bledy.push("pytanie " + (i + 1)); }
          krok();
        }
      } catch (e) { log("   ❌ " + e.message); bledy.push("quiz"); }
    }
    if (o.scena && P.scena?.slajdy?.length) {
      try {
        log(`🎬 Zapisuję scenę AR: ${P.scena.slajdy.length} slajdów…`);
        const pelny = await api("GET", `/course/${kurs.id}`);
        // do sceny trafiają tylko pliki, które naprawdę są w kursie – brakujący plik psuje przełączanie slajdów w aplikacji
        const wKursie = new Set((pelny.courseFiles || []).map(f => f.id));
        P.pliki.forEach(f => { if (f.epearId && !wKursie.has(f.epearId)) { log(`   ⚠️ pomijam w scenie: ${f.nazwa} (brak w kursie)`); f.epearId = null; } });
        await api("PUT", "/course", { ...pelny, courseData: JSON.stringify(courseData(P)), status: "MOBILE_INITIALIZED" });
        log("   ✅ scena gotowa – otwórz kurs w aplikacji e-peAR");
      } catch (e) { log("   ❌ scena: " + e.message); bledy.push("scena AR"); }
      krok();
    }
    koniec(kurs, bledy);
  }
  function koniec(kurs, bledy) {
    praca = false;
    $("#pas") && ($("#pas").style.width = "100%");
    const link = kurs ? `${location.origin}/courses_view?id=${encodeURIComponent(kurs.id)}&name=${encodeURIComponent(kurs.title)}` : "";
    $("#c").insertAdjacentHTML("afterbegin", kurs
      ? `<div class="k ${bledy.length ? "" : "ok"}">${bledy.length ? `⚠️ Kurs utworzony, ale ${bledy.length} elementów się nie udało: ${bledy.map(esc).join(", ")}.` : "✅ Gotowe! Kurs jest w e-peAR."}
          <br><a href="${esc(link)}">Otwórz kurs</a> · <a href="${location.origin}/my-courses">Konfiguracja kursów</a></div>`
      : `<div class="k bl">❌ Nie udało się utworzyć kursu: ${esc(bledy[0] || "")}</div>`);
    $("#f").innerHTML = `<button class="g" data-x4>Zamknij</button>`; $("[data-x4]").onclick = zamknij;
    try { window.opener?.postMessage({ typ: "epear-wynik", ok: !!kurs && !bledy.length, kurs: kurs && { id: kurs.id, tytul: kurs.title, link }, bledy }, "*"); } catch {}
  }
})();
