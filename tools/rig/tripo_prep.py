# Prep a raw Tripo HD export for the beast rig: import the (already decimated) r.glb, turn it so it faces -X
# with Z up, scale it to 1 unit nose to tail with the paws at z=0, keep only the colour map, and write
# lion.glb + lion.npy for fit_canine.py. Pass --flip if the head ends up at +X. See README.
import bpy, sys, math, numpy as np
from mathutils import Matrix
flip = '--flip' in sys.argv
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='r.glb')
m=[o for o in bpy.context.scene.objects if o.type=='MESH'][0]
for o in list(bpy.context.scene.objects):
    if o is not m: o.select_set(False)
bpy.context.view_layer.objects.active=m
m.parent=None
bpy.ops.object.select_all(action='DESELECT'); m.select_set(True)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
V=np.array([v.co[:] for v in m.data.vertices])
ext=V.max(0)-V.min(0); print('EXT',ext)
# length along Y in Blender -> rotate 90 deg about Z so it lies along X
R=Matrix.Rotation(math.radians(90 if not flip else -90),4,'Z')
m.data.transform(R)
V=np.array([v.co[:] for v in m.data.vertices])
L=V[:,0].max()-V[:,0].min(); s=1.0/L
c=(V.max(0)+V.min(0))/2
m.data.transform(Matrix.Scale(s,4)@Matrix.Translation((-c[0],-c[1],-V[:,2].min())))
V=np.array([v.co[:] for v in m.data.vertices]); print('NEW',V.min(0),V.max(0))
# which end is the head: mean z of the 5% extreme ends
lo=V[V[:,0]<V[:,0].min()+0.06]; hi=V[V[:,0]>V[:,0].max()-0.06]
print('END -X zmean',lo[:,2].mean(),'n',len(lo),' END +X zmean',hi[:,2].mean(),'n',len(hi))
# keep only base colour
mat=m.data.materials[0]; nt=mat.node_tree; bsdf=nt.nodes['Principled BSDF']
for inp in ('Normal','Metallic','Roughness'):
    for l in list(bsdf.inputs[inp].links): nt.links.remove(l)
bsdf.inputs['Roughness'].default_value=0.95; bsdf.inputs['Metallic'].default_value=0
for n in list(nt.nodes):
    if n.type in ('TEX_IMAGE','NORMAL_MAP','SEPARATE_COLOR','SEPRGB') and not any(l.to_node==bsdf and l.to_socket.name=='Base Color' for l in n.outputs[0].links if n.outputs): 
        if n.type!='TEX_IMAGE' or not any(l.to_socket.name=='Base Color' for o in n.outputs for l in o.links): nt.nodes.remove(n)
for o in list(bpy.context.scene.objects):
    if o is not m: bpy.data.objects.remove(o)
np.save('lion.npy',V)
bpy.ops.export_scene.gltf(filepath='lion.glb',export_format='GLB',export_yup=True)
# side render
sc=bpy.context.scene; sc.render.engine='CYCLES'; sc.cycles.samples=4; sc.render.resolution_x=480; sc.render.resolution_y=320
w=bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True; w.node_tree.nodes['Background'].inputs[0].default_value=(0.6,0.6,0.65,1)
cam=bpy.data.objects.new('cam',bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera=cam
cam.data.type='ORTHO'; cam.data.ortho_scale=1.2; cam.location=(0,-3,0.3); cam.rotation_euler=(math.pi/2,0,0)
sc.render.filepath='./side.png'; bpy.ops.render.render(write_still=True)
