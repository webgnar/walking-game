import bpy, math, sys
from mathutils import Vector, Euler
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='./wolf.glb')
mesh=[o for o in bpy.context.scene.objects if o.type=='MESH'][0]
mesh.name='wolf_mesh'
# clean geometry for heat weights
bpy.context.view_layer.objects.active=mesh; mesh.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=0.0005); bpy.ops.object.mode_set(mode='OBJECT')
Y=0.03
# Shared quadruped skeleton. Wolf faces -X, Z up (Blender); exported to glTF it faces -X, Y up.
B=[ # name, head, tail, parent
 ('root',(0.05,Y,0.0),(0.05,Y,0.12),None),
 ('pelvis',(0.25,Y,0.33),(0.10,Y,0.37),'root'),
 ('spine1',(0.10,Y,0.37),(-0.05,Y,0.38),'pelvis'),
 ('spine2',(-0.05,Y,0.38),(-0.20,Y,0.35),'spine1'),
 ('neck',(-0.20,Y,0.35),(-0.33,Y,0.29),'spine2'),
 ('head',(-0.33,Y,0.29),(-0.50,Y,0.20),'neck'),
 ('jaw',(-0.37,Y,0.21),(-0.47,Y,0.175),'head'),
 ('tail1',(0.28,Y,0.33),(0.35,Y,0.29),'pelvis'),
 ('tail2',(0.35,Y,0.29),(0.41,Y,0.22),'tail1'),
 ('tail3',(0.41,Y,0.22),(0.49,Y,0.13),'tail2'),
 # front legs (L = wolf's left = -Y)
 ('front_upper.L',(-0.16,-0.03,0.31),(-0.13,-0.045,0.16),'spine2'),
 ('front_lower.L',(-0.13,-0.045,0.16),(-0.135,-0.045,0.055),'front_upper.L'),
 ('front_foot.L',(-0.135,-0.045,0.055),(-0.215,-0.075,0.01),'front_lower.L'),
 ('front_upper.R',(-0.19,0.10,0.31),(-0.18,0.15,0.16),'spine2'),
 ('front_lower.R',(-0.18,0.15,0.16),(-0.26,0.157,0.065),'front_upper.R'),
 ('front_foot.R',(-0.26,0.157,0.065),(-0.35,0.16,0.01),'front_lower.R'),
 # back legs
 ('back_upper.L',(0.20,-0.04,0.32),(0.25,-0.075,0.19),'pelvis'),
 ('back_lower.L',(0.25,-0.075,0.19),(0.345,-0.09,0.09),'back_upper.L'),
 ('back_foot.L',(0.345,-0.09,0.09),(0.31,-0.165,0.01),'back_lower.L'),
 ('back_upper.R',(0.18,0.09,0.32),(0.13,0.09,0.20),'pelvis'),
 ('back_lower.R',(0.13,0.09,0.20),(0.205,0.08,0.10),'back_upper.R'),
 ('back_foot.R',(0.205,0.08,0.10),(0.10,0.10,0.01),'back_lower.R'),
]
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
        n=min(segs,key=lambda s:dseg(v.co,s[1],s[2]))[0]
        mesh.vertex_groups[n].add([v.index],1.0,'REPLACE'); miss+=1
print('UNWEIGHTED FIXED',miss)
bpy.context.view_layer.objects.active=mesh
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL',limit=4)
bpy.ops.object.vertex_group_normalize_all(lock_active=False)
vg={g.name for g in mesh.vertex_groups}
empty=[g.name for g in mesh.vertex_groups if not any(g.index in [x.group for x in v.groups] for v in list(mesh.data.vertices)[::7])]
print('GROUPS',len(vg),'EMPTYISH',empty)
bpy.ops.wm.save_as_mainfile(filepath='./rig.blend')
import json; json.dump({n:[list(h),list(t)] for n,h,t,p in B}, open('./bones.json','w'))
