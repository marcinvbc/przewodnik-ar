/* Lekcje gitary basowej. s: struna (0=E … 3=G), f: próg (0 = pusta struna).
   Część „kroki” – zagraj wskazany dźwięk we własnym tempie. Część „rytm” – graj z metronomem na każde uderzenie.
   Ćwiczenia są własne (bez cudzych utworów). */
const K = (s, f, opis) => ({ s, f, opis });
export const LEKCJE = [
  { id: "struny", tytul: "Poznaj struny", ikona: "1️⃣", cel: "Nazwy czterech strun i szarpanie palcami",
    wstep: "Bas ma 4 struny: <b>E A D G</b>. Najgrubsza, najniższa – <b>E</b> – jest u góry, najbliżej twarzy. Szarp prawą dłonią nad przetwornikiem, przeciągając palec w dół przez strunę.",
    czesci: [{ typ: "kroki", kroki: [
      K(0, 0, "Pusta struna E – najgrubsza, u góry. Szarpnij ją."), K(1, 0, "Struna A – druga od góry."), K(2, 0, "Struna D – trzecia."), K(3, 0, "Struna G – najcieńsza, na dole."),
      K(3, 0, "Teraz w drugą stronę: G…"), K(2, 0, "…D…"), K(1, 0, "…A…"), K(0, 0, "…i E. Zapamiętaj: E A D G – od góry."),
      K(1, 0, "Sprawdź się: struna A."), K(3, 0, "Struna G."), K(0, 0, "Struna E."), K(2, 0, "Struna D."),
    ] }] },
  { id: "progi", tytul: "Pierwsze progi", ikona: "2️⃣", cel: "Dociskanie strun lewą dłonią – zasada „jeden palec na jeden próg”",
    wstep: "Lewą dłonią dociskasz strunę <b>tuż przed metalowym progiem</b> (w zielonym kółku). Każdy próg to pół tonu wyżej. Palec 1 → próg 1, palec 2 → próg 2 i tak dalej.",
    czesci: [{ typ: "kroki", kroki: [
      K(0, 0, "E – pusta struna."), K(0, 1, "F – próg 1 na strunie E (palec wskazujący)."), K(0, 3, "G – próg 3 (palec serdeczny)."), K(0, 5, "A – próg 5 (wysuń dłoń o dwa progi)."),
      K(1, 0, "A – pusta struna A. To ten sam dźwięk co E na 5. progu – posłuchaj!"), K(1, 2, "H – próg 2 na strunie A."), K(1, 3, "C – próg 3."), K(1, 5, "D – próg 5."),
      K(2, 0, "D – pusta struna D. Brzmi jak A5 – to sposób na strojenie basu!"), K(2, 2, "E – próg 2 na strunie D (oktawa wyżej niż pusta E)."),
    ] }] },
  { id: "rytm", tytul: "Rytm z metronomem", ikona: "3️⃣", cel: "Równe ćwierćnuty – fundament gry na basie",
    wstep: "Basista trzyma rytm zespołu. Słuchaj metronomu: po 4 kliknięciach odliczania graj <b>na każde kliknięcie</b>. Liczy się trafienie w czas.",
    czesci: [{ typ: "rytm", bpm: 72, nuty: [...Array(8).fill([0, 0]), ...Array(8).fill([1, 0])], opis: "8× pusta E, potem 8× pusta A – równo z metronomem" }] },
  { id: "gama", tytul: "Gama C-dur", ikona: "4️⃣", cel: "Pierwsza gama w jednej pozycji",
    wstep: "Gama C-dur: <b>C D E F G A H C</b>. Zaczyna się na strunie A, próg 3. Dłoń zostaje w jednym miejscu – palce sięgają kolejnych progów.",
    czesci: [{ typ: "kroki", kroki: [
      K(1, 3, "C – struna A, próg 3."), K(1, 5, "D – struna A, próg 5."), K(2, 2, "E – struna D, próg 2."), K(2, 3, "F – struna D, próg 3."),
      K(2, 5, "G – struna D, próg 5."), K(3, 2, "A – struna G, próg 2."), K(3, 4, "H – struna G, próg 4."), K(3, 5, "C – struna G, próg 5. Oktawa!"),
      K(3, 4, "W dół: H"), K(3, 2, "A"), K(2, 5, "G"), K(2, 3, "F"), K(2, 2, "E"), K(1, 5, "D"), K(1, 3, "C – koniec gamy."),
    ] }] },
  { id: "groove", tytul: "Pierwszy groove", ikona: "5️⃣", cel: "Pryma – kwinta – oktawa: najczęstszy wzór basowy",
    wstep: "Wzór <b>pryma–kwinta–oktawa</b> pasuje do większości piosenek. Najpierw poznasz pozycje, potem zagrasz je w rytmie.",
    czesci: [
      { typ: "kroki", kroki: [
        K(0, 0, "Pryma: E (pusta E)."), K(1, 2, "Kwinta: H (A, próg 2)."), K(2, 2, "Oktawa: E (D, próg 2)."), K(1, 2, "Kwinta z powrotem: H."),
        K(1, 0, "Ten sam kształt od A: pryma A."), K(2, 2, "Kwinta: E (D, próg 2)."), K(3, 2, "Oktawa: A (G, próg 2)."), K(2, 2, "Kwinta: E."),
      ] },
      { typ: "rytm", bpm: 80, nuty: [[0, 0], [1, 2], [2, 2], [1, 2], [0, 0], [1, 2], [2, 2], [1, 2], [1, 0], [2, 2], [3, 2], [2, 2], [1, 0], [2, 2], [3, 2], [2, 2], [0, 0], [1, 2], [2, 2], [1, 2], [0, 0]], opis: "Groove w rytmie: 2× na E, 2× na A, powrót na E" },
    ] },
];

/* ---------- dźwięk: synteza szarpanej struny (Karplus–Strong) – bez próbek, działa offline ---------- */
export class Dzwiek {
  constructor() { this.ctx = null; this.cache = new Map(); this.glosy = [null, null, null, null]; }
  wlacz() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.wyjscie = this.ctx.createGain(); this.wyjscie.gain.value = 0.9;
      const komp = this.ctx.createDynamicsCompressor(); komp.threshold.value = -14; komp.ratio.value = 4;
      this.wyjscie.connect(komp).connect(this.ctx.destination);
    }
    if (this.ctx.state !== "running") this.ctx.resume();
  }
  bufor(freq) {
    const klucz = Math.round(freq * 100); if (this.cache.has(klucz)) return this.cache.get(klucz);
    const sr = this.ctx.sampleRate, dl = Math.floor(sr * 2.8), b = this.ctx.createBuffer(1, dl, sr), d = b.getChannelData(0);
    const N = sr / freq, E = Math.ceil(N) + 2;
    // pobudzenie: szum przefiltrowany (palec, nie kostka → ciepły, okrągły atak) + miejsce szarpnięcia ~1/5 długości
    let p = 0; const exc = new Float32Array(E); for (let i = 0; i < E; i++) { p = p * 0.55 + (Math.random() * 2 - 1) * 0.45; exc[i] = p; }
    const off = Math.floor(N / 5); for (let i = E - 1; i >= off; i--) exc[i] -= exc[i - off] * 0.9;
    for (let i = 0; i < E; i++) d[i] = exc[i];
    const lerp = x => { const k = Math.floor(x), f = x - k; return d[k] * (1 - f) + d[k + 1] * f; }, tlum = 0.9988 - Math.max(0, freq - 60) * 0.000004;
    for (let i = E; i < dl; i++) d[i] = tlum * 0.5 * (lerp(i - N + 0.5) + lerp(i - N - 0.5));   // pętla opóźniająca o dokładnie N próbek
    // obwiednia: szybki atak, łagodne wybrzmienie; normalizacja
    let max = 0; for (let i = 0; i < dl; i++) { const t = i / sr; d[i] *= Math.min(1, t * 400) * Math.exp(-t * 0.55); max = Math.max(max, Math.abs(d[i])); }
    for (let i = 0; i < dl; i++) d[i] = Math.tanh(d[i] / max * 1.4) * 0.8;
    this.cache.set(klucz, b); return b;
  }
  graj(s, midi, sila = 1) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    const st = this.glosy[s]; if (st) { st.g.gain.cancelScheduledValues(t); st.g.gain.setTargetAtTime(0, t, 0.015); st.z.stop(t + 0.1); }   // jedna struna = jeden dźwięk
    const z = this.ctx.createBufferSource(); z.buffer = this.bufor(440 * 2 ** ((midi - 69) / 12));
    const f = this.ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1400 + sila * 1600; f.Q.value = 0.7;
    const niskie = this.ctx.createBiquadFilter(); niskie.type = "lowshelf"; niskie.frequency.value = 160; niskie.gain.value = 6;
    const g = this.ctx.createGain(); g.gain.value = 0.55 + 0.45 * Math.min(1, sila);
    z.connect(f).connect(niskie).connect(g).connect(this.wyjscie); z.start(t); this.glosy[s] = { z, g };
    return t;
  }
  wycisz(s) { const st = this.glosy[s]; if (st && this.ctx) { const t = this.ctx.currentTime; st.g.gain.setTargetAtTime(0, t, 0.03); this.glosy[s] = null; } }
  klik(t, akcent) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.frequency.value = akcent ? 1760 : 1175; o.type = "triangle";
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + 0.08);
  }
}
