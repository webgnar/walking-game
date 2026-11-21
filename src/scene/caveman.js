// The rigged caveman hero (Mixamo-style skeleton, FBX). Loads the mesh, lights it softly
// and plays animation clips when they exist. Until clips are added the
// bones are posed by hand (relaxed arms, breathing, club swing) so he never stands in a T-pose.
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { Wardrobe } from './wear.js';

const URL = '/models/caveman.fbx';
// Animation clips, one file each: public/models/anims/<name>.fbx (missing files are skipped).
export const CLIP_NAMES = ['idle', 'walk', 'attack', 'throw', 'block', 'hurt', 'death', 'roar', 'victory', 'jumpattack'];
const HEIGHT = 1.9; // world units, matches the old placeholder hero

const loader = new FBXLoader();
const loadFBX = (url) => new Promise((res, rej) => loader.load(url, res, undefined, rej));

// Skip a clip file that isn't there (dev servers and hosts may answer a missing file with index.html).
async function exists(url) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return r.ok && !(r.headers.get('content-type') || '').includes('text/html');
  } catch { return false; }
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
  skinned.material = new THREE.MeshStandardMaterial({ color: map ? 0xffffff : 0xb07a52, map, roughness: 0.8 });
  old.dispose();
  skinned.frustumCulled = false;

  const rig = new Rig(model, fbx, bone, skinned);
  rig.loadClips(); // fire and forget
  return rig;
}

// Our rig is Z-up (Blender export). Straight Mixamo exports are Y-up, which shows up as the hips
// track sitting at y ~50 instead of z ~50; rotate those hips tracks into the Z-up frame.
// Then pin the hips horizontally so every clip plays on the spot.
const TO_ZUP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
function fixClip(clip) {
  clip.tracks = clip.tracks.filter((t) => !/\.(position|scale)$/.test(t.name) || /Hips\.position$/.test(t.name));
  const pos = clip.tracks.find((t) => /Hips\.position$/.test(t.name));
  const rot = clip.tracks.find((t) => /Hips\.quaternion$/.test(t.name));
  const yUp = pos && Math.abs(pos.values[1]) > Math.abs(pos.values[2]);
  if (yUp) {
    const v = new THREE.Vector3(), q = new THREE.Quaternion();
    for (let i = 0; i < pos.values.length; i += 3) {
      v.fromArray(pos.values, i).applyQuaternion(TO_ZUP).toArray(pos.values, i);
    }
    if (rot) for (let i = 0; i < rot.values.length; i += 4) {
      q.fromArray(rot.values, i).premultiply(TO_ZUP).toArray(rot.values, i);
    }
  }
  if (pos) {
    const v = pos.values, x0 = v[0], y0 = v[1];
    // keep the clip's travel (before pinning it) so a stage move can follow it: horizontal distance
    // from the first frame along the clip's main direction of travel
    let fx = 0, fy = 0;
    for (let i = 0; i < v.length; i += 3) if ((v[i] - x0) ** 2 + (v[i + 1] - y0) ** 2 > fx * fx + fy * fy) { fx = v[i] - x0; fy = v[i + 1] - y0; }
    const len = Math.hypot(fx, fy);
    if (len > 1e-6) clip.userData = { travelTimes: pos.times.slice(), travel: Array.from({ length: v.length / 3 }, (_, k) => ((v[k * 3] - x0) * fx + (v[k * 3 + 1] - y0) * fy) / len) };
    for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 1] = y0; }
  }
}

// Where each strike clip starts moving and where it connects (seconds into the clip), measured from
// the right hand's furthest-forward point.
const STRIKE = {
  attack: { from: 0.12, contact: 0.42 },
  throw: { from: 0.08, contact: 0.36 },
  // run, leap and two-handed smash (club meets the head about frame 51 of 111 at 30 fps); `from` skips the standing start
  jumpattack: { from: 0.35, contact: 1.66, speed: 1.35 },
};

// The clip's travel at time t (linear between keys).
function travelAt(clip, t) {
  const u = clip.userData, ts = u && u.travelTimes;
  if (!ts) return 0;
  if (t <= ts[0]) return u.travel[0];
  for (let i = 1; i < ts.length; i++) if (t <= ts[i]) {
    const k = (t - ts[i - 1]) / (ts[i] - ts[i - 1]);
    return u.travel[i - 1] + (u.travel[i] - u.travel[i - 1]) * k;
  }
  return u.travel[u.travel.length - 1];
}

class Rig {
  constructor(model, fbx, bone, skinned) {
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
    fbx.traverse((o) => { if (o.isBone) { this.bind.set(o, o.quaternion.clone()); o.userData.bindPos = o.position.clone(); } });
    this.pose = this.buildPose();
    // wearable gear is fitted against the bind pose, so set it up while the bones are still in it
    this.wardrobe = new Wardrobe(model, skinned);
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
        fixClip(clip);
        this.fitHips(clip);
        this.clips[name] = clip;
      } catch (e) { console.warn('[caveman] clip failed', name, e); }
    }
    if (this.clips.idle && !this.action) this.play('idle');
  }

  // A clip made on a different-sized Mixamo skeleton moves the hips in its own units (the jump
  // attack's skeleton is twice his size, so he'd sink into the ground and leap off the screen).
  // Scale its hips track to his size; the joint rotations already fit.
  fitHips(clip) {
    const pos = clip.tracks.find((t) => /Hips\.position$/.test(t.name));
    const hips = this.bone('Hips');
    if (!pos || !hips) return;
    const k = this.bind.get(hips) && hips.userData.bindPos ? hips.userData.bindPos.length() : 0;
    const c = new THREE.Vector3().fromArray(pos.values, 0).length();
    if (!k || !c) return;
    const r = k / c;
    if (Math.abs(r - 1) < 0.15) return;
    for (let i = 0; i < pos.values.length; i++) pos.values[i] *= r;
  }

  has(name) { return !!this.clips[name]; }

  // Play a clip. One-shots return to idle (or hold the last frame for death).
  play(name, { once = name !== 'idle' && name !== 'walk', fade = 0.15, from = 0, speed = 1 } = {}) {
    const clip = this.clips[name];
    if (!clip) return false;
    const a = this.mixer.clipAction(clip);
    a.reset();
    a.time = from;
    a.timeScale = speed;
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

  // Play a strike so its contact frame lands `contactMs` from now (the peak of the lunge):
  // skip the idle lead-in and speed the wind-up to fit.
  swing(clip = 'attack', contactMs = 0) {
    const k = STRIKE[clip];
    if (k && contactMs && this.clips[clip]) {
      this.play(clip, { from: k.from, speed: (k.contact - k.from) / (contactMs / 1000), fade: 0.05 });
      return;
    }
    if (!this.play(clip)) this.swingT = 0;
  }

  // Play a travelling strike (the jump attack). Returns real ms to the contact frame at normal speed.
  // The clip plays on the spot; follow its travel with travelled().
  leap(name = 'jumpattack') {
    const k = STRIKE[name];
    if (!this.play(name, { from: k.from, speed: k.speed, fade: 0.1 })) return 0;
    return ((k.contact - k.from) / k.speed) * 1000;
  }

  // How far the current travelling strike has carried him: 0 at its start, 1 at its contact frame
  // (a little more or less after it, as he stumbles out of the landing).
  travelled() {
    const a = this.action;
    if (!a) return 0;
    const clip = a.getClip(), k = STRIKE[clip.name];
    if (!k || !clip.userData || !clip.userData.travel) return 0;
    const d0 = travelAt(clip, k.from), d1 = travelAt(clip, k.contact);
    return d1 === d0 ? 0 : (travelAt(clip, a.time) - d0) / (d1 - d0);
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
        // Held gear was built for a fist on a straight-down arm: -Y runs along the forearm into the
        // fingers and +Z points out past the thumb. Build that frame from the hand's own finger and
        // thumb bones so the grip follows every animation.
        const side = sp.bone.replace('Hand', '');
        const fingers = b(side + 'HandIndex1').position.clone().normalize();
        const thumb = b(side + 'HandThumb1').position.clone();
        thumb.addScaledVector(fingers, -thumb.dot(fingers)).normalize();
        const ly = fingers.clone().negate(), lz = thumb, lx = ly.clone().cross(lz);
        bn.add(g);
        g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(lx, ly, lz));
        // undo the rig's centimetre scale so gear is sized in world units
        const rel = bn.getWorldScale(new THREE.Vector3()).x / this.model.getWorldScale(new THREE.Vector3()).x;
        g.scale.setScalar(1 / rel);
        // sit the grip in the palm, a little past the wrist
        g.position.copy(fingers).multiplyScalar(0.075 / rel);
        continue;
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
