import bpy, sys, math
args=sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.open_mainfile(filepath='./anim.blend')
sc=bpy.context.scene; rig=bpy.data.objects['wolf_rig']
for t in rig.animation_data.nla_tracks: t.mute=True
sc.render.engine='CYCLES'; sc.cycles.samples=4; sc.render.resolution_x=320; sc.render.resolution_y=220
w=bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True; w.node_tree.nodes['Background'].inputs[0].default_value=(0.5,0.5,0.55,1)
cam=bpy.data.objects.new('cam',bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera=cam
cam.data.type='ORTHO'; cam.data.ortho_scale=1.3
view=args[1] if len(args)>1 else 'side'
if view=='side': cam.location=(0,-3,0.25); cam.rotation_euler=(math.pi/2,0,0)
else: cam.location=(-1.6,-2.2,1.0); cam.rotation_euler=(math.radians(72),0,math.radians(-36))
for name in args[0].split(','):
    act=bpy.data.actions[name]; rig.animation_data.action=act
    if hasattr(rig.animation_data,'action_slot') and act.slots: rig.animation_data.action_slot=act.slots[0]
    f0,f1=[int(x) for x in act.frame_range]
    for i,f in enumerate([f0+round((f1-f0)*k/5) for k in range(6)]):
        sc.frame_set(f); sc.render.filepath=f'./fr-{name}-{i}.png'; bpy.ops.render.render(write_still=True)
