"""Modele 3D do lekcji biologii „Serce i układ krwionośny” (klasa VII).

Kształty organiczne powstają z pól odległości (SDF): elipsoidy komór i przedsionków, rury naczyń,
łączone gładką sumą, a potem zamieniane w siatkę algorytmem marching cubes. Kolory jak w atlasach:
naczynia z krwią utlenowaną – czerwone, z odtlenowaną – niebieskie.

  serce.glb          – serce z naczyniami, animacja „Bicie” (skurcz komór ~72 / min)
  serce-przekroj.glb – przekrój czołowy: 4 jamy, przegroda, zastawki, animacja „Przeplyw” krwinek
  naczynia.glb       – tętnica, żyła (z zastawką) i naczynia włosowate w przekroju, animacja „Przeplyw”
  krew.glb           – składniki krwi: krwinka czerwona, krwinki białe, płytki krwi

Użycie: python3 serce.py katalog_wyjściowy
"""
import math, os, sys
import numpy as np
from skimage.measure import marching_cubes

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "hq"))
from siatki import Mesh, write_glb, quat, lathe, sphere, T, S, Rz, Rx, Ry, chain, torus, merge  # noqa: E402

PI = math.pi
CM = 0.022            # 1 cm modelu = 2,2 cm w AR (serce ~30 cm – dobrze widać na ławce)

# ------------------------------------------------------------------ pola odległości
def rot_z(p, a):
    c, s = math.cos(a), math.sin(a)
    return np.stack([c * p[..., 0] + s * p[..., 1], -s * p[..., 0] + c * p[..., 1], p[..., 2]], -1)

def elipsoida(c, r, rz=0.0):
    c, r = np.array(c, float), np.array(r, float)
    def f(p):
        q = rot_z(p - c, rz) / r
        k0 = np.linalg.norm(q, axis=-1)
        return (k0 - 1.0) * r.min()
    return f

def jajo(c, r, rz=0.0, zwez=0.55):
    """Elipsoida zwężająca się ku dołowi (koniuszek serca)."""
    c, r = np.array(c, float), np.array(r, float)
    def f(p):
        q = rot_z(p - c, rz) / r
        t = np.clip(-q[..., 1], 0, 1.2)
        k = 1.0 - zwez * t ** 1.6
        q2 = np.stack([q[..., 0] / k, q[..., 1], q[..., 2] / k], -1)
        return (np.linalg.norm(q2, axis=-1) - 1.0) * r.min() * np.minimum(k, 1.0)
    return f

def rura(pts, r0, r1=None):
    """Rura wzdłuż łamanej (promień zmienia się liniowo od r0 do r1)."""
    pts = np.array(pts, float); r1 = r0 if r1 is None else r1
    L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]; L /= L[-1]
    def f(p):
        best = np.full(p.shape[:-1], 1e9)
        for i in range(len(pts) - 1):
            a, b = pts[i], pts[i + 1]; ab = b - a
            t = np.clip(((p - a) @ ab) / (ab @ ab), 0, 1)
            d = np.linalg.norm(p - (a + t[..., None] * ab), axis=-1)
            r = r0 + (r1 - r0) * (L[i] + (L[i + 1] - L[i]) * t)
            best = np.minimum(best, d - r)
        return best
    return f

def gladko(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)

def wygladz_luk(pts, n=3):
    """Zaokrągla łamaną (Chaikin) – łuk aorty, pnie naczyń."""
    p = np.array(pts, float)
    for _ in range(n):
        q = [p[0]]
        for a, b in zip(p[:-1], p[1:]): q += [0.75 * a + 0.25 * b, 0.25 * a + 0.75 * b]
        q.append(p[-1]); p = np.array(q)
    return p

# ------------------------------------------------------------------ siatka z pola
def siatka_z_pola(f, lo, hi, n, kolor_fn, skala=CM):
    lo, hi = np.array(lo, float), np.array(hi, float)
    ax = [np.linspace(lo[i], hi[i], n[i]) for i in range(3)]
    X, Y, Z = np.meshgrid(*ax, indexing="ij")
    P = np.stack([X, Y, Z], -1)
    V = f(P)
    step = (hi - lo) / (np.array(n) - 1)
    v, faces, _, _ = marching_cubes(V, 0.0, spacing=tuple(step))
    v = v + lo
    # normalne z gradientu pola (gładkie)
    e = 0.02
    g = np.stack([f(v + [e, 0, 0]) - f(v - [e, 0, 0]), f(v + [0, e, 0]) - f(v - [0, e, 0]), f(v + [0, 0, e]) - f(v - [0, 0, e])], -1)
    nrm = g / (np.linalg.norm(g, axis=1, keepdims=True) + 1e-9)
    faces = faces.copy()
    col = kolor_fn(v, nrm)
    uv = np.c_[v[:, 0], -v[:, 1]] * 0.1
    return Mesh(v * skala, nrm, uv, faces, col)

def szum(p, s=1.3, seed=0):
    rng = np.random.default_rng(seed)
    out = np.zeros(len(p))
    for k in range(4):
        w = rng.normal(size=3) * s * (2 ** k); ph = rng.uniform(0, 2 * PI)
        out += np.sin(p @ w + ph) / (2 ** k)
    return out / 1.9

# ------------------------------------------------------------------ anatomia (cm, x = lewa strona pacjenta, z = przód)
CZERW = np.array([0.80, 0.16, 0.14]); CZERW_ZYLY = np.array([0.74, 0.20, 0.18])
NIEB = np.array([0.24, 0.36, 0.72]); MIESIEN = np.array([0.66, 0.24, 0.21])
TLUSZCZ = np.array([0.93, 0.80, 0.50]); ZASTAWKA = np.array([0.95, 0.90, 0.80]); PRZEKROJ = np.array([0.86, 0.45, 0.42])

def anatomia(dydaktyczny=False):
    """Zwraca listę (pole, kolor, k_gładkości) części zewnętrznych i listę światła (jam) dla przekroju."""
    z0 = 0.0 if dydaktyczny else None
    if not dydaktyczny:
        komory = [
            ("LK", jajo((0.9, -1.9, 0.0), (3.9, 4.9, 3.2), -0.62, 0.62), MIESIEN),
            ("PK", elipsoida((-1.3, -0.7, 1.1), (2.7, 2.9, 2.0), -0.45), MIESIEN),
            ("PP", elipsoida((-3.0, 1.7, 0.1), (2.1, 2.2, 2.0)), MIESIEN),
            ("LP", elipsoida((1.0, 2.3, -1.7), (2.4, 1.6, 1.8)), MIESIEN),
            ("uszkoP", elipsoida((-2.3, 2.7, 1.7), (1.3, 0.8, 0.8), 0.4), MIESIEN),
            ("uszkoL", elipsoida((2.7, 1.9, 0.9), (1.2, 0.7, 0.7), -0.3), MIESIEN),
        ]
        aorta = wygladz_luk([(0.3, 1.0, 0.0), (0.1, 4.6, 0.3), (1.0, 6.4, -0.5), (2.8, 5.8, -1.7), (3.2, 2.0, -2.8), (3.2, -3.5, -2.8)])
        pien = wygladz_luk([(-0.7, 0.8, 1.7), (0.1, 3.4, 1.7), (0.7, 4.3, 0.6)])
        naczynia = [
            ("aorta", rura(aorta, 1.25, 1.0), CZERW),
            ("ramienno", rura(wygladz_luk([(0.5, 6.0, -0.2), (-0.3, 7.4, -0.2), (-0.8, 8.8, -0.2)]), 0.62, 0.5), CZERW),
            ("szyjna", rura([(1.5, 6.4, -0.7), (1.5, 9.0, -0.7)], 0.42), CZERW),
            ("podobojczykowa", rura(wygladz_luk([(2.3, 6.1, -1.2), (2.9, 7.4, -1.3), (3.8, 8.4, -1.3)]), 0.46), CZERW),
            ("pien", rura(pien, 1.15, 1.05), NIEB),
            ("pluca_L", rura(wygladz_luk([(0.7, 4.3, 0.6), (2.6, 4.0, -0.4), (5.2, 3.7, -0.7)]), 0.85, 0.7), NIEB),
            ("pluca_P", rura(wygladz_luk([(0.6, 4.3, 0.4), (-0.8, 4.5, -0.9), (-2.4, 4.4, -1.4), (-5.0, 4.0, -1.4)]), 0.8, 0.68), NIEB),
            ("zyla_g", rura([(-3.1, 2.4, 0.0), (-3.2, 8.0, -0.3)], 1.0), NIEB),
            ("zyla_d", rura([(-2.9, 0.4, -0.5), (-3.0, -4.2, -0.8)], 1.05), NIEB),
            ("pzL1", rura([(2.4, 2.8, -2.4), (5.0, 3.2, -2.7)], 0.45), CZERW_ZYLY),
            ("pzL2", rura([(2.4, 1.8, -2.4), (5.0, 1.4, -2.7)], 0.45), CZERW_ZYLY),
            ("pzP1", rura([(-0.4, 2.7, -2.5), (-4.4, 3.1, -3.0)], 0.45), CZERW_ZYLY),
            ("pzP2", rura([(-0.4, 1.7, -2.5), (-4.4, 1.3, -3.0)], 0.45), CZERW_ZYLY),
        ]
        return komory, naczynia, [], None
    # ---- model dydaktyczny: cztery jamy w jednej płaszczyźnie (przekrój czołowy jak w atlasie)
    komory = [
        ("LK", elipsoida((1.6, -1.7, 0.0), (3.1, 4.3, 2.8), -0.45), MIESIEN),
        ("PK", elipsoida((-1.6, -1.1, 0.0), (2.9, 3.4, 2.6), -0.25), MIESIEN),
        ("PP", elipsoida((-2.9, 2.0, 0.0), (2.2, 2.0, 2.4)), MIESIEN),
        ("LP", elipsoida((2.0, 2.2, -0.2), (2.4, 1.8, 2.3)), MIESIEN),
    ]
    aorta = wygladz_luk([(0.6, 0.8, 0.0), (0.9, 4.8, 0.0), (2.0, 6.4, -0.8), (3.6, 5.6, -2.2), (3.9, 2.4, -2.8), (3.9, -2.5, -2.8)])
    pien = wygladz_luk([(-0.9, 0.6, 0.0), (-0.7, 3.6, 0.0), (-0.4, 4.4, -1.2)])
    naczynia = [
        ("aorta", rura(aorta, 1.15, 1.0), CZERW),
        ("ramienno", rura([(1.1, 6.0, -0.3), (0.6, 8.6, -0.3)], 0.55), CZERW),
        ("szyjna", rura([(2.1, 6.5, -0.8), (2.1, 8.8, -0.8)], 0.42), CZERW),
        ("pien", rura(pien, 1.05, 0.95), NIEB),
        ("pluca_L", rura(wygladz_luk([(-0.4, 4.4, -1.2), (2.0, 4.0, -1.9), (5.4, 3.8, -1.9)]), 0.75), NIEB),
        ("pluca_P", rura(wygladz_luk([(-0.4, 4.4, -1.2), (-2.0, 4.7, -2.0), (-5.2, 4.5, -2.0)]), 0.72), NIEB),
        ("zyla_g", rura([(-3.3, 3.0, 0.0), (-3.4, 8.0, 0.0)], 0.95), NIEB),
        ("zyla_d", rura([(-3.0, 0.6, 0.0), (-3.1, -4.0, 0.0)], 1.0), NIEB),
        ("pzL", rura([(3.0, 2.6, -0.6), (5.6, 2.8, -0.6)], 0.5), CZERW_ZYLY),
        ("pzP", rura([(0.9, 2.9, -1.4), (-1.5, 3.2, -2.9), (-4.6, 3.2, -2.9)], 0.45), CZERW_ZYLY),
    ]
    jamy = [
        ("LK", elipsoida((1.75, -1.4, 0.0), (1.85, 3.0, 1.75), -0.45), CZERW),
        ("PK", elipsoida((-1.75, -0.8, 0.0), (2.25, 2.7, 2.0), -0.25), NIEB),
        ("PP", elipsoida((-2.9, 2.05, 0.0), (1.75, 1.55, 1.9)), NIEB),
        ("LP", elipsoida((2.05, 2.25, -0.2), (1.95, 1.35, 1.85)), CZERW),
        ("aorta", rura(aorta, 0.9, 0.78), CZERW),
        ("pien", rura(pien, 0.82, 0.74), NIEB),
        ("pluca_L", rura(wygladz_luk([(-0.4, 4.4, -1.2), (2.0, 4.0, -1.9), (5.4, 3.8, -1.9)]), 0.55), NIEB),
        ("pluca_P", rura(wygladz_luk([(-0.4, 4.4, -1.2), (-2.0, 4.7, -2.0), (-5.2, 4.5, -2.0)]), 0.52), NIEB),
        ("zyla_g", rura([(-3.3, 3.0, 0.0), (-3.4, 8.5, 0.0)], 0.75), NIEB),
        ("zyla_d", rura([(-3.0, 1.0, 0.0), (-3.1, -4.5, 0.0)], 0.8), NIEB),
        ("pzL", rura([(2.6, 2.6, -0.6), (5.8, 2.8, -0.6)], 0.33), CZERW),
        ("pzP", rura([(1.3, 2.8, -1.2), (-1.5, 3.2, -2.9), (-4.8, 3.2, -2.9)], 0.3), CZERW),
    ]
    # zastawki: płatki między przedsionkami i komorami oraz u ujścia tętnic (cienkie dyski z otworem)
    def platek(c, n, r, grub=0.12):
        c, n = np.array(c, float), np.array(n, float) / np.linalg.norm(n)
        def f(p):
            d = p - c; h = d @ n
            rad = np.linalg.norm(d - h[..., None] * n, axis=-1)
            ring = np.maximum(rad - r, (r * 0.45) - rad)            # pierścień z otworem w środku
            return np.maximum(ring, np.abs(h) - grub)
        return f
    zastawki = [
        ("trojdzielna", platek((-2.3, 0.75, 0.0), (0.35, 1, 0), 1.6), ZASTAWKA),
        ("dwudzielna", platek((2.0, 0.65, 0.0), (-0.25, 1, 0), 1.55), ZASTAWKA),
        ("aortalna", platek((0.68, 1.6, 0.0), (0.05, 1, 0), 0.9), ZASTAWKA),
        ("pnia", platek((-0.86, 1.4, 0.0), (0.05, 1, 0), 0.82), ZASTAWKA),
    ]
    return komory, naczynia, jamy, zastawki

def zloz(czesci, k):
    f0 = None
    for _, f, _c in czesci:
        f0 = f if f0 is None else (lambda a, b: (lambda p: gladko(a(p), b(p), k)))(f0, f)
    return f0

def kolorowanie(czesci, extra=(), seed=0, przekroj_z=None, jamy=()):
    def fn(v, nrm):
        ds = np.stack([f(v) for _, f, _ in czesci], 1)
        w = np.exp(-np.clip(ds - ds.min(1, keepdims=True), 0, None) * 10.0)
        w /= w.sum(1, keepdims=True)
        cols = np.stack([c for _, _, c in czesci])
        col = w @ cols
        if jamy:
            dj = np.stack([f(v) for _, f, _ in jamy], 1)
            wj = np.exp(-np.clip(dj - dj.min(1, keepdims=True), 0, None) * 5.0); wj /= wj.sum(1, keepdims=True)
            cj = wj @ np.stack([c for _, _, c in jamy])
            inside = np.clip(1.0 - np.abs(dj.min(1)) / 0.25, 0, 1)[:, None]          # wierzchołek na ścianie jamy
            col = col * (1 - inside) + (0.55 * cj + 0.45 * MIESIEN) * inside
        for f, c, zasieg in extra:
            t = np.clip(1.0 - np.abs(f(v)) / zasieg, 0, 1)[:, None]
            col = col * (1 - t) + np.array(c) * t
        if przekroj_z is not None:
            cut = (np.abs(v[:, 2] - przekroj_z) < 0.04) & (nrm[:, 2] > 0.9)
            col[cut] = PRZEKROJ * (0.92 + 0.08 * szum(v[cut], 2.0, seed + 3)[:, None])
        n = szum(v, 1.6, seed)[:, None]
        return np.clip(col * (0.9 + 0.1 * n), 0, 1) ** 2.2
    return fn

def naczynia_wiencowe(f_serca):
    """Tętnice wieńcowe i tłuszcz w bruździe – ścieżki rzutowane na powierzchnię serca."""
    def rzut(pts, wys=0.0):
        out = []
        for p in np.array(pts, float):
            c = np.array([0.0, -0.5, 0.2]); d = p - c; d /= np.linalg.norm(d)
            lo, hi = 0.0, 12.0
            for _ in range(40):
                m = (lo + hi) / 2
                if f_serca((c + d * m)[None])[0] > 0: hi = m
                else: lo = m
            out.append(c + d * (lo + wys))
        return wygladz_luk(out, 3)
    bruzda = rzut([(-1.0, 1.4, 3.0), (-0.2, -0.8, 3.2), (0.8, -3.2, 2.8), (2.0, -5.0, 1.8), (2.9, -5.6, 0.6)])
    galaz = rzut([(-0.6, 1.0, 3.0), (1.6, 0.2, 2.6), (3.2, -0.8, 1.6), (4.0, -2.0, 0.0)])
    prawa = rzut([(-1.4, 1.2, 2.6), (-3.0, 0.2, 2.2), (-3.6, -1.4, 0.8), (-3.4, -2.6, -0.8)])
    zylna = rzut([(-0.4, 1.0, 3.2), (0.5, -1.2, 3.3), (1.5, -3.6, 2.7)])
    return [
        ("wienc_LAD", rura(bruzda, 0.3, 0.16), CZERW),
        ("wienc_Cx", rura(galaz, 0.26, 0.14), CZERW),
        ("wienc_P", rura(prawa, 0.26, 0.14), CZERW),
        ("zyla_wienc", rura(zylna, 0.22, 0.12), NIEB),
    ], [(rura(bruzda, 0.7, 0.4), TLUSZCZ, 0.3)]

# ------------------------------------------------------------------ animacje
def bicie(node, okres=0.83):
    """Skurcz komór: szybkie „lub-dub” i spoczynek (skala względem podstawy serca)."""
    t = np.array([0, 0.08, 0.16, 0.30, 0.42, 0.55, okres])
    s = [(1, 1, 1), (1.012, 1.02, 1.012), (0.965, 0.95, 0.965), (0.955, 0.94, 0.955), (0.99, 0.99, 0.99), (1.004, 1.006, 1.004), (1, 1, 1)]
    T3 = np.concatenate([t + okres * k for k in range(3)]); S3 = s * 3
    keep = np.r_[True, np.diff(T3) > 1e-6]
    return (node, "scale", T3[keep], [S3[i] for i in range(len(S3)) if keep[i]])

def sciezka_ruchu(pts, czas, n=60):
    p = wygladz_luk(pts, 4)
    L = np.r_[0, np.cumsum(np.linalg.norm(np.diff(p, axis=0), axis=1))]
    ts = np.linspace(0, L[-1], n)
    xyz = np.stack([np.interp(ts, L, p[:, i]) for i in range(3)], 1)
    return np.linspace(0, czas, n), xyz

# ------------------------------------------------------------------ MODELE
def mat(c, rough=0.55, metal=0.0, double=False, emissive=None, blend=False):
    return dict(color=c, rough=rough, metal=metal, double=double, emissive=emissive, blend=blend)

def serce_calosc(out):
    komory, naczynia, _, _ = anatomia(False)
    f_serca = zloz(komory, 1.1)
    wienc, tluszcz = naczynia_wiencowe(f_serca)
    czesci = komory + naczynia + wienc
    f_nacz = zloz(naczynia, 0.5); f_wienc = zloz(wienc, 0.15)
    f = lambda p: gladko(gladko(f_serca(p), f_nacz(p), 0.55), f_wienc(p), 0.12)
    m = siatka_z_pola(f, (-6.0, -7.4, -4.4), (6.0, 9.6, 4.4), (118, 166, 88), kolorowanie(czesci, tluszcz, 1))
    print("serce:", len(m.idx), "trójkątów")
    # węzeł podstawy serca (skalowanie animacji względem podstawy, nie środka)
    baza = np.array([0.0, 1.0, 0.0]) * CM
    m = m.moved(*(-baza))
    nodes = [
        {"name": "Serce", "parent": None, "translation": [0, 7.4 * CM, 0], "parts": []},
        {"name": "Miesien", "parent": "Serce", "translation": list(baza), "parts": [(m, "tkanka")]},
    ]
    mats = {"tkanka": mat((1, 1, 1, 1), rough=0.42)}
    anim = [{"name": "Bicie", "channels": [bicie("Miesien")]}]
    write_glb(os.path.join(out, "serce.glb"), nodes, mats, {}, anim)

def serce_przekroj(out):
    komory, naczynia, jamy, zastawki = anatomia(True)
    f_out = gladko(0, 0, 1) if False else None
    f_k = zloz(komory, 1.0); f_n = zloz(naczynia, 0.45)
    f_j = zloz(jamy, 0.25); f_z = zloz(zastawki, 0.05)
    ZC = 0.0
    def f(p):
        sciana = np.maximum(gladko(f_k(p), f_n(p), 0.5), -f_j(p))
        sciana = np.minimum(sciana, np.maximum(f_z(p), f_k(p) - 0.2))   # zastawki tylko wewnątrz serca
        return np.maximum(sciana, p[..., 2] - ZC)                         # odcinamy przednią połowę
    czesci = komory + naczynia + zastawki
    extra = [(f_z, ZASTAWKA, 0.18)]
    m = siatka_z_pola(f, (-6.2, -6.9, -4.2), (6.4, 9.3, 0.4), (126, 162, 46), kolorowanie(czesci, extra, 2, ZC, jamy))
    print("przekrój:", len(m.idx), "trójkątów")
    nodes = [{"name": "Przekroj", "parent": None, "translation": [0, 6.9 * CM, 0], "rotation": None, "parts": [(m, "tkanka")]}]
    # krwinki płynące przez serce (niebieskie: prawa strona, czerwone: lewa)
    ery = krwinka(0.36)
    T_ = 8.0
    drogi = {
        "niebieska": [(-3.3, 7.5, 0.25), (-3.1, 3.6, 0.25), (-2.9, 2.0, 0.25), (-2.2, 0.6, 0.25), (-1.8, -1.2, 0.25), (-1.2, -2.6, 0.25), (-0.9, -0.6, 0.25), (-0.8, 1.5, 0.25), (-0.7, 3.6, 0.2), (-0.5, 4.3, -1.0), (-3.0, 4.6, -1.7), (-5.5, 4.5, -1.7)],
        "niebieska2": [(-3.1, -4.0, 0.25), (-3.0, 0.8, 0.25), (-2.8, 1.8, 0.25), (-2.1, 0.5, 0.25), (-1.9, -0.8, 0.25), (-1.3, -2.4, 0.25), (-0.9, -0.4, 0.25), (-0.8, 2.0, 0.25), (-0.6, 4.0, -0.6), (1.5, 4.0, -1.6), (5.6, 3.8, -1.6)],
        "czerwona": [(5.8, 2.8, -0.4), (3.2, 2.6, -0.2), (2.1, 2.3, 0.25), (2.0, 0.6, 0.25), (2.0, -1.2, 0.25), (1.6, -3.0, 0.25), (1.0, -1.4, 0.25), (0.7, 0.6, 0.25), (0.8, 3.5, 0.2), (1.2, 5.6, -0.3), (2.6, 6.2, -1.2), (3.7, 4.8, -2.4), (3.9, 1.0, -2.6), (3.9, -3.0, -2.6)],
        "czerwona2": [(-4.6, 3.2, -2.6), (-1.5, 3.2, -2.6), (1.3, 2.8, -0.6), (2.2, 2.0, 0.25), (2.1, 0.4, 0.25), (1.9, -1.8, 0.25), (1.3, -2.6, 0.25), (0.8, -0.6, 0.25), (0.7, 1.6, 0.25), (0.9, 4.6, 0.0), (1.9, 6.1, -0.8), (3.6, 5.4, -2.2), (3.9, 0.0, -2.6)],
    }
    chans = []
    for nazwa, pts in drogi.items():
        times, xyz = sciezka_ruchu(pts, T_)
        for k in range(4):                            # cztery krwinki na drodze, przesunięte w czasie
            nm = f"{nazwa}_{k}"
            sh = int(len(xyz) * k / 4)
            pos = np.roll(xyz, -sh, axis=0) * CM
            pos[-1] = pos[0]
            mat_k = "krew_n" if nazwa.startswith("nieb") else "krew_c"
            nodes.append({"name": nm, "parent": "Przekroj", "translation": list(pos[0]), "parts": [(ery, mat_k)]})
            chans.append((nm, "translation", times, [list(x) for x in pos]))
            chans.append((nm, "rotation", times, [quat((0.3, 1, 0.2), 2 * PI * 2 * i / (len(times) - 1) + k) for i in range(len(times))]))
    mats = {"tkanka": mat((1, 1, 1, 1), rough=0.5, double=True),
            "krew_c": mat((0.86, 0.12, 0.1, 1), rough=0.35, emissive=(0.25, 0.0, 0.0)),
            "krew_n": mat((0.28, 0.38, 0.9, 1), rough=0.35, emissive=(0.0, 0.03, 0.2))}
    write_glb(os.path.join(out, "serce-przekroj.glb"), nodes, mats, {}, [{"name": "Przeplyw", "channels": chans}])

def krwinka(r):
    """Krwinka czerwona: dwuwklęsły dysk (bryła obrotowa)."""
    prof = []
    for i in range(13):
        t = i / 12 * PI
        x = r * math.sin(t) if i not in (0, 12) else 0.0
        rr = x / r
        th = r * 0.42 * (0.28 + 1.1 * rr ** 2 - 0.9 * rr ** 4) * (1 if i < 6.5 else 1)
        prof.append((x, th * (1 if i <= 6 else -1)))
    # profil: od góry (środek) przez krawędź do dołu
    top = [(r * u, r * 0.42 * (0.22 + 1.2 * u ** 2 - 0.95 * u ** 4) * 0.55) for u in np.linspace(0, 1, 10)]
    bot = [(x, -y) for x, y in top[::-1]]
    prof = [(0.0, top[0][1])] + top[1:] + bot[:-1] + [(0.0, bot[-1][1])]
    m = lathe(prof, n=20, smooth_deg=70)
    return m.transformed(S(CM / 1.0 * 1.0))

def walec(r0, r1, dl, a0, a1, n=40, nx=12):
    """Wycinek rury (kąty a0..a1) wzdłuż osi X: powierzchnia zewn. r1, wewn. r0, ścianki cięcia i czoła."""
    A = np.linspace(a0, a1, n); X = np.linspace(-dl / 2, dl / 2, nx)
    pos, nrm, uv, idx = [], [], [], []
    def siatka(r, zewn):
        b = len(pos); s = 1 if zewn else -1
        for x in X:
            for a in A:
                pos.append((x, r * math.cos(a), r * math.sin(a))); nrm.append((0, s * math.cos(a), s * math.sin(a))); uv.append((x, a))
        for i in range(nx - 1):
            for j in range(n - 1):
                p0 = b + i * n + j; p1 = p0 + 1; p2 = p0 + n; p3 = p2 + 1
                idx.extend([(p0, p1, p2), (p1, p3, p2)] if zewn else [(p0, p2, p1), (p1, p2, p3)])
    siatka(r1, True); siatka(r0, False)
    def quad(q, nn):
        b = len(pos)
        for p in q: pos.append(p); nrm.append(nn); uv.append((0, 0))
        v1, v2 = np.subtract(q[1], q[0]), np.subtract(q[2], q[0])
        if np.dot(np.cross(v1, v2), nn) > 0: idx.extend([(b, b + 1, b + 2), (b, b + 2, b + 3)])
        else: idx.extend([(b, b + 2, b + 1), (b, b + 3, b + 2)])
    for a, sgn in ((a0, -1), (a1, 1)):
        c, s_ = math.cos(a), math.sin(a)
        nn = (0, -s_ * sgn, c * sgn)
        quad([(-dl / 2, r0 * c, r0 * s_), (dl / 2, r0 * c, r0 * s_), (dl / 2, r1 * c, r1 * s_), (-dl / 2, r1 * c, r1 * s_)], nn)
    for x, sgn in ((-dl / 2, -1), (dl / 2, 1)):
        for j in range(n - 1):
            a, a2 = A[j], A[j + 1]
            quad([(x, r0 * math.cos(a), r0 * math.sin(a)), (x, r1 * math.cos(a), r1 * math.sin(a)),
                  (x, r1 * math.cos(a2), r1 * math.sin(a2)), (x, r0 * math.cos(a2), r0 * math.sin(a2))], (sgn, 0, 0))
    return Mesh(np.array(pos, float), np.array(nrm, float), np.array(uv, float), np.array(idx, int))

def naczynia_model(out):
    """Tętnica, żyła i sieć naczyń włosowatych – równolegle, przecięte, żeby było widać ściany i krew."""
    dl, T_ = 8.0, 4.0
    cut = (0.5 * PI, 2.0 * PI)                 # wycięta górna-przednia ćwiartka
    Z = {"Tetnica": 3.6, "Wlosowate": 0.0, "Zyla": -3.6}
    nodes = [{"name": "Naczynia", "parent": None, "translation": [0, 0, 0], "parts": []}]
    def warstwy(lst, y0, sy=1.0):
        return [(walec(r0, r1, dl, *cut).transformed(chain(T(0, y0, 0), S(1, sy, 1))).transformed(S(CM)), mk) for r0, r1, mk in lst]
    nodes.append({"name": "Tetnica", "parent": "Naczynia", "translation": [0, 0, Z["Tetnica"] * CM],
                  "parts": warstwy([(1.0, 1.15, "srodblonek"), (1.15, 1.8, "miesnie_t"), (1.8, 2.0, "lacznotk")], 2.0)})
    nodes.append({"name": "Zyla", "parent": "Naczynia", "translation": [0, 0, Z["Zyla"] * CM],
                  "parts": warstwy([(1.3, 1.38, "srodblonek"), (1.38, 1.55, "miesnie_z"), (1.55, 1.68, "lacznotk")], 1.68 / 0.8, 0.8)})
    # zastawka żylna: dwie „kieszonki” skierowane zgodnie z przepływem (+X)
    for sgn in (-1, 1):
        prof = [(0.02, -0.6), (0.5, -0.45), (0.95, -0.1), (1.28, 0.5)]
        m = lathe(prof, n=14, a0=0.15, a1=PI - 0.15, smooth_deg=80)
        M = chain(T(0.6, 1.68 / 0.8 * 0.8 * 1.0 + 0.0, 0), Rz(-PI / 2), Ry(PI / 2 if sgn > 0 else -PI / 2))
        nodes[-1]["parts"].append((m.transformed(chain(S(CM), T(0, 2.1, 0), S(1, 0.8, 1), Rz(-PI / 2), Ry(PI / 2 if sgn > 0 else -PI / 2))), "zastawka"))
    # naczynia włosowate: sieć cienkich rurek, kolor przechodzi z czerwonego w niebieski
    wl = []
    rng = np.random.default_rng(4)
    for i in range(8):
        y = 0.6 + i * 0.32
        pts = [(-dl / 2, 1.8 + rng.normal() * 0.05, 0.0)]
        for k in range(1, 8):
            pts.append((-dl / 2 + k * dl / 7.6, y + rng.normal() * 0.22, rng.normal() * 0.5))
        pts.append((dl / 2, 1.8, 0.0))
        pts = wygladz_luk(pts, 2)
        for a, b_ in zip(pts[:-1], pts[1:]):
            d = b_ - a; L = np.linalg.norm(d); yv = d / L
            xv = np.cross(yv, (0, 0, 1)); xv = xv / (np.linalg.norm(xv) + 1e-9); zv = np.cross(xv, yv)
            M = np.eye(4); M[:3, 0], M[:3, 1], M[:3, 2], M[:3, 3] = xv, yv, zv, a
            t = (a[0] + dl / 2) / dl
            wl.append((lathe([(0.12, 0), (0.12, L)], n=8, smooth_deg=90).transformed(M).transformed(S(CM)), "wlos_c" if t < 0.4 else ("wlos_f" if t < 0.62 else "wlos_n")))
    for x0, mk in ((-dl / 2 - 0.9, "wlos_c"), (dl / 2 + 0.9, "wlos_n")):       # tętniczka i żyłka
        wl.append((walec(0.0, 0.45, 1.8, 0, 2 * PI, n=18, nx=2).transformed(T(x0, 1.8, 0)).transformed(S(CM)), mk))
    nodes.append({"name": "Wlosowate", "parent": "Naczynia", "translation": [0, 0, Z["Wlosowate"] * CM], "parts": wl})
    # krwinki płynące w tętnicy (szybko) i w żyle (wolno)
    ery = krwinka(0.38); chans = []
    for nazwa, yc, v, n, mk in (("Tetnica", 2.0, 1.0, 7, "krew_c"), ("Zyla", 1.68 / 0.8 * 0.8, 0.5, 6, "krew_n")):
        for k in range(n):
            nm = f"krw_{nazwa}_{k}"
            dy, dz = ((k % 3) - 1) * 0.35, (((k * 2) % 3) - 1) * 0.35
            P = lambda x: [x * CM, (yc + dy) * CM, (Z[nazwa] + dz) * CM]
            x_start = -dl / 2 + (k / n) * dl
            # ruch: od x_start do końca, natychmiastowy powrót na początek, dalej do x_start
            tt, pp = [], []
            total = dl / v                                    # czas przejścia całej rury (w jednostkach T_)
            for i in range(41):
                t = T_ * i / 40
                x = -dl / 2 + ((x_start + dl / 2 + dl * v * t / T_) % dl)
                if pp and x < pp[-1][0] / CM - 0.01:
                    tt.append(t - 1e-3); pp.append(P(dl / 2)); tt.append(t - 5e-4); pp.append(P(-dl / 2))
                tt.append(t); pp.append(P(x))
            nodes.append({"name": nm, "parent": "Naczynia", "translation": pp[0], "parts": [(ery, mk)]})
            chans.append((nm, "translation", np.array(tt), pp))
            chans.append((nm, "rotation", np.linspace(0, T_, 9), [quat((0, 0, 1), 2 * PI * i / 8 + k) for i in range(9)]))
    mats = {
        "srodblonek": mat((0.97, 0.84, 0.80, 1), rough=0.35, double=True),
        "miesnie_t": mat((0.82, 0.32, 0.30, 1), rough=0.6, double=True),
        "miesnie_z": mat((0.58, 0.46, 0.76, 1), rough=0.6, double=True),
        "lacznotk": mat((0.96, 0.88, 0.70, 1), rough=0.7, double=True),
        "zastawka": mat((0.93, 0.88, 0.96, 1), rough=0.5, double=True),
        "wlos_c": mat((0.85, 0.18, 0.16, 1), rough=0.45), "wlos_f": mat((0.62, 0.26, 0.58, 1), rough=0.45), "wlos_n": mat((0.28, 0.38, 0.85, 1), rough=0.45),
        "krew_c": mat((0.86, 0.12, 0.1, 1), rough=0.35, emissive=(0.2, 0, 0)), "krew_n": mat((0.55, 0.1, 0.3, 1), rough=0.35, emissive=(0.08, 0, 0.05)),
    }
    write_glb(os.path.join(out, "naczynia.glb"), nodes, mats, {}, [{"name": "Przeplyw", "channels": chans}])

def krew_model(out):
    """Składniki krwi w powiększeniu: krwinki czerwone, białe (granulocyt, limfocyt), płytki krwi."""
    nodes = [{"name": "Krew", "parent": None, "translation": [0, 0, 0], "parts": []}]
    chans = []
    rng = np.random.default_rng(7)
    ery = krwinka(1.0)
    T_ = 6.0
    for k in range(11):
        x, z = rng.uniform(-3.6, 3.6), rng.uniform(-3.0, 3.0)
        y = rng.uniform(0.9, 2.6)
        nm = f"erytrocyt_{k}"
        nodes.append({"name": nm, "parent": "Krew", "translation": [x * CM * 2.3, y * CM * 1.6, z * CM * 2.3], "parts": [(ery.transformed(S(0.95)), "ery")]})
        ax = rng.normal(size=3); ph = rng.uniform(0, 2 * PI)
        times = np.linspace(0, T_, 13)
        chans.append((nm, "rotation", times, [quat(ax, ph + 2 * PI * i / 12) for i in range(13)]))
        chans.append((nm, "translation", times, [[x * CM * 2.3, (y + 0.25 * math.sin(2 * PI * i / 12 + ph)) * CM * 1.6, z * CM * 2.3] for i in range(13)]))
    # krwinki białe: większe, „grudkowate”
    from siatki import rock
    for k, (x, z, r) in enumerate([(-1.6, 0.4, 1.35), (1.9, -0.6, 1.15)]):
        m = rock(r, seed=10 + k, sub=3, rough=0.12, flat_bottom=False)
        nm = f"leukocyt_{k}"
        nodes.append({"name": nm, "parent": "Krew", "translation": [x * CM * 1.6, 2.0 * CM * 1.6, z * CM * 1.6], "parts": [(m.transformed(S(CM * 1.6)), "leuko")]})
        # jądro widoczne przez półprzezroczystą błonę
        jadro = []
        for j in range(3 if k == 0 else 1):
            jadro.append(sphere(r * (0.36 if k == 0 else 0.62), n=18).moved(*(np.array([math.cos(j * 2.1), 0.2 * j, math.sin(j * 2.1)]) * r * (0.35 if k == 0 else 0.0))))
        nodes.append({"name": f"jadro_{k}", "parent": nm, "translation": [0, 0, 0], "parts": [(m_.transformed(S(CM * 1.6)), "jadro") for m_ in jadro]})
        times = np.linspace(0, T_, 7)
        chans.append((nm, "rotation", times, [quat((0, 1, 0), 2 * PI * i / 6 * (1 if k else -1)) for i in range(7)]))
    for k in range(7):
        m = rock(0.32, seed=30 + k, sub=2, rough=0.3, flat_bottom=False)
        x, z = rng.uniform(-3.4, 3.4), rng.uniform(-2.4, 2.4)
        nodes.append({"name": f"plytka_{k}", "parent": "Krew", "translation": [x * CM * 1.6, rng.uniform(0.6, 2.8) * CM * 1.6, z * CM * 1.6], "parts": [(m.transformed(chain(S(CM * 1.6), S(1.3, 0.55, 1.0))), "plytka")]})
    # osocze – półprzezroczysta „kropla” pod spodem jako podstawka
    pod = lathe([(0, 0.0), (5.2, 0.0), (5.4, 0.15), (5.2, 0.3), (0, 0.3)], n=48)
    nodes.append({"name": "Osocze", "parent": "Krew", "translation": [0, 0, 0], "parts": [(pod.transformed(S(CM * 1.6)), "osocze")]})
    mats = {"ery": mat((0.85, 0.12, 0.1, 1), rough=0.38), "leuko": mat((0.93, 0.9, 0.98, 0.72), rough=0.5, blend=True),
            "jadro": mat((0.48, 0.3, 0.72, 1), rough=0.5), "plytka": mat((0.9, 0.72, 0.85, 1), rough=0.6),
            "osocze": mat((0.98, 0.86, 0.52, 1), rough=0.4)}
    write_glb(os.path.join(out, "krew.glb"), nodes, mats, {}, [{"name": "Unoszenie", "channels": chans}])

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/bio"
    os.makedirs(out, exist_ok=True)
    which = sys.argv[2:] or ["serce", "przekroj", "naczynia", "krew"]
    if "serce" in which: serce_calosc(out)
    if "przekroj" in which: serce_przekroj(out)
    if "naczynia" in which: naczynia_model(out)
    if "krew" in which: krew_model(out)
    for f in sorted(os.listdir(out)):
        if f.endswith(".glb"): print(f, f"{os.path.getsize(os.path.join(out, f)) / 1e6:.2f} MB")
