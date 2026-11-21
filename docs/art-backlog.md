# Art backlog

What the game still needs drawn or modeled. Everything in the build today that isn't zack's (hero, club, UI art) is a stand-in. Track progress here; UI frame and icon sheets are specified in [ui-assets.md](ui-assets.md).

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| 1 | **Opening cutscene**, black-and-white anime style: 8 shots | To do (iterating together) | Shot list and a brief per shot in `INTRO_CUTSCENE` (`src/data/story.js`); also the 2-shot memory flicker (`FLICKERS`) and the Era 1 flashback (`FLASHBACKS`). Files go in `public/cutscenes/` (about 1600x900, landscape). |
| 2 | **Wearable gear**, first drafts for the 5 slots: weapon, armor, helm, offhand, trinket | To do | One base design per slot, then variations per tier (shop, crafted, boss, rare). Must match the hero's sculpted style and fit his rig. Until then the hero shows only zack's club. |
| 3 | **Icons** for all gear, materials, boosters, blueprints, crafting items | To do | Replaces the emoji in the inventory, shop, Workshop and loot reveals. One consistent style, matching the imperial UI. |
| 4 | **Base buildings**: Workshop (Crafting Studio), Hero Training Altar, Inventory, Shrine, Truth Board | To do | Three tiers each for the Primal era. |
| 5 | **Enemies** | Started: mangy wolf reference | Mangy Wolf, Wolf, Beta Wolf, Alpha Wolf; Cave Hyena; Mountain Lion; Sabretooth; Enraged Elk; Woolly Rhino; Great Woolly Mammoth. Reference: [mangy wolf](art/reference/mangy-wolf.webp). |

## Enemy art direction (from the mangy wolf reference)

Realistic painted creatures: matted fur, visible ribs and bald mange patches, amber eyes, bared teeth, a low hunting stance, warm rim light. Each family should read as a step up the ladder: mangy (starved, patchy) → wolf (lean, healthy) → beta (bigger, scarred) → alpha (huge, dark, white mane).

The game is 3D, so each 2D painting is a concept for a 3D model. Each creature also needs a few animations: idle, attack, hit, death (and a wind-up for the lion, elk, rhino and mammoth).
