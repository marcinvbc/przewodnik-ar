import sys, math, random, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.argv=[sys.argv[0]]
exec(open('preview2.py').read().split('imgs=[]')[0])  # funkcje load/qrot

def render(path, t, W, bg=None, ay=35, ax=-18):
    tris = load(path, t)
    im = Image.new('RGBA', (W, W), (0, 0, 0, 0)); dr = ImageDraw.Draw(im, 'RGBA')
    ay, ax = math.radians(ay), math.radians(ax)
    Ry=np.array([[math.cos(ay),0,math.sin(ay)],[0,1,0],[-math.sin(ay),0,math.cos(ay)]])
    Rx=np.array([[1,0,0],[0,math.cos(ax),-math.sin(ax)],[0,math.sin(ax),math.cos(ax)]]); R=Rx@Ry
    L=np.array([0.4,0.8,0.5]); L/=np.linalg.norm(L); items=[]
    for tr,c,a in tris:
        tt=tr@R.T; n=np.cross(tt[1]-tt[0],tt[2]-tt[0]); nn=np.linalg.norm(n)
        if nn<1e-9: continue
        s=0.4+0.6*abs(np.dot(n/nn,L)); items.append((tt[:,2].mean(),tt,tuple(int(255*min(1,x*s)) for x in c)+(int(255*a),)))
    items.sort(key=lambda x:x[0])
    sc = W*0.78
    for _,tt,c in items: dr.polygon([(W/2+x*sc, W*0.88-y*sc) for x,y,z in tt], fill=c, outline=c)
    return im

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
