/*
 * SYMULACJA MAGAZYNU E-COMMERCE – kompletacja, pakowanie, wysyłka (symulacja zdarzeń dyskretnych).
 * Ten sam zestaw zamówień (to samo ziarno losowania) dla wariantu „przed” i „po” – porównanie jest uczciwe.
 *
 * Układ (metry, widok z góry): x 0–36 (szerokość), z 0–24 (głębokość).
 * Blok regałów: alejki co 4 m, regały po obu stronach alejki, lokalizacje co 1 m wzdłuż z (4–16 m).
 * Ruch kompletujących: alejkami i dwoma alejkami poprzecznymi (przód z=2, tył z=18) – jak w prawdziwym magazynie.
 */

export const DOMYSLNE = {
  przed: {
    nazwa: "Przed zmianami",
    uklad: { start: { x: 2, z: 20 }, pakowanie: [{ x: 33, z: 14 }, { x: 33, z: 18 }], wysylka: { x: 7, z: 22.5 } },
    param: { kompletujacy: 4, partia: 1, rozmieszczenie: "losowe", trasa: "powrotna", przenosnik: false, zamowienNaGodz: 90, czasZmianyH: 2, ziarno: 7 },
  },
  po: {
    nazwa: "Po zmianach",
    uklad: { start: { x: 14, z: 0.8 }, pakowanie: [{ x: 29.5, z: 2 }, { x: 31.5, z: 4 }, { x: 33.5, z: 6 }], wysylka: { x: 34, z: 9.5 } },
    param: { kompletujacy: 4, partia: 3, rozmieszczenie: "ABC", trasa: "S", przenosnik: true, zamowienNaGodz: 90, czasZmianyH: 2, ziarno: 7 },
  },
};

export const STALE = {
  alejek: 6, alejkaX0: 5, alejkaDx: 4, zOd: 4, zDo: 16, poprzeczne: [2, 18], poziomow: 3,
  predkosc: 1.0, predkoscPaczki: 1.1, przenosnikPredkosc: 0.6,
  pobranieLinii: 12, pobranieSztuki: 3, sortowanieSztuki: 4,
  pakowanieStale: 35, pakowanieSztuki: 7, kontrola: 15, przydzial: 5,
  kurierCo: 30 * 60,
};

/* BPMN – zadania procesu (identyfikatory używane w diagramie i w wynikach) */
export const ZADANIA = [
  { id: "przyjecie", nazwa: "Przyjęcie zamówienia", tor: "WMS" },
  { id: "przydzial", nazwa: "Przydział zadania kompletacji", tor: "WMS" },
  { id: "kompletacja", nazwa: "Przejście i pobranie towaru", tor: "Kompletujący" },
  { id: "dostarczenie", nazwa: "Dostarczenie do pakowania", tor: "Kompletujący" },
  { id: "pakowanie", nazwa: "Pakowanie", tor: "Pakujący" },
  { id: "kontrola", nazwa: "Kontrola i etykieta", tor: "Pakujący" },
  { id: "transport", nazwa: "Transport do strefy wysyłki", tor: "Pakujący" },
  { id: "wysylka", nazwa: "Wydanie kurierowi", tor: "Spedycja" },
];

/* ---------------------------------------------------------------- losowanie */
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const wykladniczy = (r, sr) => -Math.log(1 - r()) * sr;

/* ---------------------------------------------------------------- lokalizacje regałowe */
export function lokalizacje() {
  const L = [];
  for (let a = 0; a < STALE.alejek; a++) {
    const x = STALE.alejkaX0 + a * STALE.alejkaDx;
    for (let z = STALE.zOd + 0.5; z < STALE.zDo; z += 1) for (const strona of [-1, 1]) for (let poziom = 0; poziom < STALE.poziomow; poziom++) L.push({ alejka: a, x, z, strona, poziom });
  }
  return L;
}
const LOK = lokalizacje();

/** Przypisanie produktów do lokalizacji. ABC: najczęściej zamawiane najbliżej przedniej alejki poprzecznej i strefy pakowania. */
function rozmiesc(rodzaj, nSku, r, cel) {
  const idx = LOK.map((_, i) => i);
  if (rodzaj === "ABC") {
    idx.sort((i, j) => odlegloscProsta(LOK[i], cel) + Math.abs(LOK[i].poziom - 1) * 0.5 - odlegloscProsta(LOK[j], cel) - Math.abs(LOK[j].poziom - 1) * 0.5);
    return idx.slice(0, nSku);
  }
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx.slice(0, nSku);
}
const odlegloscProsta = (a, b) => droga(a, b).d;

/** Droga po magazynie: przez alejkę poprzeczną (przód lub tył). Zwraca długość i punkty łamanej. */
export function droga(a, b) {
  if (Math.abs(a.x - b.x) < 0.01) return { d: Math.abs(a.z - b.z), pkt: [a, b] };
  let best = null;
  for (const zc of STALE.poprzeczne) {
    const d = Math.abs(a.z - zc) + Math.abs(a.x - b.x) + Math.abs(b.z - zc);
    if (!best || d < best.d) best = { d, pkt: [a, { x: a.x, z: zc }, { x: b.x, z: zc }, b] };
  }
  // punkty poza blokiem regałów (strefy przy ścianach) – mogą iść na skróty wzdłuż ściany
  const pozaBlokiem = p => p.z < STALE.poprzeczne[0] || p.z > STALE.poprzeczne[1] || p.x < STALE.alejkaX0 - 2 || p.x > STALE.alejkaX0 + (STALE.alejek - 1) * STALE.alejkaDx + 2;
  if (pozaBlokiem(a) && pozaBlokiem(b)) {
    const d = Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
    if (d < best.d) best = { d, pkt: [a, { x: b.x, z: a.z }, b] };
  }
  return best;
}

/** Kolejność odwiedzin lokalizacji: „S” (alejkami po kolei, wężykiem) albo „powrotna” (każda alejka tam i z powrotem od przodu). */
function trasa(start, punkty, rodzaj) {
  const posort = [...punkty].sort((p, q) => p.alejka - q.alejka || p.z - q.z);
  if (rodzaj === "S") {
    const grupy = [...new Set(posort.map(p => p.alejka))];
    return grupy.flatMap((a, i) => { const w = posort.filter(p => p.alejka === a); return i % 2 ? w.reverse() : w; });
  }
  return posort;            // powrotna: każda alejka od przodu – droga() i tak wraca przez przednią alejkę
}

/* ======================================================================= SYMULACJA */
export function symuluj(wariant) {
  const { uklad, param } = wariant, S = STALE, r = rng(param.ziarno || 1);
  const nSku = 400;
  // popularność produktów: rozkład Pareto (20% produktów = ok. 80% pobrań)
  const waga = Array.from({ length: nSku }, (_, i) => 1 / Math.pow(i + 1, 1.05));
  const sumW = waga.reduce((a, b) => a + b, 0);
  const losujSku = () => { let x = r() * sumW; for (let i = 0; i < nSku; i++) { x -= waga[i]; if (x <= 0) return i; } return nSku - 1; };
  const celABC = { x: uklad.pakowanie[0]?.x ?? 30, z: S.poprzeczne[0] };
  const rr = rng((param.ziarno || 1) * 31 + 5);
  const miejsce = rozmiesc(param.rozmieszczenie, nSku, rr, celABC);

  // zamówienia (identyczne dla każdego wariantu o tym samym ziarnie)
  const zr = rng((param.ziarno || 1) * 97 + 11);
  const zamowienia = []; let t = 0; const koniec = param.czasZmianyH * 3600, sredniOdstep = 3600 / param.zamowienNaGodz;
  while (true) {
    t += wykladniczy(zr, sredniOdstep); if (t > koniec) break;
    const linii = 1 + Math.min(5, Math.floor(wykladniczy(zr, 1.1)));
    const linie = []; for (let k = 0; k < linii; k++) linie.push({ sku: losujSku(), szt: 1 + Math.floor(zr() * 2.2) });
    zamowienia.push({ id: zamowienia.length + 1, przyjete: t, linie, czasy: {} });
  }

  // zasoby
  const kompl = Array.from({ length: param.kompletujacy }, (_, i) => ({ id: i, wolnyOd: 0, poz: { ...uklad.start }, ruchy: [], praca: 0, dystans: 0 }));
  const stan = uklad.pakowanie.map((p, i) => ({ id: i, ...p, wolnyOd: 0, praca: 0, kolejka: [], ruchy: [] }));
  const zdarzeniaKolejki = [];      // [czas, stanowisko, długość kolejki]
  const paczki = [];

  // przydział zadań: kolejka FIFO zamówień, partie po „partia” zamówień
  const czekajace = []; let iz = 0;
  const wolnyKompl = () => kompl.reduce((a, b) => (a.wolnyOd <= b.wolnyOd ? a : b));
  let teraz = 0;
  // kolejki pakowania obsługujemy po zakończeniu całej kompletacji (stanowiska FIFO wg czasu dostarczenia)
  const dostawy = [];
  while (iz < zamowienia.length || czekajace.length) {
    const k = wolnyKompl();
    teraz = Math.max(k.wolnyOd, czekajace.length ? 0 : zamowienia[iz].przyjete);
    while (iz < zamowienia.length && zamowienia[iz].przyjete <= teraz) czekajace.push(zamowienia[iz++]);
    if (!czekajace.length) { teraz = zamowienia[iz].przyjete; continue; }
    // partia: czekamy na komplet tylko, jeśli zamówienia i tak napływają (max 3 min oczekiwania)
    let partia = czekajace.splice(0, param.partia);
    if (partia.length < param.partia && iz < zamowienia.length) {
      const doczekaj = Math.min(zamowienia[Math.min(iz + param.partia - partia.length - 1, zamowienia.length - 1)].przyjete, teraz + 180);
      while (iz < zamowienia.length && zamowienia[iz].przyjete <= doczekaj && partia.length < param.partia) partia.push(zamowienia[iz++]);
      teraz = Math.max(teraz, doczekaj);
    }
    const start = Math.max(teraz, k.wolnyOd);
    for (const z of partia) { z.czasy.przyjecie = [z.przyjete, z.przyjete + 2]; z.czasy.przydzial = [z.przyjete + 2, start + S.przydzial]; z.kompletujacy = k.id; }
    // trasa po wszystkich liniach partii
    const punkty = partia.flatMap(z => z.linie.map(l => ({ ...LOK[miejsce[l.sku]], szt: l.szt, zam: z.id })));
    const kolej = trasa(k.poz, punkty, param.trasa);
    let tt = start + S.przydzial, poz = { ...uklad.start };
    if (Math.hypot(k.poz.x - poz.x, k.poz.z - poz.z) > 0.1) { const d = droga(k.poz, poz); k.ruchy.push({ t0: tt, t1: tt + d.d / S.predkosc, pkt: d.pkt, typ: "powrot" }); tt += d.d / S.predkosc; k.dystans += d.d; }
    for (const p of kolej) {
      const cel = { x: p.x, z: p.z }, d = droga(poz, cel);
      k.ruchy.push({ t0: tt, t1: tt + d.d / S.predkosc, pkt: d.pkt, typ: "jazda", partia: partia.map(z => z.id) });
      tt += d.d / S.predkosc; k.dystans += d.d;
      const tp = S.pobranieLinii + S.pobranieSztuki * p.szt + (param.partia > 1 ? S.sortowanieSztuki * p.szt : 0);
      k.ruchy.push({ t0: tt, t1: tt + tp, pkt: [cel], typ: "pobranie", partia: partia.map(z => z.id) });
      tt += tp; poz = cel;
    }
    for (const z of partia) z.czasy.kompletacja = [start + S.przydzial, tt];
    // dostarczenie do stanowiska pakowania z najkrótszą kolejką (szacunek: wolny od)
    const st = stan.reduce((a, b) => (a.wolnyOd + a.kolejka.length * 60 <= b.wolnyOd + b.kolejka.length * 60 ? a : b));
    const d = droga(poz, st); k.ruchy.push({ t0: tt, t1: tt + d.d / S.predkosc, pkt: d.pkt, typ: "dostawa", partia: partia.map(z => z.id) });
    k.dystans += d.d; const tDost = tt + d.d / S.predkosc;
    for (const z of partia) { z.czasy.dostarczenie = [tt, tDost]; dostawy.push({ t: tDost, z, st: st.id }); }
    k.praca += tDost - start; k.wolnyOd = tDost; k.poz = { x: st.x, z: st.z };
    st.wolnyOd = Math.max(st.wolnyOd, tDost);        // przybliżenie do wyboru stanowiska
  }
  // pakowanie: każde stanowisko obsługuje swoje dostawy w kolejności przybycia
  for (const s of stan) { s.wolnyOd = 0; s.kolejka = []; }
  dostawy.sort((a, b) => a.t - b.t);
  const odlDock = s => droga(s, uklad.wysylka).d;
  for (const dv of dostawy) {
    const s = stan[dv.st], z = dv.z; z.stanowisko = s.id;
    const start = Math.max(dv.t, s.wolnyOd);
    zdarzeniaKolejki.push([dv.t, s.id, +1]); zdarzeniaKolejki.push([start, s.id, -1]);
    const szt = z.linie.reduce((a, l) => a + l.szt, 0);
    const tPak = S.pakowanieStale + S.pakowanieSztuki * szt;
    z.czasy.pakowanie = [dv.t, start + tPak];                 // z oczekiwaniem w kolejce
    z.czekaniePakowanie = start - dv.t;
    z.czasy.kontrola = [start + tPak, start + tPak + S.kontrola];
    let tt = start + tPak + S.kontrola;
    const dd = odlDock(s);
    if (param.przenosnik) {
      z.czasy.transport = [tt, tt + dd / S.przenosnikPredkosc];
      s.ruchy.push({ t0: start, t1: tt, typ: "pakowanie", zam: z.id });
    } else {
      // pakujący odnosi paczkę sam (tam i z powrotem) – stanowisko w tym czasie stoi
      const d = droga(s, uklad.wysylka);
      s.ruchy.push({ t0: start, t1: tt, typ: "pakowanie", zam: z.id });
      s.ruchy.push({ t0: tt, t1: tt + dd / S.predkoscPaczki, typ: "odnosi", pkt: d.pkt, zam: z.id });
      s.ruchy.push({ t0: tt + dd / S.predkoscPaczki, t1: tt + 2 * dd / S.predkoscPaczki, typ: "wraca", pkt: [...d.pkt].reverse() });
      z.czasy.transport = [tt, tt + dd / S.predkoscPaczki];
    }
    const wDoku = z.czasy.transport[1];
    s.wolnyOd = param.przenosnik ? tt : tt + 2 * dd / S.predkoscPaczki;
    s.praca += s.wolnyOd - start;
    const kurier = Math.ceil(wDoku / S.kurierCo) * S.kurierCo;
    z.czasy.wysylka = [wDoku, kurier];
    z.gotowe = wDoku; z.kurier = kurier;
    paczki.push({ zam: z.id, t0: z.czasy.transport[0], t1: wDoku, pkt: droga(s, uklad.wysylka).pkt, przenosnik: param.przenosnik, kurier });
  }
  return { zamowienia, kompl, stan, paczki, zdarzeniaKolejki, miejsce, lok: LOK, ...wyniki(zamowienia, kompl, stan, zdarzeniaKolejki, param) };
}

/* ---------------------------------------------------------------- wskaźniki */
function wyniki(zam, kompl, stan, zk, param) {
  const ok = zam.filter(z => z.gotowe != null);
  const lead = ok.map(z => (z.gotowe - z.przyjete) / 60).sort((a, b) => a - b);
  const sr = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const pct = (a, p) => a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : 0;
  const tKonca = Math.max(...ok.map(z => z.gotowe), 1);
  // średni czas na zadanie BPMN (wraz z oczekiwaniem) i udział oczekiwania
  const naZadanie = {};
  for (const z of ok) for (const [k, [a, b]] of Object.entries(z.czasy)) {
    const w = naZadanie[k] ||= { suma: 0, n: 0 }; w.suma += b - a; w.n++;
  }
  const zadania = Object.fromEntries(Object.entries(naZadanie).map(([k, v]) => [k, v.suma / v.n / 60]));
  zadania.wysylka = sr(ok.map(z => (z.kurier - z.gotowe) / 60));
  // maksymalna kolejka do pakowania
  let maxK = 0; const dl = {};
  for (const [t, s, d] of [...zk].sort((a, b) => a[0] - b[0] || a[2] - b[2])) { dl[s] = (dl[s] || 0) + d; maxK = Math.max(maxK, dl[s]); }
  const wykKompl = sr(kompl.map(k => k.praca / tKonca)) * 100, wykStan = sr(stan.map(s => s.praca / tKonca)) * 100;
  const czekPak = sr(ok.map(z => z.czekaniePakowanie / 60));
  // wąskie gardło: zasób o najwyższym wykorzystaniu / najdłuższe oczekiwanie
  const czekKompl = sr(ok.map(z => (z.czasy.przydzial[1] - z.czasy.przydzial[0]) / 60));
  const gardlo = Math.max(czekPak, czekKompl) < 2 ? { zadanie: null, opis: `brak wyraźnego wąskiego gardła – kolejki krótsze niż 2 min (pakowanie ${czekPak.toFixed(1)} min, przydział ${czekKompl.toFixed(1)} min)` }
    : czekPak > czekKompl ? { zadanie: "pakowanie", opis: `kolejka do pakowania – średnio ${czekPak.toFixed(1)} min czekania, max ${maxK} zamówień` }
    : { zadanie: "przydzial", opis: `brak wolnych kompletujących – średnio ${czekKompl.toFixed(1)} min czekania na przydział` };
  return {
    kpi: {
      zamowien: ok.length, sredniCzas: sr(lead), p90: pct(lead, 0.9), przepustowosc: ok.length / (tKonca / 3600),
      dystansKm: kompl.reduce((a, k) => a + k.dystans, 0) / 1000, wykKompl, wykStan, czekPak, maxKolejka: maxK,
      naPierwszegoKuriera: ok.filter(z => z.kurier - z.przyjete <= STALE.kurierCo * 1.5).length / Math.max(1, ok.length) * 100,
      czasKoncaMin: tKonca / 60,
    },
    zadania, gardlo,
  };
}

/** Stan w chwili t (do animacji): pozycje kompletujących, pakujących, paczek i aktywne zadania BPMN. */
/** Punkt w ułamku f drogi po łamanej. */
export function wzdluz(pkt, f) {
  if (!pkt || pkt.length < 2) return { p: pkt?.[0] };
  const dl = pkt.slice(1).map((p, i) => Math.abs(p.x - pkt[i].x) + Math.abs(p.z - pkt[i].z)), suma = dl.reduce((a, b) => a + b, 0) || 1;
  let x = Math.max(0, Math.min(1, f)) * suma;
  for (let i = 0; i < dl.length; i++) {
    if (x <= dl[i] || i === dl.length - 1) { const k = dl[i] ? Math.min(1, x / dl[i]) : 1, a = pkt[i], b = pkt[i + 1]; return { p: { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k }, kier: { x: b.x - a.x, z: b.z - a.z } }; }
    x -= dl[i];
  }
  return { p: pkt[pkt.length - 1] };
}

export function stanW(sim, t) {
  const poz = ruchy => {
    const r = ruchy.find(m => m.t0 <= t && t < m.t1) || null;
    if (!r) return { r: null };
    if (!r.pkt || r.pkt.length < 2) return { r, p: r.pkt?.[0] };
    return { r, ...wzdluz(r.pkt, (t - r.t0) / (r.t1 - r.t0)) };
  };
  const kompl = sim.kompl.map(k => { const s = poz(k.ruchy); if (!s.r) { const ost = [...k.ruchy].reverse().find(m => m.t1 <= t); const p = ost ? ost.pkt[ost.pkt.length - 1] : null; return { id: k.id, p, typ: "czeka" }; } return { id: k.id, p: s.p, kier: s.kier, typ: s.r.typ }; });
  const pak = sim.stan.map(s => { const st = poz(s.ruchy); return { id: s.id, p: st.p || { x: s.x, z: s.z }, typ: st.r?.typ || "czeka", kier: st.kier }; });
  const paczki = sim.paczki.filter(p => p.t0 <= t && t < p.t1).map(p => ({ p: wzdluz(p.pkt, (t - p.t0) / (p.t1 - p.t0)).p, przenosnik: p.przenosnik }));
  const wDoku = sim.paczki.filter(p => p.t1 <= t && t < p.kurier).length;
  const aktywne = {}; for (const z of ZADANIA) aktywne[z.id] = 0;
  for (const z of sim.zamowienia) for (const [k, [a, b]] of Object.entries(z.czasy)) if (a <= t && t < b) aktywne[k]++;
  const kolejki = sim.stan.map(s => sim.zamowienia.filter(z => z.stanowisko === s.id && z.czasy.pakowanie[0] <= t && t < z.czasy.pakowanie[0] + z.czekaniePakowanie).length);
  const zrealizowane = sim.zamowienia.filter(z => z.gotowe != null && z.gotowe <= t).length;
  const przyjete = sim.zamowienia.filter(z => z.przyjete <= t).length;
  return { kompl, pak, paczki, wDoku, aktywne, kolejki, zrealizowane, przyjete };
}
