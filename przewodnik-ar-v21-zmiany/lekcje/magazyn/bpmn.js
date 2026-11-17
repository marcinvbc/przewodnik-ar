/*
 * Diagram BPMN procesu kompletacji i wysyłki – tory (WMS, Kompletujący, Pakujący, Spedycja),
 * zadania powiązane z symulacją: na żywo liczba zamówień w zadaniu (żeton), średni czas, „mapa ciepła”
 * udziału w czasie realizacji i oznaczenie wąskiego gardła. Klik w zadanie → pokazuje miejsce w magazynie.
 */
import { ZADANIA } from "./sim.js";

const TORY = ["WMS", "Kompletujący", "Pakujący", "Spedycja"];
const LH = 92, X0 = 96, DX = 128, TW = 112, TH = 58, TOP = 6;
const ns = "http://www.w3.org/2000/svg";
const esc = s => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

function zawin(t, n = 15) { const w = t.split(" "), out = [""]; for (const s of w) { if ((out[out.length - 1] + " " + s).trim().length > n) out.push(s); else out[out.length - 1] = (out[out.length - 1] + " " + s).trim(); } return out; }

export function utworzBPMN(el, { onKlik } = {}) {
  const szer = X0 + (ZADANIA.length + 1) * DX + 30, wys = TOP + TORY.length * LH + 4;
  const poz = {}; ZADANIA.forEach((z, i) => { poz[z.id] = { x: X0 + 50 + i * DX, y: TOP + TORY.indexOf(z.tor) * LH + (LH - TH) / 2 }; });
  let s = `<svg viewBox="0 0 ${szer} ${wys}" xmlns="${ns}" class="bpmn" role="img" aria-label="Diagram BPMN procesu kompletacji i wysyłki">
  <defs><marker id="strz" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#4a5459"/></marker></defs>
  <rect x="1" y="${TOP}" width="${szer - 2}" height="${TORY.length * LH}" fill="#fff" stroke="#4a5459" stroke-width="1.5" rx="4"/>
  <rect x="1" y="${TOP}" width="26" height="${TORY.length * LH}" fill="#f1ebdd" stroke="#4a5459" stroke-width="1.5"/>
  <text transform="translate(18 ${TOP + TORY.length * LH / 2}) rotate(-90)" text-anchor="middle" font-size="13" font-weight="700" fill="#1f2a2e">Magazyn e-commerce</text>`;
  TORY.forEach((t, i) => {
    const y = TOP + i * LH;
    s += `<line x1="27" y1="${y}" x2="${szer - 1}" y2="${y}" stroke="#4a5459" stroke-width="${i ? 1 : 0}"/>
      <rect x="27" y="${y}" width="40" height="${LH}" fill="#faf7f0" stroke="#4a5459" stroke-width="1"/>
      <text transform="translate(52 ${y + LH / 2}) rotate(-90)" text-anchor="middle" font-size="12" font-weight="700" fill="#1f2a2e">${esc(t)}</text>`;
  });
  // zdarzenie startowe i końcowe
  const yS = TOP + LH / 2, pierw = poz[ZADANIA[0].id], ost = poz[ZADANIA[ZADANIA.length - 1].id];
  s += `<circle cx="${X0}" cy="${yS}" r="15" fill="#eef6ef" stroke="#2f6b3a" stroke-width="2"/><text x="${X0}" y="${yS + 32}" text-anchor="middle" font-size="10" fill="#4a5459">zamówienie</text>
    <path d="M${X0 - 7},${yS - 4} h14 v9 h-14 z M${X0 - 7},${yS - 4} l7,5 l7,-5" fill="none" stroke="#2f6b3a" stroke-width="1.4"/>`;
  const xE = ost.x + TW + 40, yE = ost.y + TH / 2;
  s += `<circle cx="${xE}" cy="${yE}" r="15" fill="#fbeaea" stroke="#9b1c1c" stroke-width="4"/><text x="${xE}" y="${yE + 32}" text-anchor="middle" font-size="10" fill="#4a5459">paczka u kuriera</text>`;
  // przepływy
  const lin = (a, b) => {
    const x1 = a.x + TW, y1 = a.y + TH / 2, x2 = b.x, y2 = b.y + TH / 2;
    return Math.abs(y1 - y2) < 1 ? `M${x1},${y1} L${x2 - 2},${y2}` : `M${x1},${y1} L${(x1 + x2) / 2},${y1} L${(x1 + x2) / 2},${y2} L${x2 - 2},${y2}`;
  };
  s += `<path d="M${X0 + 15},${yS} L${pierw.x - 2},${pierw.y + TH / 2}" stroke="#4a5459" stroke-width="1.5" fill="none" marker-end="url(#strz)"/>`;
  for (let i = 0; i < ZADANIA.length - 1; i++) s += `<path d="${lin(poz[ZADANIA[i].id], poz[ZADANIA[i + 1].id])}" stroke="#4a5459" stroke-width="1.5" fill="none" marker-end="url(#strz)"/>`;
  s += `<path d="M${ost.x + TW},${yE} L${xE - 17},${yE}" stroke="#4a5459" stroke-width="1.5" fill="none" marker-end="url(#strz)"/>`;
  // zadania
  for (const z of ZADANIA) {
    const p = poz[z.id];
    s += `<g class="zad" data-id="${z.id}" tabindex="0" style="cursor:pointer">
      <rect class="tlo" x="${p.x}" y="${p.y}" width="${TW}" height="${TH}" rx="9" fill="#fff" stroke="#1f2a2e" stroke-width="1.6"/>
      ${zawin(z.nazwa).map((l, i, a) => `<text x="${p.x + TW / 2}" y="${p.y + 17 + i * 13 - (a.length - 1) * 4}" text-anchor="middle" font-size="11" font-weight="600" fill="#1f2a2e">${esc(l)}</text>`).join("")}
      <text class="czas" x="${p.x + TW / 2}" y="${p.y + TH - 8}" text-anchor="middle" font-size="11" fill="#4a5459">–</text>
      <g class="zeton" style="display:none"><circle cx="${p.x + TW - 2}" cy="${p.y + 2}" r="12" fill="#c9562f"/><text x="${p.x + TW - 2}" y="${p.y + 6}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">0</text></g>
      <text class="gardlo" x="${p.x + TW / 2}" y="${p.y + TH + 13}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#9b1c1c" style="display:none">⚠ wąskie gardło</text>
    </g>`;
  }
  s += `</svg>`;
  el.innerHTML = s;
  const g = Object.fromEntries([...el.querySelectorAll(".zad")].map(n => [n.dataset.id, n]));
  for (const [id, n] of Object.entries(g)) {
    n.addEventListener("click", () => onKlik && onKlik(id));
    n.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onKlik && onKlik(id); } });
  }
  const nazwyTransportu = { true: "Transport przenośnikiem", false: "Pakujący odnosi paczkę" };
  return {
    /** wyniki symulacji: średnie czasy, wąskie gardło, parametry (np. przenośnik zmienia opis zadania) */
    wyniki(sim, param) {
      const suma = Object.values(sim.zadania).reduce((a, b) => a + b, 0) || 1;
      for (const z of ZADANIA) {
        const n = g[z.id], v = sim.zadania[z.id] ?? 0, udz = v / suma;
        n.querySelector(".czas").textContent = `⌀ ${v < 1 ? (v * 60).toFixed(0) + " s" : v.toFixed(1) + " min"}`;
        const r = Math.round(255 - udz * 120), gg = Math.round(255 - udz * 170), b = Math.round(255 - udz * 180);
        n.querySelector(".tlo").setAttribute("fill", `rgb(${r},${gg},${b})`);
        const jestGardlo = sim.gardlo.zadanie === z.id && v > 2;
        n.querySelector(".tlo").setAttribute("stroke", jestGardlo ? "#9b1c1c" : "#1f2a2e");
        n.querySelector(".tlo").setAttribute("stroke-width", jestGardlo ? "3.5" : "1.6");
        n.querySelector(".gardlo").style.display = jestGardlo ? "" : "none";
        n.querySelector("title")?.remove();
        const t = document.createElementNS(ns, "title"); t.textContent = `${z.nazwa}: średnio ${v.toFixed(1)} min (${(udz * 100).toFixed(0)}% czasu realizacji)`; n.prepend(t);
      }
      const tr = g.transport.querySelectorAll("text:not(.czas)");
      const nowa = zawin(nazwyTransportu[!!param.przenosnik]);
      [...tr].filter(t => !t.closest(".zeton") && !t.classList.contains("gardlo")).forEach((t, i) => { t.textContent = nowa[i] || ""; });
    },
    /** stan na żywo: liczba zamówień w każdym zadaniu */
    zywo(aktywne) {
      for (const z of ZADANIA) { const n = g[z.id], k = aktywne[z.id] || 0, ze = n.querySelector(".zeton"); ze.style.display = k ? "" : "none"; ze.querySelector("text").textContent = k > 99 ? "99+" : k; }
    },
    zaznacz(id) { for (const [k, n] of Object.entries(g)) n.classList.toggle("wyb", k === id); },
  };
}
