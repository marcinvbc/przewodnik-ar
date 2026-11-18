/*
 * ORKIESTRA – silnik dźwięku i partytura.
 * Wszystkie sekcje grają razem „Odę do radości” (L. van Beethoven, IX Symfonia – domena publiczna),
 * a dyrygent steruje głośnością każdej sekcji osobno (gain). Próbki instrumentów: General MIDI
 * FluidR3 (midi-js-soundfonts, licencja MIT/CC). Gdy się nie wczytają – syntezator zastępczy.
 */
export const SEKCJE = [
  // id, nazwa, soundfont, pozycja na scenie (0..1), skala (perspektywa), ikona, liczba muzyków, głośność bazowa
  { id: "skrzypce", nazwa: "Skrzypce", sf: "violin", x: 0.19, y: 0.72, s: 1.1, ikona: "skrzypce", n: 6, g: 0.9 },
  { id: "altowki", nazwa: "Altówki", sf: "viola", x: 0.39, y: 0.75, s: 1.12, ikona: "altowka", n: 4, g: 0.65 },
  { id: "wiolonczele", nazwa: "Wiolonczele", sf: "cello", x: 0.62, y: 0.73, s: 1.12, ikona: "wiolonczela", n: 4, g: 0.85 },
  { id: "kontrabasy", nazwa: "Kontrabasy", sf: "contrabass", x: 0.83, y: 0.66, s: 1.05, ikona: "kontrabas", n: 3, g: 0.8 },
  { id: "fortepian", nazwa: "Fortepian", sf: "acoustic_grand_piano", x: 0.12, y: 0.47, s: 0.95, ikona: "fortepian", n: 1, g: 0.7 },
  { id: "flety", nazwa: "Flety", sf: "flute", x: 0.37, y: 0.52, s: 0.92, ikona: "flet", n: 3, g: 0.55 },
  { id: "klarnety", nazwa: "Klarnety", sf: "clarinet", x: 0.6, y: 0.49, s: 0.92, ikona: "klarnet", n: 3, g: 0.6 },
  { id: "harfa", nazwa: "Harfa", sf: "orchestral_harp", x: 0.87, y: 0.41, s: 0.92, ikona: "harfa", n: 1, g: 0.75 },
  { id: "waltornie", nazwa: "Waltornie", sf: "french_horn", x: 0.27, y: 0.29, s: 0.78, ikona: "waltornia", n: 3, g: 0.55 },
  { id: "trabki", nazwa: "Trąbki", sf: "trumpet", x: 0.46, y: 0.27, s: 0.78, ikona: "trabka", n: 3, g: 0.5 },
  { id: "kotly", nazwa: "Kotły (bębny)", sf: "timpani", x: 0.65, y: 0.27, s: 0.8, ikona: "kotly", n: 2, g: 0.95 },
  { id: "talerze", nazwa: "Talerze", sf: null, x: 0.83, y: 0.24, s: 0.78, ikona: "talerze", n: 1, g: 0.6 },
];

/* ---------------- partytura: Oda do radości, C-dur, 16 taktów po 4 ćwierćnuty ---------------- */
const MEL = [[64, 1], [64, 1], [65, 1], [67, 1], [67, 1], [65, 1], [64, 1], [62, 1], [60, 1], [60, 1], [62, 1], [64, 1], [64, 1.5], [62, .5], [62, 2],
  [64, 1], [64, 1], [65, 1], [67, 1], [67, 1], [65, 1], [64, 1], [62, 1], [60, 1], [60, 1], [62, 1], [64, 1], [62, 1.5], [60, .5], [60, 2],
  [62, 1], [62, 1], [64, 1], [60, 1], [62, 1], [64, .5], [65, .5], [64, 1], [60, 1], [62, 1], [64, .5], [65, .5], [64, 1], [62, 1], [60, 1], [62, 1], [55, 2],
  [64, 1], [64, 1], [65, 1], [67, 1], [67, 1], [65, 1], [64, 1], [62, 1], [60, 1], [60, 1], [62, 1], [64, 1], [62, 1.5], [60, .5], [60, 2]];
// akord na każde pół taktu: C = C-dur, G = G-dur
const AKORDY = "CC GG CC CG CC GG CC GC GG GC GC CG CC GG CC GC".replace(/ /g, "").split("");
export const TAKTY = 16, MIAR = 4, DLUGOSC = TAKTY * MIAR;
const AK = { C: { pryma: 48, tony: [60, 64, 67], kwinta: 55 }, G: { pryma: 43, tony: [59, 62, 67], kwinta: 50 } };
const SKALA = [0, 2, 4, 5, 7, 9, 11];
function diatonicznie(m, kroki) {     // przesunięcie o stopnie skali C-dur (np. -2 = tercja w dół)
  const okt = Math.floor(m / 12), st = SKALA.indexOf(m % 12);
  if (st < 0) return m;
  const n = st + kroki, o = okt + Math.floor(n / 7);
  return o * 12 + SKALA[((n % 7) + 7) % 7];
}

function partytura() {
  const P = {}; for (const s of SEKCJE) P[s.id] = [];
  const dodaj = (id, t, m, d, v = 1) => P[id].push({ t, m, d, v });
  let t = 0;
  for (const [m, d] of MEL) {
    dodaj("skrzypce", t, m + 12, d, 0.9);
    dodaj("flety", t, m + 24, d, 0.75);
    dodaj("klarnety", t, diatonicznie(m, -2), d, 0.75);
    if (t >= 32) dodaj("trabki", t, m, d, 0.8);
    t += d;
  }
  AKORDY.forEach((a, i) => {
    const t0 = i * 2, A = AK[a], takt = Math.floor(i / 2), poczatek = i % 2 === 0;
    dodaj("altowki", t0, A.tony[1], 2, 0.7);
    dodaj("wiolonczele", t0, A.pryma, 2, 0.85);
    dodaj("kontrabasy", t0, A.pryma - 12, 0.9, 0.9);
    dodaj("waltornie", t0, A.tony[0], 2, 0.6);
    [A.pryma + 12, A.kwinta + 12, A.tony[1] + 12, A.kwinta + 12].forEach((m, k) => dodaj("fortepian", t0 + k * 0.5, m, 0.5, k ? 0.6 : 0.8));
    if (poczatek) [0, 1, 2, 0, 1, 2, 0, 1].forEach((k, j) => dodaj("harfa", t0 + j * 0.25, A.tony[k] + (j > 2 ? 12 : 0) + (j > 5 ? 12 : 0), 1, 0.6));
    if (t0 < 32 && poczatek) dodaj("trabki", t0, 67, 0.75, 0.9);
    dodaj("kotly", t0, A.pryma, 1, poczatek ? 1 : 0.7);
    if (poczatek && takt % 4 === 3) for (let k = 0; k < 8; k++) dodaj("kotly", t0 + 2 + k * 0.125, A.pryma, 0.2, 0.35 + k * 0.06);
    if (poczatek && takt % 4 === 0) dodaj("talerze", t0, 0, 3, 1);
  });
  dodaj("talerze", 62, 0, 3, 0.8);
  return P;
}
export const PARTYTURA = partytura();

/* ---------------- silnik ---------------- */
const NAZWY = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const nazwa = m => NAZWY[m % 12] + (Math.floor(m / 12) - 1);
const SF = "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/";

export class Orkiestra {
  constructor() {
    this.tempo = 96; this.grane = false; this.probki = {}; this.naNute = () => {};
    this.poziom = Object.fromEntries(SEKCJE.map(s => [s.id, 0]));
  }
  async start(postep = () => {}) {
    const ac = this.ac = new (window.AudioContext || window.webkitAudioContext)();
    await ac.resume();
    // pogłos sali koncertowej
    const len = ac.sampleRate * 2.4, imp = ac.createBuffer(2, len, ac.sampleRate);
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
    await this.wczytajProbki(postep);
  }
  async wczytajProbki(postep) {
    window.MIDI = window.MIDI || {}; window.MIDI.Soundfont = window.MIDI.Soundfont || {};
    const lista = SEKCJE.filter(s => s.sf); let gotowe = 0;
    await Promise.all(lista.map(async s => {
      try {
        if (!window.MIDI.Soundfont[s.sf]) await new Promise((ok, err) => {
          const el = document.createElement("script"); el.src = SF + s.sf + "-mp3.js"; el.onload = ok; el.onerror = err; document.head.append(el);
          setTimeout(() => err(new Error("timeout")), 25000);
        });
        const font = window.MIDI.Soundfont[s.sf], nuty = [...new Set(PARTYTURA[s.id].map(e => e.m))], bufory = {};
        await Promise.all(nuty.map(async m => {
          const url = font[nazwa(m)]; if (!url) return;
          const bin = Uint8Array.from(atob(url.split(",")[1]), c => c.charCodeAt(0));
          bufory[m] = await this.ac.decodeAudioData(bin.buffer);
        }));
        if (Object.keys(bufory).length) this.probki[s.id] = bufory;
      } catch (e) { console.warn("instrument", s.id, "– syntezator zastępczy", e?.message || e); }
      postep(++gotowe, lista.length);
    }));
    return Object.keys(this.probki).length;
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
        for (const s of SEKCJE) for (const e of PARTYTURA[s.id]) if (e.t >= od && e.t < doo) {
          const kiedy = this.nastepny + (e.t - od) * sek;
          this.nuta(s.id, e, kiedy, e.d * sek);
          if (this.poziom[s.id] > 0.08) { const opoz = (kiedy - this.ac.currentTime) * 1000; setTimeout(() => this.naNute(s.id, e), Math.max(0, opoz)); }
        }
        this.poz = doo >= DLUGOSC ? 0 : doo; this.nastepny += this.krok * sek;
      }
      this.timer = setTimeout(tick, 40);
    };
    tick();
  }
  stop() { this.grane = false; clearTimeout(this.timer); }
  get takt() { return Math.floor(this.poz / MIAR) + 1; }

  nuta(id, e, t, d) {
    const ac = this.ac, out = this.wyjscia[id], buf = this.probki[id]?.[e.m];
    if (id === "talerze") return this.talerz(t, e.v, out);
    const env = ac.createGain(); env.connect(out);
    const perk = ["fortepian", "harfa", "kotly", "kontrabasy"].includes(id);
    if (buf) {
      const src = ac.createBufferSource(); src.buffer = buf; src.connect(env);
      env.gain.setValueAtTime(e.v, t);
      if (!perk) env.gain.setTargetAtTime(0, t + d * 0.95, 0.07);
      else env.gain.setTargetAtTime(0, t + Math.max(d, 0.4) * 1.6, 0.25);
      src.start(t); src.stop(t + d + 2.5);
      return;
    }
    // syntezator zastępczy
    const f = 440 * Math.pow(2, (e.m - 69) / 12), o = ac.createOscillator(), filtr = ac.createBiquadFilter();
    const typ = { skrzypce: "sawtooth", altowki: "sawtooth", wiolonczele: "sawtooth", kontrabasy: "triangle", flety: "sine", klarnety: "square", trabki: "sawtooth", waltornie: "triangle", fortepian: "triangle", harfa: "triangle", kotly: "sine" }[id] || "sine";
    o.type = typ; o.frequency.setValueAtTime(f, t);
    filtr.type = "lowpass"; filtr.frequency.value = { klarnety: 1800, waltornie: 1200, trabki: 3500, flety: 4000 }[id] || 2600;
    o.connect(filtr); filtr.connect(env);
    if (["skrzypce", "altowki", "wiolonczele", "flety"].includes(id)) { const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 5.5; lg.gain.value = f * 0.006; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + d + 1); }
    if (id === "kotly") o.frequency.exponentialRampToValueAtTime(f * 0.92, t + 0.3);
    const v = e.v * 0.35;
    o.start(t);
    env.gain.setValueAtTime(0.0001, t);
    if (perk) { env.gain.exponentialRampToValueAtTime(v, t + 0.01); env.gain.exponentialRampToValueAtTime(0.0001, t + (id === "kotly" ? 0.9 : 1.4)); o.stop(t + 1.6); }
    else { env.gain.exponentialRampToValueAtTime(v, t + 0.06); env.gain.setValueAtTime(v, t + d * 0.85); env.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.15); o.stop(t + d + 0.3); }
  }
  talerz(t, v, out) {               // talerze: szum przefiltrowany górnoprzepustowo z długim wybrzmieniem
    const ac = this.ac, src = ac.createBufferSource(), hp = ac.createBiquadFilter(), bp = ac.createBiquadFilter(), env = ac.createGain();
    src.buffer = this.szum; hp.type = "highpass"; hp.frequency.value = 5200; bp.type = "peaking"; bp.frequency.value = 8000; bp.gain.value = 6;
    src.connect(hp); hp.connect(bp); bp.connect(env); env.connect(out);
    env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(0.9 * v, t + 0.005); env.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    src.start(t); src.stop(t + 2.3);
  }
}
