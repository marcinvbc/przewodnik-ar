/*
 * Wspólne funkcje Lekcji AR: backend (Supabase albo tryb demo), pliki, kanał na żywo, AI.
 */
const CFG = window.LEKCJE_CONFIG || {};
export const DEMO = !(CFG.supabaseUrl && CFG.supabaseKey);

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
export function nowyKod() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // bez I, O, 0, 1 – łatwo przepisać z tablicy
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), b => A[b % A.length]).join("");
}
export const linkUcznia = kod => new URL(`uczen.html?l=${encodeURIComponent(kod)}`, location.href).href;
export const linkProwadzenia = kod => new URL(`prowadzenie.html?l=${encodeURIComponent(kod)}`, location.href).href;

export function toast(msg, ms = 2600) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div"); t.id = "toast";
    t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#1f2a2e;color:#fff;padding:10px 16px;border-radius:12px;font:600 14px system-ui,sans-serif;z-index:999;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:90vw;text-align:center;transition:opacity .3s";
    document.body.appendChild(t);
  }
  t.textContent = msg; t.style.opacity = 1;
  clearTimeout(t._h); t._h = setTimeout(() => t.style.opacity = 0, ms);
}

/* ======================================================================= IndexedDB (tryb demo) */
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("lekcjeAR", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("pliki");
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function idbPut(k, v) { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction("pliki", "readwrite"); t.objectStore("pliki").put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); }
async function idbGet(k) { const db = await idb(); return new Promise(res => { const q = db.transaction("pliki").objectStore("pliki").get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); }
async function idbDel(k) { const db = await idb(); return new Promise(res => { const t = db.transaction("pliki", "readwrite"); t.objectStore("pliki").delete(k); t.oncomplete = res; t.onerror = res; }); }

const urlCache = new Map();
/** Zamienia adres pliku na taki, który da się wczytać (w trybie demo: blob z IndexedDB). */
export async function resolveUrl(url) {
  if (!url || !url.startsWith("idb:")) return url;
  if (urlCache.has(url)) return urlCache.get(url);
  const blob = await idbGet(url.slice(4));
  if (!blob) throw new Error("Brak pliku w pamięci przeglądarki (tryb demo działa tylko na tym urządzeniu)");
  const u = URL.createObjectURL(blob); urlCache.set(url, u); return u;
}

/* ======================================================================= TRYB DEMO */
function demoBackend() {
  const KEY = "lekcjeAR-demo";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
  const save = l => localStorage.setItem(KEY, JSON.stringify(l));
  const user = { id: "demo", email: "tryb demo" };
  return {
    demo: true,
    auth: { async user() { return user; }, async signIn() { return user; }, async signUp() { return user; }, async signOut() {} },
    lessons: {
      async list() { return load().sort((a, b) => b.zmieniono.localeCompare(a.zmieniono)); },
      async create(tytul) {
        const l = { id: uid(), kod: nowyKod(), tytul, materialy: [], plan: null, utworzono: new Date().toISOString(), zmieniono: new Date().toISOString() };
        save([...load(), l]); return l;
      },
      async get(id) { return load().find(l => l.id === id) || null; },
      async update(id, patch) { const all = load(); const l = all.find(x => x.id === id); Object.assign(l, patch, { zmieniono: new Date().toISOString() }); save(all); return l; },
      async remove(id) {
        const l = load().find(x => x.id === id);
        for (const m of l?.materialy || []) if (m.url?.startsWith("idb:")) await idbDel(m.url.slice(4));
        save(load().filter(x => x.id !== id));
      },
      async byCode(kod) { return load().find(l => l.kod === String(kod).trim().toUpperCase()) || null; },
    },
    files: {
      async upload(lessonId, blob, name) { const k = `${lessonId}/${uid()}-${name}`; await idbPut(k, blob); return { url: "idb:" + k, path: k }; },
      async remove(paths) { for (const p of paths) await idbDel(p); },
    },
    channel(kod, h, me) {
      const bc = new BroadcastChannel("lekcjeAR-" + kod);
      const members = new Map();
      const emitPresence = () => h.onPresence && h.onPresence([...members.values()].map(m => m.me));
      const post = (event, payload) => bc.postMessage({ event, payload, from: me.uid });
      bc.onmessage = ({ data }) => {
        if (data.event === "__obecny") {
          const was = members.has(data.from); members.set(data.from, { me: data.payload, t: Date.now() });
          if (!was) { emitPresence(); post("__obecny", me); }
          return;
        }
        if (data.event === "__wyszedl") { members.delete(data.from); emitPresence(); return; }
        h.onMessage && h.onMessage(data.event, data.payload);
      };
      members.set(me.uid, { me, t: Date.now() });
      const beat = setInterval(() => {
        post("__obecny", me); members.set(me.uid, { me, t: Date.now() });
        let ch = false; for (const [k, v] of members) if (Date.now() - v.t > 9000) { members.delete(k); ch = true; }
        if (ch) emitPresence();
      }, 3000);
      setTimeout(() => { post("__obecny", me); emitPresence(); h.onReady && h.onReady(); }, 50);
      addEventListener("pagehide", () => post("__wyszedl", me));
      return { send: post, close() { clearInterval(beat); post("__wyszedl", me); bc.close(); } };
    },
    ai: { dostepne: false, async plan() { return null; }, async ask() { return null; } },
  };
}

/* ======================================================================= SUPABASE */
async function supabaseBackend() {
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  const sb = createClient(CFG.supabaseUrl, CFG.supabaseKey);
  const me = async () => (await sb.auth.getSession()).data.session?.user || null;
  const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
  return {
    demo: false, sb,
    auth: {
      user: me,
      async signIn(email, password) { ok(await sb.auth.signInWithPassword({ email, password })); return me(); },
      async signUp(email, password) { return ok(await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.href } })); },
      async signOut() { await sb.auth.signOut(); },
    },
    lessons: {
      async list() { return ok(await sb.from("lekcje").select("id,kod,tytul,zmieniono,materialy").order("zmieniono", { ascending: false })); },
      async create(tytul) {
        for (let i = 0; i < 5; i++) {
          const r = await sb.from("lekcje").insert({ kod: nowyKod(), tytul }).select().single();
          if (!r.error) return r.data;
          if (!/duplicate|unique/i.test(r.error.message)) throw new Error(r.error.message);
        }
        throw new Error("Nie udało się wygenerować kodu lekcji");
      },
      async get(id) { return ok(await sb.from("lekcje").select("*").eq("id", id).single()); },
      async update(id, patch) { return ok(await sb.from("lekcje").update({ ...patch, zmieniono: new Date().toISOString() }).eq("id", id).select().single()); },
      async remove(id) {
        const u = await me(); const dir = `${u.id}/${id}`;
        const files = (await sb.storage.from("lekcje").list(dir, { limit: 1000 })).data || [];
        if (files.length) await sb.storage.from("lekcje").remove(files.map(f => `${dir}/${f.name}`));
        ok(await sb.from("lekcje").delete().eq("id", id));
      },
      async byCode(kod) { const d = ok(await sb.rpc("lekcja_po_kodzie", { p_kod: String(kod) })); return (d && d[0]) || null; },
    },
    files: {
      async upload(lessonId, blob, name, contentType) {
        const u = await me();
        const safe = name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-60);
        const path = `${u.id}/${lessonId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${safe}`;
        ok(await sb.storage.from("lekcje").upload(path, blob, { contentType: contentType || blob.type || undefined, upsert: false }));
        return { url: sb.storage.from("lekcje").getPublicUrl(path).data.publicUrl, path };
      },
      async remove(paths) { if (paths.length) await sb.storage.from("lekcje").remove(paths); },
    },
    channel(kod, h, meInfo) {
      const ch = sb.channel("lekcja-" + kod, { config: { broadcast: { self: false }, presence: { key: meInfo.uid } } });
      for (const ev of ["stan", "hej", "odpowiedz", "reakcja"]) ch.on("broadcast", { event: ev }, ({ payload }) => h.onMessage && h.onMessage(ev, payload));
      ch.on("presence", { event: "sync" }, () => h.onPresence && h.onPresence(Object.values(ch.presenceState()).flat()));
      ch.subscribe(async status => {
        if (status === "SUBSCRIBED") { await ch.track(meInfo); h.onReady && h.onReady(); }
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") h.onError && h.onError(status);
      });
      return { send: (event, payload) => ch.send({ type: "broadcast", event, payload }), close: () => sb.removeChannel(ch) };
    },
    ai: {
      dostepne: CFG.aiWlaczone !== false,
      async plan(tytul, materialy) {
        const { data, error } = await sb.functions.invoke("claude", { body: { tryb: "plan", tytul, materialy } });
        if (error || data?.blad) throw new Error(data?.blad || error.message);
        return data.plan;
      },
      async ask(pytanie, kontekst) {
        const { data, error } = await sb.functions.invoke("claude", { body: { tryb: "pytanie", pytanie, kontekst } });
        if (error || data?.blad) throw new Error(data?.blad || error.message);
        return data.odpowiedz;
      },
    },
  };
}

let _b = null;
export function backend() { return _b || (_b = DEMO ? Promise.resolve(demoBackend()) : supabaseBackend()); }
