// The single Three.js stage behind the UI. Modes move the camera; combat adds enemy actors.
import * as THREE from 'three';
import { buildHero, setHeroLook, buildEnemy, enemyHeight, buildCave, buildFire, buildBuilding } from './models.js';

const BUILD_POS = {
  studio: [-5.2, -5.4], altar: [-2.6, -6.4], inventory: [0, -6.8], shrine: [2.6, -6.4], truth: [5.2, -5.4],
};

const CAMS = {
  intro: { pos: [0, 1.3, 3.2], look: [0, 1.4, 0] },
  home: { pos: [0, 1.7, 5.6], look: [0, 1.1, 0] },
  hero: { pos: [0.5, 1.35, 6.2], look: [0.5, 1.05, 0] },
  base: { pos: [0, 3.4, 4.2], look: [0, 0.9, -6] },
  map: { pos: [0, 16, 8], look: [0, 0, -4] },
  combat: { pos: [0.7, 2.6, 10.6], look: [0.7, 1.4, 0] },
};

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2a1e3a);
    this.scene.fog = new THREE.Fog(0x2a1e3a, 18, 42);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camPos = new THREE.Vector3(...CAMS.home.pos);
    this.camLook = new THREE.Vector3(...CAMS.home.look);
    this.camera.position.copy(this.camPos);
    this.lookNow = this.camLook.clone();

    this.scene.add(new THREE.HemisphereLight(0xffd9b0, 0x2a2040, 1.4));
    const sun = new THREE.DirectionalLight(0xffe2c0, 2.2);
    sun.position.set(4, 8, 6);
    this.scene.add(sun);

    this.scene.add(buildCave());
    this.fire = buildFire();
    this.fire.position.set(1.7, 0, 0.6);
    this.scene.add(this.fire);

    this.hero = buildHero();
    this.scene.add(this.hero);
    this.heroHome = new THREE.Vector3(0, 0, 0);

    this.buildings = {};
    this.buildingTiers = {};
    this.enemies = new Map();
    this.tweens = [];
    this.mode = 'home';
    this.t0 = performance.now();
    this.last = this.t0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.renderer.setAnimationLoop(() => this.frame());
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
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
    // undo any death/stun/win pose left over from the last fight
    this.tweens = [];
    h.rotation.set(0, 0, 0);
    h.userData.armR.rotation.x = 0;
    h.visible = mode !== 'map' && mode !== 'base';
    if (mode === 'combat') {
      h.position.set(-2.8, 0, 0.4);
      h.rotation.y = 0.75;
    } else if (mode === 'hero') {
      h.position.set(-1.25, 0, 0);
      h.rotation.y = 0.3;
    } else {
      h.position.set(0, 0, 0);
      h.rotation.y = 0;
      this.clearEnemies();
    }
    this.fire.visible = mode !== 'combat';
    for (const b of Object.values(this.buildings)) b.visible = mode === 'base';
  }

  snapCamera() {
    this.camera.position.copy(this.camPos);
    this.lookNow.copy(this.camLook);
  }

  setHeroLook(looks) {
    setHeroLook(this.hero, looks);
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
    }
  }

  // ---------- Combat actors ----------
  clearEnemies() {
    for (const e of this.enemies.values()) this.scene.remove(e.obj);
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
        a = { obj, id: e.id, uid: e.uid, home: new THREE.Vector3() };
        this.enemies.set(e.uid, a);
        obj.userData.baseScale = obj.scale.x;
        obj.scale.multiplyScalar(0.01);
        this.tween(400, (p) => obj.scale.setScalar(Math.max(0.01, p) * (obj.userData.baseScale || 1)), 'back');
      }
      const big = e.id === 'mammoth';
      const spacing = n >= 4 ? 1.55 : 1.85;
      const x = big ? 3.0 : 0.6 + i * spacing;
      const z = big ? -0.6 : i % 2 ? -0.9 : 0.4;
      a.home.set(x, 0, z);
      a.obj.position.copy(a.home);
    });
    for (const [uid, a] of this.enemies) if (!seen.has(uid)) { this.scene.remove(a.obj); this.enemies.delete(uid); }
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
        this.tween(380, (p) => {
          const k = p < 0.4 ? p / 0.4 : 1 - (p - 0.4) / 0.6;
          o.position.x = home.x + dir * dist * easeOut(k);
          o.position.y = home.y + Math.sin(k * Math.PI) * 0.25;
        });
        if (who === 'hero') this.swing();
        break;
      }
      case 'hit': {
        this.flash(o, 0xff2030);
        const dir = who === 'hero' ? -1 : 1;
        this.tween(300, (p) => { o.position.x = home.x + dir * 0.25 * Math.sin(p * Math.PI); });
        break;
      }
      case 'block':
        this.flash(o, 0x20f0ff);
        break;
      case 'cast':
        this.flash(o, 0xff8a3d);
        this.swing();
        break;
      case 'stun':
        this.tween(500, (p) => { o.rotation.z = Math.sin(p * Math.PI * 4) * 0.12 * (1 - p); });
        break;
      case 'die': {
        const r0 = o.rotation.z;
        this.tween(600, (p) => {
          o.rotation.z = r0 + (who === 'hero' ? 1 : -1) * p * 1.4;
          o.position.y = -p * 0.4;
          if (p >= 1) o.visible = false;
        });
        break;
      }
      case 'win':
        this.tween(700, (p) => { o.position.y = Math.sin(p * Math.PI) * 0.6; });
        break;
    }
  }

  swing() {
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
    const base = mats.map((m) => m.emissive.clone());
    this.tween(260, (p) => mats.forEach((m, i) => m.emissive.copy(base[i]).lerp(c, 1 - p)));
  }

  pop(obj) {
    this.tween(450, (p) => obj.scale.setScalar(0.6 + 0.4 * backOut(p)));
  }

  tween(ms, fn, ease) {
    this.tweens.push({ t0: performance.now(), ms, fn, ease });
  }

  // Screen position (CSS px) of an actor's head or a building top.
  anchor(who, extra = 0.25) {
    let obj, h;
    if (BUILD_POS[who]) { obj = this.buildings[who]; h = this.buildingTiers[who] > 0 ? 2.2 + this.buildingTiers[who] * 0.25 : 1.6; }
    else {
      const a = this.actor(who);
      if (!a) return null;
      obj = a.obj;
      h = who === 'hero' ? 2.1 : enemyHeight(a.id);
    }
    if (!obj) return null;
    const v = new THREE.Vector3();
    obj.getWorldPosition(v);
    if (who !== 'hero' && !BUILD_POS[who]) v.copy(this.actor(who).home);
    v.y += h + extra;
    v.project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight };
  }

  frame() {
    const nowMs = performance.now();
    const dt = Math.min(0.05, (nowMs - this.last) / 1000);
    this.last = nowMs;
    const t = (nowMs - this.t0) / 1000;
    // camera ease
    this.camera.position.lerp(this.camPos, 1 - Math.pow(0.0004, dt));
    this.lookNow.lerp(this.camLook, 1 - Math.pow(0.0004, dt));
    this.camera.lookAt(this.lookNow);
    // idle
    const hb = this.hero.userData.body;
    hb.position.y = Math.sin(t * 2) * 0.02;
    this.hero.userData.hairBack.rotation.x = 0.12 + Math.sin(t * 1.7) * 0.04;
    for (const a of this.enemies.values()) {
      const b = a.obj.userData.body;
      if (b) b.position.y = Math.sin(t * 2.4 + a.uid) * 0.03;
    }
    if (this.fire.visible) this.fire.userData.flames.userData.update(t, this.camera);
    this.fire.userData.light.intensity = 11 + Math.sin(t * 15) * 1.5 + Math.sin(t * 6.3) * 1.5;
    for (const b of Object.values(this.buildings)) b.children.forEach((c) => { if (c.material && c.material.wireframe) c.rotation.y = t * 0.3; });
    // tweens
    const now = performance.now();
    this.tweens = this.tweens.filter((tw) => {
      let p = Math.min(1, (now - tw.t0) / tw.ms);
      if (tw.ease === 'back') p = backOut(p);
      tw.fn(p);
      return (now - tw.t0) < tw.ms;
    });
    this.renderer.render(this.scene, this.camera);
  }
}

const easeOut = (k) => 1 - (1 - k) * (1 - k);
const backOut = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
