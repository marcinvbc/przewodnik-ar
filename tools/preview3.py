import json, struct, sys, math, numpy as np
from PIL import Image, ImageDraw
def qmat(q):
    x,y,z,w=q; return np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
def load(p, anim, t):
    d=open(p,'rb').read(); jl=struct.unpack('<I',d[12:16])[0]; g=json.loads(d[20:20+jl]); b=d[28+jl:]
    def acc(i):
        a=g['accessors'][i]; v=g['bufferViews'][a['bufferView']]; n={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']]
        return np.frombuffer(b[v['byteOffset']:v['byteOffset']+v['byteLength']],np.float32).reshape(-1,n)
    ov={}
    for an in g.get('animations',[]):
        if an['name']!=anim: continue
        for ch in an['channels']:
            s=an['samplers'][ch['sampler']]; ts=acc(s['input'])[:,0]; vs=acc(s['output'])
            tt=t%ts[-1]; i=min(int(np.searchsorted(ts,tt,side='right'))-1,len(ts)-2); f=(tt-ts[i])/(ts[i+1]-ts[i])
            v=vs[i]*(1-f)+vs[i+1]*f
            if ch['target']['path']=='rotation': v=v/np.linalg.norm(v)
            ov.setdefault(ch['target']['node'],{})[ch['target']['path']]=v
    out=[]
    def walk(ni,M):
        nd=g['nodes'][ni]; o=ov.get(ni,{})
        T=np.eye(4); T[:3,3]=nd.get('translation',[0,0,0])
        R=np.eye(4); R[:3,:3]=qmat(o.get('rotation',nd.get('rotation',[0,0,0,1])))
        S=np.diag(list(o.get('scale',nd.get('scale',[1,1,1])))+[1])
        W=M@T@R@S
        if 'mesh' in nd:
            for pr in g['meshes'][nd['mesh']]['primitives']:
                pos=acc(pr['attributes']['POSITION']); pos=(np.c_[pos,np.ones(len(pos))]@W.T)[:,:3]
                m=g['materials'][pr['material']]['pbrMetallicRoughness']['baseColorFactor']
                for tri in pos.reshape(-1,3,3): out.append((tri,[x**(1/2.2) for x in m[:3]],m[3]))
        for c in nd.get('children',[]): walk(c,W)
    for r in g['scenes'][0]['nodes']: walk(r,np.eye(4))
    return out
def render(tris,W=360,ay=20,ax=-8,scale=320,cy=0.92):
    im=Image.new('RGB',(W,W),(232,236,240)); dr=ImageDraw.Draw(im,'RGBA')
    ay,ax=math.radians(ay),math.radians(ax)
    Ry=np.array([[math.cos(ay),0,math.sin(ay)],[0,1,0],[-math.sin(ay),0,math.cos(ay)]])
    Rx=np.array([[1,0,0],[0,math.cos(ax),-math.sin(ax)],[0,math.sin(ax),math.cos(ax)]]); R=Rx@Ry
    L=np.array([0.3,0.7,0.65]); L/=np.linalg.norm(L); items=[]
    for tr,c,a in tris:
        tt=tr@R.T; n=np.cross(tt[1]-tt[0],tt[2]-tt[0]); nn=np.linalg.norm(n)
        if nn<1e-12: continue
        n=n/nn
        if n[2]<0: continue  # backface (winding fixed outward)
        s=0.45+0.55*max(0,np.dot(n,L)); items.append((tt[:,2].max(),tt,tuple(int(255*min(1,x*s)) for x in c)+(int(255*a),)))
    items.sort(key=lambda x:x[0])
    for _,tt,c in items: dr.polygon([(W/2+x*scale,W*cy-y*scale) for x,y,z in tt],fill=c,outline=c)
    return im
if __name__=='__main__':
    p=sys.argv[1]; specs=sys.argv[2:]
    ims=[render(load(p,*(s.split('@')[0],float(s.split('@')[1])))) for s in specs]
    out=Image.new('RGB',(360*len(ims),360)); [out.paste(im,(i*360,0)) for i,im in enumerate(ims)]; out.save('/home/claude/tools/avatar_prev.png')
