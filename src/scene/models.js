// Placeholder 3D models built from primitives, softly lit (no outlines or toon bands).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { buildFlames } from './fire.js';
import { groundMaterial, rockMaterial, boulderGeometry } from './terrain.js';

// ---------- Imported props (zack's models) ----------
const PROPS = {};
// Loads held-item models. Until they arrive, the primitive stand-ins below are used.
export async function loadProps() {
  const g = await new GLTFLoader().loadAsync('/models/club.glb');
  PROPS.club = normalizeHeld(g.scene, 0.82);
}

// ---------- Base buildings (zack's models) ----------
// public/models/base/<file>-t<tier>.glb, meshopt + webp, ~1 unit across with the base at y=0.
// A tier without its own model uses the best lower tier's model, a bit bigger, until that art arrives.
const BASE_FILE = { studio: 'workshop', altar: 'altar', inventory: 'inventory', shrine: 'shrine', truth: 'truth' };
const BASE_SCALE = { studio: 2.1, altar: 2.4, inventory: 1.7, shrine: 2.0, truth: 2.1 }; // world size of the tier-1 model
const baseCache = {};
let gltf;
function loadBaseFile(id, tier) {
  const key = `${BASE_FILE[id]}-t${tier}`;
  if (!(key in baseCache)) {
    if (!gltf) { gltf = new GLTFLoader(); gltf.setMeshoptDecoder(MeshoptDecoder); }
    baseCache[key] = gltf.loadAsync(`/models/base/${key}.glb`).then((g) => {
      g.scene.traverse((o) => {
        if (!o.isMesh) return;
        const m = o.material;
        if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
        m.roughness = 0.9; m.metalness = 0;
      });
      return g.scene;
    }).catch(() => null);
  }
  return baseCache[key];
}
export async function loadBuildingModel(id, tier) {
  for (let t = tier; t >= 1; t--) {
    const scene = await loadBaseFile(id, t);
    if (scene) {
      const m = scene.clone();
      m.scale.setScalar((BASE_SCALE[id] || 2) * (1 + (tier - t) * 0.15));
      return m;
    }
  }
  return null;
}

// Re-seat a held model so its thin (handle) end is at the origin and it points along +Y, `length` long.
function normalizeHeld(scene, length) {
  scene.updateMatrixWorld(true);
  const pts = [];
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const a = o.geometry.attributes.position;
    for (let i = 0; i < a.count; i += 3) pts.push(new THREE.Vector3().fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld));
    const map = o.material.map;
    if (map) map.colorSpace = THREE.SRGBColorSpace;
    o.material = new THREE.MeshStandardMaterial({ map, color: map ? 0xffffff : C.wood, roughness: 0.9 });
  });
  const c = pts.reduce((m, p) => m.add(p), new THREE.Vector3()).divideScalar(pts.length);
  const far = (from) => pts.reduce((best, p) => (p.distanceToSquared(from) > best.distanceToSquared(from) ? p : best), pts[0]);
  let a = far(c), b = far(a);
  const axis = b.clone().sub(a);
  const len = axis.length();
  axis.normalize();
  // which end is thinner? compare average distance from the axis near each end
  const girth = (lo, hi) => {
    let sum = 0, n = 0;
    for (const p of pts) {
      const d = p.clone().sub(a), t = d.dot(axis) / len;
      if (t >= lo && t <= hi) { sum += d.addScaledVector(axis, -d.dot(axis)).length(); n++; }
    }
    return n ? sum / n : 0;
  };
  if (girth(0, 0.2) > girth(0.8, 1)) { [a, b] = [b, a]; axis.negate(); }
  const k = length / len;
  const inner = new THREE.Group();
  inner.add(scene);
  inner.quaternion.setFromUnitVectors(axis, new THREE.Vector3(0, 1, 0));
  inner.scale.setScalar(k);
  inner.position.copy(a).applyQuaternion(inner.quaternion).multiplyScalar(-k);
  const out = new THREE.Group();
  out.add(inner);
  return out;
}

// A club held in the fist: grip a little up from the butt, pointing out past the thumb.
function heldClub(extra) {
  const g = new THREE.Group();
  const club = PROPS.club.clone();
  club.position.y = -0.1;
  g.add(club);
  if (extra) extra(g);
  // Tipped toward the fingers and rolled outward around the forearm: it hangs head-down at his side
  // in idle and still reads as a club through the swing.
  g.rotation.x = Math.PI / 2 + 0.8;
  const w = new THREE.Group();
  w.rotation.y = -1.0;
  w.add(g);
  return w;
}

const matCache = new Map();
export function toon(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!opts.unique && matCache.has(key)) return matCache.get(key);
  const { unique, ...rest } = opts;
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...rest });
  if (!opts.unique) matCache.set(key, m);
  return m;
}

// Ink outlines were part of the retired comic look; kept as a no-op so callers stay simple.
export function ink(mesh) { return mesh; }

export function part(geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = null, outline = 0.05, matOpts) {
  const m = new THREE.Mesh(geo, toon(color, matOpts));
  m.position.set(...pos);
  m.rotation.set(...rot);
  if (scale) m.scale.set(...scale);
  if (outline) ink(m, outline);
  return m;
}

const G = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  sph: (r, ws = 16, hs = 12) => new THREE.SphereGeometry(r, ws, hs),
  cyl: (rt, rb, h, s = 10) => new THREE.CylinderGeometry(rt, rb, h, s),
  cone: (r, h, s = 10) => new THREE.ConeGeometry(r, h, s),
  cap: (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10),
};

const C = {
  skin: 0xb07a52, hair: 0x2a1a12, pants: 0x3d2f26, stubble: 0x5a3b28,
  wood: 0x7a4a26, flint: 0x8995a8, bone: 0xeee3c8, hide: 0x8a5a32, fur: 0x6d6a66,
};

// ---------- Hero ----------
export function buildHero() {
  const g = new THREE.Group();
  g.name = 'hero';
  const body = new THREE.Group();
  g.add(body);
  const legL = part(G.cap(0.13, 0.55), C.pants, [-0.15, 0.42, 0]);
  const legR = part(G.cap(0.13, 0.55), C.pants, [0.15, 0.42, 0]);
  const torso = part(G.cap(0.3, 0.45), C.skin, [0, 1.12, 0], [0, 0, 0], [1, 1, 0.75]);
  const belt = part(G.cyl(0.31, 0.31, 0.1, 12), 0x2b1d14, [0, 0.86, 0], [0, 0, 0], [1, 1, 0.78], 0.03);
  const head = part(G.sph(0.25), C.skin, [0, 1.72, 0]);
  const stubble = part(G.sph(0.2, 12, 8), C.stubble, [0, 1.62, 0.08], [0, 0, 0], [0.95, 0.42, 0.85], 0);
  const hairTop = part(G.sph(0.27, 14, 10), C.hair, [0, 1.79, -0.04], [0, 0, 0], [1, 0.75, 1.02], 0.04);
  const hairBack = part(G.box(0.5, 0.75, 0.16), C.hair, [0, 1.42, -0.2], [0.12, 0, 0], null, 0.04);
  const eyeL = part(G.sph(0.03, 6, 6), 0x111111, [-0.09, 1.75, 0.22], [0, 0, 0], null, 0);
  const eyeR = part(G.sph(0.03, 6, 6), 0x111111, [0.09, 1.75, 0.22], [0, 0, 0], null, 0);
  const armL = new THREE.Group(); armL.position.set(-0.4, 1.36, 0);
  armL.add(part(G.cap(0.1, 0.5), C.skin, [0, -0.32, 0]));
  const armR = new THREE.Group(); armR.position.set(0.4, 1.36, 0);
  armR.add(part(G.cap(0.1, 0.5), C.skin, [0, -0.32, 0]));
  armL.rotation.z = 0.15; armR.rotation.z = -0.15;
  body.add(legL, legR, torso, belt, head, stubble, hairTop, hairBack, eyeL, eyeR, armL, armR);
  const slots = {
    weapon: new THREE.Group(), armor: new THREE.Group(), helm: new THREE.Group(), offhand: new THREE.Group(), trinket: new THREE.Group(),
  };
  slots.weapon.position.set(0, -0.62, 0.05); armR.add(slots.weapon);
  slots.offhand.position.set(-0.08, -0.4, 0.05); armL.add(slots.offhand);
  body.add(slots.armor, slots.helm, slots.trinket);
  g.userData = { body, armL, armR, hairBack, slots, kind: 'hero' };
  setHeroLook(g, {});
  return g;
}

const LOOKS = {
  club1: () => (PROPS.club ? heldClub() : part(G.cyl(0.05, 0.09, 0.8), C.wood, [0, 0, 0.3], [Math.PI / 2.4, 0, 0])),
  club2: () => {
    // the starting club with a flint blade lashed into the head
    if (PROPS.club) return heldClub((g) => {
      g.add(part(G.cone(0.07, 0.24, 4), C.flint, [0.11, 0.6, 0], [0, 0, -Math.PI / 2], null, 0));
      g.add(part(G.cone(0.07, 0.24, 4), C.flint, [-0.11, 0.6, 0], [0, 0, Math.PI / 2], null, 0));
    }); const w = new THREE.Group(); w.add(part(G.cyl(0.05, 0.07, 0.8), C.wood, [0, 0, 0.3], [Math.PI / 2.4, 0, 0])); w.add(part(G.cone(0.13, 0.3, 4), C.flint, [0, 0.1, 0.66], [Math.PI / 2.4, 0, 0])); return w; },
  fang: () => part(G.cone(0.09, 0.9, 6), C.bone, [0, 0.05, 0.4], [Math.PI / 2.4, 0, 0]),
  tusk: () => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.08, 8, 16, Math.PI * 0.7), toon(0xfff3d6)); t.position.set(0, -0.35, 0.3); t.rotation.set(0, Math.PI / 2, 0.3); ink(t, 0.04); return t; },
  armor1: () => part(G.cap(0.33, 0.25), C.hide, [0, 1.12, 0], [0, 0, 0], [1, 0.9, 0.8]),
  armor2: () => { const a = new THREE.Group(); a.add(part(G.cap(0.33, 0.25), C.hide, [0, 1.12, 0], [0, 0, 0], [1, 0.9, 0.8])); for (let i = 0; i < 3; i++) a.add(part(G.box(0.5, 0.06, 0.1), C.bone, [0, 1.0 + i * 0.13, 0.25], [0, 0, 0], null, 0.02)); a.add(part(G.sph(0.14, 8, 6), C.bone, [-0.38, 1.42, 0], [0, 0, 0], [1, 0.6, 1])); a.add(part(G.sph(0.14, 8, 6), C.bone, [0.38, 1.42, 0], [0, 0, 0], [1, 0.6, 1])); return a; },
  armor3: () => { const a = new THREE.Group(); a.add(part(G.cap(0.34, 0.27), 0xd7882c, [0, 1.12, 0], [0, 0, 0], [1, 0.9, 0.82])); for (let i = 0; i < 4; i++) a.add(part(G.box(0.08, 0.36, 0.05), 0x2a1a10, [-0.21 + i * 0.14, 1.14, 0.27], [0, 0, 0], null, 0)); a.add(part(G.box(0.7, 0.9, 0.05), 0xd7882c, [0, 1.05, -0.3], [0.1, 0, 0], null, 0.03)); return a; },
  helm1: () => part(G.sph(0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), C.bone, [0, 1.8, 0], [0, 0, 0], [1, 0.8, 1]),
  helm2: () => { const h = new THREE.Group(); h.add(part(G.sph(0.28, 12, 8), C.bone, [0, 1.82, 0], [0, 0, 0], [1, 0.62, 1])); h.add(part(G.cone(0.06, 0.35, 6), C.bone, [-0.24, 2.0, 0], [0, 0, 0.6])); h.add(part(G.cone(0.06, 0.35, 6), C.bone, [0.24, 2.0, 0], [0, 0, -0.6])); return h; },
  shield1: () => part(G.cyl(0.28, 0.28, 0.06, 12), C.wood, [0, 0, 0.1], [Math.PI / 2, 0, 0]),
  shield2: () => { const s = new THREE.Group(); s.add(part(G.cyl(0.3, 0.3, 0.07, 6), C.flint, [0, 0, 0.1], [Math.PI / 2, 0, 0])); s.add(part(G.sph(0.08, 8, 6), C.bone, [0, 0, 0.16], [0, 0, 0], null, 0.02)); return s; },
  charm1: () => part(G.sph(0.05, 8, 6), 0xe9e2c8, [0, 1.47, 0.24], [0, 0, 0], null, 0.02),
  charm2: () => part(G.cone(0.05, 0.14, 6), 0xffffff, [0, 1.44, 0.25], [Math.PI, 0, 0], null, 0.02),
  charm3: () => part(G.sph(0.07, 10, 8), 0xffb300, [0, 1.45, 0.25], [0, 0, 0], null, 0.02, { emissive: 0x663300 }),
};

// looks: { weapon: 'club1', armor: 'armor2', ... }
export function setHeroLook(hero, looks) {
  const { slots } = hero.userData;
  // (the rigged hero puts an inner, rescaled group inside each slot)
  const into = (slot) => slots[slot].userData.inner || slots[slot];
  for (const slot of Object.keys(slots)) {
    const grp = into(slot);
    grp.clear();
    const k = looks[slot];
    if (k && LOOKS[k]) grp.add(LOOKS[k]());
  }
  // bare-handed: the starting club
  if (!looks.weapon) into('weapon').add(PROPS.club ? heldClub() : part(G.cyl(0.04, 0.06, 0.6), C.wood, [0, 0, 0.22], [Math.PI / 2.4, 0, 0]));
}

// ---------- Enemies ----------
function quadruped({ body, color, belly, head, legs = 0.5, scale = 1, extras }) {
  const g = new THREE.Group();
  const s = new THREE.Group();
  g.add(s);
  s.add(part(G.cap(body[1] / 2, body[0]), color, [0, legs + body[1] / 2, 0], [0, 0, Math.PI / 2]));
  if (belly) s.add(part(G.cap(body[1] / 2.4, body[0] * 0.8), belly, [0, legs + body[1] * 0.35, 0], [0, 0, Math.PI / 2], null, 0));
  const hx = body[0] / 2 + body[1] * 0.45;
  const hd = new THREE.Group();
  hd.position.set(hx, legs + body[1] * 0.75, 0);
  hd.add(part(G.sph(head, 12, 10), color, [0, 0, 0]));
  hd.add(part(G.sph(0.035 * scale + 0.02, 6, 6), 0xffe14d, [head * 0.55, head * 0.25, head * 0.5], [0, 0, 0], null, 0, { emissive: 0x996600 }));
  hd.add(part(G.sph(0.035 * scale + 0.02, 6, 6), 0xffe14d, [head * 0.55, head * 0.25, -head * 0.5], [0, 0, 0], null, 0, { emissive: 0x996600 }));
  s.add(hd);
  const lx = body[0] / 2 - 0.05;
  for (const [x, z] of [[lx, 0.18], [lx, -0.18], [-lx, 0.18], [-lx, -0.18]]) {
    s.add(part(G.cyl(0.07 * scale + 0.02, 0.06 * scale + 0.02, legs + 0.1), color, [x, legs / 2, z * scale * 1.2]));
  }
  if (extras) extras(s, hd, { hx, legs, body, head, scale });
  g.userData = { body: s, head: hd };
  return g;
}

// Wolf-shaped body reused for the pack (mangy, wolf, beta, alpha) and the hyenas.
function canine({ color, belly, dark, scale = 1, mane = null, slope = 0, spots = null }) {
  const g = quadruped({ body: [0.8, 0.42], color, belly, head: 0.22, legs: 0.42, extras: (s, hd, o) => {
    hd.add(part(G.box(0.3, 0.13, 0.16), color, [0.24, -0.06, 0]));
    hd.add(part(G.cone(0.07, 0.18, 4), dark, [0, 0.22, 0.1]));
    hd.add(part(G.cone(0.07, 0.18, 4), dark, [0, 0.22, -0.1]));
    s.add(part(G.cone(0.09, 0.55, 6), color, [-0.68, o.legs + 0.3, 0], [0, 0, 2.1]));
    if (mane) s.add(part(G.sph(0.3, 10, 8), mane, [0.3, o.legs + 0.42, 0], [0, 0, 0], [1, 1.1, 1.2]));
    if (spots) for (let i = 0; i < 6; i++) s.add(part(G.sph(0.07, 6, 5), spots, [-0.3 + (i % 3) * 0.25, o.legs + 0.5 + (i > 2 ? -0.08 : 0.06), i % 2 ? 0.19 : -0.19], [0, 0, 0], [1, 0.5, 0.3], 0));
  } });
  if (slope) g.userData.body.rotation.z = slope; // hyenas: high shoulders, low hips
  g.scale.setScalar(scale);
  return g;
}

export function buildEnemy(id) {
  let g;
  switch (id) {
    case 'mangy':
      g = canine({ color: 0x9a8f7e, belly: 0xb9ae9a, dark: 0x6b6152, scale: 0.85 });
      break;
    case 'beta':
      g = canine({ color: 0x5b5e68, belly: 0x8f929c, dark: 0x3a3c44, scale: 1.18, mane: 0x7a7d88 });
      break;
    case 'hyena':
      g = canine({ color: 0xa8865a, belly: 0xc9ad84, dark: 0x4a3622, scale: 0.98, slope: 0.16, spots: 0x3b2a18 });
      break;
    case 'lion':
      g = quadruped({ body: [1.0, 0.5], color: 0xb98a52, belly: 0xe0c49a, head: 0.25, legs: 0.48, scale: 1.2, extras: (s, hd, o) => {
        hd.add(part(G.box(0.22, 0.14, 0.18), 0xb98a52, [0.2, -0.07, 0]));
        hd.add(part(G.cone(0.06, 0.12, 4), 0x8a6338, [0, 0.24, 0.11]));
        hd.add(part(G.cone(0.06, 0.12, 4), 0x8a6338, [0, 0.24, -0.11]));
        s.add(part(G.cyl(0.05, 0.03, 0.85, 6), 0xb98a52, [-0.8, o.legs + 0.2, 0], [0, 0, 1.2]));
        s.add(part(G.sph(0.06, 6, 5), 0x3b2a18, [-1.15, o.legs + 0.05, 0]));
      } });
      g.scale.setScalar(1.3);
      break;
    case 'elk':
      g = quadruped({ body: [1.1, 0.7], color: 0x6e4a2c, belly: 0xa07a55, head: 0.24, legs: 0.85, scale: 1.4, extras: (s, hd, o) => {
        hd.add(part(G.box(0.36, 0.16, 0.16), 0x6e4a2c, [0.26, -0.1, 0]));
        s.add(part(G.cyl(0.12, 0.16, 0.5, 8), 0x6e4a2c, [o.hx - 0.2, o.legs + 0.6, 0], [0, 0, -0.6]));
        s.add(part(G.sph(0.22, 8, 6), 0xc9b48e, [0.35, o.legs + 0.55, 0], [0, 0, 0], [1, 1.2, 1.1]));
        for (const z of [0.12, -0.12]) {
          hd.add(part(G.cyl(0.025, 0.035, 0.6, 5), 0xe3d3b0, [-0.05, 0.38, z * 1.6], [z > 0 ? 0.5 : -0.5, 0, -0.3]));
          for (let i = 0; i < 3; i++) hd.add(part(G.cyl(0.018, 0.025, 0.28, 5), 0xe3d3b0, [-0.1 - i * 0.1, 0.5 + i * 0.12, z * (2.4 + i * 0.6)], [z > 0 ? 1.0 : -1.0, 0, 0.2]));
        }
      } });
      g.scale.setScalar(1.15);
      break;
    case 'rhino':
      g = quadruped({ body: [1.3, 1.05], color: 0x6d5a46, belly: 0x8a765f, head: 0.36, legs: 0.5, scale: 1.9, extras: (s, hd, o) => {
        hd.add(part(G.box(0.4, 0.3, 0.32), 0x6d5a46, [0.25, -0.08, 0]));
        hd.add(part(G.cone(0.1, 0.55, 8), 0xd9cdb4, [0.38, 0.22, 0], [0, 0, -0.35]));
        hd.add(part(G.cone(0.06, 0.25, 8), 0xd9cdb4, [0.12, 0.25, 0], [0, 0, -0.2]));
        s.add(part(G.sph(0.42, 10, 8), 0x4f3f30, [0.25, o.legs + 1.0, 0], [0, 0, 0], [1.2, 0.7, 1])); // woolly hump
      } });
      g.scale.setScalar(1.25);
      break;
    case 'wolf':
    case 'alpha': {
      const alpha = id === 'alpha';
      g = quadruped({ body: [0.8, 0.42], color: alpha ? 0x3a3d48 : 0x8c8f99, belly: alpha ? 0x5d6070 : 0xc7c9cf, head: 0.22, legs: 0.42, extras: (s, hd, o) => {
        hd.add(part(G.box(0.3, 0.13, 0.16), alpha ? 0x3a3d48 : 0x8c8f99, [0.24, -0.06, 0]));
        hd.add(part(G.cone(0.07, 0.18, 4), alpha ? 0x2a2c35 : 0x6d7078, [0, 0.22, 0.1]));
        hd.add(part(G.cone(0.07, 0.18, 4), alpha ? 0x2a2c35 : 0x6d7078, [0, 0.22, -0.1]));
        s.add(part(G.cone(0.09, 0.55, 6), alpha ? 0x3a3d48 : 0x8c8f99, [-0.68, o.legs + 0.3, 0], [0, 0, 2.1]));
        if (alpha) s.add(part(G.sph(0.3, 10, 8), 0xe8e8f0, [0.3, o.legs + 0.42, 0], [0, 0, 0], [1, 1.1, 1.2]));
      } });
      if (alpha) g.scale.setScalar(1.45);
      break;
    }
    case 'boar':
      g = quadruped({ body: [0.7, 0.62], color: 0x5c3a24, head: 0.27, legs: 0.3, extras: (s, hd) => {
        hd.add(part(G.cyl(0.11, 0.13, 0.16, 8), 0xc27a7a, [0.27, -0.04, 0], [0, 0, Math.PI / 2]));
        hd.add(part(G.cone(0.04, 0.22, 6), C.bone, [0.24, 0.03, 0.14], [0, 0, -0.9]));
        hd.add(part(G.cone(0.04, 0.22, 6), C.bone, [0.24, 0.03, -0.14], [0, 0, -0.9]));
        for (let i = 0; i < 4; i++) s.add(part(G.cone(0.05, 0.18, 4), 0x2b1a10, [-0.25 + i * 0.17, 0.95, 0], [0, 0, 0], null, 0));
      } });
      g.scale.setScalar(1.15);
      break;
    case 'bear':
      g = quadruped({ body: [0.9, 0.95], color: 0x4a2f1d, belly: 0x6b4a33, head: 0.36, legs: 0.42, scale: 1.7, extras: (s, hd) => {
        hd.add(part(G.sph(0.15, 8, 6), 0x7a5a3f, [0.3, -0.08, 0]));
        hd.add(part(G.sph(0.1, 8, 6), 0x4a2f1d, [0, 0.3, 0.2]));
        hd.add(part(G.sph(0.1, 8, 6), 0x4a2f1d, [0, 0.3, -0.2]));
      } });
      g.scale.setScalar(1.35);
      break;
    case 'sabre':
      g = quadruped({ body: [1.0, 0.55], color: 0xd08a3a, belly: 0xf1d7a8, head: 0.28, legs: 0.5, scale: 1.3, extras: (s, hd, o) => {
        hd.add(part(G.cone(0.035, 0.38, 6), 0xfffbe8, [0.16, -0.3, 0.09], [0, 0, 0.15 + Math.PI]));
        hd.add(part(G.cone(0.035, 0.38, 6), 0xfffbe8, [0.16, -0.3, -0.09], [0, 0, 0.15 + Math.PI]));
        hd.add(part(G.cone(0.08, 0.14, 4), 0xa8662a, [0, 0.27, 0.12]));
        hd.add(part(G.cone(0.08, 0.14, 4), 0xa8662a, [0, 0.27, -0.12]));
        for (let i = 0; i < 4; i++) s.add(part(G.box(0.05, 0.4, 0.62), 0x3b220e, [-0.3 + i * 0.22, o.legs + 0.3, 0], [0, 0, 0.2], null, 0));
        s.add(part(G.cone(0.07, 0.7, 6), 0xd08a3a, [-0.85, o.legs + 0.35, 0], [0, 0, 2.3]));
      } });
      g.scale.setScalar(1.4);
      break;
    case 'mammoth':
      g = quadruped({ body: [1.2, 1.6], color: 0x5e3b22, belly: 0x7a5232, head: 0.6, legs: 0.9, scale: 3, extras: (s, hd) => {
        hd.add(part(G.sph(0.5, 12, 8), 0x4a2d18, [-0.1, 0.4, 0], [0, 0, 0], [1, 0.8, 1]));
        const trunk = new THREE.Group();
        trunk.position.set(0.5, -0.2, 0);
        for (let i = 0; i < 5; i++) trunk.add(part(G.cyl(0.13 - i * 0.015, 0.15 - i * 0.015, 0.3, 8), 0x5e3b22, [0.08 * i, -0.25 * i, 0], [0, 0, 0.2 + i * 0.12], null, 0.03));
        hd.add(trunk);
        for (const z of [0.3, -0.3]) {
          const t = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.08, 8, 16, Math.PI * 0.8), toon(0xfff3d6));
          t.position.set(0.25, -0.75, z);
          t.rotation.set(0, 0, Math.PI * 0.75);
          ink(t, 0.04);
          hd.add(t);
        }
        hd.add(part(G.sph(0.35, 10, 8), 0x4a2d18, [-0.1, 0, 0.55], [0, 0, 0], [0.5, 1, 1]));
        hd.add(part(G.sph(0.35, 10, 8), 0x4a2d18, [-0.1, 0, -0.55], [0, 0, 0], [0.5, 1, 1]));
      } });
      g.scale.setScalar(1.3);
      break;
    case 'hunter': {
      g = buildHero();
      const u = g.userData;
      u.body.traverse((o) => {
        if (o.isMesh && !o.userData.isInk && o.material.color && o.material.color.getHex() === C.hair) o.material = toon(0x8a3b1e);
      });
      setHeroLook(g, { armor: 'armor1', helm: 'helm1' });
      u.slots.weapon.clear();
      u.slots.weapon.add(part(G.cyl(0.025, 0.03, 1.8), C.wood, [0, 0, 0.5], [Math.PI / 2.2, 0, 0], null, 0.03));
      u.slots.weapon.add(part(G.cone(0.06, 0.22, 4), C.flint, [0, 0.12, 1.4], [Math.PI / 2.2, 0, 0], null, 0.03));
      g.rotation.y = -Math.PI / 2;
      g.userData.kind = 'hunter';
      return g;
    }
    default:
      g = new THREE.Group();
  }
  // quadrupeds face +x by construction; face the hero (on the left)
  g.rotation.y = Math.PI;
  return g;
}

export function enemyHeight(id) {
  return { mangy: 1.0, wolf: 1.2, beta: 1.45, alpha: 1.8, hyena: 1.25, lion: 1.55, elk: 3.0, rhino: 2.4, boar: 1.3, hunter: 2.2, bear: 2.3, sabre: 1.9, mammoth: 4.3 }[id] || 1.5;
}

// ---------- Environment ----------
export function buildCave() {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 48), groundMaterial());
  ground.rotation.x = -Math.PI / 2;
  g.add(ground);
  // boulders around, textured with zack's rock wall (scene/terrain.js)
  const rng = mulberry(7);
  for (let i = 0; i < 26; i++) {
    const a = Math.PI * 0.9 + (i / 26) * Math.PI * 1.2 + rng() * 0.1;
    const r = 9 + rng() * 6;
    const s = 1.5 + rng() * 3.5;
    // keep the inner edge of every rock clear of the base plot
    const rr = Math.max(r, s + 9.5);
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    // behind-right stays low so the citadel and moon in the backdrop show over it (Home mockup)
    const low = x > 1 && z < 0 ? 0.45 : 1;
    const m = new THREE.Mesh(boulderGeometry(s, i + 1, 0.8), rockMaterial());
    m.position.set(x, s * 0.3 * low, z);
    m.rotation.set(rng() * 0.4 - 0.2, rng() * 6.28, rng() * 0.4 - 0.2);
    m.scale.setScalar(low);
    m.userData.ringRock = true;
    g.add(m);
  }
  // (distant mountains, moon and citadel are painted in the backdrop: scene/backdrop.js)
  return g;
}

// Trial dressing: tall cliffs behind-left (the citadel side stays open), a warm firelight off to the
// front-left and a red rim light from the moon behind the fighters.
export function buildTrialSet() {
  const g = new THREE.Group();
  const rng = mulberry(23);
  // only the left flank: the painted Trial backdrop (stage.js) is the far view, so nothing tall stands behind the fight
  const cliffs = [[-19, -9, 4.8, 1.7], [-21, -2, 4.2, 1.5]];
  cliffs.forEach(([x, z, s, tall], i) => {
    const m = new THREE.Mesh(boulderGeometry(s, 40 + i, tall), rockMaterial());
    m.position.set(x, s * tall * 0.55, z);
    m.rotation.y = rng() * 6.28;
    g.add(m);
  });
  const fire = new THREE.PointLight(0xffa860, 24, 18, 1.4);
  fire.position.set(-6, 1.4, 5);
  g.add(fire);
  const rim = new THREE.DirectionalLight(0xff6a48, 3.2);
  rim.position.set(5, 1.6, -9);
  g.add(rim);
  const fill = new THREE.PointLight(0xffc08a, 8, 12, 1.6);
  fill.position.set(3, 2.2, 4);
  g.add(fill);
  return g;
}

export function buildFire() {
  const g = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(part(new THREE.DodecahedronGeometry(0.16, 0), 0x6d6d70, [Math.cos(a) * 0.45, 0.08, Math.sin(a) * 0.45], [i, i, i], null, 0.03));
  }
  g.add(part(G.cyl(0.05, 0.05, 0.8, 6), C.wood, [0, 0.12, 0], [0, 0, Math.PI / 2], null, 0.03));
  g.add(part(G.cyl(0.05, 0.05, 0.8, 6), C.wood, [0, 0.12, 0], [Math.PI / 2, 0, Math.PI / 2], null, 0.03));
  const flames = buildFlames();
  flames.position.y = 0.1;
  g.add(flames);
  const light = new THREE.PointLight(0xff8a3d, 12, 9, 1.6);
  light.position.y = 0.9;
  g.add(light);
  g.userData = { flames, light };
  return g;
}

// ---------- Base buildings ----------
const BCOL = { studio: 0x8a6a4a, altar: 0x7f7f86, inventory: 0x9a7444, shrine: 0x6a5a8a, truth: 0x6b4a2a };

export function buildBuilding(id, tier) {
  const g = new THREE.Group();
  if (tier <= 0) {
    // scaffold ghost
    const m = new THREE.Mesh(G.box(1.6, 1.4, 1.6), new THREE.MeshBasicMaterial({ color: 0xc9a24c, wireframe: true, transparent: true, opacity: 0.4 }));
    m.position.y = 0.7;
    g.add(m);
    g.add(part(G.cyl(0.9, 0.9, 0.08, 16), 0x3a2d24, [0, 0.04, 0], [0, 0, 0], null, 0.03));
    return g;
  }
  const s = 0.8 + tier * 0.18;
  const col = BCOL[id];
  switch (id) {
    case 'studio':
      g.add(part(G.cyl(0.9 * s, 1.0 * s, 0.9 * s, 8), col, [0, 0.45 * s, 0]));
      g.add(part(G.cone(1.2 * s, 0.9 * s, 8), 0xb38b4f, [0, 1.3 * s, 0]));
      g.add(part(G.box(0.5, 0.35, 0.35), C.flint, [1.1 * s, 0.18, 0.3]));
      if (tier >= 2) g.add(part(G.cyl(0.05, 0.05, 1.1, 6), C.wood, [-1.0 * s, 0.6, 0.2], [0, 0, 0.3]));
      if (tier >= 3) g.add(part(G.sph(0.25, 8, 6), 0xff8a3d, [1.1 * s, 0.55, 0.3], [0, 0, 0], null, 0.03, { emissive: 0x662200 }));
      break;
    case 'altar':
      g.add(part(G.box(1.4 * s, 0.35, 0.9 * s), col, [0, 0.18, 0]));
      g.add(part(G.box(0.45 * s, 1.8 * s, 0.35 * s), 0x9a9aa3, [0, 0.35 + 0.9 * s, 0]));
      if (tier >= 2) g.add(part(G.box(0.3, 1.1 * s, 0.25), 0x9a9aa3, [-0.6 * s, 0.35 + 0.55 * s, 0]), part(G.box(0.3, 1.1 * s, 0.25), 0x9a9aa3, [0.6 * s, 0.35 + 0.55 * s, 0]));
      if (tier >= 3) g.add(part(G.box(1.6 * s, 0.25, 0.35), 0x9a9aa3, [0, 0.35 + 1.15 * s, 0]));
      g.add(part(G.sph(0.12, 8, 6), 0xe3c47e, [0, 0.35 + 1.4 * s, 0.2 * s], [0, 0, 0], null, 0.02, { emissive: 0x5a4210 }));
      break;
    case 'inventory':
      g.add(part(G.cyl(0.7 * s, 0.55 * s, 0.9 * s, 10), col, [0, 0.45 * s, 0]));
      g.add(part(G.cyl(0.74 * s, 0.74 * s, 0.1, 10), 0x6a4a2a, [0, 0.9 * s, 0]));
      for (let i = 0; i < tier; i++) g.add(part(G.cyl(0.35, 0.3, 0.5, 8), col, [1.0 * s, 0.25 + i * 0.5, -0.2]));
      break;
    case 'shrine':
      g.add(part(G.cyl(0.12, 0.14, 2.2 * s, 6), 0xa83a2a, [-0.7 * s, 1.1 * s, 0]));
      g.add(part(G.cyl(0.12, 0.14, 2.2 * s, 6), 0xa83a2a, [0.7 * s, 1.1 * s, 0]));
      g.add(part(G.box(2.0 * s, 0.18, 0.3), 0xa83a2a, [0, 2.15 * s, 0]));
      if (tier >= 2) g.add(part(G.box(1.7 * s, 0.12, 0.25), 0xa83a2a, [0, 1.8 * s, 0]));
      g.add(part(new THREE.OctahedronGeometry(0.25 + 0.06 * tier, 0), 0xd0352a, [0, 1.0 * s, 0], [0, 0, 0], null, 0.03, { emissive: 0x5a0d08 }));
      break;
    case 'truth':
      g.add(part(G.cyl(0.06, 0.06, 1.6 * s, 6), C.wood, [-0.75 * s, 0.8 * s, 0]));
      g.add(part(G.cyl(0.06, 0.06, 1.6 * s, 6), C.wood, [0.75 * s, 0.8 * s, 0]));
      g.add(part(G.box(1.7 * s, 1.1 * s, 0.08), 0xc9a876, [0, 1.15 * s, 0]));
      for (let i = 0; i < 2 + tier * 2; i++) g.add(part(G.box(0.22, 0.28, 0.02), 0xf2efe4, [-0.6 * s + (i % 4) * 0.38 * s, 1.4 * s - Math.floor(i / 4) * 0.4 * s, 0.06], [0, 0, (i % 3 - 1) * 0.15], null, 0.01));
      g.add(part(G.box(1.2 * s, 0.02, 0.02), 0xe0202a, [0, 1.2 * s, 0.08], [0, 0, 0.35], null, 0));
      break;
  }
  return g;
}

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
