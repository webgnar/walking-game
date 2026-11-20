// Placeholder 3D models built from primitives, in a cel-shaded comic style.
import * as THREE from 'three';
import { buildFlames } from './fire.js';

let gradient;
function toonGradient() {
  if (gradient) return gradient;
  const data = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]);
  gradient = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  return gradient;
}

const matCache = new Map();
export function toon(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!opts.unique && matCache.has(key)) return matCache.get(key);
  const { unique, ...rest } = opts;
  const m = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), ...rest });
  if (!opts.unique) matCache.set(key, m);
  return m;
}

const INK = new THREE.MeshBasicMaterial({ color: 0x0b0b10, side: THREE.BackSide });

// Adds an ink outline (inverted hull) to a mesh.
export function ink(mesh, t = 0.06) {
  const o = new THREE.Mesh(mesh.geometry, INK);
  mesh.geometry.computeBoundingSphere();
  const r = mesh.geometry.boundingSphere.radius || 1;
  const s = 1 + t / r;
  o.scale.setScalar(s);
  o.position.copy(mesh.geometry.boundingSphere.center).multiplyScalar(1 - s);
  o.userData.isInk = true;
  o.raycast = () => {};
  mesh.add(o);
  return mesh;
}

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
  club1: () => part(G.cyl(0.05, 0.09, 0.8), C.wood, [0, 0, 0.3], [Math.PI / 2.4, 0, 0]),
  club2: () => { const w = new THREE.Group(); w.add(part(G.cyl(0.05, 0.07, 0.8), C.wood, [0, 0, 0.3], [Math.PI / 2.4, 0, 0])); w.add(part(G.cone(0.13, 0.3, 4), C.flint, [0, 0.1, 0.66], [Math.PI / 2.4, 0, 0])); return w; },
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
  for (const [slot, grp] of Object.entries(slots)) {
    grp.clear();
    const k = looks[slot];
    if (k && LOOKS[k]) grp.add(LOOKS[k]());
  }
  // bare-handed: a simple stick
  if (!looks.weapon) slots.weapon.add(part(G.cyl(0.04, 0.06, 0.6), C.wood, [0, 0, 0.22], [Math.PI / 2.4, 0, 0]));
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

export function buildEnemy(id) {
  let g;
  switch (id) {
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
  return { wolf: 1.2, alpha: 1.8, boar: 1.3, hunter: 2.2, bear: 2.3, sabre: 1.9, mammoth: 4.3 }[id] || 1.5;
}

// ---------- Environment ----------
export function buildCave() {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 40), toon(0x5b4636));
  ground.rotation.x = -Math.PI / 2;
  g.add(ground);
  // rocks around
  const rng = mulberry(7);
  for (let i = 0; i < 26; i++) {
    const a = Math.PI * 0.9 + (i / 26) * Math.PI * 1.2 + rng() * 0.1;
    const r = 9 + rng() * 6;
    const s = 1.5 + rng() * 3.5;
    // keep the inner edge of every rock clear of the base plot
    const rr = Math.max(r, s + 9.5);
    const m = part(new THREE.DodecahedronGeometry(s, 0), i % 3 ? 0x40342e : 0x4b3d34, [Math.cos(a) * rr, s * 0.4, Math.sin(a) * rr], [rng() * 3, rng() * 3, rng() * 3], null, 0.1);
    g.add(m);
  }
  // distant mountains
  for (let i = 0; i < 7; i++) {
    const m = part(G.cone(5 + rng() * 5, 8 + rng() * 8, 5), 0x3a2a3e, [-25 + i * 9, 3, -26 - rng() * 4], [0, rng(), 0], null, 0.15);
    g.add(m);
  }
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
    const m = new THREE.Mesh(G.box(1.6, 1.4, 1.6), new THREE.MeshBasicMaterial({ color: 0x20f0ff, wireframe: true, transparent: true, opacity: 0.45 }));
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
      g.add(part(G.sph(0.12, 8, 6), 0x20f0ff, [0, 0.35 + 1.4 * s, 0.2 * s], [0, 0, 0], null, 0.02, { emissive: 0x0a6a70 }));
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
      g.add(part(new THREE.OctahedronGeometry(0.25 + 0.06 * tier, 0), 0xff2bd6, [0, 1.0 * s, 0], [0, 0, 0], null, 0.03, { emissive: 0x6a0a5a }));
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
