"""Modele do lekcji pokazowej o Koperniku:
  planetarium-kopernika.glb – mechaniczny model układu heliocentrycznego (orrery), planety krążą wokół Słońca
  sfera-armilarna.glb       – przyrząd astronomiczny (taki trzyma Kopernik na toruńskim pomniku), obraca się wokół osi świata
Uruchom: python3 kopernik_modele.py ../../lekcje/pokazowa"""
import math, os, sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
from siatki import *
import tekstury as tx
import realizm

PI = math.pi
rng = np.random.default_rng(1543)

# ------------------------------------------------------------------ kula z UV „jak mapa świata”
def kula(r, n=40):
    rows = n // 2; P, N, U, I = [], [], [], []
    for j in range(rows + 1):
        th = PI * j / rows
        for i in range(n + 1):
            ph = 2 * PI * i / n
            v = np.array([math.sin(th) * math.cos(ph), math.cos(th), -math.sin(th) * math.sin(ph)])
            P.append(v * r); N.append(v); U.append((i / n, j / rows))
    for j in range(rows):
        for i in range(n):
            a = j * (n + 1) + i; b = a + n + 1
            I += [(a, b, b + 1), (a, b + 1, a + 1)]
    m = Mesh(P, N, U, I)
    fn = np.cross(m.pos[m.idx[:, 1]] - m.pos[m.idx[:, 0]], m.pos[m.idx[:, 2]] - m.pos[m.idx[:, 0]])
    ok = np.linalg.norm(fn, axis=1) > 1e-12
    if np.sum(np.sum(fn * m.nrm[m.idx[:, 0]], axis=1)[ok]) < 0: m.idx = m.idx[:, ::-1]
    return m

def zebatka(r, zeby, grubosc, y0=0.0, r_in=0.0, glebokosc=0.08):
    """Koło zębate: wyciągnięty wielokąt (zęby trapezowe)."""
    pts = []
    for k in range(zeby):
        a = 2 * PI * k / zeby; s = 2 * PI / zeby
        for f, rr in ((0.0, r * (1 - glebokosc)), (0.15, r), (0.45, r), (0.6, r * (1 - glebokosc))):
            pts.append((rr * math.cos(a + f * s), rr * math.sin(a + f * s)))
    pts = np.array(pts); n = len(pts)
    P, N, U, I = [], [], [], []
    for y, ny in ((y0 + grubosc, 1), (y0, -1)):            # wieczka
        c = len(P); P.append((0, y, 0)); N.append((0, ny, 0)); U.append((0, 0))
        for x, z in pts: P.append((x, y, z)); N.append((0, ny, 0)); U.append((x * 4, z * 4))
        for k in range(n):
            a, b = c + 1 + k, c + 1 + (k + 1) % n
            I.append((c, b, a) if ny > 0 else (c, a, b))
    for k in range(n):                                       # boki
        (x0, z0), (x1, z1) = pts[k], pts[(k + 1) % n]
        nx, nz = z1 - z0, -(x1 - x0); L = math.hypot(nx, nz) or 1; nx, nz = nx / L, nz / L
        c = len(P)
        P += [(x0, y0, z0), (x1, y0, z1), (x1, y0 + grubosc, z1), (x0, y0 + grubosc, z0)]; N += [(nx, 0, nz)] * 4
        U += [(0, 0), (1, 0), (1, 1), (0, 1)]; I += [(c, c + 2, c + 1), (c, c + 3, c + 2)]
    m = Mesh(P, N, U, I)
    fn = np.cross(m.pos[m.idx[:, 1]] - m.pos[m.idx[:, 0]], m.pos[m.idx[:, 2]] - m.pos[m.idx[:, 0]])
    ok = np.linalg.norm(fn, axis=1) > 1e-12
    if np.sum(np.sum(fn * m.nrm[m.idx[:, 0]], axis=1)[ok]) < 0: m.idx = m.idx[:, ::-1]
    if r_in > 0: m = m + cylinder(r_in, grubosc * 1.6, 20, 0.1, y0=y0 - grubosc * 0.3)
    return m

# ------------------------------------------------------------------ tekstury planet (mapa 512x256)
def mapa(kind):
    W, H = 512, 256
    f = tx.fbm(512, {"ziemia": 3, "mars": 4, "wenus": 5, "slonce": 6, "ksiezyc": 7, "merkury": 8}.get(kind, 9), 6, 512 / 6)[:256, :]
    f2 = tx.fbm(512, 11, 4, 512 / 24)[:256, :]
    yy = np.linspace(-1, 1, H)[:, None] * np.ones((1, W))
    if kind == "ziemia":
        land = f > 0.56
        col = np.where(land[..., None], np.array([70, 125, 60]) * (0.8 + 0.4 * f2[..., None]), np.array([25, 70, 150]) * (0.8 + 0.4 * f[..., None]))
        desert = land & (np.abs(yy) < 0.35) & (f2 > 0.6); col[desert] = np.array([190, 165, 110])
        ice = np.abs(yy) > 0.84; col[ice] = np.array([235, 240, 245])
        clouds = np.clip(tx.fbm(512, 21, 5, 512 / 14)[:256, :] - 0.58, 0, 1) * 2.2
        col = col * (1 - clouds[..., None]) + 255 * clouds[..., None]
    elif kind == "mars":
        col = np.array([185, 90, 50]) * (0.7 + 0.5 * f[..., None]); col[np.abs(yy) > 0.9] = (230, 220, 210)
        col = col * (0.85 + 0.25 * f2[..., None])
    elif kind == "jowisz":
        b = np.sin(yy * 22 + f * 3) * 0.5 + 0.5
        col = np.array([200, 170, 130]) * (1 - b[..., None]) + np.array([150, 100, 70]) * b[..., None]
        col = col * (0.9 + 0.15 * f2[..., None])
        img = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8)); d = ImageDraw.Draw(img); d.ellipse([300, 150, 352, 176], fill=(175, 80, 55)); return img
    elif kind == "saturn":
        b = np.sin(yy * 16 + f * 2) * 0.5 + 0.5
        col = np.array([220, 200, 150]) * (1 - 0.25 * b[..., None])
    elif kind == "wenus":
        col = np.array([225, 200, 140]) * (0.8 + 0.3 * f[..., None])
    elif kind == "slonce":
        g = tx.fbm(512, 31, 6, 512 / 40)[:256, :]
        col = np.array([255, 190, 60]) * (0.75 + 0.35 * g[..., None]); col[..., 1] = col[..., 1] * (0.85 + 0.2 * g)
    else:  # ksiezyc / merkury – kratery
        col = np.array([150, 148, 145]) * (0.75 + 0.4 * f[..., None])
        img = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8)); d = ImageDraw.Draw(img)
        for _ in range(70):
            x, y, r = rng.uniform(0, W), rng.uniform(20, H - 20), rng.uniform(3, 14)
            d.ellipse([x - r, y - r, x + r, y + r], fill=(105, 103, 100)); d.ellipse([x - r * 0.75, y - r * 0.75, x + r * 0.6, y + r * 0.6], fill=(130, 128, 125))
        return img
    return Image.fromarray(np.clip(col, 0, 255).astype(np.uint8))

def mat(color=(1, 1, 1, 1), tex=None, normal=None, rough=0.6, metal=0.0, emissive=None, double=False, ns=1.0):
    return dict(color=color, tex=tex, normal=normal, normal_scale=ns, rough=rough, metal=metal, emissive=emissive, double=double)

MOSIADZ = mat((0.86, 0.66, 0.33, 1), rough=0.32, metal=1.0)
MOSIADZ_C = mat((0.62, 0.45, 0.22, 1), rough=0.45, metal=1.0)

def obrot(node, os_, okres, T):
    """Klucze animacji: `okres` obrotów na T sekund wokół osi os_."""
    n = int(max(8, abs(okres) * 8)); times = np.linspace(0, T, n + 1)
    return (node, "rotation", times, [quat(os_, 2 * PI * okres * k / n) for k in range(n + 1)])

# ================================================================== PLANETARIUM
def planetarium():
    OKRES = 48.0
    parts = []
    # drewniana podstawa toczona + mosiężne obręcze
    parts.append((lathe([(0.37, 0.0), (0.37, 0.035), (0.35, 0.05), (0.33, 0.055), (0.33, 0.07), (0.3, 0.075)], 72, 0.12, smooth_deg=30, cap_bottom=True, maxseg=0.012), "drewno"))
    parts.append((disk(0.3, 0.075, 72, 0.12, rings=6), "drewno"))
    parts.append((torus(0.37, 0.006, 72, 8, y=0.035), "mosiadz"))
    parts.append((torus(0.3, 0.005, 72, 8, y=0.075), "mosiadz"))
    # tarcza z pierścieniem zodiaku (płaska, z podziałką)
    parts.append((disk(0.29, 0.077, 72, 0.3, r_in=0.2, rings=4), "tarcza"))
    for k in range(72):
        a = 2 * PI * k / 72; L = 0.02 if k % 6 == 0 else 0.01
        parts.append((box(L, 0.002, 0.003, 0.1).transformed(chain(T(math.cos(a) * (0.285 - L / 2), 0.079, math.sin(a) * (0.285 - L / 2)), Ry(-a))), "mosiadz_c"))
    # kolumna centralna
    parts.append((cylinder(0.022, 0.36, 20, 0.1, y0=0.075), "mosiadz"))
    parts.append((lathe([(0.05, 0.075), (0.05, 0.09), (0.03, 0.11), (0.024, 0.13)], 32, 0.1), "mosiadz"))
    nodes = [{"name": "planetarium", "parts": parts}]
    anims = []
    # dekoracyjne zębatki (obracają się jak w mechanizmie)
    nodes.append({"name": "zebatka_duza", "parts": [(zebatka(0.15, 40, 0.012, 0.0, r_in=0.03), "mosiadz_c")], "translation": (0, 0.079, 0)})
    nodes.append({"name": "zebatka_mala", "parts": [(zebatka(0.055, 15, 0.012, 0.0, r_in=0.012), "mosiadz")], "translation": (0.205, 0.079, 0)})
    anims += [obrot("zebatka_duza", (0, 1, 0), 1, OKRES), obrot("zebatka_mala", (0, 1, 0), -40 / 15, OKRES)]
    # Słońce
    SUN_Y = 0.47
    nodes.append({"name": "slonce", "parts": [(kula(0.075, 48), "slonce"), (torus(0.03, 0.006, 24, 6, y=-0.078), "mosiadz")], "translation": (0, SUN_Y, 0)})
    anims.append(obrot("slonce", (0, 1, 0), 2, OKRES))
    # planety: (nazwa, promień orbity, promień planety, wysokość ramienia, obiegi w T, materiał)
    PL = [("merkury", 0.11, 0.013, 0.415, 12, "merkury"), ("wenus", 0.16, 0.019, 0.385, 8, "wenus"),
          ("ziemia", 0.215, 0.021, 0.355, 6, "ziemia"), ("mars", 0.27, 0.016, 0.325, 3, "mars"),
          ("jowisz", 0.335, 0.043, 0.265, 2, "jowisz"), ("saturn", 0.41, 0.035, 0.205, 1, "saturn")]
    for i, (nm, R, r, h, okr, mt) in enumerate(PL):
        start = rng.uniform(0, 2 * PI)
        arm = [(cylinder(0.032 - i * 0.002, 0.012, 20, 0.1, y0=-0.006), "mosiadz"),
               (beam((0, 0, 0), (R, 0, 0), 0.006, 0.006, 0.1), "mosiadz"),
               (cylinder(0.004, SUN_Y - h, 8, 0.1, y0=0).moved(R, 0, 0), "mosiadz"),
               (sphere(0.008, 12).moved(R, 0, 0), "mosiadz")]
        if nm != "ziemia":
            planet = kula(r, 40).moved(R, SUN_Y - h + r * 0.4, 0)
            arm.append((planet, mt))
        if nm == "saturn":
            ring = disk(r * 2.1, 0, 48, 0.2, r_in=r * 1.3).transformed(chain(T(R, SUN_Y - h + r * 0.4, 0), Rz(0.45)))
            arm.append((ring, "pierscien"))
        nodes.append({"name": "ramie_" + nm, "parts": arm, "translation": (0, h, 0), "rotation": quat((0, 1, 0), start)})
        anims.append(("ramie_" + nm, "rotation", *[[*np.linspace(0, OKRES, okr * 8 + 1)], [quat((0, 1, 0), start + 2 * PI * okr * k / (okr * 8)) for k in range(okr * 8 + 1)]]))
        if nm == "ziemia":
            # Ziemia z nachyloną osią i Księżycem
            ey = SUN_Y - h + r * 0.4
            nodes.append({"name": "ziemia", "parent": "ramie_ziemia", "parts": [(kula(r, 40), "ziemia")], "translation": (R, ey, 0), "rotation": quat((0, 0, 1), -0.41)})
            nodes.append({"name": "ksiezyc_orbita", "parent": "ramie_ziemia", "parts": [(beam((0, 0, 0), (0.045, 0, 0), 0.003, 0.003, 0.1), "mosiadz"), (kula(0.0075, 24).moved(0.045, 0, 0), "ksiezyc")], "translation": (R, ey, 0)})
            anims.append(obrot("ziemia", (0, 1, 0), 24, OKRES))
            anims.append(obrot("ksiezyc_orbita", (0, 1, 0), 12, OKRES))
    return nodes, [{"name": "Ruch planet", "channels": anims}]

# ================================================================== SFERA ARMILARNA
def sfera():
    OKRES = 20.0; C = 0.52; R = 0.2; e = math.radians(23.44); lat = math.radians(53.0)   # szerokość Torunia ≈ 53°
    parts = []
    parts.append((lathe([(0.17, 0.0), (0.17, 0.03), (0.13, 0.05), (0.06, 0.08), (0.04, 0.12), (0.045, 0.16), (0.032, 0.2), (0.04, 0.24), (0.026, 0.27)], 48, 0.12, smooth_deg=35, cap_bottom=True, cap_top=True), "drewno"))
    parts.append((torus(0.17, 0.005, 64, 8, y=0.03), "mosiadz"))
    parts.append((cylinder(0.012, C - R - 0.012 - 0.27, 12, 0.1, y0=0.27), "mosiadz"))
    # horyzont (szeroka obręcz z „pergaminową” podziałką) na czterech nóżkach
    parts.append((disk(R + 0.07, C, 72, 0.3, r_in=R + 0.035, rings=3), "pergamin"))
    parts.append((disk(R + 0.07, C - 0.004, 72, 0.3, r_in=R + 0.035, up=False), "mosiadz_c"))
    for k in range(48):
        a = 2 * PI * k / 48; L = 0.03 if k % 4 == 0 else 0.014
        parts.append((box(L, 0.002, 0.002, 0.1).transformed(chain(T(math.cos(a) * (R + 0.07 - L / 2), C + 0.001, math.sin(a) * (R + 0.07 - L / 2)), Ry(-a))), "mosiadz_c"))
    for k in range(4):
        a = PI / 4 + k * PI / 2
        parts.append((beam((math.cos(a) * 0.1, 0.035, math.sin(a) * 0.1), (math.cos(a) * (R + 0.055), C - 0.004, math.sin(a) * (R + 0.055)), 0.01, 0.01, 0.1), "mosiadz_c"))
    # południk (pionowa obręcz) – stały
    parts.append((torus(R + 0.014, 0.007, 72, 8).transformed(chain(T(0, C, 0), Rx(PI / 2))), "mosiadz"))
    nodes = [{"name": "sfera_armilarna", "parts": parts}]
    # oś świata nachylona pod kątem szerokości geograficznej
    tilt = quat((0, 0, 1), -(PI / 2 - lat))
    os_parts = [(cylinder(0.004, 2 * R + 0.12, 10, 0.1, y0=-R - 0.06), "mosiadz"),
                (sphere(0.01, 12).moved(0, R + 0.06, 0), "mosiadz"), (sphere(0.01, 12).moved(0, -R - 0.06, 0), "mosiadz"),
                (kula(0.04, 40), "ziemia")]
    nodes.append({"name": "os_swiata", "parts": os_parts, "translation": (0, C, 0), "rotation": tilt})
    rete = [(torus(R, 0.0045, 72, 8), "mosiadz"),                                          # równik
            (torus(R * math.cos(e), 0.003, 64, 6, y=R * math.sin(e)), "mosiadz_c"),       # zwrotnik Raka
            (torus(R * math.cos(e), 0.003, 64, 6, y=-R * math.sin(e)), "mosiadz_c"),      # zwrotnik Koziorożca
            (torus(R * math.sin(e), 0.003, 40, 6, y=R * math.cos(e)), "mosiadz_c"),       # koło podbiegunowe
            (torus(R * math.sin(e), 0.003, 40, 6, y=-R * math.cos(e)), "mosiadz_c"),
            (torus(R, 0.0035, 72, 6).transformed(Rx(PI / 2)), "mosiadz"),                 # kolury
            (torus(R, 0.0035, 72, 6).transformed(chain(Ry(PI / 2), Rx(PI / 2))), "mosiadz")]
    band = lathe([(R + 0.003, -0.012), (R + 0.003, 0.012)], 96, 0.05, cap_bottom=False)
    band2 = lathe([(R - 0.003, 0.012), (R - 0.003, -0.012)], 96, 0.05)
    rete.append(((band + band2).transformed(Rx(e)), "ekliptyka"))
    for k in range(12):   # znaki zodiaku – małe tabliczki na ekliptyce
        a = 2 * PI * k / 12
        rete.append((box(0.014, 0.014, 0.004, 0.05).transformed(chain(Rx(e), T(math.cos(a) * (R + 0.006), 0, math.sin(a) * (R + 0.006)), Ry(PI / 2 - a))), "zloto"))
    nodes.append({"name": "rete", "parent": "os_swiata", "parts": rete})
    return nodes, [{"name": "Obrót nieba", "channels": [obrot("rete", (0, 1, 0), -1, OKRES)]}]

# ==================================================================
def build(out):
    os.makedirs(out, exist_ok=True)
    TEX = {k: (mapa(k), "jpeg") for k in ("ziemia", "mars", "jowisz", "saturn", "wenus", "slonce", "ksiezyc", "merkury")}
    deski = tx.planks(512, 8, seed=31, base=(120, 74, 42), vertical=True, nails=False)
    TEX["drewno"] = (deski[0], "jpeg"); TEX["drewno_n"] = (deski[1], "jpeg")
    perg = tx.plaster(256, seed=5, base=(232, 214, 170)); TEX["pergamin"] = (perg[0], "jpeg")
    MATS = {
        "mosiadz": MOSIADZ, "mosiadz_c": MOSIADZ_C, "zloto": mat((1, 0.8, 0.35, 1), rough=0.25, metal=1),
        "drewno": mat(tex="drewno", normal="drewno_n", rough=0.55, ns=0.6),
        "tarcza": mat((0.13, 0.17, 0.32, 1), rough=0.5, metal=0.2),
        "pergamin": mat(tex="pergamin", rough=0.8, double=True),
        "ekliptyka": mat((0.75, 0.58, 0.3, 1), rough=0.35, metal=1.0, double=True),
        "pierscien": mat((0.85, 0.78, 0.6, 0.85), rough=0.6, double=True),
        "slonce": mat((1.0, 0.8, 0.55, 1), tex="slonce", rough=1.0, emissive=(1.0, 0.5, 0.1)),
        **{k: mat(tex=k, rough=0.75) for k in ("ziemia", "mars", "jowisz", "saturn", "wenus", "ksiezyc", "merkury")},
    }
    for name, fn in (("planetarium-kopernika", planetarium), ("sfera-armilarna", sfera)):
        nodes, anims = fn()
        nodes = [{**nd, "parent": nd.get("parent")} for nd in nodes]
        realizm.patyna(nodes, {"drewno", "mosiadz", "mosiadz_c"}, ziemia_y=-1, wys=0.01, szum=0.05)
        realizm.wypal_ao(nodes, pomin={"slonce", "pierscien"}, sila=1.0, zasieg=0.12)
        used = sorted({k for nd in nodes for _, k in nd["parts"]})
        mats = {k: MATS[k] for k in used}
        texs = {}
        for key in list(mats):
            m = mats[key] = dict(mats[key])
            for f in ("tex", "normal"):
                if m.get(f): texs[m[f]] = TEX[m[f]]
            if m.get("tex") == "drewno":
                texs["drewno_mr"] = (realizm.mapa_chropowatosci(TEX["drewno"][0], baza=0.6, zakres=0.4), "jpeg"); m["mr"] = "drewno_mr"; m["rough"] = 1.0
        ntri = write_glb(os.path.join(out, name + ".glb"), nodes, mats, texs, anims)
        print(f"{name}: {ntri} trójkątów, {os.path.getsize(os.path.join(out, name + '.glb')) / 1e6:.2f} MB")

if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else "/tmp/kop")
