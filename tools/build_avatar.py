"""Generuje animowanego awatara-przewodnika (modele/przewodnik.glb).

Hierarchia węzłów (postać patrzy w stronę +Z, wysokość ok. 1 jednostki):
  przewodnik
  ├── nogi
  └── tulow (biodra)
      ├── glowa (szyja)
      │   ├── oczy
      │   └── usta
      ├── ramie_P ── przedramie_P      (prawa ręka postaci = strona -X)
      └── ramie_L ── przedramie_L      (lewa ręka, trzyma przewodnik-książeczkę)

Animacje: Spoczynek, Macha, Mowi, Wskazuje.
Własna postać (np. z Mixamo) zadziała w aplikacji, jeśli ma animacje o tych samych nazwach.
"""
import json, struct, math, sys, os
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from build_models import box, frustum, sphere, rot_z, part, rgba

FPS = 30

# ---------------- kolory ----------------
SKIN, SKIN2 = rgba('#f2c9a5'), rgba('#e8b48e')
JACKET, JACKET2 = rgba('#a8402c'), rgba('#8f3524')
NAVY, SHOE, HAIR = rgba('#2b3440'), rgba('#2a1f1a'), rgba('#3a2c24')
WHITE, GOLD, CHEEK = rgba('#f7f3ea'), rgba('#e8c547'), rgba('#f08a80')
INK, MOUTH, BOOK = rgba('#1c1c1c'), rgba('#7a2d22'), rgba('#2f6b4f')

def P(tris, col, rough=0.8, metal=0.0):
    return (part(tris), col, rough, metal)

def ell(r, sx, sy, sz, c=(0, 0, 0), n=16):
    return sphere(r, n) * np.array([sx, sy, sz]) + np.array(c)

def rot_x(t, ang):
    ca, sa = math.cos(ang), math.sin(ang)
    return t @ np.array([[1, 0, 0], [0, ca, -sa], [0, sa, ca]]).T

# ---------------- geometria (współrzędne lokalne każdego węzła) ----------------
def geometry():
    G = {}
    G['nogi'] = [
        P(box(0.09, 0.05, 0.15, (-0.065, 0.025, 0.02)), SHOE, 0.6),
        P(box(0.09, 0.05, 0.15, (0.065, 0.025, 0.02)), SHOE, 0.6),
        P(frustum(0.048, 0.045, 0.32, 12, y0=0.045), NAVY) ,
    ]
    G['nogi'] = [G['nogi'][0], G['nogi'][1],
                 P(frustum(0.048, 0.045, 0.33, 12, y0=0.045) + np.array([-0.065, 0, 0]), NAVY),
                 P(frustum(0.048, 0.045, 0.33, 12, y0=0.045) + np.array([0.065, 0, 0]), NAVY)]
    # tułów: punkt obrotu w biodrach (y=0.36)
    G['tulow'] = [
        P(frustum(0.135, 0.15, 0.06, 20, y0=-0.04), NAVY),                  # spodnie/biodra
        P(frustum(0.155, 0.125, 0.27, 20, y0=0.0), JACKET),                 # marynarka
        P(frustum(0.158, 0.156, 0.03, 20, y0=0.03), INK, 0.4),              # pasek
        P(box(0.035, 0.02, 0.012, (0, 0.045, 0.157)), GOLD, 0.3, 0.6),      # klamra
        P(box(0.07, 0.12, 0.012, (0, 0.205, 0.128)), WHITE),                # koszula
        P(rot_z(box(0.012, 0.11, 0.014, (0, 0, 0)), 0.0) + np.array([0, 0.19, 0.136]), GOLD, 0.4),  # krawat
        P(ell(0.012, 1, 1, 0.6, (0, 0.10, 0.152), 8), GOLD, 0.3, 0.6),     # guziki
        P(ell(0.012, 1, 1, 0.6, (0, 0.14, 0.147), 8), GOLD, 0.3, 0.6),
        P(ell(0.062, 1, 0.85, 1, (-0.135, 0.235, 0)), JACKET),              # barki
        P(ell(0.062, 1, 0.85, 1, (0.135, 0.235, 0)), JACKET),
        P(box(0.05, 0.035, 0.008, (0.075, 0.2, 0.135)), GOLD, 0.3, 0.5),    # identyfikator
        P(frustum(0.042, 0.04, 0.05, 12, y0=0.255), SKIN),                  # szyja
    ]
    # głowa: punkt obrotu u nasady szyi (y = 0.36 + 0.27)
    G['glowa'] = [
        P(ell(0.16, 1, 1.0, 0.98, (0, 0.17, 0), 24), SKIN, 0.7),
        P(ell(0.166, 1, 0.98, 1, (0, 0.18, -0.03), 20), HAIR, 0.9),
        P(ell(0.03, 0.7, 1, 0.8, (-0.16, 0.16, 0), 10), SKIN2),             # uszy
        P(ell(0.03, 0.7, 1, 0.8, (0.16, 0.16, 0), 10), SKIN2),
        P(ell(0.022, 1, 0.9, 1, (0, 0.155, 0.158), 10), SKIN2),             # nos
        P(ell(0.026, 1, 0.7, 0.5, (-0.088, 0.135, 0.135), 10), CHEEK, 0.9), # policzki
        P(ell(0.026, 1, 0.7, 0.5, (0.088, 0.135, 0.135), 10), CHEEK, 0.9),
        P(ell(0.024, 1.5, 0.45, 0.6, (-0.056, 0.232, 0.142), 8), HAIR),     # brwi
        P(ell(0.024, 1.5, 0.45, 0.6, (0.056, 0.232, 0.142), 8), HAIR),
        # czapka
        P(frustum(0.172, 0.166, 0.075, 24, y0=0.255), INK, 0.6),
        P(frustum(0.174, 0.174, 0.018, 24, y0=0.255), JACKET, 0.6),         # otok
        P(rot_x(ell(0.1, 1.05, 0.08, 0.75, (0, 0, 0), 16), -0.12) + np.array([0, 0.262, 0.15]), INK, 0.5),  # daszek
        P(ell(0.022, 1, 1, 0.45, (0, 0.30, 0.168), 12), GOLD, 0.3, 0.7),    # odznaka
    ]
    G['oczy'] = [
        P(ell(0.021, 1, 1.15, 0.6, (-0.056, 0, 0), 12), INK, 0.3),
        P(ell(0.021, 1, 1.15, 0.6, (0.056, 0, 0), 12), INK, 0.3),
        P(ell(0.006, 1, 1, 0.5, (-0.05, 0.008, 0.012), 6), WHITE, 0.2),    # błysk w oku
        P(ell(0.006, 1, 1, 0.5, (0.062, 0.008, 0.012), 6), WHITE, 0.2),
    ]
    G['usta'] = [P(ell(0.032, 1.25, 0.75, 0.45, (0, 0, 0), 14), MOUTH, 0.6)]
    def upper(): return [P(frustum(0.042, 0.038, 0.16, 12, y0=-0.16), JACKET)]
    def lower(left):
        L = [P(frustum(0.038, 0.034, 0.13, 12, y0=-0.13), JACKET),
             P(frustum(0.040, 0.040, 0.02, 12, y0=-0.135), JACKET2),        # mankiet
             P(ell(0.045, 0.9, 1.05, 0.8, (0, -0.17, 0), 12), SKIN, 0.7)]   # dłoń
        if left:  # książeczka-przewodnik w lewej dłoni
            c = np.array([0, -0.17, 0.0])
            hold = lambda t: rot_x(t - c, 1.05) + c      # ustaw książkę pionowo mimo zgiętej ręki
            L += [P(hold(box(0.11, 0.15, 0.022, (0.0, -0.2, 0.04))), BOOK, 0.7),
                  P(hold(box(0.112, 0.022, 0.024, (0.0, -0.16, 0.04))), GOLD, 0.5),
                  P(hold(box(0.05, 0.05, 0.004, (0.0, -0.215, 0.052))), GOLD, 0.5)]
        return L
    G['ramie_P'], G['ramie_L'] = upper(), upper()
    G['przedramie_P'], G['przedramie_L'] = lower(False), lower(True)
    return G

# węzły: nazwa -> (rodzic, translacja w układzie rodzica)
HIP = 0.36
NODES = {
    'przewodnik':   (None, (0, 0, 0)),
    'nogi':         ('przewodnik', (0, 0, 0)),
    'tulow':        ('przewodnik', (0, HIP, 0)),
    'glowa':        ('tulow', (0, 0.27, 0)),
    'oczy':         ('glowa', (0, 0.185, 0.142)),
    'usta':         ('glowa', (0, 0.098, 0.146)),
    'ramie_P':      ('tulow', (-0.17, 0.235, 0)),
    'przedramie_P': ('ramie_P', (0, -0.16, 0)),
    'ramie_L':      ('tulow', (0.17, 0.235, 0)),
    'przedramie_L': ('ramie_L', (0, -0.16, 0)),
}

# ---------------- animacje ----------------
def quat_euler(rx=0, ry=0, rz=0):
    """R = Rz * Ry * Rx  (najpierw X, potem Y, potem Z)"""
    cx, sx = math.cos(rx/2), math.sin(rx/2); cy, sy = math.cos(ry/2), math.sin(ry/2); cz, sz = math.cos(rz/2), math.sin(rz/2)
    return [sx*cy*cz - cx*sy*sz, cx*sy*cz + sx*cy*sz, cx*cy*sz - sx*sy*cz, cx*cy*cz + sx*sy*sz]

def smooth(a, b, t):  # 0..1 wygładzone
    t = max(0.0, min(1.0, t)); t = t*t*(3 - 2*t); return a + (b - a)*t

def ramp(t, t0, t1):   # 0 przed t0, 1 po t1 (wygładzone)
    return smooth(0, 1, (t - t0)/(t1 - t0)) if t1 > t0 else float(t >= t0)

def blink(t, at, dur=0.16):
    x = (t - at)/dur
    return 1 - 0.9*math.sin(math.pi*x) if 0 <= x <= 1 else 1

REST = {
    'ramie_P': (0.05, 0, -0.12), 'przedramie_P': (-0.15, 0, 0),
    'ramie_L': (-0.25, 0, 0.12), 'przedramie_L': (-1.25, 0, -0.05),
}

def base_pose(t, T):
    """Oddychanie i lekki ruch – wspólna podstawa wszystkich animacji (zapętla się co T sekund)."""
    w = 2*math.pi/T
    pose = {n: {'r': (0, 0, 0), 's': (1, 1, 1)} for n in NODES}
    pose['tulow'] = {'r': (0.015*math.sin(w*t), 0.03*math.sin(w*t + 1), 0), 's': (1, 1 + 0.012*math.sin(2*w*t), 1)}
    pose['glowa'] = {'r': (0.02*math.sin(w*t + 2), 0.10*math.sin(w*t), 0.03*math.sin(w*t + .5)), 's': (1, 1, 1)}
    for n, r in REST.items():
        pose[n] = {'r': r, 's': (1, 1, 1)}
    pose['ramie_P']['r'] = (0.05, 0, -0.12 - 0.02*math.sin(w*t))
    pose['ramie_L']['r'] = (-0.25 + 0.03*math.sin(w*t), 0, 0.12)
    pose['usta'] = {'r': (0, 0, 0), 's': (1, 0.35, 1)}
    return pose

def anim_spoczynek(t, T=4.0):
    p = base_pose(t, T)
    p['oczy']['s'] = (1, blink(t, 2.9), 1)
    return p

def anim_macha(t, T=2.6):
    p = base_pose(t, T)
    up = ramp(t, 0.0, 0.35) * (1 - ramp(t, 2.15, 2.55))
    wave = math.sin((t - 0.35) * 2*math.pi * 2.2) if 0.35 < t < 2.2 else 0
    p['ramie_P']['r'] = (smooth(0.05, -0.15, up), 0, smooth(-0.12, -2.55, up))
    p['przedramie_P']['r'] = (smooth(-0.15, -0.2, up), 0, -0.25*up + 0.45*wave*up)
    p['glowa']['r'] = (0.0, 0.05, -0.12*up)
    p['tulow']['r'] = (0, 0, -0.04*up)
    p['usta']['s'] = (1.1, smooth(0.35, 0.75, up), 1)
    p['oczy']['s'] = (1, blink(t, 1.4) if up > 0.5 else 1, 1)
    return p

TALK = [0.3, 1.0, 0.45, 0.9, 0.25, 0.8, 1.0, 0.4, 0.95, 0.3, 0.7, 0.3]
def anim_mowi(t, T=2.4):
    p = base_pose(t, T)
    k = t / T * len(TALK); i = int(k) % len(TALK); f = k - int(k)
    m = smooth(TALK[i], TALK[(i + 1) % len(TALK)], f)
    p['usta']['s'] = (1 - 0.15*m, 0.3 + 0.75*m, 1)
    w = 2*math.pi/T
    p['glowa']['r'] = (0.05*math.sin(2*w*t), 0.12*math.sin(w*t), 0.04*math.sin(w*t + 1))
    g = 0.5 + 0.5*math.sin(w*t - 1)                       # gest prawą ręką
    p['ramie_P']['r'] = (-0.35 - 0.25*g, 0, -0.32)
    p['przedramie_P']['r'] = (-0.9 - 0.35*g, 0.0, -0.2 + 0.25*g)
    p['oczy']['s'] = (1, blink(t, 1.7), 1)
    return p

def anim_wskazuje(t, T=2.8):
    p = base_pose(t, T)
    a = ramp(t, 0.0, 0.45) * (1 - ramp(t, 2.3, 2.75))
    p['ramie_P']['r'] = (smooth(0.05, -0.35, a), smooth(0, 0.25, a), smooth(-0.12, -1.45, a))
    p['przedramie_P']['r'] = (smooth(-0.15, -0.1, a), 0, smooth(0, 0.08, a))
    p['glowa']['r'] = (smooth(0, 0.05, a), smooth(0, -0.55, a), 0)
    p['tulow']['r'] = (0, smooth(0, -0.18, a), 0)
    p['usta']['s'] = (1.05, smooth(0.35, 0.6, a), 1)
    return p

ANIMS = [('Spoczynek', anim_spoczynek, 4.0), ('Macha', anim_macha, 2.6), ('Mowi', anim_mowi, 2.4), ('Wskazuje', anim_wskazuje, 2.8)]
ANIMATED = ['tulow', 'glowa', 'oczy', 'usta', 'ramie_P', 'przedramie_P', 'ramie_L', 'przedramie_L']

# ---------------- eksport GLB ----------------
def export(path):
    G = geometry()
    names = list(NODES)
    bins, accessors, views, materials, meshes = [], [], [], [], []
    mat_idx = {}; off = [0]

    def add(arr, target=None, minmax=False, typ='VEC3'):
        b = np.asarray(arr, np.float32).tobytes()
        v = {'buffer': 0, 'byteOffset': off[0], 'byteLength': len(b)}
        if target: v['target'] = target
        views.append(v)
        a = np.asarray(arr, np.float32)
        acc = {'bufferView': len(views) - 1, 'componentType': 5126, 'count': len(a), 'type': typ}
        if minmax:
            acc['min'] = (a.min(axis=0) if a.ndim > 1 else [a.min()]); acc['max'] = (a.max(axis=0) if a.ndim > 1 else [a.max()])
            acc['min'] = [float(x) for x in acc['min']]; acc['max'] = [float(x) for x in acc['max']]
        accessors.append(acc); bins.append(b); off[0] += len(b)
        pad = (4 - len(b) % 4) % 4
        if pad: bins.append(b'\0' * pad); off[0] += pad
        return len(accessors) - 1

    nodes = []
    for n in names:
        parent, tr = NODES[n]
        nd = {'name': n, 'translation': [float(x) for x in tr]}
        if n in G:
            groups = {}
            for tris, col, rough, metal in G[n]:
                groups.setdefault((tuple(col), rough, metal), []).append(tris)
            prims = []
            for key, lst in groups.items():
                if key not in mat_idx:
                    col, rough, metal = key
                    mat_idx[key] = len(materials)
                    materials.append({'pbrMetallicRoughness': {'baseColorFactor': list(col), 'roughnessFactor': rough, 'metallicFactor': metal}, 'doubleSided': True})
                tris = np.concatenate(lst)
                pos = tris.reshape(-1, 3)
                # gładkie cieniowanie dla zaokrąglonych części: normalna = kierunek od środka części
                nrm = np.cross(tris[:, 1] - tris[:, 0], tris[:, 2] - tris[:, 0])
                nrm /= (np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-12)
                nrm = np.repeat(nrm, 3, axis=0)
                prims.append({'attributes': {'POSITION': add(pos, 34962, True), 'NORMAL': add(nrm, 34962)}, 'material': mat_idx[key]})
            meshes.append({'primitives': prims}); nd['mesh'] = len(meshes) - 1
        nodes.append(nd)
    for i, n in enumerate(names):
        kids = [names.index(c) for c, (p, _) in NODES.items() if p == n]
        if kids: nodes[i]['children'] = kids

    animations = []
    for aname, fn, T in ANIMS:
        frames = int(round(T * FPS))
        times = np.array([i / FPS for i in range(frames + 1)], np.float32)
        ti = add(times, minmax=True, typ='SCALAR')
        samplers, channels = [], []
        for n in ANIMATED:
            rq = [quat_euler(*fn(min(t, T - 1e-6) if i < frames else 0.0, T)[n]['r']) for i, t in enumerate(times)]
            ss = [fn(min(t, T - 1e-6) if i < frames else 0.0, T)[n]['s'] for i, t in enumerate(times)]
            for path_, data, typ in (('rotation', rq, 'VEC4'), ('scale', ss, 'VEC3')):
                samplers.append({'input': ti, 'output': add(data, typ=typ), 'interpolation': 'LINEAR'})
                channels.append({'sampler': len(samplers) - 1, 'target': {'node': names.index(n), 'path': path_}})
        animations.append({'name': aname, 'samplers': samplers, 'channels': channels})

    gltf = {'asset': {'version': '2.0', 'generator': 'przewodnik-ar avatar'}, 'scene': 0,
            'scenes': [{'nodes': [0]}], 'nodes': nodes, 'meshes': meshes, 'materials': materials,
            'animations': animations, 'accessors': accessors, 'bufferViews': views, 'buffers': [{'byteLength': off[0]}]}
    js = json.dumps(gltf, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
    binb = b''.join(bins); binb += b'\0' * ((4 - len(binb) % 4) % 4)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(binb)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(binb), 0x004E4942)); f.write(binb)
    print(path, os.path.getsize(path) // 1024, 'KB', [a['name'] for a in animations])

if __name__ == '__main__':
    export(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'modele', 'przewodnik.glb'))
