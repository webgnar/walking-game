// Stylized comic-book campfire: a camera-facing flame shader with toon color bands and an ink rim,
// plus rising embers. Cheap: two quads and ~40 points.
import * as THREE from 'three';

const FLAME_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FLAME_FRAG = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uSeed;
  uniform vec3 uInk;
  uniform vec3 uC1; // outer red
  uniform vec3 uC2; // orange
  uniform vec3 uC3; // yellow
  uniform vec3 uC4; // hot core

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime + uSeed * 10.0;
    // sway grows toward the tip
    uv.x += (noise(vec2(uv.y * 2.0 - t * 1.3, uSeed)) - 0.5) * 0.35 * uv.y;
    // teardrop: wide at the bottom, pointed at the top
    float x = (uv.x - 0.5) * 2.0;
    float width = mix(1.0, 0.0, pow(uv.y, 1.35));
    float shape = 1.0 - abs(x) / max(width, 0.001);
    // rising turbulence eats into the flame, more toward the tip
    float n = fbm(vec2(uv.x * 3.4 + uSeed, uv.y * 1.3 - t * 2.6));
    float heat = shape * 0.95 - (n * 1.15) * (0.2 + uv.y * 1.1) + (1.0 - uv.y) * 0.3;
    if (heat < 0.0) discard;
    // toon bands: ink rim, red, orange, yellow, white core
    vec3 col;
    if (heat < 0.05) col = uInk;
    else if (heat < 0.22) col = uC1;
    else if (heat < 0.42) col = uC2;
    else if (heat < 0.66) col = uC3;
    else col = uC4;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const EMBER_VERT = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uSize;
  varying float vLife;
  void main() {
    float life = fract(uTime * (0.35 + aSeed * 0.25) + aSeed * 7.0);
    vLife = life;
    vec3 p = position;
    p.y += life * 1.9;
    p.x += sin(life * 6.0 + aSeed * 20.0) * 0.18 * life;
    p.z += cos(life * 5.0 + aSeed * 13.0) * 0.18 * life;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (1.0 - life) * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const EMBER_FRAG = /* glsl */ `
  precision mediump float;
  varying float vLife;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    // little diamond sparks
    if (abs(c.x) + abs(c.y) > 0.5) discard;
    vec3 col = vLife < 0.5 ? vec3(1.0, 0.88, 0.35) : vec3(1.0, 0.45, 0.12);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function buildFlames() {
  const g = new THREE.Group();
  const uniforms = [];
  const mk = (w, h, seed, z, palette) => {
    const u = {
      uTime: { value: 0 }, uSeed: { value: seed },
      uInk: { value: new THREE.Color(0x0b0b10) },
      uC1: { value: new THREE.Color(palette[0]) }, uC2: { value: new THREE.Color(palette[1]) },
      uC3: { value: new THREE.Color(palette[2]) }, uC4: { value: new THREE.Color(palette[3]) },
    };
    uniforms.push(u);
    const geo = new THREE.PlaneGeometry(w, h);
    geo.translate(0, h / 2, 0);
    const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: u, vertexShader: FLAME_VERT, fragmentShader: FLAME_FRAG, side: THREE.DoubleSide }));
    m.position.z = z;
    return m;
  };
  // big outer flame and a smaller hotter one in front
  g.add(mk(0.9, 1.35, 0.13, 0, [0xd8261b, 0xff7a1a, 0xffc93d, 0xfff4c2]));
  g.add(mk(0.55, 0.9, 0.71, 0.04, [0xff5a1a, 0xffa22d, 0xffe14d, 0xffffff]));

  const N = 40;
  const pos = new Float32Array(N * 3);
  const seeds = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 0.4;
    pos[i * 3 + 1] = 0.2 + Math.random() * 0.2;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    seeds[i] = Math.random();
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pg.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const eu = { uTime: { value: 0 }, uSize: { value: 0.16 } };
  const embers = new THREE.Points(pg, new THREE.ShaderMaterial({ uniforms: eu, vertexShader: EMBER_VERT, fragmentShader: EMBER_FRAG }));
  embers.frustumCulled = false;

  const root = new THREE.Group();
  root.add(g, embers);
  root.userData = {
    update(t, camera) {
      for (const u of uniforms) u.uTime.value = t;
      eu.uTime.value = t;
      // billboard around the vertical axis only, so the flame stays upright
      const wp = new THREE.Vector3();
      g.getWorldPosition(wp);
      g.rotation.y = Math.atan2(camera.position.x - wp.x, camera.position.z - wp.z);
    },
  };
  return root;
}
