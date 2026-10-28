"""Film do lekcji pokazowej: „Ziemia czy Słońce w centrum?” – model geocentryczny vs heliocentryczny
i pozorny ruch wsteczny Marsa. Uruchom: python3 kopernik_film.py ../lekcje/pokazowa/ziemia-czy-slonce.mp4"""
import math, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, SS, FPS = 1280, 720, 2, 24
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"; FS = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
F = lambda p, s: ImageFont.truetype(p, s * SS)
BG = (12, 18, 38); GOLD = (232, 180, 70); SUN = (255, 196, 60); EARTH = (70, 140, 230); MARS = (225, 95, 60); MOON = (190, 190, 190); WHITE = (240, 240, 245); MUTED = (150, 160, 185)
rng = np.random.default_rng(7)
STARS = [(rng.uniform(0, W * SS), rng.uniform(0, H * SS), rng.uniform(0.6, 2.2) * SS, int(rng.uniform(90, 230))) for _ in range(260)]

def tlo():
    im = Image.new("RGB", (W * SS, H * SS), BG); d = ImageDraw.Draw(im)
    for x, y, r, a in STARS: d.ellipse([x - r, y - r, x + r, y + r], fill=(a, a, min(255, a + 20)))
    return im, d

def kolo(d, x, y, r, fill, outline=None, w=0):
    d.ellipse([(x - r) * SS, (y - r) * SS, (x + r) * SS, (y + r) * SS], fill=fill, outline=outline, width=w * SS)
def okrag(d, x, y, r, col, w=1): d.ellipse([(x - r) * SS, (y - r) * SS, (x + r) * SS, (y + r) * SS], outline=col, width=max(1, int(w * SS)))
def linia(d, pts, col, w=2): d.line([(x * SS, y * SS) for x, y in pts], fill=col, width=int(w * SS), joint="curve")
def tekst(d, xy, t, font, col=WHITE, anchor="mm"): d.text((xy[0] * SS, xy[1] * SS), t, font=font, fill=col, anchor=anchor)
def podpis(d, t, alpha=1.0):
    d.rounded_rectangle([140 * SS, 640 * SS, 1140 * SS, 700 * SS], radius=18 * SS, fill=(20, 28, 52))
    tekst(d, (640, 670), t, F(FR, 24), tuple(int(c * alpha + BG[i] * (1 - alpha)) for i, c in enumerate(WHITE)))

def fade(t, t0, t1, d=0.6):
    return max(0.0, min(1.0, (t - t0) / d, (t1 - t) / d))

# ---------- fizyka (lata) ----------
def ziemia(t): a = 2 * math.pi * t; return math.cos(a), math.sin(a)
def mars(t): a = 2 * math.pi * t / 1.881 + 0.9; return 1.524 * math.cos(a), 1.524 * math.sin(a)
def kierunek(t):
    ex, ey = ziemia(t); mx, my = mars(t); return math.atan2(my - ey, mx - ex)

def scena_tytul(t, T):
    im, d = tlo(); a = fade(t, 0, T)
    c = tuple(int(v * a + BG[i] * (1 - a)) for i, v in enumerate(WHITE))
    tekst(d, (640, 300), "Ziemia czy Słońce w centrum?", F(FS, 58), c)
    tekst(d, (640, 380), "Model geocentryczny i heliocentryczny", F(FR, 30), tuple(int(v * a + BG[i] * (1 - a)) for i, v in enumerate(GOLD)))
    kolo(d, 640, 470, 14 * a + 1, SUN)
    for k, (r, col) in enumerate(((40, EARTH), (58, MARS))):
        ang = t * (1.6 - k * 0.6) * 2
        kolo(d, 640 + r * math.cos(ang), 470 + r * math.sin(ang) * 0.35, 5, col)
    return im

def scena_porownanie(t, T):
    im, d = tlo()
    # lewa: geocentryzm
    cx, cy, S = 330, 330, 85
    tekst(d, (cx, 70), "Model geocentryczny", F(FB, 30)); tekst(d, (cx, 108), "Ziemia w środku (Ptolemeusz, ok. 150 r.)", F(FR, 19), MUTED)
    yrs = t * 0.45
    for r in (1.2, 2.3): okrag(d, cx, cy, r * S, (50, 62, 100), 1.5)
    trail = []
    for k in range(0, 160):
        tt = max(0, yrs - k * 0.012)
        da = 2 * math.pi * tt / 1.881; ea = 2 * math.pi * tt
        x = 2.3 * math.cos(da) + 0.75 * math.cos(ea + 0.9); y = 2.3 * math.sin(da) + 0.75 * math.sin(ea + 0.9)
        trail.append((cx + x * S * 0.92, cy + y * S * 0.92))
    linia(d, trail[::-1], (150, 70, 50), 2)
    da = 2 * math.pi * yrs / 1.881; ea = 2 * math.pi * yrs
    ex_, ey_ = cx + 2.3 * math.cos(da) * S * 0.92, cy + 2.3 * math.sin(da) * S * 0.92
    okrag(d, ex_, ey_, 0.75 * S * 0.92, (120, 60, 50), 1)
    kolo(d, trail[0][0], trail[0][1], 9, MARS)
    sx, sy = cx + 1.2 * S * math.cos(ea), cy + 1.2 * S * math.sin(ea); kolo(d, sx, sy, 16, SUN)
    kolo(d, cx + 0.45 * S * math.cos(ea * 12), cy + 0.45 * S * math.sin(ea * 12), 4, MOON)
    kolo(d, cx, cy, 13, EARTH)
    tekst(d, (cx, cy + 34), "Ziemia", F(FR, 16), MUTED); tekst(d, (sx, sy - 28), "Słońce", F(FR, 16), MUTED)
    # prawa: heliocentryzm
    cx2 = 950; S2 = 120
    tekst(d, (cx2, 70), "Model heliocentryczny", F(FB, 30)); tekst(d, (cx2, 108), "Słońce w środku (Kopernik, 1543)", F(FR, 19), GOLD)
    for r in (1.0, 1.524): okrag(d, cx2, cy, r * S2, (50, 62, 100), 1.5)
    kolo(d, cx2, cy, 22, SUN)
    ex, ey = ziemia(yrs); mx, my = mars(yrs)
    E = (cx2 + ex * S2, cy + ey * S2); M = (cx2 + mx * S2, cy + my * S2)
    linia(d, [E, (E[0] + (M[0] - E[0]) * 1.8, E[1] + (M[1] - E[1]) * 1.8)], (110, 110, 160), 1)
    kolo(d, E[0], E[1], 11, EARTH); kolo(d, M[0], M[1], 9, MARS)
    tekst(d, (cx2, cy + 40), "Słońce", F(FR, 16), MUTED)
    d.line([(640 * SS, 160 * SS), (640 * SS, 600 * SS)], fill=(45, 55, 90), width=2 * SS)
    a = fade(t, 0.5, T)
    podpis(d, "Dawniej: planety krążą wokół Ziemi po skomplikowanych pętlach (epicyklach)." if t < T / 2 else "Kopernik: wszystkie planety, także Ziemia, krążą wokół Słońca.", a)
    return im

def scena_wsteczny(t, T):
    im, d = tlo()
    tekst(d, (640, 50), "Dlaczego Mars czasem „cofa się” na niebie?", F(FB, 32))
    # pas nieba u góry
    d.rounded_rectangle([90 * SS, 90 * SS, 1190 * SS, 230 * SS], radius=16 * SS, fill=(18, 26, 56), outline=(60, 72, 120), width=2 * SS)
    tekst(d, (110, 108), "tło gwiazd (widok z Ziemi)", F(FR, 15), MUTED, "lm")
    cx, cy, S = 640, 445, 108
    # okno czasu wokół opozycji (Ziemia dokładnie między Słońcem a Marsem): ruch prosty → wsteczny → prosty
    t_op = (0.9 / (2 * math.pi)) / (1 - 1 / 1.881)
    t0 = t_op - 0.27; span = 0.54
    tt = t0 + span * min(1, t / (T * 0.8))
    def kat(tq):
        a = kierunek(tq) - kierunek(t0)
        while a > math.pi: a -= 2 * math.pi
        while a < -math.pi: a += 2 * math.pi
        return a
    rot = -math.pi / 2 - 2 * math.pi * t_op          # obracamy rysunek tak, by opozycja wypadała u góry (w stronę „nieba”)
    def obr(p): x, y = p; return x * math.cos(rot) - y * math.sin(rot), x * math.sin(rot) + y * math.cos(rot)
    zi = lambda tq: obr(ziemia(tq)); ma = lambda tq: obr(mars(tq))
    probki = [kat(t0 + span * k / 200) for k in range(201)]
    amin, amax = min(probki), max(probki)
    def nieb(tq):
        # kierunek patrzenia z Ziemi na Marsa (gwiazdy są bardzo daleko, liczy się tylko kierunek); skala pozioma powiększona
        x = 1130 - (kat(tq) - amin) / (amax - amin + 1e-9) * 1000
        y = 165 + 26 * math.sin(math.pi * (tq - t0) / span * 2 - 0.4)      # pionowo: skala umowna – dla czytelności pętli
        return x, y
    pts = [nieb(t0 + (tt - t0) * k / 150) for k in range(151)]
    linia(d, pts, MARS, 3); kolo(d, pts[-1][0], pts[-1][1], 9, MARS)
    for r in (1.0, 1.524): okrag(d, cx, cy, r * S, (50, 62, 100), 1.5)
    kolo(d, cx, cy, 20, SUN)
    for k in range(7):                       # pozycje 1–7 na orbitach i na niebie
        tq = t0 + span * k / 6
        if tq > tt + 1e-6: break
        ex, ey = zi(tq); mx, my = ma(tq)
        kolo(d, cx + ex * S, cy + ey * S, 5, (90, 120, 180)); kolo(d, cx + mx * S, cy + my * S, 4, (170, 85, 60))
        tekst(d, (cx + ex * S * 0.82, cy + ey * S * 0.82), str(k + 1), F(FB, 14), MUTED)
        tekst(d, (cx + mx * S * 1.12, cy + my * S * 1.12), str(k + 1), F(FB, 14), (200, 120, 90))
        px, py = nieb(tq); kolo(d, px, py, 4, GOLD); tekst(d, (px, py - 17), str(k + 1), F(FB, 14), GOLD)
    ex, ey = zi(tt); mx, my = ma(tt)
    E = (cx + ex * S, cy + ey * S); M = (cx + mx * S, cy + my * S)
    dx, dy = M[0] - E[0], M[1] - E[1]; L = math.hypot(dx, dy) or 1
    linia(d, [E, (M[0] + dx / L * 90, M[1] + dy / L * 90)], GOLD, 2)          # linia wzroku
    kolo(d, E[0], E[1], 11, EARTH); kolo(d, M[0], M[1], 9, MARS)
    tekst(d, (E[0], E[1] + 22), "Ziemia", F(FR, 15), MUTED); tekst(d, (M[0] + 34, M[1]), "Mars", F(FR, 15), MUTED)
    ruch = "Mars cofa się!" if any(nieb(tt)[0] - nieb(tt - 0.004)[0] > 0 for _ in [0]) else "Mars idzie do przodu"
    tekst(d, (1190, 250), ruch, F(FB, 18), GOLD if "cofa" in ruch else MUTED, "rm")
    podpis(d, "Ziemia jest bliżej Słońca i porusza się szybciej. Gdy wyprzedza Marsa, ten pozornie cofa się.", fade(t, 0.3, T))
    return im

def scena_koniec(t, T):
    im, d = tlo(); a = fade(t, 0, T + 10)
    c = lambda col: tuple(int(v * a + BG[i] * (1 - a)) for i, v in enumerate(col))
    tekst(d, (640, 270), "Mikołaj Kopernik (1473–1543)", F(FS, 46), c(WHITE))
    tekst(d, (640, 340), "„De revolutionibus orbium coelestium”, Norymberga 1543", F(FR, 26), c(GOLD))
    tekst(d, (640, 420), "Ziemia krąży wokół Słońca i obraca się wokół własnej osi.", F(FR, 26), c(WHITE))
    tekst(d, (640, 470), "Ruszył Ziemię, wstrzymał Słońce i Niebo.", F(FR, 22), c(MUTED))
    return im

SCENY = [(scena_tytul, 4.0), (scena_porownanie, 14.0), (scena_wsteczny, 13.0), (scena_koniec, 5.0)]

def main(out):
    p = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    for fn, T in SCENY:
        for k in range(int(T * FPS)):
            im = fn(k / FPS, T).resize((W, H), Image.LANCZOS)
            p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()
    for t, (fn, T) in ((2.5, SCENY[0]), (10, SCENY[1]), (11, SCENY[2])):
        fn(t, T).resize((W, H), Image.LANCZOS).save(f"/home/claude/tools/film_{fn.__name__}.png")

if __name__ == "__main__":
    main(sys.argv[1])
