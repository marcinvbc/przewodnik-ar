import sys, os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hq'))
from podglad import load, render as hq_render

def render(path, t, W):
    """Render modelu HQ z przezroczystym tłem (do medalionu na plakacie)."""
    anim = {'latarnia': 'Swiatlo', 'wiatrak': 'Smigla'}.get(os.path.basename(path)[:-4])
    return hq_render(load(path, anim, t), W=W, yaw=22, pitch=16, fit=0.6, transparent=True, center=(0, 0.6, 0))

FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FS = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'

def poster(key, title, sub, palette, seed, t):
    rnd = random.Random(seed); W = H = 1000
    im = Image.new('RGB', (W, H), palette[0]); d = ImageDraw.Draw(im)
    # tło: nieregularne kształty (dużo narożników = dużo punktów charakterystycznych)
    for _ in range(170):
        c = rnd.choice(palette[1:]); x, y = rnd.randrange(W), rnd.randrange(H); r = rnd.randrange(8, 70)
        k = rnd.random()
        if k < .35: d.ellipse([x-r, y-r, x+r, y+r], fill=c)
        elif k < .7:
            pts = [(x + r*math.cos(a), y + r*math.sin(a)) for a in [rnd.uniform(0, 6.28) for _ in range(3)]]
            d.polygon(pts, fill=c)
        else:
            a = rnd.uniform(0, 3.14); d.line([(x, y), (x + r*2*math.cos(a), y + r*2*math.sin(a))], fill=c, width=rnd.randrange(4, 14))
    # gwiazdki / kropki
    for _ in range(260):
        x, y = rnd.randrange(W), rnd.randrange(H); r = rnd.randrange(2, 6)
        d.ellipse([x-r, y-r, x+r, y+r], fill=rnd.choice(['#ffffff', '#111111']))
    # medalion z ilustracją
    cx, cy, R = 500, 440, 330
    d.ellipse([cx-R-16, cy-R-16, cx+R+16, cy+R+16], fill='#111111')
    d.ellipse([cx-R, cy-R, cx+R, cy+R], fill='#fbf6ea')
    for i in range(36):  # promienie w medalionie
        a = 2*math.pi*i/36
        d.polygon([(cx, cy), (cx+R*math.cos(a), cy+R*math.sin(a)), (cx+R*math.cos(a+0.06), cy+R*math.sin(a+0.06))], fill=palette[1] if i % 2 else '#f1e6cf')
    art = render(f'../modele/{key}.glb', t, 620)
    im.paste(art, (cx-310, cy-330), art)
    # pas z tytułem
    d.rectangle([0, 800, W, 1000], fill='#111111')
    for i in range(0, W, 40):
        d.polygon([(i, 800), (i+20, 785), (i+40, 800)], fill='#111111')
    f1 = ImageFont.truetype(FS, 76); f2 = ImageFont.truetype(FB, 30)
    tw = d.textlength(title, font=f1); d.text(((W-tw)/2, 830), title, font=f1, fill='#ffffff')
    sw = d.textlength(sub, font=f2); d.text(((W-sw)/2, 925), sub, font=f2, fill=palette[2])
    # asymetryczne narożniki (pomagają ustalić orientację)
    d.rectangle([24, 24, 150, 44], fill='#111111'); d.rectangle([24, 24, 44, 150], fill='#111111')
    d.ellipse([890, 30, 970, 110], outline='#111111', width=12)
    d.polygon([(30, 770), (110, 770), (30, 690)], fill='#ffffff')
    im.save(f'../znaczniki/{key}.jpg', quality=90)
    return im

ims = [poster('baszta', 'Baszta Rycerska', 'PRZEWODNIK AR · NR 1', ['#e9c46a', '#a8402c', '#ffe08a', '#6f9a4e', '#2a6f97'], 11, 0),
       poster('latarnia', 'Latarnia Morska', 'PRZEWODNIK AR · NR 2', ['#8ecae6', '#c8312f', '#fff3b0', '#023047', '#ffb703'], 22, 0.6),
       poster('wiatrak', 'Wiatrak Koźlak', 'PRZEWODNIK AR · NR 3', ['#b7d77a', '#a9744a', '#fff1c9', '#5e4a3a', '#e76f51'], 33, 0.5)]
s = Image.new('RGB', (1500, 500), 'white')
for i, im in enumerate(ims): s.paste(im.resize((500, 500)), (i*500, 0))
s.save('posters_preview.png')
