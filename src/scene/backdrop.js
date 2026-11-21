// Painted backdrop behind the 3D scene: crimson haze sky, huge red moon, the citadel on the cliff (Home mockup).
// It is an image slot: if public/ui/backdrop-home.png exists it replaces this placeholder painting.
// Drawn as scene.background, cover-fitted to the screen so the painted horizon stays where the 3D ground ends.
import * as THREE from 'three';
import { mulberry } from './models.js';

const W = 2048, H = 1152;          // 16:9, same as the UI mockup
export const HORIZON = 0.42;       // fraction from the top where the 3D ground meets the painting

function paint() {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const rng = mulberry(11);

  // sky: near-black at the top, hazy crimson toward the horizon
  const sky = g.createLinearGradient(0, 0, 0, H * HORIZON);
  sky.addColorStop(0, '#1c0c10');
  sky.addColorStop(0.45, '#3e161a');
  sky.addColorStop(0.85, '#5a2119');
  sky.addColorStop(1, '#6e2d1d');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);

  // faint stars high up
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(255,220,200,${0.15 + rng() * 0.35})`;
    g.fillRect(rng() * W, rng() * H * 0.22, 1.5, 1.5);
  }

  // the red moon, right of centre, with a wide glow
  const mx = W * 0.80, my = H * 0.29, mr = H * 0.08;
  const glow = g.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 4);
  glow.addColorStop(0, 'rgba(200,60,40,.45)'); glow.addColorStop(1, 'rgba(200,60,40,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  const moon = g.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
  moon.addColorStop(0, '#e0765a'); moon.addColorStop(0.6, '#b23a28'); moon.addColorStop(1, '#7a1d16');
  g.fillStyle = moon; g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(90,20,16,.35)';
  for (let i = 0; i < 9; i++) {
    const a = rng() * Math.PI * 2, d = rng() * mr * 0.7, r = mr * (0.06 + rng() * 0.14);
    g.beginPath(); g.arc(mx + Math.cos(a) * d, my + Math.sin(a) * d, r, 0, Math.PI * 2); g.fill();
  }

  // haze bands across the moon and the horizon
  for (let i = 0; i < 5; i++) {
    const y = H * (0.25 + i * 0.04);
    const band = g.createLinearGradient(0, y - 20, 0, y + 20);
    band.addColorStop(0, 'rgba(120,40,30,0)'); band.addColorStop(0.5, 'rgba(120,40,30,.18)'); band.addColorStop(1, 'rgba(120,40,30,0)');
    g.fillStyle = band; g.fillRect(0, y - 20, W, 40);
  }

  const hz = H * HORIZON;
  // far ridge, low and soft, across the whole width
  g.fillStyle = '#3a1a18';
  g.beginPath(); g.moveTo(0, hz);
  for (let x = 0; x <= W; x += 32) g.lineTo(x, hz - 30 - Math.sin(x * 0.004) * 20 - rng() * 14);
  g.lineTo(W, hz + 40); g.lineTo(0, hz + 40); g.fill();

  // distant thin spires, centre right
  g.fillStyle = '#2a1416';
  for (const [x, h] of [[0.6, 0.11], [0.615, 0.15], [0.63, 0.09], [0.67, 0.12]]) spire(g, W * x, hz - 30, W * 0.006, H * h);

  // the cliff the citadel stands on (right side), rising from the horizon
  const cliff = '#1d0f10';
  g.fillStyle = cliff;
  g.beginPath(); g.moveTo(W * 0.64, hz + 10);
  g.lineTo(W * 0.66, hz - 40); g.lineTo(W * 0.72, hz - 60); g.lineTo(W * 0.78, hz - 90); g.lineTo(W * 0.84, hz - 110);
  g.lineTo(W * 0.9, hz - 150); g.lineTo(W, hz - 170); g.lineTo(W, hz + 40); g.fill();

  // the citadel: walls, towers, one tall keep, all one dark silhouette
  const base = hz - 110;
  const blocks = [
    [0.68, 0.72, 0.04], [0.71, 0.75, 0.06], [0.75, 0.84, 0.02], [0.835, 0.865, 0.1],
    [0.86, 0.905, 0.24], [0.90, 0.95, 0.15], [0.94, 1.0, 0.11],
  ];
  g.fillStyle = '#170c0e';
  for (const [x0, x1, h] of blocks) {
    const top = base - H * h;
    g.fillRect(W * x0, top, W * (x1 - x0), (hz + 20) - top);
    // crenellations
    for (let x = W * x0; x < W * x1 - 6; x += 14) g.fillRect(x, top - 8, 8, 8);
  }
  for (const [x, h] of [[0.865, 0.33], [0.8825, 0.37], [0.90, 0.32], [0.925, 0.24], [0.85, 0.19], [0.73, 0.13], [0.97, 0.2]]) spire(g, W * x, base - H * (h - 0.06), W * 0.007, H * 0.07);

  // lit windows
  for (let i = 0; i < 70; i++) {
    const b = blocks[Math.floor(rng() * blocks.length)];
    const x = W * (b[0] + rng() * (b[1] - b[0]));
    const y = base - H * b[2] * rng() * 0.9;
    g.fillStyle = `rgba(255,${150 + rng() * 60},70,${0.55 + rng() * 0.45})`;
    g.fillRect(x, y, 3, 6);
    g.fillStyle = 'rgba(255,150,60,.12)';
    g.fillRect(x - 4, y - 4, 11, 14);
  }
  // a lit line of windows along the lower wall
  for (let x = W * 0.66; x < W * 0.86; x += 18) { g.fillStyle = 'rgba(255,170,80,.7)'; g.fillRect(x, hz - 64 - (x - W * 0.66) * 0.18, 3, 4); }

  // crimson banner with a gold eagle on the keep
  const bx = W * 0.905, by = base - H * 0.13, bw = W * 0.035, bh = H * 0.16;
  g.fillStyle = '#7a1712';
  g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + bw, by); g.lineTo(bx + bw, by + bh); g.lineTo(bx + bw / 2, by + bh * 0.9); g.lineTo(bx, by + bh); g.fill();
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(bx + bw * 0.7, by, bw * 0.3, bh * 0.92);
  g.fillStyle = '#d9a54a';
  const ex = bx + bw / 2, ey = by + bh * 0.3;
  g.beginPath(); g.moveTo(ex, ey - 10); g.lineTo(ex + 18, ey - 4); g.lineTo(ex + 6, ey + 2); g.lineTo(ex + 4, ey + 16); g.lineTo(ex, ey + 10);
  g.lineTo(ex - 4, ey + 16); g.lineTo(ex - 6, ey + 2); g.lineTo(ex - 18, ey - 4); g.fill();

  // warm glow where the citadel meets the haze
  const cg = g.createRadialGradient(W * 0.85, hz - 60, 10, W * 0.85, hz - 60, W * 0.2);
  cg.addColorStop(0, 'rgba(255,110,50,.18)'); cg.addColorStop(1, 'rgba(255,110,50,0)');
  g.fillStyle = cg; g.fillRect(0, 0, W, H);

  // below the horizon: dark ground the 3D floor fades into
  const gr = g.createLinearGradient(0, hz, 0, H);
  gr.addColorStop(0, '#3a1d17'); gr.addColorStop(1, '#1a0f0c');
  g.fillStyle = gr; g.fillRect(0, hz + 20, W, H);
  return c;
}

function spire(g, x, baseY, w, h) {
  g.beginPath(); g.moveTo(x - w, baseY); g.lineTo(x - w * 0.6, baseY - h * 0.7); g.lineTo(x, baseY - h); g.lineTo(x + w * 0.6, baseY - h * 0.7); g.lineTo(x + w, baseY); g.fill();
}

// Returns a texture with a .fit(aspect) method that cover-fits it to the screen with the painting's horizon
// pinned at HORIZON on screen (where the 3D ground ends), zooming in a little if it has to.
export function buildBackdrop(onSwap) {
  let tex = new THREE.CanvasTexture(paint());
  tex.colorSpace = THREE.SRGBColorSpace;
  let imgAspect = W / H, hz = HORIZON;
  const fit = (aspect) => {
    // visible fraction of the image height: cover the screen, and keep room above/below the horizon
    const ry = Math.min(1, imgAspect / aspect, (1 - hz) / (1 - HORIZON), hz / HORIZON);
    const rx = ry * aspect / imgAspect;
    const t0 = hz - HORIZON * ry;
    tex.userData.lastAspect = aspect;
    tex.repeat.set(rx, ry);
    tex.offset.set((1 - rx) * 0.75, 1 - t0 - ry); // horizontally, keep the citadel side in view
  };
  tex.userData.fit = fit;
  // image slot: zack's painted backdrop replaces the placeholder when present
  const img = new Image();
  img.onload = () => {
    // a new texture: WebGL can't resize the old one in place
    const last = tex.userData.lastAspect;
    tex.dispose();
    tex = new THREE.Texture(img);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    tex.userData.fit = fit;
    imgAspect = img.width / img.height;
    hz = BACKDROP_HORIZON;
    if (last) fit(last);
    if (onSwap) onSwap(tex);
  };
  img.src = '/ui/backdrop-home.jpg';
  return tex;
}

// Where the horizon sits in public/ui/backdrop-home.jpg (fraction from the top).
const BACKDROP_HORIZON = 0.462;
