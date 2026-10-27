"""Znacznik lekcji (wspólny punkt odniesienia dla telefonów uczniów) – bogaty w szczegóły obraz 1200x1200."""
import math, random, os, sys
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hq'))
from podglad import load, render

rnd = random.Random(2026); W = 1200
im = Image.new('RGB', (W, W), '#f4ecdc'); d = ImageDraw.Draw(im)
pal = ['#c9562f', '#1f2a2e', '#e0a030', '#2a6f97', '#5b8c3a', '#8e3b5c']
# siatka „mapy” + losowe figury (dużo narożników = stabilne śledzenie)
for i in range(0, W, 60): d.line([(i, 0), (i, W)], fill='#e6dcc7', width=2); d.line([(0, i), (W, i)], fill='#e6dcc7', width=2)
for _ in range(240):
    c = rnd.choice(pal); x, y = rnd.randrange(W), rnd.randrange(W); r = rnd.randrange(10, 60); k = rnd.random()
    if k < .3: d.ellipse([x - r, y - r, x + r, y + r], fill=c)
    elif k < .6: d.polygon([(x + r * math.cos(a), y + r * math.sin(a)) for a in [rnd.uniform(0, 6.3) for _ in range(3)]], fill=c)
    elif k < .8: d.rectangle([x, y, x + r * 1.6, y + r * 0.7], fill=c)
    else: a = rnd.uniform(0, 3.14); d.line([(x, y), (x + 2 * r * math.cos(a), y + 2 * r * math.sin(a))], fill=c, width=rnd.randrange(5, 14))
for _ in range(400):
    x, y = rnd.randrange(W), rnd.randrange(W); r = rnd.randrange(2, 7); d.ellipse([x - r, y - r, x + r, y + r], fill=rnd.choice(['#ffffff', '#1f2a2e']))
# róża wiatrów w środku
cx = cy = W // 2; R = 330
d.ellipse([cx - R - 18, cy - R - 18, cx + R + 18, cy + R + 18], fill='#1f2a2e')
d.ellipse([cx - R, cy - R, cx + R, cy + R], fill='#fbf6ea')
for i in range(48):
    a = 2 * math.pi * i / 48; r1 = R - (34 if i % 4 else 60)
    d.line([(cx + r1 * math.cos(a), cy + r1 * math.sin(a)), (cx + (R - 8) * math.cos(a), cy + (R - 8) * math.sin(a))], fill='#1f2a2e', width=5 if i % 4 == 0 else 2)
for i in range(8):
    a = math.pi / 4 * i - math.pi / 2; L = R - 70 if i % 2 == 0 else R - 150; w = 0.16
    pts = [(cx, cy), (cx + 60 * math.cos(a - math.pi / 2 + w), cy + 60 * math.sin(a - math.pi / 2 + w)), (cx + L * math.cos(a), cy + L * math.sin(a)), (cx + 60 * math.cos(a + math.pi / 2 - w), cy + 60 * math.sin(a + math.pi / 2 - w))]
    d.polygon(pts, fill=pal[i % 3] if i % 2 == 0 else '#2a6f97')
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 54)
d.text((cx, cy - R + 92), 'N', font=f, fill='#c9562f', anchor='mm')
# miniatury zabytków w rogach medalionu
for key, (x, y) in (('baszta', (cx - 150, cy + 40)), ('latarnia', (cx + 150, cy + 40)), ('wiatrak', (cx, cy + 165))):
    anim = {'latarnia': 'Swiatlo', 'wiatrak': 'Smigla'}.get(key)
    art = render(load(f'../modele/{key}.glb', anim, 0.3), W=230, yaw=25, pitch=15, fit=0.62, transparent=True, center=(0, 0.6, 0))
    im.paste(art, (x - 115, y - 140), art)
# napisy i asymetryczne narożniki
d.rectangle([0, W - 150, W, W], fill='#1f2a2e')
f1 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', 78); f2 = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 30)
d.text((W / 2, W - 95), 'LEKCJA AR', font=f1, fill='white', anchor='mm'); d.text((W / 2, W - 38), 'ZNACZNIK KLASY · WYCELUJ TU TELEFON', font=f2, fill='#e0a030', anchor='mm')
d.rectangle([30, 30, 190, 56], fill='#1f2a2e'); d.rectangle([30, 30, 56, 190], fill='#1f2a2e')
d.ellipse([1070, 34, 1166, 130], outline='#1f2a2e', width=16)
d.polygon([(36, 1010), (140, 1010), (36, 906)], fill='#c9562f')
im.save('../lekcje/znacznik-lekcji.jpg', quality=90)
print('ok')
