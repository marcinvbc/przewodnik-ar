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
  window.__pomocnikEpear = { pokaz() { if (!host.isConnected) document.body.appendChild(host); }, wczytaj(P) { przygotuj(P, "plik"); } };
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
      <input type="file" accept=".zip" id="plik"></div>`, `<button data-x2>Zamknij</button>`);
    $("[data-x2]").onclick = zamknij;
    $("#plik").onchange = async e => { try { przygotuj(await czytajZip(e.target.files[0]), "plik"); } catch (err) { alertKarta(err.message); } };
    if (window.opener) try { window.opener.postMessage({ typ: "epear-gotowy" }, "*"); } catch {}
  }
  function alertKarta(t) { $("#c").insertAdjacentHTML("beforeend", `<div class="k bl">❌ ${esc(t)}</div>`); }
  addEventListener("message", e => {
    if (e.data?.typ !== "epear-paczka" || praca) return;
    if (!ZAUFANE.some(r => r.test(e.origin))) { alertKarta(`Odrzucono paczkę z nieznanej strony: ${e.origin}`); return; }
    przygotuj(e.data.paczka, e.origin);
  });

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
        <label><input type="checkbox" id="publ"> kurs publiczny (widoczny dla wszystkich w katalogu „Kursy”)</label></div>
      <div class="m">Nic nie zostanie wysłane, dopóki nie klikniesz „Utwórz kurs”. Pliki trafią też do Twoich „Zasobów”.</div>`,
      `<button data-anuluj>Anuluj</button><button class="g" data-start ${kategorie.length ? "" : "disabled"}>Utwórz kurs w e-peAR</button>`);
    $("[data-anuluj]").onclick = zamknij;
    $("[data-start]").onclick = () => wyslij(P, { kategoria: $("#kat").value, galeria: $("#gal").checked, quiz: $("#qz").checked, publiczny: $("#publ").checked });
  }

  /* ------------------------------------------------------------ wysyłanie */
  async function wyslij(P, o) {
    praca = true;
    ekran(`<div class="pasek"><div id="pas"></div></div><div class="m">e-peAR przetwarza każdy plik na serwerze – przy dużych modelach 3D może to trwać 1–2 minuty na plik. Nie zamykaj tej karty.</div><div class="log" id="log"></div>`, `<button data-x3 disabled>Zamknij</button>`);
    const log = t => { const l = $("#log"); l.textContent += t + "\n"; l.scrollTop = l.scrollHeight; };
    const kroki = 1 + P.pliki.length + (o.galeria ? P.galeria.length : 0) + (o.quiz ? 1 + P.quiz.pytania.length : 0);
    let zrobione = 0; const krok = () => { $("#pas").style.width = Math.round(++zrobione / kroki * 100) + "%"; };
    const bledy = [];
    let kurs = null;
    try {
      log("➕ Tworzę kurs…");
      kurs = await api("POST", "/course", {
        title: P.kurs.tytul.slice(0, 200), shortDescription: P.kurs.krotkiOpis.slice(0, 250), description: P.kurs.opisHtml,
        categories: [{ id: o.kategoria }], duration: +P.kurs.czas || 45, open: !!o.publiczny, courseFiles: [], status: "WEB_INITIALIZED",
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
