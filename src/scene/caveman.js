// The rigged caveman hero (Mixamo-style skeleton, FBX). Loads the mesh, gives it the comic toon look
// with a skinned ink outline, and plays animation clips when they exist. Until clips are added the
// bones are posed by hand (relaxed arms, breathing, club swing) so he never stands in a T-pose.
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { toonGradient } from './models.js';

const URL = '/models/caveman.fbx';
// Animation clips, one file each: public/models/anims/<name>.fbx (missing files are skipped).
export const CLIP_NAMES = ['idle', 'walk', 'attack', 'hurt', 'death', 'roar', 'victory'];
const HEIGHT = 1.9; // world units, matches the old placeholder hero
const INK_WORLD = 0.018; // outline thickness in world units

const loader = new FBXLoader();
const loadFBX = (url) => new Promise((res, rej) => loader.load(url, res, undefined, rej));

// Skip a clip file that isn't there (dev servers and hosts may answer a missing file with index.html).
async function exists(url) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return r.ok && !(r.headers.get('content-type') || '').includes('text/html');
  } catch { return false; }
}

function inkMaterial(thickness) {
  const m = new THREE.MeshBasicMaterial({ color: 0x0b0b10, side: THREE.BackSide });
  m.onBeforeCompile = (s) => {
    s.uniforms.uInk = { value: thickness };
    s.vertexShader = 'uniform float uInk;\n' + s.vertexShader.replace(
      '#include <skinning_vertex>',
      '#include <skinning_vertex>\n  transformed += normalize(objectNormal) * uInk;',
    );
  };
  return m;
}

export async function loadCaveman() {
  const fbx = await loadFBX(URL);
  // The rig is authored Z-up in centimetres. Stand it up and scale it to hero size.
  const model = new THREE.Group();
  model.name = 'caveman';
  const pivot = new THREE.Group();
  pivot.add(fbx);
  model.add(pivot);
  fbx.animations = [];
  let skinned;
  fbx.traverse((o) => { if (o.isSkinnedMesh) skinned = o; });
  // snap the bones to the skin's bind pose (the file's node transforms don't match it)
  fbx.updateMatrixWorld(true);
  skinned.skeleton.pose();
  fbx.updateMatrixWorld(true);
  const bone = (n) => fbx.getObjectByName('mixamorig' + n);
  const wpos = (n) => bone(n).getWorldPosition(new THREE.Vector3());
  // (only skinned bones are trustworthy here; the *_End helper bones keep stale transforms)
  const up = wpos('Head').sub(wpos('Hips'));
  const zUp = Math.abs(up.z) > Math.abs(up.y);
  if (zUp) pivot.rotation.x = -Math.PI / 2;
  skinned.geometry.computeBoundingBox();
  const bb = skinned.geometry.boundingBox;
  const s = HEIGHT / (bb.max.y - bb.min.y);
  pivot.scale.setScalar(s);
  model.updateMatrixWorld(true);
  // feet on the ground, centred over the hips
  const hips = wpos('Hips');
  const box = new THREE.Box3().setFromObject(skinned);
  pivot.position.set(-hips.x, -box.min.y, -hips.z);
  // face the camera (+Z): the character's left hand should be on +X
  model.updateMatrixWorld(true);
  if (wpos('LeftHand').x < wpos('RightHand').x) model.rotation.y = Math.PI;

  const old = skinned.material;
  const map = old.map || null;
  if (map) {
    map.colorSpace = THREE.SRGBColorSpace;
    // the embedded texture decodes a moment after the model; wait so he never shows up black
    for (let i = 0; i < 60 && !(map.image && (map.image.complete ?? true) && map.image.width); i++) await new Promise((r) => setTimeout(r, 50));
    map.needsUpdate = true;
  }
  skinned.material = new THREE.MeshToonMaterial({ color: map ? 0xffffff : 0xb07a52, map, gradientMap: toonGradient() });
  old.dispose();
  // outline: a second skinned mesh on the same skeleton, pushed out along normals
  const wscale = skinned.getWorldScale(new THREE.Vector3()).x || s;
  const outline = new THREE.SkinnedMesh(skinned.geometry, inkMaterial(INK_WORLD / wscale));
  outline.bind(skinned.skeleton, skinned.bindMatrix);
  outline.position.copy(skinned.position);
  outline.quaternion.copy(skinned.quaternion);
  outline.scale.copy(skinned.scale);
  outline.userData.isInk = true;
  outline.raycast = () => {};
  skinned.parent.add(outline);
  skinned.frustumCulled = false;
  outline.frustumCulled = false;

  const rig = new Rig(model, fbx, bone);
  rig.loadClips(); // fire and forget
  return rig;
}

class Rig {
  constructor(model, fbx, bone) {
    this.model = model;
    this.fbx = fbx;
    this.bone = bone;
    this.mixer = new THREE.AnimationMixer(fbx);
    this.clips = {};
    this.action = null;
    this.swingT = -1;
    this.dead = false;
    // remember the bind pose so the hand-made pose can be layered on top of it each frame
    this.bind = new Map();
    fbx.traverse((o) => { if (o.isBone) this.bind.set(o, o.quaternion.clone()); });
    this.pose = this.buildPose();
  }

  async loadClips() {
    for (const name of CLIP_NAMES) {
      const url = `/models/anims/${name}.fbx`;
      if (!(await exists(url))) continue;
      try {
        const f = await loadFBX(url);
        const clip = f.animations[0];
        if (!clip) continue;
        clip.name = name;
        // keep the hips in place horizontally so attacks/walks don't drift off their mark
        clip.tracks = clip.tracks.filter((t) => !/\.position$/.test(t.name) || /Hips/.test(t.name));
        for (const t of clip.tracks) {
          if (/Hips\.position$/.test(t.name)) {
            const v = t.values, x0 = v[0], z0 = v[2];
            for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
          }
        }
        this.clips[name] = clip;
      } catch (e) { console.warn('[caveman] clip failed', name, e); }
    }
    if (this.clips.idle && !this.action) this.play('idle');
  }

  has(name) { return !!this.clips[name]; }

  // Play a clip. One-shots return to idle (or hold the last frame for death).
  play(name, { once = name !== 'idle' && name !== 'walk', fade = 0.15 } = {}) {
    const clip = this.clips[name];
    if (!clip) return false;
    const a = this.mixer.clipAction(clip);
    a.reset();
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = once;
    if (this.action && this.action !== a) a.crossFadeFrom(this.action, fade, false);
    a.play();
    this.action = a;
    if (once && name !== 'death' && this.clips.idle) {
      const done = (e) => {
        if (e.action !== a) return;
        this.mixer.removeEventListener('finished', done);
        if (this.action === a) this.play('idle', { fade: 0.25 });
      };
      this.mixer.addEventListener('finished', done);
    }
    return true;
  }

  reset() {
    this.dead = false;
    this.swingT = -1;
    if (this.clips.idle) this.play('idle', { fade: 0 });
  }

  swing() {
    if (!this.play('attack')) this.swingT = 0;
  }

  // Hand-made rest pose relative to the bind (T) pose, expressed as world-space aims for limbs.
  buildPose() {
    const b = this.bone;
    this.fbx.updateMatrixWorld(true);
    const aim = (name, childName, dir) => {
      const bn = b(name), ch = b(childName);
      if (!bn || !ch) return null;
      const p = bn.getWorldPosition(new THREE.Vector3());
      const c = ch.getWorldPosition(new THREE.Vector3());
      const cur = c.sub(p).normalize();
      // dir is given in model space; turn it into world space
      const mq = this.model.getWorldQuaternion(new THREE.Quaternion());
      const want = dir.clone().normalize().applyQuaternion(mq);
      const dq = new THREE.Quaternion().setFromUnitVectors(cur, want);
      const parentQ = bn.parent.getWorldQuaternion(new THREE.Quaternion());
      const boneQ = bn.getWorldQuaternion(new THREE.Quaternion());
      const local = parentQ.clone().invert().multiply(dq).multiply(boneQ);
      bn.quaternion.copy(local);
      bn.updateMatrixWorld(true);
      return local.clone();
    };
    const out = new Map();
    const set = (n, q) => { if (q) out.set(b(n), q); };
    set('LeftArm', aim('LeftArm', 'LeftForeArm', new THREE.Vector3(0.35, -1, 0.05)));
    set('LeftForeArm', aim('LeftForeArm', 'LeftHand', new THREE.Vector3(0.15, -1, 0.45)));
    set('RightArm', aim('RightArm', 'RightForeArm', new THREE.Vector3(-0.35, -1, 0.05)));
    set('RightForeArm', aim('RightForeArm', 'RightHand', new THREE.Vector3(-0.15, -1, 0.5)));
    // put the bind pose back; the pose is applied per frame
    for (const [bn, q] of this.bind) bn.quaternion.copy(q);
    this.fbx.updateMatrixWorld(true);
    return out;
  }

  update(dt, t) {
    if (this.action) { this.mixer.update(dt); return; }
    // no clips yet: relaxed pose + breathing + optional club swing
    for (const [bn, q] of this.pose) bn.quaternion.copy(q);
    const spine = this.bone('Spine1');
    if (spine) {
      spine.quaternion.copy(this.bind.get(spine));
      spine.rotateX(Math.sin(t * 2) * 0.025);
    }
    if (this.swingT >= 0) {
      this.swingT += dt / 0.36;
      const k = Math.sin(Math.min(1, this.swingT) * Math.PI);
      const arm = this.bone('RightArm');
      const ax = new THREE.Vector3(1, 0, 0);
      // lift the arm forward/up in the parent frame, then chop down
      const q = new THREE.Quaternion().setFromAxisAngle(ax, -k * 2.0);
      const mq = this.model.getWorldQuaternion(new THREE.Quaternion());
      const pq = arm.parent.getWorldQuaternion(new THREE.Quaternion());
      // rotation about the model's X axis, expressed in the arm's parent frame
      const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(mq).applyQuaternion(pq.clone().invert());
      q.setFromAxisAngle(axis, -k * 2.0);
      arm.quaternion.premultiply(q);
      if (this.swingT >= 1) this.swingT = -1;
    }
  }

  // Attach gear slot groups to bones. Each slot's contents were modelled for the old placeholder body,
  // so `ref` is that body's attachment point; the slot is moved so ref lands on the real bone.
  attachSlots(slots) {
    const b = this.bone;
    const spec = {
      weapon: { bone: 'RightHand', down: true, k: 1 },
      offhand: { bone: 'LeftHand', down: true, k: 0.75 },
      // ref = the old body's point this gear was built around; off = where that sits relative to the bone
      helm: { bone: 'Head', ref: new THREE.Vector3(0, 1.72, 0), off: new THREE.Vector3(0, 0.15, 0.01), k: 0.66 },
      armor: { bone: 'Spine2', ref: new THREE.Vector3(0, 1.15, 0), off: new THREE.Vector3(0, -0.05, 0.0), k: 0.8 },
      trinket: { bone: 'Spine2', ref: new THREE.Vector3(0, 1.4, 0.2), off: new THREE.Vector3(0, 0.1, 0.12), k: 0.8 },
    };
    // pose the bones as they'll look at rest while attaching
    for (const [bn, q] of this.pose) bn.quaternion.copy(q);
    this.model.updateMatrixWorld(true);
    const inv = this.model.matrixWorld.clone().invert();
    for (const [slot, g] of Object.entries(slots)) {
      const sp = spec[slot];
      const bn = b(sp.bone);
      if (!bn) continue;
      const bp = bn.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv); // model space
      g.removeFromParent();
      g.position.set(0, 0, 0);
      g.quaternion.identity();
      g.scale.setScalar(1);
      // gear goes in an inner group that is scaled to the new body around its reference point
      let inner = g.userData.inner;
      if (!inner) {
        inner = new THREE.Group();
        for (const c of [...g.children]) inner.add(c);
        g.add(inner);
        g.userData.inner = inner;
      }
      inner.scale.setScalar(sp.k);
      inner.position.set(0, 0, 0);
      if (sp.down) {
        // weapons were built hanging from a straight-down arm; aim them along the real forearm
        const fa = b(sp.bone.replace('Hand', 'ForeArm')).getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
        const dir = bp.clone().sub(fa).normalize();
        g.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
        g.position.copy(bp);
      } else {
        g.position.copy(bp).add(sp.off);
        inner.position.copy(sp.ref).multiplyScalar(-sp.k);
      }
      this.model.add(g);
      bn.attach(g);
    }
    for (const [bn, q] of this.bind) bn.quaternion.copy(q);
    this.model.updateMatrixWorld(true);
  }

  headHeight() {
    this.model.updateMatrixWorld(true);
    const v = this.bone('Head').getWorldPosition(new THREE.Vector3());
    return this.model.worldToLocal(v).y + 0.22;
  }
}
