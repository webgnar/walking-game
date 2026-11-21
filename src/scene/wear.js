// Wearable gear (armor, helm, offhand, trinket) on the rigged caveman.
//
// Each wearable is a plain, unrigged GLB in public/models/gear/<itemId>.glb, modelled around the
// caveman's bind pose (T-pose) in the space described by REF below. At load time every gear mesh is
// turned into a SkinnedMesh on the hero's own skeleton, so it follows every animation clip:
//   - a node named "<anything>__<Bone>" (e.g. "skull_cap__Head") rides that one bone rigidly;
//   - any other mesh copies the skin weights of the nearest hero vertices (armor, necklaces).
// So a new model for a wearable only has to be placed on the hero in Blender and exported in that
// space: no rigging needed. tools/wearables/ has the scripts that built the current first pass.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// Items that have a wearable model. Weapons still use zack's club (see stage.shownLooks).
export const WEARABLES = new Set([
  'torn_hide', 'hide_wrap', 'bone_mail', 'wolf_pelt', 'sabre_hide',
  'skull_cap', 'bone_helm', 'lion_mask', 'storm_crown',
  'bark_shield', 'flint_buckler', 'claw_buckler', 'obsidian_ward',
  'pebble_string', 'tooth_charm', 'ember_stone', 'fang_charm', 'ember_totem', 'ghost_amber',
]);

// Joint positions of the caveman's bind pose in the gear files' space (Blender metres, Y-up, facing +Z).
// The gear is mapped onto the live hero by matching these to the hero's joints (scale + offset).
const REF = {
  Hips: [0.0, 0.5254, -0.0009], Spine2: [0.0, 0.6598, -0.0206], Neck: [0.0, 0.7174, -0.0291], Head: [0.0, 0.7596, -0.0206],
  LeftArm: [0.1012, 0.6901, -0.0288], RightArm: [-0.1011, 0.6901, -0.0294], LeftHand: [0.3911, 0.6901, -0.0288],
  RightHand: [-0.391, 0.6901, -0.0294], LeftFoot: [0.0568, 0.0609, -0.0145], RightFoot: [-0.0568, 0.0609, -0.0145],
  LeftLeg: [0.0523, 0.2941, -0.0023], RightLeg: [-0.0523, 0.2941, 0.0015],
};

let loader;
const cache = {};
function loadGear(id) {
  if (!(id in cache)) {
    if (!loader) { loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder); }
    cache[id] = loader.loadAsync(`/models/gear/${id}.glb`).then((g) => g.scene).catch((e) => {
      console.warn('[wear] no model for', id, e);
      return null;
    });
  }
  return cache[id];
}

const key = (n) => n.replace(/^mixamorig:?/, '').replace(/[^A-Za-z0-9]/g, '');

// Everything about the hero that fitting needs, captured once while he is in his bind pose.
export class Wardrobe {
  constructor(model, skinned) {
    this.model = model;
    this.skinned = skinned;
    this.worn = {}; // slot -> { id, meshes }
    this.want = {}; // slot -> id (latest request; loads can finish out of order)
    const bones = skinned.skeleton.bones;
    this.boneIndex = new Map(bones.map((b, i) => [key(b.name), i]));
    model.updateMatrixWorld(true);
    const toModel = model.matrixWorld.clone().invert();
    // joints in model space
    this.joints = {};
    for (const n of Object.keys(REF)) {
      const i = this.boneIndex.get(n);
      if (i !== undefined) this.joints[n] = bones[i].getWorldPosition(new THREE.Vector3()).applyMatrix4(toModel);
    }
    // model space -> the hero geometry's own (bind) space, where his skin data lives
    const K = toModel.clone().multiply(bones[0].matrixWorld).multiply(skinned.skeleton.boneInverses[0]);
    this.toGeom = K.multiply(skinned.bindMatrix).invert();
    // map from gear-file space to model space
    const names = Object.keys(this.joints);
    const cg = new THREE.Vector3(), ch = new THREE.Vector3();
    for (const n of names) { cg.add(new THREE.Vector3(...REF[n])); ch.add(this.joints[n]); }
    cg.divideScalar(names.length); ch.divideScalar(names.length);
    let num = 0, den = 0;
    for (const n of names) {
      const g = new THREE.Vector3(...REF[n]).sub(cg), h = this.joints[n].clone().sub(ch);
      num += g.dot(h); den += g.lengthSq();
    }
    const s = num / den;
    this.fromGear = new THREE.Matrix4().makeTranslation(ch.x - s * cg.x, ch.y - s * cg.y, ch.z - s * cg.z)
      .multiply(new THREE.Matrix4().makeScale(s, s, s));
    this.grid = null;
  }

  // Spatial hash of the hero's vertices, for nearest-vertex weight lookups.
  buildGrid() {
    const g = this.skinned.geometry;
    const pos = g.attributes.position;
    g.computeBoundingBox();
    const size = g.boundingBox.getSize(new THREE.Vector3());
    this.cell = Math.max(size.x, size.y, size.z) / 48;
    const grid = new Map();
    for (let i = 0; i < pos.count; i++) {
      const k = this.cellKey(pos.getX(i), pos.getY(i), pos.getZ(i));
      let a = grid.get(k);
      if (!a) grid.set(k, (a = []));
      a.push(i);
    }
    this.grid = grid;
  }

  cellKey(x, y, z) {
    const c = this.cell;
    return `${Math.floor(x / c)},${Math.floor(y / c)},${Math.floor(z / c)}`;
  }

  // Inverse-distance blend of the skin weights of the k nearest hero vertices.
  weightsAt(p, k = 4) {
    if (!this.grid) this.buildGrid();
    const g = this.skinned.geometry;
    const pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    const c = this.cell;
    const cx = Math.floor(p.x / c), cy = Math.floor(p.y / c), cz = Math.floor(p.z / c);
    let best = [];
    for (let r = 1; r <= 6 && best.length < k; r++) {
      best = [];
      for (let x = cx - r; x <= cx + r; x++) for (let y = cy - r; y <= cy + r; y++) for (let z = cz - r; z <= cz + r; z++) {
        const a = this.grid.get(`${x},${y},${z}`);
        if (!a) continue;
        for (const i of a) {
          const dx = pos.getX(i) - p.x, dy = pos.getY(i) - p.y, dz = pos.getZ(i) - p.z;
          best.push([dx * dx + dy * dy + dz * dz, i]);
        }
      }
    }
    best.sort((a, b) => a[0] - b[0]);
    best = best.slice(0, k);
    const acc = new Map();
    for (const [d2, i] of best) {
      const w = 1 / (Math.sqrt(d2) + c * 0.05);
      for (let j = 0; j < 4; j++) {
        const bw = sw.getComponent(i, j);
        if (bw > 0) { const b = si.getComponent(i, j); acc.set(b, (acc.get(b) || 0) + bw * w); }
      }
    }
    const top = [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const sum = top.reduce((t, e) => t + e[1], 0) || 1;
    while (top.length < 4) top.push([0, 0]);
    return top.map(([b, w]) => [b, w / sum]);
  }

  // Turn one gear GLB scene into SkinnedMeshes on the hero's skeleton.
  fit(scene) {
    scene.updateMatrixWorld(true);
    const out = [];
    const toGeom = this.toGeom.clone().multiply(this.fromGear);
    scene.traverse((o) => {
      if (!o.isMesh) return;
      // a "__Bone" suffix on the node or a parent pins the mesh to that bone
      let rigid = null;
      for (let n = o; n && !rigid; n = n.parent) {
        const m = /__([A-Za-z0-9]+)$/.exec(n.name || '');
        if (m && this.boneIndex.has(m[1])) rigid = this.boneIndex.get(m[1]);
      }
      const geo = o.geometry.clone();
      // quantized files (meshopt / KHR_mesh_quantization) store ints; transforms need plain floats
      for (const n of ['position', 'normal']) {
        const a = geo.attributes[n];
        if (a && !(a.array instanceof Float32Array && !a.normalized && !a.isInterleavedBufferAttribute)) {
          const f = new Float32Array(a.count * 3);
          for (let i = 0; i < a.count; i++) { f[i * 3] = a.getX(i); f[i * 3 + 1] = a.getY(i); f[i * 3 + 2] = a.getZ(i); }
          geo.setAttribute(n, new THREE.BufferAttribute(f, 3));
        }
      }
      geo.deleteAttribute('skinIndex'); geo.deleteAttribute('skinWeight');
      const M = toGeom.clone().multiply(o.matrixWorld);
      geo.applyMatrix4(M);
      geo.computeBoundingSphere();
      const pos = geo.attributes.position;
      const idx = new Uint16Array(pos.count * 4), wts = new Float32Array(pos.count * 4);
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        if (rigid !== null) { idx[i * 4] = rigid; wts[i * 4] = 1; continue; }
        const w = this.weightsAt(v.fromBufferAttribute(pos, i));
        for (let j = 0; j < 4; j++) { idx[i * 4 + j] = w[j][0]; wts[i * 4 + j] = w[j][1]; }
      }
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
      geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wts, 4));
      const mesh = new THREE.SkinnedMesh(geo, o.material);
      mesh.name = o.name;
      mesh.castShadow = this.skinned.castShadow;
      mesh.receiveShadow = this.skinned.receiveShadow;
      mesh.frustumCulled = false;
      mesh.bind(this.skinned.skeleton, this.skinned.bindMatrix);
      out.push(mesh);
    });
    return out;
  }

  // Show item `id` in `slot` (null/unknown id takes the slot off).
  async wear(slot, id) {
    const want = id && WEARABLES.has(id) ? id : null;
    this.want[slot] = want;
    const cur = this.worn[slot];
    if ((cur ? cur.id : null) === want) return;
    const scene = want ? await loadGear(want) : null;
    if (this.want[slot] !== want) return; // a newer request superseded this one
    const old = this.worn[slot];
    if (old) for (const m of old.meshes) { m.removeFromParent(); m.geometry.dispose(); }
    delete this.worn[slot];
    if (!scene) return;
    const meshes = this.fit(scene);
    // siblings of the hero's skin, so they share his transform chain
    for (const m of meshes) this.skinned.parent.add(m);
    this.worn[slot] = { id: want, meshes };
  }

  wearAll(ids) {
    for (const slot of ['armor', 'helm', 'offhand', 'trinket']) this.wear(slot, ids[slot] || null);
  }
}
