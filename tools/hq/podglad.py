"""Programowy renderer podglądu GLB (z-bufor, tekstury, oświetlenie, animacje) – do kontroli jakości bez przeglądarki.
Użycie: python3 podglad.py model.glb wyjscie.png [kąt_obrotu] [animacja@czas]"""
import io, json, math, struct, sys
import numpy as np
from PIL import Image

def qmat(q):
    x, y, z, w = q
    return np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])

def load(path, anim=None, t=0.0):
    d = open(path, 'rb').read(); jl = struct.unpack('<I', d[12:16])[0]
    g = json.loads(d[20:20+jl]); b = d[28+jl:]
    def view(i):
        v = g['bufferViews'][i]; return b[v.get('byteOffset', 0): v.get('byteOffset', 0) + v['byteLength']]
    def acc(i):
        a = g['accessors'][i]; n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        dt = {5126: np.float32, 5123: np.uint16, 5125: np.uint32}[a['componentType']]
        return np.frombuffer(view(a['bufferView']), dt).reshape(-1, n)
    imgs = [np.asarray(Image.open(io.BytesIO(view(im['bufferView']))).convert('RGB'), np.float32) / 255 for im in g.get('images', [])]
    texs = [imgs[tx['source']] for tx in g.get('textures', [])]
    ov = {}
    for an in g.get('animations', []):
        if anim and an['name'] != anim: continue
        if not anim and an is not g['animations'][0]: continue
        for ch in an['channels']:
            s = an['samplers'][ch['sampler']]; ts = acc(s['input'])[:, 0]; vs = acc(s['output'])
            tt = t % ts[-1] if ts[-1] > 0 else 0
            i = min(int(np.searchsorted(ts, tt, side='right')) - 1, len(ts) - 2); i = max(i, 0)
            f = (tt - ts[i]) / max(1e-9, ts[i+1] - ts[i]); v = vs[i] * (1 - f) + vs[i+1] * f
            if ch['target']['path'] == 'rotation': v = v / np.linalg.norm(v)
            ov.setdefault(ch['target']['node'], {})[ch['target']['path']] = v
    out = []
    def walk(ni, M):
        nd = g['nodes'][ni]; o = ov.get(ni, {})
        Tm = np.eye(4); Tm[:3, 3] = o.get('translation', nd.get('translation', [0, 0, 0]))
        R = np.eye(4); R[:3, :3] = qmat(o.get('rotation', nd.get('rotation', [0, 0, 0, 1])))
        Sm = np.diag(list(o.get('scale', nd.get('scale', [1, 1, 1]))) + [1])
        W = M @ Tm @ R @ Sm
        if 'mesh' in nd:
            for pr in g['meshes'][nd['mesh']]['primitives']:
                P = acc(pr['attributes']['POSITION']).astype(float); N = acc(pr['attributes']['NORMAL']).astype(float)
                UV = acc(pr['attributes']['TEXCOORD_0']).astype(float) if 'TEXCOORD_0' in pr['attributes'] else np.zeros((len(P), 2))
                I = acc(pr['indices']).reshape(-1, 3) if 'indices' in pr else np.arange(len(P)).reshape(-1, 3)
                P = (np.c_[P, np.ones(len(P))] @ W.T)[:, :3]; N = N @ np.linalg.inv(W[:3, :3])
                N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-12
                m = g['materials'][pr.get('material', 0)]; pbr = m.get('pbrMetallicRoughness', {})
                fac = np.array(pbr.get('baseColorFactor', [1, 1, 1, 1]))
                tex = texs[pbr['baseColorTexture']['index']] if 'baseColorTexture' in pbr else None
                em = np.array(m.get('emissiveFactor', [0, 0, 0]))
                out.append(dict(P=P, N=N, UV=UV, I=I, fac=fac, tex=tex, em=em, metal=pbr.get('metallicFactor', 0), rough=pbr.get('roughnessFactor', 1)))
        for c in nd.get('children', []): walk(c, W)
    for r in g['scenes'][g.get('scene', 0)]['nodes']: walk(r, np.eye(4))
    return out

def srgb(x): return np.where(x <= 0.0031308, 12.92 * x, 1.055 * np.power(np.clip(x, 0, None), 1/2.4) - 0.055)
def lin(x): return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)

def render(prims, W=700, yaw=35, pitch=18, ss=2, bg=(0.93, 0.94, 0.95), fit=None, transparent=False, center=None):
    W2 = W * ss
    ay, ax = math.radians(yaw), math.radians(pitch)
    Ry = np.array([[math.cos(ay), 0, -math.sin(ay)], [0, 1, 0], [math.sin(ay), 0, math.cos(ay)]])
    Rx = np.array([[1, 0, 0], [0, math.cos(ax), -math.sin(ax)], [0, math.sin(ax), math.cos(ax)]])
    R = Rx @ Ry
    allP = np.vstack([p['P'] for p in prims])
    lo, hi = allP.min(0), allP.max(0); c = (lo + hi) / 2 if center is None else np.asarray(center, float)
    if fit is None: fit = np.linalg.norm(hi - lo) * 0.55
    scale = W2 / 2 / fit
    col = np.ones((W2, W2, 3)) * lin(np.array(bg)); zb = np.full((W2, W2), -1e9)
    L = np.array([0.45, 0.8, 0.55]); L /= np.linalg.norm(L)
    trans = []
    for p in prims:
        S = (p['P'] - c) @ R.T
        sx = W2 / 2 + S[:, 0] * scale; sy = W2 / 2 - S[:, 1] * scale; sz = S[:, 2]
        Nn = p['N'] @ R.T
        if p['fac'][3] < 0.99: trans.append((p, sx, sy, sz, Nn)); continue
        raster(p, sx, sy, sz, Nn, col, zb, L, R, False)
    for p, sx, sy, sz, Nn in trans: raster(p, sx, sy, sz, Nn, col, zb, L, R, True)
    img = Image.fromarray((np.clip(srgb(col), 0, 1) * 255).astype(np.uint8))
    if transparent:
        a = Image.fromarray(((zb > -1e8) * 255).astype(np.uint8))
        img = img.convert('RGBA'); img.putalpha(a)
    return img.resize((W, W), Image.LANCZOS)

def raster(p, sx, sy, sz, Nn, col, zb, L, R, blend):
    H, Wd = zb.shape; tex = p['tex']; fac = p['fac']
    Lv = L @ R.T  # światło w układzie kamery (obraca się z kamerą – jak lampa przy obserwatorze)
    Lv = np.array([0.35, 0.75, 0.55]); Lv /= np.linalg.norm(Lv)
    for a, b_, c in p['I']:
        xs, ys = sx[[a, b_, c]], sy[[a, b_, c]]
        x0, x1 = int(max(0, np.floor(xs.min()))), int(min(Wd - 1, np.ceil(xs.max())))
        y0, y1 = int(max(0, np.floor(ys.min()))), int(min(H - 1, np.ceil(ys.max())))
        if x0 > x1 or y0 > y1: continue
        den = (ys[1] - ys[2]) * (xs[0] - xs[2]) + (xs[2] - xs[1]) * (ys[0] - ys[2])
        if abs(den) < 1e-12: continue
        X, Y = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        w0 = ((ys[1] - ys[2]) * (X - xs[2]) + (xs[2] - xs[1]) * (Y - ys[2])) / den
        w1 = ((ys[2] - ys[0]) * (X - xs[2]) + (xs[0] - xs[2]) * (Y - ys[2])) / den
        w2 = 1 - w0 - w1
        m = (w0 >= -1e-6) & (w1 >= -1e-6) & (w2 >= -1e-6)
        if not m.any(): continue
        z = w0 * sz[a] + w1 * sz[b_] + w2 * sz[c]
        sub = zb[y0:y1+1, x0:x1+1]
        m &= z > sub
        if not m.any(): continue
        n = w0[..., None] * Nn[a] + w1[..., None] * Nn[b_] + w2[..., None] * Nn[c]
        n /= np.linalg.norm(n, axis=-1, keepdims=True) + 1e-12
        flip = n[..., 2] < 0; n[flip] *= -1   # dwustronne
        if tex is not None:
            uv = w0[..., None] * p['UV'][a] + w1[..., None] * p['UV'][b_] + w2[..., None] * p['UV'][c]
            th, tw = tex.shape[:2]
            tu = (np.mod(uv[..., 0], 1) * tw).astype(int) % tw; tv = (np.mod(uv[..., 1], 1) * th).astype(int) % th
            base = lin(tex[tv, tu]) * fac[:3]
        else:
            base = np.broadcast_to(fac[:3], n.shape).copy()
        diff = np.clip(n @ Lv, 0, 1)[..., None]
        hemi = (0.55 + 0.45 * n[..., 1:2])
        spec = (np.clip(n @ (Lv + [0, 0, 1]) / np.linalg.norm(Lv + [0, 0, 1]), 0, 1) ** (2 + 60 * (1 - p['rough']) ** 2))[..., None] * (1 - p['rough']) * 0.6
        shade = base * (0.30 * hemi + 0.95 * diff) + spec + p['em']
        region = col[y0:y1+1, x0:x1+1]
        if blend:
            a_ = fac[3]; region[m] = region[m] * (1 - a_) + shade[m] * a_
        else:
            region[m] = shade[m]; sub[m] = z[m]

if __name__ == '__main__':
    path, out = sys.argv[1], sys.argv[2]
    yaw = float(sys.argv[3]) if len(sys.argv) > 3 else 35
    anim, t = (sys.argv[4].split('@')[0], float(sys.argv[4].split('@')[1])) if len(sys.argv) > 4 else (None, 0)
    render(load(path, anim, t), yaw=yaw).save(out)
