"""Proceduralne, bezszwowe (tileable) tekstury + mapy normalnych.
Każda funkcja zwraca (kolor: PIL.Image RGB, normalna: PIL.Image RGB)."""
import math
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter

def fbm(n, seed, octaves=5, base=None, persistence=0.55, aniso=(1, 1)):
    """Szum fraktalny zawijany na krawędziach (tileable), wynik 0..1."""
    rng = np.random.default_rng(seed)
    out = np.zeros((n, n)); amp = 1.0; tot = 0
    sigma = base or n / 8
    for _ in range(octaves):
        w = gaussian_filter(rng.normal(size=(n, n)), (sigma * aniso[0], sigma * aniso[1]), mode='wrap')
        w = (w - w.mean()) / (w.std() + 1e-9)
        out += amp * w; tot += amp; amp *= persistence; sigma /= 2
        if sigma < 0.6: break
    out /= tot
    return np.clip((out - out.min()) / (out.max() - out.min() + 1e-9), 0, 1)

def normal_map(h, strength=4.0):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) / 2
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) / 2
    n = np.dstack([-dx * strength, dy * strength, np.ones_like(h)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8))

def to_img(rgb):
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8))

def _wrap_rect_masks(n, x0, x1, y0, y1):
    """Zwraca listę wycinków (slice_y, slice_x, ox, oy) prostokąta zawiniętego na brzegach."""
    out = []
    for oy in (-n, 0, n):
        for ox in (-n, 0, n):
            a, b, c, d = int(x0 + ox), int(x1 + ox), int(y0 + oy), int(y1 + oy)
            ca, cb, cc, cd = max(a, 0), min(b, n), max(c, 0), min(d, n)
            if ca < cb and cc < cd: out.append((slice(cc, cd), slice(ca, cb), ox, oy))
    return out

# ---------------------------------------------------------------- kamienne bloki
def stone_blocks(n=1024, rows=8, seed=1, base=(176, 163, 142), mortar=(118, 110, 98), bw=4.5):
    rng = np.random.default_rng(seed)
    H = np.zeros((n, n)); col = np.zeros((n, n, 3)); mask = np.zeros((n, n), bool)
    rh = n / rows; m = n / 170  # spoina
    noise = fbm(n, seed + 10, 6, n / 16); grain = fbm(n, seed + 11, 3, 2.0)
    yy, xx = np.mgrid[0:n, 0:n]
    for r in range(rows):
        widths = []; left = n
        while left > 0:
            w = rng.uniform(0.65, 1.35) * n / bw
            if left - w < n / bw * 0.5: w = left
            widths.append(w); left -= w
        x = rng.uniform(0, n)
        for w in widths:
            x0, x1, y0, y1 = x, x + w, r * rh, (r + 1) * rh
            tone = np.array(base) * rng.uniform(0.8, 1.12) * np.array([1, 1, rng.uniform(0.94, 1.02)]) + rng.normal(0, 2, 3)
            for sy, sx, ox, oy in _wrap_rect_masks(n, x0, x1, y0, y1):
                X = xx[sy, sx] - ox; Y = yy[sy, sx] - oy
                d = np.minimum.reduce([X - x0, x1 - X, Y - y0, y1 - Y])
                bev = np.clip((d - m) / (n / 60), 0, 1) ** 0.6
                inside = d > m
                h = bev * (0.75 + 0.25 * noise[sy, sx]) + 0.08 * grain[sy, sx]
                H[sy, sx] = np.where(inside, h, H[sy, sx])
                c = tone[None, None, :] * (0.78 + 0.22 * bev[..., None]) * (0.85 + 0.3 * noise[sy, sx, None]) \
                    * (0.92 + 0.16 * grain[sy, sx, None])
                col[sy, sx] = np.where(inside[..., None], c, col[sy, sx]); mask[sy, sx] |= inside
            x += w
    mcol = np.array(mortar)[None, None, :] * (0.85 + 0.3 * grain[..., None])
    col = np.where(mask[..., None], col, mcol)
    H = np.where(mask, H, 0.05 * grain)
    dirt = fbm(n, seed + 12, 4, n / 4)                      # zabrudzenia/patyna
    col *= (0.86 + 0.18 * dirt[..., None])
    col[..., 1] *= (0.98 + 0.04 * dirt)                       # lekki zielonkawy nalot
    return to_img(col), normal_map(H, 6.0)

# ---------------------------------------------------------------- dachówki / gonty
def tiles(n=512, rows=8, cols=8, seed=2, base=(168, 74, 48), rounded=True, wood=False):
    rng = np.random.default_rng(seed)
    H = np.zeros((n, n)); col = np.zeros((n, n, 3))
    rh, tw = n / rows, n / cols
    yy, xx = np.mgrid[0:n, 0:n]
    noise = fbm(n, seed + 5, 5, n / 20)
    grain = fbm(n, seed + 6, 3, 3, aniso=(6, 0.4)) if wood else fbm(n, seed + 6, 3, 2.5)
    # rysujemy od najniższego rzędu do najwyższego: wyższe dachówki nachodzą na niższe (jak na dachu).
    # rząd "rows" to rząd 0 przesunięty o wysokość obrazka – dzięki temu tekstura nie ma szwu.
    for r in range(rows, -1, -1):
        rr = r % rows
        shift = (tw / 2) * (rr % 2)
        trng = np.random.default_rng(seed * 1000 + rr)
        for c in range(cols):
            jit = trng.uniform(-2, 2) if wood else 0
            x0 = c * tw + shift + jit; x1 = x0 + tw - max(2, n / 200)
            y_bot = (r + 1) * rh + (trng.uniform(-rh * 0.12, rh * 0.05) if wood else 0); y_top = y_bot - rh * 1.7
            tone = np.array(base) * trng.uniform(0.8, 1.15) + trng.normal(0, 4, 3)
            for sy, sx, ox, oy in [m for m in _wrap_rect_masks(n, x0, x1, y_top, y_bot) if m[3] == 0]:
                X = xx[sy, sx] - ox; Y = yy[sy, sx] - oy
                cx, rad = (x0 + x1) / 2, (x1 - x0) / 2
                if rounded:
                    yc = y_bot - rad
                    inside = (Y < yc) | (((X - cx) / rad) ** 2 + ((Y - yc) / rad) ** 2 <= 1)
                else:
                    inside = np.ones_like(X, bool)
                t = np.clip((Y - y_top) / (y_bot - y_top), 0, 1)
                edge = np.clip(np.minimum(X - x0, x1 - X) / (n / 90), 0, 1)
                h = 0.25 + 0.75 * t ** 1.5
                if rounded: h = h * (0.7 + 0.3 * np.sqrt(np.clip(1 - ((X - cx) / rad) ** 2, 0, 1)))
                h *= (0.6 + 0.4 * edge)
                c_ = tone[None, None, :] * (0.65 + 0.4 * t[..., None]) * (0.85 + 0.25 * noise[sy, sx, None]) * (0.9 + 0.2 * grain[sy, sx, None])
                H[sy, sx] = np.where(inside, h, H[sy, sx]); col[sy, sx] = np.where(inside[..., None], c_, col[sy, sx])
    return to_img(col), normal_map(H, 5.0)

# ---------------------------------------------------------------- deski
def planks(n=512, count=6, seed=3, base=(126, 88, 56), vertical=True, nails=True):
    rng = np.random.default_rng(seed)
    grain = fbm(n, seed, 5, n / 10, aniso=(8, 0.25))
    fine = fbm(n, seed + 1, 3, 1.5, aniso=(10, 0.5))
    yy, xx = np.mgrid[0:n, 0:n]
    pw = n / count; u = xx
    pid = (u // pw).astype(int); local = u - pid * pw
    gap = n / 160
    tones = np.array([np.array(base) * rng.uniform(0.75, 1.15) for _ in range(count)])
    shift = rng.uniform(0, n, count).astype(int)
    g = np.zeros((n, n))
    for i in range(count):
        g[:, int(i * pw):int((i + 1) * pw)] = np.roll(grain, shift[i], 0)[:, int(i * pw):int((i + 1) * pw)]
    rings = 0.5 + 0.5 * np.sin(g * 28 + fine * 3)
    col = tones[pid] * (0.72 + 0.28 * rings[..., None]) * (0.88 + 0.2 * fine[..., None])
    edge = np.clip(np.minimum(local, pw - local) / gap, 0, 1)
    H = 0.6 + 0.2 * rings + 0.2 * fine
    H = np.where(edge < 1, H * edge, H)
    col = np.where(edge[..., None] < 0.5, col * 0.35, col * (0.8 + 0.2 * edge[..., None]))
    img = to_img(col); d = ImageDraw.Draw(img)
    for i in range(count):        # sęki
        for _ in range(rng.integers(0, 2)):
            cx, cy = (i + rng.uniform(0.3, 0.7)) * pw, rng.uniform(0, n)
            d.ellipse([cx - 5, cy - 9, cx + 5, cy + 9], fill=tuple(int(x * 0.5) for x in tones[i]))
        if nails:
            for yy_ in (n * 0.12, n * 0.62):
                cx = (i + 0.5) * pw
                d.ellipse([cx - 3, yy_ - 3, cx + 3, yy_ + 3], fill=(45, 40, 38))
    out = np.asarray(img).astype(float)
    if not vertical: out = np.rot90(out); H = np.rot90(H)
    return to_img(out), normal_map(np.ascontiguousarray(H), 4.0)

# ---------------------------------------------------------------- tynk
def plaster(n=512, seed=4, base=(238, 234, 226)):
    fine = fbm(n, seed, 4, 2.0); mid = fbm(n, seed + 1, 4, n / 30); stain = fbm(n, seed + 2, 3, n / 5)
    col = np.array(base)[None, None, :] * (0.9 + 0.08 * mid[..., None] + 0.04 * fine[..., None]) * (0.93 + 0.07 * stain[..., None])
    return to_img(col), normal_map(0.6 * fine + 0.4 * mid, 2.5)

# ---------------------------------------------------------------- trawa
def grass(n=512, seed=5):
    rng = np.random.default_rng(seed)
    low = fbm(n, seed, 5, n / 6); mid = fbm(n, seed + 1, 4, n / 40)
    a, b, c = np.array([84, 112, 60]), np.array([112, 132, 74]), np.array([138, 128, 84])
    col = a + (b - a) * low[..., None]
    col = col + (c - col) * (np.clip(mid - 0.65, 0, 1) * 2)[..., None]
    img = to_img(col); d = ImageDraw.Draw(img)
    Hi = Image.new('L', (n, n), 90); dh = ImageDraw.Draw(Hi)
    for _ in range(9000):
        x, y = rng.uniform(0, n, 2); L = rng.uniform(4, 11); ang = rng.uniform(-0.5, 0.5) - math.pi / 2
        x2, y2 = x + L * math.cos(ang), y + L * math.sin(ang)
        k = rng.uniform(0.75, 1.3); colr = tuple(int(min(255, v * k)) for v in (col[int(y) % n, int(x) % n]))
        for ox in (-n, 0, n):
            for oy in (-n, 0, n):
                d.line([(x + ox, y + oy), (x2 + ox, y2 + oy)], fill=colr, width=2)
                dh.line([(x + ox, y + oy), (x2 + ox, y2 + oy)], fill=int(140 + 100 * (k - 0.75)), width=2)
    H = gaussian_filter(np.asarray(Hi, float) / 255, 0.7, mode='wrap')
    return img, normal_map(H, 3.0)

# ---------------------------------------------------------------- bruk (Voronoi)
def cobble(n=512, cells=70, seed=6, base=(150, 144, 134)):
    rng = np.random.default_rng(seed)
    pts = rng.uniform(0, n, (cells, 2))
    allp = np.vstack([pts + [dx, dy] for dx in (-n, 0, n) for dy in (-n, 0, n)])
    ids = np.tile(np.arange(cells), 9)
    yy, xx = np.mgrid[0:n, 0:n]
    P = np.c_[xx.ravel(), yy.ravel()].astype(float)
    from scipy.spatial import cKDTree
    d, i = cKDTree(allp).query(P, k=2)
    edge = (d[:, 1] - d[:, 0]).reshape(n, n); cid = ids[i[:, 0]].reshape(n, n)
    noise = fbm(n, seed + 1, 5, n / 30)
    tones = np.array([np.array(base) * rng.uniform(0.72, 1.18) * np.array([1, rng.uniform(.95, 1.03), rng.uniform(.9, 1.02)]) for _ in range(cells)])
    stone = np.clip(edge / (n / 70), 0, 1) ** 0.5
    H = stone * (0.8 + 0.2 * noise)
    col = tones[cid] * (0.55 + 0.45 * stone[..., None]) * (0.85 + 0.25 * noise[..., None])
    gap = stone < 0.25
    col[gap] = np.array([92, 86, 72]) * (0.8 + 0.3 * noise[gap, None])
    return to_img(col), normal_map(H, 7.0)

# ---------------------------------------------------------------- skała
def rock_tex(n=512, seed=7, base=(132, 126, 116)):
    f = fbm(n, seed, 7, n / 6); f2 = fbm(n, seed + 1, 6, n / 12)
    ridge = 1 - np.abs(f2 * 2 - 1)
    H = 0.6 * f + 0.4 * ridge ** 3
    col = np.array(base)[None, None, :] * (0.65 + 0.5 * H[..., None])
    moss = np.clip(fbm(n, seed + 2, 4, n / 8) - 0.6, 0, 1) * 2.2
    col = col * (1 - moss[..., None]) + np.array([92, 112, 66]) * moss[..., None]
    return to_img(col), normal_map(H, 6.0)

# ---------------------------------------------------------------- woda
def water(n=512, seed=8):
    yy, xx = np.mgrid[0:n, 0:n] / n * 2 * math.pi
    rng = np.random.default_rng(seed)
    H = np.zeros((n, n))
    for _ in range(14):
        kx, ky = rng.integers(-6, 7, 2)
        if kx == 0 and ky == 0: continue
        H += rng.uniform(0.3, 1) / math.hypot(kx, ky) * np.sin(kx * xx + ky * yy + rng.uniform(0, 6.3))
    H = (H - H.min()) / (H.max() - H.min()); H = 0.8 * H + 0.2 * fbm(n, seed, 4, n / 40)
    deep, shallow = np.array([28, 82, 112]), np.array([62, 140, 160])
    col = deep + (shallow - deep) * (H ** 1.6)[..., None]
    return to_img(col), normal_map(H, 3.5)

# ---------------------------------------------------------------- płótno
def canvas(n=256, seed=9, base=(236, 226, 204)):
    yy, xx = np.mgrid[0:n, 0:n]
    f = 2 * math.pi * 32 / n
    weave = 0.5 + 0.25 * np.sin(xx * f) * np.sign(np.sin(yy * f / 2)) + 0.25 * np.sin(yy * f) * np.sign(np.sin(xx * f / 2))
    dirt = fbm(n, seed, 4, n / 6)
    col = np.array(base)[None, None, :] * (0.86 + 0.14 * weave[..., None]) * (0.9 + 0.1 * dirt[..., None])
    return to_img(col), normal_map(weave, 1.5)

# ---------------------------------------------------------------- metal malowany
def painted_metal(n=256, seed=10, base=(40, 42, 46)):
    f = fbm(n, seed, 5, n / 10); rust = np.clip(fbm(n, seed + 1, 5, n / 14) - 0.68, 0, 1) * 3
    col = np.array(base)[None, None, :] * (0.85 + 0.3 * f[..., None])
    col = col * (1 - rust[..., None]) + np.array([120, 66, 38]) * rust[..., None]
    return to_img(col), normal_map(0.5 * f + rust, 1.5)

def all_textures(hq=False):
    """Wszystkie tekstury używane przez modele (generowane raz). hq=True – wyższa rozdzielczość."""
    T = {}
    H = 1024 if hq else 512
    T['kamien'] = stone_blocks(1024)
    T['kamien_ciemny'] = stone_blocks(H, rows=6, seed=21, base=(150, 140, 124), bw=3.5)
    T['dachowka'] = tiles(H, 8, 8, seed=2)
    T['gont'] = tiles(H, 10, 7, seed=12, base=(112, 96, 82), rounded=False, wood=True)
    T['deski'] = planks(H, 6, seed=3)
    T['deski_stare'] = planks(H, 7, seed=13, base=(132, 112, 90))
    T['tynk'] = plaster(H)
    T['trawa'] = grass(512)
    T['bruk'] = cobble(512)
    T['skala'] = rock_tex(512)
    T['woda'] = water(512)
    T['plotno'] = canvas(256)
    T['metal'] = painted_metal(256)
    return T
