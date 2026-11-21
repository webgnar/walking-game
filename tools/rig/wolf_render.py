import bpy, sys, math
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
src=args[0] if args else 'wolf.glb'; out=args[1] if len(args)>1 else 'r'
bpy.ops.wm.read_factory_settings(use_empty=True)
if src.endswith('.blend'): bpy.ops.wm.open_mainfile(filepath=src)
else: bpy.ops.import_scene.gltf(filepath=src)
sc=bpy.context.scene
sc.render.engine='BLENDER_EEVEE' if False else 'CYCLES'; sc.cycles.samples=8; sc.cycles.device='CPU'
sc.render.resolution_x=640; sc.render.resolution_y=400
w=bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True; w.node_tree.nodes['Background'].inputs[1].default_value=1.0
w.node_tree.nodes['Background'].inputs[0].default_value=(0.5,0.5,0.55,1)
cam=bpy.data.objects.new('cam',bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera=cam
cam.data.type='ORTHO'; cam.data.ortho_scale=1.15
views={'side':((0,-3,0.25),(math.pi/2,0,0)),'front':((-3,0,0.25),(math.pi/2,0,-math.pi/2)),'top':((0,0,3),(0,0,0)),'q':((-1.6,-2.2,1.0),(math.radians(72),0,math.radians(-36)))}
frame=int(args[2]) if len(args)>2 else None
if frame is not None: sc.frame_set(frame)
for k,(loc,rot) in views.items():
    if len(args)>3 and k not in args[3].split(','): continue
    cam.location=loc; cam.rotation_euler=rot
    sc.render.filepath=f'./{out}-{k}.png'; bpy.ops.render.render(write_still=True)
