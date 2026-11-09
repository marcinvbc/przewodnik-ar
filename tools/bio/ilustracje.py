"""Ilustracje SVG do lekcji „Serce i układ krwionośny”.

Każda ilustracja ma grupy z klasami: .tytul, .podpisy, .strzalki, .legenda – dzięki temu okno czatu AI
w generatorze może je modyfikować (np. „bez podpisów” do kartkówki, „większe podpisy”).
Użycie: python3 ilustracje.py katalog
"""
import os, sys

NIEB, NIEB_J, CZERW, CZERW_J = "#3f63c9", "#7f9be6", "#c8372d", "#ec776c"
MIES, MIES_C, ZAST, INK = "#a9443a", "#7d2b24", "#fbf3e4", "#1f2a2e"
FONT = "font-family=\"'Segoe UI', Roboto, 'DejaVu Sans', Arial, sans-serif\""

def svg(w, h, body, tlo="#fffdf8"):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" {FONT}>
<defs>
 <marker id="grot" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{INK}"/></marker>
 <marker id="grotB" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#fff" stroke="{INK}" stroke-width="1.2"/></marker>
 <style>.podpisy text{{font-size:34px;font-weight:600;fill:{INK}}} .podpisy line,.podpisy path{{stroke:{INK};stroke-width:2.5;fill:none}}
 .tytul{{font-size:48px;font-weight:800;fill:{INK}}} .legenda text{{font-size:28px;fill:{INK}}} .male{{font-size:26px;font-weight:500;fill:#4a5357}}</style>
</defs>
<rect width="{w}" height="{h}" fill="{tlo}"/>
{body}
</svg>"""

def rura(d, kolor, w, obrys="#1f2a2e"):
    return f'<path d="{d}" fill="none" stroke="{obrys}" stroke-width="{w + 8}" stroke-linecap="round" stroke-linejoin="round"/>' \
           f'<path d="{d}" fill="none" stroke="{kolor}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'

def podpis(x, y, tekst, lx, ly, anchor="start"):
    dx = 12 if anchor == "start" else -12
    ex, ey = x - dx, y - 10
    if anchor == "start" and lx > x + 40: ex, ey = x + 30, y + 10      # punkt na prawo od tekstu: linia spod napisu
    return f'<line x1="{lx}" y1="{ly}" x2="{ex}" y2="{ey}"/><circle cx="{lx}" cy="{ly}" r="6" fill="{INK}"/>' \
           f'<text x="{x}" y="{y}" text-anchor="{anchor}">{tekst}</text>'

def strzalka(d, w=14):
    return f'<path d="{d}" fill="none" stroke="#fff" stroke-width="{w}" stroke-linecap="round" marker-end="url(#grotB)"/>'

# ------------------------------------------------------------------ 1. budowa serca
def serce_svg(x0=0, y0=0, s=1.0, podpisy=True, strzalki=True, faza=None):
    """Schematyczny przekrój serca. faza: None | 'rozkurcz' | 'przedsionki' | 'komory' (do cyklu pracy serca)."""
    sp = 0.9 if faza == "przedsionki" else 1.0
    sk = 0.86 if faza == "komory" else 1.0
    g = [f'<g transform="translate({x0},{y0}) scale({s})">']
    # naczynia za sercem
    g.append(rura("M 720 650 L 720 360 C 720 300 690 290 640 290 L 330 290", NIEB, 78))           # pień płucny → prawe płuco
    g.append(rura("M 720 380 C 760 300 900 330 1040 330 L 1290 330", NIEB, 70))                    # → lewe płuco
    g.append(rura("M 1125 455 L 1330 430", CZERW_J, 46)); g.append(rura("M 1125 545 L 1330 570", CZERW_J, 46))  # żyły płucne
    g.append(rura("M 455 1010 L 455 580 C 455 535 470 520 510 520", NIEB, 80))                     # żyła główna dolna
    g.append(rura("M 575 70 L 575 420", NIEB, 84))                                                    # żyła główna górna
    g.append(rura("M 845 650 L 845 300 C 845 190 910 150 990 150 C 1075 150 1125 205 1125 290 L 1125 370", CZERW, 92))   # aorta
    for d in ("M 905 175 L 880 60", "M 990 152 L 990 50", "M 1070 170 L 1100 62"):
        g.append(rura(d, CZERW, 34))
    # mięsień serca
    g.append(f'<path d="M 470 430 C 440 560 470 720 560 830 C 640 930 740 1000 820 1050 C 930 990 1060 900 1120 790 '
             f'C 1180 680 1190 540 1140 440 C 1100 370 1000 350 930 370 L 690 370 C 600 350 500 360 470 430 Z" '
             f'fill="{MIES}" stroke="{MIES_C}" stroke-width="8"/>')
    # jamy (przedsionki mogą się kurczyć w animacji cyklu)
    def jama(d, kolor, cx, cy, k):
        return f'<path d="{d}" fill="{kolor}" stroke="{MIES_C}" stroke-width="4" transform="translate({cx},{cy}) scale({k}) translate({-cx},{-cy})"/>'
    g.append(jama("M 500 440 C 500 405 520 395 550 395 L 650 395 C 680 395 690 412 690 440 L 690 565 C 690 590 672 600 645 600 L 545 600 C 517 600 500 585 500 560 Z", NIEB_J, 595, 600, sp))
    g.append(jama("M 905 440 C 905 420 915 410 935 410 L 1085 410 C 1112 410 1125 425 1125 455 L 1125 552 C 1125 576 1110 588 1085 588 L 940 588 C 915 588 905 572 905 548 Z", CZERW_J, 1015, 588, sp))
    g.append(jama("M 520 645 L 760 645 L 760 905 C 715 880 640 832 590 772 C 547 718 520 684 520 645 Z", NIEB_J, 640, 645, sk))
    g.append(jama("M 852 645 L 1078 645 C 1083 742 1043 832 982 902 C 932 957 882 990 852 1002 Z", CZERW_J, 965, 645, sk))
    # zastawki
    otw_pk = faza in (None, "rozkurcz", "przedsionki")
    for (x1, x2) in ((535, 655), (935, 1060)):
        if otw_pk:
            g.append(f'<path d="M {x1} 603 L {x1 + 30} 668 M {x2} 603 L {x2 - 30} 668" stroke="{ZAST}" stroke-width="13" stroke-linecap="round"/>')
        else:
            g.append(f'<path d="M {x1} 608 L {(x1 + x2) / 2 - 4} 628 M {x2} 608 L {(x1 + x2) / 2 + 4} 628" stroke="{ZAST}" stroke-width="13" stroke-linecap="round"/>')
    otw_t = faza == "komory"
    for x in (720, 845):     # zastawki pnia płucnego i aorty (półksiężycowate)
        if otw_t: g.append(f'<path d="M {x - 30} 650 L {x - 34} 590 M {x + 30} 650 L {x + 34} 590" stroke="{ZAST}" stroke-width="10" stroke-linecap="round"/>')
        else: g.append(f'<path d="M {x - 32} 640 Q {x} 610 {x + 32} 640" stroke="{ZAST}" stroke-width="10" fill="none" stroke-linecap="round"/>')
    if strzalki:
        a = ['<g class="strzalki">']
        if faza in (None, "rozkurcz", "przedsionki"):
            a += [strzalka("M 575 200 L 575 430"), strzalka("M 595 500 L 605 700"), strzalka("M 1250 440 L 1035 470"), strzalka("M 1010 520 L 990 720"),
                  strzalka("M 455 900 L 455 640")]
        if faza in (None, "komory"):
            a += [strzalka("M 680 820 L 718 560"), strzalka("M 718 450 L 718 340"), strzalka("M 950 860 L 860 560"), strzalka("M 870 330 L 920 210")]
        a.append("</g>")
        g += a
    if podpisy:
        p = ['<g class="podpisy">']
        p.append(podpis(250, 120, "żyła główna górna", 548, 160, "end"))
        p.append(podpis(250, 245, "do prawego płuca", 380, 290, "end"))
        p.append(podpis(1180, 70, "aorta", 1115, 230))
        p.append(podpis(1355, 300, "do lewego płuca", 1270, 330))
        p.append(podpis(1355, 450, "żyły płucne", 1300, 470))
        p.append(podpis(250, 470, "prawy przedsionek", 535, 470, "end"))
        p.append(podpis(1355, 610, "lewy przedsionek", 1090, 520))
        p.append(podpis(250, 640, "zastawka trójdzielna", 560, 640, "end"))
        p.append(podpis(1355, 720, "zastawka dwudzielna", 1050, 640))
        p.append(podpis(250, 800, "prawa komora", 600, 760, "end"))
        p.append(podpis(1355, 860, "lewa komora", 985, 800))
        p.append(podpis(1355, 980, "przegroda", 810, 900))
        p.append(podpis(250, 950, "żyła główna dolna", 430, 960, "end"))
        p.append(podpis(250, 360, "pień płucny", 705, 345, "end"))
        p.append("</g>")
        g += p
    g.append("</g>")
    return "\n".join(g)

def legenda(x, y):
    return f'''<g class="legenda" transform="translate({x},{y})">
<rect width="28" height="28" rx="6" fill="{CZERW}"/><text x="42" y="24">krew utlenowana (bogata w tlen)</text>
<rect y="44" width="28" height="28" rx="6" fill="{NIEB}"/><text x="42" y="68">krew odtlenowana (uboga w tlen)</text></g>'''

def budowa():
    body = serce_svg(150, 40) + f'<text class="tytul" x="60" y="1135">Budowa serca człowieka – przekrój</text>' \
           + legenda(1170, 1080) + '<text class="male" x="60" y="1175">Strona prawa i lewa – jak u osoby, która stoi zwrócona do nas przodem.</text>'
    return svg(1900, 1200, body)

# ------------------------------------------------------------------ 2. krwiobiegi
def krwiobiegi():
    b = ['<text class="tytul" x="60" y="80">Krwiobieg mały i duży</text>']
    b.append(f'<defs><linearGradient id="gPl" x1="0" x2="1"><stop offset="0.15" stop-color="{NIEB}"/><stop offset="0.85" stop-color="{CZERW}"/></linearGradient>'
             f'<linearGradient id="gCi" x1="0" x2="1"><stop offset="0.15" stop-color="{NIEB}"/><stop offset="0.85" stop-color="{CZERW}"/></linearGradient></defs>')
    # płuca i narządy ciała z siecią naczyń włosowatych
    for y, kol, obr, nap in ((160, "#f6d3cd", "#b56b62", "płuca"), (1070, "#f3e3c4", "#b89a62", "narządy całego ciała")):
        b.append(f'<rect x="560" y="{y}" width="680" height="180" rx="50" fill="{kol}" stroke="{obr}" stroke-width="5"/>')
        for k in range(8):
            yy = y + 40 + k * 14
            b.append(f'<path d="M 600 {y + 90} C 760 {yy - 30} 1040 {yy + 30} 1200 {y + 90}" stroke="url(#gPl)" stroke-width="5" fill="none"/>')
    # serce: 4 jamy
    X, Y, W, H = 700, 560, 400, 380
    b.append(f'<rect x="{X - 18}" y="{Y - 18}" width="{W + 36}" height="{H + 36}" rx="40" fill="{MIES}" stroke="{MIES_C}" stroke-width="6"/>')
    for t, x, y, c in (("prawy\nprzedsionek", X, Y, NIEB_J), ("lewy\nprzedsionek", X + W / 2 + 8, Y, CZERW_J),
                       ("prawa\nkomora", X, Y + H / 2 + 8, NIEB_J), ("lewa\nkomora", X + W / 2 + 8, Y + H / 2 + 8, CZERW_J)):
        b.append(f'<rect x="{x}" y="{y}" width="{W / 2 - 8}" height="{H / 2 - 8}" rx="22" fill="{c}"/>')
        for i, line in enumerate(t.split("\n")):
            b.append(f'<text x="{x + (W / 2 - 8) / 2}" y="{y + 70 + i * 36}" text-anchor="middle" font-size="29" font-weight="700" fill="{INK}">{line}</text>')
    # krwiobieg mały: prawa komora → płuca → lewy przedsionek
    b.append(rura("M 690 840 L 470 840 Q 420 840 420 790 L 420 300 Q 420 250 470 250 L 590 250", NIEB, 40))
    b.append(rura("M 1210 250 L 1330 250 Q 1380 250 1380 300 L 1380 590 Q 1380 640 1330 640 L 1110 640", CZERW, 40))
    # krwiobieg duży: lewa komora → ciało → prawy przedsionek
    b.append(rura("M 1110 840 L 1450 840 Q 1500 840 1500 890 L 1500 1105 Q 1500 1160 1450 1160 L 1210 1160", CZERW, 44))
    b.append(rura("M 590 1160 L 350 1160 Q 300 1160 300 1105 L 300 690 Q 300 640 350 640 L 690 640", NIEB, 44))
    b.append(rura("M 690 840 L 470 840 Q 420 840 420 790 L 420 600", NIEB, 40))      # most nad żyłami głównymi
    b += ['<g class="strzalki">', strzalka("M 420 560 L 420 420"), strzalka("M 1380 380 L 1380 520"), strzalka("M 1500 930 L 1500 1060"),
          strzalka("M 300 1060 L 300 900"), strzalka("M 800 692 L 800 800"), strzalka("M 1000 692 L 1000 800"),
          strzalka("M 520 250 L 575 250", 10), strzalka("M 1240 1160 L 1220 1160", 10), '</g>']
    b += ['<g class="podpisy">',
          '<text x="900" y="145" text-anchor="middle">płuca</text>',
          '<text x="900" y="1300" text-anchor="middle">narządy całego ciała</text>',
          f'<text x="380" y="470" text-anchor="end" style="fill:{NIEB}">tętnice płucne</text>',
          f'<text x="1425" y="470" style="fill:{CZERW}">żyły płucne</text>',
          f'<text x="1545" y="1000" style="fill:{CZERW}">aorta</text>',
          f'<text x="255" y="1000" text-anchor="end" style="fill:{NIEB}">żyły główne</text>',
          '<text x="900" y="395" text-anchor="middle" class="male">w płucach krew oddaje CO₂ i pobiera O₂</text>',
          '<text x="900" y="1040" text-anchor="middle" class="male">komórki ciała pobierają O₂ i składniki odżywcze, oddają CO₂</text>',
          '</g>']
    b.append(f'''<g class="legenda" transform="translate(60,1360)">
<rect width="800" height="120" rx="20" fill="#eef3ff" stroke="{NIEB}" stroke-width="3"/>
<text x="24" y="48" font-weight="800" style="font-size:30px">Krwiobieg mały (płucny)</text>
<text x="24" y="92">prawa komora → płuca → lewy przedsionek</text>
<rect x="880" width="860" height="120" rx="20" fill="#fff0ee" stroke="{CZERW}" stroke-width="3"/>
<text x="904" y="48" font-weight="800" style="font-size:30px">Krwiobieg duży (ogólny)</text>
<text x="904" y="92">lewa komora → całe ciało → prawy przedsionek</text></g>''')
    return svg(1800, 1520, "\n".join(b))

# ------------------------------------------------------------------ 3. naczynia
def naczynia():
    b = ['<text class="tytul" x="60" y="80">Naczynia krwionośne – porównanie</text>']
    cx = [330, 900, 1470]
    # tętnica
    b.append(f'<circle cx="{cx[0]}" cy="380" r="200" fill="#f1e2bf" stroke="#b89a62" stroke-width="4"/>'
             f'<circle cx="{cx[0]}" cy="380" r="172" fill="#cf5a50"/><circle cx="{cx[0]}" cy="380" r="98" fill="#fbe4df"/>'
             f'<circle cx="{cx[0]}" cy="380" r="88" fill="{CZERW_J}"/>')
    # żyła (spłaszczona, cienka ściana)
    b.append(f'<ellipse cx="{cx[1]}" cy="380" rx="215" ry="150" fill="#f1e2bf" stroke="#b89a62" stroke-width="4"/>'
             f'<ellipse cx="{cx[1]}" cy="380" rx="198" ry="134" fill="#9a86c9"/><ellipse cx="{cx[1]}" cy="380" rx="182" ry="120" fill="#fbe4df"/>'
             f'<ellipse cx="{cx[1]}" cy="380" rx="174" ry="112" fill="{NIEB_J}"/>'
             f'<path d="M {cx[1] - 170} 340 Q {cx[1] - 40} 380 {cx[1] - 10} 470 M {cx[1] + 170} 340 Q {cx[1] + 40} 380 {cx[1] + 10} 470" stroke="{ZAST}" stroke-width="12" fill="none" stroke-linecap="round"/>')
    # włosowate: pojedyncza warstwa, krwinki gęsiego
    b.append(f'<rect x="{cx[2] - 230}" y="330" width="460" height="100" rx="50" fill="#fbe4df" stroke="#d99b92" stroke-width="10"/>')
    for k in range(5):
        b.append(f'<ellipse cx="{cx[2] - 160 + k * 80}" cy="380" rx="26" ry="36" fill="{CZERW}"/>')
    for k in range(6):
        b.append(f'<line x1="{cx[2] - 210 + k * 84}" y1="322" x2="{cx[2] - 210 + k * 84}" y2="338" stroke="#b5776f" stroke-width="4"/>')
    b.append('<g class="podpisy">')
    for x, t in zip(cx, ("Tętnica", "Żyła", "Naczynie włosowate")):
        b.append(f'<text x="{x}" y="660" text-anchor="middle" style="font-size:42px;font-weight:800">{t}</text>')
    b.append(podpis(40, 160, "tkanka łączna", cx[0] - 150, 260)); b.append(podpis(520, 150, "mięśnie gładkie", cx[0] + 120, 270))
    b.append(podpis(1060, 160, "zastawka", cx[1] + 60, 420)); b.append(podpis(1160, 250, "nabłonek (1 warstwa)", cx[2] - 120, 330))
    b.append('</g>')
    opisy = [["grube, sprężyste ściany", "wytrzymują wysokie ciśnienie", "prowadzą krew OD serca", "wyczuwamy w nich tętno"],
             ["cienkie ściany", "niskie ciśnienie", "mają zastawki – krew nie cofa się", "prowadzą krew DO serca"],
             ["ściana z jednej warstwy komórek", "bardzo cienkie – krwinki płyną gęsiego", "tu zachodzi wymiana gazów", "i substancji z komórkami"]]
    for x, lst in zip(cx, opisy):
        for i, t in enumerate(lst):
            b.append(f'<text x="{x}" y="{730 + i * 44}" text-anchor="middle" font-size="31" fill="{INK}">• {t}</text>')
    return svg(1800, 940, "\n".join(b))

# ------------------------------------------------------------------ 4. składniki krwi
def krew():
    b = ['<text class="tytul" x="60" y="80">Skład krwi</text>']
    # probówka
    b.append('<path d="M 180 160 L 180 820 C 180 900 360 900 360 820 L 360 160" fill="#fff" stroke="#55636a" stroke-width="8"/>')
    b.append('<path d="M 186 470 L 186 820 C 186 892 354 892 354 820 L 354 470 Z" fill="#b3241c"/>')
    b.append('<rect x="186" y="455" width="168" height="16" fill="#f4efe6"/>')
    b.append('<rect x="186" y="200" width="168" height="255" fill="#f6d77a"/>')
    b.append('<g class="podpisy">' + podpis(420, 320, "osocze ok. 55%", 300, 320) + podpis(420, 470, "krwinki białe i płytki <1%", 300, 463)
             + podpis(420, 680, "krwinki czerwone ok. 45%", 300, 680) + '</g>')
    # karty składników
    karty = [
        ("Krwinki czerwone", "erytrocyty", ["transportują tlen (hemoglobina)", "nie mają jądra komórkowego", "kształt dwuwklęsłego krążka"], "ery"),
        ("Krwinki białe", "leukocyty", ["bronią organizmu", "przed drobnoustrojami", "mają jądro komórkowe"], "leu"),
        ("Płytki krwi", "trombocyty", ["biorą udział", "w krzepnięciu krwi", "– zatrzymują krwawienie"], "pl"),
        ("Osocze", "ok. 90% wody", ["przenosi składniki odżywcze,", "CO₂, hormony i zbędne", "produkty przemiany materii"], "os"),
    ]
    for i, (t, t2, lst, ik) in enumerate(karty):
        x, y = 900 + (i % 2) * 450, 150 + (i // 2) * 400
        b.append(f'<rect x="{x}" y="{y}" width="420" height="370" rx="28" fill="#fff" stroke="#e3dccd" stroke-width="4"/>')
        cx, cy = x + 210, y + 105
        if ik == "ery":
            b.append(f'<ellipse cx="{cx}" cy="{cy}" rx="78" ry="62" fill="#c9302a"/><ellipse cx="{cx}" cy="{cy}" rx="36" ry="28" fill="#e46a60"/>')
        elif ik == "leu":
            b.append(f'<circle cx="{cx}" cy="{cy}" r="72" fill="#efe9fb" stroke="#a495cf" stroke-width="5"/>'
                     f'<path d="M {cx - 40} {cy - 6} q 20 -40 42 -6 q 22 -34 40 6 q -10 40 -40 22 q -30 22 -42 -22 z" fill="#7a5bb5"/>')
        elif ik == "pl":
            for k, (dx, dy) in enumerate(((-50, -10), (0, 20), (46, -18), (10, -40))):
                b.append(f'<ellipse cx="{cx + dx}" cy="{cy + dy}" rx="20" ry="13" fill="#d99ac5" transform="rotate({k * 40} {cx + dx} {cy + dy})"/>')
        else:
            b.append(f'<path d="M {cx} {cy - 70} C {cx + 60} {cy} {cx + 50} {cy + 60} {cx} {cy + 62} C {cx - 50} {cy + 60} {cx - 60} {cy} {cx} {cy - 70} Z" fill="#f6d77a"/>')
        b.append(f'<text x="{x + 210}" y="{y + 222}" text-anchor="middle" font-size="34" font-weight="800" fill="{INK}">{t}</text>')
        b.append(f'<text x="{x + 210}" y="{y + 256}" text-anchor="middle" class="male">{t2}</text>')
        for k, line in enumerate(lst):
            b.append(f'<text x="{x + 210}" y="{y + 298 + k * 30}" text-anchor="middle" font-size="25" fill="{INK}">{line}</text>')
    return svg(1800, 960, "\n".join(b))

# ------------------------------------------------------------------ 5. cykl pracy serca
def cykl():
    b = ['<text class="tytul" x="60" y="80">Cykl pracy serca (ok. 0,8 s)</text>']
    fazy = [("rozkurcz", "1. Rozkurcz", "krew napływa do przedsionków i komór", "ok. 0,4 s"),
            ("przedsionki", "2. Skurcz przedsionków", "przedsionki dopychają krew do komór", "ok. 0,1 s"),
            ("komory", "3. Skurcz komór", "zastawki przedsionkowo-komorowe zamykają się,\nkrew płynie do aorty i pnia płucnego", "ok. 0,3 s")]
    for i, (f, t, op, czas) in enumerate(fazy):
        x = 40 + i * 600
        b.append(f'<rect x="{x}" y="120" width="560" height="760" rx="30" fill="#fff" stroke="#e3dccd" stroke-width="4"/>')
        b.append(serce_svg(x - 70, 150, 0.46, podpisy=False, strzalki=True, faza=f))
        b.append(f'<text x="{x + 280}" y="720" text-anchor="middle" font-size="36" font-weight="800" fill="{INK}">{t}</text>')
        for k, line in enumerate(op.split("\n")):
            b.append(f'<text x="{x + 280}" y="{770 + k * 34}" text-anchor="middle" font-size="25" fill="{INK}">{line}</text>')
        b.append(f'<text x="{x + 280}" y="{850}" text-anchor="middle" class="male">{czas}</text>')
    return svg(1840, 920, "\n".join(b))

ILUSTRACJE = {"budowa-serca": budowa, "krwiobiegi": krwiobiegi, "naczynia-porownanie": naczynia, "sklad-krwi": krew, "cykl-pracy-serca": cykl}

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/il"
    os.makedirs(out, exist_ok=True)
    for k, fn in ILUSTRACJE.items():
        open(os.path.join(out, k + ".svg"), "w", encoding="utf-8").write(fn())
        print(k)
