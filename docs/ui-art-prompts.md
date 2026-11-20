# Image prompts for the UI pieces (ChatGPT image model)

One prompt per file in [ui-assets.md](ui-assets.md). Paste the **shared style block** first, then the piece's prompt. Each prompt says the file name, the size it must end up at, and what to paint.

## Before you start

1. **Attach the mockup (`ui-that-we-want.png`) to every request** and say "match the frame style of the mockup". This is the single biggest thing for consistency.
2. **Do one piece per chat message.** Asking for several pieces in one image gives you a sheet you have to cut up and the styles drift.
3. **Generate big, then shrink.** Ask for the largest size it offers (1536 x 1024 for wide pieces, 1024 x 1536 for the banner, 1024 x 1024 for square ones). Crop tight to the frame, then resize to the export size in the list. Never upscale.
4. **Transparency.** Ask for a transparent background. If it gives you a checkerboard pattern or a solid colour instead, ask for "a flat pure #00FF00 green background" and remove it with a cutout tool (remove.bg, Photoshop "Remove background", Photopea magic wand, or Figma's remove background).
5. **9-slice pieces need plain middles.** For plates, frames and tags, all ornament must sit in the corners and the ends. The long top and bottom edges should be a clean, even gold line, and the inside an even fill. If the model adds a flourish in the middle of an edge, ask it to remove it, or paint it out.
6. **Check the caps after you resize.** Plates: every corner detail within 64 px of the edge. Frames: within 40 px. Tags and the square button: within 24 px.
7. **Keep the lighting the same on every piece:** light from the top left, warm gold highlights, no coloured rim light, no glow halo outside the frame. The game adds the drop shadow.
8. **Reuse the winner.** Once a plate looks right, attach it along with the mockup for the next pieces: "same gold, same bevel as the attached plate".

## Shared style block (paste first every time)

```
Game UI asset for a mobile game. Style: imperial Roman sci-fi, like the Red Rising books. Ornate beveled gold metal frame with a polished, slightly worn gold rim and a thin inner gold hairline; deep crimson or charcoal fills with very subtle texture. Painterly but crisp, high detail, flat front-on view (no perspective, no tilt). Lighting from the top left, warm highlights. Match the frame style of the attached mockup exactly. Transparent background. No text, no letters, no numbers, no icons inside the frame. No drop shadow, no glow outside the frame. Centered, nothing cropped.
```

## Plates (9-slice, 64 px caps)

**plate-dark.png** (export 656 x 216, ratio about 3:1)
```
A single horizontal button plate, about 3 to 1 wide. Charcoal fill with faint stone grain. Thick beveled gold rim with a thin inner gold hairline inset from the rim. Left end square with small notched corners; right end comes to a shallow pointed chevron. The long top and bottom edges are plain and even with no ornaments, so the plate can be stretched. Empty inside.
```

**plate-crimson.png** (export 612 x 184, ratio about 3.3:1)
```
Same plate as before but with a deep crimson fill, darker at the edges, rich red in the middle. Small gold corner brackets at the top-right and bottom-left corners. Square left end with notched corners, pointed chevron right end. Plain stretchable top and bottom edges. Empty inside.
```

**plate-steps.png** (export 1008 x 214, ratio about 4.7:1)
```
A long horizontal crimson button plate, about 4.7 to 1. Left end comes to a pointed chevron, right end is square with notched corners. Beveled gold rim, thin inner gold hairline. Plain stretchable top and bottom edges. Empty inside.
```

## Frames (9-slice, 40 px caps)

**frame-id.png** (export 600 x 168, ratio about 3.6:1)
```
A name plate for a player profile. Fill fades from dark crimson on the left to near black. Gold rails along the top and bottom, the right end slanted (cut diagonally from top-right down to the left). Left end square. Plain stretchable edges. Empty inside.
```

**frame-steps.png** (export 640 x 92, ratio about 7:1)
```
A thin dark trapezoid strip, wide at the top and narrower at the bottom, about 7 to 1. Near-black fill, thin gold edge on the top and the two slanted sides. Plain and stretchable along the length. Empty inside.
```

**frame-brief.png** (export 1144 x 154, ratio about 7.4:1)
```
A long dark glassy display panel, about 7.4 to 1, with both ends pointed like an elongated hexagon. Double gold rim: a beveled outer rim and a fine inner hairline. Small bright gold glints at the two points. Plain stretchable top and bottom edges. Empty dark inside.
```

**frame-res.png** (export 676 x 90, ratio about 7.5:1)
```
A slim resource bar, about 7.5 to 1, with both ends pointed. Near-black fill, beveled gold rim, inner hairline. Plain stretchable edges. Empty inside, no dividers.
```

**frame-panel.png** (export 256 x 256)
```
A square dark panel frame for menus. Near-black fill, beveled gold rim, inner gold hairline, small ornate gold corner pieces in all four corners. Plain edges between the corners. Empty inside.
```

## Tags and buttons (9-slice, 24 px caps)

**tag-test.png** (export 176 x 66)
```
A small polished light-gold lozenge tag with pointed hex ends, about 2.7 to 1. Bright gold face, darker gold rim. Plain, no text.
```

**tag-points.png** (export 380 x 66)
```
A small dark lozenge tag with pointed hex ends, about 5.8 to 1. Near-black fill, thin gold rim. Plain, no text.
```

**btn-square.png** (export 128 x 128)
```
A square game button. Dark charcoal face, beveled gold rim, the four corners clipped at 45 degrees. Empty inside, no symbol.
```

## Fixed pieces

**portrait.png** (export 256 x 256)
```
A round portrait medallion: a gold laurel wreath ring around a circular gold frame. Inside, a bronze-and-gold Roman bust in profile facing right, on a dark background. Square image, medallion fills it.
```
(If you want the hero's face here later, ask for the frame only with "empty dark circle inside".)

**medal-steps.png** (export 256 x 256)
```
A round gold coin medallion with a laurel wreath around the edge and a deep crimson center. Leave the crimson center empty. Square image, coin fills it.
```

**radar.png** (export 128 x 128)
```
A small circular gold radar display: two thin concentric rings, a crosshair, tick marks around the edge, on a transparent background. Thin gold lines only, slightly glowing.
```

**brief-sky.png** (export 256 x 128)
```
A small inset illustration: a dark cliff with a gold-lit castle of tall spires on the right, warm gold lights in the windows, dark red sky. The image fades to fully transparent toward the left edge. Wide 2 to 1.
```

**res-wing.png** (export 128 x 128)
```
A single stylized gold eagle wing, pointing to the left, feathers swept back, polished beveled gold like the frames. Transparent background.
```

**banner.png** (export 474 x 1036, tall)
```
A tall hanging war banner. An iron and gold pole runs down the left side and across the top, with a round gold finial on the right end of the top bar. A deep crimson cloth hangs from the top bar with soft vertical folds and a gold laurel wreath near the top. The bottom of the cloth is a swallowtail. Front-on, transparent background.
```

## Icons (fixed, transparent)

Use this line before each icon prompt:
```
Single game icon, polished beveled gold metal, front-on, transparent background, no text, matching the gold of the attached mockup.
```

- **icon-base.png** (160): `A gold citadel of tall thin spires, like the BASE icon in the mockup.`
- **icon-shop.png** (160): `A gold shopping cart with a single eagle wing on its left side.`
- **icon-goals.png** (160): `A gold target with crosshair inside a laurel wreath.`
- **icon-trials.png** (160): `Two crossed gold swords inside a laurel wreath.`
- **icon-boxes.png** (160): `A gold-banded wooden treasure chest, closed.`
- **icon-sole.png** (96): `A pair of bare footprints in gold.`
- **icon-flint.png** (96): `A rough grey flint stone with gold edge highlights.`
- **icon-bone.png** (96): `A single pale bone with gold edge highlights.`
- **icon-steps.png** (128): `A pair of bare footprints glowing warm orange-gold.`
- **icon-gear.png** (128): `A gold settings gear.`
- **icon-trophy.png** (128): `A gold trophy cup with two handles.`

## After you have them

Rename each file exactly as above, put them in `public/ui/`, and push (or send them to me). Missing files keep their placeholder, so you can deliver them in any order.
