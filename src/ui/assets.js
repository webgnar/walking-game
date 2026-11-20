// zack's hand-made UI art. Each name is a PNG in public/ui/. When a file exists, <html> gets the class
// "has-<name>" and the CSS swaps that element's placeholder for the image (see docs/ui-assets.md).
export const UI_ASSETS = [
  // frames and plates (9-slice)
  'plate-dark', 'plate-crimson', 'plate-steps', 'frame-panel', 'frame-brief', 'frame-steps', 'frame-res','res-wing', 'frame-id', 'tag-points', 'tag-test', 'btn-square',
  // fixed art
  'portrait', 'banner', 'radar', 'brief-sky', 'medal-steps',
  // icons
  'icon-base', 'icon-shop', 'icon-goals', 'icon-trials', 'icon-boxes', 'icon-sole', 'icon-flint', 'icon-bone', 'icon-steps', 'icon-gear', 'icon-trophy',
];

export function loadUiAssets() {
  const root = document.documentElement;
  for (const name of UI_ASSETS) {
    const img = new Image();
    img.onload = () => root.classList.add(`has-${name}`);
    img.src = `/ui/${name}.png`;
  }
}
