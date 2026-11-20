# UI asset list (imperial UI)

The Home screen matches `ui-that-we-want.png`. Every framed piece is an **image slot**. Until a PNG exists the game draws a CSS placeholder in the same shape. When you drop a PNG into `public/ui/` with the exact file name below, the game picks it up on the next load. No code change is needed.

## How it works

- **Folder:** `public/ui/<name>.png` (lowercase, dashes). Example: `public/ui/plate-dark.png`.
- **Canvas:** author everything as if the screen were **2560 x 1440** (16:9). The sizes below are at that scale. The game scales them to the device.
- **Transparent background** on every file (PNG with alpha). Nothing behind the frame, no drop shadow baked in (the game adds the shadow).
- **No text in the art.** Labels, subtitles, numbers and the subject line are live text drawn by the game, so they can change and translate.
- **No icons inside plates.** Plate icons are their own files, placed by the game.

### 9-slice pieces

A 9-slice image is cut into a 3x3 grid. The four corners are drawn as-is, the edges stretch in one direction, and the middle stretches both ways. That lets one plate image fit BASE (tall) and SHOP (shorter) without distortion.

Rules for a 9-slice file:
- Keep every corner detail (bevels, notches, pointed ends, rivets) **inside the cap distance** from each edge: **64 px** for plates, **40 px** for frames, **24 px** for tags and square buttons.
- The band between the caps must be **plain and stretchable**: a straight gold edge line and an even fill, no ornaments, no gradient that only makes sense at one length. A gentle vertical gradient is fine; a horizontal one will smear.
- The middle (fill) area should be a flat or vertically-graded fill. Any texture there will stretch.

### Fixed pieces

Drawn at a fixed aspect, scaled as a whole. Paint all the detail you want.

## The list

Position and size are % of the screen (x from left, y from top), measured from the mockup at 1672 x 941.

| File | Element | Type | Cap | Export size (px) | Position / size on screen | Paint |
|---|---|---|---|---|---|---|
| `plate-dark.png` | BASE, SHOP, GOALS, BOXES plates | 9-slice | 64 | 656 x 216 | BASE x 2.4%, y 30.8%, 25.6% x 15%. SHOP/GOALS 25.6% x 10.6%, gap 1.7%. BOXES x 74.4%, 23.9% x 11.1% | Charcoal fill with faint stone grain, thick beveled gold rim, a thin inner gold hairline inset ~12 px, right end pointed (chevron), left end square with small corner notches |
| `plate-crimson.png` | TRIALS plate | 9-slice | 64 | 612 x 184 | x 74.4%, y 35.3%, 23.9% x 12.8% | Same frame as plate-dark but deep crimson fill (#6e1712 to #3a0c0a), small gold corner brackets (top-right and bottom-left in the mockup) |
| `plate-steps.png` | +100 STEPS button | 9-slice | 64 | 1008 x 214 | x 55%, y 82%, 39.3% x 14.8% | Crimson fill, gold bevel, pointed left end, square right end, inner hairline |
| `medal-steps.png` | Laurel medallion on +100 STEPS | fixed | - | 256 x 256 | 14.5% of screen height, overlaps the plate's left end | Round gold coin with laurel wreath ring, crimson center (the footprints are `icon-steps.png`, keep the center empty) |
| `tag-test.png` | TEST tag | 9-slice | 24 | 176 x 66 | 6.8% x 4.6%, right side of the steps plate | Polished light-gold lozenge (hex ends), darker gold rim |
| `tag-points.png` | "4 POINTS TO SPEND" | 9-slice | 24 | 380 x 66 | x 39.7%, y 77.5%, 14.8% x 4.6% | Dark lozenge, thin gold rim, hex ends |
| `btn-square.png` | Gear and trophy buttons | 9-slice | 24 | 128 x 128 | Gear x 1%, y 1.7%, 5.8% of height. Trophy x 94.6%, y 84.5%, 8% of height | Dark square, gold bevel, clipped corners |
| `frame-id.png` | PRIMAL / SUBJECT / LEVEL plate | 9-slice | 40 | 600 x 168 | x 11.5%, y 0.2%, 23% x 11.6% | Crimson-to-dark fill, gold top and bottom rails, slanted right end, a gold rule between SUBJECT and LEVEL |
| `portrait.png` | Portrait medallion | fixed | - | 256 x 256 | x 5.3%, y 0.5%, 13.5% of height | Gold laurel ring around a round frame; the bust goes inside (or leave hollow for a future hero portrait) |
| `frame-steps.png` | TODAY 0 STEPS strip | 9-slice | 40 | 640 x 92 | x 37%, y 4.4%, 25% x 6.4% | Dark trapezoid, thin gold top and side edges. The 10 segments are drawn by the game |
| `frame-brief.png` | COMMAND BRIEF // SIGNAL panel | 9-slice | 40 | 1144 x 154 | x 27.6%, y 11.4%, 44.6% x 10.6% | Dark glassy fill, double gold rim, pointed hex ends, bright gold glints at the points |
| `radar.png` | Radar inset in the brief | fixed | - | 128 x 128 | 7.6% of height, left of the brief | Gold radar: two rings, crosshair, faint sweep. The game adds the spinning sweep on top |
| `brief-sky.png` | Skyline inset in the brief | fixed | - | 256 x 128 | right end of the brief, ~10% wide | Gold-lit castle spires on a cliff, fading to transparent on the left |
| `frame-res.png` | Resource bar (soles, flint, bone) | 9-slice | 40 | 676 x 90 | x 69%, y 1.8%, 26.4% x 6.2% | Dark fill, gold rim, pointed ends. The two vertical dividers are drawn by the game |
| `res-wing.png` | Wing on each end of the resource bar | fixed | - | 128 x 128 | left wing x 66.2%, right x 94.6% (mirrored), 7% of height | Gold eagle wing pointing **left** (the game mirrors it for the right side) |
| `banner.png` | Hanging crimson banner with laurel | fixed | - | 474 x 1036 | x 0, y 13%, 18.5% x 72% | Iron/gold pole with finial on the left and across the top, crimson cloth with a gold laurel near the top, swallowtail bottom. Sits behind the left plates |
| `frame-panel.png` | Generic panel and modal frame (Settings, Shop, Hero, etc.) | 9-slice | 40 | 256 x 256 | any | Dark fill, gold rim, inner hairline, small corner ornaments |

### Icons (all fixed, transparent)

| File | Where | Export size | Shown at |
|---|---|---|---|
| `icon-base.png` | BASE plate | 160 x 160 | 9% of height |
| `icon-shop.png` | SHOP plate (winged cart) | 160 x 160 | 7% |
| `icon-goals.png` | GOALS plate (target in laurel) | 160 x 160 | 7% |
| `icon-trials.png` | TRIALS plate (crossed swords in laurel) | 160 x 160 | 9% |
| `icon-boxes.png` | BOXES plate (treasure chest) | 160 x 160 | 7% |
| `icon-sole.png` | Resource bar: footprints / soles | 96 x 96 | 3.6% |
| `icon-flint.png` | Resource bar: flint stone | 96 x 96 | 3.6% |
| `icon-bone.png` | Resource bar: bone | 96 x 96 | 3.6% |
| `icon-steps.png` | Center of the steps medallion (footprints) | 128 x 128 | 6% |
| `icon-gear.png` | Settings button | 128 x 128 | 70% of the button |
| `icon-trophy.png` | Trophy button | 128 x 128 | 70% of the button |

## Live text (not in the art)

Font is Cinzel for titles and Saira for small caps. These stay as text: PRIMAL, SUBJECT 7,301,224, LEVEL III, TODAY 0 STEPS · NEXT LOOT BOX IN 1,000, COMMAND BRIEF // SIGNAL 0%, the brief headline and line, the resource numbers, plate labels (BASE, SHOP, GOALS, TRIALS, BOXES), subtitles (Command · Develop · Survive, Supply · Gear · Upgrade, Missions · Progress · Rewards, Prove · Rank · Ascend, Loot · Rewards · Artifacts), 4 POINTS TO SPEND, +100 STEPS, HOLD TO KEEP WALKING, TEST.

## Backdrop (castle, moon, sky)

| File | Element | Type | Export size | Paint |
|---|---|---|---|---|
| `backdrop-home.jpg` | Sky, red moon, citadel on the cliff | fixed, **opaque** (no transparency) | 2560 x 1440 | Hazy crimson sky, huge red moon at about 80% across and 30% down, the dark citadel with lit windows and a crimson eagle banner on the cliff on the right. **The horizon (where the far ground meets the cliffs) must sit at 42% from the top**, because the 3D ground, rocks, hero and fire are drawn in front of it and end there. Below the horizon, plain dark ground. No hero, no fire, no rocks in the foreground: those are 3D. |

Until it exists, the game paints a placeholder version of the same scene (src/scene/backdrop.js). It sits behind every screen, cover-fitted, with the horizon kept in place on wider phones.

## Checking your art

Drop the PNGs into `public/ui/`, push, and open the game. Any file that is missing just keeps its placeholder, so you can deliver pieces one at a time. Image prompts for each piece are in [ui-art-prompts.md](ui-art-prompts.md).

## Delivered (2026-11-20)

The first full set came from 8 ChatGPT sheets. They were cut on the green key, resized, and put in `public/ui/`.
- **Right column plates** (TRIALS, BOXES) use mirrored copies `plate-dark-r.png` and `plate-crimson-r.png`, so their pointed ends face the hero.
- **9-slice caps** come from each piece's real art, not the 64/40/24 defaults. They are listed in the "image slots" block of src/ui/styles.css. If you replace a piece with different proportions, its caps may need a tweak.
- **Backdrop** is `backdrop-home.jpg`, with its horizon at 46.2% from the top (BACKDROP_HORIZON in src/scene/backdrop.js).
