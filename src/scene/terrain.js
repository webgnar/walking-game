// Painted ground and rock textures (zack's tileable dirt, rocky ground and rock wall, public/textures/).
// Ground: dirt and rocky ground blended by a soft noise mask, each sampled at two scales and angles so
// the repeat doesn't show. Rocks: the rock wall projected from three sides (triplanar), so any shape
// takes it without UVs, with dirt creeping up their bases. Normal maps baked from each texture's
// brightness (the -n.jpg files, 512px) give relief so the firelight and rim light catch the cracks.
import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const cache = {};
function tex(name, color = true) {
  if (cache[name]) return cache[name];
  const t = loader.load(`/textures/${name}.jpg`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return (cache[name] = t);
}

// world position + normal for the fragment shader
const VERT_DECL = 'varying vec3 vWP;\nvarying vec3 vWN;\n';
const VERT_BODY = `#include <project_vertex>
  vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vWN = normalize(mat3(modelMatrix) * objectNormal);`;

const FRAG_COMMON = `varying vec3 vWP;
varying vec3 vWN;
vec3 tN;
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { return vnoise(p) * .55 + vnoise(p * 2.03 + 7.1) * .3 + vnoise(p * 4.1 + 3.7) * .15; }
vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }
float lum(vec3 c) { return dot(c, vec3(.3, .55, .15)); }
vec3 nrm(sampler2D t, vec2 uv, float k) { vec3 n = texture2D(t, uv).xyz * 2. - 1.; n.xy *= k; return n; }
`;

function patch(mat, uniforms, fragDecl, mapCode) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = VERT_DECL + sh.vertexShader.replace('#include <project_vertex>', VERT_BODY);
    sh.fragmentShader = FRAG_COMMON + fragDecl + sh.fragmentShader
      .replace('#include <map_fragment>', mapCode)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  normal = normalize(mat3(viewMatrix) * tN);`);
  };
  mat.customProgramCacheKey = () => mat.name;
  return mat;
}

let groundMat, rockMat;

export function groundMaterial() {
  if (groundMat) return groundMat;
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 });
  m.name = 'terrain-ground';
  groundMat = patch(m, {
    tDirt: { value: tex('dirt') }, tRocky: { value: tex('rocky-ground') },
    nDirt: { value: tex('dirt-n', false) }, nRocky: { value: tex('rocky-ground-n', false) },
  },
    'uniform sampler2D tDirt;\nuniform sampler2D tRocky;\nuniform sampler2D nDirt;\nuniform sampler2D nRocky;\n',
    `{
  vec2 p = vWP.xz;
  // dirt at two scales and angles, mixed by noise, hides the tile
  vec3 d1 = texture2D(tDirt, p * .34).rgb;
  vec3 d2 = texture2D(tDirt, rot(p, 1.1) * .13 + .37).rgb;
  vec3 dirt = mix(d1, d2, smoothstep(.3, .7, fbm(p * .21 + 4.)));
  vec3 rocky = texture2D(tRocky, rot(p, -.6) * .26).rgb;
  // rocky patches out among the boulders; the fighting ground stays mostly dirt
  float r = length(p - vec2(.3, .2));
  float m = smoothstep(.45, .6, fbm(p * .16 + 2.) + smoothstep(2.5, 8., r) * .3 - .1);
  // let the rock show first where the rocky texture is bright (its stones), so the edge breaks up
  m = clamp(m + (lum(rocky) - .3) * m * (1. - m) * 3., 0., 1.);
  vec3 col = mix(dirt, rocky, m);
  // broad light/dark variation and a little darker, damper ground near the fight
  col *= mix(.7, 1.12, fbm(p * .07 + 11.));
  // pull the orange down a touch and push contrast, so it reads as earth under red light, not paint
  col = mix(vec3(lum(col)), col, .82);
  col = pow(col, vec3(1.12)) * 1.05;
  // relief: tangent normals (u = world x, v = world z), the rotated samples turned back
  vec3 nd = nrm(nDirt, p * .34, 1.4);
  vec3 nr = nrm(nRocky, rot(p, -.6) * .26, 1.3); nr.xy = rot(nr.xy, .6);
  vec3 tn = normalize(mix(nd, nr, m));
  tN = normalize(vec3(tn.x, tn.z, tn.y));
  diffuseColor.rgb *= col;
}`);
  return groundMat;
}

export function rockMaterial() {
  if (rockMat) return rockMat;
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
  m.name = 'terrain-rock';
  rockMat = patch(m, { tRock: { value: tex('rock-wall') }, tDirt: { value: tex('dirt') }, nRock: { value: tex('rock-wall-n', false) } },
    'uniform sampler2D tRock;\nuniform sampler2D tDirt;\nuniform sampler2D nRock;\n',
    `{
  vec3 n = normalize(vWN);
  vec3 w = pow(abs(n), vec3(4.)); w /= (w.x + w.y + w.z);
  vec3 q = vWP * .11;
  vec3 col = texture2D(tRock, q.zy).rgb * w.x + texture2D(tRock, q.xz + .5).rgb * w.y + texture2D(tRock, q.xy + .25).rgb * w.z;
  // dirt and dust where the rock meets the ground
  float base = 1. - smoothstep(.0, .7 + fbm(vWP.xz * .8) * .6, vWP.y);
  col = mix(col, texture2D(tDirt, vWP.xz * .34).rgb * .9, base * .85);
  // tops catch a little more light than the undersides
  col *= mix(.72, 1.08, n.y * .5 + .5);
  // triplanar relief (whiteout blend)
  vec3 nx = nrm(nRock, q.zy, 1.2), ny = nrm(nRock, q.xz + .5, 1.2), nz = nrm(nRock, q.xy + .25, 1.2);
  nx = vec3(nx.xy + n.zy, abs(nx.z) * n.x);
  ny = vec3(ny.xy + n.xz, abs(ny.z) * n.y);
  nz = vec3(nz.xy + n.xy, abs(nz.z) * n.z);
  tN = normalize(nx.zyx * w.x + ny.xzy * w.y + nz * w.z);
  diffuseColor.rgb *= col;
}`);
  return rockMat;
}

// A rough boulder: an icosphere pushed in and out by noise, squashed a little.
export function boulderGeometry(size, seed, squash = 0.75) {
  const geo = new THREE.IcosahedronGeometry(size, 3);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const s = seed * 13.7;
  const n3 = (x, y, z) => Math.sin(x * 1.7 + s) * Math.sin(y * 2.3 + s * 0.7) * Math.sin(z * 1.9 + s * 1.3);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const d = v.clone().normalize();
    // big lumps + smaller chips + flat-ish cut faces
    let k = 1 + 0.22 * n3(d.x * 1.3, d.y * 1.3, d.z * 1.3) + 0.08 * n3(d.x * 4, d.y * 4, d.z * 4);
    k = Math.min(k, 1.08 - 0.06 * Math.sin(s));
    v.multiplyScalar(k);
    v.y *= squash;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}
