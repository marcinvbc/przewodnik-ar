"""Mata stanowiska RFID (A4 poziomo, 300 dpi) ze znacznikiem AR i obrysami elementów układu.
Geometria musi się zgadzać z lekcje/rfid/uklad.js (MATA, BB, MCU, moduł czytnika, przekaźnik).
Wynik: lekcje/rfid/znacznik-rfid.jpg, lekcje/rfid/mata-rfid.pdf, lekcje/rfid/mata-rfid.png (podgląd / tekstura)."""
import math, random, os
from PIL import Image, ImageDraw, ImageFont

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(REPO, "lekcje", "rfid")
DPI = 300; MM = DPI / 25.4
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"; FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
font = lambda s, b=False: ImageFont.truetype(FB if b else F, int(s * MM))

# ---------- znacznik (dużo narożników i kontrastu = stabilne śledzenie)
rnd = random.Random(1356); W = 1000
zn = Image.new("RGB", (W, W), "#f2f5f7"); d = ImageDraw.Draw(zn)
pal = ["#0d3b66", "#1e88e5", "#f4a259", "#c0392b", "#2e7d32", "#16232a", "#8e44ad"]
for i in range(0, W, 50): d.line([(i, 0), (i, W)], fill="#dde4ea", width=2); d.line([(0, i), (W, i)], fill="#dde4ea", width=2)
for _ in range(260):
    c = rnd.choice(pal); x, y = rnd.randrange(W), rnd.randrange(W); r = rnd.randrange(8, 52); k = rnd.random()
    if k < .3: d.ellipse([x - r, y - r, x + r, y + r], fill=c)
    elif k < .6: d.polygon([(x + r * math.cos(a), y + r * math.sin(a)) for a in [rnd.uniform(0, 6.3) for _ in range(3)]], fill=c)
    elif k < .8: d.rectangle([x, y, x + r * 1.5, y + r * .7], fill=c)
    else: a = rnd.uniform(0, 3.14); d.line([(x, y), (x + 2 * r * math.cos(a), y + 2 * r * math.sin(a))], fill=c, width=rnd.randrange(4, 12))
for _ in range(380):
    x, y = rnd.randrange(W), rnd.randrange(W); r = rnd.randrange(2, 6); d.ellipse([x - r, y - r, x + r, y + r], fill=rnd.choice(["#fff", "#16232a"]))
cx = cy = W // 2; R = 270
d.rounded_rectangle([cx - R, cy - R, cx + R, cy + R], radius=60, fill="#16232a"); d.rounded_rectangle([cx - R + 22, cy - R + 22, cx + R - 22, cy + R - 22], radius=44, fill="#fbfcfd")
for i in range(4):   # fale RFID – asymetryczne, żeby orientacja była jednoznaczna
    rr = 60 + i * 52; d.arc([cx - 150 - rr, cy - rr, cx - 150 + rr, cy + rr], -50, 50, fill=pal[i % 3], width=22)
d.rectangle([cx - 200, cy - 70, cx - 120, cy + 70], fill="#c0392b"); d.text((cx + 10, cy + 120), "RFID", font=ImageFont.truetype(FB, 110), fill="#16232a", anchor="mm")
d.polygon([(cx + 150, cy - 210), (cx + 230, cy - 130), (cx + 150, cy - 130)], fill="#f4a259")
zn.save(os.path.join(OUT, "znacznik-rfid.jpg"), quality=92)

# ---------- mata A4
SW, SH = 297, 210; ZN = (12, 12, 62); POLE = (30, 88)
im = Image.new("RGB", (round(SW * MM), round(SH * MM)), "white"); g = ImageDraw.Draw(im)
px = lambda x, y: (round(x * MM), round(y * MM))
def rect(x0, y0, x1, y1, kol="#16232a", w=0.6, kreski=False, fill=None):
    if fill: g.rectangle([px(x0, y0), px(x1, y1)], fill=fill)
    if not kreski: g.rectangle([px(x0, y0), px(x1, y1)], outline=kol, width=round(w * MM)); return
    for (a, b) in [((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x1, y1), (x0, y1)), ((x0, y1), (x0, y0))]:
        L = math.dist(a, b); n = int(L / 4)
        for i in range(0, n, 2): t0, t1 = i / n, min(1, (i + 1) / n); g.line([px(a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0), px(a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1)], fill=kol, width=round(w * MM))
def txt(x, y, s, r=3.2, b=False, kol="#16232a", a="la"): g.text(px(x, y), s, font=font(r, b), fill=kol, anchor=a)
im.paste(zn.resize((round(ZN[2] * MM), round(ZN[2] * MM)), Image.LANCZOS), px(ZN[0], ZN[1]))
rect(ZN[0] - 1, ZN[1] - 1, ZN[0] + ZN[2] + 1, ZN[1] + ZN[2] + 1, w=0.3)
txt(84, 14, "Mata stanowiska RFID – sprawdź swój układ w AR", 6, True)
txt(84, 24, "1. Połóż płytkę mikrokontrolera i płytkę stykową dokładnie w obrysach.", 3.4, kol="#3a4a55")
txt(84, 30, "2. Otwórz „Sprawdź swój układ” i wyceluj telefon w znacznik po lewej.", 3.4, kol="#3a4a55")
txt(84, 36, "3. Wzorzec nałoży się na Twój układ – porównaj przewód po przewodzie.", 3.4, kol="#3a4a55")
txt(84, 44, "Nie zasłaniaj znacznika i nie przesuwaj maty w trakcie sprawdzania.", 3, kol="#c0392b")
ox, oy = POLE
rect(ox + 0, oy + 0, ox + 68.6, oy + 53.3, fill="#eaf5ec"); rect(ox + 0, oy + 0, ox + 68.6, oy + 53.3, kol="#2e7d32", w=0.8)
txt(ox + 34.3, oy + 24, "Płytka mikrokontrolera", 3.2, True, "#2e7d32", "mm"); txt(ox + 34.3, oy + 30, "złącze USB w lewo ←", 2.8, kol="#2e7d32", a="mm")
rect(ox - 6, oy + 7, ox, oy + 19, kol="#2e7d32", w=0.4, kreski=True); txt(ox - 7, oy + 13, "USB", 2.4, kol="#2e7d32", a="rm")
rect(ox + 80, oy + 0, ox + 245, oy + 55, fill="#f3f6f9"); rect(ox + 80, oy + 0, ox + 245, oy + 55, kol="#1e88e5", w=0.8)
txt(ox + 120, oy + 8, "Płytka stykowa (830 pól)", 3.2, True, "#1e88e5", "mm"); txt(ox + 120, oy + 52, "szyny + / − na dole ↓", 2.8, kol="#1e88e5", a="mm")
mx0 = 80 + 6 + 36 * 2.54 + 9 - 20; rect(ox + mx0, oy - 27.9, ox + mx0 + 40, oy + 32.1, kol="#0d3b66", w=0.5, kreski=True); txt(ox + mx0 + 20, oy - 18, "moduł czytnika", 2.8, True, "#0d3b66", "mm"); txt(ox + mx0 + 20, oy - 13, "13,56 MHz", 2.6, kol="#0d3b66", a="mm")
rect(ox + 80, oy + 69, ox + 106, oy + 103, kol="#8e44ad", w=0.6, kreski=True); txt(ox + 93, oy + 107, "przekaźnik (etap 2)", 2.6, kol="#8e44ad", a="mt")
# podziałka kontrolna
y0 = 200; g.line([px(150, y0), px(250, y0)], fill="#16232a", width=round(0.5 * MM))
for i in range(0, 101, 10): g.line([px(150 + i, y0 - (2 if i % 50 else 3.5)), px(150 + i, y0)], fill="#16232a", width=round(0.3 * MM))
txt(200, y0 - 5, "100 mm – sprawdź linijką po wydruku", 2.6, a="ms"); txt(12, 203, "Drukuj: A4 poziomo, skala 100% (bez „dopasuj do strony”)", 2.8, True, "#c0392b")
im.save(os.path.join(OUT, "mata-rfid.pdf"), "PDF", resolution=DPI)
im.resize((1188, 840), Image.LANCZOS).save(os.path.join(OUT, "mata-rfid.png"))
print("ok", im.size)
