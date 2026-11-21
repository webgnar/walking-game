// The single Three.js stage behind the UI. Modes move the camera; combat adds enemy actors.
import * as THREE from 'three';
import { loadCaveman } from './caveman.js';
import { buildBackdrop } from './backdrop.js';
import { attachBeast } from './beasts.js';
import { loadProps, buildHero, setHeroLook, buildEnemy, enemyHeight, buildCave, buildTrialSet, buildFire, buildBuilding, loadBuildingModel, loadWeapon, weaponLoaded, WEAPON_FILES } from './models.js';

const BUILD_POS = {
  studio: [-5.2, -5.4], altar: [-2.6, -6.4], inventory: [0, -6.8], shrine: [2.6, -6.4], truth: [5.2, -5.4],
};

const HOME_SCALE = 1.24;
const TRIAL_HORIZON = 0.64; // public/backdrops/trial-wolf-ridge.jpg

// Lunge timing: the hero is furthest forward at LUNGE_PEAK of LUNGE_MS; strikes connect then.
const LUNGE_MS = 380, LUNGE_PEAK = 0.4;
export const STRIKE_MS = LUNGE_MS * LUNGE_PEAK;

const CAMS = {
  intro: { pos: [0, 1.3, 3.2], look: [0, 1.4, 0] },
  home: { pos: [0, 1.86, 5.6], look: [0, 1.26, 0] },
  hero: { pos: [0.5, 1.2, 5.4], look: [0.5, 1.0, 0] },
  base: { pos: [0, 3.4, 4.2], look: [0, 1.45, -6] },
  map: { pos: [0, 16, 8], look: [0, 0, -4] },
  combat: { pos: [0.7, 2.6, 10.6], look: [0.7, 1.4, 0] },
};

// Soft contact shadow: a dark ellipse that fades out from the centre (worked out in the shader, no texture).
let blobMat;
function blobShadow(size) {
  blobMat ||= new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec2 vUv; void main() { float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(0.03, 0.01, 0.0, 0.9 * pow(1.0 - smoothstep(0.0, 1.0, d), 0.9)); }',
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 0.7), blobMat);
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  return m;
}

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.backdrop = buildBackdrop((tex) => { this.backdrop = tex; if (this.mode !== 'combat') this.scene.background = tex; });
    // the Trial has its own painted backdrop (horizon = where its flat ground meets the far valley)
    this.trialBackdrop = buildBackdrop((tex) => { this.trialBackdrop = tex; if (this.mode === 'combat') this.scene.background = tex; },
      '/backdrops/trial-wolf-ridge.jpg', TRIAL_HORIZON);
    this.scene.background = this.backdrop;
    this.scene.fog = new THREE.Fog(0x3a1d17, 14, 34);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camPos = new THREE.Vector3(...CAMS.home.pos);
    this.camLook = new THREE.Vector3(...CAMS.home.look);
    this.camera.position.copy(this.camPos);
    this.lookNow = this.camLook.clone();

    this.hemi = new THREE.HemisphereLight(0xffd2b0, 0x2a1612, 1.2);
    this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xffd8b8, 1.6);
    sun.position.set(4, 8, 6);
    this.scene.add(sun);
    this.sun = sun;
    // the Trial's own dressing and dusk lighting (cliffs, firelight, moon rim), shown in combat only
    this.trialSet = buildTrialSet();
    this.trialSet.visible = false;
    this.scene.add(this.trialSet);
    // soft contact shadows so the fighters sit on the textured ground
    this.heroBlob = blobShadow(1.7);
    this.scene.add(this.heroBlob);

    this.cave = buildCave();
    this.scene.add(this.cave);
    this.fire = buildFire();
    this.fire.position.set(1.55, 0, -0.2);
    this.fire.scale.setScalar(0.85);
    this.scene.add(this.fire);

    this.hero = buildHero();
    this.scene.add(this.hero);
    this.heroHome = new THREE.Vector3(0, 0, 0);
    this.looks = {};
    this.gearIds = {};
    // swap the placeholder body for the rigged caveman once it has loaded
    this.hero.userData.body.visible = false;
    loadProps().then(() => setHeroLook(this.hero, this.shownLooks())).catch((e) => console.warn('[stage] props failed', e));
    loadCaveman().then((rig) => {
      const h = this.hero;
      h.add(rig.model);
      rig.attachSlots(h.userData.slots);
      this.rig = rig;
      setHeroLook(h, this.shownLooks());
      rig.wardrobe.wearAll(this.gearIds);
    }).catch((e) => {
      console.warn('[stage] caveman failed to load, using placeholder', e);
      this.hero.userData.body.visible = true;
    });

    this.buildings = {};
    this.buildingTiers = {};
    this.enemies = new Map();
    this.tweens = [];
    // Effects: a game clock that can freeze (hit-stop) and slow down, camera shake, particles.
    this.clock = 0;
    this.timeScale = 1;
    this.slowUntil = 0;
    this.freezeUntil = 0;
    this.shakeAmp = 0;
    this.shakeUntil = 0;
    this.shakeOff = new THREE.Vector3();
    this.particles = [];
    this.stains = [];
    this.fx = new THREE.Group();
    this.scene.add(this.fx);
    this.mode = 'home';
    this.t0 = performance.now();
    this.last = this.t0;
    this.watchSize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // iOS fires 'resize' and 'orientationchange' BEFORE it has laid the page out in its new shape, so reading the
  // window size there gets the old shape, and nothing fires once it settles: the portrait picture got stretched over
  // the landscape screen (and squished going back). So size from the canvas box itself, watched by a ResizeObserver
  // (which only reports after layout), and check again a few times after every rotation. Ported from skate-rogue.
  watchSize() {
    let sized = '';
    const check = () => {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      if (!w || !h) return;
      const now = `${w}x${h}`;
      if (now === sized) return;
      sized = now;
      this.resize();
    };
    const settle = () => {
      check();
      requestAnimationFrame(check);
      for (const ms of [100, 300, 700]) setTimeout(check, ms);
    };
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(check).observe(this.canvas);
    window.addEventListener('resize', settle);
    window.addEventListener('orientationchange', settle);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', settle);
    check();
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.backdrop.userData.fit(w / h);
    this.trialBackdrop.userData.fit(w / h);
    // keep the scene readable in portrait-ish windows
    this.camera.fov = w / h < 1.3 ? 58 : 42;
    this.camera.updateProjectionMatrix();
  }

  setMode(mode) {
    this.mode = mode;
    const c = CAMS[mode] || CAMS.home;
    this.camPos.set(...c.pos);
    this.camLook.set(...c.look);
    const h = this.hero;
    // undo any death/stun/win pose or hit flash left over from the last fight
    this.tweens = [];
    this.clearFlashes();
    h.rotation.set(0, 0, 0);
    h.userData.armR.rotation.x = 0;
    if (this.rig) this.rig.reset();
    h.visible = mode !== 'map' && mode !== 'base';
    // the hero stands bigger on Home, where he's the centrepiece
    h.scale.setScalar(mode === 'home' ? HOME_SCALE : 1);
    if (mode === 'combat') {
      h.position.set(-2.8, 0, 0.4);
      h.rotation.y = 0.75;
    } else if (mode === 'hero') {
      // left of the inventory panel, centred in the open space
      h.position.set(-2.0, 0, 0);
      h.rotation.y = 0.35;
    } else {
      h.position.set(0, 0, 0);
      h.rotation.y = 0;
      this.clearEnemies();
    }
    // swipe-to-spin starts from his default stance in each mode
    this.heroYaw = h.rotation.y;
    this.spin = { a: 0, v: 0, drag: false, target: 0 };
    this.clearFx();
    this.timeScale = 1;
    this.fire.visible = mode !== 'combat';
    const trial = mode === 'combat';
    this.trialSet.visible = trial;
    this.scene.background = trial ? this.trialBackdrop : this.backdrop;
    // fog to the painting's horizon colour so the 3D ground melts into the painted valley
    this.scene.fog.color.set(trial ? 0x5a412c : 0x3a1d17);
    this.scene.fog.near = trial ? 10 : 14;
    this.scene.fog.far = trial ? 30 : 34;
    // in the Trial the painted valley is the far view: drop the camp's ring rocks that stand behind the fight
    for (const r of this.cave.children) if (r.userData.ringRock) r.visible = !(trial && r.position.z < -2 && Math.abs(r.position.x) < 14);
    // dusk in the Trial: dimmer sky fill and key so the firelight and the moon's rim light carry the scene
    this.hemi.intensity = trial ? 0.6 : 1.2;
    this.hemi.color.set(trial ? 0xd8b8b0 : 0xffd2b0);
    this.sun.intensity = trial ? 0.75 : 1.6;
    for (const b of Object.values(this.buildings)) b.visible = mode === 'base';
  }

  snapCamera() {
    this.camera.position.copy(this.camPos);
    this.lookNow.copy(this.camLook);
  }

  // The rigged hero wears the fitted gear models (scene/wear.js) for armor, helm, offhand and
  // trinket; the old placeholder shapes are only for the stand-in body. The weapon is its own model
  // from public/models/weapons (the Worn Club is zack's club.glb).
  // With no weapon equipped he is bare-handed ('none' draws nothing).
  shownLooks() {
    if (!this.rig) return { ...this.looks, weapon: this.looks.weapon || 'none' };
    const w = this.gearIds.weapon;
    return { weapon: !w ? 'none' : WEAPON_FILES.has(w) ? `w:${w}` : 'club1' };
  }
  // looks: slot -> placeholder look key; ids: slot -> gear item id
  setHeroLook(looks, ids = {}) {
    this.looks = looks;
    this.gearIds = ids;
    setHeroLook(this.hero, this.shownLooks());
    if (this.rig) this.rig.wardrobe.wearAll(ids);
    // weapon models load on first use; redraw the hand once this one arrives (if still equipped)
    const w = ids.weapon;
    if (w && !weaponLoaded(w)) loadWeapon(w).then(() => { if (this.gearIds.weapon === w) setHeroLook(this.hero, this.shownLooks()); });
  }

  setBase(tiers) {
    for (const [id, tier] of Object.entries(tiers)) {
      if (this.buildingTiers[id] === tier) continue;
      if (this.buildings[id]) this.scene.remove(this.buildings[id]);
      const b = buildBuilding(id, tier);
      const [x, z] = BUILD_POS[id];
      b.position.set(x, 0, z);
      b.rotation.y = -x * 0.08;
      b.visible = this.mode === 'base';
      this.scene.add(b);
      this.buildings[id] = b;
      this.buildingTiers[id] = tier;
      if (this.mode === 'base' && tier > 0) this.pop(b);
      // swap the primitive stand-in for zack's model once it has loaded (same group, so position/taps stay)
      if (tier > 0) loadBuildingModel(id, tier).then((m) => {
        if (!m || this.buildings[id] !== b) return;
        b.clear();
        b.add(m);
      });
    }
  }

  // ---------- Combat actors ----------
  clearEnemies() {
    for (const e of this.enemies.values()) { this.scene.remove(e.obj); this.scene.remove(e.blob); }
    this.enemies.clear();
  }

  setEnemies(list) {
    const seen = new Set();
    const n = list.length;
    list.forEach((e, i) => {
      seen.add(e.uid);
      let a = this.enemies.get(e.uid);
      if (!a) {
        const obj = buildEnemy(e.id);
        this.scene.add(obj);
        attachBeast(obj, e.id); // rigged model replaces the stand-in when there is one
        a = { obj, id: e.id, uid: e.uid, home: new THREE.Vector3(), blob: blobShadow(Math.min(3.2, enemyHeight(e.id) * 1.7)) };
        this.scene.add(a.blob);
        this.enemies.set(e.uid, a);
        obj.userData.baseScale = obj.scale.x;
        obj.scale.multiplyScalar(0.01);
        this.tween(400, (p) => obj.scale.setScalar(Math.max(0.01, p) * (obj.userData.baseScale || 1)), 'back');
      }
      const big = e.id === 'mammoth';
      const wide = e.id === 'rhino' || e.id === 'elk';
      const spacing = wide ? 2.8 : n >= 4 ? 1.7 : 2.15;
      const x = big ? 3.0 : 0.6 + i * spacing;
      const z = big ? -0.6 : i % 2 ? -0.9 : 0.4;
      a.home.set(x, 0, z);
      a.obj.position.copy(a.home);
    });
    for (const [uid, a] of this.enemies) if (!seen.has(uid)) { this.scene.remove(a.obj); this.scene.remove(a.blob); this.enemies.delete(uid); }
    this.frameFight(list);
  }

  // Center the camera on the hero-vs-enemies pair and zoom to fit them.
  frameFight(list) {
    if (this.mode !== 'combat' || !list.length) return;
    const heroX = -2.8;
    const xs = list.map((e) => this.enemies.get(e.uid).home.x);
    const big = list.some((e) => e.id === 'mammoth');
    const enemyMid = (Math.min(...xs) + Math.max(...xs)) / 2;
    const right = Math.max(...xs) + (big ? 3.8 : list.some((e) => e.id === 'rhino' || e.id === 'elk') ? 1.6 : 0.8);
    const cx = (heroX + enemyMid) / 2;
    const span = right - (heroX - 0.6);
    const aspect = this.camera.aspect || 2;
    const dist = Math.max(6.5, (span * 0.62 + 1.2) * (2.1 / Math.min(aspect, 2.4)) + 2.6);
    const lookY = big ? 1.9 : 1.15;
    this.camPos.set(cx, lookY + 1.1 + dist * 0.05, dist);
    this.camLook.set(cx, lookY, 0);
  }

  actor(who) {
    if (who === 'hero') return { obj: this.hero, id: 'hero', home: this.mode === 'combat' ? new THREE.Vector3(-2.8, 0, 0.4) : this.heroHome };
    return this.enemies.get(who);
  }

  // Animations. type: attack | hit | die | cast | block | stun | summon
  anim(who, type, opts = {}) {
    const a = this.actor(who);
    if (!a) return;
    const o = a.obj;
    const home = a.home.clone();
    switch (type) {
      case 'attack': {
        const dir = who === 'hero' ? 1 : -1;
        const dist = opts.dist || 1.4;
        this.tween(LUNGE_MS, (p) => {
          const k = p < LUNGE_PEAK ? p / LUNGE_PEAK : 1 - (p - LUNGE_PEAK) / (1 - LUNGE_PEAK);
          o.position.x = home.x + dir * dist * easeOut(k);
          o.position.y = home.y + Math.sin(k * Math.PI) * 0.25;
        });
        if (who === 'hero') this.swing(opts.skill === 'hurl' ? 'throw' : 'attack', STRIKE_MS);
        else if (o.userData.beast) o.userData.beast.bite(STRIKE_MS);
        break;
      }
      case 'hit': {
        this.flash(o, 0xff2030);
        if (who === 'hero' && this.rig) this.rig.play('hurt');
        if (o.userData.beast) o.userData.beast.play('hurt', { fade: 0.05 });
        const dir = who === 'hero' ? -1 : 1;
        this.tween(300, (p) => { o.position.x = home.x + dir * 0.25 * Math.sin(p * Math.PI); });
        break;
      }
      case 'block':
        this.flash(o, 0xe3c47e);
        if (who === 'hero' && this.rig) this.rig.play('block');
        break;
      case 'cast':
        this.flash(o, 0xff8a3d);
        // Roar thumps the chest; Firebrand is thrown
        if (who === 'hero' && this.rig && opts.skill === 'roar' && this.rig.play('roar')) break;
        if (o.userData.beast) { o.userData.beast.play('snarl'); break; }
        if (who === 'hero') this.swing('throw', STRIKE_MS);
        break;
      case 'stun':
        this.tween(500, (p) => { o.rotation.z = Math.sin(p * Math.PI * 4) * 0.12 * (1 - p); });
        break;
      case 'die': {
        if (who === 'hero' && this.rig && this.rig.play('death')) break;
        if (who !== 'hero') { this.dissolve(who); break; }
        const r0 = o.rotation.z;
        this.tween(600, (p) => {
          o.rotation.z = r0 + (who === 'hero' ? 1 : -1) * p * 1.4;
          o.position.y = -p * 0.4;
          if (p >= 1) o.visible = false;
        });
        break;
      }
      case 'win':
        if (who === 'hero' && this.rig && this.rig.play('victory')) break;
        this.tween(700, (p) => { o.position.y = Math.sin(p * Math.PI) * 0.6; });
        break;
    }
  }

  swing(clip = 'attack', contactMs = 0) {
    if (this.rig) { this.rig.swing(clip, contactMs); return; }
    const arm = this.hero.userData.armR;
    this.tween(360, (p) => { arm.rotation.x = -Math.sin(p * Math.PI) * 2.2; });
  }

  flash(obj, color) {
    const mats = [];
    obj.traverse((m) => {
      if (m.isMesh && !m.userData.isInk && m.material.emissive) {
        if (!m.userData.ownMat) { m.material = m.material.clone(); m.userData.ownMat = true; }
        mats.push(m.material);
      }
    });
    const c = new THREE.Color(color);
    // remember each material's own glow once, so an interrupted flash can always be undone
    for (const m of mats) if (!m.userData.baseEmissive) m.userData.baseEmissive = m.emissive.clone();
    (this.flashed || (this.flashed = new Set())).add(obj);
    this.tween(260, (p) => mats.forEach((m) => m.emissive.copy(m.userData.baseEmissive).lerp(c, 1 - p)));
  }

  // Undo any hit flash that a screen change cut off mid-way (it used to leave the hero red).
  clearFlashes() {
    for (const obj of this.flashed || []) obj.traverse((m) => { if (m.isMesh && m.material && m.material.userData && m.material.userData.baseEmissive) m.material.emissive.copy(m.material.userData.baseEmissive); });
    this.flashed = new Set();
  }

  pop(obj) {
    this.tween(450, (p) => obj.scale.setScalar(0.6 + 0.4 * backOut(p)));
  }

  tween(ms, fn, ease) {
    this.tweens.push({ t0: this.clock, ms, fn, ease });
  }
  after(ms, fn) { this.tween(ms, (p) => { if (p >= 1) fn(); }); }

  // ---------- Impact effects ----------
  hitStop(ms) { this.freezeUntil = Math.max(this.freezeUntil, performance.now() + ms); }
  slowMo(scale, ms) { this.timeScale = scale; this.slowUntil = performance.now() + ms; }
  shake(amp, ms) { this.shakeAmp = Math.max(this.shakeAmp, amp); this.shakeUntil = performance.now() + ms; }

  // World position of an actor's head (or a height on its body).
  actorPoint(who, frac = 0.85) {
    const a = this.actor(who);
    if (!a) return new THREE.Vector3();
    // head-height effects come from the beast's actual head
    const head = who !== 'hero' && frac >= 0.7 && a.obj.userData.head;
    if (head) return head.getWorldPosition(new THREE.Vector3());
    const v = a.obj.position.clone();
    v.y += (who === 'hero' ? 1.75 : enemyHeight(a.id)) * frac;
    if (who !== 'hero') v.x -= 0.35; // the head faces the hero
    return v;
  }

  spawn(kind, pos, n, opts = {}) {
    const mats = FX_MATS();
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(FX_GEO(), mats[kind]);
      const sz = (opts.size || 1) * (kind === 'gold' ? 0.6 + Math.random() * 0.6 : 0.6 + Math.random() * 1.1);
      m.scale.setScalar(sz);
      m.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.25));
      const dir = opts.dir || new THREE.Vector3(0, 1, 0);
      const sp = (opts.speed || 3) * (0.5 + Math.random());
      const v = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.2, (Math.random() - 0.5) * 2).multiplyScalar(opts.spread ?? 1).add(dir).normalize().multiplyScalar(sp);
      this.fx.add(m);
      this.particles.push({ m, v, life: (opts.life || 0.9) * (0.7 + Math.random() * 0.6), kind, sz, g: kind === 'gold' ? -0.6 : kind === 'spark' ? 6 : 9.8, stain: kind === 'blood' && opts.stain !== false });
    }
  }

  blood(who, n = 10, opts = {}) {
    if (who === 'hero' || !this.actor(who)) return;
    const p = this.actorPoint(who, opts.frac ?? 0.6);
    const dir = new THREE.Vector3(0.8, 0.45, 0); // sprays away from the hero, mostly sideways
    this.spawn('blood', p, n, { dir, speed: opts.speed || 2.4, spread: 0.7, size: opts.size || 1.2 });
    if (opts.dark !== false) this.spawn('bloodDark', p, Math.ceil(n / 2), { dir, speed: (opts.speed || 2.4) * 0.7, spread: 0.9, size: 1.3 });
  }

  stain(x, z, r = 0.35) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 14), FX_MATS().stain.clone());
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.012 + this.stains.length * 0.0004, z);
    m.scale.set(1, 0.6 + Math.random() * 0.6, 1);
    m.rotation.z = Math.random() * Math.PI;
    this.fx.add(m);
    this.stains.push({ m, born: this.clock });
    if (this.stains.length > 24) { const old = this.stains.shift(); this.fx.remove(old.m); }
  }

  // A regular strike lands: brief freeze, blood, sparks off armor, a bigger moment on crits.
  impact(who, { dmg = 0, crit = false, armored = false, kind = 'physical' } = {}) {
    if (who === 'hero') {
      this.hitStop(dmg >= 15 ? 90 : 50);
      this.shake(dmg >= 15 ? 0.12 : 0.05, 220);
      return;
    }
    if (kind === 'burn') return;
    this.hitStop(crit ? 110 : 55);
    if (crit) { this.slowMo(0.35, 260); this.shake(0.14, 260); } else this.shake(0.05, 160);
    if (armored) this.spawn('spark', this.actorPoint(who, 0.6), 10, { speed: 4, spread: 1.2, life: 0.5 });
    if (kind === 'fire') this.spawn('ember', this.actorPoint(who, 0.6), 12, { speed: 2.5, dir: new THREE.Vector3(0, 1.5, 0), life: 0.8 });
    else if (dmg > 0) this.blood(who, crit ? 16 : 7, { size: crit ? 1.3 : 1 });
  }

  // Death: the body drops, then dissolves into gold dust that drifts up (the simulation reclaiming it).
  dissolve(who) {
    const a = this.actor(who);
    if (!a) return;
    const o = a.obj;
    const r0 = o.rotation.z, base = o.scale.x;
    this.stain(o.position.x, o.position.z, 0.3 + enemyHeight(a.id) * 0.12);
    // rigged beasts collapse with their death clip; the rest tip over
    const rigged = o.userData.beast && o.userData.beast.play('death', { fade: 0.08 });
    if (!rigged) this.tween(420, (p) => { o.rotation.z = r0 - p * 1.35; o.position.y = -p * 0.15; });
    this.after(rigged ? 1300 : 520, () => {
      this.spawn('gold', this.actorPoint(who, 0.4), 26, { dir: new THREE.Vector3(0, 1, 0), speed: 0.9, spread: 1.1, life: 1.6 });
      this.tween(650, (p) => { o.scale.setScalar(base * (1 - p * 0.92)); if (p >= 1) o.visible = false; });
    });
  }

  // ---------- Finishing moves (in-engine, about a second) ----------
  // Returns the real-time ms until the kill lands, so the UI can wait for it.
  finisher(kind, who) {
    const a = this.actor(who);
    if (!a) return 0;
    const h = this.hero, home = this.actor('hero').home.clone();
    const target = a.obj.position.clone();
    const reach = Math.max(0, target.x - home.x - 1.25 - (enemyHeight(a.id) > 3 ? 1.4 : 0));
    // close in on the target and push the camera toward it
    this.tween(260, (p) => { h.position.x = home.x + reach * easeOut(p); });
    const look0 = this.camLook.clone(), pos0 = this.camPos.clone();
    const focus = this.actorPoint(who, 0.6);
    this.camLook.lerpVectors(look0, focus, 0.45);
    this.camPos.lerpVectors(pos0, focus, 0.22);
    const back = () => {
      this.camLook.copy(look0); this.camPos.copy(pos0);
      this.tween(320, (p) => { h.position.x = home.x + reach * (1 - easeOut(p)); });
    };
    const head = a.obj.userData.head;
    switch (kind) {
      case 'skull': {
        // two-handed overhead slam: the skull caves in
        this.swing('attack', 300);
        this.after(300, () => {
          this.hitStop(150); this.slowMo(0.25, 420); this.shake(0.22, 380);
          if (head) { const s0 = head.scale.clone(); this.tween(140, (p) => head.scale.set(s0.x * (1 + 0.35 * p), s0.y * (1 - 0.65 * p), s0.z * (1 + 0.35 * p))); }
          const hp = this.actorPoint(who, 0.85);
          this.spawn('blood', hp, 30, { dir: new THREE.Vector3(0.5, 0.8, 0), speed: 2.6, spread: 1.1, size: 1.5 });
          this.spawn('bloodDark', hp, 18, { dir: new THREE.Vector3(0.7, 0.3, 0), speed: 1.8, spread: 1, size: 1.5 });
          this.spawn('bone', hp, 7, { dir: new THREE.Vector3(0.4, 0.8, 0), speed: 2.2, spread: 1, life: 0.7 });
          this.after(380, () => { back(); this.dissolve(who); });
        });
        return 320;
      }
      case 'terror': {
        // run it through, lift it, and roar: the pack flinches
        this.swing('attack', 260);
        this.after(260, () => {
          this.hitStop(110); this.slowMo(0.3, 600); this.shake(0.16, 300);
          this.blood(who, 20, { frac: 0.45, speed: 2.5 });
          const o = a.obj, y0 = o.position.y, rz = o.rotation.z;
          this.tween(380, (p) => { o.position.y = y0 + Math.sin(Math.min(1, p * 1.4) * Math.PI / 2) * 1.0; o.rotation.z = rz + 0.6 * p; });
          for (let i = 0; i < 4; i++) this.after(90 * i, () => this.spawn('bloodDark', this.actorPoint(who, 0.35), 4, { dir: new THREE.Vector3(0, -1, 0), speed: 1.2, spread: 0.3 }));
          this.after(380, () => {
            if (this.rig) this.rig.play('roar');
            for (const [uid, e] of this.enemies) if (uid !== who && e.obj.visible) { const x0 = e.home.x; this.tween(420, (p) => { e.obj.position.x = x0 + Math.sin(p * Math.PI) * 0.7; }); }
            this.shake(0.12, 400);
            this.tween(260, (p) => { o.position.y = y0 + 1.0 * (1 - p); });
            this.after(300, () => { back(); this.dissolve(who); });
          });
        });
        return 300;
      }
      case 'bloodrush': {
        // a three-hit flurry, blood on every strike
        for (let i = 0; i < 3; i++) {
          this.after(i * 190, () => {
            this.swing('attack', 150);
            this.after(150, () => { this.hitStop(60); this.shake(0.1, 140); this.blood(who, 12, { speed: 2.6 }); });
          });
        }
        this.after(560, () => { this.slowMo(0.35, 300); this.after(260, () => { back(); this.dissolve(who); }); });
        return 520;
      }
    }
    return 0;
  }

  // ---------- Swipe to spin the hero (Home and Hero screens) ----------
  // While dragging he follows the finger. On release he keeps spinning with the swipe's momentum,
  // then eases back to his default stance (a whole number of turns from where he started).
  spinStart() {
    if (!this.spin) this.spin = { a: 0, v: 0, drag: false, target: 0 };
    this.spin.drag = true;
    this.spin.v = 0;
  }
  spinMove(dx) {
    if (this.spin && this.spin.drag) this.spin.a += dx * 0.012;
  }
  spinEnd(vel) {
    const sp = this.spin;
    if (!sp) return;
    sp.drag = false;
    sp.v = vel;
    const TAU = Math.PI * 2;
    // where the momentum would carry him, rounded to the next whole turn in that direction
    const coast = sp.a + vel / SPIN_DAMP;
    sp.target = Math.abs(vel) < 0.5 ? Math.round(sp.a / TAU) * TAU : (vel > 0 ? Math.ceil(coast / TAU) : Math.floor(coast / TAU)) * TAU;
  }
  updateSpin(dt) {
    const sp = this.spin;
    if (!sp || (this.mode !== 'home' && this.mode !== 'hero')) return;
    if (!sp.drag) {
      // critically damped spring toward the target turn: no wobble, no sudden stop
      const acc = -SPIN_K * (sp.a - sp.target) - SPIN_DAMP * sp.v;
      sp.v += acc * dt;
      sp.a += sp.v * dt;
      if (Math.abs(sp.a - sp.target) < 0.001 && Math.abs(sp.v) < 0.01) { sp.a = 0; sp.target = 0; sp.v = 0; }
    }
    this.hero.rotation.y = this.heroYaw + sp.a;
  }

  // Which Base building (if any) is under a screen point (CSS px).
  pickBuilding(x, y) {
    const r = this.canvas.getBoundingClientRect();
    const v = new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(v, this.camera);
    let best = null, dist = Infinity;
    for (const [id, obj] of Object.entries(this.buildings)) {
      if (!obj.visible) continue;
      const hit = ray.intersectObject(obj, true)[0];
      if (hit && hit.distance < dist) { dist = hit.distance; best = id; }
    }
    return best;
  }

  // Screen position (CSS px) of an actor's head or a building top.
  anchor(who, extra = 0.25) {
    let obj, h;
    if (BUILD_POS[who]) { obj = this.buildings[who]; h = this.buildingTiers[who] > 0 ? 2.2 + this.buildingTiers[who] * 0.25 : 1.6; }
    else {
      const a = this.actor(who);
      if (!a) return null;
      obj = a.obj;
      h = who === 'hero' ? 2.1 * obj.scale.y : enemyHeight(a.id);
    }
    if (!obj) return null;
    const v = new THREE.Vector3();
    obj.getWorldPosition(v);
    if (who !== 'hero' && !BUILD_POS[who]) v.copy(this.actor(who).home);
    v.y += h + extra;
    v.project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height };
  }

  frame() {
    const nowMs = performance.now();
    const dt = Math.min(0.05, (nowMs - this.last) / 1000);
    this.last = nowMs;
    const t = (nowMs - this.t0) / 1000;
    // camera ease
    // game time: frozen during hit-stop, slowed during slow motion
    const real = performance.now();
    if (this.timeScale !== 1 && real > this.slowUntil) this.timeScale = 1;
    const gdt = real < this.freezeUntil ? 0 : dt * this.timeScale;
    this.clock += gdt * 1000;
    this.camera.position.sub(this.shakeOff);
    this.camera.position.lerp(this.camPos, 1 - Math.pow(0.0004, dt));
    this.lookNow.lerp(this.camLook, 1 - Math.pow(0.0004, dt));
    this.camera.lookAt(this.lookNow);
    if (real < this.shakeUntil) {
      const k = this.shakeAmp * ((this.shakeUntil - real) / 300);
      this.shakeOff.set((Math.random() - 0.5) * k, (Math.random() - 0.5) * k, 0);
    } else { this.shakeOff.set(0, 0, 0); this.shakeAmp = 0; }
    this.camera.position.add(this.shakeOff);
    this.updateParticles(gdt);
    this.heroBlob.visible = this.mode === 'combat' && this.hero.visible;
    this.heroBlob.position.set(this.hero.position.x, 0.02, this.hero.position.z);
    for (const a of this.enemies.values()) { a.blob.position.set(a.obj.position.x, 0.02, a.obj.position.z); a.blob.visible = a.obj.visible; }
    // idle
    const hb = this.hero.userData.body;
    hb.position.y = Math.sin(t * 2) * 0.02;
    this.hero.userData.hairBack.rotation.x = 0.12 + Math.sin(t * 1.7) * 0.04;
    if (this.rig) this.rig.update(gdt, t);
    this.updateSpin(dt);
    for (const a of this.enemies.values()) {
      if (a.obj.userData.beast) { a.obj.userData.beast.update(dt); continue; }
      const b = a.obj.userData.body;
      if (b) b.position.y = Math.sin(t * 2.4 + a.uid) * 0.03;
    }
    if (this.fire.visible) this.fire.userData.flames.userData.update(t, this.camera);
    this.fire.userData.light.intensity = 11 + Math.sin(t * 15) * 1.5 + Math.sin(t * 6.3) * 1.5;
    for (const b of Object.values(this.buildings)) b.children.forEach((c) => { if (c.material && c.material.wireframe) c.rotation.y = t * 0.3; });
    // tweens run on the game clock
    const now = this.clock;
    const list = this.tweens;
    this.tweens = [];
    const keep = list.filter((tw) => {
      let p = Math.min(1, (now - tw.t0) / tw.ms);
      if (tw.ease === 'back') p = backOut(p);
      tw.fn(p);
      return (now - tw.t0) < tw.ms;
    });
    this.tweens = keep.concat(this.tweens);
    this.renderer.render(this.scene, this.camera);
  }

  updateParticles(dt) {
    if (!this.particles.length && !this.stains.length) return;
    this.particles = this.particles.filter((q) => {
      q.life -= dt;
      q.v.y -= q.g * dt;
      q.m.position.addScaledVector(q.v, dt);
      if (q.m.position.y < 0.02 && q.kind !== 'gold') {
        if (q.stain && Math.random() < 0.18) this.stain(q.m.position.x, q.m.position.z, 0.06 + Math.random() * 0.1);
        q.life = 0;
      }
      const k = Math.max(0, Math.min(1, q.life / 0.3));
      q.m.scale.setScalar(q.sz * (q.kind === 'gold' ? k : 0.4 + 0.6 * k));
      if (q.life <= 0) { this.fx.remove(q.m); return false; }
      return true;
    });
    // stains fade after a few seconds
    for (const st of this.stains) {
      const age = (this.clock - st.born) / 1000;
      st.m.material.opacity = age < 6 ? 0.85 : Math.max(0, 0.85 - (age - 6) * 0.4);
    }
  }

  clearFx() {
    for (const q of this.particles) this.fx.remove(q.m);
    for (const st of this.stains) this.fx.remove(st.m);
    this.particles = [];
    this.stains = [];
  }
}

// Shared effect geometry and materials, made on first use.
let fxGeo = null, fxMats = null;
function FX_GEO() { return fxGeo || (fxGeo = new THREE.IcosahedronGeometry(0.045, 0)); }
function FX_MATS() {
  if (fxMats) return fxMats;
  const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });
  fxMats = {
    blood: basic(0x8a0b0b),
    bloodDark: basic(0x4a0505),
    bone: basic(0xeee2c4),
    spark: basic(0xffd27a, { blending: THREE.AdditiveBlending, transparent: true }),
    ember: basic(0xff7a2a, { blending: THREE.AdditiveBlending, transparent: true }),
    gold: basic(0xffcc66, { blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }),
    stain: basic(0x3e0606, { transparent: true, opacity: 0.85, depthWrite: false }),
  };
  return fxMats;
}

const SPIN_K = 16, SPIN_DAMP = 8; // the spin's spring stiffness and damping (critically damped)
const easeOut = (k) => 1 - (1 - k) * (1 - k);
const backOut = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
