# Icon list (second pass)

Every icon the game shows, 112 in all. Each one is an emoji placeholder in the build today. Drop a PNG named `<id>.png` into `src/icons/` and push: the game shows the PNG instead of the emoji on the next build. Nothing else to wire. Missing files keep their emoji, so icons can arrive in any order.

8 are already done: they reuse your gold menu icons from `public/ui/` (marked **done** below). That leaves **104 to make**.

The code side is `src/ui/gameIcons.js` (id → emoji). `tests/icons.test.js` fails if an id is added there and not here, or the other way round.

## Two styles

- **O, object icons** (things you own: materials, parts, boosters, chests, gear). A painted, realistic Stone Age object, the way the backgrounds are painted, with a thin warm gold edge light so it sits in the imperial UI.
- **E, emblem icons** (actions, skills, statuses, stats). Polished beveled gold, front-on, exactly like the BASE / SHOP / GOALS icons you already made.

Both: no frame and no backing plate (the game draws rarity frames and plates around them), no text, light from the top left.

## How to make them with ChatGPT

ChatGPT does one image per request, so the icons are grouped into 13 sheets of up to 9 (6 of painted objects, 7 of gold emblems; the gear sheets are worth doing after the 3D wearables so they match), the same way as the UI sheets in [ui-art-batches.md](ui-art-batches.md). Send a sheet request, send me the image, and I cut, name and install each icon (or cut them yourself: export each at **128 x 128**, transparent PNG).

1. Attach the mockup (`UI that we want.png`) and, once you have a good one, an earlier icon sheet, and say "same style as the attached icons".
2. Paste the sheet request below as is.
3. If an icon comes out wrong, redo just that one with: "Single game icon, [style line], [its prompt], flat pure #00FF00 green background."

**Style line O:** `Painted game item icon. Realistic, richly detailed painterly Stone Age object, single object centred, slight three-quarter view, warm light from the top left, a thin warm gold rim light on the edges, readable at small size. No frame, no plate, no text, no shadow.`

**Style line E:** `Game icon in polished beveled gold metal, front-on, exactly like the gold menu icons in the attached mockup, bold simple silhouette readable at small size, light from the top left. No frame, no plate, no text, no glow outside.`

## Sheet requests

### Sheet 1 (objects): Currencies and rewards, Materials and beast parts

```
Attached is my game UI mockup. Make ONE image, 1:1 square, flat pure #00FF00 green background. 9 separate game icons in a 3 by 3 grid, same size, wide green gaps, none touching. In reading order:
1. an old bronze coin stamped with two curved arrows chasing each other in a circle
2. a rolled sheet of tanned hide tied with sinew, a charcoal diagram of a club peeking out
3. a torn scrap of glowing pale data-parchment with faint red redacted lines, one corner burnt
4. an ornate gold key whose bow is a mammoth head with ivory tusks, a red gem in the eye
5. a rolled parchment scroll with a red wax seal
6. a short split log with bark and visible rings, gold edge highlights
7. one long curved wolf fang, ivory with a dark root, a drop of dried blood
8. a single hooked big-cat claw, glossy dark keratin
9. a broken-off forked antler tip, velvet worn away
Style: Painted game item icons. Realistic, richly detailed painterly Stone Age objects, each centred, slight three-quarter view, warm light from the top left, a thin warm gold rim light on the edges, readable at small size. NO text, no frames, no plates or background shapes behind the icons, no shadow or glow outside.
```
Files, in order: `cur-respec.png`, `cur-blueprint.png`, `cur-fragment.png`, `cur-era-key.png`, `cur-report.png`, `mat-wood.png`, `part-fang.png`, `part-claw.png`, `part-tine.png`

### Sheet 2 (objects): Materials and beast parts, Boosters, Loot boxes

```
Attached is my game UI mockup. Make ONE image, 1:1 square, flat pure #00FF00 green background. 9 separate game icons in a 3 by 3 grid, same size, wide green gaps, none touching. In reading order:
1. a folded square of thick wrinkled grey rhino hide with coarse hair at the edge
2. a glowing coal, black crust cracked with bright orange heat inside
3. a small clay flask stoppered with leather, green herbal brew glowing faintly at the neck
4. an intricate knot of red cord with a small gold bead and a tiny bone charm
5. a shallow stone bowl of red ochre paste with two finger streaks
6. a small plain wooden chest bound with dull bronze bands
7. a wooden chest bound with polished silver bands and a silver lock
8. a crimson-lacquered chest bound in gold with laurel corner pieces
9. a pale white-gold chest with blue-white gems set in the lid
Style: Painted game item icons. Realistic, richly detailed painterly Stone Age objects, each centred, slight three-quarter view, warm light from the top left, a thin warm gold rim light on the edges, readable at small size. NO text, no frames, no plates or background shapes behind the icons, no shadow or glow outside.
```
Files, in order: `part-hide.png`, `part-ember.png`, `boost-stride-brew.png`, `boost-lucky-knot.png`, `boost-warpaint.png`, `box-bronze.png`, `box-silver.png`, `box-gold.png`, `box-platinum.png`

### Sheet 3 (objects): Loot boxes, Gear slots, Gear items

```
Attached is my game UI mockup. Make ONE image, 1:1 square, flat pure #00FF00 green background. 9 separate game icons in a 3 by 3 grid, same size, wide green gaps, none touching. In reading order:
1. a black chest with ornate gold filigree, warm orange light leaking from the seam
2. a deep blue chest scattered with gold star inlays, starlight spilling from the seam
3. a simple wooden club bound with leather at the grip
4. a fur and hide chest wrap, stitched with sinew
5. a simple leather and bone cap
6. a small round shield of bark and hide
7. a necklace of carved bone beads and one tooth
8. a wooden club with a knapped stone lashed to the head
9. a plain tan hide wrapped as a chest piece, tied with thongs
Style: Painted game item icons. Realistic, richly detailed painterly Stone Age objects, each centred, slight three-quarter view, warm light from the top left, a thin warm gold rim light on the edges, readable at small size. NO text, no frames, no plates or background shapes behind the icons, no shadow or glow outside.
```
Files, in order: `box-legendary.png`, `box-celestial.png`, `slot-weapon.png`, `slot-armor.png`, `slot-helm.png`, `slot-offhand.png`, `slot-trinket.png`, `gear-stone-club.png`, `gear-hide-wrap.png`

### Sheet 4 (objects): Gear items

```
Attached is my game UI mockup. Make ONE image, 1:1 square, flat pure #00FF00 green background. 9 separate game icons in a 3 by 3 grid, same size, wide green gaps, none touching. In reading order:
1. a cap made from the top of a small animal skull, lined with fur
2. a round shield of layered bark with a hide grip
3. a single wolf tooth on a leather cord
4. a smooth river stone with a glowing orange vein, on a cord
5. a split, splintered wooden club, clearly worn out
6. a ragged torn piece of hide armor with holes
7. a few plain pebbles on frayed string
8. a heavy club studded with sharp black flint shards
9. a chest piece of overlapping bone plates laced together
Style: Painted game item icons. Realistic, richly detailed painterly Stone Age objects, each centred, slight three-quarter view, warm light from the top left, a thin warm gold rim light on the edges, readable at small size. NO text, no frames, no plates or background shapes behind the icons, no shadow or glow outside.
```
Files, in order: `gear-skull-cap.png`, `gear-bark-shield.png`, `gear-tooth-charm.png`, `gear-ember-stone.png`, `gear-cracked-club.png`, `gear-torn-hide.png`, `gear-pebble-string.png`, `gear-flint-club.png`, `gear-bone-mail.png`

### Sheet 5 (objects): Gear items

```
Attached is my game UI mockup. Make ONE image, 1:1 square, flat pure #00FF00 green background. 9 separate game icons in a 3 by 3 grid, same size, wide green gaps, none touching. In reading order:
1. a helm built from bone plates with cheek guards
2. a small wooden buckler with a ring of flint spikes
3. a charm of three wolf fangs fanned on a cord with a grey fur tuft
4. a grey wolf pelt cloak with the wolf head as a shoulder piece
5. a mask made from a tawny mountain lion face
6. a buckler rimmed with big-cat claws
7. a small carved wooden totem with a glowing coal set in its chest
8. a crown of dark bone spikes with a pale blue storm-glass eye at the front
9. a shield of glossy black obsidian plates bound in gold wire
Style: Painted game item icons. Realistic, richly detailed painterly Stone Age objects, each centred, slight three-quarter view, warm light from the top left, a thin warm gold rim light on the edges, readable at small size. NO text, no frames, no plates or background shapes behind the icons, no shadow or glow outside.
```
Files, in order: `gear-bone-helm.png`, `gear-flint-buckler.png`, `gear-fang-charm.png`, `gear-wolf-pelt.png`, `gear-lion-mask.png`, `gear-claw-buckler.png`, `gear-ember-totem.png`, `gear-storm-crown.png`, `gear-obsidian-ward.png`

### Sheet 6 (objects): Gear items

```
Attached is my game UI mockup. Make ONE image, 3:2 landscape, flat pure #00FF00 green background. 4 separate game icons in a 3 by 2 grid, same size, wide green gaps, none touching. In reading order:
1. a teardrop of honey amber with a ghostly insect inside, on a gold cord
2. a huge curved fang hafted as a dagger-club, white fur wrapped at the grip
3. a striped sabretooth hide mantle with the two long fangs as clasps
4. a massive club carved from a curved mammoth tusk, gold-banded
Style: Painted game item icons. Realistic, richly detailed painterly Stone Age objects, each centred, slight three-quarter view, warm light from the top left, a thin warm gold rim light on the edges, readable at small size. NO text, no frames, no plates or background shapes behind the icons, no shadow or glow outside.
```
Files, in order: `gear-ghost-amber.png`, `gear-alpha-fang.png`, `gear-sabre-hide.png`, `gear-tusk-club.png`

### Sheet 7 (gold emblems): Currencies and rewards, Skills and finishers

```
Attached is my game UI mockup. Make ONE image, 1:1 square, flat pure #00FF00 green background. 9 separate game icons in a 3 by 3 grid, same size, wide green gaps, none touching. In reading order:
1. a gold walking figure in mid-stride, like a Roman frieze
2. a gold eight-pointed star with a small laurel under it
3. a gold sunburst sigil with three small sparkles
4. a gold radar dish emblem with three signal arcs
5. a gold club swinging down with a motion arc
6. a gold round shield, front-on
7. a gold open-mouthed head in profile with sound waves
8. a gold hand throwing a stone with speed lines
9. a gold flint spearhead thrusting forward
Style: Polished beveled gold metal, front-on, exactly like the gold menu icons in the mockup, bold simple silhouettes readable at small size, light from the top left. NO text, no frames, no plates or background shapes behind the icons, no shadow or glow outside.
```
Files, in order: `cur-steps.png`, `cur-xp.png`, `cur-boon.png`, `cur-signal.png`, `skill-club.png`, `skill-guard.png`, `skill-roar.png`, `skill-hurl.png`, `skill-jab.png`

### Sheet 8 (gold emblems): Skills and finishers, Buildings

```
Attached is my game UI mockup. Make ONE image, 1:1 square, flat pure #00FF00 green background. 9 separate game icons in a 3 by 3 grid, same size, wide green gaps, none touching. In reading order:
1. a gold burning torch with red-orange flame
2. a gold club in a wide circular arc
3. gold swirling breath lines around a small heart
4. a gold skull cracked by a club
5. a gold screaming beast face with wide eyes
6. a gold blood drop with a lightning bolt inside
7. a gold crossed hammer and anvil
8. a gold standing stone with a carved face
9. a gold woven basket
Style: Polished beveled gold metal, front-on, exactly like the gold menu icons in the mockup, bold simple silhouettes readable at small size, light from the top left. NO text, no frames, no plates or background shapes behind the icons, no shadow or glow outside.
```
Files, in order: `skill-firebrand.png`, `skill-sweep.png`, `skill-secondwind.png`, `fin-skull.png`, `fin-terror.png`, `fin-bloodrush.png`, `bld-studio.png`, `bld-altar.png`, `bld-inventory.png`

### Sheet 9 (gold emblems): Buildings, Combat statuses and enemy intents

```
Attached is my game UI mockup. Make ONE image, 1:1 square, flat pure #00FF00 green background. 9 separate game icons in a 3 by 3 grid, same size, wide green gaps, none touching. In reading order:
1. a gold stone shrine arch with a small flame
2. a gold pinned board with a red string between two pins
3. two crossed gold blades
4. a gold spear point through a ring
5. a gold shield
6. a bold gold up-arrow
7. a gold warning triangle with an exclamation mark
8. a gold hunting horn
9. a crimson blood drop with a gold rim
Style: Polished beveled gold metal, front-on, exactly like the gold menu icons in the mockup, bold simple silhouettes readable at small size, light from the top left. NO text, no frames, no plates or background shapes behind the icons, no shadow or glow outside.
```
Files, in order: `bld-shrine.png`, `bld-truth.png`, `st-attack.png`, `st-pierce.png`, `st-block.png`, `st-buff.png`, `st-windup.png`, `st-call.png`, `st-bleed.png`

### Sheet 10 (gold emblems): Combat statuses and enemy intents, Hero stats

```
Attached is my game UI mockup. Make ONE image, 1:1 square, flat pure #00FF00 green background. 9 separate game icons in a 3 by 3 grid, same size, wide green gaps, none touching. In reading order:
1. a small orange flame with a gold rim
2. three gold stars circling
3. a gold X slash
4. a gold beast face flinching from a flame
5. a gold skull
6. a gold heart
7. a gold club
8. a gold target with a cracked bullseye
9. a gold figure leaning aside with speed lines
Style: Polished beveled gold metal, front-on, exactly like the gold menu icons in the mockup, bold simple silhouettes readable at small size, light from the top left. NO text, no frames, no plates or background shapes behind the icons, no shadow or glow outside.
```
Files, in order: `st-burn.png`, `st-stun.png`, `st-interrupted.png`, `st-scared.png`, `st-execute.png`, `stat-health.png`, `stat-weapon.png`, `stat-crit.png`, `stat-dodge.png`

### Sheet 11 (gold emblems): Hero stats, Trials map, goals, achievements, Actions and screen headers

```
Attached is my game UI mockup. Make ONE image, 1:1 square, flat pure #00FF00 green background. 9 separate game icons in a 3 by 3 grid, same size, wide green gaps, none touching. In reading order:
1. a gold lightning bolt
2. a gold wolf skull
3. a gold mammoth head with tusks, front-on
4. a gold check mark in a laurel ring
5. a small gold-banded chest, lid glowing
6. an empty gold-rimmed square
7. a dark iron padlock with a gold rim
8. a gold rising spiral of three steps, like an ascending stair
9. a gold flexed arm
Style: Polished beveled gold metal, front-on, exactly like the gold menu icons in the mockup, bold simple silhouettes readable at small size, light from the top left. NO text, no frames, no plates or background shapes behind the icons, no shadow or glow outside.
```
Files, in order: `stat-ap.png`, `node-mini-boss.png`, `node-era-boss.png`, `goal-done.png`, `goal-ready.png`, `goal-open.png`, `ach-locked.png`, `act-evolve.png`, `act-train.png`

### Sheet 12 (gold emblems): Actions and screen headers

```
Attached is my game UI mockup. Make ONE image, 1:1 square, flat pure #00FF00 green background. 9 separate game icons in a 3 by 3 grid, same size, wide green gaps, none touching. In reading order:
1. a gold leather satchel
2. a gold torn white flag on a spear
3. a gold small temple front
4. a gold hourglass
5. a gold broken stone tablet
6. four gold corner brackets pointing outward
7. two crossed gold swords
8. a gold four-pointed star
9. a gold play triangle
Style: Polished beveled gold metal, front-on, exactly like the gold menu icons in the mockup, bold simple silhouettes readable at small size, light from the top left. NO text, no frames, no plates or background shapes behind the icons, no shadow or glow outside.
```
Files, in order: `act-inventory.png`, `act-retreat.png`, `act-home.png`, `act-timer.png`, `act-reset.png`, `act-fullscreen.png`, `act-fight.png`, `act-points.png`, `act-play.png`

### Sheet 13 (gold emblems): Actions and screen headers

```
Attached is my game UI mockup. Make ONE image, 3:2 landscape, flat pure #00FF00 green background. 1 separate game icons in a single row, same size, wide green gaps, none touching. In reading order:
1. a dark iron padlock with a gold rim
Style: Polished beveled gold metal, front-on, exactly like the gold menu icons in the mockup, bold simple silhouettes readable at small size, light from the top left. NO text, no frames, no plates or background shapes behind the icons, no shadow or glow outside.
```
Files, in order: `act-locked.png`

## Full list

Style: O = painted object, E = gold emblem. Emoji = the placeholder in the game today.

### Currencies and rewards

Shop prices, reward cards, the expedition report, loot reveals.

| File | Emoji | Shows | Style | Prompt | Status |
| --- | --- | --- | --- | --- | --- |
| `cur-soles.png` | 👣 | Soles, every price and reward | E | a pair of bare footprints in gold | done (copy of `public/ui/icon-sole.png`) |
| `cur-steps.png` | 🚶 | Steps walked (expedition report) | E | a gold walking figure in mid-stride, like a Roman frieze | to do |
| `cur-xp.png` | ⭐ | XP reward card | E | a gold eight-pointed star with a small laurel under it | to do |
| `cur-respec.png` | 🔄 | Respec token | O | an old bronze coin stamped with two curved arrows chasing each other in a circle | to do |
| `cur-blueprint.png` | 📐 | Blueprint (loot, Workshop) | O | a rolled sheet of tanned hide tied with sinew, a charcoal diagram of a club peeking out | to do |
| `cur-fragment.png` | 📄 | Story fragment (Truth Board) | O | a torn scrap of glowing pale data-parchment with faint red redacted lines, one corner burnt | to do |
| `cur-era-key.png` | 🗝️ | Era Key (Mammoth reward) | O | an ornate gold key whose bow is a mammoth head with ivory tusks, a red gem in the eye | to do |
| `cur-boon.png` | ✨ | Boon choice when evolving | E | a gold sunburst sigil with three small sparkles | to do |
| `cur-signal.png` | 📡 | Transmission cleared | E | a gold radar dish emblem with three signal arcs | to do |
| `cur-report.png` | 📜 | Expedition report header | O | a rolled parchment scroll with a red wax seal | to do |

### Materials and beast parts

Resource bar, shop, Workshop recipes, loot, salvage.

| File | Emoji | Shows | Style | Prompt | Status |
| --- | --- | --- | --- | --- | --- |
| `mat-flint.png` | 🪨 | Flint | O | a rough grey flint stone with gold edge highlights | done (copy of `public/ui/icon-flint.png`) |
| `mat-bone.png` | 🦴 | Bone | O | a single pale bone with gold edge highlights | done (copy of `public/ui/icon-bone.png`) |
| `mat-wood.png` | 🪵 | Wood | O | a short split log with bark and visible rings, gold edge highlights | to do |
| `part-fang.png` | 🦷 | Wolf Fang (part) | O | one long curved wolf fang, ivory with a dark root, a drop of dried blood | to do |
| `part-claw.png` | 🐾 | Lion Claw (part) | O | a single hooked big-cat claw, glossy dark keratin | to do |
| `part-tine.png` | 🦌 | Antler Tine (part) | O | a broken-off forked antler tip, velvet worn away | to do |
| `part-hide.png` | 🟫 | Thick Hide (part) | O | a folded square of thick wrinkled grey rhino hide with coarse hair at the edge | to do |
| `part-ember.png` | 🔥 | Ember Coal (part) | O | a glowing coal, black crust cracked with bright orange heat inside | to do |

### Boosters

Inventory consumables, loot, Workshop.

| File | Emoji | Shows | Style | Prompt | Status |
| --- | --- | --- | --- | --- | --- |
| `boost-stride-brew.png` | 🧪 | Stride Brew | O | a small clay flask stoppered with leather, green herbal brew glowing faintly at the neck | to do |
| `boost-lucky-knot.png` | 🪢 | Lucky Knot | O | an intricate knot of red cord with a small gold bead and a tiny bone charm | to do |
| `boost-warpaint.png` | 🎨 | Warpaint (also the combat status) | O | a shallow stone bowl of red ochre paste with two finger streaks | to do |

### Loot boxes

Boxes screen, loot reveal, reward cards. One chest per tier, getting richer.

| File | Emoji | Shows | Style | Prompt | Status |
| --- | --- | --- | --- | --- | --- |
| `box-bronze.png` | 📦 | Bronze box | O | a small plain wooden chest bound with dull bronze bands | to do |
| `box-silver.png` | 🎁 | Silver box | O | a wooden chest bound with polished silver bands and a silver lock | to do |
| `box-gold.png` | 💰 | Gold box | O | a crimson-lacquered chest bound in gold with laurel corner pieces | to do |
| `box-platinum.png` | 💎 | Platinum box | O | a pale white-gold chest with blue-white gems set in the lid | to do |
| `box-legendary.png` | 🔥 | Legendary box | O | a black chest with ornate gold filigree, warm orange light leaking from the seam | to do |
| `box-celestial.png` | 🌌 | Celestial box | O | a deep blue chest scattered with gold star inlays, starlight spilling from the seam | to do |

### Gear slots

Empty slots on the hero screen. Also the fallback for any gear item below that has no icon yet, so these five make every item look right on day one.

| File | Emoji | Shows | Style | Prompt | Status |
| --- | --- | --- | --- | --- | --- |
| `slot-weapon.png` | 🏏 | Weapon slot | O | a simple wooden club bound with leather at the grip | to do |
| `slot-armor.png` | 🦺 | Armor slot | O | a fur and hide chest wrap, stitched with sinew | to do |
| `slot-helm.png` | ⛑️ | Helm slot | O | a simple leather and bone cap | to do |
| `slot-offhand.png` | 🛡️ | Offhand slot | O | a small round shield of bark and hide | to do |
| `slot-trinket.png` | 📿 | Trinket slot | O | a necklace of carved bone beads and one tooth | to do |

### Gear items

Inventory, item cards, loot, Workshop, shop. Each piece is optional: until it exists the item shows its slot icon. Match these to the 3D wearables when they are made.

| File | Emoji | Shows | Style | Prompt | Status |
| --- | --- | --- | --- | --- | --- |
| `gear-stone-club.png` | (slot) | Knapped Club, Shop weapon | O | a wooden club with a knapped stone lashed to the head | to do |
| `gear-hide-wrap.png` | (slot) | Hide Wrap, Shop armor | O | a plain tan hide wrapped as a chest piece, tied with thongs | to do |
| `gear-skull-cap.png` | (slot) | Skull Cap, Shop helm | O | a cap made from the top of a small animal skull, lined with fur | to do |
| `gear-bark-shield.png` | (slot) | Bark Shield, Shop offhand | O | a round shield of layered bark with a hide grip | to do |
| `gear-tooth-charm.png` | (slot) | Tooth Charm, Shop trinket | O | a single wolf tooth on a leather cord | to do |
| `gear-ember-stone.png` | (slot) | Ember Stone, Shop trinket | O | a smooth river stone with a glowing orange vein, on a cord | to do |
| `gear-cracked-club.png` | (slot) | Cracked Club, Worn weapon | O | a split, splintered wooden club, clearly worn out | to do |
| `gear-torn-hide.png` | (slot) | Torn Hide, Worn armor | O | a ragged torn piece of hide armor with holes | to do |
| `gear-pebble-string.png` | (slot) | Pebble String, Worn trinket | O | a few plain pebbles on frayed string | to do |
| `gear-flint-club.png` | (slot) | Flint Club, Crafted weapon | O | a heavy club studded with sharp black flint shards | to do |
| `gear-bone-mail.png` | (slot) | Bone Mail, Crafted armor | O | a chest piece of overlapping bone plates laced together | to do |
| `gear-bone-helm.png` | (slot) | Bone Helm, Crafted helm | O | a helm built from bone plates with cheek guards | to do |
| `gear-flint-buckler.png` | (slot) | Flint Buckler, Crafted offhand | O | a small wooden buckler with a ring of flint spikes | to do |
| `gear-fang-charm.png` | (slot) | Fang Charm, Crafted trinket, Pack Hunter set | O | a charm of three wolf fangs fanned on a cord with a grey fur tuft | to do |
| `gear-wolf-pelt.png` | (slot) | Wolf Pelt, Crafted armor, Pack Hunter set | O | a grey wolf pelt cloak with the wolf head as a shoulder piece | to do |
| `gear-lion-mask.png` | (slot) | Lion Mask, Crafted helm, Predator set | O | a mask made from a tawny mountain lion face | to do |
| `gear-claw-buckler.png` | (slot) | Claw Buckler, Crafted offhand, Predator set | O | a buckler rimmed with big-cat claws | to do |
| `gear-ember-totem.png` | (slot) | Ember Totem, Crafted trinket | O | a small carved wooden totem with a glowing coal set in its chest | to do |
| `gear-storm-crown.png` | (slot) | Storm-Eye Crown, Rare helm | O | a crown of dark bone spikes with a pale blue storm-glass eye at the front | to do |
| `gear-obsidian-ward.png` | (slot) | Obsidian Ward, Rare offhand | O | a shield of glossy black obsidian plates bound in gold wire | to do |
| `gear-ghost-amber.png` | (slot) | Ghost Amber, Rare trinket | O | a teardrop of honey amber with a ghostly insect inside, on a gold cord | to do |
| `gear-alpha-fang.png` | (slot) | Alpha Fang, Boss weapon (Alpha), Pack Hunter set | O | a huge curved fang hafted as a dagger-club, white fur wrapped at the grip | to do |
| `gear-sabre-hide.png` | (slot) | Sabretooth Hide, Boss armor (Sabretooth), Predator set | O | a striped sabretooth hide mantle with the two long fangs as clasps | to do |
| `gear-tusk-club.png` | (slot) | Mammoth Tusk Club, Boss weapon (Mammoth) | O | a massive club carved from a curved mammoth tusk, gold-banded | to do |

### Skills and finishers

Combat skill bar and the Hero > Skills tab.

| File | Emoji | Shows | Style | Prompt | Status |
| --- | --- | --- | --- | --- | --- |
| `skill-club.png` | 🪵 | Club Strike | E | a gold club swinging down with a motion arc | to do |
| `skill-guard.png` | 🛡 | Guard | E | a gold round shield, front-on | to do |
| `skill-roar.png` | 📣 | Roar | E | a gold open-mouthed head in profile with sound waves | to do |
| `skill-hurl.png` | 🪨 | Hurl Stone | E | a gold hand throwing a stone with speed lines | to do |
| `skill-jab.png` | 🗡 | Flint Jab | E | a gold flint spearhead thrusting forward | to do |
| `skill-firebrand.png` | 🔥 | Firebrand | E | a gold burning torch with red-orange flame | to do |
| `skill-sweep.png` | 🌀 | Sweep | E | a gold club in a wide circular arc | to do |
| `skill-secondwind.png` | 💨 | Second Wind | E | gold swirling breath lines around a small heart | to do |
| `fin-skull.png` | 💀 | Skull Crusher (finisher) | E | a gold skull cracked by a club | to do |
| `fin-terror.png` | 😱 | Terror (finisher) | E | a gold screaming beast face with wide eyes | to do |
| `fin-bloodrush.png` | 🩸 | Bloodrush (finisher) | E | a gold blood drop with a lightning bolt inside | to do |

### Buildings

Base screen labels and building dialogs (not the 3D buildings).

| File | Emoji | Shows | Style | Prompt | Status |
| --- | --- | --- | --- | --- | --- |
| `bld-studio.png` | ⚒ | Workshop, Craft and Forge buttons | E | a gold crossed hammer and anvil | to do |
| `bld-altar.png` | 🗿 | Hero Training Altar | E | a gold standing stone with a carved face | to do |
| `bld-inventory.png` | 🧺 | Inventory | E | a gold woven basket | to do |
| `bld-shrine.png` | ⛩ | Shrine | E | a gold stone shrine arch with a small flame | to do |
| `bld-truth.png` | 📌 | Truth Board | E | a gold pinned board with a red string between two pins | to do |

### Combat statuses and enemy intents

The badge over each enemy (what it will do next) and status lines under health bars. Small: keep them very simple and bold.

| File | Emoji | Shows | Style | Prompt | Status |
| --- | --- | --- | --- | --- | --- |
| `st-attack.png` | ⚔ | Intent: attack | E | two crossed gold blades | to do |
| `st-pierce.png` | 🎯 | Intent: attack that ignores block | E | a gold spear point through a ring | to do |
| `st-block.png` | 🛡 | Intent and status: block | E | a gold shield | to do |
| `st-buff.png` | ⬆ | Intent: buff (snarl, cackle) | E | a bold gold up-arrow | to do |
| `st-windup.png` | ⚠ | Intent: winding up a big hit | E | a gold warning triangle with an exclamation mark | to do |
| `st-call.png` | 📯 | Intent: call for backup | E | a gold hunting horn | to do |
| `st-bleed.png` | 🩸 | Bleed | E | a crimson blood drop with a gold rim | to do |
| `st-burn.png` | 🔥 | Burning | E | a small orange flame with a gold rim | to do |
| `st-stun.png` | 💫 | Stunned | E | three gold stars circling | to do |
| `st-interrupted.png` | ✖ | Interrupted | E | a gold X slash | to do |
| `st-scared.png` | 😨 | Scared by fire | E | a gold beast face flinching from a flame | to do |
| `st-execute.png` | 💀 | Enemy low enough to finish | E | a gold skull | to do |

### Hero stats

Hero > Stats summary line.

| File | Emoji | Shows | Style | Prompt | Status |
| --- | --- | --- | --- | --- | --- |
| `stat-health.png` | ❤ | Health | E | a gold heart | to do |
| `stat-weapon.png` | 🏏 | Weapon bonus | E | a gold club | to do |
| `stat-crit.png` | 🎯 | Critical chance | E | a gold target with a cracked bullseye | to do |
| `stat-dodge.png` | 💨 | Dodge | E | a gold figure leaning aside with speed lines | to do |
| `stat-ap.png` | ⚡ | AP carry-over | E | a gold lightning bolt | to do |

### Trials map, goals, achievements

Map nodes for the bosses, the daily goals list, achievements list.

| File | Emoji | Shows | Style | Prompt | Status |
| --- | --- | --- | --- | --- | --- |
| `node-mini-boss.png` | 💀 | Mini-boss node (Trials 5, 10) | E | a gold wolf skull | to do |
| `node-era-boss.png` | 🦣 | Era boss node (Mammoth) | E | a gold mammoth head with tusks, front-on | to do |
| `goal-done.png` | ✅ | Goal claimed | E | a gold check mark in a laurel ring | to do |
| `goal-ready.png` | 🎁 | Goal done, reward ready | E | a small gold-banded chest, lid glowing | to do |
| `goal-open.png` | ⬜ | Goal not done yet | E | an empty gold-rimmed square | to do |
| `ach-unlocked.png` | 🏆 | Achievement unlocked | E | a gold trophy cup with two handles | done (copy of `public/ui/icon-trophy.png`) |
| `ach-locked.png` | 🔒 | Achievement locked | E | a dark iron padlock with a gold rim | to do |

### Actions and screen headers

Buttons and dialog titles.

| File | Emoji | Shows | Style | Prompt | Status |
| --- | --- | --- | --- | --- | --- |
| `act-evolve.png` | 🧬 | Evolve button and Boon/Evolve titles | E | a gold rising spiral of three steps, like an ascending stair | to do |
| `act-train.png` | 🗿 | Train hero | E | a gold flexed arm | to do |
| `act-inventory.png` | 🎒 | Open inventory | E | a gold leather satchel | to do |
| `act-retreat.png` | 🏳 | Retreat from a fight | E | a gold torn white flag on a spear | to do |
| `act-home.png` | 🏠 | Home button | E | a gold small temple front | to do |
| `act-timer.png` | ⏳ | Build and upgrade timers | E | a gold hourglass | to do |
| `act-reset.png` | 🗑 | Reset game (Settings) | E | a gold broken stone tablet | to do |
| `act-fullscreen.png` | ⛶ | Go fullscreen (Settings) | E | four gold corner brackets pointing outward | to do |
| `act-fight.png` | ⚔ | Fight button on a Trial | E | two crossed gold swords | to do |
| `act-points.png` | ✦ | Points to spend | E | a gold four-pointed star | to do |
| `act-play.png` | ▶ | Play memory / Watch again | E | a gold play triangle | to do |
| `act-locked.png` | 🔒 | Locked memory | E | a dark iron padlock with a gold rim | to do |
| `hdr-boxes.png` | 📦 | Loot boxes title | E | a gold-banded wooden treasure chest, closed | done (copy of `public/ui/icon-boxes.png`) |
| `hdr-goals.png` | 🎯 | Daily goals title | E | a gold target with crosshair inside a laurel wreath | done (copy of `public/ui/icon-goals.png`) |
| `hdr-trophy.png` | 🏆 | Achievements title | E | a gold trophy cup with two handles | done (copy of `public/ui/icon-trophy.png`) |
| `hdr-settings.png` | ⚙ | Settings title | E | a gold settings gear | done (copy of `public/ui/icon-gear.png`) |

## Not on this list

- **Home screen icons** (BASE, SHOP, GOALS, TRIALS, BOXES, the resource bar, settings, trophy): done, in `public/ui/`, see [ui-assets.md](ui-assets.md).
- **Typographic marks** stay as gold text: stars ★☆, checks ✔ ✖ ○, close ✕, skill rank pips ◆◇, arrows → ▶ in button labels.
- **Cutscene placeholders** (the emoji on unpainted story shots) are replaced by the cutscene art itself, tracked in [art-backlog.md](art-backlog.md).
- **The app icon** (`public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) is already art; the browser tab icon now uses it too.
