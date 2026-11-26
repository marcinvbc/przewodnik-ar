/* Antykolizja w EPC Gen2 (ISO/IEC 18000-63): ramkowa szczelinowa ALOHA.
   Czytnik ogłasza ramkę 2^Q szczelin (Query), każdy nieodczytany tag losuje licznik 0…2^Q−1 i odpowiada (RN16),
   gdy licznik spadnie do 0. Szczelina: pusta / sukces (1 tag → ACK → EPC) / kolizja (≥2 tagi).
   Tryb adaptacyjny – „algorytm Q” z normy: Qfp += C przy kolizji, −= C przy pustej; gdy round(Qfp) ≠ Q → QueryAdjust (nowa ramka).
   Czasy szczelin są orientacyjne (typowe ustawienia łącza), do porównań między wariantami. */
export const CZAS = { pusta: 0.25, kolizja: 0.5, sukces: 1.6 };   // [ms]

function losowa(ziarno) { let s = ziarno >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function symuluj({ N, Q, adapt = false, C = 0.3, ziarno = 1, maxSzczelin = 50000 }) {
  const rnd = losowa(ziarno), licz = new Int32Array(N), odczytany = new Uint8Array(N), szczeliny = [], ramki = [];
  let q = Q, qfp = Q, zostalo = N, wRamce = 0;
  const nowaRamka = () => { const n = 2 ** q; for (let i = 0; i < N; i++) if (!odczytany[i]) licz[i] = Math.floor(rnd() * n); wRamce = n; ramki.push({ od: szczeliny.length, Q: q }); };
  nowaRamka();
  while (zostalo > 0 && szczeliny.length < maxSzczelin) {
    const odp = []; for (let i = 0; i < N; i++) if (!odczytany[i] && licz[i] === 0) odp.push(i);
    let wynik;
    if (odp.length === 0) wynik = "pusta"; else if (odp.length === 1) { wynik = "sukces"; odczytany[odp[0]] = 1; zostalo--; } else { wynik = "kolizja"; for (const i of odp) licz[i] = -1; }
    szczeliny.push({ wynik, tagi: odp, Q: q });
    for (let i = 0; i < N; i++) if (!odczytany[i] && licz[i] > 0) licz[i]--;
    wRamce--;
    if (adapt) {
      if (wynik === "pusta") qfp = Math.max(0, qfp - C); else if (wynik === "kolizja") qfp = Math.min(15, qfp + C);
      const nq = Math.round(qfp); if (nq !== q) { q = nq; nowaRamka(); continue; }
    }
    if (wRamce <= 0) nowaRamka();
  }
  const ile = { pusta: 0, sukces: 0, kolizja: 0 }; for (const s of szczeliny) ile[s.wynik]++;
  const czas = ile.pusta * CZAS.pusta + ile.kolizja * CZAS.kolizja + ile.sukces * CZAS.sukces;
  return { szczeliny, ramki, ile, czas, sprawnosc: ile.sukces / Math.max(1, szczeliny.length), zakonczono: zostalo === 0 };
}
/** średnia z kilku przebiegów (inne losowania) */
export function srednio(opcje, ile = 20) { let s = 0, cz = 0, sp = 0; for (let k = 0; k < ile; k++) { const r = symuluj({ ...opcje, ziarno: k * 7919 + 3 }); s += r.szczeliny.length; cz += r.czas; sp += r.sprawnosc; } return { szczeliny: s / ile, czas: cz / ile, sprawnosc: sp / ile }; }
