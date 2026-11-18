/*
 * ORKIESTRA – silnik dźwięku, utwory i aranżacje (klasyczna i rockowa).
 * Utwory to tematy z domeny publicznej (Beethoven, Grieg, Mozart, Pachelbel), zapisane uproszczonym
 * zapisem nutowym; głosy towarzyszące generujemy z akordów. Dyrygent steruje głośnością każdej sekcji.
 * Próbki instrumentów: General MIDI FluidR3 (midi-js-soundfonts); gdy się nie wczytają – syntezator zastępczy.
 */

/* ---------------- sekcje: pozycja na scenie w każdym stylu (null = sekcja nie gra w tym stylu) ---------------- */
export const SEKCJE = [
  { id: "skrzypce", nazwa: "Skrzypce", sf: "violin", ikona: "skrzypce", n: 6, g: 0.9, klasyka: [0.19, 0.72, 1.1], rock: [0.13, 0.72, 1.05] },
  { id: "altowki", nazwa: "Altówki", sf: "viola", ikona: "altowka", n: 4, g: 0.65, klasyka: [0.39, 0.75, 1.12], rock: null },
  { id: "wiolonczele", nazwa: "Wiolonczele", sf: "cello", ikona: "wiolonczela", n: 4, g: 0.85, klasyka: [0.62, 0.73, 1.12], rock: [0.87, 0.72, 1.05] },
  { id: "kontrabasy", nazwa: "Kontrabasy", sf: "contrabass", ikona: "kontrabas", n: 3, g: 0.8, klasyka: [0.83, 0.66, 1.05], rock: null },
  { id: "gitara", nazwa: "Gitara elektryczna", sf: "overdriven_guitar", ikona: "gitara", n: 1, g: 0.75, klasyka: null, rock: [0.37, 0.72, 1.1] },
  { id: "bas", nazwa: "Gitara basowa", sf: "electric_bass_finger", ikona: "bas", n: 1, g: 0.95, klasyka: null, rock: [0.63, 0.71, 1.1] },
  { id: "fortepian", nazwa: "Fortepian", sf: "acoustic_grand_piano", ikona: "fortepian", n: 1, g: 0.7, klasyka: [0.12, 0.47, 0.95], rock: [0.12, 0.47, 0.95] },
  { id: "flety", nazwa: "Flety", sf: "flute", ikona: "flet", n: 3, g: 0.55, klasyka: [0.37, 0.52, 0.92], rock: [0.37, 0.52, 0.92] },
  { id: "klarnety", nazwa: "Klarnety", sf: "clarinet", ikona: "klarnet", n: 3, g: 0.6, klasyka: [0.6, 0.49, 0.92], rock: [0.6, 0.49, 0.92] },
  { id: "harfa", nazwa: "Harfa", sf: "orchestral_harp", ikona: "harfa", n: 1, g: 0.75, klasyka: [0.87, 0.41, 0.92], rock: null },
  { id: "perkusja", nazwa: "Perkusja", sf: null, ikona: "perkusja", n: 1, g: 0.85, klasyka: null, rock: [0.85, 0.43, 0.95] },
  { id: "waltornie", nazwa: "Waltornie", sf: "french_horn", ikona: "waltornia", n: 3, g: 0.55, klasyka: [0.27, 0.29, 0.78], rock: [0.27, 0.29, 0.78] },
  { id: "trabki", nazwa: "Trąbki", sf: "trumpet", ikona: "trabka", n: 3, g: 0.5, klasyka: [0.46, 0.27, 0.78], rock: [0.46, 0.27, 0.78] },
  { id: "kotly", nazwa: "Kotły (bębny)", sf: "timpani", ikona: "kotly", n: 2, g: 0.95, klasyka: [0.65, 0.27, 0.8], rock: [0.65, 0.27, 0.8] },
  { id: "talerze", nazwa: "Talerze", sf: null, ikona: "talerze", n: 1, g: 0.6, klasyka: [0.83, 0.24, 0.78], rock: null },
];
export const sekcjeStylu = styl => SEKCJE.filter(s => s[styl]);

/* ---------------- utwory: melodia [nuta MIDI | null = pauza, długość w ćwierćnutach], akordy co pół taktu ---------------- */
const r = d => [null, d];
export const UTWORY = [
  { id: "oda", nazwa: "Oda do radości", autor: "L. van Beethoven", tempo: 96, akordy: "C C G G C C C G C C G G C C G C G G G C G C C G C C G G C C G C",
    mel: [[64, 1], [64, 1], [65, 1], [67, 1], [67, 1], [65, 1], [64, 1], [62, 1], [60, 1], [60, 1], [62, 1], [64, 1], [64, 1.5], [62, .5], [62, 2],
      [64, 1], [64, 1], [65, 1], [67, 1], [67, 1], [65, 1], [64, 1], [62, 1], [60, 1], [60, 1], [62, 1], [64, 1], [62, 1.5], [60, .5], [60, 2],
      [62, 1], [62, 1], [64, 1], [60, 1], [62, 1], [64, .5], [65, .5], [64, 1], [60, 1], [62, 1], [64, .5], [65, .5], [64, 1], [62, 1], [60, 1], [62, 1], [55, 2],
      [64, 1], [64, 1], [65, 1], [67, 1], [67, 1], [65, 1], [64, 1], [62, 1], [60, 1], [60, 1], [62, 1], [64, 1], [62, 1.5], [60, .5], [60, 2]] },
  { id: "grota", nazwa: "W grocie Króla Gór", autor: "E. Grieg", tempo: 100, akordy: "Am Am E Bb Am Am C C Am Am E Bb Am Am C Am",
    mel: [[57, .5], [59, .5], [60, .5], [62, .5], [64, .5], [60, .5], [64, 1], [63, .5], [59, .5], [63, 1], [62, .5], [58, .5], [62, 1],
      [57, .5], [59, .5], [60, .5], [62, .5], [64, .5], [60, .5], [64, .5], [69, .5], [67, .5], [64, .5], [60, .5], [64, .5], [67, 2],
      [57, .5], [59, .5], [60, .5], [62, .5], [64, .5], [60, .5], [64, 1], [63, .5], [59, .5], [63, 1], [62, .5], [58, .5], [62, 1],
      [57, .5], [59, .5], [60, .5], [62, .5], [64, .5], [60, .5], [64, .5], [69, .5], [67, .5], [64, .5], [60, .5], [64, .5], [69, 2]] },
  { id: "nachtmusik", nazwa: "Eine kleine Nachtmusik", autor: "W. A. Mozart", tempo: 116, akordy: "G G G G D D D D G G G G D D G G",
    mel: [[67, 1], r(.5), [62, .5], [67, 1], r(.5), [62, .5], [67, .5], [62, .5], [67, .5], [71, .5], [74, 2],
      [72, 1], r(.5), [69, .5], [72, 1], r(.5), [69, .5], [72, .5], [69, .5], [66, .5], [69, .5], [62, 2],
      [67, 1], r(.5), [62, .5], [67, 1], r(.5), [62, .5], [67, .5], [62, .5], [67, .5], [71, .5], [74, 2],
      [72, 1], r(.5), [69, .5], [66, 1], r(.5), [62, .5], [67, 1], [67, 1], [67, 2]] },
  { id: "kanon", nazwa: "Kanon D-dur", autor: "J. Pachelbel", tempo: 72, akordy: "D A Bm F#m G D G A D A Bm F#m G D G A",
    mel: [[66, 2], [64, 2], [62, 2], [61, 2], [59, 2], [57, 2], [59, 2], [61, 2],
      [62, 1], [61, 1], [59, 1], [57, 1], [55, 1], [54, 1], [55, 1], [52, 1], [50, 1], [54, 1], [57, 1], [55, 1], [54, 1], [50, 1], [54, 1], [52, 1]] },
  { id: "piata", nazwa: "V Symfonia – motyw losu", autor: "L. van Beethoven", tempo: 108, akordy: "Cm Cm G G Ab Ab Cm Cm Cm Cm G G Ab G Cm Cm",
    mel: [r(.5), [67, .5], [67, .5], [67, .5], [63, 2], r(.5), [65, .5], [65, .5], [65, .5], [62, 2], r(.5), [68, .5], [68, .5], [68, .5], [67, 2], r(.5), [63, .5], [63, .5], [63, .5], [60, 2],
      r(.5), [67, .5], [67, .5], [67, .5], [63, 2], r(.5), [65, .5], [65, .5], [65, .5], [62, 2], r(.5), [68, .5], [68, .5], [68, .5], [67, 1], [65, 1], [63, 2], [60, 2]] },
];

/* ---------------- akordy ---------------- */
const NUTA = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function akord(nazwa) {
  let root = NUTA[nazwa[0]], i = 1;
  if (nazwa[1] === "#") { root++; i++; } else if (nazwa[1] === "b") { root--; i++; }
  root = (root + 12) % 12;
  const moll = nazwa.slice(i).startsWith("m");
  let pryma = 36 + root; if (pryma < 40) pryma += 12;           // bas: E2..D#3
  let r4 = 57 + ((root - 9 + 12) % 12);                        // prima w okolicy A3..G#4
  const tony = [r4, r4 + (moll ? 3 : 4), r4 + 7];
  return { pryma, kwinta: pryma + 7, tony, klasy: tony.map(t => t % 12) };
}
function podMelodia(m, A, min = 3) {   // najwyższy dźwięk akordu co najmniej o tercję małą pod melodią – głos drugi
  for (let t = m - min; t > m - 14; t--) if (A.klasy.includes(t % 12)) return t;
  return m - 12;
}

/* ---------------- aranżacja ---------------- */
export function partytura(utwor, styl) {
  const P = {}; for (const s of SEKCJE) P[s.id] = [];
  const dodaj = (id, t, m, d, v = 1) => P[id].push({ t, m, d, v });
  const akordy = utwor.akordy.split(/\s+/), dlugosc = akordy.length * 2, rock = styl === "rock";
  const akordW = t => akord(akordy[Math.min(akordy.length - 1, Math.floor(t / 2))]);
  let t = 0;
  for (const [m, d] of utwor.mel) {
    if (m != null) {
      const A = akordW(t);
      dodaj("skrzypce", t, m + 12, d, 0.9);
      dodaj("flety", t, m + 24, d, 0.75);
      dodaj("klarnety", t, podMelodia(m, A), d, 0.75);
      if (t >= dlugosc / 2) dodaj("trabki", t, m, d, 0.8);
      if (rock) dodaj("gitara", t, m, d, 0.9);
    }
    t += d;
  }
  akordy.forEach((nazwa, i) => {
    const t0 = i * 2, A = akord(nazwa), takt = Math.floor(i / 2), poczatek = i % 2 === 0;
    dodaj("altowki", t0, A.tony[1], 2, 0.7);
    dodaj("wiolonczele", t0, A.pryma, 2, 0.85);
    dodaj("kontrabasy", t0, A.pryma - 12, 0.9, 0.9);
    dodaj("waltornie", t0, A.tony[0], 2, 0.6);
    const arp = [A.pryma + 12, A.kwinta + 12, A.tony[1] + 12, A.kwinta + 12];
    if (rock) for (let k = 0; k < 4; k++) A.tony.forEach(n => dodaj("fortepian", t0 + k * 0.5, n + 12, 0.45, k % 2 ? 0.5 : 0.7));
    else arp.forEach((m, k) => dodaj("fortepian", t0 + k * 0.5, m, 0.5, k ? 0.6 : 0.8));
    if (poczatek) [0, 1, 2, 0, 1, 2, 0, 1].forEach((k, j) => dodaj("harfa", t0 + j * 0.25, A.tony[k] + (j > 2 ? 12 : 0) + (j > 5 ? 12 : 0), 1, 0.6));
    if (t0 < dlugosc / 2 && poczatek) dodaj("trabki", t0, A.tony[2], 0.75, 0.9);
    dodaj("kotly", t0, A.pryma, 1, poczatek ? 1 : 0.7);
    if (poczatek && takt % 4 === 3) for (let k = 0; k < 8; k++) dodaj("kotly", t0 + 2 + k * 0.125, A.pryma, 0.2, 0.35 + k * 0.06);
    if (poczatek && takt % 4 === 0) dodaj("talerze", t0, 0, 3, 1);
    if (rock) {
      for (let k = 0; k < 4; k++) dodaj("bas", t0 + k * 0.5, A.pryma - 12 + (k === 3 ? 12 : 0), 0.45, k ? 0.75 : 0.95);   // ósemki na prymie
      // perkusja: 36 stopa, 38 werbel, 42 hi-hat, 49 crash
      for (let k = 0; k < 4; k++) dodaj("perkusja", t0 + k * 0.5, 42, 0.25, k % 2 ? 0.45 : 0.7);
      if (poczatek) {
        dodaj("perkusja", t0, 36, 0.5, 1); dodaj("perkusja", t0 + 1, 38, 0.5, 0.9);
        if (takt % 4 === 0) dodaj("perkusja", t0, 49, 2, 0.9);
      } else {
        dodaj("perkusja", t0, 36, 0.5, 1); dodaj("perkusja", t0 + 0.5, 36, 0.5, 0.8);
        if (takt % 4 === 3) [0, .25, .5, .75, 1, 1.25, 1.5, 1.75].slice(4).forEach((o, k) => dodaj("perkusja", t0 + 1 + (o - 1), 38, 0.25, 0.6 + k * 0.1));
        else dodaj("perkusja", t0 + 1, 38, 0.5, 0.9);
      }
    }
  });
  if (!rock) dodaj("talerze", dlugosc - 2, 0, 3, 0.8);
  for (const k in P) P[k].sort((a, b) => a.t - b.t);
  return { P, dlugosc };
}

/* ---------------- silnik ---------------- */
const NAZWY = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const nazwa = m => NAZWY[m % 12] + (Math.floor(m / 12) - 1);
const SF = "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/";

export class Orkiestra {
  constructor() {
    this.tempo = 96; this.grane = false; this.probki = {}; this.naNute = () => {};
    this.poziom = Object.fromEntries(SEKCJE.map(s => [s.id, 0]));
    this.utwor = UTWORY[0]; this.styl = "klasyka";
    ({ P: this.P, dlugosc: this.dlugosc } = partytura(this.utwor, this.styl));
  }
  async start(postep = () => {}) {
    const ac = this.ac = new (window.AudioContext || window.webkitAudioContext)();
    await ac.resume();
    const len = ac.sampleRate * 2.4, imp = ac.createBuffer(2, len, ac.sampleRate);   // pogłos sali koncertowej
    for (let c = 0; c < 2; c++) { const d = imp.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    this.poglos = ac.createConvolver(); this.poglos.buffer = imp;
    const mokry = ac.createGain(); mokry.gain.value = 0.3;
    this.kompresor = ac.createDynamicsCompressor(); this.kompresor.threshold.value = -16; this.kompresor.ratio.value = 4;
    this.master = ac.createGain(); this.master.gain.value = 0.9;
    this.master.connect(this.kompresor); this.master.connect(this.poglos); this.poglos.connect(mokry); mokry.connect(this.kompresor);
    this.kompresor.connect(ac.destination);
    this.wyjscia = {};
    for (const s of SEKCJE) { const g = ac.createGain(); g.gain.value = 0; g.connect(this.master); this.wyjscia[s.id] = g; }
    this.szum = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const sz = this.szum.getChannelData(0); for (let i = 0; i < sz.length; i++) sz[i] = Math.random() * 2 - 1;
    // przester do gitary z syntezatora zastępczego
    this.przester = new Float32Array(1024).map((_, i) => { const x = i / 512 - 1; return Math.tanh(x * 6); });
    await this.wczytajProbki(postep);
  }
  /** wczytuje brakujące instrumenty i nuty dla bieżącego utworu i stylu */
  async wczytajProbki(postep = () => {}) {
    window.MIDI = window.MIDI || {}; window.MIDI.Soundfont = window.MIDI.Soundfont || {};
    const lista = SEKCJE.filter(s => s.sf && s[this.styl] && this.P[s.id].length); let gotowe = 0;
    await Promise.all(lista.map(async s => {
      try {
        if (!window.MIDI.Soundfont[s.sf]) {
          this._ladowane ??= {};
          this._ladowane[s.sf] ??= new Promise((ok, err) => {
            const el = document.createElement("script"); el.src = SF + s.sf + "-mp3.js"; el.onload = ok; el.onerror = err; document.head.append(el);
            setTimeout(() => err(new Error("timeout")), 25000);
          });
          await this._ladowane[s.sf];
        }
        const font = window.MIDI.Soundfont[s.sf], bufory = this.probki[s.id] || {};
        const nuty = [...new Set(this.P[s.id].map(e => e.m))].filter(m => !bufory[m]);
        await Promise.all(nuty.map(async m => {
          const url = font[nazwa(m)]; if (!url) return;
          const bin = Uint8Array.from(atob(url.split(",")[1]), c => c.charCodeAt(0));
          bufory[m] = await this.ac.decodeAudioData(bin.buffer);
        }));
        if (Object.keys(bufory).length) this.probki[s.id] = bufory;
      } catch (e) { console.warn("instrument", s.id, "– syntezator zastępczy", e?.message || e); }
      postep(++gotowe, lista.length);
    }));
  }
  async ustawUtwor(utwor, styl, postep) {
    const gral = this.grane; this.stop();
    this.utwor = utwor; this.styl = styl;
    ({ P: this.P, dlugosc: this.dlugosc } = partytura(utwor, styl));
    this.tempo = Math.round(utwor.tempo * (styl === "rock" ? 1.25 : 1));
    if (this.ac) await this.wczytajProbki(postep);
    if (gral) this.graj();
  }
  ustawPoziom(id, v) {               // 0..1 – sterowane przez dyrygenta
    this.poziom[id] = v;
    const s = SEKCJE.find(x => x.id === id), g = this.wyjscia?.[id];
    if (g) g.gain.setTargetAtTime(v * v * s.g * 1.4, this.ac.currentTime, 0.08);
  }
  graj() {
    if (this.grane) return; this.grane = true;
    this.poz = 0; this.nastepny = this.ac.currentTime + 0.15; this.krok = 0.25;
    const tick = () => {
      if (!this.grane) return;
      const sek = 60 / this.tempo;
      while (this.nastepny < this.ac.currentTime + 0.2) {
        const od = this.poz, doo = this.poz + this.krok;
        for (const s of SEKCJE) for (const e of this.P[s.id]) {
          if (e.t >= doo) break;
          if (e.t < od || e.m == null) continue;
          const kiedy = this.nastepny + (e.t - od) * sek;
          this.nuta(s.id, e, kiedy, e.d * sek);
          if (this.poziom[s.id] > 0.08) setTimeout(() => this.naNute(s.id, e), Math.max(0, (kiedy - this.ac.currentTime) * 1000));
        }
        this.poz = doo >= this.dlugosc ? 0 : doo; this.nastepny += this.krok * sek;
      }
      this.timer = setTimeout(tick, 40);
    };
    tick();
  }
  stop() { this.grane = false; clearTimeout(this.timer); }
  get takt() { return Math.floor((this.poz || 0) / 4) + 1; }
  get takty() { return this.dlugosc / 4; }

  nuta(id, e, t, d) {
    const ac = this.ac, out = this.wyjscia[id], buf = this.probki[id]?.[e.m];
    if (id === "talerze") return this.talerz(t, e.v, out);
    if (id === "perkusja") return this.beben(e.m, t, e.v, out);
    const env = ac.createGain(); env.connect(out);
    const perk = ["fortepian", "harfa", "kotly", "kontrabasy", "bas"].includes(id);
    if (buf) {
      const src = ac.createBufferSource(); src.buffer = buf; src.connect(env);
      env.gain.setValueAtTime(e.v, t);
      if (!perk) env.gain.setTargetAtTime(0, t + d * 0.95, 0.07);
      else env.gain.setTargetAtTime(0, t + Math.max(d, 0.4) * (id === "bas" ? 1 : 1.6), id === "bas" ? 0.08 : 0.25);
      src.start(t); src.stop(t + d + 2.5);
      return;
    }
    // syntezator zastępczy
    const f = 440 * Math.pow(2, (e.m - 69) / 12), o = ac.createOscillator(), filtr = ac.createBiquadFilter();
    const typ = { skrzypce: "sawtooth", altowki: "sawtooth", wiolonczele: "sawtooth", kontrabasy: "triangle", flety: "sine", klarnety: "square", trabki: "sawtooth", waltornie: "triangle", fortepian: "triangle", harfa: "triangle", kotly: "sine", gitara: "sawtooth", bas: "sawtooth" }[id] || "sine";
    o.type = typ; o.frequency.setValueAtTime(f, t);
    filtr.type = "lowpass"; filtr.frequency.value = { klarnety: 1800, waltornie: 1200, trabki: 3500, flety: 4000, gitara: 3200, bas: 700 }[id] || 2600;
    if (id === "gitara") { const ws = ac.createWaveShaper(); ws.curve = this.przester; o.connect(ws); ws.connect(filtr); } else o.connect(filtr);
    filtr.connect(env);
    if (["skrzypce", "altowki", "wiolonczele", "flety", "gitara"].includes(id)) { const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 5.5; lg.gain.value = f * 0.006; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + d + 1); }
    if (id === "kotly") o.frequency.exponentialRampToValueAtTime(f * 0.92, t + 0.3);
    const v = e.v * (id === "gitara" ? 0.22 : 0.35);
    o.start(t);
    env.gain.setValueAtTime(0.0001, t);
    if (perk) { env.gain.exponentialRampToValueAtTime(v, t + 0.01); env.gain.exponentialRampToValueAtTime(0.0001, t + (id === "kotly" ? 0.9 : id === "bas" ? Math.max(0.25, d) : 1.4)); o.stop(t + 1.6); }
    else { env.gain.exponentialRampToValueAtTime(v, t + 0.04); env.gain.setValueAtTime(v, t + d * 0.85); env.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.15); o.stop(t + d + 0.3); }
  }
  talerz(t, v, out, dl = 2.2) {     // szum przefiltrowany górnoprzepustowo z długim wybrzmieniem
    const ac = this.ac, src = ac.createBufferSource(), hp = ac.createBiquadFilter(), bp = ac.createBiquadFilter(), env = ac.createGain();
    src.buffer = this.szum; hp.type = "highpass"; hp.frequency.value = 5200; bp.type = "peaking"; bp.frequency.value = 8000; bp.gain.value = 6;
    src.connect(hp); hp.connect(bp); bp.connect(env); env.connect(out);
    env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(0.9 * v, t + 0.005); env.gain.exponentialRampToValueAtTime(0.0001, t + dl);
    src.start(t); src.stop(t + dl + 0.1);
  }
  beben(m, t, v, out) {              // zestaw perkusyjny z syntezy: stopa, werbel, hi-hat, crash
    const ac = this.ac;
    if (m === 49) return this.talerz(t, v * 0.8, out, 1.6);
    if (m === 36) {
      const o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(out);
      o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      g.gain.setValueAtTime(1.3 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35); o.start(t); o.stop(t + 0.4); return;
    }
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); src.buffer = this.szum;
    src.connect(f); f.connect(g); g.connect(out);
    if (m === 38) {
      f.type = "bandpass"; f.frequency.value = 1800; f.Q.value = 0.7;
      const o = ac.createOscillator(), og = ac.createGain(); o.frequency.value = 190; o.connect(og); og.connect(out);
      og.gain.setValueAtTime(0.5 * v, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1); o.start(t); o.stop(t + 0.12);
      g.gain.setValueAtTime(0.9 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2); src.start(t); src.stop(t + 0.22);
    } else {
      f.type = "highpass"; f.frequency.value = 7500;
      g.gain.setValueAtTime(0.35 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); src.start(t); src.stop(t + 0.06);
    }
  }
}
