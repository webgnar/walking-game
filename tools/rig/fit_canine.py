# Fit the shared quadruped joints onto a Tripo canine (faces -X, Z up, ~1 unit long, feet at z=0).
import numpy as np, json, sys
V=np.load(sys.argv[1]); out=sys.argv[2]
def near(p,r): return V[np.linalg.norm(V[:,:2]-p[:2],axis=1)<r]
# --- feet: 4 clusters of the lowest vertices
low=V[V[:,2]<0.025][:,:2]
def km2(v):  # 1-D two-means
    c=np.array([v.min(),v.max()],float)
    for _ in range(30):
        lab=abs(v[:,None]-c[None]).argmin(1); c=np.array([v[lab==k].mean() for k in range(2)])
    return lab
lx=km2(low[:,0]); fr=low[lx==np.argmin([low[lx==k][:,0].mean() for k in range(2)])]; bk=low[lx!=np.argmin([low[lx==k][:,0].mean() for k in range(2)])]
def split(p):
    ly=km2(p[:,1]); a=p[ly==0].mean(0); b=p[ly==1].mean(0); return [a,b]
front=split(fr); back=split(bk)
feet={}
for nm,pair in (('front',front),('back',back)):
    l,r=sorted(pair,key=lambda c:c[1]); feet[nm+'.L']=l; feet[nm+'.R']=r
def trace(foot, zmax):
    pts=[]; c=np.array(foot,float)
    for z in np.arange(0.0,zmax,0.02):
        s=V[(V[:,2]>=z)&(V[:,2]<z+0.02)]
        s=s[np.linalg.norm(s[:,:2]-c,axis=1)<0.06]
        if len(s)<4: break
        c=0.6*s[:,:2].mean(0)+0.4*c; pts.append((c[0],c[1],z+0.01))
    return np.array(pts)
def at(tr,z):
    i=np.argmin(abs(tr[:,2]-z)); return tr[i]
B={}
# body profile
xs=np.arange(-0.5,0.5,0.02)
top=np.array([V[(V[:,0]>=x)&(V[:,0]<x+0.02)][:,2].max() for x in xs])
def ztop(x): return float(np.interp(x,xs+0.01,top))
mid=V[(V[:,0]>-0.08)&(V[:,0]<0.04)]; zbelly=float(np.percentile(mid[:,2],3))
def sz(x): t=ztop(x); return t-0.45*(t-zbelly)
Y=float(np.median(V[(V[:,2]>0.3)][:,1]))
for side in ('front.L','front.R','back.L','back.R'):
    f=feet[side]; isf=side.startswith('front')
    tr=trace(f,0.26)
    s=V[(V[:,2]<0.03)&(np.linalg.norm(V[:,:2]-f,axis=1)<0.06)]
    toe=s[np.argmin(s[:,0])]          # paw tip points forward (-x)
    wrist=at(tr,0.07 if isf else 0.10)
    elbow=at(tr,0.17 if isf else 0.20)
    zt=sz(elbow[0])-0.02
    top_=np.array([elbow[0]+(0.0 if isf else -0.04),(elbow[1]+Y)/2,zt])
    k='front' if isf else 'back'; sd=side[-2:]
    B[f'{k}_upper{sd}']=[top_.tolist(),list(map(float,elbow))]
    B[f'{k}_lower{sd}']=[list(map(float,elbow)),list(map(float,wrist))]
    B[f'{k}_foot{sd}']=[list(map(float,wrist)),[float(toe[0]),float(toe[1]),0.01]]
# spine from hips to shoulders
hipx=np.mean([B['back_upper.L'][0][0],B['back_upper.R'][0][0]])+0.04
shx=np.mean([B['front_upper.L'][0][0],B['front_upper.R'][0][0]])
P=lambda x:[float(x),Y,sz(x)]
B['root']=[[0.05,Y,0.0],[0.05,Y,0.12]]
B['pelvis']=[P(hipx+0.06),P(hipx-0.08)]
B['spine1']=[P(hipx-0.08),P((hipx+shx)/2)]
B['spine2']=[P((hipx+shx)/2),P(shx-0.03)]
# head: snout tip and neck
sn=V[V[:,0]<V[:,0].min()+0.04]; zs=float(np.median(sn[:,2]))
hx=V[:,0].min()
B['neck']=[P(shx-0.03),[hx+0.17,Y,zs+0.1]]
B['head']=[[hx+0.17,Y,zs+0.1],[hx,Y,zs+0.01]]
B['jaw']=[[hx+0.13,Y,zs-0.01],[hx+0.03,Y,zs-0.04]]
# tail: centroid of the high-ish verts behind the hips
tx=V[:,0].max(); tail=V[(V[:,0]>hipx+0.08)&(abs(V[:,1]-Y)<0.08)&(V[:,2]>0.08)]
def tc(x): s=tail[abs(tail[:,0]-x)<0.02]; return [float(x),Y,float(np.median(s[:,2])) if len(s) else 0.2]
t0=hipx+0.1; xs3=np.linspace(t0,tx-0.01,4)
B['tail1']=[tc(xs3[0]),tc(xs3[1])]; B['tail2']=[tc(xs3[1]),tc(xs3[2])]; B['tail3']=[tc(xs3[2]),tc(xs3[3])]
json.dump(B,open(out,"w"),indent=0,default=float)
for k,v in B.items(): print(k,[round(c,3) for c in v[0]],[round(c,3) for c in v[1]])
