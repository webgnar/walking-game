import bpy, sys
OUT=sys.argv[sys.argv.index('--')+1]
bpy.ops.wm.open_mainfile(filepath=OUT+'-anim.blend')
rig=bpy.data.objects['wolf_rig']
for t in list(rig.animation_data.nla_tracks): rig.animation_data.nla_tracks.remove(t)
rig.animation_data.action=None
bpy.ops.export_scene.gltf(filepath=OUT+'-rigged.glb', export_format='GLB', export_animations=True,
  export_animation_mode='ACTIONS', export_force_sampling=True, export_frame_step=1, export_def_bones=True, export_yup=True, export_apply=False)
