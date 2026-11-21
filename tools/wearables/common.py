import os, bpy, mathutils, math
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
from mathutils import Vector
JOINTS={}
def load_hero():
    """Import the caveman and leave a static, upright BODY mesh (the skin's bind pose) plus JOINTS."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=os.path.join(REPO, 'public/models/caveman.fbx'))
    arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
    mesh=[o for o in bpy.data.objects if o.type=='MESH'][0]
    dg=bpy.context.evaluated_depsgraph_get()
    me=bpy.data.meshes.new_from_object(mesh.evaluated_get(dg))
    me.transform(mesh.matrix_world)
    body=bpy.data.objects.new('BODY',me); bpy.context.scene.collection.objects.link(body)
    for pb in arm.pose.bones:
        JOINTS[pb.name.split(':')[-1]]=(arm.matrix_world@pb.head).copy()
    for o in (mesh,arm): bpy.data.objects.remove(o)
    return body
def J(n): return JOINTS[n]
def cam_render(path, loc, target, ortho=None, res=(700,900)):
    sc=bpy.context.scene
    cam=bpy.data.objects.get('CAM')
    if not cam:
        cam=bpy.data.objects.new('CAM',bpy.data.cameras.new('CAM')); sc.collection.objects.link(cam)
    sc.camera=cam
    cam.location=loc
    d=Vector(target)-Vector(loc); cam.rotation_euler=d.to_track_quat('-Z','Y').to_euler()
    if ortho: cam.data.type='ORTHO'; cam.data.ortho_scale=ortho
    sc.render.engine='CYCLES'; sc.cycles.device='CPU'; sc.cycles.samples=16
    sc.cycles.use_denoising=False
    if not sc.world:
        sc.world=bpy.data.worlds.new('W')
    sc.world.use_nodes=True
    bg=sc.world.node_tree.nodes.get('Background') or sc.world.node_tree.nodes.new('ShaderNodeBackground')
    bg.inputs[0].default_value=(0.55,0.55,0.6,1); bg.inputs[1].default_value=1.0
    out=[n for n in sc.world.node_tree.nodes if n.type=='OUTPUT_WORLD']
    if out: sc.world.node_tree.links.new(bg.outputs[0], out[0].inputs[0])
    if not bpy.data.objects.get('SUN'):
        l=bpy.data.objects.new('SUN',bpy.data.lights.new('SUN','SUN')); l.data.energy=3; l.rotation_euler=(0.8,0.2,0.6); sc.collection.objects.link(l)
    sc.render.resolution_x,sc.render.resolution_y=res
    sc.render.filepath=path
    bpy.ops.render.render(write_still=True)
