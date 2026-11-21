import bpy, math, sys, json
A=sys.argv[sys.argv.index('--')+1:]; SRC,BJ,OUT=A[0],A[1],A[2]
from mathutils import Vector, Euler
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
mesh=[o for o in bpy.context.scene.objects if o.type=='MESH'][0]
mesh.name='wolf_mesh'
# clean geometry for heat weights
bpy.context.view_layer.objects.active=mesh; mesh.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=0.0005); bpy.ops.object.mode_set(mode='OBJECT')
Y=0.03
# Shared quadruped skeleton. Wolf faces -X, Z up (Blender); exported to glTF it faces -X, Y up.
PAR={'root':None,'pelvis':'root','spine1':'pelvis','spine2':'spine1','neck':'spine2','head':'neck','jaw':'head','tail1':'pelvis','tail2':'tail1','tail3':'tail2'}
for k in ('front','back'):
    for sd in ('.L','.R'):
        PAR[f'{k}_upper{sd}']='spine2' if k=='front' else 'pelvis'; PAR[f'{k}_lower{sd}']=f'{k}_upper{sd}'; PAR[f'{k}_foot{sd}']=f'{k}_lower{sd}'
J=json.load(open(BJ)); B=[(n,tuple(J[n][0]),tuple(J[n][1]),PAR[n]) for n in PAR]
arm=bpy.data.armatures.new('quadruped'); rig=bpy.data.objects.new('wolf_rig',arm); bpy.context.scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig; bpy.ops.object.mode_set(mode='EDIT')
eb={}
for n,h,t,p in B:
    b=arm.edit_bones.new(n); b.head=h; b.tail=t
    if p: b.parent=eb[p]; b.use_connect=(Vector(eb[p].tail)-Vector(h)).length<1e-4
    if n in ('root','jaw','tail1') or 'upper' in n: b.use_connect=False
    eb[n]=b
for n in ('root',): eb[n].use_deform=False
# consistent bend axes: body bones roll Z to world up, leg/root bones roll Z to world +X,
# so for every bone local +X rotation = pitch in the side plane
for n,b in eb.items():
    b.align_roll(Vector((1,0,0)) if ('front_' in n or 'back_' in n or n=='root') else Vector((0,0,1)))
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='DESELECT'); mesh.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active=rig
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
# any vertex the heat solve missed (loose fur cards) goes fully to its nearest bone
from mathutils.geometry import intersect_point_line
segs=[(n,Vector(h),Vector(t)) for n,h,t,p in B if n!='root']
def dseg(p,a,b):
    c,f=intersect_point_line(p,a,b); f=min(1,max(0,f)); return (p-(a+(b-a)*f)).length
miss=0
for v in mesh.data.vertices:
    if sum(g.weight for g in v.groups)<0.05:
        ds=sorted((dseg(v.co,s[1],s[2]),s[0]) for s in segs)[:3]
        ws=[1/max(d,0.004)**4 for d,_ in ds]; t=sum(ws)
        for (d,n),w in zip(ds,ws): mesh.vertex_groups[n].add([v.index],w/t,'REPLACE')
        miss+=1
print('UNWEIGHTED FIXED',miss)
bpy.context.view_layer.objects.active=mesh
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL',limit=4)
bpy.ops.object.vertex_group_normalize_all(lock_active=False)
vg={g.name for g in mesh.vertex_groups}
empty=[g.name for g in mesh.vertex_groups if not any(g.index in [x.group for x in v.groups] for v in list(mesh.data.vertices)[::7])]
print('GROUPS',len(vg),'EMPTYISH',empty)
bpy.ops.wm.save_as_mainfile(filepath=OUT+'-rig.blend')
import json; json.dump({n:[list(h),list(t)] for n,h,t,p in B}, open(OUT+'-bones.json','w'))
