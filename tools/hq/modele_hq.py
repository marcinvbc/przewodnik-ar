"""Modele HQ zabytków: baszta, latarnia, wiatrak (tekstury + mapy normalnych + animacje).
Uruchom:  python3 modele_hq.py ../../modele"""
import math, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from siatki import *
import tekstury

PI = math.pi
TEX = None

def mat(color=(1, 1, 1, 1), tex=None, normal=True, ns=1.0, rough=0.85, metal=0.0, emissive=None, double=False):
    return dict(color=color, tex=tex, normal=(tex if normal and tex else None), normal_scale=ns, rough=rough,
                metal=metal, emissive=emissive, double=double)

MATS = {
    'trawa': mat(tex='trawa', rough=0.95, ns=0.8),
    'ziemia': mat((0.62, 0.5, 0.38, 1), tex='skala', rough=1.0),
    'bruk': mat(tex='bruk', rough=0.9),
    'kamien': mat(tex='kamien', rough=0.9),
    'kamien_ciemny': mat(tex='kamien_ciemny', rough=0.9),
    'dachowka': mat(tex='dachowka', rough=0.65),
    'gont': mat(tex='gont', rough=0.85),
    'deski': mat(tex='deski', rough=0.8),
    'deski_ciemne': mat((0.62, 0.55, 0.5, 1), tex='deski', rough=0.85),
    'deski_stare': mat(tex='deski_stare', rough=0.85),
    'tynk': mat(tex='tynk', rough=0.8, ns=0.7),
    'tynk_czerwony': mat((0.86, 0.24, 0.2, 1), tex='tynk', rough=0.7, ns=0.7),
    'skala': mat(tex='skala', rough=0.95),
    'woda': mat(tex='woda', rough=0.12, ns=0.6),
    'plotno': mat(tex='plotno', rough=0.95, double=True),
    'metal': mat(tex='metal', rough=0.5, metal=0.6),
    'zloto': mat((0.95, 0.76, 0.33, 1), rough=0.3, metal=1.0),
    'ciemne': mat((0.05, 0.045, 0.04, 1), rough=1.0),
    'okno_swiatlo': mat((1, 0.78, 0.45, 1), rough=0.4, emissive=(0.95, 0.62, 0.25)),
    'ogien': mat((1, 0.6, 0.2, 1), rough=1, emissive=(1.0, 0.55, 0.15)),
    'flaga': mat((0.78, 0.12, 0.1, 1), tex='plotno', rough=0.9, normal=False, double=True),
    'flaga_zolta': mat((0.95, 0.78, 0.25, 1), tex='plotno', rough=0.9, normal=False, double=True),
    'krzew': mat((0.55, 0.78, 0.45, 1), tex='trawa', rough=1.0),
    'szklo': mat((0.75, 0.9, 1.0, 0.25), rough=0.05),
    'lampa': mat((1, 0.92, 0.6, 1), rough=0.2, emissive=(1.0, 0.85, 0.45)),
    'kopula': mat((0.72, 0.17, 0.14, 1), rough=0.35, metal=0.3),
    'snop': mat((1, 0.95, 0.7, 0.12), rough=1, emissive=(0.55, 0.48, 0.3), double=True),
    'worek': mat((0.95, 0.9, 0.8, 1), tex='plotno', rough=1.0),
}

def on_wall(m, ang, r, y):
    """Ustawia element (front = +Z) na ścianie walca: kąt ang (0 = +X, PI/2 = +Z)."""
    return m.transformed(chain(T(r * math.cos(ang), y, r * math.sin(ang)), Ry(PI / 2 - ang)))

def prism(w, h, d, uv_scale=0.2):
    """Trójkątny graniastosłup (szczyt dachu dwuspadowego): podstawa w x∈[-w/2,w/2], y∈[0,h], głębokość z."""
    z = d / 2; P, N, U, I = [], [], [], []
    for s in (1, -1):  # ściany szczytowe
        tri = [(-w / 2, 0, s * z), (w / 2, 0, s * z), (0, h, s * z)]
        b = len(P); P += tri; N += [(0, 0, s)] * 3
        U += [(0, 0), (w / uv_scale, 0), (w / 2 / uv_scale, -h / uv_scale)]
        I.append((b, b + 1, b + 2) if s > 0 else (b, b + 2, b + 1))
    return Mesh(P, N, U, I)

def gable_roof(w, h, d, over=0.02, thick=0.012, uv_scale=0.2):
    """Dwie połacie dachu (prostopadłościany) nad graniastosłupem w×h×d."""
    L = math.hypot(w / 2, h) + over; a = math.atan2(h, w / 2)
    out = []
    for s in (1, -1):
        b = box(L, thick, d + 2 * over, uv_scale)
        # tekstura: rzędy dachówek wzdłuż Z → obracamy UV (u wzdłuż z, v w dół połaci)
        b.uv = b.uv[:, ::-1] * [1, 1]
        M = chain(T(s * (w / 4 + over * 0.0), h / 2 + thick / 2, 0), Rz(-s * a))
        out.append(b.transformed(M))
    return merge(out)

def arch_roof(width, height, z0, z1, y0, segs=20, uv_scale=0.2):
    """Dach łukowy (półelipsa w płaszczyźnie XY, wyciągnięta wzdłuż Z) – typowy dla koźlaka."""
    pts = [(-(width / 2) * math.cos(t), y0 + height * math.sin(t)) for t in np.linspace(0, PI, segs + 1)]
    s = [0.0]
    for i in range(1, len(pts)): s.append(s[-1] + math.dist(pts[i], pts[i - 1]))
    L = s[-1]; P, N, U, I = [], [], [], []
    for i, ((x, y), si) in enumerate(zip(pts, s)):
        t = PI * i / segs
        nx, ny = -math.cos(t) / (width / 2), math.sin(t) / height
        nn = math.hypot(nx, ny); nx, ny = nx / nn, ny / nn
        v = -(si if si <= L / 2 else L - si) / uv_scale
        for z in (z0, z1):
            P.append((x, y, z)); N.append((nx, ny, 0)); U.append((z / uv_scale, v))
    for i in range(segs):
        p = 2 * i
        I += [(p, p + 2, p + 3), (p, p + 3, p + 1)]
    m = Mesh(P, N, U, I)
    fn = np.cross(m.pos[m.idx[:, 1]] - m.pos[m.idx[:, 0]], m.pos[m.idx[:, 2]] - m.pos[m.idx[:, 0]])
    if np.sum(fn * m.nrm[m.idx[:, 0]]) < 0: m.idx = m.idx[:, ::-1]
    return m

def gable_fill(width, height, y0, z, facing, segs=20, uv_scale=0.25):
    pts = [(-(width / 2) * math.cos(t), y0 + height * math.sin(t)) for t in np.linspace(0, PI, segs + 1)]
    P = [(0, y0, z)] + [(x, y, z) for x, y in pts]
    N = [(0, 0, facing)] * len(P)
    U = [(x / uv_scale, -(y - y0) / uv_scale) for x, y, _ in P]
    I = [(0, i + 1, i) if facing > 0 else (0, i, i + 1) for i in range(1, segs + 1)]
    return Mesh(P, N, U, I)

def barrel(h=0.1, r=0.04):
    prof = [(r * 0.82, 0), (r * 0.95, h * 0.25), (r, h * 0.5), (r * 0.95, h * 0.75), (r * 0.82, h)]
    b = lathe(prof, 20, 0.08, smooth_deg=60) + disk(r * 0.82, h, 20, 0.1)
    hoops = merge([torus(r * 0.86, 0.0035, 24, 6, y=h * 0.1), torus(r * 0.86, 0.0035, 24, 6, y=h * 0.9),
                   torus(r * 0.99, 0.0035, 24, 6, y=h * 0.38), torus(r * 0.99, 0.0035, 24, 6, y=h * 0.62)])
    return b, hoops

def ground(r=0.5, top=0.045, n=72):
    side = lathe([(r, 0.0), (r, top - 0.012), (r - 0.02, top)], n, 0.2, cap_bottom=True)
    return disk(r - 0.02, top, n, 0.32), side

def bushes(seed, spots, top):
    rng = np.random.default_rng(seed)
    out = []
    for (x, z, s) in spots:
        for k in range(3):
            b = rock(s * rng.uniform(0.6, 1.0), seed=int(rng.integers(1e6)), sub=2, rough=0.5, flat_bottom=True, uv_scale=0.1)
            out.append(b.moved(x + rng.uniform(-s, s) * 0.6, top + s * 0.35, z + rng.uniform(-s, s) * 0.6))
    return merge(out)

def stones(seed, spots, top, mat_scale=1):
    rng = np.random.default_rng(seed)
    return merge([rock(s, seed=int(rng.integers(1e6)), sub=2, rough=0.35).moved(x, top + s * 0.15, z) for x, z, s in spots])

# =====================================================================================  BASZTA
def baszta():
    parts = []
    add = lambda m, k: parts.append((m, k))
    g_top, g_side = ground(0.5, 0.045)
    add(g_top, 'trawa'); add(g_side, 'ziemia')
    add(disk(0.31, 0.047, 64, 0.22, r_in=0.25), 'bruk')
    add(box(0.13, 0.004, 0.2, 0.22, center=(0, 0.047, 0.38)), 'bruk')
    # cokół i trzon
    add(lathe([(0.262, 0.045), (0.262, 0.06), (0.244, 0.165)], 64, 0.34), 'kamien_ciemny')
    add(lathe([(0.244, 0.165), (0.229, 0.74)], 72, 0.42), 'kamien')
    # gzyms + konsole (machikuły)
    add(lathe([(0.229, 0.735), (0.262, 0.765), (0.262, 0.788)], 72, 0.3, smooth_deg=20), 'kamien_ciemny')
    for i in range(24):
        a = 2 * PI * i / 24
        add(on_wall(box(0.028, 0.06, 0.04, 0.12), a, 0.24, 0.712), 'kamien_ciemny')
    # parapet z blankami
    add(lathe([(0.258, 0.788), (0.258, 0.84)], 72, 0.42), 'kamien')
    add(lathe([(0.216, 0.84), (0.216, 0.788)], 72, 0.42), 'kamien')
    add(disk(0.258, 0.84, 72, 0.2, r_in=0.216), 'kamien_ciemny')
    for i in range(12):
        a = 2 * PI * (i + 0.5) / 12
        add(on_wall(box(0.082, 0.062, 0.04, 0.3), a, 0.237, 0.871), 'kamien')
        add(on_wall(box(0.088, 0.01, 0.046, 0.2), a, 0.237, 0.906), 'kamien_ciemny')
    # dach stożkowy, lekko wklęsły
    add(lathe([(0.212, 0.79), (0.21, 0.84), (0.19, 0.89), (0.15, 0.97), (0.095, 1.06), (0.04, 1.15), (0.004, 1.2)], 72, 0.24, smooth_deg=35), 'dachowka')
    add(torus(0.207, 0.008, 72, 8, y=0.842), 'metal')
    # iglica, kula, flaga
    add(cylinder(0.01, 0.16, 12, 0.1, y0=1.17), 'metal')
    add(sphere(0.024, 16).moved(0, 1.215, 0), 'zloto')
    add(sphere(0.012, 12).moved(0, 1.335, 0), 'zloto')
    add(cloth(0.15, 0.085, 14, 6, wave=0.018).moved(0.01, 1.235, 0), 'flaga')
    # brama
    door_r = 0.252
    add(box(0.13, 0.2, 0.03, 0.15, center=(0, 0.145, door_r - 0.004)), 'ciemne')
    add(box(0.1, 0.15, 0.012, 0.12, center=(0, 0.122, door_r + 0.012)), 'deski')
    half = disk(0.05, 0, 20, 0.12, a0=0, a1=PI).transformed(chain(T(0, 0.197, door_r + 0.012), Rx(-PI / 2)))
    add(half, 'deski')
    for i in range(9):  # łuk z klinów
        a = PI * i / 8
        v = box(0.03, 0.022, 0.03, 0.1).transformed(chain(T(0.066 * math.cos(a), 0.197 + 0.066 * math.sin(a), door_r + 0.012), Rz(a - PI / 2)))
        add(v, 'kamien_ciemny')
    for s in (-1, 1):
        add(box(0.026, 0.15, 0.03, 0.12, center=(s * 0.066, 0.122, door_r + 0.012)), 'kamien_ciemny')
        add(box(0.07, 0.008, 0.004, 0.1, center=(s * 0.012, 0.09 + 0.06 * (s > 0), door_r + 0.02)), 'metal')
    add(torus(0.008, 0.0022, 16, 6).transformed(chain(T(0.025, 0.13, door_r + 0.022), Rx(PI / 2))), 'metal')
    add(box(0.16, 0.012, 0.05, 0.15, center=(0, 0.051, door_r + 0.04)), 'kamien_ciemny')
    # pochodnie
    for s in (-1, 1):
        x = s * 0.1
        add(box(0.01, 0.04, 0.03, 0.1, center=(x, 0.215, door_r + 0.0)), 'metal')
        add(cylinder(0.008, 0.03, 8, 0.1, y0=0.225).moved(x, 0, door_r + 0.02), 'deski_ciemne')
        add(lathe([(0.012, 0.255), (0.009, 0.27), (0.0, 0.29)], 10, 0.1), 'ogien')
        parts[-1] = (parts[-1][0].moved(x, 0, door_r + 0.02), 'ogien')
    # strzelnice
    for ang, y in ((0.2, 0.33), (1.0, 0.52), (2.2, 0.4), (2.9, 0.6), (3.8, 0.35), (4.6, 0.55), (5.5, 0.45), (1.9, 0.62)):
        add(on_wall(box(0.05, 0.12, 0.02, 0.12), ang, 0.229, y), 'kamien_ciemny')
        add(on_wall(box(0.013, 0.09, 0.024, 0.1), ang, 0.229, y), 'ciemne')
    # okno z okiennicami (oświetlone)
    ang = PI / 2 + 0.55
    add(on_wall(box(0.08, 0.11, 0.02, 0.12), ang, 0.229, 0.5), 'kamien_ciemny')
    add(on_wall(box(0.056, 0.085, 0.024, 0.1), ang, 0.229, 0.497), 'okno_swiatlo')
    add(on_wall(box(0.06, 0.006, 0.026, 0.1), ang, 0.229, 0.497), 'deski_ciemne')
    add(on_wall(box(0.006, 0.085, 0.026, 0.1), ang, 0.229, 0.497), 'deski_ciemne')
    for s in (-1, 1):
        sh = box(0.03, 0.09, 0.006, 0.1).transformed(chain(T(s * 0.055, 0, 0.03), Ry(s * 0.6)))
        add(on_wall(sh, ang, 0.229, 0.497), 'deski')
    # chorągiew na murze
    ang = PI / 2 - 0.65
    add(on_wall(cylinder(0.004, 0.11, 8, 0.1).transformed(Rz(PI / 2)).moved(0.055, 0, 0.02), ang, 0.229, 0.7), 'metal')
    add(on_wall(cloth(0.085, 0.22, 4, 10, wave=0.004).moved(-0.0425, -0.22, 0.024), ang, 0.229, 0.7), 'flaga')
    add(on_wall(cloth(0.02, 0.22, 2, 10, wave=0.0).moved(-0.01, -0.22, 0.0255), ang, 0.229, 0.7), 'flaga_zolta')
    # beczki, skrzynie, krzaki, kamienie
    for (x, z, rot) in ((0.205, 0.255, 0.3), (0.272, 0.18, 1.2)):
        b, h = barrel(0.1, 0.042)
        add(b.transformed(chain(T(x, 0.045, z), Ry(rot))), 'deski'); add(h.transformed(chain(T(x, 0.045, z), Ry(rot))), 'metal')
    add(box(0.075, 0.07, 0.075, 0.1).transformed(chain(T(-0.23, 0.08, 0.24), Ry(0.4))), 'deski')
    add(box(0.055, 0.05, 0.055, 0.1).transformed(chain(T(-0.235, 0.14, 0.235), Ry(0.9))), 'deski')
    add(bushes(3, [(-0.33, 0.12, 0.06), (0.36, -0.12, 0.07), (-0.12, -0.38, 0.065), (0.08, 0.42, 0.035)], 0.045), 'krzew')
    add(stones(4, [(0.39, 0.2, 0.028), (-0.4, -0.2, 0.034), (0.25, -0.36, 0.022), (-0.3, 0.33, 0.02)], 0.045), 'skala')
    return [{'name': 'baszta', 'parts': parts}], []

# =====================================================================================  LATARNIA
def latarnia():
    parts = []; add = lambda m, k: parts.append((m, k))
    add(disk(0.6, 0.0, 72, 0.45), 'woda')
    add(lathe([(0.6, -0.03), (0.6, 0.0)], 72, 0.3, cap_bottom=True), 'ciemne')
    isl = rock(0.38, seed=5, sub=3, rough=0.22).transformed(S(1, 0.42, 1)).moved(0, 0.02, 0)
    add(isl, 'skala')
    rng = np.random.default_rng(11)
    for i in range(11):
        a = 2 * PI * i / 11 + rng.uniform(-0.2, 0.2); r = rng.uniform(0.33, 0.44); s = rng.uniform(0.04, 0.085)
        add(rock(s, seed=100 + i, sub=2).moved(r * math.cos(a), s * 0.15, r * math.sin(a)), 'skala')
    # taras
    add(lathe([(0.3, 0.06), (0.3, 0.125), (0.31, 0.135)], 12, 0.3), 'kamien_ciemny')
    add(disk(0.31, 0.135, 12, 0.22), 'bruk')
    for i in range(36):
        a = 2 * PI * i / 36
        add(cylinder(0.0035, 0.06, 6, 0.1, y0=0.135, caps=False).moved(0.29 * math.cos(a), 0, 0.29 * math.sin(a)), 'metal')
    add(torus(0.29, 0.004, 72, 6, y=0.195), 'metal'); add(torus(0.29, 0.003, 72, 6, y=0.165), 'metal')
    # wieża w pasy
    y0, y1, r0, r1 = 0.135, 0.86, 0.145, 0.097
    bands = 6
    for i in range(bands):
        ya, yb = y0 + (y1 - y0) * i / bands, y0 + (y1 - y0) * (i + 1) / bands
        ra, rb = r0 + (r1 - r0) * i / bands, r0 + (r1 - r0) * (i + 1) / bands
        add(lathe([(ra, ya), (rb, yb)], 64, 0.3), 'tynk_czerwony' if i % 2 else 'tynk')
    add(lathe([(0.152, 0.135), (0.152, 0.16), (0.146, 0.17)], 64, 0.3), 'kamien_ciemny')
    # okienka (spiralnie)
    for k, (ang, y) in enumerate(((PI / 2 + 0.9, 0.33), (PI / 2 - 0.8, 0.47), (PI / 2 + 2.2, 0.6), (PI / 2 + 0.2, 0.73))):
        r = r0 + (r1 - r0) * (y - y0) / (y1 - y0)
        add(on_wall(box(0.04, 0.06, 0.012, 0.1), ang, r, y), 'tynk')
        add(on_wall(box(0.026, 0.044, 0.016, 0.1), ang, r, y), 'okno_swiatlo' if k == 2 else 'ciemne')
        add(on_wall(box(0.046, 0.008, 0.02, 0.1), ang, r, y - 0.034), 'tynk')
    # drzwi z daszkiem
    add(on_wall(box(0.07, 0.12, 0.02, 0.12), PI / 2, 0.142, 0.2), 'ciemne')
    add(on_wall(box(0.055, 0.105, 0.012, 0.1), PI / 2, 0.148, 0.193), 'deski')
    add(on_wall(box(0.09, 0.008, 0.05, 0.15).transformed(Rx(0.35)).moved(0, 0, 0.02), PI / 2, 0.145, 0.27), 'dachowka')
    # galeria
    add(lathe([(0.097, 0.86), (0.135, 0.885)], 64, 0.2), 'tynk')
    for i in range(20):
        a = 2 * PI * i / 20
        add(on_wall(box(0.014, 0.03, 0.05, 0.1), a, 0.118, 0.875), 'tynk')
    add(lathe([(0.168, 0.885), (0.168, 0.9)], 64, 0.2, cap_top=True, cap_bottom=True), 'metal')
    for i in range(28):
        a = 2 * PI * i / 28
        add(cylinder(0.0032, 0.058, 6, 0.1, y0=0.9, caps=False).moved(0.162 * math.cos(a), 0, 0.162 * math.sin(a)), 'metal')
    add(torus(0.162, 0.0042, 64, 6, y=0.958), 'metal'); add(torus(0.162, 0.003, 64, 6, y=0.93), 'metal')
    # laterna
    add(lathe([(0.088, 0.9), (0.088, 0.935), (0.082, 0.94)], 40, 0.2, cap_top=True), 'tynk_czerwony')
    add(lathe([(0.08, 0.94), (0.08, 1.045)], 10, 0.2), 'szklo')
    for i in range(10):
        a = 2 * PI * i / 10
        add(box(0.007, 0.105, 0.007, 0.1).moved(0.08 * math.cos(a), 0.9925, 0.08 * math.sin(a)), 'metal')
    add(torus(0.08, 0.005, 40, 6, y=0.99), 'metal')
    add(lathe([(0.0, 0.945), (0.03, 0.952), (0.042, 0.975), (0.042, 1.01), (0.03, 1.03), (0.0, 1.036)], 24, 0.1, smooth_deg=60), 'lampa')
    # kopuła
    add(lathe([(0.092, 1.045), (0.092, 1.055)], 40, 0.2, cap_bottom=True), 'metal')
    add(sphere(0.09, 32, 0.2, top_only=True).transformed(S(1, 0.9, 1)).moved(0, 1.055, 0), 'kopula')
    add(sphere(0.018, 16).moved(0, 1.145, 0), 'metal')
    add(cylinder(0.003, 0.08, 6, 0.1, y0=1.155), 'metal')
    add(sphere(0.006, 8).moved(0, 1.237, 0), 'zloto')
    # domek latarnika przy wieży
    hx, hz, ha = -0.19, -0.1, -0.5
    Mh = chain(T(hx, 0.135, hz), Ry(ha))
    add(box(0.16, 0.12, 0.13, 0.25, center=(0, 0.06, 0)).transformed(Mh), 'tynk')
    add(prism(0.16, 0.07, 0.13, 0.25).moved(0, 0.12, 0).transformed(Mh), 'tynk')
    add(gable_roof(0.16, 0.07, 0.13, 0.015, 0.012, 0.16).moved(0, 0.12, 0).transformed(chain(Mh, Ry(0))), 'dachowka')
    add(box(0.03, 0.08, 0.03, 0.1, center=(0.04, 0.2, -0.03)).transformed(Mh), 'kamien_ciemny')
    add(box(0.04, 0.075, 0.01, 0.1, center=(-0.03, 0.0375, 0.068)).transformed(Mh), 'deski')
    add(box(0.035, 0.035, 0.01, 0.1, center=(0.04, 0.07, 0.068)).transformed(Mh), 'okno_swiatlo')
    add(box(0.043, 0.006, 0.014, 0.1, center=(0.04, 0.05, 0.068)).transformed(Mh), 'tynk')
    # łódka
    hull = sphere(1, 24, 0.5, top_only=True).transformed(chain(T(0.42, 0.012, 0.28), Ry(0.6), S(0.13, -0.05, 0.05)))
    add(hull, 'deski'); add(torus(1, 0.06, 32, 6).transformed(chain(T(0.42, 0.014, 0.28), Ry(0.6), S(0.13, 0.05, 0.05))), 'deski_ciemne')
    for s in (-0.04, 0.04):
        add(box(0.008, 0.006, 0.09, 0.1).transformed(chain(T(0.42, 0.01, 0.28), Ry(0.6), T(s, 0, 0))), 'deski_ciemne')
    nodes = [{'name': 'latarnia', 'parts': parts}]
    # obracający się snop światła
    beam_parts = []
    for ang in (-PI / 2, PI / 2):
        c = lathe([(0.025, 0.0), (0.11, 0.65)], 20, 0.3, smooth_deg=90).transformed(Rz(ang))
        beam_parts.append((c, 'snop'))
    nodes.append({'name': 'snop_swiatla', 'parts': beam_parts, 'translation': (0, 0.99, 0)})
    times = np.linspace(0, 5, 9)
    rots = [quat((0, 1, 0), 2 * PI * k / 8) for k in range(9)]
    return nodes, [{'name': 'Swiatlo', 'channels': [('snop_swiatla', 'rotation', times, rots)]}]

# =====================================================================================  WIATRAK
def wiatrak():
    parts = []; add = lambda m, k: parts.append((m, k))
    g_top, g_side = ground(0.5, 0.045)
    add(g_top, 'trawa'); add(g_side, 'ziemia')
    G = 0.045
    # fundamenty i kozioł
    piers = [(0.15, 0.15), (-0.15, 0.15), (0.15, -0.15), (-0.15, -0.15)]
    for x, z in piers:
        add(box(0.075, 0.06, 0.075, 0.12, center=(x, G + 0.03, z)), 'kamien_ciemny')
    add(beam((-0.17, G + 0.085, -0.17), (0.17, G + 0.085, 0.17), 0.045, 0.045, 0.2), 'deski_ciemne')
    add(beam((-0.17, G + 0.085, 0.17), (0.17, G + 0.085, -0.17), 0.045, 0.045, 0.2), 'deski_ciemne')
    add(cylinder(0.045, 0.33, 16, 0.15, y0=G + 0.1), 'deski_ciemne')
    for x, z in piers:
        add(beam((x * 0.85, G + 0.1, z * 0.85), (x * 0.12, 0.36, z * 0.12), 0.03, 0.03, 0.2), 'deski_ciemne')
    # korpus
    bw, bh, bd, by = 0.36, 0.4, 0.4, 0.42
    add(box(bw, bh, bd, 0.26, center=(0, by + bh / 2, 0)), 'deski_stare')
    for sx in (-1, 1):
        for sz in (-1, 1):
            add(box(0.026, bh + 0.01, 0.026, 0.15, center=(sx * bw / 2, by + bh / 2, sz * bd / 2)), 'deski_ciemne')
    for y in (by + 0.01, by + bh * 0.52):
        add(box(bw + 0.02, 0.02, bd + 0.02, 0.15, center=(0, y, 0)).transformed(np.eye(4)), 'deski_ciemne')
    add(box(bw + 0.04, 0.03, bd + 0.04, 0.15, center=(0, by - 0.005, 0)), 'deski_ciemne')
    # dach łukowy
    rw, rh, ry = bw + 0.07, 0.15, by + bh
    add(arch_roof(rw, rh, -bd / 2 - 0.035, bd / 2 + 0.035, ry, 24, 0.2), 'gont')
    inner = arch_roof(rw - 0.012, rh - 0.01, -bd / 2 - 0.034, bd / 2 + 0.034, ry - 0.004, 24, 0.2)
    inner.idx = inner.idx[:, ::-1]; inner.nrm = -inner.nrm
    add(inner, 'deski_ciemne')
    for zf, f in ((bd / 2 + 0.001, 1), (-bd / 2 - 0.001, -1)):
        add(gable_fill(bw, rh * (bw / rw) ** 0.5 * 0.98, ry, zf, f, 24, 0.26), 'deski_stare')
    add(beam((0, ry + rh + 0.006, -bd / 2 - 0.04), (0, ry + rh + 0.006, bd / 2 + 0.04), 0.03, 0.02, 0.15), 'deski_ciemne')
    # okna i drzwi
    for side in (-1, 1):
        for zc in (-0.08, 0.09):
            add(box(0.012, 0.075, 0.06, 0.1, center=(side * (bw / 2 + 0.002), by + 0.27, zc)), 'deski_ciemne')
            add(box(0.014, 0.055, 0.042, 0.1, center=(side * (bw / 2 + 0.003), by + 0.27, zc)), 'okno_swiatlo' if (side, zc) == (1, 0.09) else 'ciemne')
    add(box(0.06, 0.06, 0.012, 0.1, center=(-0.1, by + 0.24, bd / 2 + 0.002)), 'deski_ciemne')
    add(box(0.044, 0.044, 0.014, 0.1, center=(-0.1, by + 0.24, bd / 2 + 0.003)), 'ciemne')
    add(box(0.09, 0.17, 0.014, 0.12, center=(0, by + 0.095, -bd / 2 - 0.003)), 'deski')
    add(box(0.11, 0.012, 0.03, 0.1, center=(0, by + 0.185, -bd / 2 - 0.01)), 'deski_ciemne')
    # schody i dyszel z tyłu
    top, bot = np.array([0, by + 0.0, -bd / 2 - 0.01]), np.array([0, G + 0.005, -0.47])
    for sx in (-0.055, 0.055):
        add(beam(top + [sx, 0, 0], bot + [sx, 0, 0], 0.016, 0.03, 0.2), 'deski_ciemne')
    for k in range(1, 9):
        p = top + (bot - top) * k / 9
        add(box(0.1, 0.008, 0.035, 0.1, center=p + [0, 0.012, 0]), 'deski')
    for sx in (-0.06, 0.06):
        add(beam(top + [sx, 0.14, 0], bot + [sx, 0.14, 0], 0.01, 0.01, 0.2), 'deski_ciemne')
        add(beam(bot + [sx, 0, 0], bot + [sx, 0.14, 0], 0.012, 0.012, 0.2), 'deski_ciemne')
    add(beam((0, by - 0.01, -0.12), (0, G + 0.03, -0.5), 0.03, 0.035, 0.2), 'deski_ciemne')
    # wał
    add(cylinder(0.026, 0.12, 16, 0.1).transformed(chain(T(0, by + 0.31, bd / 2 - 0.02), Rx(PI / 2))), 'deski_ciemne')
    # dodatki: worki, płotek, krzaki, kamienie
    for (x, z, r) in ((0.24, -0.2, 0.3), (0.29, -0.13, 1.4), (0.255, -0.15, 2.0)):
        sk = sphere(0.05, 16, 0.1).transformed(chain(T(x, G + 0.045, z), Ry(r), S(0.85, 1.0, 0.75)))
        add(sk, 'worek'); add(cylinder(0.012, 0.025, 8, 0.05, y0=0).moved(x, G + 0.09, z), 'worek')
    for i in range(6):
        a = 2.3 + i * 0.16
        x, z = 0.43 * math.cos(a), 0.43 * math.sin(a)
        add(box(0.016, 0.1, 0.016, 0.1, center=(x, G + 0.05, z)), 'deski_ciemne')
    for yy in (0.04, 0.075):
        p = [(0.43 * math.cos(2.3 + i * 0.16), 0.43 * math.sin(2.3 + i * 0.16)) for i in range(6)]
        for (x0, z0), (x1, z1) in zip(p, p[1:]):
            add(beam((x0, G + yy, z0), (x1, G + yy, z1), 0.008, 0.016, 0.15), 'deski')
    add(bushes(7, [(-0.36, -0.2, 0.065), (0.36, 0.25, 0.06), (-0.25, 0.36, 0.045)], G), 'krzew')
    add(stones(8, [(0.4, -0.05, 0.03), (-0.42, 0.1, 0.026), (0.12, 0.42, 0.02)], G), 'skala')
    nodes = [{'name': 'wiatrak', 'parts': parts}]
    # śmigła – osobny węzeł obracany wokół osi Z
    S_ = []
    S_.append((cylinder(0.04, 0.05, 16, 0.1).transformed(Rx(PI / 2)), 'deski_ciemne'))
    S_.append((sphere(0.028, 12).moved(0, 0, 0.05), 'metal'))
    for k in range(4):
        Rk = Rz(PI / 4 + k * PI / 2)
        arm = beam((0, -0.02, 0.03), (0, 0.5, 0.03), 0.02, 0.022, 0.2)
        S_.append((arm.transformed(Rk), 'deski_ciemne'))
        for xo in (0.012, 0.11):
            S_.append((beam((xo, 0.09, 0.027), (xo, 0.49, 0.027), 0.008, 0.008, 0.2).transformed(Rk), 'deski_ciemne'))
        for j in range(11):
            y = 0.09 + 0.4 * j / 10
            S_.append((box(0.105, 0.007, 0.007, 0.1, center=(0.06, y, 0.031)).transformed(Rk), 'deski'))
        S_.append((cloth(0.095, 0.38, 6, 12, wave=0.0).moved(0.015, 0.1, 0.022).transformed(Rk), 'plotno'))
    nodes.append({'name': 'smigla', 'parts': S_, 'translation': (0, by + 0.31, bd / 2 + 0.1)})
    times = np.linspace(0, 6, 9)
    rots = [quat((0, 0, -1), 2 * PI * k / 8) for k in range(9)]
    return nodes, [{'name': 'Smigla', 'channels': [('smigla', 'rotation', times, rots)]}]

# =====================================================================================
def build(out_dir):
    global TEX
    TEX = tekstury.all_textures()
    os.makedirs(out_dir, exist_ok=True)
    for name, fn in (('baszta', baszta), ('latarnia', latarnia), ('wiatrak', wiatrak)):
        nodes, anims = fn()
        used = sorted({k for nd in nodes for _, k in nd['parts']})
        mats = {k: MATS[k] for k in used}
        tex_keys = sorted({m[f] for m in mats.values() for f in ('tex', 'normal') if m.get(f)})
        textures = {}
        for k in tex_keys:
            c, n = TEX[k]
            textures[k] = (c, 'jpeg')
            textures[k + '_n'] = (n, 'jpeg')
        for m in mats.values():
            if m.get('normal'): m['normal'] = m['normal'] + '_n'
        path = os.path.join(out_dir, f'{name}.glb')
        ntri = write_glb(path, nodes, mats, textures, anims)
        for m in mats.values():
            if m.get('normal'): m['normal'] = m['normal'][:-2]
        print(f'{name:9s} {ntri:6d} trójkątów  {os.path.getsize(path) / 1e6:.2f} MB  tekstury: {len(textures)}')

if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else '/tmp/hq')
