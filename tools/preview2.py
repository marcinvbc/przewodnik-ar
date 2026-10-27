import json, struct, sys, math, numpy as np
from PIL import Image, ImageDraw
def qrot(q, v):
    x,y,z,w=q; u=np.array([x,y,z]); return v + 2*np.cross(u, np.cross(u, v) + w*v)
def load(p, t):
    d=open(p,'rb').read(); jl=struct.unpack('<I',d[12:16])[0]; g=json.loads(d[20:20+jl]); b=d[28+jl:]
    def acc(i):
        a=g['accessors'][i]; v=g['bufferViews'][a['bufferView']]; n={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']]
        return np.frombuffer(b[v['byteOffset']:v['byteOffset']+v['byteLength']],np.float32).reshape(-1,n)
    rot={}
    for an in g.get('animations',[]):
        for ch in an['channels']:
            s=an['samplers'][ch['sampler']]; ts=acc(s['input'])[:,0]; qs=acc(s['output'])
            tt=t%ts[-1]; i=min(int(np.searchsorted(ts,tt,side='right'))-1,len(ts)-2); f=(tt-ts[i])/(ts[i+1]-ts[i])
            q=qs[i]*(1-f)+qs[i+1]*f; rot[ch['target']['node']]=q/np.linalg.norm(q)
    out=[]
    for ni,nd in enumerate(g['nodes']):
        tr=np.array(nd.get('translation',[0,0,0])); q=rot.get(ni,np.array([0,0,0,1.]))
        for pr in g['meshes'][nd['mesh']]['primitives']:
            pos=acc(pr['attributes']['POSITION']).reshape(-1,3)
            pos=np.array([qrot(q,v) for v in pos])+tr
            m=g['materials'][pr['material']]['pbrMetallicRoughness']['baseColorFactor']
            for tri in pos.reshape(-1,3,3): out.append((tri,[x**(1/2.2) for x in m[:3]],m[3]))
    return out
imgs=[]
for spec in sys.argv[1:]:
    p,t=spec.split('@'); tris=load(p,float(t)); W=400; im=Image.new('RGB',(W,W),(40,50,60)); dr=ImageDraw.Draw(im,'RGBA')
    ay,ax=math.radians(35),math.radians(-20)
    Ry=np.array([[math.cos(ay),0,math.sin(ay)],[0,1,0],[-math.sin(ay),0,math.cos(ay)]])
    Rx=np.array([[1,0,0],[0,math.cos(ax),-math.sin(ax)],[0,math.sin(ax),math.cos(ax)]]); R=Rx@Ry
    L=np.array([0.4,0.8,0.5]); L/=np.linalg.norm(L); items=[]
    for tr,c,a in tris:
        tt=tr@R.T; n=np.cross(tt[1]-tt[0],tt[2]-tt[0]); nn=np.linalg.norm(n)
        if nn<1e-9: continue
        s=0.35+0.65*abs(np.dot(n/nn,L)); items.append((tt[:,2].mean(),tt,tuple(int(255*min(1,x*s)) for x in c)+(int(255*a),)))
    items.sort(key=lambda x:x[0])
    for _,tt,c in items: dr.polygon([(W/2+x*300,W*0.85-y*300) for x,y,z in tt],fill=c)
    imgs.append(im)
s=Image.new('RGB',(400*len(imgs),400)); [s.paste(im,(i*400,0)) for i,im in enumerate(imgs)]; s.save('preview_anim.png')
