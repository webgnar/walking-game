# Beast rig (shared quadruped skeleton)

These scripts build the rigged wolf in `public/models/beasts/wolf.glb`. They run headless with the `bpy` pip package
(Blender as a Python module, `pip install bpy`, Python 3.13), from a folder containing the source `wolf.glb`:

1. `python wolf_rig.py`: places the skeleton and auto-weights the mesh. It writes `rig.blend` and `bones.json`.
   Any vertex the heat solve misses (loose fur cards) goes to its nearest bone.
2. `python wolf_anim.py`: authors the clips. It writes `anim.blend`.
3. `python wolf_export.py`: writes `wolf-rigged.glb` with every action as a clip.
4. `npx @gltf-transform/cli optimize wolf-rigged.glb wolf.glb --compress meshopt --texture-compress webp --texture-size 512 --simplify false`

## Bones

Every beast uses the same bone names, so the clips can be shared:
- Spine and head: root, pelvis, spine1, spine2, neck, head, jaw
- Tail: tail1, tail2, tail3
- Front legs: front_upper/front_lower/front_foot, each .L and .R
- Back legs: back_upper/back_lower/back_foot, each .L and .R

L is the animal's left. The model faces -X with Z up in Blender, which is -X with Y up in glTF. Every bone's local +X rotation pitches it in the side plane. Legs: + swings the paw backward. Body, neck, head and tail: + raises the tip. Jaw: negative opens.

## Clips

The clips are at 30 fps, and each is keyed as offsets from a neutral stance (legs squared under the hips):
- idle: 2 s loop
- walk: trot, 0.8 s loop
- attack: lunge-bite. The jaw shuts at 0.4 s (ATTACK_CONTACT in src/scene/beasts.js)
- hurt
- death: holds the last frame
- snarl

## Rigging another beast

To rig a new beast (beta, alpha, hyena, later lion and sabretooth), copy `wolf_rig.py`. Move the joint positions in `B` onto the new mesh, keeping the same names, then run `wolf_anim.py` unchanged. To add it to the game, list the enemy in BEASTS in src/scene/beasts.js.
