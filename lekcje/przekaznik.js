/* Przekaźnik dla gier przy stoliku (Mistrz Kanapek, Burgerowa układanka).
   Łączy telefony BEZ konfiguracji: lekki klient MQTT 3.1.1 po WebSocket do publicznego brokera (bez kluczy).
   Przesyłane są tylko: imię gracza, wybór kanapki, sygnał startu i czasy – bez danych osobowych.
   Gdy w konfiguracja.js jest Supabase – gry używają Supabase (wspolne.js), a ten moduł nie jest potrzebny.
   API jak w wspolne.js:  kanal(nazwa, { zdarzenia, onPresence, onMessage, onReady, onError }, ja) → { send(ev, p), close() } */

export const BROKERY = (window.LEKCJE_CONFIG?.przekazniki) || [
  "wss://broker.emqx.io:8084/mqtt",
  "wss://broker.hivemq.com:8884/mqtt",
  "wss://test.mosquitto.org:8081/mqtt",
];
const PREFIKS = "przewodnikAR/gry/v1/";
const enc = new TextEncoder(), dec = new TextDecoder();

/* ---------- kodowanie pakietów MQTT ---------- */
const str = s => { const b = enc.encode(s); return [b.length >> 8, b.length & 255, ...b]; };
function pakiet(typ, tresc) { const dl = []; let n = tresc.length; do { let b = n % 128; n = Math.floor(n / 128); if (n > 0) b |= 128; dl.push(b); } while (n > 0); return new Uint8Array([typ, ...dl, ...tresc]); }
const CONNECT = id => pakiet(0x10, [...str("MQTT"), 4, 0x02, 0, 30, ...str(id)]);
const SUBSCRIBE = (nr, temat) => pakiet(0x82, [nr >> 8, nr & 255, ...str(temat), 0]);
const PUBLISH = (temat, dane) => pakiet(0x30, [...str(temat), ...enc.encode(dane)]);
const PING = new Uint8Array([0xc0, 0]);
function* czytaj(buf) {           // rozbija wiadomość WebSocket na pakiety MQTT
  let i = 0;
  while (i < buf.length) {
    const typ = buf[i]; let mn = 1, dl = 0, j = i + 1, b;
    do { b = buf[j++]; dl += (b & 127) * mn; mn *= 128; } while (b & 128);
    yield { typ, tresc: buf.subarray(j, j + dl) }; i = j + dl;
  }
}

/* ---------- połączenie z brokerem (z przełączaniem na zapasowy i ponawianiem) ---------- */
function polaczenie(temat, onWiadomosc, onStan) {
  let ws = null, nrBrokera = 0, ping = 0, zamkniete = false, proby = 0, gotowe = false; const kolejka = [];
  const id = "pAR" + Math.random().toString(36).slice(2, 12);
  function start() {
    if (zamkniete) return; const url = BROKERY[nrBrokera % BROKERY.length];
    try { ws = new WebSocket(url, "mqtt"); } catch { return ponow(); }
    ws.binaryType = "arraybuffer"; let otwarte = false;
    const limit = setTimeout(() => { if (!gotowe) { try { ws.close(); } catch {} } }, 6000);
    ws.onopen = () => { otwarte = true; ws.send(CONNECT(id)); };
    ws.onmessage = e => {
      for (const p of czytaj(new Uint8Array(e.data))) {
        const t = p.typ >> 4;
        if (t === 2) { if (p.tresc[1] !== 0) { try { ws.close(); } catch {} return; } ws.send(SUBSCRIBE(1, temat)); }
        else if (t === 9) { clearTimeout(limit); gotowe = true; proby = 0; onStan(true, url); while (kolejka.length) ws.send(kolejka.shift()); clearInterval(ping); ping = setInterval(() => { try { ws.send(PING); } catch {} }, 20000); }
        else if (t === 3) { const dt = (p.tresc[0] << 8) | p.tresc[1], qos = (p.typ >> 1) & 3, start = 2 + dt + (qos ? 2 : 0); onWiadomosc(dec.decode(p.tresc.subarray(start))); }
      }
    };
    ws.onclose = () => { clearTimeout(limit); clearInterval(ping); const byl = gotowe; gotowe = false; if (byl) onStan(false); if (!otwarte || !byl) nrBrokera++; ponow(); };
    ws.onerror = () => {};
  }
  function ponow() { if (zamkniete) return; proby++; if (proby === BROKERY.length + 1) onStan(false, null, true); setTimeout(start, Math.min(8000, 400 * proby)); }
  start();
  return {
    wyslij(dane) { const p = PUBLISH(temat, dane); if (gotowe && ws?.readyState === 1) ws.send(p); else { kolejka.push(p); if (kolejka.length > 50) kolejka.shift(); } },
    zamknij() { zamkniete = true; clearInterval(ping); try { ws?.close(); } catch {} },
  };
}

/* ---------- kanał gry z obecnością graczy ---------- */
export function kanal(nazwa, h, ja) {
  const temat = PREFIKS + String(nazwa).replace(/[^A-Za-z0-9_-]/g, "_"), widziani = new Map(), zdarzenia = new Set(h.zdarzenia || []);
  let ostatniaLista = "", gotowy = false;
  const obecni = () => { const t = Date.now(); for (const [k, v] of widziani) if (t - v.t > 10000) widziani.delete(k); return [ja, ...[...widziani.values()].map(v => v.kto)].sort((a, b) => (a.od || 0) - (b.od || 0)); };
  const zglosObecnosc = () => { const l = obecni(), s = l.map(x => x.uid + x.nick).join("|"); if (s !== ostatniaLista) { ostatniaLista = s; h.onPresence?.(l); } };
  const odbierz = tekst => {
    let m; try { m = JSON.parse(tekst); } catch { return; } if (!m || m.od === ja.uid) return;
    if (m.ev === "__jestem") { const nowy = !widziani.has(m.od); widziani.set(m.od, { kto: m.p, t: Date.now() }); zglosObecnosc(); if (nowy) wyslijSur("__jestem", ja); return; }
    if (m.ev === "__wychodze") { widziani.delete(m.od); zglosObecnosc(); return; }
    if (widziani.has(m.od)) widziani.get(m.od).t = Date.now();
    if (!zdarzenia.size || zdarzenia.has(m.ev)) h.onMessage?.(m.ev, m.p, m.od);
  };
  const bc = "BroadcastChannel" in window ? new BroadcastChannel("przekaznik-" + temat) : null;   // ta sama przeglądarka (testy w kartach)
  if (bc) bc.onmessage = e => odbierz(e.data);
  const pol = polaczenie(temat, odbierz, (ok, url, poddaj) => {
    if (ok && !gotowy) { gotowy = true; wyslijSur("__jestem", ja); h.onReady?.(url); }
    else if (ok) wyslijSur("__jestem", ja);
    if (poddaj) h.onError?.("Nie udało się połączyć z przekaźnikiem gier – sprawdź internet.");
  });
  function wyslijSur(ev, p) { const s = JSON.stringify({ ev, p, od: ja.uid, t: Date.now() }); pol.wyslij(s); try { bc?.postMessage(s); } catch {} }
  const serce = setInterval(() => { wyslijSur("__jestem", ja); zglosObecnosc(); }, 3000);
  addEventListener("pagehide", () => wyslijSur("__wychodze", {}));
  // od razu widać siebie; BroadcastChannel działa bez czekania na broker
  setTimeout(() => { h.onPresence?.(obecni()); wyslijSur("__jestem", ja); if (bc && !gotowy) h.onReady?.("lokalny"); }, 0);
  return {
    send(ev, p) { wyslijSur(ev, p); },
    close() { wyslijSur("__wychodze", {}); clearInterval(serce); pol.zamknij(); bc?.close(); },
  };
}

/* ===================================================================================
   STATYSTYKI DLA PANELU ORGANIZATORA
   Gry zgłaszają: otwarcie, start, dołączenie do grupy, wynik oraz co 20 s „jestem” (kto gra teraz).
   Bez lokalizacji. Panel (panel.html) słucha tego samego tematu i zapisuje historię u siebie.
   Temat zawiera kod organizatora z konfiguracja.js (kodStatystyk) – zmień go, by mieć „swoje” statystyki. */
let _stat = null, _bcStat = null, _serceStat = 0, _obecnosc = null;
const urzadzenie = (() => { try { let u = localStorage.getItem("pAR-urzadzenie"); if (!u) { u = Math.random().toString(36).slice(2, 10); localStorage.setItem("pAR-urzadzenie", u); } return u; } catch { return "x" + Math.random().toString(36).slice(2, 8); } })();
export const tematStatystyk = () => PREFIKS + "stat/" + String(window.LEKCJE_CONFIG?.kodStatystyk || "publiczne").replace(/[^A-Za-z0-9_-]/g, "_");
function polStat() {
  if (_stat) return _stat;
  if (window.LEKCJE_CONFIG?.statystyki === false) return (_stat = { wyslij() {} });
  _stat = polaczenie(tematStatystyk(), () => {}, () => {});
  try { _bcStat = new BroadcastChannel("przekaznik-" + tematStatystyk()); } catch {}
  return _stat;
}
/** zglos("ukladanka", "wynik", { gracz: "Ola", grupa: "R1-T4", czas: 12.3, ... }) */
export function zglos(gra, zdarzenie, dane = {}) {
  const s = JSON.stringify({ ev: "stat", od: urzadzenie, t: Date.now(), p: { gra, zdarzenie, urzadzenie, ...dane } });
  polStat().wyslij(s); try { _bcStat?.postMessage(s); } catch {}
}
/** obecnosc("ukladanka", { gracz, grupa }) – wywołuj przy zmianie; null = koniec gry */
export function obecnosc(gra, info) {
  _obecnosc = info ? { gra, ...info } : null; clearInterval(_serceStat);
  if (!_obecnosc) { zglos(gra, "wyjscie", {}); return; }
  const tik = () => _obecnosc && zglos(_obecnosc.gra, "jestem", _obecnosc); tik(); _serceStat = setInterval(tik, 20000);
}
addEventListener("pagehide", () => { if (_obecnosc) zglos(_obecnosc.gra, "wyjscie", {}); });
/** dla panelu: nasłuch zgłoszeń */
export function sluchajStatystyk(onZgloszenie, onStan) {
  const odb = tekst => { let m; try { m = JSON.parse(tekst); } catch { return; } if (m?.ev === "stat" && m.p) onZgloszenie({ ...m.p, t: m.t }); };
  const pol = polaczenie(tematStatystyk(), odb, (ok, url, poddaj) => onStan?.(ok, url, poddaj));
  let bc = null; try { bc = new BroadcastChannel("przekaznik-" + tematStatystyk()); bc.onmessage = e => odb(e.data); } catch {}
  return { zamknij() { pol.zamknij(); bc?.close(); } };
}
