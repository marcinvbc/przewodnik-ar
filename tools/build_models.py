"""Generuje proste modele 3D (GLB) atrakcji z prymitywów — bez zewnętrznych bibliotek poza numpy."""
import json, struct, math, sys
import numpy as np

# ---------- prymitywy (zwracają trójkąty jako tablicę Nx3x3) ----------

def box(sx, sy, sz, c=(0, 0, 0)):
    x, y, z = sx / 2, sy / 2, sz / 2
    v = np.array([[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]])
    f = [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[3,7,6],[3,6,2],[0,4,7],[0,7,3],[1,2,6],[1,6,5]]
    return v[np.array(f)] + np.array(c)

def frustum(r0, r1, h, n=24, y0=0.0, caps=True, c=(0, 0, 0)):
    tris = []
    for i in range(n):
        a0, a1 = 2*math.pi*i/n, 2*math.pi*(i+1)/n
        p00 = [r0*math.cos(a0), y0, r0*math.sin(a0)]
        p01 = [r0*math.cos(a1), y0, r0*math.sin(a1)]
        p10 = [r1*math.cos(a0), y0+h, r1*math.sin(a0)]
        p11 = [r1*math.cos(a1), y0+h, r1*math.sin(a1)]
        tris.append([p00, p10, p11])
        if r0 > 0: tris.append([p00, p11, p01])
        if caps:
            if r0 > 0: tris.append([[0, y0, 0], p00, p01])
            if r1 > 0: tris.append([[0, y0+h, 0], p11, p10])
    return np.array(tris) + np.array(c)

def sphere(r, n=16, c=(0, 0, 0), half=False):
    tris = []
    rows = n // 2
    for i in range(rows):
        t0, t1 = math.pi*i/rows, math.pi*(i+1)/rows
        if half and t0 >= math.pi/2: break
        for j in range(n):
            p0, p1 = 2*math.pi*j/n, 2*math.pi*(j+1)/n
            P = lambda t, p: [r*math.sin(t)*math.cos(p), r*math.cos(t), r*math.sin(t)*math.sin(p)]
            a, b, cc, d = P(t0,p0), P(t0,p1), P(t1,p0), P(t1,p1)
            tris.append([a, b, d]); tris.append([a, d, cc])
    return np.array(tris) + np.array(c)

def rot_z(t, ang):
    ca, sa = math.cos(ang), math.sin(ang)
    R = np.array([[ca,-sa,0],[sa,ca,0],[0,0,1]])
    return t @ R.T

def rot_y(t, ang):
    ca, sa = math.cos(ang), math.sin(ang)
    R = np.array([[ca,0,sa],[0,1,0],[-sa,0,ca]])
    return t @ R.T

# ---------- eksport GLB ----------

def fix_winding(tris):
    """Odwraca trójkąty skierowane do środka (prymitywy są wypukłe względem swojej osi)."""
    out = tris.copy()
    for k, t in enumerate(tris):
        n = np.cross(t[1]-t[0], t[2]-t[0])
        return_center = t.mean(axis=0)
        # odniesienie: środek osi Y obiektu (x=0,z=0) na wysokości trójkąta
        if np.dot(n, return_center - REF[0]) < 0:
            out[k] = t[[0, 2, 1]]
    return out

REF = [np.zeros(3)]

def part(tris, ref=None):
    p = tris.reshape(-1, 3)
    REF[0] = (p.min(axis=0) + p.max(axis=0)) / 2
    return fix_winding(tris)

def write_glb(path, parts):
    """parts: lista (tris Nx3x3, rgba, roughness, metallic)"""
    groups = {}
    for tris, color, rough, metal in parts:
        key = (tuple(color), rough, metal)
        groups.setdefault(key, []).append(tris)
    bin_chunks, accessors, views, meshes_prims, materials = [], [], [], [], []
    offset = 0
    allpos = []
    for mi, (key, lst) in enumerate(groups.items()):
        tris = np.concatenate(lst).astype(np.float32)
        pos = tris.reshape(-1, 3)
        nrm = np.cross(tris[:,1]-tris[:,0], tris[:,2]-tris[:,0])
        nrm /= (np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-12)
        nrm = np.repeat(nrm, 3, axis=0).astype(np.float32)
        allpos.append(pos)
        for arr, typ in ((pos, 'POSITION'), (nrm, 'NORMAL')):
            b = arr.tobytes()
            views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(b), "target": 34962})
            acc = {"bufferView": len(views)-1, "componentType": 5126, "count": len(arr), "type": "VEC3"}
            if typ == 'POSITION':
                acc["min"] = pos.min(axis=0).tolist(); acc["max"] = pos.max(axis=0).tolist()
            accessors.append(acc)
            bin_chunks.append(b); offset += len(b)
        color, rough, metal = key
        materials.append({"pbrMetallicRoughness": {"baseColorFactor": list(color), "roughnessFactor": rough, "metallicFactor": metal}, "doubleSided": True})
        prim = {"attributes": {"POSITION": len(accessors)-2, "NORMAL": len(accessors)-1}, "material": mi}
        if color[3] < 1: materials[-1]["alphaMode"] = "BLEND"
        meshes_prims.append(prim)
    gltf = {
        "asset": {"version": "2.0", "generator": "przewodnik-ar"},
        "scene": 0, "scenes": [{"nodes": [0]}], "nodes": [{"mesh": 0}],
        "meshes": [{"primitives": meshes_prims}], "materials": materials,
        "accessors": accessors, "bufferViews": views, "buffers": [{"byteLength": offset}],
    }
    js = json.dumps(gltf, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    binb = b''.join(bin_chunks); binb += b'\0' * ((4 - len(binb) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(binb)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(binb), 0x004E4942)); f.write(binb)
    p = np.concatenate(allpos)
    print(path, 'bbox', p.min(axis=0).round(3), p.max(axis=0).round(3), 'tris', len(p)//3)

def rgba(h, a=1.0):
    h = h.lstrip('#'); c = [int(h[i:i+2], 16)/255 for i in (0, 2, 4)]
    # glTF baseColorFactor jest liniowy
    c = [x/12.92 if x <= 0.04045 else ((x+0.055)/1.055)**2.4 for x in c]
    return (*[round(x, 4) for x in c], a)

# ---------- modele ----------

def baszta():
    P = []
    stone, stone2, roof, wood, grass = rgba('#b9a88f'), rgba('#9c8b72'), rgba('#a8402c'), rgba('#5b3a24'), rgba('#6f9a4e')
    P.append((part(frustum(0.42, 0.42, 0.04, 40), (0, -1, 0)), grass, 0.95, 0))
    P.append((part(frustum(0.22, 0.19, 0.62, 28, y0=0.04), (0, 0.3, 0)), stone, 0.9, 0))
    P.append((part(frustum(0.215, 0.215, 0.05, 28, y0=0.66), (0, 0.68, 0)), stone2, 0.9, 0))
    # krenelaż
    n = 12
    for i in range(n):
        a = 2*math.pi*i/n
        b = box(0.06, 0.06, 0.05, (0, 0.74, 0))
        b = rot_y(b, -a) + np.array([0.195*math.cos(a), 0, 0.195*math.sin(a)])
        P.append((part(b, (0.195*math.cos(a), 0.74, 0.195*math.sin(a))), stone2, 0.9, 0))
    # dach
    P.append((part(frustum(0.17, 0.0, 0.32, 28, y0=0.71), (0, 0.8, 0)), roof, 0.7, 0))
    # brama i okna
    P.append((part(box(0.09, 0.15, 0.04, (0, 0.115, 0.195)), (0, 0.115, 0.17)), wood, 0.8, 0))
    for y, a in ((0.38, 0.0), (0.52, math.pi/2), (0.52, -math.pi/2)):
        w = box(0.035, 0.07, 0.03, (0, y, 0.0))
        w = rot_y(w, a) + np.array([0.185*math.sin(a), 0, 0.185*math.cos(a)])
        P.append((part(w, (0.17*math.sin(a), y, 0.17*math.cos(a))), wood, 0.8, 0))
    # chorągiewka
    P.append((part(frustum(0.006, 0.006, 0.12, 8, y0=1.02), (0, 1.08, 0)), wood, 0.8, 0))
    P.append((part(box(0.08, 0.045, 0.006, (0.04, 1.11, 0)), (0.04, 1.11, -1)), rgba('#e8c547'), 0.6, 0))
    return P

def latarnia():
    P = []
    white, red, black, glass, rock, sea = rgba('#f4f1ea'), rgba('#c8312f'), rgba('#2b2b2b'), rgba('#ffd65a'), rgba('#7d7a73'), rgba('#3d7ea6')
    P.append((part(frustum(0.45, 0.45, 0.02, 40), (0, -1, 0)), sea, 0.3, 0))
    P.append((part(frustum(0.30, 0.22, 0.08, 9, y0=0.02), (0, 0.06, 0)), rock, 1, 0))
    segs = 6; h = 0.11; y = 0.10
    for i in range(segs):
        r0 = 0.15 - 0.012*i; r1 = 0.15 - 0.012*(i+1)
        P.append((part(frustum(r0, r1, h, 28, y0=y, caps=False), (0, y + h/2, 0)), red if i % 2 else white, 0.7, 0))
        y += h
    P.append((part(frustum(0.13, 0.13, 0.02, 28, y0=y), (0, y + 0.01, 0)), black, 0.5, 0.3))
    # balustrada
    for i in range(16):
        a = 2*math.pi*i/16
        P.append((part(frustum(0.004, 0.004, 0.05, 6, y0=y+0.02), (0, y+0.05, 0)) + np.array([0.125*math.cos(a), 0, 0.125*math.sin(a)]), black, 0.5, 0.3))
    P.append((part(frustum(0.06, 0.06, 0.09, 16, y0=y+0.02), (0, y+0.065, 0)), glass, 0.2, 0))
    P.append((part(frustum(0.07, 0.07, 0.01, 16, y0=y+0.11), (0, y+0.115, 0)), black, 0.5, 0.3))
    dome = sphere(0.07, 16, half=True) + np.array([0, y+0.12, 0])
    P.append((part(dome, (0, y+0.12, 0)), red, 0.6, 0))
    P.append((part(frustum(0.005, 0.0, 0.05, 8, y0=y+0.19), (0, y+0.21, 0)), black, 0.5, 0.3))
    return P

def wiatrak():
    P = []
    wood, wood2, roof, sail, grass = rgba('#a9744a'), rgba('#7a4f2e'), rgba('#5e4a3a'), rgba('#efe6d2'), rgba('#6f9a4e')
    P.append((part(frustum(0.42, 0.42, 0.04, 40), (0, -1, 0)), grass, 0.95, 0))
    P.append((part(frustum(0.2, 0.15, 0.5, 8, y0=0.04), (0, 0.3, 0)), wood, 0.85, 0))
    P.append((part(frustum(0.17, 0.0, 0.2, 8, y0=0.54), (0, 0.6, 0)), roof, 0.8, 0))
    P.append((part(box(0.08, 0.13, 0.03, (0, 0.105, 0.17)), (0, 0.105, 0.1)), wood2, 0.8, 0))
    # oś i śmigła
    hub_z = 0.2; hub_y = 0.56
    P.append((part(box(0.05, 0.05, 0.12, (0, hub_y, hub_z - 0.04)), (0, hub_y, hub_z - 0.04)), wood2, 0.8, 0))
    for k in range(4):
        ang = math.pi/4 + k*math.pi/2
        arm = box(0.02, 0.42, 0.015, (0, 0.23, 0))
        blade = box(0.09, 0.3, 0.008, (0.055, 0.28, 0.0))
        for t, col in ((arm, wood2), (blade, sail)):
            tt = rot_z(t, ang) + np.array([0, hub_y, hub_z])
            P.append((part(tt, tt.reshape(-1, 3).mean(axis=0) - np.array([0, 0, 0.5])), col, 0.85, 0))
    return P

if __name__ == '__main__':
    out = sys.argv[1]
    write_glb(f'{out}/baszta.glb', baszta())
    write_glb(f'{out}/latarnia.glb', latarnia())
    write_glb(f'{out}/wiatrak.glb', wiatrak())
