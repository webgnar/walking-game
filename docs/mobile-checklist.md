# Mobile web game checklist (from skate-rogue)

The phone fixes skate-rogue already went through, written so any Vercel + Three.js (or canvas) game can take them.
Tested target: a small iPhone in Brave or Safari, upright and sideways.

## 1. Picture stretches after rotating (skate-rogue PR #226)
- **What broke:** the canvas was sized in a `window` `resize` handler from `innerWidth`/`innerHeight`. iOS fires
  `resize` and `orientationchange` *before* it lays the page out in the new shape, so the handler reads the old
  size, and nothing fires once it settles. The portrait picture is stretched over landscape, then squished back.
- **Fix:** size from the canvas box (`clientWidth`/`clientHeight`), watched by a `ResizeObserver` (it reports only
  after layout), plus re-checks a frame and 100/300/700 ms after every `resize`, `orientationchange` and
  `visualViewport` resize, skipped when the size hasn't changed.
```js
let sized = '';
const check = () => {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h || `${w}x${h}` === sized) return;
  sized = `${w}x${h}`;
  renderer.setSize(w, h, false);           // false: CSS sizes the canvas, not three
  camera.aspect = w / h; camera.updateProjectionMatrix();
};
const settle = () => { check(); requestAnimationFrame(check); for (const ms of [100, 300, 700]) setTimeout(check, ms); };
new ResizeObserver(check).observe(canvas);
addEventListener('resize', settle);
addEventListener('orientationchange', settle);
visualViewport?.addEventListener('resize', settle);
check();
```
- Anything else that turns 3D into screen pixels (labels over heads, popups) uses `canvas.getBoundingClientRect()`,
  not `innerWidth`/`innerHeight`.
- **Never** go back to reading the size only inside a window resize handler.
- Headless repro: in Playwright, make `window.innerWidth/innerHeight` return the old size while calling
  `setViewportSize`, then remove the override. Old code leaves the canvas buffer at the old shape.

## 2. Page height and the browser bars
- `html, body { height: 100%; height: 100dvh; overflow: hidden; overscroll-behavior: none; }`; the game root is
  `position: fixed; inset: 0`. `100vh` on iOS is taller than what you can see.
- Viewport meta: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`.
- Keep UI off the notch and home bar: `max(12px, env(safe-area-inset-*))` on anything pinned to an edge.
- On the game root: `touch-action: none` (or `manipulation`), `user-select: none`, `-webkit-touch-callout: none`,
  `-webkit-tap-highlight-color: transparent`.

## 3. Fullscreen (PR #160)
- iPhone has no page Fullscreen API. True fullscreen = Share > Add to Home Screen, launched from the icon:
  needs `manifest.webmanifest` (`display: fullscreen`/`standalone`) and the `apple-mobile-web-app-*` meta tags.
- Elsewhere (Android, iPad, desktop) call `requestFullscreen` on a tap; offer a switch, and on iPhone show the
  Add to Home Screen steps instead.

## 4. Turning the phone shouldn't jump the camera (PRs #168, #185)
- Pick framing from the screen's shape (phones: short side <= 600 css px get a tighter frame).
- On rotation keep the subject's on-screen size and glide to the new framing on a damped spring, rather than snapping.
- All camera moves go through springs on real time (never game time, a hit-stop freezes it).

## 5. HUD that fits small phones (PR #254, #413)
- Size HUD by the short side (`min(1vh, 1.9vw)`-style units, or `vw` in a portrait media query).
- Things that sit under a bar measure the bar with a `ResizeObserver` and set a CSS variable, rather than a
  hard-coded offset, so they never overlap on a small phone.

## 6. Performance on small iPhones (PRs #203, #286, #366, #434, #444)
- Pixel ratio capped (`Math.min(devicePixelRatio, 2)`), and an adaptive step-down (effects off, then resolution)
  when frames run slow. iPhone Low Power Mode caps the page at 30 fps; treat 30 as normal there (offer a 30 fps setting).
- Compile every shader behind a loading screen (render each material once before play); never create a fresh
  material mid-run.
- Split long builds into slices of ~4 ms a frame.
- Dispose geometry and textures you throw away, instance repeated things, cull off-screen ones.
- **Never `drawImage`/`readPixels` a WebGL canvas every frame** (GPU read-back, cost 9-12 ms a frame).

## 7. Vercel
- Free tier: 100 deploys a day; each push to any branch counts. `vercel.json`
  `{"git":{"deploymentEnabled":{"**":false,"main":true}}}` deploys only main.
- Check the commit status says "Deployment has completed" before calling something live.
