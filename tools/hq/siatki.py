"""Siatki 3D z normalnymi i współrzędnymi UV + eksport do GLB (tekstury, hierarchia, animacje).

Konwencja UV: v rośnie W DÓŁ obrazka, więc dla ścian liczymy v = -wysokość/skala,
dzięki temu „góra” tekstury jest u góry modelu.
"""
import io, json, math, struct
import numpy as np

# ------------------------------------------------------------------ siatka
class Mesh:
    def __init__(self, pos=None, nrm=None, uv=None, idx=None):
        self.pos = np.zeros((0, 3)) if pos is None else np.asarray(pos, float)
        self.nrm = np.zeros((0, 3)) if nrm is None else np.asarray(nrm, float)
        self.uv = np.zeros((0, 2)) if uv is None else np.asarray(uv, float)
        self.idx = np.zeros((0, 3), int) if idx is None else np.asarray(idx, int)

    def __add__(self, o):
        n = len(self.pos)
        return Mesh(np.vstack([self.pos, o.pos]), np.vstack([self.nrm, o.nrm]),
                    np.vstack([self.uv, o.uv]), np.vstack([self.idx, o.idx + n]))

    def transformed(self, M):
        M = np.asarray(M, float)
        p = np.c_[self.pos, np.ones(len(self.pos))] @ M.T
        N = np.linalg.inv(M[:3, :3]).T
        n = self.nrm @ N.T
        n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
        idx = self.idx if np.linalg.det(M[:3, :3]) > 0 else self.idx[:, ::-1]
        return Mesh(p[:, :3], n, self.uv.copy(), idx.copy())

    def moved(self, x=0, y=0, z=0): return self.transformed(T(x, y, z))
    def uv_offset(self, du, dv): m = Mesh(self.pos, self.nrm, self.uv + [du, dv], self.idx); return m
    @property
    def ntri(self): return len(self.idx)

def merge(ms):
    out = Mesh()
    for m in ms: out = out + m
    return out

# ------------------------------------------------------------------ macierze
def T(x=0, y=0, z=0):
    M = np.eye(4); M[:3, 3] = [x, y, z]; return M
def S(x=1, y=None, z=None):
    y = x if y is None else y; z = x if z is None else z
    return np.diag([x, y, z, 1.0])
def Rx(a):
    c, s = math.cos(a), math.sin(a); M = np.eye(4); M[1:3, 1:3] = [[c, -s], [s, c]]; return M
def Ry(a):
    c, s = math.cos(a), math.sin(a); M = np.eye(4); M[0, 0], M[0, 2], M[2, 0], M[2, 2] = c, s, -s, c; return M
def Rz(a):
    c, s = math.cos(a), math.sin(a); M = np.eye(4); M[:2, :2] = [[c, -s], [s, c]]; return M
def chain(*Ms):
    R = np.eye(4)
    for M in Ms: R = R @ M
    return R

# ------------------------------------------------------------------ prymitywy
def box(sx, sy, sz, uv_scale=0.25, center=(0, 0, 0)):
    """Prostopadłościan z UV w skali świata (tekstura nie rozciąga się)."""
    x, y, z = sx / 2, sy / 2, sz / 2
    faces = [  # normalna, 4 narożniki (przeciwnie do wskazówek patrząc z zewnątrz), wymiary (u,v)
        ((0, 0, 1), [(-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z)], (sx, sy)),
        ((0, 0, -1), [(x, -y, -z), (-x, -y, -z), (-x, y, -z), (x, y, -z)], (sx, sy)),
        ((1, 0, 0), [(x, -y, z), (x, -y, -z), (x, y, -z), (x, y, z)], (sz, sy)),
        ((-1, 0, 0), [(-x, -y, -z), (-x, -y, z), (-x, y, z), (-x, y, -z)], (sz, sy)),
        ((0, 1, 0), [(-x, y, z), (x, y, z), (x, y, -z), (-x, y, -z)], (sx, sz)),
        ((0, -1, 0), [(-x, -y, -z), (x, -y, -z), (x, -y, z), (-x, -y, z)], (sx, sz)),
    ]
    P, N, U, I = [], [], [], []
    for n, quad, (w, h) in faces:
        b = len(P); P += quad; N += [n] * 4
        U += [(0, 0), (w / uv_scale, 0), (w / uv_scale, -h / uv_scale), (0, -h / uv_scale)]
        I += [(b, b + 1, b + 2), (b, b + 2, b + 3)]
    return Mesh(np.array(P) + center, N, U, I)

def lathe(profile, n=32, uv_scale=0.25, smooth_deg=40, cap_bottom=False, cap_top=False, a0=0.0, a1=2 * math.pi, flat=False):
    """Bryła obrotowa z profilu [(r, y), ...] podanego od dołu do góry. Ściany skierowane na zewnątrz."""
    prof = np.asarray(profile, float)
    segs = len(prof) - 1
    seg_n, seg_len = [], []
    for i in range(segs):
        dr, dy = prof[i + 1] - prof[i]
        L = math.hypot(dr, dy) or 1e-9
        seg_n.append(np.array([dy, -dr]) / L)   # normalna w płaszczyźnie (r, y)
        seg_len.append(L)
    cosmax = math.cos(math.radians(smooth_deg))
    ravg = max(1e-3, float(np.mean(prof[:, 0])))
    P, N, U, I = [], [], [], []
    vacc = 0.0
    full = abs((a1 - a0) - 2 * math.pi) < 1e-6
    for i in range(segs):
        ends = []
        for k, j in ((0, i - 1), (1, i + 1)):
            nn = seg_n[i].copy()
            if 0 <= j < segs and np.dot(seg_n[i], seg_n[j]) > cosmax:
                nn = seg_n[i] + seg_n[j]; nn /= np.linalg.norm(nn)
            ends.append(nn)
        base = len(P)
        for k in range(n + 1):
            a = a0 + (a1 - a0) * k / n
            ca, sa = math.cos(a), math.sin(a)
            for e in range(2):
                r, y = prof[i + e]
                nr, ny = ends[e]
                P.append((r * ca, y, r * sa))
                N.append((nr * ca, ny, nr * sa))
                U.append((a * ravg / uv_scale, -(vacc + e * seg_len[i]) / uv_scale))
        for k in range(n):
            p0 = base + 2 * k
            I += [(p0, p0 + 1, p0 + 3), (p0, p0 + 3, p0 + 2)]
        vacc += seg_len[i]
    m = Mesh(P, N, U, I)
    if cap_bottom and prof[0, 0] > 0: m = m + disk(prof[0, 0], prof[0, 1], n, uv_scale, up=False, a0=a0, a1=a1)
    if cap_top and prof[-1, 0] > 0: m = m + disk(prof[-1, 0], prof[-1, 1], n, uv_scale, up=True, a0=a0, a1=a1)
    return m

def disk(r, y, n=32, uv_scale=0.25, up=True, a0=0.0, a1=2 * math.pi, r_in=0.0):
    P, N, U, I = [], [], [], []
    ny = 1 if up else -1
    for k in range(n + 1):
        a = a0 + (a1 - a0) * k / n
        for rr in (r_in, r):
            x, z = rr * math.cos(a), rr * math.sin(a)
            P.append((x, y, z)); N.append((0, ny, 0)); U.append((x / uv_scale, z / uv_scale))
    for k in range(n):
        p = 2 * k
        tri = ([(p, p + 2, p + 3)] if r_in > 0 else []) + [(p, p + 3, p + 1)]
        if up: tri = [t[::-1] for t in tri]
        I += tri
    m = Mesh(P, N, U, I)
    m.idx = m.idx[:, ::-1]
    return m

def cylinder(r, h, n=24, uv_scale=0.25, y0=0.0, caps=True, r_top=None):
    rt = r if r_top is None else r_top
    return lathe([(r, y0), (rt, y0 + h)], n, uv_scale, cap_bottom=caps, cap_top=caps)

def sphere(r, n=24, uv_scale=0.25, rows=None, top_only=False):
    rows = rows or n // 2
    end = math.pi / 2 if top_only else math.pi
    prof = [(r * math.sin(t), -r * math.cos(t)) for t in np.linspace(0, end, rows + 1)]
    if top_only: prof = [(r * math.cos(t), r * math.sin(t)) for t in np.linspace(0, math.pi / 2, rows + 1)]
    return lathe(prof, n, uv_scale, smooth_deg=89)

def beam(p0, p1, w, h=None, uv_scale=0.2, up=(0, 1, 0)):
    """Belka (prostopadłościan) od punktu p0 do p1; tekstura biegnie wzdłuż belki."""
    h = w if h is None else h
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    d = p1 - p0; L = np.linalg.norm(d); x = d / L
    upv = np.asarray(up, float)
    if abs(np.dot(upv, x)) > 0.95: upv = np.array([1.0, 0, 0]) if abs(x[0]) < 0.9 else np.array([0, 0, 1.0])
    z = np.cross(x, upv); z /= np.linalg.norm(z); y = np.cross(z, x)
    M = np.eye(4); M[:3, 0], M[:3, 1], M[:3, 2] = x, y, z; M[:3, 3] = (p0 + p1) / 2
    return box(L, h, w, uv_scale).transformed(M)

def torus(R, r, n=48, m=10, uv_scale=0.1, y=0.0):
    P, N, U, I = [], [], [], []
    for i in range(n + 1):
        a = 2 * math.pi * i / n
        for j in range(m + 1):
            b = 2 * math.pi * j / m
            nx, ny, nz = math.cos(b) * math.cos(a), math.sin(b), math.cos(b) * math.sin(a)
            P.append(((R + r * math.cos(b)) * math.cos(a), y + r * math.sin(b), (R + r * math.cos(b)) * math.sin(a)))
            N.append((nx, ny, nz)); U.append((a * R / uv_scale, b * r / uv_scale))
    for i in range(n):
        for j in range(m):
            p = i * (m + 1) + j; q = p + m + 1
            I += [(p, q + 1, q), (p, p + 1, q + 1)]
    return Mesh(P, N, U, I)

def rock(radius, seed=0, sub=2, rough=0.28, flat_bottom=True, uv_scale=0.15):
    """Kamień: zniekształcona ikosfera z wygładzonymi normalnymi."""
    rng = np.random.default_rng(seed)
    t = (1 + 5 ** 0.5) / 2
    V = [(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t), (0, -1, -t), (0, 1, -t), (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)]
    F = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8),
         (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)]
    V = [np.array(v, float) / np.linalg.norm(v) for v in V]
    for _ in range(sub):
        cache, F2 = {}, []
        def mid(a, b):
            k = (min(a, b), max(a, b))
            if k not in cache:
                v = V[a] + V[b]; V.append(v / np.linalg.norm(v)); cache[k] = len(V) - 1
            return cache[k]
        for a, b, c in F:
            ab, bc, ca = mid(a, b), mid(b, c), mid(c, a)
            F2 += [(a, ab, ca), (b, bc, ab), (c, ca, bc), (ab, bc, ca)]
        F = F2
    V = np.array(V)
    # szum o niskiej częstotliwości: suma kilku losowych „fal”
    disp = np.ones(len(V))
    for _ in range(6):
        d = rng.normal(size=3); d /= np.linalg.norm(d)
        disp += rough * rng.uniform(0.3, 1) * np.cos(V @ d * rng.uniform(1.5, 4) + rng.uniform(0, 6)) / 3
    P = V * disp[:, None] * radius * np.array([1, rng.uniform(0.55, 0.8), 1]) * rng.uniform(0.8, 1.2, 3)
    if flat_bottom: P[:, 1] = np.maximum(P[:, 1], -radius * 0.25)
    F = np.array(F)
    fn = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
    Nv = np.zeros_like(P)
    for k in range(3): np.add.at(Nv, F[:, k], fn)
    Nv /= np.linalg.norm(Nv, axis=1, keepdims=True) + 1e-12
    # orientacja: normalne na zewnątrz
    if np.mean(np.sum(Nv * P, axis=1)) < 0: F = F[:, ::-1]; Nv = -Nv
    U = np.c_[(P[:, 0] + P[:, 2]) / uv_scale, -P[:, 1] / uv_scale]
    return Mesh(P, Nv, U, F)

def cloth(w, h, nx=12, ny=8, wave=0.02, phase=0.0, uv_scale=None):
    """Płachta (flaga/żagiel) w płaszczyźnie XY, lekko pofalowana."""
    P, N, U, I = [], [], [], []
    for j in range(ny + 1):
        for i in range(nx + 1):
            x, y = w * i / nx, h * j / ny
            z = wave * math.sin(phase + 2.5 * math.pi * i / nx) * (i / nx)
            dz = wave * 2.5 * math.pi / w * math.cos(phase + 2.5 * math.pi * i / nx) * (i / nx)
            n = np.array([-dz, 0, 1.0]); n /= np.linalg.norm(n)
            P.append((x, y, z)); N.append(n)
            U.append((i / nx, 1 - j / ny) if uv_scale is None else (x / uv_scale, -y / uv_scale))
    for j in range(ny):
        for i in range(nx):
            p = j * (nx + 1) + i; q = p + nx + 1
            I += [(p, p + 1, q + 1), (p, q + 1, q)]
    return Mesh(P, N, U, I)

# ------------------------------------------------------------------ eksport GLB
def _img_bytes(img, fmt):
    b = io.BytesIO()
    if fmt == 'jpeg': img.convert('RGB').save(b, 'JPEG', quality=86, optimize=True, progressive=False)
    else: img.save(b, 'PNG', optimize=True)
    return b.getvalue()

def quat(axis, ang):
    a = np.asarray(axis, float); a /= np.linalg.norm(a)
    return [*(a * math.sin(ang / 2)).tolist(), math.cos(ang / 2)]

def write_glb(path, nodes, materials, textures, animations=(), generator='przewodnik-ar HQ'):
    """
    nodes:      [{name, parent (nazwa|None), translation, rotation(quat), parts: [(Mesh, nazwa_materiału)]}]
    materials:  {nazwa: {color: (r,g,b,a) sRGB 0-1, tex: klucz|None, normal: klucz|None, normal_scale, rough, metal,
                         emissive: (r,g,b)|None, blend: bool, double: bool}}
    textures:   {klucz: (PIL.Image, 'jpeg'|'png')}
    animations: [{name, channels: [(nazwa_węzła, 'rotation'|'translation'|'scale', times, values)]}]
    """
    bins, views, accessors = [], [], []
    off = [0]
    def blob(b, target=None):
        pad = (4 - off[0] % 4) % 4
        if pad: bins.append(b'\0' * pad); off[0] += pad
        v = {'buffer': 0, 'byteOffset': off[0], 'byteLength': len(b)}
        if target: v['target'] = target
        views.append(v); bins.append(b); off[0] += len(b)
        return len(views) - 1
    def acc(arr, comp, typ, target=None, minmax=False):
        a = np.ascontiguousarray(arr)
        vi = blob(a.tobytes(), target)
        d = {'bufferView': vi, 'componentType': comp, 'count': int(a.shape[0]), 'type': typ}
        if minmax:
            mn, mx = a.min(axis=0), a.max(axis=0)
            d['min'] = [float(x) for x in np.atleast_1d(mn)]; d['max'] = [float(x) for x in np.atleast_1d(mx)]
        accessors.append(d); return len(accessors) - 1

    # tekstury
    tex_index, images, gl_textures = {}, [], []
    for k, (img, fmt) in textures.items():
        vi = blob(_img_bytes(img, fmt))
        images.append({'bufferView': vi, 'mimeType': 'image/jpeg' if fmt == 'jpeg' else 'image/png', 'name': k})
        gl_textures.append({'source': len(images) - 1, 'sampler': 0})
        tex_index[k] = len(gl_textures) - 1

    def lin(c): return [((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c[:3]]
    mat_index, gl_mats = {}, []
    for name, m in materials.items():
        col = list(m.get('color', (1, 1, 1, 1)))
        if len(col) == 3: col.append(1.0)
        pbr = {'baseColorFactor': lin(col) + [col[3]], 'roughnessFactor': m.get('rough', 0.8), 'metallicFactor': m.get('metal', 0.0)}
        if m.get('tex'): pbr['baseColorTexture'] = {'index': tex_index[m['tex']]}
        g = {'name': name, 'pbrMetallicRoughness': pbr}
        if m.get('normal'): g['normalTexture'] = {'index': tex_index[m['normal']], 'scale': m.get('normal_scale', 1.0)}
        if m.get('emissive'): g['emissiveFactor'] = lin(m['emissive'])
        if m.get('blend') or col[3] < 1: g['alphaMode'] = 'BLEND'
        if m.get('double'): g['doubleSided'] = True
        mat_index[name] = len(gl_mats); gl_mats.append(g)

    gl_nodes, meshes, ntri = [], [], 0
    names = [n['name'] for n in nodes]
    for nd in nodes:
        g = {'name': nd['name']}
        if nd.get('translation') is not None: g['translation'] = [float(x) for x in nd['translation']]
        if nd.get('rotation') is not None: g['rotation'] = [float(x) for x in nd['rotation']]
        groups = {}
        for mesh, mat in nd.get('parts', []):
            groups.setdefault(mat, []).append(mesh)
        prims = []
        for mat, lst in groups.items():
            M = merge(lst)
            if not len(M.idx): continue
            ntri += len(M.idx)
            pa = acc(M.pos.astype(np.float32), 5126, 'VEC3', 34962, True)
            na = acc(M.nrm.astype(np.float32), 5126, 'VEC3', 34962)
            ua = acc(M.uv.astype(np.float32), 5126, 'VEC2', 34962)
            big = len(M.pos) > 65535
            ia = acc(M.idx.astype(np.uint32 if big else np.uint16).reshape(-1), 5125 if big else 5123, 'SCALAR', 34963)
            prims.append({'attributes': {'POSITION': pa, 'NORMAL': na, 'TEXCOORD_0': ua}, 'indices': ia, 'material': mat_index[mat]})
        if prims:
            meshes.append({'primitives': prims, 'name': nd['name']}); g['mesh'] = len(meshes) - 1
        gl_nodes.append(g)
    roots = []
    for i, nd in enumerate(nodes):
        p = nd.get('parent')
        if p is None: roots.append(i)
        else: gl_nodes[names.index(p)].setdefault('children', []).append(i)

    gl_anims = []
    for an in animations:
        samplers, channels = [], []
        for node, path_, times, values in an['channels']:
            ti = acc(np.asarray(times, np.float32), 5126, 'SCALAR', minmax=True)
            vals = np.asarray(values, np.float32)
            oi = acc(vals, 5126, {4: 'VEC4', 3: 'VEC3'}[vals.shape[1]])
            samplers.append({'input': ti, 'output': oi, 'interpolation': 'LINEAR'})
            channels.append({'sampler': len(samplers) - 1, 'target': {'node': names.index(node), 'path': path_}})
        gl_anims.append({'name': an['name'], 'samplers': samplers, 'channels': channels})

    gltf = {'asset': {'version': '2.0', 'generator': generator}, 'scene': 0, 'scenes': [{'nodes': roots}],
            'nodes': gl_nodes, 'meshes': meshes, 'materials': gl_mats, 'accessors': accessors,
            'bufferViews': views, 'buffers': [{'byteLength': 0}]}
    if gl_textures:
        gltf.update({'textures': gl_textures, 'images': images,
                     'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497}]})
    if gl_anims: gltf['animations'] = gl_anims
    binb = b''.join(bins); binb += b'\0' * ((4 - len(binb) % 4) % 4)
    gltf['buffers'][0]['byteLength'] = len(binb)
    js = json.dumps(gltf, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(binb)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(binb), 0x004E4942)); f.write(binb)
    return ntri
