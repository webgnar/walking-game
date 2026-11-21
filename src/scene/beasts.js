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
  mangy: { file: 'mangy', size: 1.9 },
  wolf: { file: 'wolf', size: 2.05 },
  beta: { file: 'beta', size: 2.35 },
  alpha: { file: 'alpha', size: 2.75 },
  // Until hyenas get their own model they reuse the wolf, repainted sandy and spotted, with shorter
  // hind legs for the hyena's sloping back.
  hyena: { file: 'wolf', size: 2.0, skin: 'hyena', hind: 0.84 },
};

// Repaint a beast's texture: keep the wolf's shading detail (luminance) but change its colours.
const SKINS = {
  hyena(d, w, h) {
    // a few hundred soft dark spots scattered over the UV sheet (stable: seeded)
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const spots = [];
    for (let i = 0; i < 260; i++) spots.push([rnd() * w, rnd() * h, (0.006 + rnd() * 0.01) * w]);
    const cell = Math.ceil(0.02 * w);
    const grid = new Map();
    for (const sp of spots) {
      const k = `${Math.floor(sp[0] / cell)},${Math.floor(sp[1] / cell)}`;
      (grid.get(k) || grid.set(k, []).get(k)).push(sp);
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const l = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255;
      const t = Math.min(1, l * 1.25);
      // dark brown in the creases to dusty tan on top
      let r = 60 + 150 * t, g = 42 + 118 * t, b = 24 + 70 * t;
      let spot = 0;
      const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
      for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) {
        const a = grid.get(`${gx},${gy}`);
        if (a) for (const [sx, sy, sr] of a) {
          const q = 1 - Math.hypot(x - sx, y - sy) / sr;
          if (q > spot) spot = q;
        }
      }
      const k = Math.min(1, spot * 2.5) * 0.65;
      r *= 1 - k; g *= 1 - k; b *= 1 - k * 0.9;
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
  },
};
const skinCache = {};
function skinMap(name, map) {
  if (!skinCache[name]) {
    const img = map.image;
    const w = Math.min(img.width, 1024), h = Math.min(img.height, 1024);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h);
    SKINS[name](data.data, w, h);
    ctx.putImageData(data, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.flipY = map.flipY;
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = map.wrapS; t.wrapT = map.wrapT;
    skinCache[name] = t;
  }
  return skinCache[name];
}

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
  if (def.skin) model.traverse((o) => {
    if (!o.isMesh || !o.material.map) return;
    o.material = o.material.clone();
    o.material.map = skinMap(def.skin, o.material.map);
  });
  if (group.userData.body) group.userData.body.visible = false;
  group.add(model);
  const headBone = model.getObjectByName('head');
  if (headBone) group.userData.head = headBone; // effects aim at the real head
  const hind = def.hind ? ['back_upper.L', 'back_upper.R', 'back_upper_L', 'back_upper_R', 'back_upperL', 'back_upperR'].map((n) => model.getObjectByName(n)).filter(Boolean) : [];
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
    update(dt) {
      mixer.update(dt);
      for (const b of hind) b.scale.setScalar(def.hind);
    },
  };
  group.userData.beast = ctl;
  return ctl;
}
