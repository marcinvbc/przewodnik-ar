"""Film „Jak pracuje serce?” (ok. 42 s, 1280×720) – strona HTML z animacją, klatki nagrywa Playwright, składa ffmpeg.
Użycie: python3 film.py plik.html   (potem: node film_klatki.js plik.html katalog && ffmpeg …)
"""
import sys
from ilustracje import serce_svg, krwiobiegi, NIEB, CZERW, INK, FONT

def html():
    fazy = {f: serce_svg(0, 0, 1.0, podpisy=False, strzalki=False, faza=f) for f in ("rozkurcz", "przedsionki", "komory")}
    krw = krwiobiegi().split(">", 1)[1].rsplit("</svg>", 1)[0]        # wnętrze SVG
    g_fazy = "".join(f'<g id="f_{k}" style="display:none">{v}</g>' for k, v in fazy.items())
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{{margin:0;width:1280px;height:720px;overflow:hidden;background:#fffdf8;font-family:'Segoe UI',Roboto,'DejaVu Sans',sans-serif;color:{INK}}}
.ekran{{position:absolute;inset:0;display:none}}
h1{{font-size:64px;margin:0}} .pod{{font-size:30px;color:#5b6266}}
.tytul{{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:18px;text-align:center;background:radial-gradient(circle at 50% 40%,#fff3ef,#fffdf8 60%)}}
.faza{{position:absolute;right:50px;top:90px;width:430px}}
.faza h2{{font-size:42px;margin:0 0 10px}} .faza p{{font-size:27px;line-height:1.35;margin:0 0 18px}}
.os{{display:flex;height:26px;border-radius:13px;overflow:hidden;margin-top:24px}} .os div{{display:grid;place-items:center;font-size:15px;color:#fff;font-weight:700}}
.wsk{{position:absolute;top:-8px;width:4px;height:42px;background:{INK};border-radius:2px}}
.ekg{{position:absolute;left:50px;bottom:40px;width:700px;height:90px}}
.napis{{position:absolute;left:0;right:0;bottom:34px;text-align:center;font-size:30px;font-weight:600}}
.koniec li{{font-size:31px;margin:10px 0}}
</style></head><body>
<div class="ekran tytul" id="e0"><div style="font-size:90px">❤️</div><h1>Jak pracuje serce?</h1><div class="pod">Biologia · klasa 7 · układ krążenia</div></div>

<div class="ekran" id="e1">
 <svg viewBox="380 20 1000 1080" width="660" height="713" style="position:absolute;left:60px;top:2px" {FONT}>
  <g id="serce">{g_fazy}</g>
  <path id="drogaN" d="M 575 60 L 575 430 L 595 520 L 610 760 L 690 820 L 718 560 L 720 360 C 720 300 690 290 640 290 L 300 290" fill="none"/>
  <path id="drogaN2" d="M 455 1040 L 455 580 C 455 535 470 520 510 520 L 595 520 L 610 760 L 690 820 L 718 560 L 720 380 C 760 300 900 330 1040 330 L 1320 330" fill="none"/>
  <path id="drogaC" d="M 1340 432 L 1125 455 L 1010 500 L 990 780 L 950 860 L 860 600 L 845 300 C 845 190 910 150 990 150 C 1075 150 1125 205 1125 290 L 1125 380" fill="none"/>
  <path id="drogaC2" d="M 1340 572 L 1125 545 L 1010 520 L 980 800 L 930 880 L 855 620 L 845 280 L 880 60" fill="none"/>
  <g id="krwinki"></g>
 </svg>
 <div class="faza"><h2 id="fT"></h2><p id="fP"></p>
   <div style="position:relative"><div class="os"><div style="flex:4;background:#7b8a91">rozkurcz</div><div style="flex:1;background:#d08a3a">P</div><div style="flex:3;background:{CZERW}">skurcz komór</div></div><div class="wsk" id="wsk"></div></div>
   <p style="font-size:22px;color:#5b6266;margin-top:30px">Pokazujemy 4 razy wolniej niż naprawdę.<br>Jeden cykl trwa ok. 0,8 s.</p>
 </div>
 <svg class="ekg" viewBox="0 0 700 90"><path id="ekg" fill="none" stroke="{CZERW}" stroke-width="4" stroke-linejoin="round"/></svg>
</div>

<div class="ekran" id="e2">
 <svg viewBox="0 0 1800 1340" width="760" height="566" style="position:absolute;left:260px;top:40px" {FONT}>{krw}
  <path id="maly" d="M 690 840 L 420 840 L 420 250 L 1380 250 L 1380 640 L 1110 640" fill="none"/>
  <path id="duzy" d="M 1110 840 L 1500 840 L 1500 1160 L 300 1160 L 300 640 L 690 640" fill="none"/>
  <g id="krwinki2"></g></svg>
 <div class="napis" id="n2" style="background:rgba(255,253,248,.92);padding:6px 0"></div>
</div>

<div class="ekran tytul koniec" id="e3"><h1>Zapamiętaj</h1><ul style="text-align:left;max-width:980px">
 <li>Serce to pompa z mięśnia – ma 2 przedsionki i 2 komory.</li>
 <li>Zastawki sprawiają, że krew płynie tylko w jedną stronę.</li>
 <li>Krwiobieg mały: serce → płuca → serce (krew pobiera tlen).</li>
 <li>Krwiobieg duży: serce → całe ciało → serce (krew oddaje tlen).</li>
 <li>W spoczynku serce bije ok. 60–80 razy na minutę.</li></ul></div>
<script>
const SLOW = 4, CYKL = 0.8 * SLOW;
const FAZY = [[0, 0.4, "rozkurcz", "1. Rozkurcz", "Mięsień serca rozluźnia się. Krew z żył napływa do przedsionków i przez otwarte zastawki do komór."],
              [0.4, 0.5, "przedsionki", "2. Skurcz przedsionków", "Przedsionki kurczą się i dopychają resztę krwi do komór."],
              [0.5, 0.8, "komory", "3. Skurcz komór", "Komory kurczą się. Zastawki między przedsionkami a komorami zamykają się, a krew płynie do aorty i pnia płucnego."]];
const ns = "http://www.w3.org/2000/svg";
function krwinki(gid, drogi, n, r) {{
  const g = document.getElementById(gid), out = [];
  for (const [id, kol] of drogi) {{ const p = document.getElementById(id), L = p.getTotalLength();
    for (let i = 0; i < n; i++) {{ const c = document.createElementNS(ns, "ellipse"); c.setAttribute("rx", r); c.setAttribute("ry", r * 0.7);
      c.setAttribute("fill", kol); c.setAttribute("stroke", "#fff"); c.setAttribute("stroke-width", r * 0.25); g.appendChild(c); out.push({{c, p, L, o: i / n}}); }} }}
  return out;
}}
const K1 = krwinki("krwinki", [["drogaN", "{NIEB}"], ["drogaN2", "{NIEB}"], ["drogaC", "{CZERW}"], ["drogaC2", "{CZERW}"]], 9, 15);
const K2 = krwinki("krwinki2", [["maly", "{NIEB}"], ["duzy", "{CZERW}"]], 16, 18);
const ekg = t => {{ const x = (t % 0.8) / 0.8;            // uproszczony zapis EKG (P, QRS, T)
  return 0.15 * Math.exp(-(((x - 0.42) / 0.035) ** 2)) - 0.12 * Math.exp(-(((x - 0.5) / 0.008) ** 2)) + Math.exp(-(((x - 0.52) / 0.012) ** 2))
       - 0.2 * Math.exp(-(((x - 0.545) / 0.01) ** 2)) + 0.28 * Math.exp(-(((x - 0.72) / 0.045) ** 2)); }};
let postep = 0, ost = 0;
window.klatka = t => {{
  const e = t < 4 ? 0 : t < 27 ? 1 : t < 37 ? 2 : 3;
  for (let i = 0; i < 4; i++) document.getElementById("e" + i).style.display = i === e ? "block" : "none";
  if (e === 0 || e === 3) {{ document.getElementById("e" + e).style.display = "flex"; document.getElementById("e" + e).style.opacity = Math.min(1, (e === 0 ? 4 - t : t - 37) * 2 + (e === 0 ? 0 : 0)); }}
  if (e === 1) {{
    const tc = ((t - 4) % CYKL) / SLOW, f = FAZY.find(f => tc >= f[0] && tc < f[1]) || FAZY[2];
    for (const k of ["rozkurcz", "przedsionki", "komory"]) document.getElementById("f_" + k).style.display = k === f[2] ? "" : "none";
    document.getElementById("fT").textContent = f[3]; document.getElementById("fP").textContent = f[4];
    document.getElementById("wsk").style.left = (tc / 0.8 * 100) + "%";
    const dt = t - ost; ost = t; postep += dt * (f[2] === "komory" ? 0.075 : 0.03);
    for (const k of K1) {{ const pt = k.p.getPointAtLength(((k.o + postep) % 1) * k.L); k.c.setAttribute("cx", pt.x); k.c.setAttribute("cy", pt.y); }}
    let d = ""; for (let i = 0; i <= 140; i++) {{ const tt = (t - 4) / SLOW - 1.6 + i / 140 * 1.6; d += (i ? "L" : "M") + (i * 5) + " " + (70 - 60 * ekg(tt + 10)).toFixed(1) + " "; }}
    document.getElementById("ekg").setAttribute("d", d);
  }}
  if (e === 2) {{
    const dt = t - ost; ost = t; postep += dt * 0.06;
    for (const k of K2) {{ const pt = k.p.getPointAtLength(((k.o + postep) % 1) * k.L); k.c.setAttribute("cx", pt.x); k.c.setAttribute("cy", pt.y); }}
    document.getElementById("n2").textContent = t < 32 ? "Krwiobieg mały: krew z prawej komory płynie do płuc i wraca do lewego przedsionka." :
      "Krwiobieg duży: lewa komora tłoczy krew do całego ciała, a żyły główne oddają ją do prawego przedsionka.";
  }}
  if (e !== 1 && e !== 2) ost = t;
}};
window.klatka(0); window.gotowe = true;
</script></body></html>"""

if __name__ == "__main__":
    open(sys.argv[1] if len(sys.argv) > 1 else "/tmp/film.html", "w", encoding="utf-8").write(html())
