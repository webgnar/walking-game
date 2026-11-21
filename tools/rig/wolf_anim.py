import bpy, math, json, sys
from mathutils import Vector
R=math.radians
bpy.ops.wm.open_mainfile(filepath='./rig.blend')
rig=bpy.data.objects['wolf_rig']; P=rig.pose.bones
for b in P: b.rotation_mode='XYZ'
sc=bpy.context.scene; sc.render.fps=30
bones=json.load(open('./bones.json'))
# neutral stance: swing each leg about its hip so hip->paw is vertical (the model was sculpted mid-stride)
def legang(side):
    up=bones[side.replace('X','upper')]; ft=bones[side.replace('X','foot')]
    dx=ft[1][0]-up[0][0]; dz=ft[1][2]-up[0][2]
    return math.atan2(dx,-dz)  # + = paw behind the hip
NEUT={}
for leg in ('front_X.L','front_X.R','back_X.L','back_X.R'):
    NEUT[leg.replace('X','upper')]=-legang(leg)*0.85
print({k:round(math.degrees(v),1) for k,v in NEUT.items()})
rig.animation_data_create()
def clip(name, frames, keys, loop=False):
    act=bpy.data.actions.new(name); act.use_fake_user=True
    rig.animation_data.action=act
    for b in P: b.rotation_euler=(0,0,0); b.location=(0,0,0)
    # keys: {frame: {bone: (rx,ry,rz) in degrees or ('loc',x,y,z)}}
    allb=set(); [allb.update(k.keys()) for k in keys.values()]
    allb.update(NEUT.keys())
    for f in sorted(keys):
        for bn in allb:
            pb=P[bn]; v=keys[f].get(bn)
            rot=(0,0,0); loc=None
            if isinstance(v,dict): rot=v.get('r',(0,0,0)); loc=v.get('l')
            elif v is not None: rot=v
            n=NEUT.get(bn,0)
            pb.rotation_euler=(R(rot[0])+n,R(rot[1]),R(rot[2]))
            pb.keyframe_insert('rotation_euler',frame=f)
            if bn=='root':
                pb.location=loc or (0,0,0); pb.keyframe_insert('location',frame=f)
    act.frame_range=(min(keys),max(keys))
    tr=rig.animation_data.nla_tracks.new(); tr.name=name; tr.strips.new(name,int(min(keys)),act); tr.mute=True
    rig.animation_data.action=None
    return act
def lerpkeys(n, fn):  # sample a function of t (0..1) at every 2 frames
    return {f: fn(f/n) for f in range(0,n+1,2)}
S=math.sin; PI=math.pi
# idle: breathing, head sway, tail sway (2s loop)
clip('idle',60,lerpkeys(60,lambda t:{
  'root':{'l':(0,0.004*S(2*PI*t),0)},
  'spine1':(2*S(2*PI*t),0,0),'spine2':(-2*S(2*PI*t),0,0),
  'neck':(3*S(2*PI*t+0.5),0,4*S(2*PI*t)),'head':(2*S(2*PI*t),0,3*S(2*PI*t+1)),
  'jaw':(-3-3*S(2*PI*t),0,0),
  'tail1':(0,0,8*S(2*PI*t)),'tail2':(0,0,6*S(2*PI*t-0.8)),'tail3':(0,0,6*S(2*PI*t-1.6)),
}),loop=True)
# trot (0.8s loop): diagonal pairs FL+BR, FR+BL
def trot(t):
    a=2*PI*t
    k={'root':{'l':(0,0.012*abs(S(a)),0)},'neck':(3*S(2*a),0,0),'head':(-2*S(2*a),0,0),'spine1':(2*S(2*a),0,0),
       'tail1':(5,0,6*S(a)),'tail2':(0,0,6*S(a-0.8))}
    for leg,ph in (('front_X.L',0),('back_X.R',0),('front_X.R',PI),('back_X.L',PI)):
        sw=S(a+ph)            # + = leg back
        lift=max(0,-math.cos(a+ph)) # lifts while swinging forward
        k[leg.replace('X','upper')]=(24*sw,0,0)
        if leg.startswith('front'): k[leg.replace('X','lower')]=(45*lift,0,0); k[leg.replace('X','foot')]=(30*lift,0,0)
        else: k[leg.replace('X','lower')]=(-30*lift,0,0); k[leg.replace('X','foot')]=(35*lift,0,0)
    return k
clip('walk',24,lerpkeys(24,trot),loop=True)
# lunge-bite (0.9s); jaw snaps shut at frame 12 (0.4s) = contact
clip('attack',27,{
  0:{},
  7:{'root':{'l':(0,-0.02,0.035)},'spine1':(-5,0,0),'neck':(-12,0,0),'head':(4,0,0),'jaw':(-4,0,0),
     'back_upper.L':(-12,0,0),'back_upper.R':(-12,0,0),'back_lower.L':(10,0,0),'back_lower.R':(10,0,0),'tail1':(10,0,0)},
  10:{'root':{'l':(0,0.01,-0.07)},'spine1':(4,0,0),'neck':(10,0,0),'head':(10,0,0),'jaw':(-38,0,0),
     'front_upper.L':(-30,0,0),'front_upper.R':(-30,0,0),'back_upper.L':(18,0,0),'back_upper.R':(18,0,0),'tail1':(18,0,0)},
  12:{'root':{'l':(0,0.0,-0.085)},'neck':(4,0,0),'head':(-8,0,0),'jaw':(3,0,0),
     'front_upper.L':(-22,0,0),'front_upper.R':(-22,0,0),'back_upper.L':(14,0,0),'back_upper.R':(14,0,0),'tail1':(12,0,0)},
  15:{'root':{'l':(0,-0.005,-0.07)},'neck':(0,0,8),'head':(-6,0,10),'jaw':(2,0,0),'front_upper.L':(-15,0,0),'front_upper.R':(-15,0,0)},
  18:{'root':{'l':(0,-0.005,-0.05)},'neck':(0,0,-8),'head':(-6,0,-10),'jaw':(2,0,0),'front_upper.L':(-10,0,0),'front_upper.R':(-10,0,0)},
  21:{'root':{'l':(0,0,-0.02)},'neck':(0,0,3),'head':(-2,0,3)},
  27:{},
})
# hurt flinch (0.5s)
clip('hurt',15,{
  0:{},
  3:{'root':{'l':(0,-0.012,0.045)},'spine1':(6,0,4),'spine2':(4,0,0),'neck':(20,0,-6),'head':(12,0,-8),'jaw':(-22,0,0),
     'tail1':(-18,0,0),'front_upper.L':(10,0,0),'front_upper.R':(10,0,0)},
  7:{'root':{'l':(0,-0.008,0.03)},'neck':(8,0,-3),'head':(4,0,-3),'jaw':(-10,0,0),'tail1':(-12,0,0)},
  15:{},
})
# death collapse (1.2s, hold last frame)
clip('death',36,{
  0:{},
  4:{'root':{'l':(0,-0.01,0.04)},'neck':(18,0,0),'head':(10,0,0),'jaw':(-25,0,0)},
  12:{'root':{'l':(0,-0.09,0.02)},'neck':(-10,0,0),'head':(-8,0,0),'jaw':(-15,0,0),
      'front_upper.L':(-35,0,0),'front_upper.R':(-35,0,0),'front_lower.L':(60,0,0),'front_lower.R':(60,0,0),
      'back_upper.L':(-30,0,0),'back_upper.R':(-30,0,0),'back_lower.L':(-30,0,0),'back_lower.R':(-30,0,0),'tail1':(-20,0,0)},
  22:{'root':{'r':(0,0,70),'l':(0.0,-0.06,0.0)},'neck':(-14,0,8),'head':(-10,0,0),'jaw':(-20,0,0),
      'front_upper.L':(-15,0,0),'front_upper.R':(-10,0,0),'front_lower.L':(25,0,0),'front_lower.R':(20,0,0),
      'back_upper.L':(-10,0,0),'back_upper.R':(-5,0,0),'back_lower.L':(-10,0,0),'tail1':(-25,0,0),'tail2':(-10,0,0)},
  28:{'root':{'r':(0,0,92),'l':(0.0,-0.02,0.0)},'neck':(-10,0,12),'head':(-6,0,4),'jaw':(-18,0,0),
      'front_upper.L':(-10,0,0),'front_upper.R':(-5,0,0),'front_lower.L':(15,0,0),'front_lower.R':(12,0,0),
      'back_upper.L':(-5,0,0),'back_upper.R':(0,0,0),'tail1':(-25,0,0),'tail2':(-10,0,0)},
  36:{'root':{'r':(0,0,90),'l':(0.0,-0.025,0.0)},'neck':(-10,0,12),'head':(-6,0,4),'jaw':(-16,0,0),
      'front_upper.L':(-10,0,0),'front_upper.R':(-5,0,0),'front_lower.L':(15,0,0),'front_lower.R':(12,0,0),
      'back_upper.L':(-5,0,0),'tail1':(-25,0,0),'tail2':(-10,0,0)},
})
# snarl (1.2s): head low, lips/jaw working, tail down
sn={0:{}}
for i,f in enumerate(range(6,31,3)):
    sn[f]={'root':{'l':(0,-0.025,0.01)},'spine2':(-5,0,0),'neck':(-14,0,0),'head':(10,0,3*(1 if i%2 else -1)),
           'jaw':(-30 if i%2 else -20,0,0),'tail1':(-22,0,0),'tail2':(-8,0,0),
           'front_upper.L':(-6,0,0),'front_upper.R':(-6,0,0)}
sn[36]={}
clip('snarl',36,sn)
# leave the rest pose neutral (legs squared) as the bind display
for b in P: b.rotation_euler=(0,0,0); b.location=(0,0,0)
bpy.ops.wm.save_as_mainfile(filepath='./anim.blend')
print('ACTIONS',[a.name for a in bpy.data.actions])
