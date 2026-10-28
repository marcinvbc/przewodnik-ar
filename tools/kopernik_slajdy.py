"""Slajdy (PDF) i ilustracje do lekcji pokazowej o Koperniku.
Fakty: torun.pl (pomnik, biografia), Archiwum PAN, materiały UŁ (De revolutionibus, Norymberga 1543).
Uruchom: python3 kopernik_slajdy.py ../lekcje/pokazowa"""
import math, os, sys
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader

OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/kop"
os.makedirs(OUT, exist_ok=True)
D = "/usr/share/fonts/truetype/dejavu/"
pdfmetrics.registerFont(TTFont("R", D + "DejaVuSans.ttf")); pdfmetrics.registerFont(TTFont("B", D + "DejaVuSans-Bold.ttf")); pdfmetrics.registerFont(TTFont("S", D + "DejaVuSerif-Bold.ttf"))
F = lambda n, s: ImageFont.truetype(D + n, s)
NAVY, GOLD, CREAM, INK, RED = (20, 30, 58), (224, 168, 60), (247, 241, 228), (31, 42, 46), (190, 70, 45)

# ------------------------------------------------------------------ ilustracje (PIL, 2x i zmniejszenie = gładkie krawędzie)
def schemat(geo, path, W=1200, H=900):
    S = 2; im = Image.new("RGB", (W * S, H * S), (16, 24, 50)); d = ImageDraw.Draw(im)
    import random; r = random.Random(3)
    for _ in range(220):
        x, y, s = r.uniform(0, W * S), r.uniform(0, H * S), r.uniform(1, 3.5)
        d.ellipse([x - s, y - s, x + s, y + s], fill=(200, 205, 225))
    cx, cy = W * S / 2, H * S / 2 + 30 * S
    def orb(R, col=(90, 105, 150)): d.ellipse([cx - R, cy - R, cx + R, cy + R], outline=col, width=3 * S)
    def ball(x, y, R, col, label=None, lc=(220, 225, 240)):
        d.ellipse([x - R, y - R, x + R, y + R], fill=col)
        if label: d.text((x, y + R + 14 * S), label, font=F("DejaVuSans-Bold.ttf", 26 * S), fill=lc, anchor="mt")
    if geo:
        names = [("Księżyc", 90, (190, 190, 190), 9), ("Merkury", 140, (170, 165, 160), 8), ("Wenus", 185, (230, 205, 140), 11),
                 ("Słońce", 245, (255, 196, 60), 26), ("Mars", 300, (225, 95, 60), 10), ("Jowisz", 345, (210, 170, 125), 17), ("Saturn", 390, (225, 205, 150), 15)]
        for i, (n, R, c, rr) in enumerate(names):
            orb(R * S); a = -2.4 + i * 0.83
            ball(cx + R * S * math.cos(a), cy + R * S * math.sin(a), rr * S, c, n)
        # epicykl Marsa
        a = -2.4 + 4 * 0.83; mx, my = cx + 300 * S * math.cos(a), cy + 300 * S * math.sin(a)
        d.ellipse([mx - 45 * S, my - 45 * S, mx + 45 * S, my + 45 * S], outline=(225, 95, 60), width=3 * S)
        ball(cx, cy, 30 * S, (70, 140, 230), "ZIEMIA", (120, 190, 255))
        title, sub = "Model geocentryczny", "Ziemia w środku · Ptolemeusz, ok. II w."
    else:
        names = [("Merkury", 80, (170, 165, 160), 8), ("Wenus", 125, (230, 205, 140), 11), ("Ziemia", 175, (70, 140, 230), 13),
                 ("Mars", 230, (225, 95, 60), 10), ("Jowisz", 310, (210, 170, 125), 19), ("Saturn", 385, (225, 205, 150), 16)]
        for i, (n, R, c, rr) in enumerate(names):
            orb(R * S); a = -2.2 + i * 1.05
            x, y = cx + R * S * math.cos(a), cy + R * S * math.sin(a)
            ball(x, y, rr * S, c, n, (120, 190, 255) if n == "Ziemia" else (220, 225, 240))
            if n == "Ziemia":
                d.ellipse([x - 32 * S, y - 32 * S, x + 32 * S, y + 32 * S], outline=(160, 160, 170), width=2 * S)
                d.ellipse([x + 26 * S, y - 6 * S, x + 38 * S, y + 6 * S], fill=(200, 200, 200))
        for k in range(16):
            a = k * math.pi / 8; d.line([cx + 38 * S * math.cos(a), cy + 38 * S * math.sin(a), cx + 58 * S * math.cos(a), cy + 58 * S * math.sin(a)], fill=(255, 196, 60), width=4 * S)
        ball(cx, cy, 34 * S, (255, 196, 60), "SŁOŃCE", (255, 210, 110))
        title, sub = "Model heliocentryczny", "Słońce w środku · Mikołaj Kopernik, 1543"
    d.text((W * S / 2, 46 * S), title, font=F("DejaVuSerif-Bold.ttf", 52 * S), fill=(245, 245, 250), anchor="mt")
    d.text((W * S / 2, 112 * S), sub, font=F("DejaVuSans.ttf", 28 * S), fill=GOLD, anchor="mt")
    im.resize((W, H), Image.LANCZOS).save(path, quality=88)

def os_czasu(path, W=1600, H=700):
    S = 2; im = Image.new("RGB", (W * S, H * S), CREAM); d = ImageDraw.Draw(im)
    d.text((W * S / 2, 50 * S), "Oś czasu: Kopernik i Toruń", font=F("DejaVuSerif-Bold.ttf", 54 * S), fill=INK, anchor="mt")
    y = 380 * S; x0, x1 = 90 * S, (W - 90) * S
    d.line([x0, y, x1, y], fill=INK, width=6 * S)
    ev = [("1473", "narodziny\nw Toruniu"), ("ok. 1491", "studia\nw Krakowie"), ("1496", "studia\nw Bolonii"), ("1503", "doktorat\nw Ferrarze"),
          ("1543", "„De revolutionibus”\nśmierć we Fromborku"), ("1853", "pomnik w Toruniu"), ("2023", "550. rocznica\nurodzin")]
    for i, (yr, t) in enumerate(ev):
        x = x0 + (x1 - x0) * (i + 0.5) / len(ev); up = i % 2 == 0
        col = RED if yr in ("1543", "1853") else NAVY
        d.ellipse([x - 20 * S, y - 20 * S, x + 20 * S, y + 20 * S], fill=col, outline=CREAM, width=5 * S)
        d.text((x, y + (-62 if up else 50) * S), yr, font=F("DejaVuSans-Bold.ttf", 38 * S), fill=col, anchor="mb" if up else "mt")
        d.multiline_text((x, y + (-120 if up else 108) * S), t, font=F("DejaVuSans.ttf", 25 * S), fill=INK, anchor="md" if up else "ma", align="center", spacing=6 * S)
    im.resize((W, H), Image.LANCZOS).save(path, quality=90)

def sfera_ikona(size=600):
    S = 2; im = Image.new("RGBA", (size * S, size * S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    c = size * S / 2; R = size * S * 0.32; g = (205, 150, 55, 255)
    for k, (sx, sy, rot) in enumerate(((1, 1, 0), (1, 0.3, 0), (0.3, 1, 0), (1, 0.32, 0.41))):
        bb = [c - R * sx, c - R * sy - 20 * S, c + R * sx, c + R * sy - 20 * S]
        layer = Image.new("RGBA", im.size, (0, 0, 0, 0)); ImageDraw.Draw(layer).ellipse(bb, outline=g, width=9 * S)
        if rot: layer = layer.rotate(math.degrees(rot), center=(c, c - 20 * S))
        im.alpha_composite(layer)
    d.ellipse([c - 30 * S, c - 50 * S, c + 30 * S, c + 10 * S], fill=(70, 140, 230, 255))
    d.line([c - R * 0.8, c + R * 0.9, c + R * 0.8, c - R * 1.3], fill=g, width=6 * S)
    d.polygon([(c - 70 * S, size * S * 0.93), (c + 70 * S, size * S * 0.93), (c + 22 * S, c + R * 0.95), (c - 22 * S, c + R * 0.95)], fill=(120, 74, 42, 255))
    return im.resize((size, size), Image.LANCZOS)

# ------------------------------------------------------------------ PDF
def slajdy(pdf):
    W, H = 960, 540
    c = canvas.Canvas(pdf, pagesize=(W, H)); c.setTitle("Mikołaj Kopernik – astronom z Torunia"); c.setAuthor("Lekcja AR")
    def rgb(t): return tuple(v / 255 for v in t)
    def tlo(dark=False):
        c.setFillColorRGB(*rgb(NAVY if dark else CREAM)); c.rect(0, 0, W, H, fill=1, stroke=0)
        c.setFillColorRGB(*rgb(GOLD)); c.rect(0, 0, W, 8, fill=1, stroke=0)
    def tytul(t, sub=None, dark=False):
        c.setFillColorRGB(*rgb((245, 245, 250) if dark else INK)); c.setFont("S", 34); c.drawString(50, H - 72, t)
        if sub: c.setFont("R", 15); c.setFillColorRGB(*rgb(GOLD if dark else RED)); c.drawString(52, H - 96, sub)
    def punkty(items, x=52, y=H - 140, w=470, size=17, dark=False):
        c.setFont("R", size); col = (230, 232, 240) if dark else INK
        for it in items:
            c.setFillColorRGB(*rgb(GOLD)); c.circle(x + 4, y + 5, 3.5, fill=1, stroke=0)
            c.setFillColorRGB(*rgb(col))
            words = it.split(); line = ""; first = True
            for wd in words:
                if c.stringWidth((line + " " + wd).strip(), "R", size) > w:
                    c.drawString(x + 16, y, line); y -= size * 1.32; line = wd
                else: line = (line + " " + wd).strip()
            c.drawString(x + 16, y, line); y -= size * 1.32 + 9
        return y
    def nr(i, dark=False):
        c.setFont("R", 10); c.setFillColorRGB(*rgb((150, 160, 185) if dark else (120, 120, 110))); c.drawRightString(W - 30, 20, f"Mikołaj Kopernik · {i}/8")
    img = lambda p, x, y, w, h: c.drawImage(ImageReader(p), x, y, w, h, mask="auto")

    # 1
    tlo(True); c.setFillColorRGB(*rgb((245, 245, 250))); c.setFont("S", 54); c.drawString(60, 300, "Mikołaj Kopernik")
    c.setFont("R", 24); c.setFillColorRGB(*rgb(GOLD)); c.drawString(62, 258, "Astronom z Torunia, który „poruszył Ziemię”")
    c.setFont("R", 15); c.setFillColorRGB(*rgb((180, 190, 215))); c.drawString(62, 220, "Lekcja w rozszerzonej rzeczywistości · historia i astronomia")
    img(os.path.join(OUT, "model-heliocentryczny.jpg"), 600, 120, 320, 240); nr(1, True); c.showPage()
    # 2
    tlo(); tytul("Kim był Mikołaj Kopernik?", "1473–1543 · człowiek renesansu")
    punkty(["Urodził się 19 lutego 1473 r. w Toruniu, w rodzinie kupieckiej.",
            "Studiował sztuki wyzwolone w Krakowie, prawo w Bolonii i medycynę w Padwie.",
            "Doktorat z prawa kanonicznego uzyskał w Ferrarze.",
            "Był członkiem warmińskiej kapituły katedralnej; większość życia spędził we Fromborku.",
            "Astronom, matematyk, lekarz, prawnik i ekonomista.",
            "Zmarł w 1543 r. we Fromborku."], w=560)
    img(os.path.join(OUT, "os-czasu.jpg"), 640, 150, 290, 127); nr(2); c.showPage()
    # 3
    tlo(); tytul("Świat przed Kopernikiem", "Model geocentryczny – Ziemia w środku")
    punkty(["Ziemia stoi nieruchomo w środku świata.", "Słońce, Księżyc i planety krążą wokół Ziemi.",
            "Żeby wyjaśnić dziwny ruch planet, dodawano „koła na kołach”, czyli epicykle.",
            "Model opisał Ptolemeusz ok. II w. n.e.; obowiązywał przez około 1400 lat."], w=430)
    img(os.path.join(OUT, "model-geocentryczny.jpg"), 520, 70, 400, 300); nr(3); c.showPage()
    # 4
    tlo(); tytul("Rewolucja Kopernika", "Model heliocentryczny – Słońce w środku")
    punkty(["W środku jest Słońce, a Ziemia jest jedną z planet.", "Ziemia obiega Słońce w ciągu roku.",
            "Ziemia obraca się wokół własnej osi raz na dobę – stąd wschody i zachody Słońca.",
            "Pozorne „cofanie się” planet to skutek ruchu samej Ziemi."], w=430)
    img(os.path.join(OUT, "model-heliocentryczny.jpg"), 520, 70, 400, 300); nr(4); c.showPage()
    # 5
    tlo(True); tytul("„O obrotach sfer niebieskich”", "De revolutionibus orbium coelestium", dark=True)
    punkty(["Najważniejsze dzieło Kopernika.", "Pierwsze wydanie ukazało się w Norymberdze w 1543 r. – w roku śmierci autora.",
            "Zmieniło sposób myślenia o budowie Wszechświata.", "Na pracach Kopernika oparli się później m.in. Kepler, Heweliusz i Newton."], w=500, dark=True)
    c.setFillColorRGB(*rgb((120, 60, 40))); c.roundRect(650, 120, 220, 290, 10, fill=1, stroke=0)
    c.setFillColorRGB(*rgb((240, 228, 200))); c.roundRect(668, 136, 186, 258, 6, fill=1, stroke=0)
    c.setFillColorRGB(*rgb(INK)); c.setFont("S", 17); c.drawCentredString(761, 340, "DE"); c.drawCentredString(761, 318, "REVOLUTIONIBUS"); c.setFont("R", 11); c.drawCentredString(761, 296, "ORBIUM COELESTIUM")
    c.setFont("R", 12); c.drawCentredString(761, 160, "Norymberga · 1543"); c.setStrokeColorRGB(*rgb(GOLD)); c.circle(761, 228, 34, stroke=1, fill=0); c.circle(761, 228, 6, stroke=0, fill=1)
    nr(5, True); c.showPage()
    # 6
    tlo(); tytul("Pomnik Kopernika w Toruniu", "Rynek Staromiejski, przy ratuszu")
    punkty(["Stoi w południowo-wschodnim narożniku Rynku Staromiejskiego.", "Odsłonięto go 25 października 1853 r.",
            "Autorzy: berlińscy rzeźbiarze Christian Friedrich Tieck i Johann Heinrich Strack.",
            "Pomnik odlano z brązu w Berlinie, w odlewni Heinricha Fischera.", "W 2023 r. wpisano go do rejestru zabytków."], w=520)
    c.setFillColorRGB(*rgb((150, 140, 125))); c.rect(700, 70, 160, 40, fill=1, stroke=0); c.rect(722, 110, 116, 150, fill=1, stroke=0); c.rect(712, 260, 136, 16, fill=1, stroke=0)
    c.setFillColorRGB(*rgb(GOLD)); c.setFont("B", 9); c.drawCentredString(780, 200, "NICOLAUS"); c.drawCentredString(780, 188, "COPERNICUS")
    img_s = sfera_ikona(); img_s.save(os.path.join(OUT, "_sfera.png")); img(os.path.join(OUT, "_sfera.png"), 715, 280, 130, 130)
    c.setFont("R", 10); c.setFillColorRGB(*rgb((110, 105, 95))); c.drawCentredString(780, 52, "schemat: cokół i sfera armilarna")
    nr(6); c.showPage()
    # 7
    tlo(); tytul("Co trzyma Kopernik na pomniku?", "Sferę armilarną – model nieba")
    punkty(["W lewej ręce trzyma sferę armilarną – przyrząd pokazujący ruch nieba; prawą wskazuje niebo.",
            "Na cokole widnieje złocony łaciński napis: „Mikołaj Kopernik Torunianin. Ruszył Ziemię, wstrzymał Słońce i Niebo”.",
            "Autorem napisu był toruński profesor Rudolf Brohm.",
            "Torunianie często umawiają się „pod Kopernikiem”."], w=540)
    img(os.path.join(OUT, "_sfera.png"), 650, 110, 270, 270); nr(7); c.showPage()
    # 8
    tlo(True); tytul("Podsumowanie", "Co zapamiętamy?", dark=True)
    y = punkty(["Kopernik urodził się w Toruniu w 1473 r.", "Umieścił Słońce w środku układu planet (heliocentryzm).",
                "Ziemia krąży wokół Słońca i obraca się wokół własnej osi.", "Jego pomnik z 1853 r. stoi na toruńskim Rynku Staromiejskim."], w=600, dark=True)
    c.setFillColorRGB(*rgb(GOLD)); c.setFont("B", 18); c.drawString(52, 110, "Pytanie do dyskusji:")
    c.setFillColorRGB(*rgb((235, 236, 242))); c.setFont("R", 17); c.drawString(52, 84, "Dlaczego ludziom tak trudno było uwierzyć, że to Ziemia się porusza?")
    nr(8, True); c.showPage(); c.save()

schemat(True, os.path.join(OUT, "model-geocentryczny.jpg"))
schemat(False, os.path.join(OUT, "model-heliocentryczny.jpg"))
os_czasu(os.path.join(OUT, "os-czasu.jpg"))
slajdy(os.path.join(OUT, "kopernik-slajdy.pdf"))
os.remove(os.path.join(OUT, "_sfera.png"))
print("ok", sorted(os.listdir(OUT)))
