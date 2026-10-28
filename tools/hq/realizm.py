"""Realizm modeli: wypalanie cieni kontaktowych (ambient occlusion) do kolorów wierzchołków, zabrudzenia/patyna,
mapy chropowatości i drobne nieregularności geometrii."""
import math
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
from siatki import Mesh, quat

def _qmat(q):
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])

def macierze_swiata(nodes):
    """Macierze 4x4 węzłów w pozie spoczynkowej (uwzględnia rodziców)."""
    by = {n["name"]: n for n in nodes}; out = {}
    def M(name):
        if name in out: return out[name]
        n = by[name]; L = np.eye(4)
        if n.get("rotation") is not None: L[:3, :3] = _qmat(n["rotation"])
        if n.get("translation") is not None: L[:3, 3] = n["translation"]
        out[name] = (M(n["parent"]) @ L) if n.get("parent") else L
        return out[name]
    for n in nodes: M(n["name"])
    return out

def _kierunki(k=40):
    """Kierunki w półkuli (rozkład kosinusowy), oś +Z."""
    i = np.arange(k) + 0.5
    r = np.sqrt(i / k); phi = i * math.pi * (3 - math.sqrt(5))
    return np.stack([r * np.cos(phi), r * np.sin(phi), np.sqrt(1 - r * r)], 1)

def wypal_ao(nodes, pomin=(), res=176, promienie=40, zasieg=0.16, sila=1.0, ziemia_y=None):
    """Liczy AO dla wszystkich części (mesh, materiał) w węzłach i zapisuje je w mesh.col.
    pomin – materiały, które nie dostają AO (świecące, przezroczyste)."""
    W = macierze_swiata(nodes)
    czesci = []                                   # (node, i, mesh_world)
    for nd in nodes:
        for i, (m, mat) in enumerate(nd["parts"]):
            czesci.append((nd, i, m.transformed(W[nd["name"]]), mat))
    allp = np.vstack([c[2].pos for c in czesci])
    lo, hi = allp.min(0) - 0.02, allp.max(0) + 0.02
    vs = (hi - lo).max() / res
    dims = np.ceil((hi - lo) / vs).astype(int) + 1
    grid = np.zeros(dims, bool)
    rng = np.random.default_rng(0)
    for nd, i, m, mat in czesci:                  # wokselizacja przez próbkowanie trójkątów
        if mat in pomin: continue
        P = m.pos[m.idx]
        area = 0.5 * np.linalg.norm(np.cross(P[:, 1] - P[:, 0], P[:, 2] - P[:, 0]), axis=1)
        cnt = np.minimum(4000, np.ceil(area / (vs * 0.45) ** 2).astype(int) + 1)
        tri = np.repeat(np.arange(len(P)), cnt)
        u, v = rng.random(len(tri)), rng.random(len(tri)); f = u + v > 1; u[f], v[f] = 1 - u[f], 1 - v[f]
        pts = P[tri, 0] + (P[tri, 1] - P[tri, 0]) * u[:, None] + (P[tri, 2] - P[tri, 0]) * v[:, None]
        ijk = np.clip(((pts - lo) / vs).astype(int), 0, dims - 1)
        grid[ijk[:, 0], ijk[:, 1], ijk[:, 2]] = True
    D = _kierunki(promienie).astype(np.float32)
    kroki = np.arange(2.2, zasieg / vs, 0.85).astype(np.float32) * vs
    waga = (1 - (kroki / zasieg) ** 1.5).clip(0.15, 1).astype(np.float32)
    for nd, i, mw, mat in czesci:
        m = nd["parts"][i][0]
        if mat in pomin: continue
        P, N = mw.pos.astype(np.float32), mw.nrm.astype(np.float32)
        ao = np.ones(len(P), np.float32)
        for s in range(0, len(P), 2048):
            p, n = P[s:s + 2048], N[s:s + 2048]
            t = np.where(np.abs(n[:, :1]) < 0.9, np.array([[1, 0, 0]], np.float32), np.array([[0, 1, 0]], np.float32))
            t = np.cross(n, t); t /= np.linalg.norm(t, axis=1, keepdims=True) + 1e-9; bt = np.cross(n, t)
            dirs = D[None, :, 0:1] * t[:, None] + D[None, :, 1:2] * bt[:, None] + D[None, :, 2:3] * n[:, None]   # (B,K,3)
            org = p + n * vs * 1.6
            pts = org[:, None, None, :] + dirs[:, :, None, :] * kroki[None, None, :, None]                      # (B,K,S,3)
            ijk = ((pts - lo) / vs).astype(np.int32)
            ok = np.all((ijk >= 0) & (ijk < dims), axis=-1)
            ijk = np.clip(ijk, 0, dims - 1)
            hit = grid[ijk[..., 0], ijk[..., 1], ijk[..., 2]] & ok
            first = np.where(hit.any(-1), hit.argmax(-1), -1)
            occl = np.where(first >= 0, waga[np.maximum(first, 0)], 0.0)
            ao[s:s + 2048] = 1 - occl.mean(1)
        # zbyt ciemne AO wygląda sztucznie – łagodzimy i dodajemy kontrast
        ao = np.clip(ao, 0, 1) ** (1.25 * sila)
        ao = 0.4 + 0.6 * ao            # łagodnie: na telefonach i w AR model nie może być za ciemny
        c = m.kolory().copy() if m.col is not None else np.ones((len(P), 3))
        m.col = c * ao[:, None]
        m._world_y = mw.pos[:, 1]
    return vs

def patyna(nodes, materialy, ziemia_y=0.045, wys=0.12, kolor=(0.84, 0.8, 0.7), mech=None, szum=0.07, seed=1):
    """Zabrudzenie przy ziemi + lekka losowa zmienność koloru (żeby powierzchnie nie były idealnie równe)."""
    W = macierze_swiata(nodes)
    for nd in nodes:
        for m, mat in nd["parts"]:
            if mat not in materialy: continue
            pw = m.transformed(W[nd["name"]]).pos
            c = m.kolory().copy()
            h = np.clip((pw[:, 1] - ziemia_y) / wys, 0, 4)
            f = np.exp(-h * 1.6)[:, None]
            c = c * (1 - f * (1 - np.array(kolor)))
            if mech is not None and mat in mech:
                g = np.clip(np.sin(pw[:, 0] * 37 + seed) * np.sin(pw[:, 2] * 29 + 2 * seed) * 0.5 + 0.5, 0, 1)[:, None]
                c = c * (1 - f * g * 0.45 * (1 - np.array([0.62, 0.78, 0.5])))
            n = (np.sin(pw[:, 0] * 23 + seed) + np.sin(pw[:, 1] * 31 + 2 * seed) + np.sin(pw[:, 2] * 19 + 3 * seed)) / 3
            c = c * (1 + szum * n)[:, None]
            m.col = c

def nierownosc(m, amp=0.003, freq=40.0, seed=0):
    """Przesuwa wierzchołki wzdłuż normalnych (mur ręcznie układany nie jest idealnym walcem)."""
    r = np.random.default_rng(seed); ph = r.uniform(0, 6.28, 6)
    p = m.pos
    n = (np.sin(p[:, 0] * freq + ph[0]) * np.sin(p[:, 1] * freq * 0.7 + ph[1]) + np.sin(p[:, 2] * freq * 1.3 + ph[2]) * np.sin(p[:, 1] * freq * 0.45 + ph[3])) * 0.5
    m.pos = p + m.nrm * (amp * n)[:, None]
    return m

def mapa_chropowatosci(kolor_img, nrm_img=None, baza=0.85, zakres=0.35, metal=0.0, rozmiar=512, seed=0):
    """Mapa metallicRoughness (G = chropowatość, B = metaliczność) z jasności tekstury koloru:
    ciemne szczeliny/spoiny są bardziej matowe, wypukłe jasne miejsca nieco gładsze."""
    im = np.asarray(kolor_img.convert("L").resize((rozmiar, rozmiar)), np.float32) / 255
    im = (im - im.mean()) / (im.std() + 1e-6)
    r = np.random.default_rng(seed); s = gaussian_filter(r.normal(size=(rozmiar, rozmiar)), rozmiar / 24, mode="wrap"); s /= s.std() + 1e-6
    rough = np.clip(baza - zakres * 0.35 * im + zakres * 0.25 * s, 0.05, 1)
    out = np.zeros((rozmiar, rozmiar, 3), np.uint8)
    out[..., 1] = (rough * 255).astype(np.uint8); out[..., 2] = int(metal * 255)
    return Image.fromarray(out)
