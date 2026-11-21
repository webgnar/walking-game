// Rigged beasts (zack's models). One shared quadruped skeleton, so every canine/feline model skinned to the
// same bone names can reuse the same clips: root, pelvis, spine1, spine2, neck, head, jaw, tail1-3,
// front_upper/lower/foot.L/R, back_upper/lower/foot.L/R. Built in Blender (tools/rig/wolf_rig.py).
// Clips: idle, walk, attack (jaw snaps shut at ATTACK_CONTACT), hurt, death, snarl.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const ATTACK_CONTACT = 0.4; // seconds into the attack clip where the bite lands
// which model each enemy uses, and its world length (model is ~1 unit nose to tail)
export const BEASTS = {
  mangy: { file: 'wolf', size: 2.2 },
};

const cache = {};
let loader;
function load(file) {
  if (!cache[file]) {
    if (!loader) { loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder); }
    cache[file] = loader.loadAsync(`/models/beasts/${file}.glb`).then((g) => {
      g.scene.traverse((o) => {
        if (!o.isMesh) return;
        o.frustumCulled = false; // skinned bounds don't follow the clips
        const m = o.material;
        if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
        m.roughness = 0.95; m.metalness = 0;
      });
      return g;
    }).catch((e) => { console.warn('[beasts] failed', file, e); return null; });
  }
  return cache[file];
}

// Swap an enemy's primitive stand-in for its rigged model. Resolves to the controller, or null.
export async function attachBeast(group, id) {
  const def = BEASTS[id];
  if (!def) return null;
  const g = await load(def.file);
  if (!g || !group.parent) return null;
  const model = cloneSkinned(g.scene);
  model.scale.setScalar(def.size);
  model.rotation.y = Math.PI; // models face -x; enemy groups are built facing +x, then turned to the hero
  if (group.userData.body) group.userData.body.visible = false;
  group.add(model);
  const headBone = model.getObjectByName('head');
  if (headBone) group.userData.head = headBone; // effects aim at the real head
  const mixer = new THREE.AnimationMixer(model);
  const acts = {};
  for (const c of g.animations) acts[c.name] = mixer.clipAction(c);
  for (const n of ['attack', 'hurt', 'snarl', 'death']) if (acts[n]) { acts[n].setLoop(THREE.LoopOnce); acts[n].clampWhenFinished = true; }
  let cur = null;
  const play = (name, { fade = 0.12, speed = 1, at = 0 } = {}) => {
    const a = acts[name];
    if (!a) return false;
    if (cur && cur !== a) cur.fadeOut(fade);
    a.reset(); a.timeScale = speed; a.time = at; a.setEffectiveWeight(1); a.fadeIn(fade); a.play();
    cur = a;
    return true;
  };
  // one-shots fall back to idle when done (death stays down)
  mixer.addEventListener('finished', (e) => { if (e.action !== acts.death) play('idle', { fade: 0.25 }); });
  play('idle', { fade: 0 });
  acts.idle.time = Math.random() * 2; // packs don't breathe in sync
  const ctl = {
    mixer, play,
    // bite so the jaw snaps shut contactMs from now
    bite(contactMs) {
      const speed = 1.6;
      return play('attack', { speed, at: Math.max(0, ATTACK_CONTACT - (contactMs / 1000) * speed), fade: 0.06 });
    },
    update(dt) { mixer.update(dt); },
  };
  group.userData.beast = ctl;
  return ctl;
}
